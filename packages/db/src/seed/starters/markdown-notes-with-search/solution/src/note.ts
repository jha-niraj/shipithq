export interface Note {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export function createNote(id: string, body: string, now: number): Note {
  return { id, body, createdAt: now, updatedAt: now };
}

export function editNote(note: Note, body: string, now: number): Note {
  return { ...note, body, updatedAt: now };
}
