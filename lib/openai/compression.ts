import type { GenerateNoteRequest } from "@/lib/openai/schema";

type PreviousNoteContext = GenerateNoteRequest["previousNote"];

export type CompressionMode =
  | "existing-note-diff"
  | "recent-turns"
  | "hard-trim"
  | "full-chat";

export type CompressionResult = {
  mode: CompressionMode;
  promptText: string;
  originalLength: number;
  compressedLength: number;
};

const DEFAULT_CHAR_BUDGET = 7000;
const RECENT_TURN_COUNT = 6;

function splitTurns(chatText: string) {
  return chatText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function trimToBudget(text: string, budget: number) {
  return text.length <= budget ? text : text.slice(text.length - budget);
}

function buildPreviousNoteContext(previousNote: PreviousNoteContext) {
  if (!previousNote) return "";

  const unresolved =
    previousNote.unresolvedQuestions.length > 0
      ? previousNote.unresolvedQuestions.map((item) => `- ${item}`).join("\n")
      : "- 特になし";

  return [
    "前回ノート要約:",
    `タイトル: ${previousNote.title}`,
    `知りたかったこと: ${previousNote.question}`,
    `ここまでの理解: ${previousNote.answerSummary}`,
    "残っている疑問:",
    unresolved,
    `再開用プロンプト: ${previousNote.resumePrompt}`
  ].join("\n");
}

function buildDiff(chatText: string, previousNote: PreviousNoteContext) {
  const previousChat = previousNote?.originalChatText?.trim();
  if (!previousChat) return chatText.trim();

  const normalizedCurrent = chatText.trim();
  if (normalizedCurrent.startsWith(previousChat)) {
    return normalizedCurrent.slice(previousChat.length).trim() || normalizedCurrent;
  }

  return normalizedCurrent;
}

export function compressChatInput(params: {
  chatText: string;
  previousNote?: PreviousNoteContext;
  charBudget?: number;
}): CompressionResult {
  const { chatText, previousNote, charBudget = DEFAULT_CHAR_BUDGET } = params;
  const normalized = chatText.trim();
  const previousContext = buildPreviousNoteContext(previousNote);

  if (!normalized) {
    return {
      mode: "full-chat",
      promptText: "",
      originalLength: 0,
      compressedLength: 0
    };
  }

  if (previousContext) {
    const diff = buildDiff(normalized, previousNote);
    const composed = [previousContext, "", "今回の追加会話:", diff].join("\n");
    if (composed.length <= charBudget) {
      return {
        mode: "existing-note-diff",
        promptText: composed,
        originalLength: normalized.length,
        compressedLength: composed.length
      };
    }
  }

  const turns = splitTurns(normalized);
  const recentTurns = turns.slice(-RECENT_TURN_COUNT).join("\n");
  if (recentTurns.length > 0 && recentTurns.length <= charBudget) {
    return {
      mode: "recent-turns",
      promptText: recentTurns,
      originalLength: normalized.length,
      compressedLength: recentTurns.length
    };
  }

  const hardTrimmed = trimToBudget(recentTurns || normalized, charBudget);
  if (hardTrimmed.length < normalized.length) {
    return {
      mode: "hard-trim",
      promptText: hardTrimmed,
      originalLength: normalized.length,
      compressedLength: hardTrimmed.length
    };
  }

  return {
    mode: "full-chat",
    promptText: normalized,
    originalLength: normalized.length,
    compressedLength: normalized.length
  };
}
