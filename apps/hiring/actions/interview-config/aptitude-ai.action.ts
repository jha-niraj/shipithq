"use server"

import crypto from "crypto"
import { and, count, desc, eq, gte, sql } from "drizzle-orm"
import { db, aptitudeQuestions, backgroundJobs, companyAiUsage, isTerminalJobStatus } from "@repo/db"
import { HIRING_AI_LIMITS } from "@repo/pricing"
import { requirePermission } from "@/lib/permissions"
import { EXTRA_CREDIT_COST, refundCredits, spendCredits } from "@/lib/plan"
import { dispatchJob } from "@/lib/workers"

/*
 * "Generate with AI" for aptitude questions (plan/hiring-rounds HR-11). A
 * company asks for questions on its own topics; the `aptitude_generate` worker
 * job writes them as DRAFTs private to the company (checked twice: see the
 * job's header); the company approves, edits or rejects each one here. Only an
 * approved (LIVE) question can be put in a round's pool.
 *
 * The count per generation and the daily cap are Niraj's, in @repo/pricing
 * (HIRING_AI_LIMITS).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

const DAY_MS = 86_400_000
const SECTIONS = ["QUANT", "LOGICAL", "VERBAL"] as const

export interface DraftQuestion {
    id: string
    section: string
    topic: string
    difficulty: "EASY" | "MEDIUM" | "HARD"
    prompt: string
    options: string[]
    correctIndex: number
    explanation: string
    createdAt: Date
}

export interface GenerationStatus {
    status: "waiting" | "active" | "completed" | "failed"
    progress: number
    phase: string | null
    created: number | null
    rejected: number | null
    error: string | null
}

async function generationsLeft(companyId: string): Promise<number> {
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(companyAiUsage)
        .where(and(eq(companyAiUsage.companyId, companyId), eq(companyAiUsage.kind, "aptitude_generate"), gte(companyAiUsage.createdAt, new Date(Date.now() - DAY_MS))))
    return Math.max(0, HIRING_AI_LIMITS.aptitudeGenerationsPerDay - Number(n))
}

/** The company's questions waiting for review, and how many generations are left today. */
export async function listDraftQuestions(): Promise<Result<{ drafts: DraftQuestion[]; generationsLeft: number; limits: typeof HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration }>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { companyId } = auth.ctx
    try {
        const rows = await db.select().from(aptitudeQuestions)
            .where(and(eq(aptitudeQuestions.companyId, companyId), eq(aptitudeQuestions.status, "DRAFT")))
            .orderBy(desc(aptitudeQuestions.createdAt))
            .limit(200)
        return {
            success: true,
            data: {
                drafts: rows.map((r) => ({
                    id: r.id, section: r.section, topic: r.topic, difficulty: r.difficulty, prompt: r.prompt,
                    options: r.options, correctIndex: r.correctIndex, explanation: r.explanation, createdAt: r.createdAt,
                })),
                generationsLeft: await generationsLeft(companyId),
                limits: HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration,
            },
        }
    } catch (error: unknown) {
        console.error("listDraftQuestions:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the drafts" }
    }
}

/** Start a generation. Returns the job to poll with `getGeneration`. */
export async function startAptitudeGeneration(input: {
    topics: string
    count: number
    difficulty: "EASY" | "MEDIUM" | "HARD"
    section: "QUANT" | "LOGICAL" | "VERBAL" | null
}): Promise<Result<{ jobId: string }>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    if (!ctx.can("use_ai")) return { success: false, error: "Your role can't use AI. Ask your company's owner." }

    const { min, max } = HIRING_AI_LIMITS.aptitudeQuestionsPerGeneration
    const n = Math.round(Number(input.count))
    if (!Number.isFinite(n) || n < min || n > max) return { success: false, error: `Ask for ${min} to ${max} questions at a time.` }
    if (!["EASY", "MEDIUM", "HARD"].includes(input.difficulty)) return { success: false, error: "Pick a difficulty." }
    const section = input.section && (SECTIONS as readonly string[]).includes(input.section) ? input.section : null
    const topics = input.topics.trim().slice(0, 1500)

    try {
        // Past the free daily generations, one costs company credits (plan/hiring-app HA-20),
        // refunded if the job fails (seen at dispatch or in getGeneration).
        let companyCharge: string | null = null
        if ((await generationsLeft(ctx.companyId)) <= 0) {
            companyCharge = `aptitude-generate:${crypto.randomUUID()}`
            const paid = await spendCredits(ctx.companyId, EXTRA_CREDIT_COST.aptitudeGeneration, `AI aptitude generation past today's ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} free`, companyCharge, ctx.userId)
            if (!paid.ok) return { success: false, error: `Today's ${HIRING_AI_LIMITS.aptitudeGenerationsPerDay} free generations are used. ${paid.error}` }
        }
        const jobId = crypto.randomUUID()
        const jobInput = { companyId: ctx.companyId, topics, count: n, difficulty: input.difficulty, section, companyCharge }
        await db.batch([
            db.insert(companyAiUsage).values({ companyId: ctx.companyId, userId: ctx.userId, kind: "aptitude_generate" }),
            db.insert(backgroundJobs).values({ jobId, type: "aptitude_generate", status: "waiting", progress: 0, input: jobInput, userId: ctx.userId }),
        ])
        try {
            await dispatchJob("aptitude_generate", jobId, ctx.userId, jobInput)
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : "The job worker could not be reached"
            await db.update(backgroundJobs).set({ status: "failed", error: reason.slice(0, 500) }).where(eq(backgroundJobs.jobId, jobId))
            if (companyCharge) await refundCredits(ctx.companyId, EXTRA_CREDIT_COST.aptitudeGeneration, "The generation couldn't start", companyCharge)
            return { success: false, error: reason }
        }
        return { success: true, data: { jobId } }
    } catch (error: unknown) {
        console.error("startAptitudeGeneration:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start the generation" }
    }
}

/** A generation's progress, only for the company that started it. */
export async function getGeneration(jobId: string): Promise<Result<GenerationStatus>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    try {
        const job = await db.query.backgroundJobs.findFirst({
            where: and(eq(backgroundJobs.jobId, jobId), eq(backgroundJobs.type, "aptitude_generate"), sql`${backgroundJobs.input}->>'companyId' = ${auth.ctx.companyId}`),
        })
        if (!job) return { success: false, error: "That generation doesn't exist." }
        // A paid generation that failed is refunded, once (the key makes a repeat read a no-op).
        const charge = (job.input as { companyCharge?: string | null } | null)?.companyCharge
        if (charge && job.status === "failed") await refundCredits(auth.ctx.companyId, EXTRA_CREDIT_COST.aptitudeGeneration, "The generation failed", charge)
        const result = (job.result ?? {}) as { phaseLabel?: string; created?: number; rejected?: number }
        return {
            success: true,
            data: {
                status: job.status as GenerationStatus["status"],
                progress: job.progress,
                phase: result.phaseLabel ?? null,
                created: isTerminalJobStatus(job.status) ? result.created ?? null : null,
                rejected: isTerminalJobStatus(job.status) ? result.rejected ?? null : null,
                error: job.error,
            },
        }
    } catch (error: unknown) {
        console.error("getGeneration:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not check the generation" }
    }
}

/**
 * Approve (with optional edits) or reject a draft. Approving makes it LIVE and
 * pickable; rejecting deletes it, which is safe because a draft was never drawn.
 */
export async function reviewDraftQuestion(id: string, input:
    | { action: "reject" }
    | { action: "approve"; prompt: string; options: string[]; correctIndex: number; explanation: string },
): Promise<Result<null>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const { companyId } = auth.ctx
    try {
        const own = and(eq(aptitudeQuestions.id, id), eq(aptitudeQuestions.companyId, companyId), eq(aptitudeQuestions.status, "DRAFT"))
        if (input.action === "reject") {
            const [gone] = await db.delete(aptitudeQuestions).where(own).returning({ id: aptitudeQuestions.id })
            return gone ? { success: true, data: null } : { success: false, error: "That draft was already reviewed." }
        }
        const prompt = input.prompt.trim()
        const options = input.options.map((o) => o.trim())
        const explanation = input.explanation.trim()
        if (prompt.length < 15) return { success: false, error: "The question is too short." }
        if (options.length !== 4 || options.some((o) => !o)) return { success: false, error: "A question needs four options." }
        if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return { success: false, error: "The four options must all be different." }
        if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex > 3) return { success: false, error: "Mark the correct option." }
        if (explanation.length < 10) return { success: false, error: "Add a short explanation of the answer." }
        const [done] = await db.update(aptitudeQuestions)
            .set({ prompt: prompt.slice(0, 2000), options: options.map((o) => o.slice(0, 300)), correctIndex: input.correctIndex, explanation: explanation.slice(0, 1000), status: "LIVE", updatedAt: new Date() })
            .where(own)
            .returning({ id: aptitudeQuestions.id })
        return done ? { success: true, data: null } : { success: false, error: "That draft was already reviewed." }
    } catch (error: unknown) {
        console.error("reviewDraftQuestion:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the review" }
    }
}
