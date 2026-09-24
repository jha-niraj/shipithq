// Sprint 1, task 1: a typed note model. Also: turn strict mode on in tsconfig.json.

export interface Note {
  id: string;
  body: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  updatedAt: number;
}

/** A new note, created and last updated at `now`. */
export function createNote(id: string, body: string, now: number): Note {
  throw new Error("TODO: sprint 1, task 1");
}

/** The same note with a new body, updated at `now`. Never changes `createdAt`. */
export function editNote(note: Note, body: string, now: number): Note {
  throw new Error("TODO: sprint 1, task 1");
}
