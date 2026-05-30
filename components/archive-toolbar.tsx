"use client";

import Link from "next/link";
import { fixedTags, workflowStates, type Category, type FixedTag, type SortOption, type ViewMode, type WorkflowState } from "@/lib/types";
import { sortOptions } from "@/lib/constants";
import { Button, SectionCard } from "@/components/ui";
import { useTheme } from "@/providers/theme-provider";

type ArchiveToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  workflowState: "all" | WorkflowState;
  onWorkflowStateChange: (value: "all" | WorkflowState) => void;
  tag: "all" | FixedTag;
  onTagChange: (value: "all" | FixedTag) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  selectedCount: number;
  onSelectAllVisible: () => void;
  onTrashSelected: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  currentCategory: "all" | Category;
};

export function ArchiveToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  workflowState,
  onWorkflowStateChange,
  tag,
  onTagChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onSelectAllVisible,
  onTrashSelected,
  onExportJson,
  onImportJson,
  currentCategory
}: ArchiveToolbarProps) {
  const { theme } = useTheme();
  return (
    <SectionCard className="space-y-5 overflow-hidden dark:text-slate-100">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-moss">書庫</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate dark:text-white">
            {currentCategory === "all" ? "すべてのノート" : `${currentCategory}のノート`}
          </h2>
          <p
            className="mt-2 text-sm text-ink/60 dark:text-slate-300"
            style={theme === "dark" ? { color: "#e2e8f0" } : undefined}
          >
            探す、整える、再開する、をひとつの流れで扱える作業面です。
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/resume/import">
            <Button variant="primary">新しい対話を取り込む</Button>
          </Link>
          <Button variant="ghost" onClick={onImportJson}>
            JSONを取り込む
          </Button>
          <Button variant="ghost" onClick={onExportJson}>
            JSONを書き出す
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[28px] border border-white/70 bg-sand/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-[#314155] dark:bg-[#18212d] dark:shadow-none">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-moss">検索</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="タイトル・問い・タグ・要点を検索"
              className="w-full rounded-2xl border border-white/80 bg-white/92 px-4 py-3.5 text-sm outline-none ring-0 transition placeholder:text-ink/40 focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#d79374]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-full bg-white/75 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-moss dark:bg-[#202a36] dark:text-slate-300">
              並べ方
            </span>
            <Button variant={viewMode === "card" ? "secondary" : "ghost"} onClick={() => onViewModeChange("card")}>カード表示</Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => onViewModeChange("list")}>リスト表示</Button>
            <Button variant="ghost" onClick={onSelectAllVisible}>全て選択</Button>
            <Button variant="danger" onClick={onTrashSelected} disabled={selectedCount === 0}>
              選択中をゴミ箱へ ({selectedCount})
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <select
            value={workflowState}
            onChange={(event) => onWorkflowStateChange(event.target.value as "all" | WorkflowState)}
            className="rounded-2xl border border-white/80 bg-white/88 px-4 py-3.5 text-sm outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          >
            <option value="all">状態: すべて</option>
            {workflowStates.map((state) => (
              <option key={state} value={state}>
                状態: {state}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(event) => onTagChange(event.target.value as "all" | FixedTag)}
            className="rounded-2xl border border-white/80 bg-white/88 px-4 py-3.5 text-sm outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374]"
          >
            <option value="all">タグ: すべて</option>
            {fixedTags.map((item) => (
              <option key={item} value={item}>
                タグ: {item}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="rounded-2xl border border-white/80 bg-white/88 px-4 py-3.5 text-sm outline-none focus:border-clay dark:border-[#314155] dark:bg-[#18212d] dark:text-white dark:focus:border-[#d79374] sm:col-span-2 xl:col-span-1"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SectionCard>
  );
}
