"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, backgroundJobs, isTerminalJobStatus, type JobType } from "@repo/db"
import { and, eq, inArray, sql } from "drizzle-orm"
import crypto from "crypto"
import { reserveCredits, releaseCredits, settleCredits } from "@/lib/credits/hold"
import { toErrorMessage } from "@/lib/errors"
import { callWorker } from "@/lib/workers/client"

// ─────────────────────────────────────────────────────────────────────────────
// Starting and polling background jobs.
//
// One dispatch path for every job type, because the alternative - a bespoke
// action per job - is how the two that already existed ended up with two
// different token schemes, two different credit stories and two different ideas
// of what `result` contains.
//
// The shape, which every caller gets for free:
//
//   1. reserve credits (idempotent, keyed on the job id)
//   2. insert the background_job row BEFORE dispatch, so the UI can poll
//      immediately - a job that exists only inside the worker is invisible
//      until its first write
//   3. hand off to the worker's Durable Object and return the job id
//   4. on a dispatch failure, refund and fail the row here, because nothing
//      else ever will
//
// Credits settle or release when the APP observes a terminal status, never in
// the worker, so every credit decision in the product stays in one place
// (`lib/credits/hold.ts`).
// ─────────────────────────────────────────────────────────────────────────────

/** The hold key for a job. Derived, so the poller does not have to carry it. */
const holdIdFor = (jobId: string) => `job-${jobId}`

/** Signed HMAC token the worker verifies with Web Crypto. Scoped to one job. */
function issueJobToken(userId: string, jobId: string): string {
    const secret = process.env.WORKER_SECRET
    if (!secret) throw new Error("Worker secret not configured")
    const now = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({ userId, action: "start_job", jobId, iat: now, exp: now + 300 })
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url")
    return `${Buffer.from(payload).toString("base64url")}.${signature}`
}

export interface StartJobOptions {
    /** Credits to hold for the duration of the job. Omit for free jobs. */
    cost?: number
    /** Ledger description for the hold. Required when `cost` is set. */
    reason?: string
    /**
     * Return the in-flight job instead of starting a second one when this user
     * already has a job of this type running. Off by default: most jobs are
     * scoped to a specific row and two of them in parallel are legitimate.
     */
    singleFlight?: boolean
    /**
     * What "the same job" means for `singleFlight`. Without it, a memory update
     * for session B while A's was running returned A's job id and B's window was
     * never consolidated - including the one dispatched when a session finishes,
     * which has no later stage change to pick it up.
     */
    singleFlightKey?: string
}

export interface StartJobResult {
    success: boolean
    jobId?: string
    error?: string
    code?: string
    required?: number
    available?: number
}

/**
 * Start a background job.
 *
 * `input` must be a POINTER (ids), not a payload: minutes can pass before the
 * alarm fires, and the worker re-reads current data rather than acting on a
 * snapshot that is already stale.
 */
export async function startBackgroundJob(
    type: JobType,
    input: Record<string, unknown>,
    options: StartJobOptions = {},
): Promise<StartJobResult> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }
        const userId = session.user.id

        if (options.singleFlight) {
            // Refuse a second run while one is in flight rather than charging
            // twice and racing two Durable Objects at the same rows.
            //
            // BOTH non-terminal statuses, not just `active`. The row is inserted
            // `waiting` and only becomes `active` when the Durable Object writes
            // its first status - a round trip to the worker later. Checking only
            // for `active` left that window wide open, and a double-click lands
            // inside it comfortably: two rows, two dispatches, and for a job with
            // a `cost` two credit holds. A double charge is precisely what this
            // guard exists to prevent.
            const [inFlight] = await db
                .select({ jobId: backgroundJobs.jobId })
                .from(backgroundJobs)
                .where(
                    and(
                        eq(backgroundJobs.userId, userId),
                        eq(backgroundJobs.type, type),
                        inArray(backgroundJobs.status, ["waiting", "active"]),
                        ...(options.singleFlightKey
                            ? [sql`${backgroundJobs.input}->>'singleFlightKey' = ${options.singleFlightKey}`]
                            : []),
                    ),
                )
                .limit(1)
            if (inFlight) return { success: true, jobId: inFlight.jobId }
        }

        const jobId = crypto.randomUUID()

        if (options.cost && options.cost > 0) {
            const hold = await reserveCredits({
                userId,
                amount: options.cost,
                reason: options.reason ?? `Background job: ${type}`,
                holdId: holdIdFor(jobId),
            })
            if (!hold.ok) {
                return {
                    success: false,
                    error: hold.error,
                    code: hold.code,
                    required: hold.required ?? options.cost,
                    available: hold.available ?? 0,
                }
            }
        }

        await db.insert(backgroundJobs).values({
            jobId,
            type,
            status: "waiting",
            progress: 0,
            // The key rides along in the input so the in-flight check above can match
            // on it. The worker ignores a field it does not read.
            input: options.singleFlightKey ? { ...input, singleFlightKey: options.singleFlightKey } : input,
            userId,
        })

        try {
            const res = await callWorker("/api/v1/jobs", {
                token: issueJobToken(userId, jobId),
                body: { type, jobId, input },
            })
            if (!res.ok) throw new Error(`Worker rejected the job (${res.status})`)
        } catch (error: unknown) {
            // Never dispatched, so nothing will ever finish this job - fail it
            // here and give the credits straight back.
            const detail = toErrorMessage(error, "dispatch failed")

            // A connection failure in development almost always means `apps/worker` is not
            // running, and the raw message ("fetch failed", ECONNREFUSED) says nothing about
            // that. Worth naming: every job type is dispatched through here, so one
            // unreachable worker looks like four unrelated broken features.
            const unreachable = /fetch failed|ECONNREFUSED|ENOTFOUND|network|socket/i.test(detail)
            const hint =
                unreachable && process.env.NODE_ENV !== "production"
                    ? " The job worker is not reachable - start apps/worker (`pnpm dev`) or set WORKER_URL."
                    : ""

            if (options.cost) await releaseCredits(holdIdFor(jobId), detail)
            await db
                .update(backgroundJobs)
                .set({ status: "failed", error: detail })
                .where(eq(backgroundJobs.jobId, jobId))
            console.error(`[jobs] dispatch of ${type} failed:`, detail)
            return {
                success: false,
                error:
                    (options.cost
                        ? "Could not start the job. Your credits were not charged."
                        : "Could not start the job. Please try again.") + hint,
            }
        }

        return { success: true, jobId }
    } catch (error: unknown) {
        console.error(`[jobs] startBackgroundJob(${type}) failed:`, error)
        return { success: false, error: toErrorMessage(error, "Failed to start the job") }
    }
}

export interface JobStatusResult<TResult = Record<string, unknown>> {
    success: boolean
    status?: string
    progress?: number
    phaseLabel?: string
    done?: boolean
    result?: TResult
    error?: string
}

/**
 * Poll a job.
 *
 * Settles or releases the credit hold the first time a terminal status is seen.
 * Both are idempotent, so polling twice after completion is harmless - which
 * matters because several tabs may be polling the same job.
 */
export async function getBackgroundJobStatus<TResult = Record<string, unknown>>(
    jobId: string,
): Promise<JobStatusResult<TResult>> {
    try {
        const session = await getSession(await headers())
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        // Scoped to the caller: a job id is guessable enough that it should not
        // expose another user's progress.
        const [job] = await db
            .select()
            .from(backgroundJobs)
            .where(and(eq(backgroundJobs.jobId, jobId), eq(backgroundJobs.userId, session.user.id)))
            .limit(1)
        if (!job) return { success: false, error: "Job not found" }

        const done = isTerminalJobStatus(job.status)
        if (done) {
            if (job.status === "completed") await settleCredits(holdIdFor(jobId))
            else await releaseCredits(holdIdFor(jobId), job.error ?? "job failed")
        }

        const { phaseLabel, ...result } = (job.result ?? {}) as { phaseLabel?: string } & Record<string, unknown>

        return {
            success: true,
            status: job.status,
            progress: job.progress,
            phaseLabel,
            done,
            result: result as TResult,
            error: job.status === "failed" ? (job.error ?? "The job failed") : undefined,
        }
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error, "Failed to read status") }
    }
}
