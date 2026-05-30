"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { preprocessImportedChat, type PreprocessMode } from "@/lib/chat-preprocess";
import type { Category, FixedTag, GeneratedNote, WorkflowState } from "@/lib/types";
import { categories, fixedTags, GeneratedNoteSchema, workflowStates } from "@/lib/types";
import { getCategoryOptions, normalizeCategory, normalizeFixedTags, toLineItems, uniqueStrings } from "@/lib/utils";
import { Button, Pill, SectionCard } from "@/components/ui";
import { useNotes } from "@/providers/notes-provider";
import { useTheme } from "@/providers/theme-provider";

type GenerateResponse = {
  note: GeneratedNote;
  source: "llm" | "fallback";
  reason?: string;
  compression?: {
    mode: string;
    originalLength: number;
    compressedLength: number;
  };
  preprocessing?: {
    mode: PreprocessMode;
    originalLength: number;
    cleanedLength: number;
    removedLines: number;
  };
};

const emptyPreview: GeneratedNote = {
  title: "",
  category: "未分類",
  question: "",
  answerSummary: "",
  unresolvedQuestions: [],
  understandingState: [],
  resumePrompt: ""
};

const MAX_REGENERATE_COUNT = 3;
const REGENERATE_COOLDOWN_SECONDS = 10;

function parseLineItems(input: string) {
  return input
    .split(/\n+/)
    .map((item) => item.replace(/^[-・●]\s*/, "").trim())
    .filter(Boolean);
}

function deriveUnderstandingState(answerSummary: string[], unresolvedQuestions: string[]) {
  return uniqueStrings([
    answerSummary[0] ? `${answerSummary[0]}までは理解済み` : "要点はひとまず整理済み",
    unresolvedQuestions.length > 0 ? "未解決の論点が残っている" : "主要な疑問は一度整理済み"
  ]);
}

export function ImportWorkbench() {
  const router = useRouter();
  const { addOrUpdateNote, appendSessionToNote, notes } = useNotes();
  const { theme } = useTheme();
  const [chatText, setChatText] = useState("");
  const [preview, setPreview] = useState<GeneratedNote>(emptyPreview);
  const [selectedTags, setSelectedTags] = useState<FixedTag[]>([]);
  const [selectedState, setSelectedState] = useState<WorkflowState>("進行中");
  const [saveMode, setSaveMode] = useState<"new" | "existing">("new");
  const [selectedExistingNoteId, setSelectedExistingNoteId] = useState("");
  const [source, setSource] = useState<"llm" | "fallback" | null>(null);
  const [sourceReason, setSourceReason] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<GenerateResponse["compression"] | null>(null);
  const [preprocessingInfo, setPreprocessingInfo] = useState<GenerateResponse["preprocessing"] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preprocessMode, setPreprocessMode] = useState<PreprocessMode>("full");
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [regenerateCooldownUntil, setRegenerateCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const categoryOptions = useMemo(() => getCategoryOptions(notes), [notes]);
  const activeNotes = useMemo(() => notes.filter((note) => note.status === "active"), [notes]);
  const previewPreprocess = useMemo(
    () => preprocessImportedChat(chatText, preprocessMode),
    [chatText, preprocessMode]
  );
  const shouldChoosePreprocessMode = chatText.trim().length > 5000;
  const cooldownRemaining = regenerateCooldownUntil
    ? Math.max(0, Math.ceil((regenerateCooldownUntil - cooldownNow) / 1000))
    : 0;
  const canRegenerate =
    hasGeneratedOnce &&
    regenerateCount < MAX_REGENERATE_COUNT &&
    cooldownRemaining === 0 &&
    !isGenerating &&
    !!chatText.trim();

  const canSave = useMemo(
    () => preview.title && preview.question && preview.answerSummary && preview.resumePrompt && chatText.trim(),
    [preview, chatText]
  );

  useEffect(() => {
    if (!regenerateCooldownUntil) return;

    const timer = window.setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [regenerateCooldownUntil]);

  useEffect(() => {
    if (!regenerateCooldownUntil) return;
    if (Date.now() >= regenerateCooldownUntil) {
      setRegenerateCooldownUntil(null);
      setCooldownNow(Date.now());
    }
  }, [cooldownNow, regenerateCooldownUntil]);

  useEffect(() => {
    if (!selectedExistingNoteId && activeNotes[0]) {
      setSelectedExistingNoteId(activeNotes[0].id);
    }
  }, [activeNotes, selectedExistingNoteId]);

  async function runGeneration(options: { isRegeneration: boolean }) {
    setIsGenerating(true);
    setError(null);
    setSourceReason(null);
    setCompressionInfo(null);
    setPreprocessingInfo(null);

    try {
      const response = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText, categoryOptions, preprocessMode })
      });

      if (!response.ok) {
        throw new Error("ノート化に失敗しました");
      }

      const data = (await response.json()) as GenerateResponse;
      const parsed = GeneratedNoteSchema.parse(data.note);
      setPreview({ ...parsed, category: normalizeCategory(parsed.category) });
      setSelectedTags([]);
      setSource(data.source);
      setSourceReason(data.reason ?? null);
      setCompressionInfo(data.compression ?? null);
      setPreprocessingInfo(data.preprocessing ?? null);
      setHasGeneratedOnce(true);
      if (options.isRegeneration) {
        setRegenerateCount((current) => current + 1);
        setRegenerateCooldownUntil(Date.now() + REGENERATE_COOLDOWN_SECONDS * 1000);
        setCooldownNow(Date.now());
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "不明なエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerate() {
    if (hasGeneratedOnce) return;
    await runGeneration({ isRegeneration: false });
  }

  async function handleRegenerate() {
    if (!canRegenerate) return;
    await runGeneration({ isRegeneration: true });
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const answerSummary = toLineItems(preview.answerSummary);
      const unresolvedQuestions = uniqueStrings(preview.unresolvedQuestions);
      const understandingState =
        preview.understandingState.length > 0
          ? uniqueStrings(preview.understandingState)
          : deriveUnderstandingState(answerSummary, unresolvedQuestions);
      const now = new Date().toISOString();

      if (saveMode === "existing") {
        const targetNote = activeNotes.find((note) => note.id === selectedExistingNoteId);
        if (!targetNote) {
          throw new Error("続きとして保存するノートを選んでください");
        }

        await appendSessionToNote(targetNote.id, {
          title: preview.title || `${targetNote.title}の続き`,
          sourceType: "resumed",
          sourceSummary: preview.question || "取り込み画面から追加した対話",
          importedConversation: previewPreprocess.cleanedText || chatText.trim(),
          extractedSummary: answerSummary,
          extractedUnresolvedQuestions: unresolvedQuestions,
          extractedUnderstandingState: understandingState
        });

        setHasGeneratedOnce(false);
        setRegenerateCount(0);
        setRegenerateCooldownUntil(null);
        router.push(`/notes/${targetNote.id}`);
        return;
      }

      const saved = await addOrUpdateNote({
        ...preview,
        category: normalizeCategory(preview.category),
        tags: normalizeFixedTags(selectedTags),
        workflowState: selectedState,
        answerSummary,
        unresolvedQuestions,
        understandingState,
        sessions: [
          {
            id: `session-${Date.now()}`,
            noteId: "",
            title: `${preview.title || "新規ノート"}の初回対話`,
            createdAt: now,
            sourceType: "initial",
            sourceSummary: "初回対話",
            importedConversation: previewPreprocess.cleanedText || chatText.trim(),
            extractedSummary: answerSummary,
            extractedUnresolvedQuestions: unresolvedQuestions,
            extractedUnderstandingState: understandingState
          }
        ],
        originalChatText: previewPreprocess.cleanedText || chatText.trim(),
        status: "active"
      });

      setHasGeneratedOnce(false);
      setRegenerateCount(0);
      setRegenerateCooldownUntil(null);
      router.push(`/notes/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">取り込み</p>
          <h2 className="mt-2 text-2xl font-semibold dark:text-white">会話をノート化する</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-200" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
            外部AIでやりとりした会話を貼り付けると、前処理で整えた会話を保存しつつ、問い・要点・残疑問を確認できます。
          </p>
        </div>

        <textarea
          value={chatText}
          onChange={(event) => setChatText(event.target.value)}
          placeholder={"Q: 何を知りたい？\nA: どう整理すべき？\nQ: 次にどこを深掘りする？"}
          className="min-h-[360px] w-full rounded-[24px] border border-mist bg-sand px-4 py-4 text-sm leading-6 outline-none placeholder:text-ink/35 focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#d79374]"
        />

        <div className="rounded-2xl bg-sand p-4 text-sm leading-6 text-ink/75 dark:border dark:border-[#314155] dark:bg-[#18212d] dark:text-white">
          <p>
            貼り付け後は、ユーザー / AI の発話らしい部分を抽出し、明らかなメニュー文言や先頭末尾のノイズを除外してから解析します。
          </p>
          {shouldChoosePreprocessMode ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium tracking-[0.08em] text-moss">長い会話の解析方法</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreprocessMode("full")}
                  className={`rounded-full px-3 py-1 text-xs transition ${preprocessMode === "full" ? "bg-clay text-white" : "bg-white hover:bg-mist"}`}
                >
                  全文解析
                </button>
                <button
                  type="button"
                  onClick={() => setPreprocessMode("tail-heavy")}
                  className={`rounded-full px-3 py-1 text-xs transition ${preprocessMode === "tail-heavy" ? "bg-clay text-white" : "bg-white hover:bg-mist"}`}
                >
                  後半重視
                </button>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-ink/60">
            前処理後の目安: {previewPreprocess.cleanedLength}文字 / 元 {previewPreprocess.originalLength}文字
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={!chatText.trim() || isGenerating || hasGeneratedOnce}>
            {isGenerating ? "ノート化中..." : "ノート化する"}
          </Button>
          {source ? (
            <Pill className={source === "llm" ? "bg-emerald-100" : "bg-amber-100"}>
              {source === "llm" ? "LLM生成" : "フォールバック生成"}
            </Pill>
          ) : null}
          {hasGeneratedOnce ? <Pill className="bg-clay/10 text-clay">下書き生成済み</Pill> : null}
        </div>
        {hasGeneratedOnce ? (
          <div className="rounded-2xl border border-mist/80 bg-sand/55 p-4 dark:border-[#314155] dark:bg-[#18212d]">
            <p className="text-sm font-medium text-ink dark:text-slate-100">生成結果は下書きです</p>
            <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-200">
              初回生成のあとは API を引き直すより、右側で問い・要点・残った疑問を整えて保存する使い方を基本にしています。
            </p>
          </div>
        ) : null}
        {hasGeneratedOnce && regenerateCount >= MAX_REGENERATE_COUNT ? (
          <p className="text-sm leading-6 text-amber-700">
            保存前の再生成回数の上限に達しました。必要な修正はこのままローカルで編集して保存してください。
          </p>
        ) : null}
        {hasGeneratedOnce ? (
          <details className="rounded-2xl border border-transparent bg-sand p-4 dark:border-[#314155] dark:bg-[#18212d]">
            <summary className="cursor-pointer text-sm font-medium text-ink dark:text-slate-100">生成し直す（必要なときだけ）</summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={handleRegenerate} disabled={!canRegenerate}>
                  {cooldownRemaining > 0
                    ? `再生成まで ${cooldownRemaining}秒`
                    : isGenerating
                      ? "再生成中..."
                      : "再生成する"}
                </Button>
                <Pill>再生成 {regenerateCount} / {MAX_REGENERATE_COUNT}</Pill>
              </div>
              <p className="text-xs leading-6 text-ink/55 dark:text-slate-200" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                再生成では API 利用料金が発生する場合があります。保存前の再生成は最大 {MAX_REGENERATE_COUNT} 回、各回の後に {REGENERATE_COOLDOWN_SECONDS} 秒の待機があります。
              </p>
            </div>
          </details>
        ) : null}
        {sourceReason ? <p className="text-sm leading-6 text-amber-700">{sourceReason}</p> : null}
        {compressionInfo ? (
          <p className="text-xs leading-6 text-ink/55 dark:text-slate-200">
            圧縮方式: {compressionInfo.mode} / 送信文字数 {compressionInfo.compressedLength} / 元文字数 {compressionInfo.originalLength}
          </p>
        ) : null}
        {preprocessingInfo ? (
          <p className="text-xs leading-6 text-ink/55 dark:text-slate-200">
            前処理: {preprocessingInfo.mode === "full" ? "全文解析" : "後半重視"} / 除去行数 {preprocessingInfo.removedLines} / 前処理後 {preprocessingInfo.cleanedLength}文字
          </p>
        ) : null}
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">保存前プレビュー</p>
            <h3 className="mt-2 text-xl font-semibold">下書きを整えて保存する</h3>
          </div>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? "保存中..." : "この内容で保存"}
          </Button>
        </div>
        {hasGeneratedOnce ? (
          <p className="text-sm leading-6 text-ink/65 dark:text-slate-200">
            ここでは API を呼ばずに、生成された下書きをそのまま編集して保存できます。
          </p>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-transparent bg-sand p-4 dark:border-[#314155] dark:bg-[#18212d]" style={theme === "dark" ? { backgroundColor: "#18212d" } : undefined}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink dark:text-white">どこに保存するか</p>
            <p className="text-xs leading-6 text-ink/60 dark:text-slate-200" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
              新しいテーマとして保存するか、すでにあるノートの続きとして追加するかを選びます。
            </p>
          </div>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setSaveMode("new")}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                saveMode === "new"
                  ? "border-clay bg-white ring-2 ring-clay/15 dark:border-[#d79374] dark:bg-[#18212d]"
                  : "border-transparent bg-white hover:bg-mist dark:bg-[#1d2835] dark:hover:bg-[#243140]"
              }`}
            >
              <p className="text-sm font-medium text-ink dark:text-white">新しいノートとして保存</p>
              <p className="mt-1 text-xs leading-6 text-ink/60 dark:text-slate-300" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                今回の会話を独立した1冊のノートとして保存します。
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSaveMode("existing")}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                saveMode === "existing"
                  ? "border-clay bg-white ring-2 ring-clay/15 dark:border-[#d79374] dark:bg-[#18212d]"
                  : "border-transparent bg-white hover:bg-mist dark:bg-[#1d2835] dark:hover:bg-[#243140]"
              }`}
            >
              <p className="text-sm font-medium text-ink dark:text-white">既存ノートの続きとして追加</p>
              <p className="mt-1 text-xs leading-6 text-ink/60 dark:text-slate-300" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                選んだノートに新しい Session として追加し、続きの対話として残します。
              </p>
            </button>
          </div>
          {saveMode === "existing" ? (
            <label className="block space-y-2 rounded-2xl border border-transparent bg-white p-4 dark:border-[#314155] dark:bg-[#18212d]" style={theme === "dark" ? { backgroundColor: "#18212d" } : undefined}>
              <span className="text-sm font-medium text-ink dark:text-white">続きとして追加するノートを選ぶ</span>
              <select
                value={selectedExistingNoteId}
                onChange={(event) => setSelectedExistingNoteId(event.target.value)}
                className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay dark:border-white/10 dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
              >
                {activeNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-ink/55 dark:text-slate-200" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                保存すると、新しいノートは作られず、この会話が選んだノートの Session として追加されます。
              </p>
            </label>
          ) : null}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium dark:text-white">タイトル</span>
          <input
            value={preview.title}
            onChange={(event) => setPreview((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay dark:border-white/10 dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          />
        </label>

        {saveMode === "new" ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium dark:text-white">状態</span>
              <div className="flex flex-wrap gap-2">
                {workflowStates.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setSelectedState(state)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      selectedState === state ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium dark:text-white">カテゴリ</span>
              <input
                list="import-category-options"
                value={preview.category}
                onChange={(event) =>
                  setPreview((current) => ({ ...current, category: event.target.value as Category }))
                }
                placeholder="カテゴリを入力"
                className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay dark:border-white/10 dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
              />
              <datalist id="import-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setPreview((current) => ({ ...current, category }))}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      preview.category === category ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium dark:text-white">タグ</span>
              <div className="flex flex-wrap gap-2">
                {fixedTags.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((current) =>
                          selected ? current.filter((item) => item !== tag) : [...current, tag]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        selected ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </label>
          </>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium dark:text-white">問い</span>
          <textarea
            value={preview.question}
            onChange={(event) => setPreview((current) => ({ ...current, question: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm leading-6 outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium dark:text-white">答えの要点</span>
          <textarea
            value={preview.answerSummary}
            onChange={(event) => setPreview((current) => ({ ...current, answerSummary: event.target.value }))}
            rows={6}
            className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm leading-6 outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium dark:text-white">残った疑問</span>
          <textarea
            value={preview.unresolvedQuestions.join("\n")}
            onChange={(event) =>
              setPreview((current) => ({
                ...current,
                unresolvedQuestions: parseLineItems(event.target.value)
              }))
            }
            rows={5}
            placeholder={"疑問を1行ずつ入力\n例: エントロピーの意味づけ\n例: 数学的導出"}
            className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm leading-6 outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </SectionCard>
    </div>
  );
}
