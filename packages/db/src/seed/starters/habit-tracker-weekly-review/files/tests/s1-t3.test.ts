// Sprint 1, task 3: Put all storage behind one module.
import { emptyState, type TrackerState } from "../src/model";
import { STORAGE_KEY, loadState, saveState, type StorageLike } from "../src/storage";

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

const sample: TrackerState = {
  habits: [{ id: "h1", name: "Read", weekdays: [1, 3, 5], startDate: "2026-01-01" }],
  completions: ["h1|2026-01-05"],
};

describe("sprint 1, task 3", () => {
  it("gives back exactly what it saved", () => {
    const storage = memoryStorage();
    saveState(storage, sample);
    expect(loadState(storage)).toEqual(sample);
  });

  it("starts empty when nothing was saved", () => {
    expect(loadState(memoryStorage())).toEqual(emptyState());
  });

  it("starts empty instead of throwing on corrupt data", () => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: "{not json" }))).toEqual(emptyState());
  });

  it("starts empty when the saved value has the wrong shape", () => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ habits: "nope" }) }))).toEqual(emptyState());
    expect(loadState(memoryStorage({ [STORAGE_KEY]: "42" }))).toEqual(emptyState());
  });
});
