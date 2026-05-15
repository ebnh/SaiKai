"use client";

import Link from "next/link";
import { fixedTags, workflowStates, type Category, type FixedTag, type SortOption, type ViewMode, type WorkflowState } from "@/lib/types";
import { sortOptions } from "@/lib/constants";
import { Button, SectionCard } from "@/components/ui";

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
  currentCategory
}: ArchiveToolbarProps) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">書庫</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {currentCategory === "all" ? "すべてのノート" : `${currentCategory}のノート`}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/resume/import">
            <Button variant="primary">新しい対話を取り込む</Button>
          </Link>
          <span className="inline-flex items-center px-1 text-sm font-medium text-ink/60">並べ方:</span>
          <Button variant={viewMode === "card" ? "secondary" : "ghost"} onClick={() => onViewModeChange("card")}>
            カード表示
          </Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => onViewModeChange("list")}>
            リスト表示
          </Button>
          <Button variant="ghost" onClick={onSelectAllVisible}>
            全て選択
          </Button>
          <Button variant="ghost" onClick={onExportJson}>
            JSONを書き出す
          </Button>
          <Button variant="danger" onClick={onTrashSelected} disabled={selectedCount === 0}>
            選択中をゴミ箱へ ({selectedCount})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="タイトル・問い・タグ・要点を検索"
          className="rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-ink/40 focus:border-clay"
        />
        <select
          value={workflowState}
          onChange={(event) => onWorkflowStateChange(event.target.value as "all" | WorkflowState)}
          className="rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay"
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
          className="rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay"
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
          className="rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </SectionCard>
  );
}
