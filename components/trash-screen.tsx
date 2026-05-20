"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { NoteCard } from "@/components/note-card";
import { Button, EmptyState, Pill, SectionCard } from "@/components/ui";
import { getTrashDaysLeft, sortNotes } from "@/lib/utils";
import { useNotes } from "@/providers/notes-provider";

export function TrashScreen() {
  const { notes, restoreNotes, deleteNotes } = useNotes();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeCount = useMemo(() => notes.filter((note) => note.status === "active").length, [notes]);
  const trashedNotes = useMemo(
    () => sortNotes(notes.filter((note) => note.status === "trashed"), "updatedAt-desc"),
    [notes]
  );

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleRestoreSelected() {
    await restoreNotes(selectedIds);
    setSelectedIds([]);
  }

  async function handleDeleteSelected() {
    await deleteNotes(selectedIds);
    setSelectedIds([]);
  }

  return (
    <AppShell activeCount={activeCount} trashCount={trashedNotes.length}>
      <div className="space-y-6">
        <SectionCard className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">ゴミ箱</p>
              <h2 className="mt-2 text-2xl font-semibold dark:text-white">復元前の保留スペース</h2>
              <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-slate-200">
                誤って捨てる不安を減らすため、ノートは一定期間ここに残ります。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleRestoreSelected} disabled={selectedIds.length === 0}>
                一括復元 ({selectedIds.length})
              </Button>
              <Button variant="danger" onClick={handleDeleteSelected} disabled={selectedIds.length === 0}>
                一括削除 ({selectedIds.length})
              </Button>
            </div>
          </div>
        </SectionCard>

        {trashedNotes.length === 0 ? (
          <EmptyState
            title="ゴミ箱は空です"
            description="不要なノートを一時退避すると、ここから復元できます。"
          />
        ) : (
          <div className="space-y-4">
            {trashedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={selectedIds.includes(note.id)}
                onToggleSelect={toggleSelect}
                viewMode="list"
                hideSummary
                extraBadge={<Pill className="bg-rose-100 text-rose-900 dark:border-[#4a2f35] dark:bg-[#3a252c] dark:text-rose-100">残り {getTrashDaysLeft(note.deletedAt)} 日</Pill>}
                actions={
                  <>
                    <Button variant="secondary" onClick={() => restoreNotes([note.id])}>
                      復元
                    </Button>
                    <Button variant="danger" onClick={() => deleteNotes([note.id])}>
                      完全削除
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
