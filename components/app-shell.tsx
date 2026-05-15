"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSED_CATEGORY_COUNT = 6;

type AppShellProps = {
  children: React.ReactNode;
  selectedCategory?: "all" | Category;
  onSelectCategory?: (category: "all" | Category) => void;
  onDeleteCategory?: (category: Category) => void;
  categoryOptions?: string[];
  categoryCounts?: Record<string, number>;
  activeCount?: number;
  trashCount?: number;
};

export function AppShell({
  children,
  selectedCategory = "all",
  onSelectCategory,
  onDeleteCategory,
  categoryOptions = [],
  categoryCounts = {},
  activeCount = 0,
  trashCount = 0
}: AppShellProps) {
  const pathname = usePathname();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const sortedCategoryOptions = useMemo(
    () =>
      [...categoryOptions].sort((left, right) => {
        const countDiff = (categoryCounts[right] ?? 0) - (categoryCounts[left] ?? 0);
        if (countDiff !== 0) return countDiff;
        return left.localeCompare(right, "ja");
      }),
    [categoryCounts, categoryOptions]
  );
  const shouldExpandCategories =
    showAllCategories ||
    sortedCategoryOptions.length <= COLLAPSED_CATEGORY_COUNT ||
    (selectedCategory !== "all" && sortedCategoryOptions.slice(COLLAPSED_CATEGORY_COUNT).includes(selectedCategory));
  const visibleCategories = shouldExpandCategories
    ? sortedCategoryOptions
    : sortedCategoryOptions.slice(0, COLLAPSED_CATEGORY_COUNT);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_rgba(244,239,230,1)_55%,_rgba(227,232,239,0.9))] text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="w-full rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-card backdrop-blur lg:sticky lg:top-6 lg:w-72 lg:self-start">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-moss">Saikai Notes</p>
              <h1 className="mt-2 text-2xl font-semibold">SaiKai</h1>
            </div>
          </div>

          <nav className="space-y-2">
            <Link
              href="/"
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                pathname === "/" ? "bg-ink text-white" : "bg-mist/70 text-ink hover:bg-mist"
              )}
            >
              <span>書庫</span>
              <span>{activeCount}</span>
            </Link>
            <Link
              href="/import"
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                pathname === "/import" ? "bg-clay text-white" : "bg-mist/70 text-ink hover:bg-mist"
              )}
            >
              <span>取り込み</span>
              <span>+</span>
            </Link>
            <Link
              href="/trash"
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                pathname === "/trash" ? "bg-moss text-white" : "bg-mist/70 text-ink hover:bg-mist"
              )}
            >
              <span>ゴミ箱</span>
              <span>{trashCount}</span>
            </Link>
            <Link
              href="/resume"
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                pathname === "/resume" ? "bg-ink text-white" : "bg-mist/70 text-ink hover:bg-mist"
              )}
            >
              <span>再開作成</span>
              <span>→</span>
            </Link>
          </nav>

          {onSelectCategory ? (
            <div className="mt-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-moss">カテゴリ</p>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                <button
                  type="button"
                  onClick={() => onSelectCategory("all")}
                  className={cn(
                    "flex items-center justify-between rounded-full px-4 py-2 text-sm text-left transition lg:rounded-2xl",
                    selectedCategory === "all" ? "bg-clay text-white" : "bg-sand hover:bg-mist"
                  )}
                >
                  <span>すべて</span>
                  <span>{activeCount}</span>
                </button>
                {visibleCategories.map((category) => (
                  <div
                    key={category}
                    className={cn(
                      "flex items-center gap-2 rounded-full transition lg:rounded-2xl",
                      selectedCategory === category ? "bg-clay text-white" : "bg-sand hover:bg-mist"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCategory(category)}
                      className="flex min-w-0 flex-1 items-center justify-between px-4 py-2 text-sm text-left"
                    >
                      <span className="truncate">{category}</span>
                      <span>{categoryCounts[category] ?? 0}</span>
                    </button>
                    {onDeleteCategory && category !== "未分類" ? (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(category)}
                        className={cn(
                          "mr-2 rounded-full px-2 py-1 text-xs transition",
                          selectedCategory === category
                            ? "bg-white/15 text-white hover:bg-white/25"
                            : "bg-white text-ink/65 hover:bg-mist"
                        )}
                        aria-label={`${category}を削除`}
                      >
                        削除
                      </button>
                    ) : null}
                  </div>
                ))}
                {sortedCategoryOptions.length > COLLAPSED_CATEGORY_COUNT ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((current) => !current)}
                    className="rounded-full bg-white px-4 py-2 text-sm text-left text-ink/70 transition hover:bg-mist lg:rounded-2xl"
                  >
                    {shouldExpandCategories
                      ? "カテゴリをたたむ"
                      : `他${sortedCategoryOptions.length - COLLAPSED_CATEGORY_COUNT}件を表示`}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
