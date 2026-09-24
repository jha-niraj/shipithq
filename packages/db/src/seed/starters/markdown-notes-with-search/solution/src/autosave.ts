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
  change(body: string): void;
  flush(): Promise<void>;
  status(): SaveStatus;
}

export function createAutosave(
  write: (body: string) => Promise<void>,
  delayMs: number,
  scheduler: Scheduler = realScheduler,
): Autosave {
  let unsaved: string | null = null;
  let timer: unknown = null;
  let inFlight = 0;

  const writeNow = async () => {
    if (timer !== null) { scheduler.clear(timer); timer = null; }
    if (unsaved === null) return;
    const body = unsaved;
    unsaved = null;
    inFlight++;
    try { await write(body); } finally { inFlight--; }
  };

  return {
    change(body) {
      unsaved = body;
      if (timer !== null) scheduler.clear(timer);
      timer = scheduler.set(() => { timer = null; void writeNow(); }, delayMs);
    },
    flush: writeNow,
    status() {
      if (unsaved !== null) return "pending";
      return inFlight > 0 ? "saving" : "saved";
    },
  };
}
