"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NoteDetail } from "@/components/note-detail";
import { Button, EmptyState } from "@/components/ui";
import { useNotes } from "@/providers/notes-provider";

export function NoteDetailScreen() {
  const params = useParams<{ id: string }>();
  const { notes, isLoaded } = useNotes();
  const note = useMemo(() => notes.find((item) => item.id === params.id), [notes, params.id]);
  const activeCount = useMemo(() => notes.filter((item) => item.status === "active").length, [notes]);
  const trashCount = useMemo(() => notes.filter((item) => item.status === "trashed").length, [notes]);

  return (
    <AppShell activeCount={activeCount} trashCount={trashCount}>
      {!isLoaded ? (
        <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-card dark:border-[#314155] dark:bg-[#18212d]">読み込み中...</div>
      ) : note ? (
        <NoteDetail note={note} />
      ) : (
        <EmptyState
          title="ノートが見つかりません"
          description="削除済みか、URLが変わっている可能性があります。書庫に戻って確認してください。"
          action={
            <Link href="/">
              <Button>書庫へ戻る</Button>
            </Link>
          }
        />
      )}
    </AppShell>
  );
}
