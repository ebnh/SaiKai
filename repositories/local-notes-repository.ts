"use client";

import { STORAGE_KEY } from "@/lib/constants";
import { sampleNotes } from "@/lib/sample-data";
import { NoteSchema, type Note, type NoteInput, type Session } from "@/lib/types";
import { createId } from "@/lib/utils";
import type { NotesRepository } from "@/repositories/notes-repository";

const legacySampleIds = new Set(["sample-1", "sample-2", "sample-3"]);

function stripLegacySamples(notes: Note[]) {
  return notes.filter((note) => !legacySampleIds.has(note.id));
}

function ensureNoteShape(raw: Record<string, unknown>): Note {
  const answerSummary =
    Array.isArray(raw.answerSummary)
      ? raw.answerSummary
      : typeof raw.answerSummary === "string"
        ? raw.answerSummary
            .split(/\n+/)
            .map((item) => item.replace(/^[-・●]\s*/, "").trim())
            .filter(Boolean)
        : [];

  const unresolvedQuestions = Array.isArray(raw.unresolvedQuestions)
    ? raw.unresolvedQuestions.filter((item): item is string => typeof item === "string")
    : [];

  const understandingState =
    Array.isArray(raw.understandingState) && raw.understandingState.every((item) => typeof item === "string")
      ? (raw.understandingState as string[])
      : [
          answerSummary[0] ? `${answerSummary[0]}までは整理済み` : "前回の要点は整理済み",
          unresolvedQuestions.length > 0 ? "未解決点が残っている" : "主要な疑問は一度整理済み"
        ];

  const sessions =
    Array.isArray(raw.sessions) && raw.sessions.length > 0
      ? (raw.sessions as Session[])
      : [
          {
            id: `session-${String(raw.id ?? createId())}-initial`,
            noteId: String(raw.id ?? createId()),
            title: `${String(raw.title ?? "初回対話")}`,
            createdAt: String(raw.createdAt ?? new Date().toISOString()),
            sourceType: "initial" as const,
            sourceSummary: "初回対話",
            importedConversation: String(raw.originalChatText ?? ""),
            extractedSummary: answerSummary,
            extractedUnresolvedQuestions: unresolvedQuestions,
            extractedUnderstandingState: understandingState
          }
        ];

  return NoteSchema.parse({
    ...raw,
    answerSummary,
    unresolvedQuestions,
    understandingState,
    sessions
  });
}

function readNotes(): Note[] {
  if (typeof window === "undefined") return sampleNotes;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleNotes));
      return sampleNotes;
    }

    const parsed = JSON.parse(stored) as unknown[];
    const notes = stripLegacySamples(parsed.map((item) => ensureNoteShape(item as Record<string, unknown>)));
    if (notes.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } else if (JSON.stringify(notes) !== JSON.stringify(parsed)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
    return notes;
  } catch {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleNotes));
    } catch {
      return [];
    }
    return sampleNotes;
  }
}

function writeNotes(notes: Note[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Safari private browsing or storage restrictions can fail here.
  }
}

export class LocalNotesRepository implements NotesRepository {
  async getAll() {
    return readNotes();
  }

  async getById(id: string) {
    return readNotes().find((note) => note.id === id) ?? null;
  }

  async save(input: NoteInput) {
    const notes = readNotes();
    const existing = input.id ? notes.find((note) => note.id === input.id) : null;
    const now = new Date().toISOString();
    const nextId = existing?.id ?? input.id ?? createId();

    const next: Note = {
      id: nextId,
      title: input.title,
      category: input.category,
      tags: input.tags,
      workflowState: input.workflowState ?? existing?.workflowState ?? "進行中",
      question: input.question,
      answerSummary: input.answerSummary,
      unresolvedQuestions: input.unresolvedQuestions,
      understandingState: input.understandingState ?? existing?.understandingState ?? [],
      sessions:
        (input.sessions ?? existing?.sessions ?? []).map((session) => ({
          ...session,
          noteId: nextId
        })),
      resumePrompt: input.resumePrompt,
      originalChatText: input.originalChatText,
      status: input.status ?? existing?.status ?? "active",
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt:
        typeof input.deletedAt !== "undefined" ? input.deletedAt : existing?.deletedAt ?? null,
      sortOrder: input.sortOrder ?? existing?.sortOrder ?? notes.length + 1,
      pinned: input.pinned ?? existing?.pinned ?? false
    };

    const updated = existing
      ? notes.map((note) => (note.id === next.id ? next : note))
      : [next, ...notes];
    writeNotes(updated);
    return next;
  }

  async saveMany(notes: Note[]) {
    writeNotes(notes);
  }

  async trash(ids: string[]) {
    const now = new Date().toISOString();
    const updated = readNotes().map((note) =>
      ids.includes(note.id)
        ? { ...note, status: "trashed" as const, deletedAt: now, updatedAt: now }
        : note
    );
    writeNotes(updated);
    return updated.filter((note) => ids.includes(note.id));
  }

  async restore(ids: string[]) {
    const now = new Date().toISOString();
    const updated = readNotes().map((note) =>
      ids.includes(note.id)
        ? { ...note, status: "active" as const, deletedAt: null, updatedAt: now }
        : note
    );
    writeNotes(updated);
    return updated.filter((note) => ids.includes(note.id));
  }

  async remove(ids: string[]) {
    writeNotes(readNotes().filter((note) => !ids.includes(note.id)));
  }
}

export const localNotesRepository = new LocalNotesRepository();
