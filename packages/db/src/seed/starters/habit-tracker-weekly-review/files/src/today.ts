// Sprint 1, task 4: show today and let a tick toggle.
import type { Habit, TrackerState } from "./model";

/** The habits scheduled on `calendarDate`: its weekday is in their schedule and they had started. */
export function scheduledOn(habits: readonly Habit[], calendarDate: string): Habit[] {
  throw new Error("TODO: sprint 1, task 4");
}

/** Tick if unticked, untick if ticked. Pure: returns a new state, takes the date as an argument. */
export function toggleCompletion(state: TrackerState, habitId: string, calendarDate: string): TrackerState {
  throw new Error("TODO: sprint 1, task 4");
}

/** How many of the habits scheduled on `calendarDate` are done. */
export function dayCount(state: TrackerState, calendarDate: string): { done: number; total: number } {
  throw new Error("TODO: sprint 1, task 4");
}
