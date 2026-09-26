"use server"

import crypto from "crypto"
import { and, asc, count, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getSession } from "@repo/auth"
import {
    db, aptitudeQuestions, companies, designPrompts, hiringAttempts, hiringRoundPoolItems, hiringRuns, hiringSends, importedJobs, interviewProcesses, interviewRounds, jobs, users,
    type HiringAttemptIntegrity, type VoiceTurn,
    jobPractisable,
} from "@repo/db"
import { reserveCredits, releaseCredits } from "@/lib/credits/hold"
import { priceOf } from "@/lib/credits/pricing"
import { roundStates, type RoundState } from "@/lib/hiring/round-state"
import {
    PRICE_FOR, RUNNABLE_TYPES, closeAttempt, closeIfExpired, drawItems, mergeIntegrity, scoreAptitude, scoreSubmitted,
    type AptitudeBreakdownItem, type DrawnItem,
} from "@/lib/hiring/runs"
import type { DesignRubricResult, RubricCriterion } from "@/lib/hiring/design"
import { progressVoiceRound } from "@/lib/voice/score"
import { sendState } from "@/lib/hiring/send"
import { loadVoiceSession } from "@/lib/voice/session"
import { DSA_RUNS_PER_ATTEMPT, loadDsaProblems, runSamples, type DsaBreakdownItem, type DsaProblem } from "@/lib/hiring/dsa"
import type { PracticeJudgeResult } from "@/types/practice"

/*
 * Taking a pipeline's rounds (plan/hiring-rounds HR-13). A run is one student's
 * pass through one pipeline: a job's, or, from a company page, one of
 * ShipItHQ's for practice, or one built from a job a student imported
 * (plan/job-import JI-7). Each attempt draws its questions, holds its credits
 * and runs on the server's clock.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

const VOICE_TYPES = new Set(["VOICE_BEHAVIOURAL", "VOICE_CULTURE"])

async function userId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

export interface OverviewRound {
    id: string
    number: number
    type: string
    title: string
    description: string
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    timeLimitMinutes: number
    drawCount: number
    cooldownHours: number
    price: number
    /** The round type's runner is built; the rest show "coming soon". */
    runnable: boolean
    /** Its pool holds an item written by AI for an imported job and not reviewed yet (plan/job-import). */
    aiWritten: boolean
}

export interface RoundsOverview {
    context: { kind: "job"; jobSlug: string; jobTitle: string; companyName: string; companySlug: string }
        | { kind: "practice"; companySlug: string; companyName: string; processId: string }
        /** An imported job's pipeline. `companyHref`: its company page, or the holding page while it's under review. */
        /** `companyVersion`: the company adopted it or put its own pipeline in its place (JI-9). */
        | { kind: "import"; importId: string; jobTitle: string; companyName: string; companyHref: string | null; pending: boolean; companyVersion: boolean }
    pipelineName: string
    byShipItHQ: boolean
    rounds: OverviewRound[]
    run: { id: string; status: string } | null
    states: RoundState[]
    /** Job rounds only: where sending the results stands (HR-17). */
    send?: SendSummary | null
}

/** One line for the rounds page: send, sent (withdraw), send an identical run's results, or why not. */
export type SendSummary =
    | { state: "ready"; reusedFrom: string | null; declinedFeedback: string | null }
    | { state: "sent"; sendId: string; status: string; sentAt: string }
    | { state: "invited"; sendId: string; contact: { name: string; email: string } | null; companyOutcome: string | null; studentOutcome: string | null; message: string | null }
    | { state: "declined"; feedback: string | null; at: string; message: string }
    | { state: "blocked"; message: string }

async function roundsOf(processId: string): Promise<OverviewRound[]> {
    const rows = await db.select().from(interviewRounds).where(eq(interviewRounds.processId, processId)).orderBy(asc(interviewRounds.roundNumber))
    const drafts = rows.length
        ? await db.selectDistinct({ roundId: hiringRoundPoolItems.roundId }).from(hiringRoundPoolItems)
            .where(and(inArray(hiringRoundPoolItems.roundId, rows.map((r) => r.id)), eq(hiringRoundPoolItems.status, "DRAFT")))
        : []
    return rows.map((r) => ({
        id: r.id,
        number: r.roundNumber,
        type: r.roundType,
        title: r.title,
        description: r.description,
        gateMode: r.gateMode,
        passMark: r.passMark,
        timeLimitMinutes: r.timeLimitMinutes ?? r.durationMinutes ?? 30,
        drawCount: r.drawCount,
        cooldownHours: r.cooldownHours,
        price: PRICE_FOR[r.roundType] ? priceOf(PRICE_FOR[r.roundType]!) : 0,
        runnable: RUNNABLE_TYPES.has(r.roundType),
        aiWritten: drafts.some((d) => d.roundId === r.id),
    }))
}

async function overviewFor(uid: string | null, processId: string, where: { jobId: string } | { practice: true }) {
    const rounds = await roundsOf(processId)
    const run = uid
        ? await db.query.hiringRuns.findFirst({
            where: and(
                eq(hiringRuns.userId, uid),
                eq(hiringRuns.processId, processId),
                "jobId" in where ? eq(hiringRuns.jobId, where.jobId) : isNull(hiringRuns.jobId),
                inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"]),
            ),
            orderBy: (t, { desc }) => [desc(t.startedAt)],
        })
        : null
    const attempts = run ? await db.select().from(hiringAttempts).where(eq(hiringAttempts.runId, run.id)) : []
    // An attempt past its end is closed on read, so the states are current.
    for (const a of attempts) {
        const type = rounds.find((r) => r.id === a.roundId)?.type
        if (type && (await closeIfExpired(a, type))) {
            const [fresh] = await db.select().from(hiringAttempts).where(eq(hiringAttempts.id, a.id))
            if (fresh) Object.assign(a, fresh)
        }
    }
    return {
        rounds,
        run: run ? { id: run.id, status: run.status } : null,
        states: roundStates(rounds.map((r) => ({ id: r.id, gateMode: r.gateMode, passMark: r.passMark, cooldownHours: r.cooldownHours })), attempts),
    }
}

/** A job's rounds, and where the signed-in student stands on them. */
export async function getJobRounds(jobSlug: string): Promise<Result<RoundsOverview>> {
    try {
        const job = await db.query.jobs.findFirst({
            // A closed job's rounds stay open for practice (DoD 18); sending says why not.
            where: and(eq(jobs.slug, jobSlug), jobPractisable),
            with: { company: { columns: { name: true, slug: true } } },
        })
        if (!job) return { success: false, error: "That job isn't open." }
        if (!job.interviewProcessId) return { success: false, error: "This job has no rounds yet." }
        const process = await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, job.interviewProcessId), columns: { name: true } })
        const uid = await userId()
        const o = await overviewFor(uid, job.interviewProcessId, { jobId: job.id })
        return {
            success: true,
            data: {
                context: { kind: "job", jobSlug: job.slug, jobTitle: job.title, companyName: job.company.name, companySlug: job.company.slug },
                pipelineName: process?.name ?? "Rounds",
                byShipItHQ: false,
                ...o,
                send: uid ? await sendSummary(uid, job.slug) : null,
            },
        }
    } catch (error: unknown) {
        console.error("getJobRounds:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the rounds" }
    }
}

/** Practice from a company page, on one of ShipItHQ's pipelines (HR-4, HR-9). */
export async function getPracticeRounds(companySlug: string, processId: string): Promise<Result<RoundsOverview>> {
    try {
        const [company, process] = await Promise.all([
            db.query.companies.findFirst({ where: and(eq(companies.slug, companySlug), isNull(companies.suspendedAt)), columns: { id: true, name: true, slug: true } }),
            db.query.interviewProcesses.findFirst({ where: and(eq(interviewProcesses.id, processId), eq(interviewProcesses.ownerKind, "PLATFORM"), eq(interviewProcesses.isTemplate, true)) }),
        ])
        if (!company || !process) return { success: false, error: "That practice pipeline doesn't exist." }
        const o = await overviewFor(await userId(), process.id, { practice: true })
        return {
            success: true,
            data: {
                context: { kind: "practice", companySlug: company.slug, companyName: company.name, processId: process.id },
                pipelineName: process.name,
                byShipItHQ: true,
                ...o,
            },
        }
    } catch (error: unknown) {
        console.error("getPracticeRounds:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the rounds" }
    }
}

/**
 * An imported job this viewer may practise (public, or their own private one,
 * built) and the pipeline to practise: the company's own once it adopted or
 * replaced it (JI-9), else the one built from the posting.
 */
async function practisableImport(importId: string, uid: string | null) {
    const row = await db.query.importedJobs.findFirst({ where: eq(importedJobs.id, importId) })
    if (!row || row.status !== "READY" || !row.processId) return null
    if (row.visibility === "PRIVATE" && row.ownerId !== uid) return null
    return { ...row, practiceProcessId: row.companyProcessId ?? row.processId }
}

/** An imported job's rounds (plan/job-import JI-7), and where the signed-in student stands on them. */
export async function getImportRounds(importId: string): Promise<Result<RoundsOverview>> {
    try {
        const uid = await userId()
        const row = await practisableImport(importId, uid)
        if (!row) return { success: false, error: "That job isn't ready to practise." }
        const [company, process] = await Promise.all([
            row.companyId ? db.query.companies.findFirst({ where: and(eq(companies.id, row.companyId), isNull(companies.suspendedAt)), columns: { name: true, slug: true } }) : null,
            db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, row.practiceProcessId), columns: { name: true } }),
        ])
        const o = await overviewFor(uid, row.practiceProcessId, { practice: true })
        return {
            success: true,
            data: {
                context: {
                    kind: "import",
                    importId: row.id,
                    jobTitle: row.extracted?.title ?? "Imported job",
                    companyName: company?.name ?? row.extracted?.company.name ?? row.companyNameHint ?? "the company",
                    companyHref: company ? `/companies/${company.slug}` : row.companyRequestId ? `/companies/pending/${row.companyRequestId}` : null,
                    pending: !company,
                    companyVersion: Boolean(row.companyProcessId),
                },
                pipelineName: process?.name ?? "Rounds",
                byShipItHQ: true,
                ...o,
            },
        }
    } catch (error: unknown) {
        console.error("getImportRounds:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the rounds" }
    }
}

/**
 * Start (or return) the student's run, then an attempt at `roundId`. Returns
 * the attempt to open in the runner.
 */
export async function startRound(input: { jobSlug: string } | { companySlug: string; processId: string } | { importId: string }, roundId: string): Promise<Result<{ attemptId: string }>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Sign in to take the rounds.", code: "UNAUTHORIZED" }
    try {
        // Resolve the pipeline this run is for.
        let processId: string
        let jobId: string | null = null
        let companyId: string | null
        if ("importId" in input) {
            const row = await practisableImport(input.importId, uid)
            if (!row) return { success: false, error: "That job isn't ready to practise." }
            processId = row.practiceProcessId
            companyId = row.companyId
        } else if ("jobSlug" in input) {
            const job = await db.query.jobs.findFirst({ where: and(eq(jobs.slug, input.jobSlug), jobPractisable), columns: { id: true, companyId: true, interviewProcessId: true } })
            if (!job?.interviewProcessId) return { success: false, error: "That job isn't open." }
            processId = job.interviewProcessId
            jobId = job.id
            companyId = job.companyId
        } else {
            const [company, process] = await Promise.all([
                db.query.companies.findFirst({ where: and(eq(companies.slug, input.companySlug), isNull(companies.suspendedAt)), columns: { id: true } }),
                db.query.interviewProcesses.findFirst({ where: and(eq(interviewProcesses.id, input.processId), eq(interviewProcesses.ownerKind, "PLATFORM")), columns: { id: true } }),
            ])
            if (!company || !process) return { success: false, error: "That practice pipeline doesn't exist." }
            processId = process.id
            companyId = company.id
        }

        const round = await db.query.interviewRounds.findFirst({ where: and(eq(interviewRounds.id, roundId), eq(interviewRounds.processId, processId)) })
        if (!round) return { success: false, error: "That round isn't part of this pipeline." }
        if (!RUNNABLE_TYPES.has(round.roundType)) return { success: false, error: "This round type opens soon." }

        // The run: the live one, or a new one (the partial unique index settles two tabs).
        const runWhere = and(eq(hiringRuns.userId, uid), eq(hiringRuns.processId, processId), jobId ? eq(hiringRuns.jobId, jobId) : isNull(hiringRuns.jobId), inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"]))
        let run = await db.query.hiringRuns.findFirst({ where: runWhere, orderBy: (t, { desc }) => [desc(t.startedAt)] })
        if (!run) {
            const [created] = await db.insert(hiringRuns).values({ userId: uid, jobId, companyId, processId }).onConflictDoNothing().returning()
            run = created ?? (await db.query.hiringRuns.findFirst({ where: runWhere }))
        }
        if (!run) return { success: false, error: "Could not start the rounds. Try again." }

        // Where the student stands, with any expired attempt closed first.
        const rounds = await roundsOf(processId)
        const attempts = await db.select().from(hiringAttempts).where(eq(hiringAttempts.runId, run.id))
        for (const a of attempts) {
            const type = rounds.find((r) => r.id === a.roundId)?.type
            if (type && (await closeIfExpired(a, type))) Object.assign(a, (await db.select().from(hiringAttempts).where(eq(hiringAttempts.id, a.id)))[0] ?? {})
        }
        const state = roundStates(rounds.map((r) => ({ id: r.id, gateMode: r.gateMode, passMark: r.passMark, cooldownHours: r.cooldownHours })), attempts)
            .find((s) => s.roundId === roundId)!
        if (state.status === "in_progress" && state.liveAttemptId) return { success: true, data: { attemptId: state.liveAttemptId } }
        if (state.status === "locked") return { success: false, error: "Clear the round before this one first." }
        if (state.status === "cooling_down" || (state.status === "cleared" && !state.canRetake)) {
            const when = state.availableAt?.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
            return { success: false, error: `You can try this round again${when ? ` from ${when}` : " later"}.`, code: "COOLING_DOWN" }
        }

        // Draw, hold, and open the attempt. The hold id is the attempt id.
        // Voice rounds have no pool: the interviewer's brief is the round itself.
        const drawn = VOICE_TYPES.has(round.roundType) ? [] : await drawItems(round.id, round.roundType, uid, round.drawCount).catch((e: unknown) => {
            if (e instanceof Error && e.message === "POOL_TOO_SMALL") return null
            throw e
        })
        if (!drawn) return { success: false, error: "This round doesn't have enough questions yet. The company has been told." }
        const attemptId = crypto.randomUUID()
        const price = PRICE_FOR[round.roundType] ? priceOf(PRICE_FOR[round.roundType]!) : 0
        if (price > 0) {
            const hold = await reserveCredits({ userId: uid, amount: price, reason: `Hiring round: ${round.title}`, holdId: attemptId })
            if (!hold.ok) return { success: false, error: hold.code === "INSUFFICIENT_CREDITS" ? `This round costs ${price} credits; you have ${hold.available ?? 0}.` : hold.error, code: hold.code }
        }
        const minutes = round.timeLimitMinutes ?? round.durationMinutes ?? 30
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(hiringAttempts).where(and(eq(hiringAttempts.runId, run.id), eq(hiringAttempts.roundId, round.id)))
        const [attempt] = await db.insert(hiringAttempts).values({
            id: attemptId,
            runId: run.id,
            roundId: round.id,
            attemptNumber: Number(n) + 1,
            drawnItems: drawn,
            endsAt: new Date(Date.now() + minutes * 60_000),
            creditsHeld: price,
        }).onConflictDoNothing().returning({ id: hiringAttempts.id })
        if (!attempt) {
            // Another tab opened this round a moment ago: give the credits back and join it.
            if (price > 0) await releaseCredits(attemptId, "Another attempt was already running")
            const live = await db.query.hiringAttempts.findFirst({ where: and(eq(hiringAttempts.runId, run.id), eq(hiringAttempts.roundId, round.id), eq(hiringAttempts.status, "IN_PROGRESS")), columns: { id: true } })
            return live ? { success: true, data: { attemptId: live.id } } : { success: false, error: "Could not start the round. Try again." }
        }
        revalidatePath("/jobs")
        return { success: true, data: { attemptId: attempt.id } }
    } catch (error: unknown) {
        console.error("startRound:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start the round" }
    }
}

// ── The runner ───────────────────────────────────────────────────────────────

export interface RunnerAttempt {
    id: string
    status: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "NOT_SCORED"
    roundType: string
    roundTitle: string
    roundNumber: number
    roundCount: number
    passMark: number
    gateMode: "HARD" | "ADVISORY"
    /** The server's clock, as ms since the epoch, and the deadline. */
    serverNow: number
    endsAt: number
    backHref: string
    contextLabel: string
    /** Aptitude: the drawn questions, WITHOUT their answers. */
    questions: { id: string; section: string; prompt: string; options: string[] }[]
    /** System design: the drawn prompt and the rubric it's scored against (shown to the student). */
    design: { title: string; prompt: string; rubric: RubricCriterion[] } | null
    /** Voice rounds (plan/voice VO-11): what the live interview needs to resume. */
    voice: { allows: { voice: boolean; typed: boolean }; mode: "VOICE" | "TYPED" | null; consented: boolean; turns: VoiceTurn[] } | null
    /** DSA: the drawn problems with their SAMPLE tests only, and the runs left. */
    problems: DsaProblem[]
    runsLeft: number
    responses: Record<string, unknown>
    result: {
        score: number | null
        breakdown: AptitudeBreakdownItem[] | null
        explanations?: Record<string, string>
        rubric?: DesignRubricResult | null
        dsa?: DsaBreakdownItem[] | null
        notScoredReason?: string
    } | null
}

async function ownAttempt(uid: string, attemptId: string) {
    const [row] = await db.select({ attempt: hiringAttempts, run: hiringRuns }).from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .where(and(eq(hiringAttempts.id, attemptId), eq(hiringRuns.userId, uid)))
    return row ?? null
}

/** Everything the runner shows. Answers are never sent before the attempt is scored. */
export async function getRunnerAttempt(attemptId: string): Promise<Result<RunnerAttempt>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Sign in to take the rounds.", code: "UNAUTHORIZED" }
    try {
        const row = await ownAttempt(uid, attemptId)
        if (!row) return { success: false, error: "That attempt doesn't exist." }
        let { attempt } = row
        const { run } = row
        const round = attempt.roundId ? await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, attempt.roundId) }) : null
        if (!round) return { success: false, error: "This round was removed from the pipeline." }
        if (await closeIfExpired(attempt, round.roundType)) attempt = (await ownAttempt(uid, attemptId))!.attempt

        const roundCount = run.processId ? (await db.select({ id: interviewRounds.id }).from(interviewRounds).where(eq(interviewRounds.processId, run.processId))).length : 1
        const [job, company] = await Promise.all([
            run.jobId ? db.query.jobs.findFirst({ where: eq(jobs.id, run.jobId), columns: { slug: true, title: true } }) : null,
            run.companyId ? db.query.companies.findFirst({ where: eq(companies.id, run.companyId), columns: { slug: true, name: true } }) : null,
        ])
        const imported = !job && run.processId
            // One company pipeline can stand in for several imports (JI-9 Replace): only one this
            // student can see, their own first, so another's private import never shows.
            ? await db.query.importedJobs.findFirst({
                where: and(
                    or(eq(importedJobs.processId, run.processId), eq(importedJobs.companyProcessId, run.processId)),
                    or(eq(importedJobs.visibility, "PUBLIC"), eq(importedJobs.ownerId, uid)),
                ),
                orderBy: (t, { desc: d }) => [d(sql`${t.ownerId} = ${uid}`), d(t.createdAt)],
                columns: { id: true, extracted: true, companyNameHint: true },
            })
            : null
        const backHref = job ? `/jobs/${job.slug}/rounds` : imported ? `/jobs/import/${imported.id}` : company && run.processId ? `/companies/${company.slug}/rounds/${run.processId}` : "/jobs"
        const contextLabel = job
            ? `${job.title}${company ? ` · ${company.name}` : ""}`
            : imported
                ? `${imported.extracted?.title ?? "Imported job"} · ${company?.name ?? imported.extracted?.company.name ?? imported.companyNameHint ?? "practice"}`
                : `${company?.name ?? "Practice"} · practice`

        const drawn = attempt.drawnItems as DrawnItem[]
        let design: RunnerAttempt["design"] = null
        if (round.roundType === "SYSTEM_DESIGN" && drawn[0]) {
            const p = await db.query.designPrompts.findFirst({ where: eq(designPrompts.id, drawn[0].refId), columns: { title: true, prompt: true, rubric: true } })
            if (p) design = { title: p.title, prompt: p.prompt, rubric: p.rubric as RubricCriterion[] }
        }
        const problems = round.roundType === "DSA" ? await loadDsaProblems(drawn.map((d) => d.refId)) : []
        let voice: RunnerAttempt["voice"] = null
        if (VOICE_TYPES.has(round.roundType)) {
            const vs = await loadVoiceSession(uid, { kind: "round", id: attempt.id })
            voice = { allows: vs?.allows ?? { voice: true, typed: true }, mode: vs?.mode ?? null, consented: Boolean(vs?.consentedAt), turns: vs?.turns ?? [] }
        }
        let questions: RunnerAttempt["questions"] = []
        let explanations: Record<string, string> | undefined
        if (round.roundType === "APTITUDE") {
            const ids = drawn.map((d) => d.refId)
            const rows = ids.length ? await db.select({ id: aptitudeQuestions.id, section: aptitudeQuestions.section, prompt: aptitudeQuestions.prompt, options: aptitudeQuestions.options, explanation: aptitudeQuestions.explanation })
                .from(aptitudeQuestions).where(inArray(aptitudeQuestions.id, ids)) : []
            // In the drawn order; never `correctIndex`.
            questions = drawn.map((d) => rows.find((r) => r.id === d.refId)).filter((r): r is NonNullable<typeof r> => Boolean(r))
                .map((r) => ({ id: r.id, section: r.section, prompt: r.prompt, options: r.options }))
            if (attempt.status === "SCORED") explanations = Object.fromEntries(rows.map((r) => [r.id, r.explanation]))
        }
        return {
            success: true,
            data: {
                id: attempt.id,
                status: attempt.status,
                roundType: round.roundType,
                roundTitle: round.title,
                roundNumber: round.roundNumber,
                roundCount,
                passMark: round.passMark,
                gateMode: round.gateMode,
                serverNow: Date.now(),
                endsAt: attempt.endsAt?.getTime() ?? Date.now(),
                backHref,
                contextLabel,
                questions,
                design,
                problems,
                voice,
                runsLeft: Math.max(0, DSA_RUNS_PER_ATTEMPT - (attempt.integrity.judgeRuns ?? 0)),
                responses: attempt.responses,
                result: attempt.status === "SCORED" || attempt.status === "NOT_SCORED"
                    ? {
                        score: attempt.score,
                        breakdown: attempt.status === "SCORED" && round.roundType === "APTITUDE" ? (attempt.breakdown as AptitudeBreakdownItem[]) : null,
                        explanations,
                        rubric: (attempt.aiRubricResult as DesignRubricResult | null) ?? null,
                        dsa: attempt.status === "SCORED" && round.roundType === "DSA" ? (attempt.breakdown as DsaBreakdownItem[]) : null,
                        notScoredReason: attempt.status === "NOT_SCORED" ? String((attempt.breakdown as { notScored?: unknown } | null)?.notScored ?? "") : undefined,
                    }
                    : null,
            },
        }
    } catch (error: unknown) {
        console.error("getRunnerAttempt:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the round" }
    }
}

/**
 * Save answers as the student goes, with integrity events. Refused after
 * `endsAt`: what counts is what was saved in time, by the server's clock.
 */
export async function saveAttempt(attemptId: string, input: { responses: Record<string, unknown>; integrity?: Partial<HiringAttemptIntegrity> }): Promise<Result<{ savedAt: number }>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    try {
        const row = await ownAttempt(uid, attemptId)
        if (!row || row.attempt.status !== "IN_PROGRESS") return { success: false, error: "This attempt has ended." }
        if (row.attempt.endsAt && Date.now() > row.attempt.endsAt.getTime()) return { success: false, error: "Time's up: answers after the timer don't count.", code: "TIME_UP" }
        const size = JSON.stringify(input.responses ?? {}).length
        if (size > 200_000) return { success: false, error: "That answer is too long to save." }
        await db.update(hiringAttempts).set({
            responses: input.responses ?? {},
            respondedAt: new Date(),
            integrity: mergeIntegrity(row.attempt.integrity, input.integrity ?? {}),
        }).where(and(eq(hiringAttempts.id, attemptId), eq(hiringAttempts.status, "IN_PROGRESS")))
        return { success: true, data: { savedAt: Date.now() } }
    } catch (error: unknown) {
        console.error("saveAttempt:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save" }
    }
}

/** Hand the attempt in and score it (aptitude scores at once, HR-14). */
export async function submitAttempt(attemptId: string, input: { responses: Record<string, unknown>; integrity?: Partial<HiringAttemptIntegrity> }): Promise<Result<{ score: number | null }>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    try {
        const row = await ownAttempt(uid, attemptId)
        if (!row) return { success: false, error: "That attempt doesn't exist." }
        if (row.attempt.status !== "IN_PROGRESS") return { success: true, data: { score: row.attempt.score } }
        // In time: take the final answers. Late: score what was saved before the end.
        // A voice round's answers are saved by the interview itself, never sent here.
        const inTime = !row.attempt.endsAt || Date.now() <= row.attempt.endsAt.getTime() + 5_000
        const round0 = row.attempt.roundId ? await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, row.attempt.roundId), columns: { roundType: true } }) : null
        const isVoice = Boolean(round0 && VOICE_TYPES.has(round0.roundType))
        const responses = inTime && !isVoice ? (input.responses ?? {}) : row.attempt.responses
        await db.update(hiringAttempts).set({
            responses,
            respondedAt: inTime ? new Date() : row.attempt.respondedAt,
            integrity: mergeIntegrity(row.attempt.integrity, input.integrity ?? {}),
            submittedAt: new Date(),
        }).where(eq(hiringAttempts.id, attemptId))
        const round = row.attempt.roundId ? await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, row.attempt.roundId), columns: { roundType: true } }) : null
        if (round?.roundType === "APTITUDE") {
            const { score, breakdown } = await scoreAptitude(row.attempt.drawnItems as DrawnItem[], responses)
            await closeAttempt(attemptId, { score, breakdown })
            revalidatePath("/jobs")
            return { success: true, data: { score } }
        }
        if (round?.roundType === "SYSTEM_DESIGN") {
            // Handed in, then scored inline against the rubric (25 s; a failure refunds).
            await db.update(hiringAttempts).set({ status: "SUBMITTED" }).where(and(eq(hiringAttempts.id, attemptId), eq(hiringAttempts.status, "IN_PROGRESS")))
            await scoreSubmitted(attemptId)
            const [done] = await db.select({ score: hiringAttempts.score }).from(hiringAttempts).where(eq(hiringAttempts.id, attemptId))
            revalidatePath("/jobs")
            return { success: true, data: { score: done?.score ?? null } }
        }
        if (round && VOICE_TYPES.has(round.roundType)) {
            // Handed in; the runner's Scoring view dispatches and follows the scoring job (plan/voice VO-9).
            await db.update(hiringAttempts).set({ status: "SUBMITTED" }).where(and(eq(hiringAttempts.id, attemptId), eq(hiringAttempts.status, "IN_PROGRESS")))
            revalidatePath("/jobs")
            return { success: true, data: { score: null } }
        }
        if (round?.roundType === "DSA") {
            // Handed in; the runner then asks for the judge (`finishScoring`), so a
            // slow judge is a retry, never a lost submission.
            await db.update(hiringAttempts).set({ status: "SUBMITTED" }).where(and(eq(hiringAttempts.id, attemptId), eq(hiringAttempts.status, "IN_PROGRESS")))
            revalidatePath("/jobs")
            return { success: true, data: { score: null } }
        }
        return { success: false, error: "This round type can't be submitted yet." }
    } catch (error: unknown) {
        console.error("submitAttempt:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not submit" }
    }
}

/**
 * Finish scoring a handed-in attempt: one whose timer ran out while the student
 * was away (HR-16), a DSA hand-in waiting on the judge (HR-15), or a voice round
 * waiting on its scoring job (plan/voice VO-9). The runner's Scoring view calls
 * this until the status moves on.
 */
export async function finishScoring(attemptId: string): Promise<Result<{ status: RunnerAttempt["status"] }>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    try {
        const row = await ownAttempt(uid, attemptId)
        if (!row) return { success: false, error: "That attempt doesn't exist." }
        if (row.attempt.status === "SUBMITTED") {
            const round = row.attempt.roundId ? await db.query.interviewRounds.findFirst({ where: eq(interviewRounds.id, row.attempt.roundId), columns: { roundType: true } }) : null
            if (round && VOICE_TYPES.has(round.roundType)) await progressVoiceRound(uid, attemptId)
            else await scoreSubmitted(attemptId)
        }
        const [now] = await db.select({ status: hiringAttempts.status }).from(hiringAttempts).where(eq(hiringAttempts.id, attemptId))
        revalidatePath("/jobs")
        return { success: true, data: { status: now?.status ?? row.attempt.status } }
    } catch (error: unknown) {
        console.error("finishScoring:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not score the attempt" }
    }
}

/**
 * Run one drawn problem's sample tests during a live DSA round (HR-15). Hidden
 * tests only run when the attempt is handed in. Capped per attempt.
 */
export async function runRoundCode(attemptId: string, input: { problemId: string; language: string; code: string }): Promise<PracticeJudgeResult> {
    const fail = (message: string): PracticeJudgeResult => ({ status: "unavailable", kind: "run", language: input.language, message })
    const uid = await userId()
    if (!uid) return fail("Sign in to run your code.")
    if (typeof input.code !== "string" || !input.code.trim()) return fail("Write some code first.")
    if (input.code.length > 50_000) return fail("That is too much code for one solution.")
    try {
        const row = await ownAttempt(uid, attemptId)
        if (!row || row.attempt.status !== "IN_PROGRESS") return fail("This attempt has ended.")
        if (row.attempt.endsAt && Date.now() > row.attempt.endsAt.getTime()) return fail("Time's up.")
        if (!(row.attempt.drawnItems as DrawnItem[]).some((d) => d.refId === input.problemId)) return fail("That problem isn't part of this round.")
        // Count the run first, and only while under the cap, so parallel clicks can't overrun it.
        const [counted] = await db.update(hiringAttempts)
            .set({ integrity: sql`jsonb_set(${hiringAttempts.integrity}, '{judgeRuns}', to_jsonb(coalesce((${hiringAttempts.integrity}->>'judgeRuns')::int, 0) + 1))` })
            .where(and(
                eq(hiringAttempts.id, attemptId),
                eq(hiringAttempts.status, "IN_PROGRESS"),
                sql`coalesce((${hiringAttempts.integrity}->>'judgeRuns')::int, 0) < ${DSA_RUNS_PER_ATTEMPT}`,
            ))
            .returning({ id: hiringAttempts.id })
        if (!counted) return fail(`You've used all ${DSA_RUNS_PER_ATTEMPT} test runs for this attempt. Your code is still judged when you submit.`)
        return await runSamples(input.problemId, input.language, input.code)
    } catch (error: unknown) {
        console.error("runRoundCode:", error instanceof Error ? error.message : error)
        return fail("The code runner is unavailable. Try again in a moment.")
    }
}

/**
 * Leave a voice round at the consent step (plan/voice VO-11): nothing was
 * recorded, so it closes as not scored and the credits come straight back. Not
 * scored has no cool-down, so it can be started again at once.
 */
export async function declineVoiceRound(attemptId: string): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    try {
        const vs = await loadVoiceSession(uid, { kind: "round", id: attemptId })
        if (!vs) return { success: false, error: "That attempt doesn't exist." }
        if (vs.consentedAt) return { success: false, error: "The interview has started; end it to hand it in." }
        await closeAttempt(attemptId, { notScored: "Recording consent wasn't given" })
        revalidatePath("/jobs")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("declineVoiceRound:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not leave the round" }
    }
}

async function sendSummary(uid: string, jobSlug: string): Promise<SendSummary | null> {
    const st = await sendState(uid, jobSlug)
    if (!st) return null
    if (st.activeSend?.status === "INVITED") {
        const send = await db.query.hiringSends.findFirst({ where: eq(hiringSends.id, st.activeSend.id), columns: { decidedByUserId: true, companyOutcome: true, studentOutcome: true, companyMessage: true } })
        const [inviter] = send?.decidedByUserId ? await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, send.decidedByUserId)) : []
        return {
            state: "invited", sendId: st.activeSend.id,
            contact: inviter ? { name: inviter.name ?? "The hiring team", email: inviter.email } : null,
            companyOutcome: send?.companyOutcome ?? null, studentOutcome: send?.studentOutcome ?? null, message: send?.companyMessage ?? null,
        }
    }
    if (st.activeSend) return { state: "sent", sendId: st.activeSend.id, status: st.activeSend.status, sentAt: st.activeSend.sentAt }
    // Declined, and nothing new to send yet: the feedback, and what to do next.
    const retake = st.blocks.find((b) => b.code === "NEEDS_RETAKE")
    if (st.declined && retake) return { state: "declined", feedback: st.declined.feedback, at: st.declined.at, message: retake.message }
    // A company that can't receive results is said up front, before any round is taken.
    const company = st.blocks.find((b) => b.code === "COMPANY")
    if (company) return { state: "blocked", message: company.message }
    // A closed role is practice only, said before any round too (DoD 18).
    const closed = st.blocks.find((b) => b.code === "JOB_CLOSED")
    if (closed) return { state: "blocked", message: closed.message }
    // Otherwise nothing to say until there's a run, or an identical one from another role.
    if (!st.run) return null
    if (st.blocks.length) {
        // Still working through the rounds: the round list already says what's next.
        if (st.blocks.every((b) => b.code === "INCOMPLETE") && !st.run.reusedFrom) return null
        return { state: "blocked", message: st.blocks[0]!.message }
    }
    return { state: "ready", reusedFrom: st.run.reusedFrom?.jobTitle ?? null, declinedFeedback: st.declined ? (st.declined.feedback ?? "") : null }
}
