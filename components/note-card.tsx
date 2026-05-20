"use client";

import Link from "next/link";
import type { Note, ViewMode } from "@/lib/types";
import { formatDate, summarizeForCard } from "@/lib/utils";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

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
  const { theme } = useTheme();

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] shadow-card ring-1 ring-white/60 transition duration-200 hover:-translate-y-1 hover:shadow-float dark:border-[#314155] dark:bg-none dark:bg-[#10161d] dark:ring-0",
        viewMode === "list" ? "p-4 sm:p-5" : "p-5 sm:p-6"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,_rgba(70,92,120,0.18),transparent_62%)]" />
      <div className="relative flex items-start gap-3 sm:gap-4">
        <label className={cn(
          "mt-0.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border transition",
          selected ? "border-clay bg-clay/12 shadow-[0_8px_18px_rgba(184,111,82,0.12)] dark:bg-[#334155]" : "border-white/70 bg-sand/70 hover:bg-white dark:border-[#314155] dark:bg-[#1d2835] dark:hover:bg-[#243140]"
        )}>
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
            <Pill className="bg-mist/80 dark:border-[#314155] dark:bg-[#223041] dark:text-white">{note.category}</Pill>
            {note.pinned ? <Pill className="border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-300/15 dark:text-amber-100">固定</Pill> : null}
            {extraBadge}
          </div>
          <Link href={href} className="mt-3 block">
            <h3 className="text-xl font-semibold leading-8 text-slate transition group-hover:text-slate dark:text-white dark:group-hover:text-white">{note.title}</h3>
          </Link>
          {!hideSummary ? (
            <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-white">{summarizeForCard(note.question, viewMode === "list" ? 180 : 96)}</p>
          ) : null}
        </div>
      </div>

      <div className={cn("relative mt-5 space-y-4", viewMode === "list" ? "pl-12 sm:pl-14" : "")}> 
        {!hideSummary ? (
          <div className="rounded-[24px] bg-sand/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border dark:border-[#314155] dark:bg-[#18212d] dark:shadow-none">
            <p className="text-sm leading-7 text-ink/82 dark:text-white">
              {summarizeForCard(note.answerSummary.join(" / "), viewMode === "list" ? 280 : 150)}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink/55 dark:text-slate-400">
          <span
            className="rounded-full bg-white/72 px-3 py-1.5 dark:bg-[#202a36] dark:text-slate-200"
            style={theme === "dark" ? { color: "#cbd5e1", backgroundColor: "#202a36" } : undefined}
          >更新 {formatDate(note.updatedAt)}</span>
          {note.tags.slice(0, 3).map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </article>
  );
}
