// Sprint 1, task 2: model a habit and a day of ticks.

/** 0 = Sunday ... 6 = Saturday, as Date#getDay() counts them. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: string;
  name: string;
  /** The weekdays it is meant to happen on. */
  weekdays: Weekday[];
  /** A calendar date, "YYYY-MM-DD". */
  startDate: string;
}

export interface TrackerState {
  habits: Habit[];
  /** One key per tick, from completionKey(). No duplicates. */
  completions: string[];
}

export const emptyState = (): TrackerState => ({ habits: [], completions: [] });

/** The calendar date of `date` in the person's own timezone, as "YYYY-MM-DD". */
export function toCalendarDate(date: Date): string {
  throw new Error("TODO: sprint 1, task 2");
}

/** The key one tick is stored under: a habit on a calendar date. */
export function completionKey(habitId: string, calendarDate: string): string {
  throw new Error("TODO: sprint 1, task 2");
}

/**
 * Record a tick. Returns a NEW list; ticking the same habit on the same date
 * twice must leave exactly one record.
 */
export function addCompletion(completions: readonly string[], habitId: string, calendarDate: string): string[] {
  throw new Error("TODO: sprint 1, task 2");
}
