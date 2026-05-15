"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Pill, SectionCard } from "@/components/ui";
import { GeneratedNoteSchema } from "@/lib/types";
import { formatDate, toLineItems, uniqueStrings } from "@/lib/utils";
import { useNotes } from "@/providers/notes-provider";

type GenerateResponse = {
  note: {
    title: string;
    category: string;
    question: string;
    answerSummary: string;
    unresolvedQuestions: string[];
    understandingState: string[];
    resumePrompt: string;
  };
  source: "llm" | "fallback";
  reason?: string;
};

export function ImportResumedConversationScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notes, isLoaded, appendSessionToNote } = useNotes();
  const requestedNoteId = searchParams.get("noteId") ?? "";
  const question = searchParams.get("question") ?? "前回の続きから整理したい";
  const activeNotes = useMemo(() => notes.filter((item) => item.status === "active"), [notes]);
  const [selectedNoteId, setSelectedNoteId] = useState(requestedNoteId);
  const note = useMemo(
    () => activeNotes.find((item) => item.id === selectedNoteId) ?? activeNotes[0] ?? null,
    [activeNotes, selectedNoteId]
  );
  const activeCount = useMemo(() => notes.filter((item) => item.status === "active").length, [notes]);
  const trashCount = useMemo(() => notes.filter((item) => item.status === "trashed").length, [notes]);
  const [conversationText, setConversationText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<{ source: "llm" | "fallback"; reason?: string } | null>(null);

  useEffect(() => {
    if (requestedNoteId && activeNotes.some((item) => item.id === requestedNoteId)) {
      setSelectedNoteId(requestedNoteId);
      return;
    }
    if (!selectedNoteId && activeNotes[0]) {
      setSelectedNoteId(activeNotes[0].id);
    }
  }, [activeNotes, requestedNoteId, selectedNoteId]);

  async function handleAppendSession() {
    if (!note || !conversationText.trim()) return;

    setIsSaving(true);
    setError(null);
    setAnalysisInfo(null);

    try {
      const response = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatText: conversationText.trim(),
          categoryOptions: uniqueStrings([note.category]),
          previousNote: {
            title: note.title,
            question: note.question,
            answerSummary: note.answerSummary.join("\n"),
            unresolvedQuestions: note.unresolvedQuestions,
            resumePrompt: note.resumePrompt,
            originalChatText: note.originalChatText
          }
        })
      });

      if (!response.ok) {
        throw new Error("セッション追加前の整理に失敗しました");
      }

      const data = (await response.json()) as GenerateResponse;
      const parsed = GeneratedNoteSchema.parse(data.note);
      const extractedSummary = toLineItems(parsed.answerSummary);
      const extractedUnresolvedQuestions = uniqueStrings(parsed.unresolvedQuestions);
      const extractedUnderstandingState = uniqueStrings(
        parsed.understandingState.length > 0
          ? parsed.understandingState
          : [
              extractedSummary[0] ? `${extractedSummary[0]}までは理解が進んだ` : "追加対話の要点は整理できた",
              extractedUnresolvedQuestions.length > 0 ? "追加対話で新しい疑問が見つかった" : "主要な疑問はひとまず整理できた"
            ]
      );

      await appendSessionToNote(note.id, {
        title: parsed.title || `${note.title}の続き`,
        sourceType: "resumed",
        sourceSummary: question,
        importedConversation: conversationText.trim(),
        extractedSummary,
        extractedUnresolvedQuestions,
        extractedUnderstandingState
      });

      setAnalysisInfo({ source: data.source, reason: data.reason });
      router.push(`/notes/${note.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "セッション追加に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell activeCount={activeCount} trashCount={trashCount}>
      {!isLoaded ? (
        <SectionCard>読み込み中...</SectionCard>
      ) : activeNotes.length === 0 ? (
        <EmptyState
          title="追加先のノートがありません"
          description="まずはノートを1件保存してから、新しい対話を取り込んでください。"
          action={
            <Link href="/import">
              <Button>会話を取り込む</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <SectionCard className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">Import Resumed Conversation</p>
            <h1 className="text-3xl font-semibold">新しい対話を取り込む</h1>
            <p className="text-sm leading-7 text-ink/70">
              外部AIで再開して得た新しい会話を、このノートの続きの Session として追加します。
            </p>
          </SectionCard>

          <SectionCard className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">追加先のノート</p>
                <h2 className="mt-2 text-xl font-semibold">どのノートに Session を追加するか選ぶ</h2>
              </div>
              <select
                value={note?.id ?? ""}
                onChange={(event) => setSelectedNoteId(event.target.value)}
                className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay lg:max-w-sm"
              >
                {activeNotes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <SectionCard className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill className="bg-clay/10 text-clay">{note.category}</Pill>
                <Pill>{note.sessions.length} Sessions</Pill>
                <Pill className="bg-moss/10 text-moss">更新 {formatDate(note.updatedAt)}</Pill>
              </div>
              <h2 className="text-2xl font-semibold">{note.title}</h2>
              <div className="rounded-2xl bg-sand p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45">今回の再開テーマ</p>
                <p className="mt-2 text-sm leading-7 text-ink/80">{question}</p>
              </div>
              <div className="rounded-2xl bg-sand p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45">現在の要点</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/80">
                  {note.answerSummary.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </SectionCard>

            <SectionCard className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">外部AIの新しい会話</p>
                <h2 className="mt-2 text-xl font-semibold">続きの対話を貼り付ける</h2>
              </div>
              <textarea
                value={conversationText}
                onChange={(event) => setConversationText(event.target.value)}
                rows={12}
                className="w-full rounded-[24px] border border-mist bg-sand px-4 py-4 text-sm leading-7 outline-none focus:border-clay"
              />

              <p className="text-xs leading-6 text-ink/55">
                追加時に API でこの会話を整理し、要点・疑問点・理解状態を Session とノート本体へ反映します。
              </p>
              {analysisInfo ? (
                <p className="text-xs leading-6 text-ink/55">
                  {analysisInfo.source === "llm" ? "LLM で整理して追加します。" : "フォールバック整理で追加します。"}
                  {analysisInfo.reason ? ` ${analysisInfo.reason}` : ""}
                </p>
              ) : null}
              {error ? <p className="text-sm leading-6 text-amber-700">{error}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAppendSession} disabled={!conversationText.trim() || isSaving}>
                  {isSaving ? "追加中..." : "このノートにセッション追加"}
                </Button>
                <Link href={`/notes/${note.id}`}>
                  <Button variant="ghost">詳細へ戻る</Button>
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </AppShell>
  );
}
