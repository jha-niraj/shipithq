// Sprint 1, task 4: Show today and let a tick toggle.
import type { TrackerState } from "../src/model";
import { dayCount, scheduledOn, toggleCompletion } from "../src/today";

// 2026-01-05 is a Monday (weekday 1).
const MONDAY = "2026-01-05";
const state: TrackerState = {
  habits: [
    { id: "read", name: "Read", weekdays: [1, 3, 5], startDate: "2026-01-01" },
    { id: "run", name: "Run", weekdays: [0, 6], startDate: "2026-01-01" },
    { id: "later", name: "Starts later", weekdays: [1], startDate: "2026-02-01" },
  ],
  completions: [],
};

describe("sprint 1, task 4", () => {
  it("lists only habits scheduled on that weekday that have started", () => {
    expect(scheduledOn(state.habits, MONDAY).map((h) => h.id)).toEqual(["read"]);
  });

  it("toggles a tick on and off without touching the old state", () => {
    const on = toggleCompletion(state, "read", MONDAY);
    expect(state.completions).toHaveLength(0);
    expect(dayCount(on, MONDAY)).toEqual({ done: 1, total: 1 });
    const off = toggleCompletion(on, "read", MONDAY);
    expect(dayCount(off, MONDAY)).toEqual({ done: 0, total: 1 });
  });

  it("counts only the habits scheduled that day", () => {
    const ticked = toggleCompletion(state, "run", MONDAY);
    expect(dayCount(ticked, MONDAY)).toEqual({ done: 0, total: 1 });
  });
});
