"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Category, FixedTag, Note, NoteInput, Session, WorkflowState } from "@/lib/types";
import { normalizeCategory, normalizeFixedTags, uniqueStrings } from "@/lib/utils";
import { localNotesRepository } from "@/repositories/local-notes-repository";

type NotesState = {
  notes: Note[];
  isLoaded: boolean;
};

type NotesContextValue = NotesState & {
  addOrUpdateNote: (input: NoteInput) => Promise<Note>;
  appendSessionToNote: (
    noteId: string,
    input: Omit<Session, "id" | "noteId" | "createdAt">
  ) => Promise<void>;
  bulkUpdateNotes: (
    ids: string[],
    patch: {
      category?: Category;
      workflowState?: WorkflowState;
      tags?: FixedTag[];
    }
  ) => Promise<void>;
  trashNotes: (ids: string[]) => Promise<void>;
  restoreNotes: (ids: string[]) => Promise<void>;
  deleteNotes: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
};

type Action =
  | { type: "set"; payload: Note[] }
  | { type: "loaded" };

const NotesContext = createContext<NotesContextValue | null>(null);

function reducer(state: NotesState, action: Action): NotesState {
  switch (action.type) {
    case "set":
      return { ...state, notes: action.payload };
    case "loaded":
      return { ...state, isLoaded: true };
    default:
      return state;
  }
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { notes: [], isLoaded: false });

  const refresh = async () => {
    try {
      const notes = await localNotesRepository.getAll();
      dispatch({ type: "set", payload: notes });
    } catch {
      dispatch({ type: "set", payload: [] });
    }
    dispatch({ type: "loaded" });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({
      ...state,
      async addOrUpdateNote(input) {
        const saved = await localNotesRepository.save(input);
        await refresh();
        return saved;
      },
      async appendSessionToNote(noteId, input) {
        const target = state.notes.find((note) => note.id === noteId);
        if (!target) return;

        const now = new Date().toISOString();
        const session: Session = {
          id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          noteId,
          createdAt: now,
          ...input
        };

        const updatedNote: Note = {
          ...target,
          answerSummary: uniqueStrings([...target.answerSummary, ...session.extractedSummary]),
          unresolvedQuestions: uniqueStrings([
            ...target.unresolvedQuestions,
            ...session.extractedUnresolvedQuestions
          ]),
          understandingState: uniqueStrings([
            ...target.understandingState,
            ...session.extractedUnderstandingState
          ]),
          originalChatText: session.importedConversation,
          sessions: [...target.sessions, session],
          updatedAt: now
        };

        const updated = state.notes.map((note) => (note.id === noteId ? updatedNote : note));
        await localNotesRepository.saveMany(updated);
        await refresh();
      },
      async bulkUpdateNotes(ids, patch) {
        const now = new Date().toISOString();
        const updated = state.notes.map((note) => {
          if (!ids.includes(note.id)) return note;

          return {
            ...note,
            category: typeof patch.category !== "undefined" ? normalizeCategory(patch.category) : note.category,
            workflowState: patch.workflowState ?? note.workflowState,
            tags: typeof patch.tags !== "undefined" ? normalizeFixedTags(patch.tags) : note.tags,
            updatedAt: now
          };
        });

        await localNotesRepository.saveMany(updated);
        await refresh();
      },
      async trashNotes(ids) {
        await localNotesRepository.trash(ids);
        await refresh();
      },
      async restoreNotes(ids) {
        await localNotesRepository.restore(ids);
        await refresh();
      },
      async deleteNotes(ids) {
        await localNotesRepository.remove(ids);
        await refresh();
      },
      refresh
    }),
    [state]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return context;
}
