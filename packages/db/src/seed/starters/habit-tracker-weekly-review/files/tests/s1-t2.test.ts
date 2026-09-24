// Sprint 1, task 2: Model a habit and a day of ticks.
import { addCompletion, completionKey, toCalendarDate } from "../src/model";

describe("sprint 1, task 2", () => {
  it("stores a date as a calendar day, YYYY-MM-DD, with no time", () => {
    expect(toCalendarDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(toCalendarDate(new Date(2026, 10, 30, 0, 1))).toBe("2026-11-30");
  });

  it("keys a tick by habit and date", () => {
    expect(completionKey("h1", "2026-01-05")).toBe(completionKey("h1", "2026-01-05"));
    expect(completionKey("h1", "2026-01-05")).not.toBe(completionKey("h1", "2026-01-06"));
    expect(completionKey("h1", "2026-01-05")).not.toBe(completionKey("h2", "2026-01-05"));
  });

  it("cannot record the same tick twice", () => {
    const once = addCompletion([], "h1", "2026-01-05");
    const twice = addCompletion(once, "h1", "2026-01-05");
    expect(twice).toHaveLength(1);
  });

  it("returns a new list rather than changing the old one", () => {
    const before: string[] = [];
    const after = addCompletion(before, "h1", "2026-01-05");
    expect(before).toHaveLength(0);
    expect(after).toHaveLength(1);
  });
});
