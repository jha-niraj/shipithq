import { addCompletion, completionKey, type Habit, type TrackerState, type Weekday } from "./model";

function weekdayOf(calendarDate: string): Weekday {
  const [y, m, d] = calendarDate.split("-").map(Number);
  return new Date(y!, m! - 1, d!).getDay() as Weekday;
}

export function scheduledOn(habits: readonly Habit[], calendarDate: string): Habit[] {
  const day = weekdayOf(calendarDate);
  return habits.filter((h) => h.startDate <= calendarDate && h.weekdays.includes(day));
}

export function toggleCompletion(state: TrackerState, habitId: string, calendarDate: string): TrackerState {
  const key = completionKey(habitId, calendarDate);
  const completions = state.completions.includes(key)
    ? state.completions.filter((c) => c !== key)
    : addCompletion(state.completions, habitId, calendarDate);
  return { ...state, completions };
}

export function dayCount(state: TrackerState, calendarDate: string): { done: number; total: number } {
  const scheduled = scheduledOn(state.habits, calendarDate);
  const done = scheduled.filter((h) => state.completions.includes(completionKey(h.id, calendarDate))).length;
  return { done, total: scheduled.length };
}
