"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ImportWorkbench } from "@/components/import-workbench";
import { useNotes } from "@/providers/notes-provider";

export function ImportScreen() {
  const { notes } = useNotes();
  const activeCount = useMemo(() => notes.filter((note) => note.status === "active").length, [notes]);
  const trashCount = useMemo(() => notes.filter((note) => note.status === "trashed").length, [notes]);

  return (
    <AppShell activeCount={activeCount} trashCount={trashCount}>
      <ImportWorkbench />
    </AppShell>
  );
}
