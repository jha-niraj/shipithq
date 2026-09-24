import { completionKey, type Habit, type TrackerState } from "./model";

const belongsTo = (key: string, habitId: string) => key.startsWith(completionKey(habitId, ""));

export function addHabit(state: TrackerState, habit: Habit): TrackerState {
  return { ...state, habits: [...state.habits, habit] };
}

export function renameHabit(state: TrackerState, habitId: string, name: string): TrackerState {
  return { ...state, habits: state.habits.map((h) => (h.id === habitId ? { ...h, name } : h)) };
}

export function recordedDays(state: TrackerState, habitId: string): number {
  return state.completions.filter((c) => belongsTo(c, habitId)).length;
}

export function removeHabit(state: TrackerState, habitId: string): TrackerState {
  return {
    habits: state.habits.filter((h) => h.id !== habitId),
    completions: state.completions.filter((c) => !belongsTo(c, habitId)),
  };
}
