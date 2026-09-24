import type { Note } from "./note";

export function titleOf(note: Note): string {
  const lines = note.body.split("\n").map((l) => l.trim());
  const heading = lines.find((l) => /^#{1,6}\s+\S/.test(l));
  if (heading) return heading.replace(/^#{1,6}\s+/, "").trim();
  return lines.find((l) => l.length > 0) ?? "Untitled";
}

export function sortByUpdated(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}
