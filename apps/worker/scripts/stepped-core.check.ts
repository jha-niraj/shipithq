/**
 * Checks the stepped-job rules (plan/job-import JI-2) with no Durable Object: a
 * simulated alarm clock and in-memory storage. Run: npx tsx scripts/stepped-core.check.ts
 */
const C = await import("../src/jobs/stepped-core.ts")
const { RetryableError } = await import("../src/jobs/retryable.ts")
let pass = 0, fail = 0
const check = (n: string, ok: boolean, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`) }

function harness() {
    const map = new Map<string, unknown>(); let alarm: number | null = null
    const storage = { get: async (k: string) => map.get(k) as any, put: async (k: string, v: unknown) => { map.set(k, structuredClone(v)) }, delete: async (k: string) => { map.delete(k) }, setAlarm: async (at: number) => { alarm = at } }
    const writes: { status: string; label?: string }[] = []
    const write = async (status: any, _p: number, extra: any) => { writes.push({ status, label: extra.phaseLabel ?? extra.error }) }
    return { map, storage, writes, write, get alarm() { return alarm }, clear() { alarm = null } }
}
const start = (h: any) => { h.map.set("job", { jobId: "j1", userId: "u1", input: { n: 3 } }); h.map.set("phase", "pending") }
async function drain(h: any, host: any, clock = { t: 1000 }, max = 50) {
    const results: string[] = []
    for (let i = 0; i < max && h.alarm !== null; i++) { clock.t = Math.max(clock.t, h.alarm); h.clear(); const r = await C.tickStep(h.storage, host, h.write, clock.t); results.push(r); if (r === "cleanup" || r === "waiting" || r === "idle" || r === "failed" || r === "done") break }
    return results
}
const threeSteps = (throwOnce: { left: number }, runs: string[]) => ({
    firstStep: "a",
    initialState: () => ({ done: [] as string[] }),
    labelFor: (n: string) => `step ${n}`,
    runStep: async (name: string, ctx: any) => {
        runs.push(name)
        if (name === "b" && throwOnce.left > 0) { throwOnce.left--; throw new RetryableError("upstream 503") }
        const state = { done: [...ctx.state.done, name] }
        return { state, next: name === "a" ? "b" : name === "b" ? "c" : null }
    },
})

// 1. Three steps, a throw in step two: retried alone, then completes.
{
    const h = harness(); start(h); await h.storage.setAlarm(1000)
    const runs: string[] = []
    const r = await drain(h, threeSteps({ left: 1 }, runs))
    check("a throw in step two retries only step two, then completes", JSON.stringify(runs) === JSON.stringify(["a", "b", "b", "c"]) && r.includes("done"), runs.join(","))
    check("the checkpoint holds every step's work once", JSON.stringify(h.map.get("state")) === JSON.stringify({ done: ["a", "b", "c"] }))
    const labels = h.writes.filter((w) => w.status === "active").map((w) => w.label)
    check("a status is written for each step, and a completed one", ["step a", "step b", "step c"].every((l) => labels.includes(l)) && h.writes.at(-1)?.status === "completed", labels.join(" | "))
}
// 2. Eviction mid-step: the re-fired alarm waits until stale, then re-runs only that step.
{
    const h = harness(); start(h)
    h.map.set("step", "b"); h.map.set("state", { done: ["a"] }); h.map.set("phase", "running"); h.map.set("stepStartedAt", 1000)
    const runs: string[] = []
    const host = threeSteps({ left: 0 }, runs)
    const early = await C.tickStep(h.storage, host, h.write, 1000 + 1000)
    check("an alarm soon after an eviction defers instead of racing", early === "deferred" && h.alarm === 1000 + C.STEP_STALE_MS)
    const r = await drain(h, host, { t: 1000 + C.STEP_STALE_MS })
    check("after it goes stale, only step b re-runs, then c", JSON.stringify(runs) === JSON.stringify(["b", "c"]) && r.includes("done") && JSON.stringify(h.map.get("state")) === JSON.stringify({ done: ["a", "b", "c"] }), runs.join(","))
}
// 3. A step that keeps failing fails the job after the bounded retries.
{
    const h = harness(); start(h); await h.storage.setAlarm(1000)
    const runs: string[] = []
    const r = await drain(h, threeSteps({ left: 99 }, runs))
    check("a step that keeps failing: 1 try + 2 retries, then failed", runs.filter((x) => x === "b").length === 3 && r.at(-1) === "failed" && h.writes.at(-1)?.status === "failed", r.join(","))
}
// 4. A non-retryable error fails at once.
{
    const h = harness(); start(h); await h.storage.setAlarm(1000)
    const host = { ...threeSteps({ left: 0 }, []), runStep: async () => { throw new Error("not a job page") } }
    const r = await drain(h, host)
    check("a plain error fails the job immediately with its message", r.join(",") === "failed" && h.writes.at(-1)?.label === "not a job page")
}
// 5. Wait and resume.
{
    const h = harness(); start(h); await h.storage.setAlarm(1000)
    const runs: string[] = []
    const host = { firstStep: "fetch", initialState: () => ({}), labelFor: (n: string) => n, runStep: async (name: string, ctx: any) => { runs.push(name); return name === "fetch" ? { state: ctx.state, wait: "Waiting for the job text" } : { state: ctx.state, next: null } } }
    const r1 = await drain(h, host)
    check("a step can pause the job, and says why", r1.at(-1) === "waiting" && h.writes.at(-1)?.label === "Waiting for the job text" && h.alarm === null)
    const again = await C.tickStep(h.storage, host, h.write, 5000)
    check("a stray alarm while waiting does nothing", again === "idle" && runs.length === 1)
    const ok1 = await C.resumeSteps(h.storage, "extract", 6000)
    const ok2 = await C.resumeSteps(h.storage, "extract", 6000)
    check("resume starts it once; a second resume is refused", ok1 && !ok2)
    const r2 = await drain(h, host, { t: 6000 })
    check("it continues from the named step to the end", JSON.stringify(runs) === JSON.stringify(["fetch", "extract"]) && r2.includes("done"))
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
