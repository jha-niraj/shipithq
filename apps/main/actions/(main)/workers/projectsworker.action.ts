"use server"

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { db, users } from '@repo/db'
import { eq } from 'drizzle-orm'
import { z } from "zod"
import { ProjectEchoSchema } from "../schemas/projects.schema"
import crypto from 'crypto'
import { startBackgroundJob, getBackgroundJobStatus } from './jobs.action'

async function getCurrentUser() {
    const session = await getSession(await headers())
    if (!session?.user?.email) throw new Error("Not authenticated")
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1)
    if (!user) throw new Error("User not found")
    return user
}

/**
 * Signed HMAC token the workers verify (Web Crypto on the worker side).
 *
 * Still exported because the code editor and apps/uni issue their own tokens for
 * the legacy routes. Anything dispatching a background job should go through
 * `startBackgroundJob`, which issues its own job-scoped token.
 */
export async function issueWorkerToken(action: 'generate_project' | 'generate_verification' | 'check_job' | 'run_code' | 'check_execution', jobId?: string) {
    const user = await getCurrentUser()
    const secret = process.env.WORKER_SECRET
    if (!secret) throw new Error("Worker secret not configured")

    const now = Math.floor(Date.now() / 1000)
    const payload = { userId: user.id, action, jobId, iat: now, exp: now + 300 }
    const data = JSON.stringify(payload)
    const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url')
    const encodedPayload = Buffer.from(data).toString('base64url')
    return `${encodedPayload}.${signature}`
}

/**
 * Start a project-generation job on the worker.
 *
 * The Durable Object schedules an Alarm and runs the 1-1.5 min pipeline off the
 * request path, writing status/progress to `background_job`. The client polls
 * `getGenerationStatus(jobId)`.
 *
 * Credits are HELD here, like every other job. The pipeline used to debit them
 * itself, unguarded, minutes after this check - see the note in
 * `apps/worker/src/pipeline.ts`. `startBackgroundJob({ cost })` reserves them
 * under a SQL balance guard and refunds automatically if the job fails.
 */
export async function startProjectGeneration(
    input: z.infer<typeof ProjectEchoSchema>,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        const user = await getCurrentUser()
        const validated = ProjectEchoSchema.parse(input)

        const cost = (validated.visibility === "PUBLIC" ? 13 : 25) + (validated.includeAssessment ? 30 : 0)
        if ((user.credits ?? 0) < cost) {
            return { success: false, error: `Insufficient credits. You need ${cost} credits to generate this project.` }
        }

        // Single flight: two dispatches are two projects and two charges. A double
        // click lands inside the dispatch window comfortably.
        const started = await startBackgroundJob('project_generation', validated as unknown as Record<string, unknown>, {
            cost,
            reason: `Generated project: ${validated.projectTitle}`,
            singleFlight: true,
            singleFlightKey: user.id,
        })
        if (!started.success) {
            return { success: false, error: started.error ?? 'Failed to start generation. Please try again.' }
        }

        return { success: true, jobId: started.jobId }
    } catch (error) {
        console.error('startProjectGeneration failed:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to start generation' }
    }
}

/**
 * Read the current generation status (written server-side by the worker's DO).
 */
export async function getGenerationStatus(jobId: string): Promise<{
    success: boolean
    status?: string
    progress?: number
    phaseLabel?: string
    slug?: string
    error?: string
}> {
    const res = await getBackgroundJobStatus<{ slug?: string }>(jobId)
    if (!res.success) return { success: false, error: res.error }

    return {
        success: true,
        status: res.status,
        progress: res.progress,
        phaseLabel: res.phaseLabel,
        slug: res.result?.slug,
        error: res.error,
    }
}
