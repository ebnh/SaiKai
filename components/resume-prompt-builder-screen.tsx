"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Pill, SectionCard } from "@/components/ui";
import type { Note } from "@/lib/types";
import { formatDate, summarizeForCard } from "@/lib/utils";
import { useNotes } from "@/providers/notes-provider";
import { useTheme } from "@/providers/theme-provider";

type ResumeMode =
  | "続きから学ぶ"
  | "未解決点を深掘りする"
  | "やさしく言い換える"
  | "問題演習にする"
  | "要点だけ再整理する"
  | "別視点で説明させる";

type AnswerStyle = "指定しない" | "簡潔に" | "丁寧に" | "初学者向け" | "厳密に" | "問答形式で" | "演習つきで";
type Depth = "軽く確認" | "標準" | "深く掘り下げる";

type ResumePageNote = {
  id: string;
  title: string;
  category: string;
  question: string;
  answerSummary: string[];
  unresolvedQuestions: string[];
  understandingState: string[];
  nextDirections: string[];
  workflowStateLabel: string;
  updatedAtLabel: string;
  tags: string[];
};

const resumeModes: Array<{ value: ResumeMode; description: string }> = [
  { value: "続きから学ぶ", description: "前回の理解を土台に、そのまま次の論点へ進みます。" },
  { value: "未解決点を深掘りする", description: "残っている疑問を軸に、曖昧な部分を埋めます。" },
  { value: "やさしく言い換える", description: "難しい説明を、より直感的な表現へ置き換えます。" },
  { value: "問題演習にする", description: "対話の途中で問いや小問を入れ、理解を確かめます。" },
  { value: "要点だけ再整理する", description: "まず全体の要点を短く組み直し、現在地をはっきりさせます。" },
  { value: "別視点で説明させる", description: "前回と違う角度の説明で、理解の詰まりをほぐします。" }
];

const answerStyles: AnswerStyle[] = ["指定しない", "簡潔に", "丁寧に", "初学者向け", "厳密に", "問答形式で", "演習つきで"];
const depthOptions: Depth[] = ["軽く確認", "標準", "深く掘り下げる"];

function noteToResumePageNote(note: Note): ResumePageNote {
  const answerSummary = note.answerSummary.length > 0 ? note.answerSummary : ["前回の要点は1つにまとまっています"];
  const understandingState =
    note.understandingState.length > 0
      ? note.understandingState
      : [
          answerSummary[0] ? `${answerSummary[0]}までは理解済み` : "前回の要点は整理済み",
          note.unresolvedQuestions.length > 0 ? "未解決の論点が残っている" : "大きな未解決点は少ない"
        ];

  const nextDirections =
    note.unresolvedQuestions.length > 0
      ? note.unresolvedQuestions.slice(0, 3)
      : answerSummary.slice(0, 3).map((item) => `${item}をもう一段深く整理する`);

  return {
    id: note.id,
    title: note.title,
    category: note.category,
    question: note.question,
    answerSummary,
    unresolvedQuestions: note.unresolvedQuestions,
    understandingState,
    nextDirections,
    workflowStateLabel: note.workflowState,
    updatedAtLabel: formatDate(note.updatedAt),
    tags: note.tags
  };
}

export function ResumePromptBuilderScreen() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { notes } = useNotes();
  const { theme } = useTheme();
  const activeCount = useMemo(() => notes.filter((note) => note.status === "active").length, [notes]);
  const trashCount = useMemo(() => notes.filter((note) => note.status === "trashed").length, [notes]);

  const savedNotes = useMemo(
    () => notes.filter((note) => note.status === "active").map(noteToResumePageNote),
    [notes]
  );

  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState("前回の続きから説明してほしい");
  const [selectedUnresolvedQuestions, setSelectedUnresolvedQuestions] = useState<string[]>([]);
  const [selectedResumeMode, setSelectedResumeMode] = useState<ResumeMode>("未解決点を深掘りする");
  const [selectedAnswerStyle, setSelectedAnswerStyle] = useState<AnswerStyle>("指定しない");
  const [selectedDepth, setSelectedDepth] = useState<Depth>("標準");
  const [extraCondition, setExtraCondition] = useState("");
  const [copiedState, setCopiedState] = useState(false);

  const selectedNote = useMemo(
    () => savedNotes.find((note) => note.id === selectedNoteId) ?? savedNotes[0] ?? null,
    [savedNotes, selectedNoteId]
  );

  useEffect(() => {
    const requestedNoteId = searchParams.get("noteId");
    if (requestedNoteId && savedNotes.some((note) => note.id === requestedNoteId)) {
      setSelectedNoteId(requestedNoteId);
      return;
    }
    if (!selectedNoteId && savedNotes[0]) {
      setSelectedNoteId(savedNotes[0].id);
    }
  }, [savedNotes, searchParams, selectedNoteId]);

  useEffect(() => {
    if (selectedNoteId && !savedNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(savedNotes[0]?.id ?? "");
    }
  }, [savedNotes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) return;

    setSelectedUnresolvedQuestions((current) => {
      const matched = current.filter((item) => selectedNote.unresolvedQuestions.includes(item));
      return matched;
    });
  }, [selectedNote]);

  if (!selectedNote) {
    return (
      <AppShell activeCount={activeCount} trashCount={trashCount}>
        <EmptyState
          title="再開できるノートがまだありません"
          description="まずは取り込み画面から会話をノートとして保存すると、ここで再開用プロンプトを作れるようになります。"
          action={
            <Link href="/import">
              <Button>会話を取り込む</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const generatedPrompt = useMemo(() => {
    const selectedQuestionBlock =
      selectedUnresolvedQuestions.length > 0
        ? `今回は特に、${selectedUnresolvedQuestions.map((item) => `「${item}」`).join("、")}を扱ってください。`
        : "今回は必要に応じて重要な未解決点を選んで扱ってください。";

    const modeGuides: Record<ResumeMode, string> = {
      "続きから学ぶ": "前回の流れを切らずに、自然な続きとして説明を進めてください。",
      "未解決点を深掘りする": "曖昧な部分を残さないように、未解決点を中心に丁寧に整理してください。",
      "やさしく言い換える": "難しい概念は、やさしい言い換えや直感的なたとえを交えて説明してください。",
      "問題演習にする": "途中で理解確認の問いや小問を入れながら進めてください。",
      "要点だけ再整理する": "まず枝葉に広げすぎず、重要なポイントを短く再構成してください。",
      "別視点で説明させる": "前回と違う視点や切り口を使って理解を広げてください。"
    };

    const understandingText = selectedNote.understandingState.join("、");
    const answerSummaryText = selectedNote.answerSummary.join("、");
    const questionLine =
      currentQuestion.trim() || "前回の文脈を踏まえて、次に何を理解すべきか分かるように説明してください。";
    const extraLine = extraCondition.trim() ? `${extraCondition.trim()}。` : "";
    const styleLine =
      selectedAnswerStyle === "指定しない"
        ? `深さは「${selectedDepth}」でお願いします。`
        : `回答は「${selectedAnswerStyle}」、深さは「${selectedDepth}」でお願いします。`;

    return [
      `前回は「${selectedNote.title}」について対話し、テーマは「${selectedNote.question}」でした。`,
      `これまでに、${answerSummaryText}ことは整理できています。`,
      `現在の理解状態としては、${understandingText}状況です。`,
      selectedQuestionBlock,
      `今回は、${questionLine}。`,
      `再開モードは「${selectedResumeMode}」で、${styleLine}`,
      modeGuides[selectedResumeMode],
      extraLine
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }, [
    currentQuestion,
    extraCondition,
    selectedAnswerStyle,
    selectedDepth,
    selectedNote,
    selectedResumeMode,
    selectedUnresolvedQuestions
  ]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedState(true);
      window.setTimeout(() => setCopiedState(false), 1800);
    } catch {
      setCopiedState(false);
    }
  }

  function toggleQuestion(question: string) {
    setSelectedUnresolvedQuestions((current) =>
      current.includes(question) ? current.filter((item) => item !== question) : [...current, question]
    );
  }

  function resetConditions() {
    setCurrentQuestion("前回の続きから説明してほしい");
    setSelectedUnresolvedQuestions([]);
    setSelectedResumeMode("未解決点を深掘りする");
    setSelectedAnswerStyle("指定しない");
    setSelectedDepth("標準");
    setExtraCondition("");
    setCopiedState(false);
  }

  function handleOpenResumedImport() {
    const params = new URLSearchParams({
      noteId: selectedNote.id,
      question: currentQuestion.trim() || "前回の続きから説明してほしい"
    });
    router.push(`/resume/import?${params.toString()}`);
  }

  return (
    <AppShell activeCount={activeCount} trashCount={trashCount}>
      <div className="space-y-6">
        <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(233,239,245,0.92))] dark:bg-none dark:bg-[#10161d]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-moss">Resume Page</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink dark:text-white">対話を再開する</h1>
              <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                保存済みノートをもとに、今回の目的に合った再開用プロンプトを作成します
              </p>
            </div>
            <Button variant="ghost">保存済みテンプレート</Button>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">再開するノート</p>
              <h2 className="mt-2 text-xl font-semibold dark:text-white">今回の出発点</h2>
              <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                ここでノートを1つ選ぶと、下の文脈表示と再開条件がその内容に切り替わります。
              </p>
            </div>
            <div className="w-full xl:max-w-sm">
              <select
                value={selectedNote.id}
                onChange={(event) => setSelectedNoteId(event.target.value)}
                className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
              >
                {savedNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-[24px] border border-mist/80 bg-sand/55 p-4 dark:border-[#314155] dark:bg-none dark:bg-[#18212d]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Pill className="bg-clay/10 text-clay dark:bg-[#b86f5226] dark:text-[#f0b394]">{selectedNote.category}</Pill>
                  <Pill className="bg-moss/10 text-moss dark:bg-[#334235] dark:text-emerald-100">{selectedNote.workflowStateLabel}</Pill>
                  <Pill className="dark:bg-[#223041] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#223041" } : undefined}>{savedNotes.length}件から選択</Pill>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink dark:text-white">{selectedNote.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>{summarizeForCard(selectedNote.question, 110)}</p>
              </div>
              <p className="shrink-0 text-xs text-ink/45 dark:text-slate-400">{selectedNote.updatedAtLabel}</p>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <SectionCard className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">再開用プロンプト</p>
                <h2 className="mt-2 text-2xl font-semibold dark:text-white">今このまま外部AIへ貼れる形にする</h2>
                <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                  今回の条件をその場で反映しながら、外部AIへそのまま渡せる文面に整えます。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleCopy}>
                  {copiedState ? "コピーしました" : "コピー"}
                </Button>
                <Button variant="ghost" onClick={resetConditions}>
                  条件をリセット
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] border border-ink/10 bg-[linear-gradient(180deg,rgba(245,242,235,0.98),rgba(231,238,246,0.92))] p-5 md:p-6 dark:border-[#314155] dark:bg-none dark:bg-[#10161d]">
              <div className="flex flex-wrap gap-2">
                <Pill className="dark:bg-[#223041] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#223041" } : undefined}>
                  <span style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{selectedResumeMode}</span>
                </Pill>
                <Pill className="dark:bg-[#223041] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#223041" } : undefined}>
                  <span style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{selectedAnswerStyle}</span>
                </Pill>
                <Pill className="dark:bg-[#223041] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#223041" } : undefined}>
                  <span style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{selectedDepth}</span>
                </Pill>
              </div>
              <div className="mt-4 rounded-[24px] border border-white/70 bg-white/80 p-5 md:p-6 dark:border-[#314155] dark:bg-[#18212d]">
                <p className="whitespace-pre-wrap text-sm leading-8 text-ink/85 dark:text-slate-200" style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{generatedPrompt}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">今回の再開条件</p>
              <h2 className="mt-2 text-xl font-semibold dark:text-white">今回の意図を足していく</h2>
              <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>
                選んだノートの続きをどう進めたいかだけを、ここで整えます。
              </p>
            </div>

            <div className="rounded-[24px] border border-mist/80 bg-sand/55 p-4 dark:border-[#314155] dark:bg-[#18212d]">
              <div className="flex flex-wrap gap-2">
                <Pill className="bg-clay/10 text-clay dark:bg-[#b86f5226] dark:text-[#f0b394]">{selectedNote.category}</Pill>
                <Pill className="bg-moss/10 text-moss dark:bg-[#334235] dark:text-emerald-100">{selectedNote.workflowStateLabel}</Pill>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-ink dark:text-white">{selectedNote.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>{summarizeForCard(selectedNote.question, 140)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink dark:text-white">今回AIに聞きたいこと</label>
              <textarea
                value={currentQuestion}
                onChange={(event) => setCurrentQuestion(event.target.value)}
                rows={5}
                placeholder="前回の続きから説明してほしい"
                className="w-full rounded-[24px] border border-mist bg-sand px-4 py-3 text-sm leading-7 outline-none transition placeholder:text-ink/35 focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-[#d79374]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink dark:text-white">今回特に扱いたい未解決点</label>
              <div className="space-y-2">
                {selectedNote.unresolvedQuestions.map((item) => {
                  const checked = selectedUnresolvedQuestions.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        checked ? "border-clay bg-clay/5 dark:bg-[#b86f5220]" : "border-mist bg-sand/55 hover:bg-sand dark:border-[#314155] dark:bg-[#18212d] dark:hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleQuestion(item)}
                        className="mt-1 h-4 w-4 rounded border-mist text-clay focus:ring-clay"
                      />
                      <span className="leading-7 text-ink/85 dark:text-white">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink dark:text-white">再開モード</label>
              <div className="grid gap-3 md:grid-cols-2">
                {resumeModes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedResumeMode(option.value)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      selectedResumeMode === option.value
                        ? "border-ink bg-white shadow-card dark:border-[#d79374] dark:bg-[#243140] dark:text-white"
                        : "border-mist bg-sand/55 hover:bg-sand dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-clay/30"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink dark:text-white">{option.value}</p>
                    <p
                      className="mt-2 text-sm leading-6 text-ink/65 dark:text-slate-200"
                      style={theme === "dark" ? { color: "#e2e8f0" } : undefined}
                    >
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink dark:text-white">回答スタイル</label>
              <div className="flex flex-wrap gap-2">
                {answerStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedAnswerStyle(style)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedAnswerStyle === style
                        ? "border-ink bg-ink text-white dark:border-[#d79374] dark:bg-[#243140] dark:text-white"
                        : "border-mist bg-sand text-ink hover:bg-mist dark:bg-white/6 dark:text-slate-100 dark:hover:bg-white/10 dark:border-[#314155] dark:bg-[#18212d] dark:text-slate-100 dark:hover:bg-white/10"
                    }`}
                    style={theme === "dark" ? { color: "#f8fafc" } : undefined}
                  >
                    <span style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{style}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink dark:text-white">深さ</label>
              <div className="grid grid-cols-3 gap-2">
                {depthOptions.map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    onClick={() => setSelectedDepth(depth)}
                    className={`rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      selectedDepth === depth ? "bg-moss text-white dark:bg-[#56654a] dark:text-white" : "bg-sand text-ink hover:bg-mist dark:bg-[#18212d] dark:text-slate-100 dark:hover:bg-white/10"
                    }`}
                    style={theme === "dark" ? { color: "#f8fafc" } : undefined}
                  >
                    <span style={theme === "dark" ? { color: "#f8fafc" } : undefined}>{depth}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink dark:text-white">追加条件</label>
              <input
                value={extraCondition}
                onChange={(event) => setExtraCondition(event.target.value)}
                placeholder="数式を省略しすぎないで"
                className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:placeholder:text-slate-400 dark:focus:border-[#d79374]"
              />
            </div>
          </SectionCard>
        </div>


      </div>
    </AppShell>
  );
}
