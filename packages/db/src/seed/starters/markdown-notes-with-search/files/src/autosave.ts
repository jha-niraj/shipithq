// Sprint 1, task 4: save as you type without losing work.

/** How the autosaver waits. Passed in, so a test can stand in for real time. */
export interface Scheduler {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export const realScheduler: Scheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type SaveStatus = "saved" | "pending" | "saving";

export interface Autosave {
  /** The editor changed. Write the latest body once typing pauses for `delayMs`. */
  change(body: string): void;
  /** Write the latest body now, if there is an unsaved one (e.g. the tab is closing). */
  flush(): Promise<void>;
  /** "saved" only once a write has actually finished - not when one was asked for. */
  status(): SaveStatus;
}

export function createAutosave(
  write: (body: string) => Promise<void>,
  delayMs: number,
  scheduler: Scheduler = realScheduler,
): Autosave {
  throw new Error("TODO: sprint 1, task 4");
}
