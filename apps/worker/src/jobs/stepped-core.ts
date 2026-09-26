import { RetryableError } from "./retryable"

/*
 * A job run as a list of steps, one alarm per step, checkpointed between them
 * (plan/job-import JI-2). Pure: storage, the clock and the status writer are
 * passed in, so the rules are tested in Node and the Durable Object in
 * stepped-job.ts is only glue.
 *
 * Why steps: a long job in one alarm is killed partway by the CPU ceiling, and
 * a failure anywhere replays everything. Here each alarm runs one step, saves
 * the job's state, writes a status the app can show, and schedules the next
 * step. A failed step retries alone; an eviction between steps resumes from the
 * checkpoint; an eviction mid-step re-runs only that step.
 *
 * A step returns one of:
 *   { next: "name", state }   run "name" in the next alarm
 *   { next: null, state }     the job is done
 *   { wait: "label", state }  pause until the app calls resume (e.g. the
 *                             student must paste the job text)
 * Steps must be safe to re-run: write with upserts or guarded updates.
 */

export interface StepStorage {
    get<T>(key: string): Promise<T | undefined>
    put(key: string, value: unknown): Promise<void>
    delete(key: string): Promise<void>
    setAlarm(at: number): Promise<void>
}

export type JobStatusWrite = (status: "active" | "completed" | "failed", progress: number, extra: { phaseLabel?: string; result?: unknown; error?: string }) => Promise<void>

export type StepOutcome<S> = { state: S; next: string | null; progress?: number; label?: string } | { state: S; wait: string }

export interface StepContext<I, S> {
    jobId: string
    userId: string
    input: I
    state: S
    /** 0 on a step's first try; counts retries and mid-step evictions. */
    attempt: number
}

export interface StepHost<I, S> {
    firstStep: string
    initialState(input: I): S
    runStep(name: string, ctx: StepContext<I, S>): Promise<StepOutcome<S>>
    /** A label shown while a step runs ("Reading the job"). */
    labelFor(name: string, state: S): string
    /** Called once when the job fails, to mark the job's own rows (never throws out). */
    onFail?(message: string, input: I): Promise<void>
}

type Phase = "pending" | "running" | "waiting" | "done" | "failed"
type StoredJob<I> = { jobId: string; userId: string; input: I }

/** Retries of one step after a RetryableError, in ms. */
export const STEP_RETRY_DELAYS_MS = [5_000, 20_000]
/** A step still running this long after it started lost its worker; it is re-run. */
export const STEP_STALE_MS = 3 * 60 * 1000
/** How many times one step may be re-run after an eviction before the job fails. */
export const STEP_MAX_EVICTIONS = 2
const CLEANUP_DELAY_MS = 15 * 60 * 1000

export type TickResult = "ran" | "done" | "waiting" | "retry" | "deferred" | "failed" | "cleanup" | "idle"

/** Run whatever the job's next alarm should run. */
export async function tickStep<I, S>(storage: StepStorage, host: StepHost<I, S>, write: JobStatusWrite, now: number): Promise<TickResult> {
    const phase = await storage.get<Phase>("phase")
    if (phase === "done" || phase === "failed") return "cleanup"
    if (phase === "waiting") return "idle"
    const job = await storage.get<StoredJob<I>>("job")
    if (!job) return "idle"

    const step = (await storage.get<string>("step")) ?? host.firstStep
    let state = (await storage.get<S>("state")) ?? host.initialState(job.input)
    let attempt = (await storage.get<number>("attempt")) ?? 0

    if (phase === "running") {
        // Only reached when an alarm's handler never returned: the object was evicted mid-step.
        const startedAt = (await storage.get<number>("stepStartedAt")) ?? 0
        if (now - startedAt < STEP_STALE_MS) {
            await storage.setAlarm(startedAt + STEP_STALE_MS)
            return "deferred"
        }
        const evictions = ((await storage.get<number>("evictions")) ?? 0) + 1
        await storage.put("evictions", evictions)
        if (evictions > STEP_MAX_EVICTIONS) return fail(storage, write, now, `The job was interrupted at "${host.labelFor(step, state)}" and could not be resumed`, host, job.input)
    }

    await storage.put("phase", "running" satisfies Phase)
    await storage.put("stepStartedAt", now)
    await write("active", (await storage.get<number>("progress")) ?? 5, { phaseLabel: host.labelFor(step, state) })

    let outcome: StepOutcome<S>
    try {
        outcome = await host.runStep(step, { jobId: job.jobId, userId: job.userId, input: job.input, state, attempt })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "The job failed"
        const delay = error instanceof RetryableError ? STEP_RETRY_DELAYS_MS[attempt] : undefined
        if (delay !== undefined) {
            await storage.put("attempt", attempt + 1)
            await storage.put("phase", "pending" satisfies Phase)
            await storage.setAlarm(now + delay)
            await write("active", (await storage.get<number>("progress")) ?? 5, { phaseLabel: `${host.labelFor(step, state)} (retrying)` })
            return "retry"
        }
        return fail(storage, write, now, message, host, job.input)
    }

    // The checkpoint: the step's state is saved before anything else moves.
    state = outcome.state
    await storage.put("state", state)
    await storage.put("attempt", 0)
    await storage.put("evictions", 0)
    attempt = 0

    if ("wait" in outcome) {
        await storage.put("phase", "waiting" satisfies Phase)
        await write("active", (await storage.get<number>("progress")) ?? 5, { phaseLabel: outcome.wait })
        return "waiting"
    }
    if (outcome.progress !== undefined) await storage.put("progress", outcome.progress)
    if (outcome.next === null) {
        await storage.put("phase", "done" satisfies Phase)
        await write("completed", 100, { phaseLabel: outcome.label ?? "Complete", result: state })
        await storage.setAlarm(now + CLEANUP_DELAY_MS)
        return "done"
    }
    await storage.put("step", outcome.next)
    await storage.put("phase", "pending" satisfies Phase)
    await write("active", outcome.progress ?? ((await storage.get<number>("progress")) ?? 5), { phaseLabel: outcome.label ?? host.labelFor(outcome.next, state) })
    await storage.setAlarm(now)
    return "ran"
}

/**
 * Continue a job paused on `wait` (the app got what it waited for). Returns
 * false when the job isn't waiting, so a double click can't start it twice.
 */
export async function resumeSteps(storage: StepStorage, next: string, now: number): Promise<boolean> {
    if ((await storage.get<Phase>("phase")) !== "waiting") return false
    await storage.put("step", next)
    await storage.put("phase", "pending" satisfies Phase)
    await storage.put("attempt", 0)
    await storage.setAlarm(now)
    return true
}

async function fail<I, S>(storage: StepStorage, write: JobStatusWrite, now: number, message: string, host: StepHost<I, S>, input: I): Promise<TickResult> {
    await host.onFail?.(message, input).catch(() => undefined)
    await storage.put("phase", "failed" satisfies Phase)
    await storage.put("error", message)
    await write("failed", 0, { error: message })
    await storage.setAlarm(now + CLEANUP_DELAY_MS)
    return "failed"
}
