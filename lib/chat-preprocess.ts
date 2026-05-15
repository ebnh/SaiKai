export type PreprocessMode = "full" | "tail-heavy";

export type PreprocessResult = {
  cleanedText: string;
  originalLength: number;
  cleanedLength: number;
  removedLines: number;
  mode: PreprocessMode;
};

type Turn = {
  speaker: "ユーザー" | "AI";
  text: string;
};

const noiseFragments = [
  "chatgpt",
  "gemini",
  "claude",
  "新しいチャット",
  "履歴",
  "メニュー",
  "共有",
  "設定",
  "検索",
  "アップグレード",
  "コピーしました",
  "もっと見る",
  "関連",
  "入力してください",
  "送信",
  "音声",
  "画像を生成",
  "ファイルを追加"
];

const userPattern = /^(ユーザー|user|you|human|質問|q)[:：]\s*/i;
const aiPattern = /^(ai|assistant|chatgpt|gemini|claude|回答|a)[:：]\s*/i;

function isNoiseLine(line: string) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length <= 1) return true;
  return noiseFragments.some((fragment) => normalized.includes(fragment));
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function trimNoiseEdges(lines: string[]) {
  let start = 0;
  let end = lines.length;

  while (start < end && isNoiseLine(lines[start])) start += 1;
  while (end > start && isNoiseLine(lines[end - 1])) end -= 1;

  return lines.slice(start, end);
}

function detectSpeaker(line: string) {
  if (userPattern.test(line)) return "ユーザー" as const;
  if (aiPattern.test(line)) return "AI" as const;
  return null;
}

function stripSpeaker(line: string) {
  return line.replace(userPattern, "").replace(aiPattern, "").trim();
}

function toTurns(lines: string[]) {
  const turns: Turn[] = [];

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isNoiseLine(line)) continue;

    const speaker = detectSpeaker(line);
    const text = stripSpeaker(line);
    if (!text) continue;

    if (speaker) {
      turns.push({ speaker, text });
      continue;
    }

    const previous = turns.at(-1);
    if (previous) {
      previous.text = `${previous.text} ${text}`.trim();
    }
  }

  return turns;
}

function buildCleanedText(turns: Turn[], fallbackLines: string[], mode: PreprocessMode) {
  if (turns.length > 0) {
    const targetTurns = mode === "tail-heavy" ? turns.slice(-10) : turns;
    return targetTurns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
  }

  const joined = fallbackLines.join("\n");
  if (mode === "tail-heavy" && joined.length > 6000) {
    return joined.slice(-6000);
  }
  return joined;
}

export function preprocessImportedChat(rawText: string, mode: PreprocessMode): PreprocessResult {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const trimmedLines = trimNoiseEdges(lines);
  const turns = toTurns(trimmedLines);
  const cleanedText = buildCleanedText(turns, trimmedLines.filter((line) => !isNoiseLine(line)), mode).trim();

  return {
    cleanedText,
    originalLength: rawText.length,
    cleanedLength: cleanedText.length,
    removedLines: Math.max(lines.length - trimmedLines.length, 0),
    mode
  };
}
