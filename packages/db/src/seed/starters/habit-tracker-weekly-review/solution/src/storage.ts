import { emptyState, type TrackerState } from "./model";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = "habit-tracker";

function isState(value: unknown): value is TrackerState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.habits) && Array.isArray(v.completions) && v.completions.every((c) => typeof c === "string");
}

export function loadState(storage: StorageLike): TrackerState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    return isState(parsed) ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(storage: StorageLike, state: TrackerState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
