import "server-only"
import { and, asc, count, eq, inArray } from "drizzle-orm"
import { db, hiringRoundPoolItems, hiringRuns, interviewProcesses, interviewRounds, type TxClient } from "@repo/db"
import { POOLED_TYPES, roundProblems, type RoundDraft } from "@/types/pipeline"

/*
 * Pipeline copying and readiness, shared by the builder (HR-10) and jobs
 * (HR-12). Server-only on purpose: an async export of a "use server" file is
 * callable from the browser with any arguments, and these take a transaction
 * and raw ids.
 */

type Reader = typeof db | TxClient

/** Copy every round of `fromId`, pool included, onto `toId`. */
export async function copyRounds(tx: TxClient, fromId: string, toId: string): Promise<void> {
    const rounds = await tx.select().from(interviewRounds).where(eq(interviewRounds.processId, fromId)).orderBy(asc(interviewRounds.roundNumber))
    for (const r of rounds) {
        const { id: _id, processId: _p, createdAt: _c, updatedAt: _u, ...rest } = r
        const [copy] = await tx.insert(interviewRounds).values({ ...rest, processId: toId, updatedAt: new Date() }).returning({ id: interviewRounds.id })
        // `status` too: an AI-written item from an imported job stays labelled in a copy (plan/job-import JI-9).
        const items = await tx.select({ kind: hiringRoundPoolItems.kind, refId: hiringRoundPoolItems.refId, weight: hiringRoundPoolItems.weight, status: hiringRoundPoolItems.status })
            .from(hiringRoundPoolItems).where(eq(hiringRoundPoolItems.roundId, r.id))
        for (let i = 0; i < items.length; i += 200) {
            await tx.insert(hiringRoundPoolItems).values(items.slice(i, i + 200).map((it) => ({ ...it, roundId: copy!.id }))).onConflictDoNothing()
        }
    }
}

/**
 * A job's own copy of a pipeline (HR-12, "copy when chosen"): not a template,
 * owned by the job, remembering the template it came from.
 */
export async function createJobCopy(tx: TxClient, input: { sourceId: string; companyId: string; jobId: string }): Promise<string> {
    const source = await tx.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, input.sourceId) })
    if (!source) throw new Error("PIPELINE_SOURCE_MISSING")
    const [copy] = await tx.insert(interviewProcesses).values({
        companyId: input.companyId,
        ownerKind: "COMPANY",
        isTemplate: false,
        // A copy of a copy (a fork) still points at the template the job started from.
        sourceTemplateId: source.isTemplate ? source.id : source.sourceTemplateId,
        jobId: input.jobId,
        name: source.name,
        description: source.description,
        estimatedDurationWeeks: source.estimatedDurationWeeks,
        isActive: true,
        updatedAt: new Date(),
    }).returning({ id: interviewProcesses.id })
    await copyRounds(tx, source.id, copy!.id)
    return copy!.id
}

/** How many candidates' runs use this pipeline: a copy with runs is never edited in place. */
export async function runsUsing(reader: Reader, processId: string): Promise<number> {
    const [{ n } = { n: 0 }] = await reader.select({ n: count() }).from(hiringRuns).where(eq(hiringRuns.processId, processId))
    return Number(n)
}

/**
 * What stops a pipeline from being used by a published job: no rounds, a legacy
 * round type, a pool smaller than its draw, or any other rule the builder
 * checks. Empty means ready.
 */
export async function pipelineReadiness(processId: string): Promise<string[]> {
    const rounds = await db.select().from(interviewRounds).where(eq(interviewRounds.processId, processId)).orderBy(asc(interviewRounds.roundNumber))
    if (rounds.length === 0) return ["The pipeline has no rounds."]
    const pools = await db.select({ roundId: hiringRoundPoolItems.roundId, n: count() }).from(hiringRoundPoolItems)
        .where(inArray(hiringRoundPoolItems.roundId, rounds.map((r) => r.id))).groupBy(hiringRoundPoolItems.roundId)
    const problems: string[] = []
    for (const r of rounds) {
        const draft: RoundDraft = {
            roundType: r.roundType,
            title: r.title,
            description: r.description,
            gateMode: r.gateMode,
            passMark: r.passMark,
            timeLimitMinutes: r.timeLimitMinutes ?? r.durationMinutes ?? 0,
            drawCount: r.drawCount,
            cooldownHours: r.cooldownHours,
            responseMode: r.responseMode,
            rubric: Array.isArray(r.rubric) ? (r.rubric as RoundDraft["rubric"]) : null,
            mockKnowledgeBase: r.mockKnowledgeBase,
        }
        const pooled = (POOLED_TYPES as readonly string[]).includes(r.roundType)
        const size = pooled ? Number(pools.find((p) => p.roundId === r.id)?.n ?? 0) : null
        const found = roundProblems(draft, size)
        if (found.length) problems.push(`Round ${r.roundNumber} (${r.title}): ${found[0]}`)
    }
    return problems
}

/** A template this company may start a job from: its own, or ShipItHQ's. */
export async function isUsableTemplate(companyId: string, templateId: string): Promise<boolean> {
    const t = await db.query.interviewProcesses.findFirst({
        where: and(eq(interviewProcesses.id, templateId), eq(interviewProcesses.isTemplate, true), eq(interviewProcesses.isActive, true)),
        columns: { companyId: true, ownerKind: true },
    })
    return Boolean(t && (t.ownerKind === "PLATFORM" || t.companyId === companyId))
}
