import { z } from "zod";

export const StructuredGeneratedNoteSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  answerSummary: z.string().min(1),
  unresolvedQuestions: z.array(z.string().min(1)).default([]),
  understandingState: z.array(z.string().min(1)).default([]),
  resumePrompt: z.string().min(1)
});

export type StructuredGeneratedNote = z.infer<typeof StructuredGeneratedNoteSchema>;

export const GenerateNoteRequestSchema = z.object({
  chatText: z.string().min(1),
  categoryOptions: z.array(z.string().min(1)).optional(),
  preprocessMode: z.enum(["full", "tail-heavy"]).optional(),
  previousNote: z
    .object({
      title: z.string(),
      question: z.string(),
      answerSummary: z.string(),
      unresolvedQuestions: z.array(z.string()),
      resumePrompt: z.string(),
      originalChatText: z.string().optional()
    })
    .optional()
});

export type GenerateNoteRequest = z.infer<typeof GenerateNoteRequestSchema>;
