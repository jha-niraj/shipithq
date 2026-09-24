// Sprint 1, task 1: Set up the app and a typed note model.
import tsconfig from "../tsconfig.app.json";
import { createNote, editNote } from "../src/note";

describe("sprint 1, task 1", () => {
  it("turns strict mode on in tsconfig", () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it("creates a note stamped with the time it was made", () => {
    expect(createNote("n1", "# Hello", 1000)).toEqual({ id: "n1", body: "# Hello", createdAt: 1000, updatedAt: 1000 });
  });

  it("editing moves updatedAt and never createdAt", () => {
    const note = createNote("n1", "a", 1000);
    const edited = editNote(note, "b", 5000);
    expect(edited).toEqual({ id: "n1", body: "b", createdAt: 1000, updatedAt: 5000 });
    expect(note.body).toBe("a");
  });
});
