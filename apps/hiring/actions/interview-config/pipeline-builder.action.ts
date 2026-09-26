"use server"

import { and, asc, count, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
    db, withTransaction, type TxClient,
    aptitudeQuestions, companyAiUsage, designPrompts, hiringRoundPoolItems, interviewProcesses, interviewRounds, jobs, practiceProblem,
} from "@repo/db"
import { modelFor } from "@repo/ai"
import { HIRING_AI_LIMITS } from "@repo/pricing"
import { requirePermission } from "@/lib/permissions"
import { EXTRA_CREDIT_COST, canAddPipeline, refundCredits, spendCredits } from "@/lib/plan"
import { AiUnavailableError, chatJSON } from "@/lib/ai"
import { copyRounds, runsUsing } from "@/lib/pipelines"
import { DRAFT_SYSTEM, isV1, normalisePipelineDraft, voiceDefaults } from "@/lib/pipeline-draft"
import {
    POOLED_TYPES, POOL_KIND_FOR, V1_ROUND_TYPES, roundProblems,
    type BuilderRound, type CatalogItem, type PipelineSummary, type PoolLevel, type RoundDraft, type RubricCriterion, type TemplateSummary, type V1RoundType,
} from "@/types/pipeline"

/*
 * The pipeline builder (plan/hiring-rounds HR-10). A company's pipelines are its
 * templates (`isTemplate`, `companyId` set). ShipItHQ's PLATFORM pipelines are
 * copied, never edited. Saving writes the whole pipeline in one transaction,
 * checked here with the same rules the builder shows (`roundProblems`).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

const isPooled = (t: string) => (POOLED_TYPES as readonly string[]).includes(t)

// ── Default pools ────────────────────────────────────────────────────────────

const LEVELS: Record<PoolLevel, ("EASY" | "MEDIUM" | "HARD")[]> = {
    EASY: ["EASY", "MEDIUM"],
    MEDIUM: ["EASY", "MEDIUM", "HARD"],
    HARD: ["MEDIUM", "HARD"],
}

type PoolKind = "APTITUDE_QUESTION" | "PRACTICE_PROBLEM" | "DESIGN_PROMPT"
type Reader = typeof db | TxClient

/**
 * What a new round of this type draws from until HR-11 lets the company pick:
 * ShipItHQ's LIVE aptitude bank (at the level's difficulties), judge-ready DSA
 * problems of exactly that difficulty, or ShipItHQ's LIVE design prompts.
 */
async function defaultPool(reader: Reader, roundType: string, level: PoolLevel): Promise<{ kind: PoolKind; refId: string }[]> {
    if (roundType === "APTITUDE") {
        const rows = await reader.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions)
            .where(and(isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.status, "LIVE"), inArray(aptitudeQuestions.difficulty, LEVELS[level])))
        return rows.map((r) => ({ kind: "APTITUDE_QUESTION", refId: r.id }))
    }
    if (roundType === "DSA") {
        const rows = await reader.select({ id: practiceProblem.id }).from(practiceProblem)
            .where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true), eq(practiceProblem.judgeStatus, "ready"), eq(practiceProblem.difficulty, level)))
        return rows.map((r) => ({ kind: "PRACTICE_PROBLEM", refId: r.id }))
    }
    if (roundType === "SYSTEM_DESIGN") {
        const rows = await reader.select({ id: designPrompts.id }).from(designPrompts)
            .where(and(isNull(designPrompts.companyId), eq(designPrompts.status, "LIVE"), inArray(designPrompts.difficulty, LEVELS[level])))
        return rows.map((r) => ({ kind: "DESIGN_PROMPT", refId: r.id }))
    }
    return []
}

/** How many items each default pool would hold, so the builder can check a new round's draw. */
export async function getDefaultPoolSizes(): Promise<Result<Record<string, Record<PoolLevel, number>>>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const out: Record<string, Record<PoolLevel, number>> = {}
    for (const t of POOLED_TYPES) {
        out[t] = { EASY: 0, MEDIUM: 0, HARD: 0 }
        for (const level of ["EASY", "MEDIUM", "HARD"] as PoolLevel[]) out[t]![level] = (await defaultPool(db, t, level)).length
    }
    return { success: true, data: out }
}

// ── Reading ──────────────────────────────────────────────────────────────────

export async function listPipelines(): Promise<Result<{
    pipelines: PipelineSummary[]
    templates: TemplateSummary[]
    canManage: boolean
    aiDraftsLeft: number
}>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const [own, templates, used] = await Promise.all([
            db.query.interviewProcesses.findMany({
                where: and(eq(interviewProcesses.companyId, ctx.companyId), eq(interviewProcesses.isTemplate, true), eq(interviewProcesses.isActive, true)),
                with: { rounds: { columns: { roundType: true, gateMode: true } } },
                orderBy: [desc(interviewProcesses.updatedAt)],
            }),
            db.query.interviewProcesses.findMany({
                where: and(eq(interviewProcesses.ownerKind, "PLATFORM"), eq(interviewProcesses.isTemplate, true), eq(interviewProcesses.isActive, true)),
                with: { rounds: { columns: { title: true, roundType: true, roundNumber: true } } },
                orderBy: [asc(interviewProcesses.name)],
            }),
            // Jobs use their own copies (HR-12), so a template's jobs are the ones whose copy came from it.
            db.select({ processId: interviewProcesses.sourceTemplateId, n: count() }).from(jobs)
                .innerJoin(interviewProcesses, eq(interviewProcesses.id, jobs.interviewProcessId))
                .where(eq(jobs.companyId, ctx.companyId)).groupBy(interviewProcesses.sourceTemplateId),
        ])
        return {
            success: true,
            data: {
                pipelines: own.map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    roundCount: p.rounds.length,
                    gatedCount: p.rounds.filter((r) => r.gateMode === "HARD").length,
                    legacyCount: p.rounds.filter((r) => !isV1(r.roundType)).length,
                    jobsUsing: Number(used.find((u) => u.processId === p.id)?.n ?? 0),
                    updatedAt: p.updatedAt,
                })),
                templates: templates.map((t) => ({
                    id: t.id,
                    name: t.name,
                    description: t.description,
                    rounds: [...t.rounds].sort((a, b) => a.roundNumber - b.roundNumber).map((r) => ({ title: r.title, roundType: r.roundType })),
                })),
                canManage: ctx.can("manage_pipelines"),
                aiDraftsLeft: await draftsLeft(ctx.companyId),
            },
        }
    } catch (error: unknown) {
        console.error("listPipelines:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your pipelines" }
    }
}

/** One of the company's pipelines: a template, or a job's own copy (HR-12). */
async function ownPipeline(companyId: string, id: string) {
    return db.query.interviewProcesses.findFirst({
        where: and(eq(interviewProcesses.id, id), eq(interviewProcesses.companyId, companyId)),
    })
}

export async function getPipeline(id: string): Promise<Result<{
    id: string
    name: string
    description: string | null
    rounds: BuilderRound[]
    jobsUsing: number
    canManage: boolean
    /** Set when this is a job's own copy (HR-12). */
    job: { id: string; slug: string; title: string; status: string } | null
    /** The template a job's copy came from. */
    sourceName: string | null
    /** Candidates' runs using this pipeline: saving a job copy with runs forks it. */
    runs: number
}>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const p = await ownPipeline(ctx.companyId, id)
        if (!p) return { success: false, error: "That pipeline doesn't exist." }
        const rounds = await db.select().from(interviewRounds).where(eq(interviewRounds.processId, id)).orderBy(asc(interviewRounds.roundNumber))
        const ids = rounds.map((r) => r.id)
        const [items, [{ n: jobsUsing } = { n: 0 }]] = await Promise.all([
            ids.length
                ? db.select({ roundId: hiringRoundPoolItems.roundId, refId: hiringRoundPoolItems.refId }).from(hiringRoundPoolItems).where(inArray(hiringRoundPoolItems.roundId, ids))
                : Promise.resolve([] as { roundId: string; refId: string }[]),
            p.isTemplate
                ? db.select({ n: count() }).from(jobs).innerJoin(interviewProcesses, eq(interviewProcesses.id, jobs.interviewProcessId)).where(eq(interviewProcesses.sourceTemplateId, id))
                : db.select({ n: count() }).from(jobs).where(eq(jobs.interviewProcessId, id)),
        ])
        const [job, source, runs] = await Promise.all([
            p.jobId ? db.query.jobs.findFirst({ where: and(eq(jobs.id, p.jobId), eq(jobs.companyId, ctx.companyId)), columns: { id: true, slug: true, title: true, status: true } }) : null,
            p.sourceTemplateId ? db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, p.sourceTemplateId), columns: { name: true } }) : null,
            runsUsing(db, id),
        ])
        return {
            success: true,
            data: {
                id: p.id,
                name: p.name,
                description: p.description,
                jobsUsing: Number(jobsUsing),
                canManage: ctx.can("manage_pipelines") || (!p.isTemplate && ctx.can("manage_jobs")),
                job: job ?? null,
                sourceName: source?.name ?? null,
                runs,
                rounds: rounds.map((r) => ({
                    id: r.id,
                    roundType: r.roundType,
                    title: r.title,
                    description: r.description,
                    gateMode: r.gateMode,
                    passMark: r.passMark,
                    timeLimitMinutes: r.timeLimitMinutes ?? r.durationMinutes ?? 30,
                    drawCount: r.drawCount,
                    cooldownHours: r.cooldownHours,
                    responseMode: r.responseMode,
                    rubric: Array.isArray(r.rubric) ? (r.rubric as BuilderRound["rubric"]) : null,
                    mockKnowledgeBase: r.mockKnowledgeBase,
                    poolSize: items.filter((x) => x.roundId === r.id).length,
                    savedPool: items.filter((x) => x.roundId === r.id).map((x) => x.refId),
                    legacy: !isV1(r.roundType),
                })),
            },
        }
    } catch (error: unknown) {
        console.error("getPipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the pipeline" }
    }
}

// ── Creating ─────────────────────────────────────────────────────────────────

const cleanName = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 80)

/**
 * A new pipeline: empty, or a copy of a template (ShipItHQ's or the company's
 * own), rounds and pools included. The copy remembers its source.
 */
export async function createPipeline(input: { name: string; fromTemplateId?: string | null }): Promise<Result<{ id: string }>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        let source: typeof interviewProcesses.$inferSelect | undefined
        if (input.fromTemplateId) {
            source = await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, input.fromTemplateId) })
            const allowed = source && source.isTemplate && (source.ownerKind === "PLATFORM" || source.companyId === ctx.companyId)
            if (!allowed) return { success: false, error: "That template isn't available." }
        }
        const name = cleanName(input.name) || (source ? source.name : "")
        if (!name) return { success: false, error: "Give the pipeline a name." }
        // The plan's pipeline limit (plan/hiring-app HA-20).
        const room = await canAddPipeline(ctx.companyId)
        if (!room.ok) return { success: false, error: room.error }

        const id = await withTransaction(async (tx) => {
            const [created] = await tx.insert(interviewProcesses).values({
                companyId: ctx.companyId,
                ownerKind: "COMPANY",
                isTemplate: true,
                sourceTemplateId: source?.id ?? null,
                name,
                description: source?.description ?? null,
                isActive: true,
                updatedAt: new Date(),
            }).returning({ id: interviewProcesses.id })
            if (!created) throw new Error("Failed to create the pipeline")
            if (source) await copyRounds(tx, source.id, created.id)
            return created.id
        })
        revalidatePath("/interview-config")
        return { success: true, data: { id } }
    } catch (error: unknown) {
        console.error("createPipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not create the pipeline" }
    }
}

// ── Saving ───────────────────────────────────────────────────────────────────

/**
 * Write the whole pipeline: name, description and its rounds in order. Rounds
 * missing from `rounds` are deleted (their pools with them; past attempts keep
 * their score, `roundId` set null). A new round, or one whose type changed,
 * gets the default pool for its type at `poolLevel`.
 */
export async function savePipeline(id: string, input: { name: string; description: string; rounds: RoundDraft[] }): Promise<Result<{ id: string }>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth

    const name = cleanName(input.name)
    if (!name) return { success: false, error: "Give the pipeline a name." }
    if (input.rounds.length === 0) return { success: false, error: "Add at least one round." }
    if (input.rounds.length > 12) return { success: false, error: "A pipeline has at most 12 rounds." }

    try {
        const pipeline = await ownPipeline(ctx.companyId, id)
        if (!pipeline) return { success: false, error: "That pipeline doesn't exist." }
        // Templates need "manage pipelines"; a job's own copy is part of the job.
        const allowed = pipeline.isTemplate ? ctx.can("manage_pipelines") : (ctx.can("manage_pipelines") || ctx.can("manage_jobs"))
        if (!allowed) return { success: false, error: "You don't have permission to do this. Ask your company's owner." }
        // A job's copy that candidates have started is never edited in place: the
        // edit becomes a new version the job moves to, and their runs keep theirs.
        const fork = !pipeline.isTemplate && (await runsUsing(db, id)) > 0
        const saved = await db.select({ id: interviewRounds.id, roundType: interviewRounds.roundType }).from(interviewRounds).where(eq(interviewRounds.processId, id))
        const savedById = new Map(saved.map((r) => [r.id, r]))
        for (const r of input.rounds) if (r.id && !savedById.has(r.id)) return { success: false, error: "A round in this pipeline no longer exists. Reload the page." }

        const poolCounts = saved.length
            ? await db.select({ roundId: hiringRoundPoolItems.roundId, n: count() }).from(hiringRoundPoolItems)
                .where(inArray(hiringRoundPoolItems.roundId, saved.map((r) => r.id))).groupBy(hiringRoundPoolItems.roundId)
            : []

        // Check every round with the builder's own rules, against the pool it will have.
        const plans: { draft: RoundDraft; freshPool: { kind: PoolKind; refId: string }[] | null }[] = []
        for (const [i, r] of input.rounds.entries()) {
            const typeChanged = !r.id || savedById.get(r.id)!.roundType !== r.roundType
            let freshPool: { kind: PoolKind; refId: string }[] | null = null
            if (isPooled(r.roundType) && r.pool) {
                // Picked in the pool sheet (HR-11): exactly these, if each one is allowed.
                const allowed = await allowedRefs(ctx.companyId, r.roundType as keyof typeof POOL_KIND_FOR, r.pool)
                if (allowed.length !== new Set(r.pool).size) return { success: false, error: `Round ${i + 1}: some picked questions aren't available any more. Reopen the pool and pick again.` }
                freshPool = allowed.map((refId) => ({ kind: POOL_KIND_FOR[r.roundType as keyof typeof POOL_KIND_FOR], refId }))
            } else if (typeChanged && isPooled(r.roundType)) {
                freshPool = await defaultPool(db, r.roundType, r.poolLevel ?? "MEDIUM")
            }
            const poolSize = !isPooled(r.roundType) ? null : freshPool ? freshPool.length : Number(poolCounts.find((p) => p.roundId === r.id)?.n ?? 0)
            const problems = roundProblems(r, poolSize)
            if (problems.length) return { success: false, error: `Round ${i + 1}: ${problems[0]}` }
            plans.push({ draft: r, freshPool: freshPool ?? (typeChanged ? [] : null) })
        }
        // Forking: every kept round's pool is copied across unless it was replaced above.
        if (fork) {
            for (const plan of plans) {
                if (plan.freshPool || !plan.draft.id) continue
                const items = await db.select({ kind: hiringRoundPoolItems.kind, refId: hiringRoundPoolItems.refId }).from(hiringRoundPoolItems)
                    .where(eq(hiringRoundPoolItems.roundId, plan.draft.id))
                plan.freshPool = items
            }
        }

        const targetId = await withTransaction(async (tx) => {
            let target = id
            if (fork) {
                const [copy] = await tx.insert(interviewProcesses).values({
                    companyId: ctx.companyId, ownerKind: "COMPANY", isTemplate: false, sourceTemplateId: pipeline.sourceTemplateId,
                    jobId: pipeline.jobId, name, description: input.description.trim().slice(0, 1000) || null, isActive: true, updatedAt: new Date(),
                }).returning({ id: interviewProcesses.id })
                target = copy!.id
                if (pipeline.jobId) await tx.update(jobs).set({ interviewProcessId: target }).where(and(eq(jobs.id, pipeline.jobId), eq(jobs.companyId, ctx.companyId)))
            } else {
                await tx.update(interviewProcesses).set({ name, description: input.description.trim().slice(0, 1000) || null, updatedAt: new Date() })
                    .where(eq(interviewProcesses.id, id))
                const keep = input.rounds.map((r) => r.id).filter((x): x is string => Boolean(x))
                const drop = saved.map((r) => r.id).filter((rid) => !keep.includes(rid))
                if (drop.length) await tx.delete(interviewRounds).where(inArray(interviewRounds.id, drop))
                // Move kept rounds out of the way first: (processId, roundNumber) is unique.
                if (keep.length) await tx.update(interviewRounds).set({ roundNumber: sql`${interviewRounds.roundNumber} + 1000` }).where(inArray(interviewRounds.id, keep))
            }

            for (const [i, { draft: r, freshPool }] of plans.entries()) {
                const voice = voiceDefaults(r.roundType)
                const values = {
                    roundNumber: i + 1,
                    roundType: r.roundType as V1RoundType,
                    title: r.title.trim().slice(0, 80),
                    description: r.description.trim().slice(0, 2000),
                    durationMinutes: r.timeLimitMinutes,
                    gateMode: r.gateMode,
                    passMark: r.passMark,
                    timeLimitMinutes: r.timeLimitMinutes,
                    drawCount: isPooled(r.roundType) ? r.drawCount : 1,
                    cooldownHours: r.cooldownHours,
                    responseMode: r.responseMode,
                    rubric: r.roundType.startsWith("VOICE_") ? (r.rubric ?? voice.rubric) : null,
                    mockKnowledgeBase: r.roundType.startsWith("VOICE_") ? (r.mockKnowledgeBase?.trim() || voice.mockKnowledgeBase) : null,
                    hasMockInterview: r.roundType.startsWith("VOICE_"),
                    updatedAt: new Date(),
                }
                let roundId = fork ? undefined : r.id
                if (roundId) {
                    await tx.update(interviewRounds).set(values).where(eq(interviewRounds.id, roundId))
                } else {
                    const [created] = await tx.insert(interviewRounds).values({ ...values, processId: target, format: "VIDEO" }).returning({ id: interviewRounds.id })
                    roundId = created!.id
                }
                if (freshPool) {
                    await tx.delete(hiringRoundPoolItems).where(eq(hiringRoundPoolItems.roundId, roundId))
                    for (let j = 0; j < freshPool.length; j += 200) {
                        await tx.insert(hiringRoundPoolItems).values(freshPool.slice(j, j + 200).map((it) => ({ ...it, roundId: roundId! }))).onConflictDoNothing()
                    }
                }
            }
            return target
        })
        revalidatePath("/interview-config")
        revalidatePath(`/interview-config/${id}`)
        revalidatePath("/jobs")
        return { success: true, data: { id: targetId } }
    } catch (error: unknown) {
        console.error("savePipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the pipeline" }
    }
}

// ── Pools (HR-11) ────────────────────────────────────────────────────────────

/**
 * Of `refIds`, those a round of this type may draw for this company: judge-ready
 * DSA problems; ShipItHQ's LIVE aptitude questions and the company's own LIVE
 * ones (never a DRAFT); ShipItHQ's LIVE design prompts and the company's own.
 */
async function allowedRefs(companyId: string, roundType: keyof typeof POOL_KIND_FOR, refIds: string[]): Promise<string[]> {
    const ids = [...new Set(refIds)].slice(0, 2000)
    if (!ids.length) return []
    if (roundType === "DSA") {
        const rows = await db.select({ id: practiceProblem.id }).from(practiceProblem)
            .where(and(inArray(practiceProblem.id, ids), eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true), eq(practiceProblem.judgeStatus, "ready")))
        return rows.map((r) => r.id)
    }
    if (roundType === "APTITUDE") {
        const rows = await db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions)
            .where(and(inArray(aptitudeQuestions.id, ids), eq(aptitudeQuestions.status, "LIVE"), or(isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.companyId, companyId))))
        return rows.map((r) => r.id)
    }
    const rows = await db.select({ id: designPrompts.id }).from(designPrompts)
        .where(and(inArray(designPrompts.id, ids), eq(designPrompts.status, "LIVE"), or(isNull(designPrompts.companyId), eq(designPrompts.companyId, companyId))))
    return rows.map((r) => r.id)
}

/** Everything the pool sheet can show for a round type, ShipItHQ's and the company's own. */
export async function getPoolCatalog(roundType: "APTITUDE" | "DSA" | "SYSTEM_DESIGN"): Promise<Result<CatalogItem[]>> {
    const auth = await requirePermission()
    if (!auth.ok) return { success: false, error: auth.error }
    const { companyId } = auth.ctx
    try {
        if (roundType === "DSA") {
            const rows = await db.select({ id: practiceProblem.id, title: practiceProblem.title, difficulty: practiceProblem.difficulty, category: practiceProblem.category })
                .from(practiceProblem)
                .where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true), eq(practiceProblem.judgeStatus, "ready")))
                .orderBy(asc(practiceProblem.difficulty), asc(practiceProblem.title))
            return { success: true, data: rows.map((r) => ({ id: r.id, title: r.title, difficulty: r.difficulty, tag: r.category, own: false })) }
        }
        if (roundType === "APTITUDE") {
            const rows = await db.select({
                id: aptitudeQuestions.id, prompt: aptitudeQuestions.prompt, difficulty: aptitudeQuestions.difficulty,
                section: aptitudeQuestions.section, topic: aptitudeQuestions.topic, companyId: aptitudeQuestions.companyId, status: aptitudeQuestions.status,
            }).from(aptitudeQuestions)
                .where(or(and(isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.status, "LIVE")), eq(aptitudeQuestions.companyId, companyId)))
                .orderBy(asc(aptitudeQuestions.section), asc(aptitudeQuestions.topic))
            return {
                success: true,
                data: rows.map((r) => ({
                    id: r.id,
                    title: r.prompt.replace(/\s+/g, " ").slice(0, 160),
                    difficulty: r.difficulty,
                    tag: r.topic.replace(/-/g, " "),
                    section: r.section,
                    own: r.companyId !== null,
                    draft: r.status !== "LIVE",
                })),
            }
        }
        const rows = await db.select({ id: designPrompts.id, title: designPrompts.title, difficulty: designPrompts.difficulty, companyId: designPrompts.companyId })
            .from(designPrompts)
            .where(and(eq(designPrompts.status, "LIVE"), or(isNull(designPrompts.companyId), eq(designPrompts.companyId, companyId))))
            .orderBy(asc(designPrompts.difficulty), asc(designPrompts.title))
        return { success: true, data: rows.map((r) => ({ id: r.id, title: r.title, difficulty: r.difficulty, tag: r.companyId ? "Yours" : "ShipItHQ", own: r.companyId !== null })) }
    } catch (error: unknown) {
        console.error("getPoolCatalog:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the questions" }
    }
}

/**
 * A design prompt the company writes itself (HR-11): LIVE at once and private
 * to the company, because writing it is the approval. The rubric's weights
 * must sum to 100, like ShipItHQ's.
 */
export async function createCompanyDesignPrompt(input: { title: string; prompt: string; difficulty: PoolLevel; rubric: RubricCriterion[] }): Promise<Result<CatalogItem>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const title = cleanName(input.title)
    const prompt = input.prompt.trim().slice(0, 4000)
    const rubric = (input.rubric ?? []).map((c) => ({ criterion: c.criterion.trim().slice(0, 60), weight: Math.round(Number(c.weight)), lookFor: c.lookFor.trim().slice(0, 300) }))
        .filter((c) => c.criterion)
    if (title.length < 3) return { success: false, error: "Give the prompt a title." }
    if (prompt.length < 80) return { success: false, error: "Write the brief: the system, its scale and what to cover (at least a few sentences)." }
    if (!["EASY", "MEDIUM", "HARD"].includes(input.difficulty)) return { success: false, error: "Pick a difficulty." }
    if (rubric.length < 2) return { success: false, error: "Add at least two rubric criteria." }
    const total = rubric.reduce((n, c) => n + (Number.isFinite(c.weight) ? c.weight : 0), 0)
    if (total !== 100) return { success: false, error: `The rubric's weights add up to ${total}, not 100.` }
    try {
        const [row] = await db.insert(designPrompts).values({
            companyId: auth.ctx.companyId, title, prompt, rubric, difficulty: input.difficulty, status: "LIVE", updatedAt: new Date(),
        }).returning({ id: designPrompts.id })
        return { success: true, data: { id: row!.id, title, difficulty: input.difficulty, tag: "Yours", own: true } }
    } catch (error: unknown) {
        console.error("createCompanyDesignPrompt:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save the prompt" }
    }
}

export async function deletePipeline(id: string): Promise<Result<null>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    try {
        const p = await ownPipeline(ctx.companyId, id)
        if (!p || !p.isTemplate) return { success: false, error: "That pipeline doesn't exist." }
        // Jobs keep their own copies (HR-12): deleting the template leaves them as they are.
        await db.delete(interviewProcesses).where(eq(interviewProcesses.id, id))
        revalidatePath("/interview-config")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("deletePipeline:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not delete the pipeline" }
    }
}

// ── Draft with AI ────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

async function draftsLeft(companyId: string): Promise<number> {
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(companyAiUsage)
        .where(and(eq(companyAiUsage.companyId, companyId), eq(companyAiUsage.kind, "pipeline_draft"), gte(companyAiUsage.createdAt, new Date(Date.now() - DAY_MS))))
    return Math.max(0, HIRING_AI_LIMITS.pipelineDraftsPerDay - Number(n))
}



/**
 * Draft a pipeline from a role description (one inline model call, 25 s), then
 * create it with default pools so it is usable at once. Free to the company,
 * within HIRING_AI_LIMITS.pipelineDraftsPerDay.
 */
export async function draftPipelineWithAI(input: { role: string; details: string }): Promise<Result<{ id: string }>> {
    const auth = await requirePermission("manage_pipelines")
    if (!auth.ok) return { success: false, error: auth.error }
    const { ctx } = auth
    if (!ctx.can("use_ai")) return { success: false, error: "Your role can't use AI. Ask your company's owner." }
    const role = cleanName(input.role)
    const details = input.details.trim().slice(0, 2000)
    if (role.length < 2) return { success: false, error: "Name the role, like \"Backend engineer (1-3 years)\"." }

    // Past the free daily drafts, a draft costs company credits, refunded if it fails (plan/hiring-app HA-20).
    let charge: string | null = null
    if ((await draftsLeft(ctx.companyId)) <= 0) {
        charge = `pipeline-draft:${crypto.randomUUID()}`
        const paid = await spendCredits(ctx.companyId, EXTRA_CREDIT_COST.pipelineDraft, `AI pipeline draft past today's ${HIRING_AI_LIMITS.pipelineDraftsPerDay} free`, charge, ctx.userId)
        if (!paid.ok) return { success: false, error: `Today's ${HIRING_AI_LIMITS.pipelineDraftsPerDay} free AI drafts are used. ${paid.error}` }
    }
    const refund = () => charge ? refundCredits(ctx.companyId, EXTRA_CREDIT_COST.pipelineDraft, "The AI draft failed", charge) : Promise.resolve()
    await db.insert(companyAiUsage).values({ companyId: ctx.companyId, userId: ctx.userId, kind: "pipeline_draft" })

    let raw: unknown
    try {
        raw = await chatJSON({
            model: modelFor("pipelineDraft"),
            system: DRAFT_SYSTEM,
            user: `Role: ${role}\n\nWhat the company says about it:\n${details || "(nothing more)"}`,
            maxTokens: 1500,
        })
    } catch (error: unknown) {
        await refund()
        return { success: false, error: error instanceof AiUnavailableError ? error.message : "The AI couldn't draft this. Try again." }
    }

    const draft = normalisePipelineDraft(raw, role)
    if (!draft) { await refund(); return { success: false, error: "The AI's draft didn't have usable rounds. Try again with a little more about the role." } }

    const created = await createPipeline({ name: draft.name })
    if (!created.success) { await refund(); return created }
    const saved = await savePipeline(created.data.id, draft)
    if (!saved.success) {
        // A draft that fails the builder's own checks is not left half-made.
        await db.delete(interviewProcesses).where(and(eq(interviewProcesses.id, created.data.id), eq(interviewProcesses.companyId, ctx.companyId)))
        await refund()
        return { success: false, error: `The AI's draft needs a change the builder won't make on its own (${saved.error}). Try again.` }
    }
    return { success: true, data: { id: created.data.id } }
}
