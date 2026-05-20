"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { categories, fixedTags, workflowStates, type FixedTag, type Note, type WorkflowState } from "@/lib/types";
import { Button, Pill, SectionCard } from "@/components/ui";
import { formatDate, getCategoryOptions, normalizeCategory, normalizeFixedTags } from "@/lib/utils";
import { useNotes } from "@/providers/notes-provider";
import { useTheme } from "@/providers/theme-provider";

export function NoteDetail({ note }: { note: Note }) {
  const router = useRouter();
  const { addOrUpdateNote, trashNotes, notes } = useNotes();
  const { theme } = useTheme();
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category);
  const [tags, setTags] = useState<FixedTag[]>(note.tags.filter((tag): tag is FixedTag => fixedTags.includes(tag as FixedTag)));
  const [selectedState, setSelectedState] = useState<WorkflowState>(note.workflowState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const unresolvedCount = note.unresolvedQuestions.length;
  const categoryOptions = useMemo(() => getCategoryOptions(notes), [notes]);

  async function handleSaveTitle() {
    setIsSaving(true);
    setSaveMessage(null);
    await addOrUpdateNote({
      ...note,
      title,
      category: normalizeCategory(category),
      tags: normalizeFixedTags(tags),
      workflowState: selectedState,
      status: note.status
    });
    setIsSaving(false);
    setSaveMessage("変更を保存しました");
    window.setTimeout(() => setSaveMessage(null), 1800);
  }

  async function handleTrash() {
    await trashNotes([note.id]);
    router.push("/trash");
  }

  function handleCreateResumePrompt() {
    router.push(`/resume?noteId=${encodeURIComponent(note.id)}`);
  }

  function handleExportNote() {
    const payload = {
      app: "SaiKai",
      exportedAt: new Date().toISOString(),
      note
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `saikai-note-${note.id}-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setExportMessage("このノートを JSON で書き出しました");
    window.setTimeout(() => setExportMessage(null), 2200);
  }

  return (
    <div className="space-y-6">
      <SectionCard className="space-y-5">
        <div className="space-y-4">
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-wrap gap-2">
              <Pill className="bg-mist text-ink dark:bg-[#344253] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#344253" } : undefined}>{normalizeCategory(category)}</Pill>
              <Pill className="text-ink dark:text-[#18212d]" style={theme === "dark" ? { color: "#18212d" } : undefined}>{unresolvedCount}件の残疑問</Pill>
              <Pill className="bg-amber-100 dark:bg-amber-300/15 dark:text-amber-100">更新 {formatDate(note.updatedAt)}</Pill>
            </div>
            <div className="grid gap-4 rounded-[24px] border border-white/70 bg-sand/70 p-4 md:grid-cols-2 dark:border-[#314155] dark:bg-[#18212d]" style={theme === "dark" ? { backgroundColor: "#18212d" } : undefined}>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-medium tracking-[0.08em] text-moss">タイトル</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-2xl font-semibold outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-medium tracking-[0.08em] text-moss">状態</span>
                <div className="flex flex-wrap gap-2">
                  {workflowStates.map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => setSelectedState(state)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        selectedState === state ? "bg-clay text-white" : "bg-white text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-[0.08em] text-moss">カテゴリ</span>
                <input
                  list="detail-category-options"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="カテゴリを入力"
                  className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-sm outline-none focus:border-clay dark:border-white/10 dark:bg-[#1a2330] dark:text-slate-100 dark:focus:border-[#d79374]"
                />
                <datalist id="detail-category-options">
                  {categoryOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-[0.08em] text-moss">タグ</span>
                <div className="flex flex-wrap gap-2">
                  {fixedTags.map((tag) => {
                    const selected = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setTags((current) =>
                            selected ? current.filter((item) => item !== tag) : [...current, tag]
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          selected ? "bg-clay text-white" : "bg-white text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </label>
              <div className="space-y-2 md:col-span-2">
                <span className="text-xs font-medium tracking-[0.08em] text-moss">カテゴリ候補</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        normalizeCategory(category) === option ? "bg-clay text-white" : "bg-white text-ink hover:bg-mist dark:bg-[#1d2835] dark:text-white dark:hover:bg-[#243140]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-mist/70 pt-2 dark:border-white/10">
            <Button onClick={handleSaveTitle} disabled={isSaving}>
              {isSaving ? "保存中..." : "変更を保存"}
            </Button>
            <Button variant="secondary" onClick={handleCreateResumePrompt}>
              このノートから再開する
            </Button>
            <Button variant="ghost" onClick={handleExportNote}>
              このノートを書き出す
            </Button>
            <Button variant="danger" onClick={handleTrash}>
              ゴミ箱へ送る
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          {saveMessage ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{saveMessage}</p> : null}
          {exportMessage ? <p className="text-sm font-medium text-clay dark:text-[#f0b394]">{exportMessage}</p> : null}
        </div>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <CollapsibleBlock title="問い" preview={note.question} defaultOpen>
              <ReadableText body={note.question} />
            </CollapsibleBlock>
            <CollapsibleBlock
              title="答えの要点"
              preview={note.answerSummary[0] ?? "まだ整理されていません"}
              meta={`${note.answerSummary.length}項目`}
              defaultOpen
            >
              <DetailList items={note.answerSummary} />
            </CollapsibleBlock>
            <CollapsibleBlock
              title="残った疑問"
              preview={note.unresolvedQuestions[0] ?? "残っている疑問はありません"}
              meta={`${note.unresolvedQuestions.length}件`}
            >
              <DetailList items={note.unresolvedQuestions} />
            </CollapsibleBlock>
            <CollapsibleBlock
              title="理解状態"
              preview={note.understandingState[0] ?? "まだ記録がありません"}
              meta={`${note.understandingState.length}項目`}
            >
              <DetailList items={note.understandingState} />
            </CollapsibleBlock>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold dark:text-white">Session 一覧</h2>
              <Pill>{note.sessions.length}件</Pill>
            </div>
            <div className="space-y-3">
              {note.sessions.map((session) => (
                <details key={session.id} className="group rounded-2xl bg-sand p-4 dark:bg-white/6" style={theme === "dark" ? { backgroundColor: "#18212d" } : undefined} open={session === note.sessions.at(-1)}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className="bg-clay/10 text-clay dark:text-[#f0b394]">{session.sourceType === "initial" ? "initial" : "resumed"}</Pill>
                          <Pill>{formatDate(session.createdAt)}</Pill>
                        </div>
                        <h3 className="text-base font-semibold dark:text-white">{session.title}</h3>
                        <p className="text-sm leading-6 text-ink/70 dark:text-slate-200" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>{session.sourceSummary}</p>
                      </div>
                      <span className="text-xs text-ink/45 transition group-open:rotate-180" style={theme === "dark" ? { color: "#94a3b8" } : undefined}>⌄</span>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-3 border-t border-white/70 pt-4 dark:border-white/10">
                    <DetailList title="抽出された要点" items={session.extractedSummary} compact />
                    <DetailList title="抽出された残疑問" items={session.extractedUnresolvedQuestions} compact />
                    <DetailList title="抽出された理解状態" items={session.extractedUnderstandingState} compact />
                  </div>
                </details>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <details className="group" open={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">保存済み会話</p>
                <h2 className="mt-2 text-xl font-semibold dark:text-white">前処理後の会話</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60 dark:text-slate-300" style={theme === "dark" ? { color: "#cbd5e1" } : undefined}>長い本文は必要なときだけ開けるようにしています。</p>
              </div>
              <span className="text-xs text-ink/45 transition group-open:rotate-180" style={theme === "dark" ? { color: "#94a3b8" } : undefined}>⌄</span>
            </summary>
            <pre className="mt-4 max-h-[720px] overflow-auto rounded-2xl bg-sand p-5 text-sm leading-7 text-ink/80 whitespace-pre-wrap dark:border dark:border-[#314155] dark:bg-[#18212d] dark:text-white">
              {note.originalChatText}
            </pre>
          </details>
        </SectionCard>
      </div>
    </div>
  );
}

function ReadableText({ body }: { body: string }) {
  return (
    <div className="rounded-2xl bg-sand p-4 text-sm leading-7 text-ink/80 whitespace-pre-wrap dark:border dark:border-[#314155] dark:bg-[#18212d] dark:text-white">
      {body}
    </div>
  );
}

function CollapsibleBlock({
  title,
  preview,
  meta,
  defaultOpen = false,
  children
}: {
  title: string;
  preview: string;
  meta?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <details className="group rounded-[24px] border border-white/70 bg-white/65 p-4 dark:border-[#314155] dark:bg-[#18212d]" open={defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold dark:text-white">{title}</h2>
              {meta ? <Pill className="dark:bg-[#223041] dark:text-white" style={theme === "dark" ? { color: "#f8fafc", backgroundColor: "#223041" } : undefined}>{meta}</Pill> : null}
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-ink/60 dark:text-slate-100" style={theme === "dark" ? { color: "#e2e8f0" } : undefined}>{preview}</p>
          </div>
          <span className="pt-1 text-xs text-ink/45 transition group-open:rotate-180">⌄</span>
        </div>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function DetailList({
  title,
  items,
  compact = false
}: {
  title?: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-3 space-y-2" : "space-y-3"}>
      {title ? <h2 className={compact ? "text-sm font-semibold text-ink/80 dark:text-white" : "text-lg font-semibold dark:text-white"}>{title}</h2> : null}
      <ul className="space-y-2 rounded-2xl bg-sand p-4 text-sm leading-6 text-ink/80 dark:border dark:border-[#314155] dark:bg-[#18212d] dark:text-white">
        {items.length > 0 ? items.map((item) => <li key={item}>- {item}</li>) : <li>- なし</li>}
      </ul>
    </div>
  );
}
