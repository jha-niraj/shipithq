export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: string;
  name: string;
  weekdays: Weekday[];
  startDate: string;
}

export interface TrackerState {
  habits: Habit[];
  completions: string[];
}

export const emptyState = (): TrackerState => ({ habits: [], completions: [] });

const pad = (n: number) => String(n).padStart(2, "0");

export function toCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function completionKey(habitId: string, calendarDate: string): string {
  return `${habitId}|${calendarDate}`;
}

export function addCompletion(completions: readonly string[], habitId: string, calendarDate: string): string[] {
  const key = completionKey(habitId, calendarDate);
  return completions.includes(key) ? [...completions] : [...completions, key];
}
