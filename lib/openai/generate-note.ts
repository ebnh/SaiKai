import { GeneratedNoteSchema, type GeneratedNote } from "@/lib/types";
import { preprocessImportedChat } from "@/lib/chat-preprocess";
import { compressChatInput, type CompressionResult } from "@/lib/openai/compression";
import { generateStructuredNoteWithOpenAI } from "@/lib/openai/client";
import { GenerateNoteRequestSchema } from "@/lib/openai/schema";
import { generateFallbackNote } from "@/lib/note-generation";
import { getCategoryOptions } from "@/lib/utils";

type GenerateNoteServiceResult = {
  note: GeneratedNote;
  source: "llm" | "fallback";
  reason?: string;
  compression: CompressionResult;
  preprocessing: {
    mode: "full" | "tail-heavy";
    originalLength: number;
    cleanedLength: number;
    removedLines: number;
  };
};

export async function generateNoteFromChat(input: unknown): Promise<GenerateNoteServiceResult> {
  const parsedInput = GenerateNoteRequestSchema.parse(input);
  const categoryOptions = getCategoryOptions(
    (parsedInput.categoryOptions ?? []).map((category, index) => ({
      id: `virtual-${index}`,
      title: "",
      category,
      tags: [],
      workflowState: "進行中",
      question: "",
      answerSummary: [],
      unresolvedQuestions: [],
      understandingState: [],
      sessions: [],
      resumePrompt: "",
      originalChatText: "",
      status: "active",
      createdAt: "",
      updatedAt: "",
      deletedAt: null,
      sortOrder: 0,
      pinned: false
    }))
  );
  const preprocessing = preprocessImportedChat(
    parsedInput.chatText,
    parsedInput.preprocessMode ?? "full"
  );
  const compression = compressChatInput({
    chatText: preprocessing.cleanedText,
    previousNote: parsedInput.previousNote
  });

  try {
    const llmResult = await generateStructuredNoteWithOpenAI({
      chatText: compression.promptText,
      categoryOptions
    });
    if (llmResult.note) {
      const parsed = GeneratedNoteSchema.parse({
        ...llmResult.note
      });

      return {
        note: parsed,
        source: "llm",
        compression,
        preprocessing
      };
    }

    return {
      note: generateFallbackNote(compression.promptText),
      source: "fallback",
      reason: llmResult.reason,
      compression,
      preprocessing
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return {
      note: generateFallbackNote(compression.promptText),
      source: "fallback",
      reason: `LLM 生成中に予期しないエラーが発生したためフォールバック生成を使用しました。詳細: ${message}`,
      compression,
      preprocessing
    };
  }
}
