"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

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
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen text-ink dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-6 px-4 py-5 lg:flex-row lg:px-6 lg:py-6">
        <aside className="w-full rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.68))] p-5 shadow-float dark:border-[#243140] dark:bg-none dark:bg-[#0f141b] lg:sticky lg:top-5 lg:w-[300px] lg:self-start lg:p-6">
          <div className="mb-6 overflow-hidden rounded-[28px] border border-white/75 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(227,232,239,0.88)_45%,_rgba(184,111,82,0.18))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-[#243140] dark:bg-none dark:bg-[#131b24] dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-moss dark:text-white">Context notebook</p>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-white dark:border-[#2a3747] dark:bg-[#202a36] dark:text-white dark:hover:bg-[#273342]"
                aria-label="テーマを切り替える"
              >
                {theme === "dark" ? "ライト" : "ダーク"}
              </button>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-[2rem] font-semibold text-slate dark:text-white">SaiKai</h1>
                <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-white">AIとの対話を、次に続けやすい知的な書庫へ整える。</p>
              </div>
              <div className="hidden h-14 w-14 rounded-[22px] bg-[linear-gradient(135deg,rgba(24,33,45,0.95),rgba(184,111,82,0.82))] shadow-[0_16px_30px_rgba(24,33,45,0.18)] dark:bg-none dark:bg-[#1f2a36] sm:block" />
            </div>
          </div>

          <nav className="space-y-2.5">
            <NavLink href="/" active={pathname === "/"} accent="ink" count={activeCount} label="書庫" />
            <NavLink href="/import" active={pathname === "/import"} accent="clay" count="+" label="取り込み" />
            <NavLink href="/trash" active={pathname === "/trash"} accent="moss" count={trashCount} label="ゴミ箱" />
            <NavLink href="/resume" active={pathname === "/resume"} accent="ink" count="→" label="再開作成" />
          </nav>

          {onSelectCategory ? (
            <div className="mt-8 rounded-[28px] border border-white/70 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-[#243140] dark:bg-[#18222d] dark:shadow-none">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-moss dark:text-white">カテゴリ</p>
                <span className="text-xs text-ink/45 dark:text-white/80">件数順</span>
              </div>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                <button
                  type="button"
                  onClick={() => onSelectCategory("all")}
                  className={cn(
                    "flex items-center justify-between rounded-full px-4 py-2.5 text-sm text-left transition lg:rounded-2xl",
                    selectedCategory === "all"
                      ? "bg-[linear-gradient(135deg,#18212d,#2d3847)] text-white shadow-[0_14px_28px_rgba(24,33,45,0.2)] dark:bg-none dark:bg-[#1f2a36]"
                      : "bg-sand/88 text-ink hover:bg-white dark:bg-[#202a36] dark:text-white dark:hover:bg-[#273342]"
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
                      selectedCategory === category
                        ? "bg-[linear-gradient(135deg,#b86f52,#cf8d71)] text-white shadow-[0_12px_24px_rgba(184,111,82,0.18)] dark:bg-none dark:bg-[#7a4f3f]"
                        : "bg-sand/88 hover:bg-white dark:bg-[#202a36] dark:hover:bg-[#273342]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCategory(category)}
                      className="flex min-w-0 flex-1 items-center justify-between px-4 py-2.5 text-sm text-left"
                    >
                      <span className="truncate">{category}</span>
                      <span>{categoryCounts[category] ?? 0}</span>
                    </button>
                    {onDeleteCategory && category !== "未分類" ? (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(category)}
                        className={cn(
                          "mr-2 rounded-full px-2.5 py-1 text-[11px] transition",
                          selectedCategory === category
                            ? "bg-white/18 text-white hover:bg-white/28 dark:bg-[#6f4434]"
                            : "bg-white text-ink/65 hover:bg-mist dark:bg-[#2a3747] dark:text-white dark:hover:bg-[#344253]"
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
                    className="rounded-full bg-white/86 px-4 py-2.5 text-sm text-left text-ink/70 transition hover:bg-white dark:bg-[#202a36] dark:text-white dark:hover:bg-[#273342] lg:rounded-2xl"
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

function NavLink({
  href,
  active,
  accent,
  count,
  label
}: {
  href: string;
  active: boolean;
  accent: "ink" | "clay" | "moss";
  count: React.ReactNode;
  label: string;
}) {
  const activeClass = {
    ink: "bg-[linear-gradient(135deg,#18212d,#2d3847)] text-white shadow-[0_14px_28px_rgba(24,33,45,0.2)] dark:bg-none dark:bg-[#1f2a36]",
    clay: "bg-[linear-gradient(135deg,#b86f52,#cf8d71)] text-white shadow-[0_14px_28px_rgba(184,111,82,0.2)] dark:bg-[#8d5a45]",
    moss: "bg-[linear-gradient(135deg,#6b7b58,#88996f)] text-white shadow-[0_14px_28px_rgba(107,123,88,0.18)] dark:bg-none dark:bg-[#4d5a42]"
  };

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm transition duration-200",
        active ? activeClass[accent] : "bg-white/62 text-ink hover:-translate-y-0.5 hover:bg-white dark:bg-[#18222d] dark:text-white dark:hover:bg-[#202a36]"
      )}
    >
      <span>{label}</span>
      <span className="text-xs font-semibold">{count}</span>
    </Link>
  );
}
