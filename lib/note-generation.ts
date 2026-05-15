import { GeneratedNoteSchema, type GeneratedNote } from "@/lib/types";
import { guessCategory } from "@/lib/utils";

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createFallbackTitle(question: string) {
  const normalized = question.replace(/[?？]$/, "").trim();
  const titled = normalized.endsWith("を整理") || normalized.endsWith("を知りたい")
    ? normalized
    : `${normalized}を整理`;
  return titled.length <= 38 ? titled : `${titled.slice(0, 38)}...`;
}

type Turn = {
  speaker: "user" | "assistant" | "unknown";
  text: string;
};

const userPattern = /^(q[:：]|質問[:：]|user[:：]|ユーザー[:：]|human[:：])/i;
const assistantPattern = /^(a[:：]|回答[:：]|assistant[:：]|ai[:：]|bot[:：])/i;

function cleanSpeakerPrefix(line: string) {
  return line.replace(/^(q[:：]|質問[:：]|user[:：]|ユーザー[:：]|human[:：]|a[:：]|回答[:：]|assistant[:：]|ai[:：]|bot[:：])\s*/i, "").trim();
}

function toTurns(text: string): Turn[] {
  const lines = splitParagraphs(text);
  const turns: Turn[] = [];

  for (const line of lines) {
    const speaker = userPattern.test(line)
      ? "user"
      : assistantPattern.test(line)
        ? "assistant"
        : "unknown";

    const content = cleanSpeakerPrefix(line);
    if (!content) continue;

    const previous = turns.at(-1);
    if (speaker === "unknown" && previous) {
      previous.text = `${previous.text} ${content}`.trim();
      continue;
    }

    turns.push({ speaker, text: content });
  }

  if (turns.length === 0) {
    return lines.map((line, index) => ({
      speaker: index === 0 ? "user" : "assistant",
      text: line
    }));
  }

  return turns;
}

function uniqueTexts(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function clip(text: string, max = 160) {
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}

function normalizeSentence(text: string) {
  return text.replace(/\s+/g, " ").replace(/[。]+/g, "。").trim();
}

function ensurePeriod(text: string) {
  return /[。.!！?？]$/.test(text) ? text : `${text}。`;
}

function toBullets(items: string[], prefix = "・") {
  return items.map((item) => `${prefix}${item}`).join("\n");
}

function detectQuestion(turns: Turn[]) {
  const userTurns = turns.filter((turn) => turn.speaker === "user").map((turn) => turn.text);
  if (userTurns.length === 0) {
    return turns[0]?.text ?? "この会話の主要な論点";
  }

  if (userTurns.length === 1) {
    return clip(userTurns[0], 150);
  }

  const primary = clip(userTurns[0], 90).replace(/[?？]$/, "");
  const followUps = userTurns
    .slice(1, 3)
    .map((turn) => clip(turn, 60).replace(/[?？]$/, ""))
    .filter(Boolean);

  if (followUps.length === 0) {
    return primary;
  }

  return `${primary}。あわせて${followUps.join("、")}も確認したい`;
}

function summarizeAssistant(turns: Turn[]) {
  const assistantTurns = uniqueTexts(
    turns.filter((turn) => turn.speaker === "assistant").map((turn) => turn.text)
  );

  if (assistantTurns.length === 0) {
    return "会話内容から主要な回答を要約しました。";
  }

  const points = assistantTurns
    .slice(0, 3)
    .map((turn) => ensurePeriod(clip(normalizeSentence(turn), 92)));

  if (points.length === 1) {
    return points[0];
  }

  return clip(`会話では、${points.join(" ")}`, 320);
}

function detectUnresolved(turns: Turn[], answerSummary: string) {
  const userTurns = uniqueTexts(turns.filter((turn) => turn.speaker === "user").map((turn) => turn.text));
  const assistantText = turns
    .filter((turn) => turn.speaker === "assistant")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();

  const candidates = userTurns
    .filter((turn, index) => index > 0 || /[?？]/.test(turn))
    .filter((turn) => {
      const normalized = turn.replace(/[?？]/g, "").toLowerCase();
      return normalized.length > 6 && !assistantText.includes(normalized.slice(0, Math.min(14, normalized.length)));
    })
    .slice(-3);

  if (candidates.length > 0) {
    return candidates.map((item) => item.replace(/[?？]$/, ""));
  }

  const fallback = [
    "この要点を前提に、具体例や適用条件をもう少し確認したい",
    "次に深掘りすべき論点を整理したい"
  ];

  if (answerSummary.includes("比較") || answerSummary.includes("違い")) {
    return ["違いが実務や具体例でどう現れるか確認したい"];
  }

  return fallback;
}

function extractTags(question: string, summary: string, category: string) {
  const stopWords = new Set([
    "について",
    "整理",
    "したい",
    "ある",
    "こと",
    "ように",
    "ため",
    "ここまで",
    "以前",
    "会話",
    "確認",
    "内容"
  ]);
  const source = `${question} ${summary}`;
  const words = source
    .split(/[、。,．,\s\n/:：()\[\]「」『』]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && word.length <= 8)
    .filter((word) => !stopWords.has(word));

  return uniqueTexts([category, ...words]).slice(0, 3);
}

function deriveFallbackUnderstandingState(answerSummary: string, unresolvedQuestions: string[]) {
  const sentences = answerSummary
    .split(/[。.!！?？\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return uniqueTexts([
    sentences[0] ? `${clip(sentences[0], 46)}までは理解が進んだ` : "ここまでの要点は一度整理できた",
    unresolvedQuestions.length > 0 ? "まだ深掘りしたい疑問が残っている" : "主要な論点はひとまず整理できた"
  ]);
}

function buildFallbackResumePrompt(
  turns: Turn[],
  question: string,
  answerSummary: string,
  unresolvedQuestions: string[]
) {
  const userTopics = uniqueTexts(
    turns
      .filter((turn) => turn.speaker === "user")
      .map((turn) => clip(turn.text.replace(/[?？]$/, ""), 70))
  ).slice(0, 3);

  const answerPoints = uniqueTexts(
    turns
      .filter((turn) => turn.speaker === "assistant")
      .map((turn) => clip(normalizeSentence(turn.text), 80))
  ).slice(0, 3);

  const unresolved = unresolvedQuestions.length > 0 ? unresolvedQuestions : ["この続きを具体例ベースで深掘りしたい"];

  return [
    "以前の会話の続きとして回答してください。以下は元会話を整理した要約です。",
    "",
    "知りたかったこと:",
    toBullets(userTopics.length > 0 ? userTopics : [question]),
    "",
    "ここまでの要点:",
    toBullets(answerPoints.length > 0 ? answerPoints : [answerSummary]),
    "",
    "まだ確認したいこと:",
    toBullets(unresolved),
    "",
    "この要約を前提に、まず現在地を2〜3文で確認し、その後に続きを詳しく説明してください。最後に次に聞くと良い質問も提案してください。"
  ].join("\n");
}

export function generateFallbackNote(chatText: string): GeneratedNote {
  const turns = toTurns(chatText);
  const question = detectQuestion(turns);
  const answerSummary = summarizeAssistant(turns);
  const unresolvedQuestions = detectUnresolved(turns, answerSummary);
  const category = guessCategory(chatText);

  const draft = {
    title: createFallbackTitle(question),
    category,
    question,
    answerSummary,
    unresolvedQuestions,
    understandingState: deriveFallbackUnderstandingState(answerSummary, unresolvedQuestions),
    resumePrompt: buildFallbackResumePrompt(turns, question, answerSummary, unresolvedQuestions)
  };

  return GeneratedNoteSchema.parse(draft);
}
