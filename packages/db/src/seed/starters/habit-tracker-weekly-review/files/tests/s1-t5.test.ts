// Sprint 1, task 5: Add, rename and remove habits without losing history.
import { completionKey, type TrackerState } from "../src/model";
import { addHabit, recordedDays, removeHabit, renameHabit } from "../src/habits";

// A function, not a constant: built inside each test, so an unfinished task 2
// fails these tests one by one instead of erroring the whole file on load.
const fixture = (): TrackerState => ({
  habits: [{ id: "read", name: "Read", weekdays: [1], startDate: "2026-01-01" }],
  // Built with YOUR key format, whatever you chose in task 2.
  completions: [
    completionKey("read", "2026-01-05"),
    completionKey("read", "2026-01-12"),
    completionKey("other", "2026-01-05"),
  ],
});

describe("sprint 1, task 5", () => {
  it("adds a habit", () => {
    const state = fixture();
    const next = addHabit(state, { id: "run", name: "Run", weekdays: [0], startDate: "2026-01-01" });
    expect(next.habits.map((h) => h.id)).toEqual(["read", "run"]);
    expect(state.habits).toHaveLength(1);
  });

  it("renames without losing a single tick", () => {
    const state = fixture();
    const next = renameHabit(state, "read", "Read 20 pages");
    expect(next.habits[0]!.name).toBe("Read 20 pages");
    expect(next.completions).toEqual(state.completions);
  });

  it("says how many recorded days a removal affects", () => {
    expect(recordedDays(fixture(), "read")).toBe(2);
  });

  it("removes the habit and only its own ticks", () => {
    const next = removeHabit(fixture(), "read");
    expect(next.habits).toHaveLength(0);
    expect(recordedDays(next, "read")).toBe(0);
    expect(next.completions).toHaveLength(1);
  });
});
