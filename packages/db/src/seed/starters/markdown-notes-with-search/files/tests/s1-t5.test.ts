// Sprint 1, task 5: List, open and delete notes.
import type { Note } from "../src/note";
import { sortByUpdated, titleOf } from "../src/notes-list";

const note = (id: string, body: string, updatedAt: number): Note => ({ id, body, createdAt: 0, updatedAt });

describe("sprint 1, task 5", () => {
  it("titles a note by its first heading", () => {
    expect(titleOf(note("a", "intro line\n## Groceries\nmilk", 1))).toBe("Groceries");
  });

  it("falls back to the first line of text, then to Untitled", () => {
    expect(titleOf(note("a", "\n\n  Call the bank  \nabout the card", 1))).toBe("Call the bank");
    expect(titleOf(note("a", "   \n", 1))).toBe("Untitled");
  });

  it("sorts by most recently updated without changing the input", () => {
    const notes = [note("old", "", 1), note("new", "", 3), note("mid", "", 2)];
    expect(sortByUpdated(notes).map((n) => n.id)).toEqual(["new", "mid", "old"]);
    expect(notes.map((n) => n.id)).toEqual(["old", "new", "mid"]);
  });
});
