import {
  categories,
  type Category,
  type FixedTag,
  type GeneratedNote,
  type Note,
  type SortOption,
  type WorkflowState
} from "@/lib/types";
import { TRASH_RETENTION_DAYS } from "@/lib/constants";

const HIDDEN_CATEGORIES_KEY = "a_hidden_categories";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizeFixedTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

export function normalizeCategory(input: string) {
  return input.trim() || "未分類";
}

export function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function toLineItems(input: string) {
  const lines = input
    .split(/\n+/)
    .map((item) => item.replace(/^[-・●]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return uniqueStrings(lines);

  return uniqueStrings(
    input
      .split(/。+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

export function getTrashDaysLeft(deletedAt: string | null) {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const deleted = new Date(deletedAt).getTime();
  const expires = deleted + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const diff = Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(diff, 0);
}

export function sortNotes(notes: Note[], sort: SortOption) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    switch (sort) {
      case "createdAt-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "title-asc":
        return a.title.localeCompare(b.title, "ja");
      case "category-asc":
        return a.category.localeCompare(b.category, "ja") || a.title.localeCompare(b.title, "ja");
      case "updatedAt-desc":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
}

type FilterOptions = {
  search: string;
  category: "all" | Category;
  workflowState?: "all" | WorkflowState;
  tag?: "all" | FixedTag;
};

export function filterNotes(
  notes: Note[],
  { search, category, workflowState = "all", tag = "all" }: FilterOptions
) {
  const term = search.trim().toLowerCase();
  return notes.filter((note) => {
    const matchesCategory = category === "all" || note.category === category;
    if (!matchesCategory) return false;
    const matchesWorkflowState = workflowState === "all" || note.workflowState === workflowState;
    if (!matchesWorkflowState) return false;
    const matchesTag = tag === "all" || note.tags.includes(tag);
    if (!matchesTag) return false;
    if (!term) return true;

    const haystack = [
      note.title,
      note.workflowState,
      note.question,
      note.answerSummary.join(" "),
      note.resumePrompt,
      note.tags.join(" "),
      note.understandingState.join(" "),
      note.unresolvedQuestions.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function getHiddenCategories() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(HIDDEN_CATEGORIES_KEY);
    const parsed = stored ? (JSON.parse(stored) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hideCategory(category: string) {
  if (typeof window === "undefined") return;
  const hidden = Array.from(new Set([...getHiddenCategories(), category]));
  window.localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(hidden));
}

export function isProtectedCategory(category: string) {
  return category === "未分類";
}

export function getCategoryOptions(notes: Note[]) {
  const hiddenCategories = new Set(getHiddenCategories());
  return Array.from(
    new Set(
      [...categories, ...notes.map((note) => normalizeCategory(note.category))].filter(
        (category) => !hiddenCategories.has(category) || isProtectedCategory(category)
      )
    )
  );
}

export function summarizeForCard(text: string, length = 110) {
  return text.length <= length ? text : `${text.slice(0, length)}...`;
}

export function guessCategory(text: string): Category {
  const rules: Array<{ category: Category; keywords: string[] }> = [
    { category: "科学", keywords: ["医療", "病気", "治療", "薬", "症状", "量子", "力学", "数学", "統計", "生物", "化学"] },
    { category: "旅行", keywords: ["旅行", "観光", "ホテル", "航空券", "温泉", "海外", "国内", "旅程"] },
    { category: "時事", keywords: ["政治", "経済", "制度", "歴史", "法律", "政策", "ニュース", "選挙"] },
    { category: "プログラミング", keywords: ["typescript", "javascript", "python", "next.js", "react", "api", "コード", "プログラム"] },
    { category: "学習", keywords: ["勉強", "学習", "試験", "読書", "要約", "理解", "概念"] },
    { category: "仕事", keywords: ["転職", "面接", "職務経歴書", "キャリア", "仕事", "マネジメント", "会議"] }
  ];

  const matched = rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  return matched?.category ?? categories[categories.length - 1];
}

export function buildResumePrompt(note: Pick<GeneratedNote, "question" | "answerSummary" | "unresolvedQuestions">) {
  const unresolved =
    note.unresolvedQuestions.length > 0
      ? note.unresolvedQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "特になし";
  return [
    "以前の会話の続きとして回答してください。まず下の要約を前提に現在地を短く確認し、そのうえで次の論点を進めてください。",
    "",
    `知りたかったこと: ${note.question}`,
    "",
    `ここまでに分かったこと: ${note.answerSummary}`,
    "",
    "まだ確認したいこと:",
    unresolved,
    "",
    "要望:",
    "- これまでの文脈を踏まえて話をつなげる",
    "- 必要なら抜けている前提や論点を補う",
    "- 次に聞くと良い質問も最後に提案する"
  ].join("\n");
}
