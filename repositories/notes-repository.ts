import type { Note, NoteInput } from "@/lib/types";

export interface NotesRepository {
  getAll(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  save(note: NoteInput): Promise<Note>;
  saveMany(notes: Note[]): Promise<void>;
  trash(ids: string[]): Promise<Note[]>;
  restore(ids: string[]): Promise<Note[]>;
  remove(ids: string[]): Promise<void>;
}
