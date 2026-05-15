import { z } from "zod";

export const noteStatuses = ["active", "archived", "trashed"] as const;
export type NoteStatus = (typeof noteStatuses)[number];
export const workflowStates = ["進行中", "保留", "完了"] as const;
export type WorkflowState = (typeof workflowStates)[number];
export const fixedTags = ["要再開", "要復習", "重要"] as const;
export type FixedTag = (typeof fixedTags)[number];

export const categories = ["科学", "旅行", "時事", "プログラミング", "学習", "仕事", "未分類"] as const;
export type PresetCategory = (typeof categories)[number];
export type Category = string;

export const SessionSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  sourceType: z.enum(["initial", "resumed"]),
  sourceSummary: z.string().min(1),
  importedConversation: z.string().min(1),
  extractedSummary: z.array(z.string().min(1)).default([]),
  extractedUnresolvedQuestions: z.array(z.string().min(1)).default([]),
  extractedUnderstandingState: z.array(z.string().min(1)).default([])
});

export type Session = z.infer<typeof SessionSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  workflowState: z.enum(workflowStates).default("進行中"),
  question: z.string().min(1),
  answerSummary: z.array(z.string().min(1)).default([]),
  unresolvedQuestions: z.array(z.string().min(1)).default([]),
  understandingState: z.array(z.string().min(1)).default([]),
  sessions: z.array(SessionSchema).default([]),
  resumePrompt: z.string().min(1),
  originalChatText: z.string().min(1),
  status: z.enum(noteStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  sortOrder: z.number(),
  pinned: z.boolean()
});

export type Note = z.infer<typeof NoteSchema>;

export const NoteDraftSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  category: z.string().min(1, "カテゴリを入力してください"),
  tags: z.array(z.string().min(1)).default([]),
  workflowState: z.enum(workflowStates).default("進行中"),
  question: z.string().min(1, "問いを入力してください"),
  answerSummary: z.array(z.string().min(1)).default([]),
  unresolvedQuestions: z.array(z.string().min(1)).default([]),
  understandingState: z.array(z.string().min(1)).default([]),
  sessions: z.array(SessionSchema).default([]),
  resumePrompt: z.string().min(1, "再開用プロンプトを入力してください"),
  originalChatText: z.string().min(1, "元チャットを入力してください")
});

export type NoteDraft = z.infer<typeof NoteDraftSchema>;

export const GeneratedNoteSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  answerSummary: z.string().min(1),
  unresolvedQuestions: z.array(z.string().min(1)).default([]),
  understandingState: z.array(z.string().min(1)).default([]),
  resumePrompt: z.string().min(1)
});

export type GeneratedNote = z.infer<typeof GeneratedNoteSchema>;

export const SortOptionSchema = z.enum([
  "updatedAt-desc",
  "createdAt-desc",
  "title-asc",
  "category-asc"
]);

export type SortOption = z.infer<typeof SortOptionSchema>;

export type ViewMode = "card" | "list";

export type NoteFilters = {
  search: string;
  category: "all" | Category;
  sort: SortOption;
  viewMode: ViewMode;
};

export type NoteInput = NoteDraft & {
  id?: string;
  status?: NoteStatus;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
  pinned?: boolean;
};
