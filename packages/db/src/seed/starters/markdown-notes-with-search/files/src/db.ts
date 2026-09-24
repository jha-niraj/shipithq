// Sprint 1, task 2: store notes in IndexedDB.
//
// This one is checked by hand, not by a test: IndexedDB lives in the browser,
// so the proof is the criteria in TASK.md - create three notes, reload, and
// they are still there. Every function returns a promise; no component should
// ever see a raw IDBRequest.
import type { Note } from "./note";

export async function listNotes(): Promise<Note[]> {
  throw new Error("TODO: sprint 1, task 2");
}

export async function putNote(note: Note): Promise<void> {
  throw new Error("TODO: sprint 1, task 2");
}

export async function deleteNote(id: string): Promise<void> {
  throw new Error("TODO: sprint 1, task 2");
}
