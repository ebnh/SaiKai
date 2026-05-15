import { NextResponse } from "next/server";
import { generateNoteFromChat } from "@/lib/openai/generate-note";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await generateNoteFromChat(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ノート生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
