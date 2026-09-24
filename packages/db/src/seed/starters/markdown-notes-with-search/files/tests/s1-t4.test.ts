// Sprint 1, task 4: Save as you type without losing work.
import { createAutosave, type Scheduler } from "../src/autosave";

/** Time that only moves when the test says so. */
function manualScheduler() {
  let pending: { fn: () => void; id: number } | null = null;
  let next = 0;
  const scheduler: Scheduler = {
    set: (fn) => { pending = { fn, id: ++next }; return next; },
    clear: (handle) => { if (pending && pending.id === handle) pending = null; },
  };
  return { scheduler, fire: () => { const p = pending; pending = null; p?.fn(); }, hasPending: () => pending !== null };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("sprint 1, task 4", () => {
  it("writes once when typing pauses, with the latest text", async () => {
    const writes: string[] = [];
    const time = manualScheduler();
    const save = createAutosave(async (b) => { writes.push(b); }, 500, time.scheduler);
    for (const body of ["h", "he", "hel", "hell", "hello"]) save.change(body);
    expect(writes).toEqual([]);
    time.fire();
    await settle();
    expect(writes).toEqual(["hello"]);
  });

  it("flush writes the unsaved text immediately", async () => {
    const writes: string[] = [];
    const time = manualScheduler();
    const save = createAutosave(async (b) => { writes.push(b); }, 500, time.scheduler);
    save.change("last keystroke");
    await save.flush();
    expect(writes).toEqual(["last keystroke"]);
    expect(time.hasPending()).toBe(false);
  });

  it("says saved only after the write has finished", async () => {
    let finish: () => void = () => {};
    const time = manualScheduler();
    const save = createAutosave(() => new Promise<void>((r) => { finish = r; }), 500, time.scheduler);
    expect(save.status()).toBe("saved");
    save.change("x");
    expect(save.status()).toBe("pending");
    time.fire();
    expect(save.status()).toBe("saving");
    finish();
    await settle();
    expect(save.status()).toBe("saved");
  });
});
