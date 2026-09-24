// Sprint 1, task 3: put all storage behind one module.
import type { TrackerState } from "./model";

/** The part of localStorage this module needs - so it can be tested without a browser. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = "habit-tracker";

/**
 * Read the tracker back. What comes out of storage was written by some older
 * version of this code, so treat it as untrusted: missing, corrupt or
 * wrongly-shaped data gives an empty tracker, never a throw.
 */
export function loadState(storage: StorageLike): TrackerState {
  throw new Error("TODO: sprint 1, task 3");
}

export function saveState(storage: StorageLike, state: TrackerState): void {
  throw new Error("TODO: sprint 1, task 3");
}
