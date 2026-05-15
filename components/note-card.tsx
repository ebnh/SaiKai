"use client";

import Link from "next/link";
import type { Note, ViewMode } from "@/lib/types";
import { formatDate, summarizeForCard } from "@/lib/utils";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/utils";

type NoteCardProps = {
  note: Note;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  viewMode: ViewMode;
  href?: string;
  extraBadge?: React.ReactNode;
  actions?: React.ReactNode;
  hideSummary?: boolean;
};

export function NoteCard({
  note,
  selected,
  onToggleSelect,
  viewMode,
  href = `/notes/${note.id}`,
  extraBadge,
  actions,
  hideSummary = false
}: NoteCardProps) {
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[26px] border border-white/70 bg-white/85 shadow-card transition hover:-translate-y-0.5",
        viewMode === "list" ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-start gap-3">
        <label className="mt-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-sand/80 transition hover:bg-mist">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(note.id)}
            aria-label={`${note.title}を選択`}
            className="h-4 w-4 rounded border-moss text-clay focus:ring-clay"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="bg-mist">{note.category}</Pill>
            {note.pinned ? <Pill className="bg-amber-100">固定</Pill> : null}
            {extraBadge}
          </div>
          <Link href={href} className="mt-3 block">
            <h3 className="text-lg font-semibold leading-7 group-hover:text-clay">{note.title}</h3>
          </Link>
          {!hideSummary ? <p className="mt-2 text-sm leading-6 text-ink/75">{summarizeForCard(note.question, 90)}</p> : null}
        </div>
      </div>

      <div className={cn("mt-4 space-y-3", viewMode === "list" ? "pl-7" : "")}>
        {!hideSummary ? (
          <p className="text-sm leading-6 text-ink/80">
            {summarizeForCard(note.answerSummary.join(" / "), viewMode === "list" ? 220 : 130)}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
          <span>更新 {formatDate(note.updatedAt)}</span>
          {note.tags.slice(0, 3).map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </article>
  );
}
