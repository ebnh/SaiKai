import type { SortOption } from "@/lib/types";

export const STORAGE_KEY = "a-notes-storage";
export const TRASH_RETENTION_DAYS = 30;

export const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "updatedAt-desc", label: "更新が新しい順" },
  { value: "createdAt-desc", label: "作成が新しい順" },
  { value: "title-asc", label: "タイトル順" },
  { value: "category-asc", label: "カテゴリ順" }
];
