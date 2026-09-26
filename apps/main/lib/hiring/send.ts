import "server-only"
import crypto from "crypto"
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm"
import {
    db, companies, hiringAttempts, hiringRoundPoolItems, hiringRuns, hiringSends, interviewProcesses, interviewRounds, jobs,
    knowMeProfiles, portfolioProjects, projectsV2, resumeDraft, socialLinks, userEducations, users,
    type HiringAttemptIntegrity, type VoiceTurn, type SentProfile, type SnapshotRound, type SendSnapshot,
} from "@repo/db"
import { companyTrust } from "@/lib/company-trust"
import { roundStates, runComplete, type RoundState } from "@/lib/hiring/round-state"
import { knowMeProfileUrl, publicProfileUrl, resumeShareUrl, absoluteUrl } from "@/lib/urls"

export type { SentProfile, SnapshotRound, SendSnapshot }

/*
 * Sending a run to a company (plan/hiring-rounds HR-17). Server-only: these take
 * ids the caller has checked. What leaves is a SNAPSHOT: a copy of the chosen
 * attempts and profile at the moment of consent, so a later retake or profile
 * edit never changes what the company saw. The student's email is never in it.
 */

export const MAX_PROJECTS = 3
/** Withdrawn and declined snapshots are deleted after this (overview, "Retention"). */
export const RETENTION_DAYS = 90
export const SEND_CONSENT_TEXT = (company: string) =>
    `I agree to share these round results, my name, headline and education, and the links I chose with ${company}. My email stays private until ${company} invites me. I can withdraw this send at any time.`

type Round = typeof interviewRounds.$inferSelect
type Attempt = typeof hiringAttempts.$inferSelect

// ── The pipeline's fingerprint ───────────────────────────────────────────────

/**
 * A hash of what a pipeline asks: its rounds in order, their settings, and
 * their pools. Two pipelines with the same hash are the same test, so a
 * completed run of one can be sent for the other (HR-17, reuse). Ids and names
 * that don't change the test are left out.
 */
export async function pipelineHash(processId: string): Promise<string> {
    const rounds = await db.select().from(interviewRounds).where(eq(interviewRounds.processId, processId)).orderBy(asc(interviewRounds.roundNumber))
    const pools = rounds.length
        ? await db.select({ roundId: hiringRoundPoolItems.roundId, kind: hiringRoundPoolItems.kind, refId: hiringRoundPoolItems.refId })
            .from(hiringRoundPoolItems).where(inArray(hiringRoundPoolItems.roundId, rounds.map((r) => r.id)))
        : []
    const shape = rounds.map((r) => ({
        type: r.roundType,
        gate: r.gateMode,
        pass: r.passMark,
        minutes: r.timeLimitMinutes ?? r.durationMinutes ?? null,
        draw: r.drawCount,
        mode: r.responseMode,
        rubric: r.rubric ?? null,
        brief: r.mockKnowledgeBase ?? null,
        pool: pools.filter((p) => p.roundId === r.id).map((p) => `${p.kind}:${p.refId}`).sort(),
    }))
    return crypto.createHash("sha256").update(JSON.stringify(shape)).digest("hex")
}

// ── What can be sent ─────────────────────────────────────────────────────────

export interface EligibleAttempt {
    id: string
    /** 1-based, among this student's attempts at the round in this run. */
    number: number
    score: number
    passed: boolean
    at: string
}

export interface SendRound {
    id: string
    number: number
    title: string
    type: string
    gateMode: "HARD" | "ADVISORY"
    passMark: number
    attempts: EligibleAttempt[]
    /** The latest attempt that clears the round (HARD: at or above the mark). */
    defaultAttemptId: string | null
    /** How many attempts the student made at this round in total. */
    attemptCount: number
}

export interface SendState {
    job: { id: string; slug: string; title: string; status: string }
    company: { id: string; name: string; slug: string }
    /** The run that would be sent, and whether it was taken for another role (reuse). */
    run: { id: string; reusedFrom: { jobTitle: string; jobSlug: string } | null } | null
    rounds: SendRound[]
    /** Why a send can't go now; empty when it can. The profile gate is separate. */
    blocks: { code: "COMPANY" | "JOB_CLOSED" | "NO_RUN" | "INCOMPLETE" | "ALREADY_SENT" | "NEEDS_RETAKE"; message: string }[]
    activeSend: { id: string; status: string; sentAt: string } | null
    /** The latest declined send for this role, with its feedback (HR-19). */
    declined: { id: string; feedback: string | null; at: string } | null
}

/** A run's rounds, attempts and states, oldest attempt first. */
async function runRounds(runId: string, processId: string) {
    const rounds = await db.select().from(interviewRounds).where(eq(interviewRounds.processId, processId)).orderBy(asc(interviewRounds.roundNumber))
    const attempts = await db.select().from(hiringAttempts).where(eq(hiringAttempts.runId, runId)).orderBy(asc(hiringAttempts.startedAt))
    const states = roundStates(rounds.map((r) => ({ id: r.id, gateMode: r.gateMode, passMark: r.passMark, cooldownHours: r.cooldownHours })), attempts)
    return { rounds, attempts, states }
}

function sendRounds(rounds: Round[], attempts: Attempt[]): SendRound[] {
    return rounds.map((r) => {
        const mine = attempts.filter((a) => a.roundId === r.id)
        const eligible = mine
            .map((a, i) => ({ a, number: i + 1 }))
            .filter(({ a }) => a.status === "SCORED" && a.score !== null)
            .map(({ a, number }) => ({
                id: a.id,
                number,
                score: a.score!,
                passed: r.gateMode === "HARD" ? a.score! >= r.passMark : true,
                at: (a.submittedAt ?? a.startedAt).toISOString(),
            }))
        const passing = eligible.filter((e) => e.passed)
        return {
            id: r.id,
            number: r.roundNumber,
            title: r.title,
            type: r.roundType,
            gateMode: r.gateMode,
            passMark: r.passMark,
            attempts: eligible,
            defaultAttemptId: passing.at(-1)?.id ?? null,
            attemptCount: mine.length,
        }
    })
}

/** A COMPLETE run of this student for another role at the same company with an identical pipeline. */
async function reusableRun(userId: string, job: { id: string; companyId: string }, processId: string) {
    const others = await db.select({ run: hiringRuns, jobTitle: jobs.title, jobSlug: jobs.slug })
        .from(hiringRuns).innerJoin(jobs, eq(jobs.id, hiringRuns.jobId))
        .where(and(eq(hiringRuns.userId, userId), eq(hiringRuns.status, "COMPLETE"), eq(jobs.companyId, job.companyId), ne(hiringRuns.jobId, job.id)))
        .orderBy(desc(hiringRuns.updatedAt))
    if (!others.length) return null
    const want = await pipelineHash(processId)
    for (const o of others) {
        if (o.run.processId && (await pipelineHash(o.run.processId)) === want) return o
    }
    return null
}

export async function sendState(userId: string, jobSlug: string): Promise<SendState | null> {
    const job = await db.query.jobs.findFirst({ where: eq(jobs.slug, jobSlug), columns: { id: true, slug: true, title: true, status: true, companyId: true, interviewProcessId: true, adminHiddenAt: true } })
    if (!job) return null
    const company = await db.query.companies.findFirst({ where: eq(companies.id, job.companyId), columns: { id: true, name: true, slug: true, claimStatus: true, verificationStatus: true, suspendedAt: true } })
    if (!company) return null

    const blocks: SendState["blocks"] = []
    const trust = companyTrust(company.claimStatus, company.verificationStatus)
    if (company.suspendedAt) {
        blocks.push({ code: "COMPANY", message: `${company.name} is suspended, so it can't receive results.` })
    } else if (!trust.canReceiveResults) {
        blocks.push({ code: "COMPANY", message: trust.kind === "unclaimed" ? `Practice only until ${company.name} joins ShipItHQ.` : `${company.name} hasn't been verified yet, so it can't receive results. Your rounds are saved.` })
    }
    if (job.status !== "ACTIVE" || job.adminHiddenAt) blocks.push({ code: "JOB_CLOSED", message: "This role isn't taking applications any more. You can still practise its rounds." })

    const active = await db.query.hiringSends.findFirst({
        where: and(eq(hiringSends.userId, userId), eq(hiringSends.jobId, job.id), inArray(hiringSends.status, ["SENT", "VIEWED", "INVITED"])),
        columns: { id: true, status: true, createdAt: true },
    })
    if (active) blocks.push({ code: "ALREADY_SENT", message: `You've sent your results for this role${active.status === "INVITED" ? ", and you've been invited" : ""}.` })

    const lastDeclined = active ? null : await db.query.hiringSends.findFirst({
        where: and(eq(hiringSends.userId, userId), eq(hiringSends.jobId, job.id), eq(hiringSends.status, "DECLINED")),
        orderBy: (t, { desc }) => [desc(t.decidedAt)],
        columns: { id: true, feedback: true, decidedAt: true, createdAt: true },
    })
    const base = {
        job: { id: job.id, slug: job.slug, title: job.title, status: job.status },
        company: { id: company.id, name: company.name, slug: company.slug },
        activeSend: active ? { id: active.id, status: active.status, sentAt: active.createdAt.toISOString() } : null,
        declined: lastDeclined ? { id: lastDeclined.id, feedback: lastDeclined.feedback, at: (lastDeclined.decidedAt ?? lastDeclined.createdAt).toISOString() } : null,
    }
    if (!job.interviewProcessId) {
        blocks.push({ code: "NO_RUN", message: "This role has no rounds to send." })
        return { ...base, run: null, rounds: [], blocks }
    }

    // This role's own run first; otherwise a completed identical one from another role here.
    const own = await db.query.hiringRuns.findFirst({
        where: and(eq(hiringRuns.userId, userId), eq(hiringRuns.jobId, job.id), inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"])),
        orderBy: (t, { desc }) => [desc(t.startedAt)],
    })
    let run: SendState["run"] = null
    let runProcess: string | null = null
    if (own?.processId) {
        run = { id: own.id, reusedFrom: null }
        runProcess = own.processId
    } else {
        const reuse = await reusableRun(userId, { id: job.id, companyId: job.companyId }, job.interviewProcessId)
        if (reuse?.run.processId) {
            run = { id: reuse.run.id, reusedFrom: { jobTitle: reuse.jobTitle, jobSlug: reuse.jobSlug } }
            runProcess = reuse.run.processId
        }
    }
    if (!run || !runProcess) {
        blocks.push({ code: "NO_RUN", message: "Take this role's rounds first." })
        return { ...base, run: null, rounds: [], blocks }
    }
    const { rounds, attempts, states } = await runRounds(run.id, runProcess)
    if (!runComplete(states)) blocks.push({ code: "INCOMPLETE", message: incompleteReason(rounds, states) })
    // After a decline, the same results can't go again: a round needs a new attempt (HR-19, Niraj 2026-09-26).
    if (lastDeclined) {
        const since = lastDeclined.createdAt.getTime()
        const fresh = attempts.some((a) => a.status === "SCORED" && (a.submittedAt ?? a.startedAt).getTime() > since)
        if (!fresh) blocks.push({ code: "NEEDS_RETAKE", message: `${company.name} declined these results. Retake at least one round to send again.` })
    }
    return { ...base, run, rounds: sendRounds(rounds, attempts), blocks }
}

function incompleteReason(rounds: Round[], states: RoundState[]): string {
    const i = states.findIndex((s) => !s.isCleared)
    const r = rounds[i]
    if (!r) return "Finish every round first."
    return r.gateMode === "HARD"
        ? `Round ${r.roundNumber}, ${r.title}, needs a score of ${r.passMark} before you can send.`
        : `Finish round ${r.roundNumber}, ${r.title}, before you can send.`
}

// ── The profile gate and the links ───────────────────────────────────────────

export interface SendProfileOptions {
    name: string | null
    headline: string | null
    education: { institution: string; degree: string | null; from: string; to: string | null }[]
    /** What's missing before a send (DoD 29), each with where to fix it. */
    missing: { field: "name" | "headline" | "education"; href: string }[]
    resumes: { id: string; name: string; isDefault: boolean; isPublic: boolean; url: string }[]
    github: string | null
    knowMe: string | null
    projects: { key: string; kind: "workspace" | "portfolio"; title: string; isPublic: boolean; url: string | null }[]
}

async function githubOf(userId: string, fromUser: string | null): Promise<string | null> {
    if (fromUser?.trim()) return fromUser.trim()
    const [link] = await db.select({ url: socialLinks.url }).from(socialLinks).where(and(eq(socialLinks.userId, userId), eq(socialLinks.platform, "github"))).limit(1)
    return link?.url ?? null
}

export async function sendProfileOptions(userId: string): Promise<SendProfileOptions> {
    const [u] = await db.select({ name: users.name, headline: users.headline, githubUrl: users.githubUrl, username: users.username }).from(users).where(eq(users.id, userId))
    const [education, resumes, workspace, portfolio, knowme] = await Promise.all([
        db.select().from(userEducations).where(eq(userEducations.userId, userId)).orderBy(asc(userEducations.order)),
        db.select({ id: resumeDraft.id, name: resumeDraft.name, isDefault: resumeDraft.isDefault, isPublic: resumeDraft.isPublic, slug: resumeDraft.shareSlug })
            .from(resumeDraft).where(eq(resumeDraft.userId, userId)).orderBy(desc(resumeDraft.isDefault), desc(resumeDraft.updatedAt)),
        db.select({ id: projectsV2.id, title: projectsV2.title, visibility: projectsV2.visibility, slug: projectsV2.slug })
            .from(projectsV2).where(eq(projectsV2.createdBy, userId)).orderBy(desc(projectsV2.updatedAt)).limit(30),
        db.select({ id: portfolioProjects.id, title: portfolioProjects.projectName, visibility: portfolioProjects.visibility })
            .from(portfolioProjects).where(eq(portfolioProjects.userId, userId)).orderBy(desc(portfolioProjects.updatedAt)).limit(30),
        db.query.knowMeProfiles.findFirst({ where: eq(knowMeProfiles.userId, userId), columns: { status: true, isPublic: true } }),
    ])
    const missing: SendProfileOptions["missing"] = []
    if (!u?.name?.trim()) missing.push({ field: "name", href: "/profile" })
    if (!u?.headline?.trim()) missing.push({ field: "headline", href: "/profile" })
    if (!education.length) missing.push({ field: "education", href: "/profile" })
    return {
        name: u?.name?.trim() || null,
        headline: u?.headline?.trim() || null,
        education: education.map((e) => ({ institution: e.institution, degree: e.degree, from: e.startDate.toISOString(), to: e.endDate?.toISOString() ?? null })),
        missing,
        resumes: resumes.map(({ slug, ...r }) => ({ ...r, url: resumeShareUrl(slug) })),
        github: await githubOf(userId, u?.githubUrl ?? null),
        knowMe: u?.username && knowme?.status === "ACTIVE" && knowme.isPublic ? knowMeProfileUrl(u.username) : null,
        projects: [
            ...workspace.map((p) => ({ key: `workspace:${p.id}`, kind: "workspace" as const, title: p.title, isPublic: p.visibility === "PUBLIC", url: absoluteUrl(`/projects/${encodeURIComponent(p.slug)}`) })),
            ...portfolio.map((p) => ({ key: `portfolio:${p.id}`, kind: "portfolio" as const, title: p.title, isPublic: p.visibility === "PUBLIC", url: u?.username ? publicProfileUrl(u.username) : null })),
        ],
    }
}

export interface SendLinks {
    resumeId: string | null
    github: boolean
    knowMe: boolean
    /** "workspace:<id>" or "portfolio:<id>", up to three. */
    projects: string[]
}


/** The profile as it goes out, from the student's choices, each checked against what they own. */
export async function buildProfile(userId: string, links: SendLinks): Promise<{ profile: SentProfile; resumeToPublish: string | null } | { error: string }> {
    const opts = await sendProfileOptions(userId)
    if (opts.missing.length) return { error: `Add your ${opts.missing.map((m) => m.field).join(", ")} before sending.` }
    const [u] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId))
    const out: SentProfile["links"] = []
    let resumeToPublish: string | null = null

    if (links.resumeId) {
        const [r] = await db.select({ id: resumeDraft.id, name: resumeDraft.name, slug: resumeDraft.shareSlug, isPublic: resumeDraft.isPublic })
            .from(resumeDraft).where(and(eq(resumeDraft.id, links.resumeId), eq(resumeDraft.userId, userId)))
        if (!r) return { error: "That resume isn't yours." }
        out.push({ kind: "resume", label: "Resume", url: resumeShareUrl(r.slug) })
        if (!r.isPublic) resumeToPublish = r.id
    }
    if (links.github) {
        if (!opts.github) return { error: "Add your GitHub link to your profile first." }
        out.push({ kind: "github", label: "GitHub", url: opts.github })
    }
    if (links.knowMe) {
        if (!opts.knowMe) return { error: "Your KnowMe page isn't public yet." }
        out.push({ kind: "knowme", label: "KnowMe", url: opts.knowMe })
    }
    const picked = [...new Set(links.projects)].slice(0, MAX_PROJECTS + 1)
    if (picked.length > MAX_PROJECTS) return { error: `Attach at most ${MAX_PROJECTS} projects.` }
    for (const key of picked) {
        const [kind, id] = key.split(":")
        if (kind === "workspace" && id) {
            const [p] = await db.select({ slug: projectsV2.slug, title: projectsV2.title, visibility: projectsV2.visibility }).from(projectsV2).where(and(eq(projectsV2.id, id), eq(projectsV2.createdBy, userId)))
            if (!p) return { error: "One of those projects isn't yours." }
            if (p.visibility !== "PUBLIC") return { error: `Make "${p.title}" public to attach it.` }
            out.push({ kind: "project", label: p.title, url: absoluteUrl(`/projects/${encodeURIComponent(p.slug)}`) })
        } else if (kind === "portfolio" && id) {
            const [p] = await db.select({ title: portfolioProjects.projectName, visibility: portfolioProjects.visibility }).from(portfolioProjects).where(and(eq(portfolioProjects.id, id), eq(portfolioProjects.userId, userId)))
            if (!p) return { error: "One of those projects isn't yours." }
            if (p.visibility !== "PUBLIC") return { error: `Make "${p.title}" public to attach it.` }
            if (!u?.username) return { error: "Set a username so your portfolio can be linked." }
            out.push({ kind: "project", label: p.title, url: publicProfileUrl(u.username) })
        } else {
            return { error: "Unknown project." }
        }
    }
    return { profile: { name: opts.name!, headline: opts.headline!, education: opts.education, links: out }, resumeToPublish }
}

// ── The snapshot ─────────────────────────────────────────────────────────────



const MAX_DETAIL_CHARS = 150_000

function integrityOf(i: HiringAttemptIntegrity): SnapshotRound["attempt"]["integrity"] {
    return {
        pastes: i.pastes ?? 0,
        tabLeaves: i.tabLeaves ?? 0,
        secondsTotal: (i.secondsPerItem ?? []).reduce((a, b) => a + b, 0),
        aiBlocked: i.aiBlocked ?? 0,
    }
}

function detailOf(type: string, a: Attempt): Record<string, unknown> {
    const responses = (a.responses ?? {}) as Record<string, unknown>
    if (type === "APTITUDE") {
        const b = (a.breakdown as { right: boolean }[] | null) ?? []
        const sections = ((a.drawnItems as { section?: string }[]) ?? []).map((d) => d.section ?? "OTHER")
        const bySection: Record<string, { right: number; total: number }> = {}
        b.forEach((x, i) => {
            const s = sections[i] ?? "OTHER"
            bySection[s] = bySection[s] ?? { right: 0, total: 0 }
            bySection[s]!.total++
            if (x.right) bySection[s]!.right++
        })
        return { right: b.filter((x) => x.right).length, total: b.length, bySection }
    }
    if (type === "DSA") {
        const code = (responses.code ?? {}) as Record<string, { language?: string; code?: string }>
        const problems = ((a.breakdown as { problemId: string; title: string; language: string; status: string; passed: number; total: number; samplePassed: number; sampleTotal: number; hiddenPassed: number; hiddenTotal: number }[] | null) ?? [])
            .map((p) => ({ ...p, code: typeof code[p.problemId]?.code === "string" ? code[p.problemId]!.code!.slice(0, 20_000) : "" }))
        return { problems }
    }
    if (type === "SYSTEM_DESIGN") {
        const diagram = (responses.diagram as { elements?: unknown[] } | undefined)?.elements ?? []
        return { rubric: a.aiRubricResult ?? null, answer: typeof responses.answer === "string" ? responses.answer : "", diagram: JSON.stringify(diagram).length < 120_000 ? diagram : [] }
    }
    // Voice rounds: the rubric and Sarvam's transcript (or the typed turns).
    return { rubric: a.aiRubricResult ?? null, mode: responses.mode ?? null, transcript: (responses.turns as VoiceTurn[] | undefined) ?? [] }
}

/** One round as the company sees it, for one attempt. The snapshot and the live preview both use this. */
function snapshotRound(r: Round, mine: Attempt[], a: Attempt): SnapshotRound {
    const passed = r.gateMode === "HARD" ? a.score! >= r.passMark : true
    let detail = detailOf(r.roundType, a)
    if (JSON.stringify(detail).length > MAX_DETAIL_CHARS) detail = { ...detail, diagram: [], truncated: true }
    return {
        roundId: r.id,
        number: r.roundNumber,
        title: r.title,
        type: r.roundType,
        gateMode: r.gateMode,
        passMark: r.passMark,
        attempt: {
            number: mine.indexOf(a) + 1,
            of: mine.length,
            score: a.score!,
            passed,
            submittedAt: (a.submittedAt ?? a.startedAt).toISOString(),
            detail,
            integrity: integrityOf(a.integrity),
        },
    }
}

/** Every scored attempt of a run as it would be sent, by attempt id: the send page's live preview. */
export async function attemptPreviews(runId: string): Promise<Record<string, SnapshotRound>> {
    const run = await db.query.hiringRuns.findFirst({ where: eq(hiringRuns.id, runId) })
    if (!run?.processId) return {}
    const { rounds, attempts } = await runRounds(run.id, run.processId)
    const out: Record<string, SnapshotRound> = {}
    for (const r of rounds) {
        const mine = attempts.filter((a) => a.roundId === r.id)
        for (const a of mine) if (a.status === "SCORED" && a.score !== null) out[a.id] = snapshotRound(r, mine, a)
    }
    return out
}

/**
 * The snapshot for the chosen attempts: one per round, each checked to belong to
 * the run and to count (SCORED, and at or above the mark on a HARD round).
 */
export async function buildSnapshot(input: { runId: string; picks: Record<string, string>; jobTitle: string; companyName: string; reusedFromJob: string | null }): Promise<SendSnapshot | { error: string }> {
    const run = await db.query.hiringRuns.findFirst({ where: eq(hiringRuns.id, input.runId) })
    if (!run?.processId) return { error: "That run is gone." }
    const { rounds, attempts } = await runRounds(run.id, run.processId)
    const out: SnapshotRound[] = []
    for (const r of rounds) {
        const mine = attempts.filter((a) => a.roundId === r.id)
        const pick = input.picks[r.id]
        const a = mine.find((x) => x.id === pick)
        if (!a) return { error: `Choose an attempt for round ${r.roundNumber}, ${r.title}.` }
        if (a.status !== "SCORED" || a.score === null) return { error: `Round ${r.roundNumber}'s chosen attempt wasn't scored.` }
        if (r.gateMode === "HARD" && a.score < r.passMark) return { error: `Round ${r.roundNumber} needs an attempt at or above ${r.passMark}.` }
        out.push(snapshotRound(r, mine, a))
    }
    const process = await db.query.interviewProcesses.findFirst({ where: eq(interviewProcesses.id, run.processId), columns: { id: true } })
    return {
        version: 1,
        job: { title: input.jobTitle },
        company: { name: input.companyName },
        pipelineHash: process ? await pipelineHash(process.id) : "",
        reusedFromJob: input.reusedFromJob,
        rounds: out,
        sentAt: new Date().toISOString(),
    }
}
