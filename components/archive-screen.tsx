"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { ArchiveToolbar } from "@/components/archive-toolbar";
import { NoteCard } from "@/components/note-card";
import { Button, EmptyState, SectionCard } from "@/components/ui";
import { STORAGE_KEY } from "@/lib/constants";
import type { Category, FixedTag, ViewMode, WorkflowState } from "@/lib/types";
import { filterNotes, getCategoryOptions, hideCategory, isProtectedCategory, normalizeCategory, normalizeFixedTags, sortNotes } from "@/lib/utils";
import { fixedTags, workflowStates } from "@/lib/types";
import { useNotes } from "@/providers/notes-provider";

const NOTES_PER_PAGE = 10;

export function ArchiveScreen() {
  const { notes, isLoaded, trashNotes, bulkUpdateNotes, importNotes } = useNotes();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [workflowState, setWorkflowState] = useState<"all" | WorkflowState>("all");
  const [tag, setTag] = useState<"all" | FixedTag>("all");
  const [sort, setSort] = useState<"updatedAt-desc" | "createdAt-desc" | "title-asc" | "category-asc">("updatedAt-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkState, setBulkState] = useState<"" | WorkflowState>("");
  const [bulkTags, setBulkTags] = useState<FixedTag[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeNotes = useMemo(() => notes.filter((note) => note.status === "active"), [notes]);
  const trashCount = useMemo(() => notes.filter((note) => note.status === "trashed").length, [notes]);
  const categoryOptions = useMemo(() => getCategoryOptions(activeNotes), [activeNotes, categoryRefreshKey]);
  const categoryCounts = useMemo(
    () =>
      activeNotes.reduce<Record<string, number>>((counts, note) => {
        counts[note.category] = (counts[note.category] ?? 0) + 1;
        return counts;
      }, {}),
    [activeNotes]
  );

  const visibleNotes = useMemo(
    () => sortNotes(filterNotes(activeNotes, { search, category, workflowState, tag }), sort),
    [activeNotes, category, search, sort, tag, workflowState]
  );
  const totalPages = Math.max(1, Math.ceil(visibleNotes.length / NOTES_PER_PAGE));
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * NOTES_PER_PAGE;
    return visibleNotes.slice(start, start + NOTES_PER_PAGE);
  }, [currentPage, visibleNotes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, workflowState, tag, sort, viewMode]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function handleTrashSelected() {
    await trashNotes(selectedIds);
    setSelectedIds([]);
  }

  async function handleTrashSingle(id: string) {
    await trashNotes([id]);
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  async function handleBulkApply() {
    if (selectedIds.length === 0) return;

    const patch: { category?: Category; workflowState?: WorkflowState; tags?: FixedTag[] } = {};

    if (bulkCategory.trim()) {
      patch.category = normalizeCategory(bulkCategory);
    }
    if (bulkState) {
      patch.workflowState = bulkState;
    }
    if (bulkTags.length > 0) {
      patch.tags = normalizeFixedTags(bulkTags) as FixedTag[];
    }
    if (Object.keys(patch).length === 0) return;

    await bulkUpdateNotes(selectedIds, patch);
    setSelectedIds([]);
    setBulkCategory("");
    setBulkState("");
    setBulkTags([]);
  }

  async function handleDeleteCategory(targetCategory: Category) {
    if (targetCategory === "all" || isProtectedCategory(targetCategory)) return;

    const idsToMove = activeNotes
      .filter((note) => normalizeCategory(note.category) === targetCategory)
      .map((note) => note.id);

    if (idsToMove.length > 0) {
      await bulkUpdateNotes(idsToMove, { category: "未分類" });
    }

    hideCategory(targetCategory);
    setCategoryRefreshKey((current) => current + 1);
    if (category === targetCategory) {
      setCategory("all");
    }
  }

  function handleExportJson() {
    const payload = {
      app: "SaiKai",
      exportedAt: new Date().toISOString(),
      storageKey: STORAGE_KEY,
      notes: activeNotes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `saikai-export-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setStatusMessage("ゴミ箱を除いたノートを JSON で書き出しました");
    window.setTimeout(() => setStatusMessage(null), 2200);
  }

  function handleOpenImportJson() {
    fileInputRef.current?.click();
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedCandidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.notes)
          ? parsed.notes
          : parsed?.note
            ? [parsed.note]
            : [];

      if (importedCandidates.length === 0) {
        throw new Error("取り込めるノートが見つかりませんでした");
      }

      const result = await importNotes(importedCandidates);
      setStatusMessage(`JSON から ${result.importedCount} 件のノートを取り込みました`);
      window.setTimeout(() => setStatusMessage(null), 2200);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "JSON の取り込みに失敗しました");
      window.setTimeout(() => setStatusMessage(null), 2600);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <AppShell
      selectedCategory={category}
      onSelectCategory={setCategory}
      onDeleteCategory={handleDeleteCategory}
      categoryOptions={categoryOptions}
      categoryCounts={categoryCounts}
      activeCount={activeNotes.length}
      trashCount={trashCount}
    >
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportJson(event)}
        />
        <ArchiveToolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          workflowState={workflowState}
          onWorkflowStateChange={setWorkflowState}
          tag={tag}
          onTagChange={setTag}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedIds.length}
          onSelectAllVisible={() => setSelectedIds(visibleNotes.map((note) => note.id))}
          onTrashSelected={handleTrashSelected}
          onExportJson={handleExportJson}
          onImportJson={handleOpenImportJson}
          currentCategory={category}
        />
        {statusMessage ? (
          <SectionCard className="py-3">
            <p className="text-sm font-medium text-emerald-700">{statusMessage}</p>
          </SectionCard>
        ) : null}

        {selectedIds.length > 0 ? (
          <SectionCard className="space-y-4 motion-safe:animate-[bulk-edit-panel-in_220ms_ease-out]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">一括編集</p>
                <h3 className="mt-2 text-lg font-semibold">選択中 {selectedIds.length} 冊をまとめて変更</h3>
              </div>
              <Button onClick={handleBulkApply}>選択中に反映する</Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium">カテゴリ</span>
                <input
                  list="bulk-category-options"
                  value={bulkCategory}
                  onChange={(event) => setBulkCategory(event.target.value)}
                  placeholder="未入力なら変更しない"
                  className="w-full rounded-2xl border border-mist bg-sand px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <datalist id="bulk-category-options">
                  {categoryOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium">状態</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkState("")}
                    className={`rounded-full px-3 py-1 text-xs transition ${bulkState === "" ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist"}`}
                  >
                    変更しない
                  </button>
                  {workflowStates.map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => setBulkState(state)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        bulkState === state ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist"
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">タグ</span>
                <div className="flex flex-wrap gap-2">
                  {fixedTags.map((item) => {
                    const selected = bulkTags.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setBulkTags((current) =>
                            selected ? current.filter((tag) => tag !== item) : [...current, item]
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          selected ? "bg-clay text-white" : "bg-sand text-ink hover:bg-mist"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink/55">タグは選択した内容でまとめて上書きされます。</p>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {!isLoaded ? (
          <SectionCard>読み込み中...</SectionCard>
        ) : visibleNotes.length === 0 ? (
          <EmptyState
            title="条件に合うノートがありません"
            description="検索語やカテゴリを変えるか、新しい会話を取り込んで最初のノートを作成してください。"
            action={
              <Link href="/import">
                <Button>会話を取り込む</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-5">
            <div className={viewMode === "card" ? "grid gap-5 xl:grid-cols-2" : "space-y-4"}>
              {paginatedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={selectedIds.includes(note.id)}
                onToggleSelect={toggleSelect}
                viewMode={viewMode}
                actions={
                  <>
                    <Link href={`/notes/${note.id}`}>
                      <Button variant="ghost">見る</Button>
                    </Link>
                    <Link href={`/resume?noteId=${encodeURIComponent(note.id)}`}>
                      <Button variant="secondary">このノートを再開する</Button>
                    </Link>
                    <Button variant="danger" onClick={() => void handleTrashSingle(note.id)}>
                      ゴミ箱に入れる
                    </Button>
                  </>
                }
              />
            ))}
          </div>

            <SectionCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/70 dark:text-slate-200">
                {visibleNotes.length}冊中 {(currentPage - 1) * NOTES_PER_PAGE + 1}-
                {Math.min(currentPage * NOTES_PER_PAGE, visibleNotes.length)}冊を表示
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                  前へ
                </Button>
                <span className="rounded-full bg-sand px-3 py-2 text-sm text-ink/75">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}
