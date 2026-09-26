import "server-only"
import crypto from "crypto"
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm"
import {
    db, companies, hiringAttempts, hiringRuns, interviewRounds, projectV2Submissions, projectsV2, referralOffers, referralRequests,
    resumeFiles, type ReferralAttachment,
} from "@repo/db"
import { checkWorkEmail } from "@repo/auth/work-email"
import { roundStates } from "@/lib/hiring/round-state"

/*
 * Verified referrals, the rules (plan/competition/skillmeet CMP-4). Server-only:
 * these take ids the caller has already checked. The numbers are decisions,
 * round 5 (Niraj, 2026-09-26), in plan/competition/skillmeet/tasks.md.
 */

/** A student: requests in a rolling 24 hours, and open at once. */
export const STUDENT_PER_DAY = 1
export const STUDENT_OPEN = 5
/** A referrer: open requests at once. */
export const REFERRER_OPEN = 10
/** An unanswered request closes after this many days (a default set while planning). */
export const EXPIRE_DAYS = 14
/** An employee verifies again after this many months. */
export const OFFER_MONTHS = 6
export const CODE_MINUTES = 10
export const CODE_ATTEMPTS = 5
export const CODE_RESEND_SECONDS = 60

const DAY_MS = 86_400_000

export const hashCode = (code: string) => crypto.createHash("sha256").update(code.trim()).digest("hex")
export const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")

/** "mail.eng.acme.io" -> ["mail.eng.acme.io", "eng.acme.io", "acme.io"]. */
export function domainCandidates(domain: string): string[] {
    const parts = domain.toLowerCase().split(".")
    const out: string[] = []
    for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."))
    return out
}

/** The company a work address belongs to, or why not. */
export async function companyForWorkEmail(email: string): Promise<{ ok: true; company: { id: string; name: string }; email: string } | { ok: false; error: string }> {
    const check = checkWorkEmail(email)
    if (!check.ok) {
        return { ok: false, error: check.reason === "invalid" ? "That doesn't look like an email address." : "Use your company email. Personal and temporary addresses can't verify you work somewhere." }
    }
    const candidates = domainCandidates(check.domain)
    const rows = await db.select({ id: companies.id, name: companies.name, domain: companies.websiteDomain }).from(companies)
        .where(and(inArray(companies.websiteDomain, candidates), isNull(companies.suspendedAt)))
    // The most specific match wins ("eng.acme.io" over "acme.io").
    const company = rows.sort((a, b) => (b.domain?.length ?? 0) - (a.domain?.length ?? 0))[0]
    if (!company) return { ok: false, error: `No company on ShipItHQ uses ${check.domain}. If yours isn't here yet, ask for it to be added first.` }
    return { ok: true, company: { id: company.id, name: company.name }, email: email.trim().toLowerCase() }
}

/** Close open requests that waited too long, or whose referrer is gone; they free both sides' slots. */
export async function expireStale(): Promise<void> {
    await db.update(referralRequests).set({ status: "EXPIRED", decidedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(referralRequests.status, "OPEN"), or(lt(referralRequests.createdAt, new Date(Date.now() - EXPIRE_DAYS * DAY_MS)), isNull(referralRequests.offerId))))
}

/** An offer that can take requests: ACTIVE and not past its six months. */
export const offerLive = () => and(eq(referralOffers.status, "ACTIVE"), gt(referralOffers.expiresAt, new Date()))

/**
 * The referrer the next request goes to: the company's live referrers (never the
 * student themselves) with room, fewest open first, then the longest since last
 * assigned (decision round 5). Null: everyone is full, or there is nobody.
 */
export async function pickOffer(companyId: string, studentId: string): Promise<{ id: string; userId: string } | null> {
    const offers = await db.select({ id: referralOffers.id, userId: referralOffers.userId, lastAssignedAt: referralOffers.lastAssignedAt })
        .from(referralOffers).where(and(eq(referralOffers.companyId, companyId), offerLive(), ne(referralOffers.userId, studentId)))
    if (!offers.length) return null
    const open = await db.select({ offerId: referralRequests.offerId, n: count() }).from(referralRequests)
        .where(and(inArray(referralRequests.offerId, offers.map((o) => o.id)), eq(referralRequests.status, "OPEN"))).groupBy(referralRequests.offerId)
    const openOf = (id: string) => Number(open.find((o) => o.offerId === id)?.n ?? 0)
    const room = offers.filter((o) => openOf(o.id) < REFERRER_OPEN)
    room.sort((a, b) => openOf(a.id) - openOf(b.id) || (a.lastAssignedAt?.getTime() ?? 0) - (b.lastAssignedAt?.getTime() ?? 0))
    return room[0] ? { id: room[0].id, userId: room[0].userId } : null
}

/** Whether a company has anyone who could take a request now (for showing the card). */
export async function companyHasRoom(companyId: string, studentId: string): Promise<boolean> {
    return (await pickOffer(companyId, studentId)) !== null
}

/** The student's caps: 1 in a rolling 24 hours, 5 open. Null when they may ask. */
export async function studentCapError(studentId: string): Promise<string | null> {
    const [[recent], [open]] = await Promise.all([
        db.select({ n: count() }).from(referralRequests).where(and(eq(referralRequests.studentId, studentId), gt(referralRequests.createdAt, new Date(Date.now() - DAY_MS)))),
        db.select({ n: count() }).from(referralRequests).where(and(eq(referralRequests.studentId, studentId), eq(referralRequests.status, "OPEN"))),
    ])
    if (Number(recent?.n ?? 0) >= STUDENT_PER_DAY) return `You can ask for ${STUDENT_PER_DAY} referral a day. Try again tomorrow.`
    if (Number(open?.n ?? 0) >= STUDENT_OPEN) return `You have ${STUDENT_OPEN} requests waiting. Wait for an answer, or withdraw one.`
    return null
}

/**
 * What goes with a request, fixed now: the rounds of this pipeline the student
 * took (best score, pass mark, cleared), their approved project submissions, and
 * whether their primary resume is shared.
 */
export async function attachmentFor(studentId: string, target: { jobId: string; processId: string | null } | { importProcessId: string }, shareResume: boolean): Promise<ReferralAttachment> {
    const processId = "importProcessId" in target ? target.importProcessId : target.processId
    let rounds: ReferralAttachment["rounds"] = []
    if (processId) {
        const run = await db.query.hiringRuns.findFirst({
            where: and(eq(hiringRuns.userId, studentId), eq(hiringRuns.processId, processId), "jobId" in target ? eq(hiringRuns.jobId, target.jobId) : isNull(hiringRuns.jobId)),
            orderBy: [desc(hiringRuns.startedAt)],
        })
        if (run) {
            const [rs, attempts] = await Promise.all([
                db.select().from(interviewRounds).where(eq(interviewRounds.processId, processId)).orderBy(asc(interviewRounds.roundNumber)),
                db.select().from(hiringAttempts).where(eq(hiringAttempts.runId, run.id)),
            ])
            const states = roundStates(rs.map((r) => ({ id: r.id, gateMode: r.gateMode, passMark: r.passMark, cooldownHours: r.cooldownHours })), attempts)
            rounds = rs.map((r, i) => ({ title: r.title, type: r.roundType, best: states[i]?.best ?? null, passMark: r.passMark, cleared: Boolean(states[i]?.isCleared) }))
                // Rounds cleared only (CMP-4c): a failed score isn't shared with a referrer.
                .filter((r) => r.cleared)
        }
    }
    const projects = await db.select({ title: projectsV2.title, githubUrl: projectV2Submissions.githubUrl, liveUrl: projectV2Submissions.liveUrl })
        .from(projectV2Submissions).innerJoin(projectsV2, eq(projectsV2.id, projectV2Submissions.projectId))
        .where(and(eq(projectV2Submissions.userId, studentId), eq(projectV2Submissions.status, "APPROVED")))
        .orderBy(desc(projectV2Submissions.updatedAt)).limit(6)
    return { rounds, projects, resume: shareResume && (await primaryResumeKey(studentId)) !== null }
}

/** The student's primary uploaded resume in R2, if they have one. */
export async function primaryResumeKey(studentId: string): Promise<string | null> {
    const [f] = await db.select({ key: resumeFiles.r2Key }).from(resumeFiles)
        .where(and(eq(resumeFiles.userId, studentId), eq(resumeFiles.isPrimary, true), sql`${resumeFiles.r2Key} is not null`)).limit(1)
    return f?.key ?? null
}
