import { StructuredGeneratedNoteSchema } from "@/lib/openai/schema";

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractStructuredText(payload: ResponsesApiPayload) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const textFromOutput = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && typeof content.text === "string")
    ?.text;

  if (textFromOutput?.trim()) {
    return textFromOutput.trim();
  }

  return null;
}

export async function generateStructuredNoteWithOpenAI(params: {
  chatText: string;
  categoryOptions?: string[];
  model?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { note: null, reason: "OPENAI_API_KEY が未設定のためフォールバック生成を使用しました。" };
  }

  const model = params.model ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const categoryOptions = Array.from(new Set((params.categoryOptions ?? []).filter(Boolean)));
  const prompt = [
    "以下の会話を、後で別のAIに自然に再開してもらうための対話ノートへ変換してください。",
    "会話全体を短く整理し、ユーザーが何を知りたかったか、何が分かったか、次に何を確認すべきかが一目で分かるようにしてください。",
    "",
    "出力ルール:",
    "- JSONのみを返す",
    "- title は短く自然な題名",
    "- category は指定カテゴリ候補から最も近いものを1つだけ選ぶ",
    "- question はユーザーが最も知りたかったことを1〜2文で整理する",
    "- answerSummary は会話全体を踏まえて3〜6文程度で簡潔にまとめる",
    "- unresolvedQuestions は残っている疑問や次に掘るべき論点を2〜4件返す",
    "- understandingState は、ここまで理解できたこととまだ曖昧なことを2〜4件の短い箇条書きで返す",
    "- resumePrompt は、そのまま別のAIに貼って会話再開できる自然な日本語にする",
    "- 会話が長い場合でも最後の発話だけでなく流れ全体を要約する",
    "",
    "カテゴリ候補:",
    ...categoryOptions.map((category) => `- ${category}`)
  ].join("\n");

  const generatedNoteJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "category",
      "question",
      "answerSummary",
      "unresolvedQuestions",
      "understandingState",
      "resumePrompt"
    ],
    properties: {
      title: { type: "string" },
      category: { type: "string", enum: categoryOptions },
      question: { type: "string" },
      answerSummary: { type: "string" },
      unresolvedQuestions: {
        type: "array",
        items: { type: "string" }
      },
      understandingState: {
        type: "array",
        items: { type: "string" }
      },
      resumePrompt: { type: "string" }
    }
  } as const;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: "あなたは長いAI会話を再開可能なノートに整理する編集者です。" }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: `${prompt}\n\n会話本文:\n${params.chatText}` }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "structured_generated_note",
          schema: generatedNoteJsonSchema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      note: null,
      reason: `LLM 呼び出しに失敗しました (${response.status})。${errorText.slice(0, 180)}`
    };
  }

  const payload = (await response.json()) as ResponsesApiPayload;
  const structuredText = extractStructuredText(payload);

  if (!structuredText) {
    return {
      note: null,
      reason: "LLM から structured output を取得できなかったためフォールバック生成を使用しました。レスポンスに JSON テキストが見つかりませんでした。"
    };
  }

  try {
    const parsed = StructuredGeneratedNoteSchema.parse(JSON.parse(structuredText));
    if (!categoryOptions.includes(parsed.category)) {
      return {
        note: null,
        reason: "LLM がカテゴリ候補外の値を返したためフォールバック生成を使用しました。"
      };
    }
    return { note: parsed };
  } catch {
    return {
      note: null,
      reason: "LLM 出力の JSON 解析または structured schema 検証に失敗したためフォールバック生成を使用しました。"
    };
  }
}
