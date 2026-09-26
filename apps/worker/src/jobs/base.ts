import { DurableObject } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import type { Env, RunnableJobType } from "../env"
import { createDb, schema } from "../db"
import type { JobStatus } from "@repo/db/schema"

const { backgroundJobs } = schema

/**
 * The pointer the app hands over when it dispatches a job.
 *
 * Deliberately a pointer (ids), not a payload: minutes can pass between the
 * dispatch and the alarm firing, so every job re-reads current data rather than
 * acting on a snapshot that may already be stale.
 */
export interface StoredJob<TInput = unknown> {
	jobId: string
	userId: string
	input: TInput
}

/** What a job reports back while it runs. */
export type ProgressFn = (progress: number, phaseLabel: string) => Promise<void>

type Phase = "pending" | "running" | "done" | "failed"

// RetryableError lives in ./retryable (no Workers imports), so pure step logic can use it too.
import { RetryableError } from "./retryable"
export { RetryableError }

/** Retry schedule for `RetryableError`, in ms. Length = max extra attempts. */
export const RETRY_DELAYS_MS = [5_000, 20_000]

/**
 * A run still marked `running` this long after it started has lost its worker -
 * a Durable Object evicted mid-alarm never resumes where it left off. See
 * `alarm()` for why the job is failed rather than re-run.
 */
const STALE_RUN_MS = 10 * 60 * 1000

/** How long a finished job's DO storage is kept before it is swept. */
const CLEANUP_DELAY_MS = 15 * 60 * 1000

/**
 * One Durable Object instance per job, addressed by jobId.
 *
 * The lifecycle every job type inherits:
 *
 *     POST /start   persist the input, write `active` to background_job,
 *                   schedule an immediate alarm, return - the caller's request
 *                   ends here, which is the entire point
 *     alarm()       run the work off the request path, writing progress to
 *                   background_job so the UI keeps moving even with the tab shut
 *     alarm()       (again, later) sweep the DO's storage once the job is done
 *
 * Subclasses implement `run()` and nothing else. The three things that are easy
 * to get wrong - the duplicate-run guard, catching instead of rethrowing, and
 * best-effort status writes - live here once rather than in every job.
 */
export abstract class JobDurableObject<TInput = unknown> extends DurableObject<Env> {
	/** Written to `background_job.type`; must match the app's dispatch. */
	protected abstract readonly jobType: RunnableJobType

	/** The actual work. Anything it returns is stored as the job's result. */
	protected abstract run(job: StoredJob<TInput>, progress: ProgressFn): Promise<unknown>

	/** The label shown the moment the job is accepted, before `run()` starts. */
	protected get initialPhaseLabel(): string {
		return "Queued"
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)

		if (request.method === "POST" && url.pathname.endsWith("/start")) {
			// Idempotent: the same jobId dispatched twice must not run twice. A
			// retried dispatch (a network blip on the app side) is a real case,
			// and with credits already held against the job, a second run is a
			// second charge.
			const existing = await this.ctx.storage.get<Phase>("phase")
			if (existing) {
				const stored = await this.ctx.storage.get<StoredJob>("job")
				return Response.json({ ok: true, jobId: stored?.jobId, phase: existing })
			}

			const body = (await request.json()) as StoredJob<TInput>
			await this.ctx.storage.put("job", body)
			await this.ctx.storage.put("phase", "pending" satisfies Phase)
			await this.ctx.storage.put("attempt", 0)
			// Status first, alarm second: the alarm can fire while this handler is
			// still running, and a "queued" write landing after the job's first
			// real progress write would walk the bar backwards.
			await this.writeStatus(body.jobId, "active", 5, { phaseLabel: this.initialPhaseLabel })
			// Kick the work off the request path. The alarm fires after this
			// response has already been returned to the app.
			await this.ctx.storage.setAlarm(Date.now() + 100)
			return Response.json({ ok: true, jobId: body.jobId })
		}

		if (url.pathname.endsWith("/status")) {
			const phase = (await this.ctx.storage.get<Phase>("phase")) ?? "unknown"
			const result = await this.ctx.storage.get<unknown>("result")
			const error = await this.ctx.storage.get<string>("error")
			return Response.json({ type: this.jobType, phase, result: result ?? null, error: error ?? null })
		}

		return new Response("Not found", { status: 404 })
	}

	async alarm(): Promise<void> {
		const phase = await this.ctx.storage.get<Phase>("phase")

		// Finished: this alarm is the cleanup sweep.
		if (phase === "done" || phase === "failed") {
			await this.ctx.storage.deleteAll()
			return
		}

		const job = await this.ctx.storage.get<StoredJob<TInput>>("job")
		if (!job) return

		if (phase === "running") {
			// Reached only when the platform re-fires an alarm whose handler did
			// not return - the DO was evicted or crashed mid-run.
			const startedAt = (await this.ctx.storage.get<number>("runStartedAt")) ?? 0
			const age = Date.now() - startedAt
			if (age < STALE_RUN_MS) {
				// Possibly still alive in another invocation. Come back after it
				// would have gone stale rather than racing it.
				await this.ctx.storage.setAlarm(startedAt + STALE_RUN_MS)
				return
			}
			// Genuinely lost. Fail rather than re-run: `run()` has already made
			// some of its database writes and replaying them would duplicate
			// rows. The app releases the credit hold when it sees `failed`.
			await this.fail(job.jobId, "The job was interrupted and could not be resumed")
			return
		}

		await this.ctx.storage.put("phase", "running" satisfies Phase)
		await this.ctx.storage.put("runStartedAt", Date.now())

		try {
			const result = await this.run(job, (progress, phaseLabel) =>
				this.writeStatus(job.jobId, "active", progress, { phaseLabel }),
			)
			await this.ctx.storage.put("result", result ?? null)
			await this.ctx.storage.put("phase", "done" satisfies Phase)
			await this.writeStatus(job.jobId, "completed", 100, { result, phaseLabel: "Complete" })
			await this.ctx.storage.setAlarm(Date.now() + CLEANUP_DELAY_MS)
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "The job failed"
			const attempt = (await this.ctx.storage.get<number>("attempt")) ?? 0
			const delay = error instanceof RetryableError ? RETRY_DELAYS_MS[attempt] : undefined

			if (delay !== undefined) {
				// Back to pending so the guard above lets the next alarm run it.
				await this.ctx.storage.put("attempt", attempt + 1)
				await this.ctx.storage.put("phase", "pending" satisfies Phase)
				await this.ctx.storage.delete("runStartedAt")
				await this.ctx.storage.setAlarm(Date.now() + delay)
				await this.writeStatus(job.jobId, "active", 5, { phaseLabel: "Retrying" })
				return
			}

			// Caught, never rethrown: a thrown alarm is auto-retried by the
			// platform, which would run the whole job a second time.
			await this.fail(job.jobId, message)
		}
	}

	protected async fail(jobId: string, message: string): Promise<void> {
		await this.ctx.storage.put("phase", "failed" satisfies Phase)
		await this.ctx.storage.put("error", message)
		await this.writeStatus(jobId, "failed", 0, { error: message })
		await this.ctx.storage.setAlarm(Date.now() + CLEANUP_DELAY_MS)
	}

	/** A Drizzle client built from the DO's env - see `src/db.ts`. */
	protected db() {
		return createDb(this.env.DATABASE_URL)
	}

	/** 0 on the first run, then 1 and 2 for the two `RetryableError` retries. */
	protected async currentAttempt(): Promise<number> {
		return (await this.ctx.storage.get<number>("attempt")) ?? 0
	}

	/**
	 * True when this is the last attempt the job will get.
	 *
	 * A job that has a degraded but useful outcome - saving a standup without
	 * its transcript rather than losing the standup - checks this so it does the
	 * degraded thing once, at the end, instead of on every attempt.
	 */
	protected async isFinalAttempt(): Promise<boolean> {
		return (await this.currentAttempt()) >= RETRY_DELAYS_MS.length
	}

	/**
	 * Mirror the job's state into `background_job`, which is what the app polls.
	 *
	 * Best-effort by design: a failed status write must never abort a run the
	 * user has already been charged for. The worst case is a stale progress bar
	 * that the next tick corrects.
	 */
	protected async writeStatus(
		jobId: string,
		status: JobStatus,
		progress: number,
		extra: { result?: unknown; error?: string; phaseLabel?: string },
	): Promise<void> {
		try {
			const db = this.db()
			await db
				.update(backgroundJobs)
				.set({
					status,
					progress,
					...(extra.result !== undefined
						? { result: { ...toResultObject(extra.result), phaseLabel: extra.phaseLabel } as unknown }
						: extra.phaseLabel
							? { result: { phaseLabel: extra.phaseLabel } as unknown }
							: {}),
					...(extra.error ? { error: extra.error } : {}),
					updatedAt: new Date(),
				})
				.where(eq(backgroundJobs.jobId, jobId))
		} catch {
			// Intentionally swallowed - see the doc comment.
		}
	}
}

/**
 * `background_job.result` is a jsonb object, so a job that returns an array or a
 * scalar is wrapped rather than spread into nothing.
 */
function toResultObject(result: unknown): Record<string, unknown> {
	if (result && typeof result === "object" && !Array.isArray(result)) {
		return result as Record<string, unknown>
	}
	return { value: result ?? null }
}
