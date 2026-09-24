// Sprint 1, task 5: add, rename and remove habits without losing history.
import type { Habit, TrackerState } from "./model";

export function addHabit(state: TrackerState, habit: Habit): TrackerState {
  throw new Error("TODO: sprint 1, task 5");
}

/** Every past tick stays attached to the habit. */
export function renameHabit(state: TrackerState, habitId: string, name: string): TrackerState {
  throw new Error("TODO: sprint 1, task 5");
}

/** How many recorded days removing this habit would affect - shown in the confirmation. */
export function recordedDays(state: TrackerState, habitId: string): number {
  throw new Error("TODO: sprint 1, task 5");
}

/** Remove the habit and its ticks. */
export function removeHabit(state: TrackerState, habitId: string): TrackerState {
  throw new Error("TODO: sprint 1, task 5");
}
