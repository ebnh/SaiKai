import type { Note } from "@/lib/types";

export const sampleNotes: Note[] = [
  {
    id: "note-black-hole-temperature",
    title: "ブラックホールの温度",
    category: "物理",
    tags: ["要再開", "重要"],
    workflowState: "進行中",
    question: "ブラックホールが温度を持つとはどういう意味か",
    answerSummary: [
      "ホーキング放射によりブラックホールは温度を持つとみなされる",
      "質量が大きいほど温度は低い"
    ],
    unresolvedQuestions: [
      "エントロピーが面積比例なのはなぜか",
      "負の熱容量をどう理解するか"
    ],
    understandingState: [
      "ホーキング放射の概念は理解済み",
      "エントロピーと熱力学的意味づけは未整理"
    ],
    sessions: [
      {
        id: "session-black-hole-initial",
        noteId: "note-black-hole-temperature",
        title: "ブラックホール温度の初回対話",
        createdAt: "2026-04-16T09:00:00.000Z",
        sourceType: "initial",
        sourceSummary: "初回対話",
        importedConversation:
          "ユーザー: ブラックホールが温度を持つとはどういう意味ですか？\nAI: ホーキング放射によりブラックホールは温度を持つとみなされます。\nユーザー: 質量との関係はありますか？\nAI: 質量が大きいほど温度は低くなります。",
        extractedSummary: [
          "ホーキング放射によりブラックホールは温度を持つとみなされる",
          "質量が大きいほど温度は低い"
        ],
        extractedUnresolvedQuestions: [
          "エントロピーが面積比例なのはなぜか",
          "負の熱容量をどう理解するか"
        ],
        extractedUnderstandingState: [
          "ホーキング放射の概念は理解済み",
          "エントロピーと熱力学的意味づけは未整理"
        ]
      }
    ],
    resumePrompt:
      "前回はブラックホールの温度について対話し、ホーキング放射と質量の関係までは理解しました。今回はエントロピー面積則や負の熱容量の理解を深めたいです。",
    originalChatText:
      "ユーザー: ブラックホールが温度を持つとはどういう意味ですか？\nAI: ホーキング放射によりブラックホールは温度を持つとみなされます。\nユーザー: 質量との関係はありますか？\nAI: 質量が大きいほど温度は低くなります。",
    status: "active",
    createdAt: "2026-04-16T09:00:00.000Z",
    updatedAt: "2026-04-16T09:00:00.000Z",
    deletedAt: null,
    sortOrder: 1,
    pinned: false
  }
];
