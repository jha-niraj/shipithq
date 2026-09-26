"use server"

import { and, desc, eq, gt, lt, sql } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db, companies, importedJobs, jobPractisable, jobs, notifyUser, referralOfferCodes, referralOffers, referralRequests, users,
    type ReferralAttachment,
} from "@repo/db"
import { sendReferralRequestEmail, sendReferrerCodeEmail } from "@/lib/emails/referrer"
import { getR2SignedUrl } from "@/lib/r2-client"
import { absoluteUrl } from "@/lib/urls"
import {
    CODE_ATTEMPTS, CODE_MINUTES, CODE_RESEND_SECONDS, EXPIRE_DAYS, OFFER_MONTHS, attachmentFor, companyForWorkEmail, companyHasRoom,
    expireStale, hashCode, newCode, pickOffer, primaryResumeKey, studentCapError,
} from "@/lib/referrer/core"

/*
 * Verified referrals (plan/competition/skillmeet CMP-4). An employee verifies
 * with a code to their company email and opts in; a student asks on a job; the
 * request goes to the referrer with the fewest open; they accept or decline.
 * The rules and numbers are in lib/referrer/core.ts.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

async function currentUserId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "An employee"

// ── The employee side: verifying ─────────────────────────────────────────────

export interface ReferrerState {
    offer: { companyName: string; companySlug: string; workEmail: string; expiresAt: string; status: "ACTIVE" | "PAUSED"; expired: boolean } | null
    pending: { email: string; companyName: string } | null
}

export async function getReferrerState(): Promise<Result<ReferrerState>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        const [offer, code] = await Promise.all([
            db.query.referralOffers.findFirst({ where: eq(referralOffers.userId, userId), with: { company: { columns: { name: true, slug: true } } } }),
            db.query.referralOfferCodes.findFirst({ where: and(eq(referralOfferCodes.userId, userId), gt(referralOfferCodes.expiresAt, new Date())) }),
        ])
        const codeCompany = code ? await db.query.companies.findFirst({ where: eq(companies.id, code.companyId), columns: { name: true } }) : null
        return {
            success: true,
            data: {
                offer: offer ? {
                    companyName: offer.company.name, companySlug: offer.company.slug, workEmail: offer.workEmail,
                    expiresAt: offer.expiresAt.toISOString(), status: offer.status, expired: offer.expiresAt <= new Date(),
                } : null,
                pending: code && codeCompany ? { email: code.email, companyName: codeCompany.name } : null,
            },
        }
    } catch (error: unknown) {
        console.error("getReferrerState:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your referrer status" }
    }
}

/** Send a 6-digit code to a company address. Free and temporary addresses are refused. */
export async function startReferrerVerification(email: string): Promise<Result<{ companyName: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        const found = await companyForWorkEmail(email)
        if (!found.ok) return { success: false, error: found.error }
        const prior = await db.query.referralOfferCodes.findFirst({ where: eq(referralOfferCodes.userId, userId) })
        if (prior && Date.now() - prior.sentAt.getTime() < CODE_RESEND_SECONDS * 1000) {
            return { success: false, error: "A code was sent less than a minute ago. Check your inbox, or try again shortly.", code: "TOO_SOON" }
        }
        const code = newCode()
        // A new code while the last one is still live keeps its wrong-guess count, so asking
        // for codes can't buy fresh guesses: after 5 wrong, wait for it to expire (10 minutes).
        const carried = prior && prior.expiresAt > new Date() ? prior.attempts : 0
        if (carried >= CODE_ATTEMPTS) return { success: false, error: "Too many wrong codes. Try again in 10 minutes.", code: "LOCKED" }
        const values = { userId, companyId: found.company.id, email: found.email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: carried, sentAt: new Date() }
        await db.insert(referralOfferCodes).values(values).onConflictDoUpdate({ target: referralOfferCodes.userId, set: values })
        const sent = await sendReferrerCodeEmail(found.email, { code, companyName: found.company.name })
        if (!sent) {
            await db.delete(referralOfferCodes).where(eq(referralOfferCodes.userId, userId))
            return { success: false, error: "We couldn't send the code. Try again in a minute." }
        }
        return { success: true, data: { companyName: found.company.name } }
    } catch (error: unknown) {
        console.error("startReferrerVerification:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start verification" }
    }
}

/** Confirm the code: the employee refers for that company for six months. */
export async function confirmReferrerCode(code: string): Promise<Result<{ companyName: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        // Every try spends one of the five attempts first, atomically, so parallel guesses
        // can't all read the same count (a review finding, 2026-09-26).
        const [pending] = await db.update(referralOfferCodes).set({ attempts: sql`${referralOfferCodes.attempts} + 1` })
            .where(and(eq(referralOfferCodes.userId, userId), gt(referralOfferCodes.expiresAt, new Date()), lt(referralOfferCodes.attempts, CODE_ATTEMPTS)))
            .returning()
        if (!pending) {
            const stale = await db.query.referralOfferCodes.findFirst({ where: eq(referralOfferCodes.userId, userId), columns: { expiresAt: true } })
            return !stale || stale.expiresAt <= new Date()
                ? { success: false, error: "That code has expired. Send a new one.", code: "EXPIRED" }
                : { success: false, error: "Too many wrong codes. Try again once this code expires, within 10 minutes.", code: "LOCKED" }
        }
        if (hashCode(code) !== pending.codeHash) {
            const left = CODE_ATTEMPTS - pending.attempts
            return { success: false, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Try again once this code expires, within 10 minutes.", code: left > 0 ? "WRONG" : "LOCKED" }
        }
        const now = new Date()
        const expiresAt = new Date(now)
        expiresAt.setMonth(expiresAt.getMonth() + OFFER_MONTHS)
        const values = { userId, companyId: pending.companyId, workEmail: pending.email, verifiedAt: now, expiresAt, status: "ACTIVE" as const, updatedAt: now }
        const before = await db.query.referralOffers.findFirst({ where: eq(referralOffers.userId, userId), columns: { id: true, companyId: true } })
        if (before && before.companyId !== pending.companyId) {
            // Verified somewhere else now: the old company's waiting students are freed, not left with a leaver.
            await db.update(referralRequests).set({ status: "EXPIRED", decidedAt: now, updatedAt: now })
                .where(and(eq(referralRequests.offerId, before.id), eq(referralRequests.status, "OPEN")))
        }
        await db.batch([
            db.insert(referralOffers).values(values).onConflictDoUpdate({ target: referralOffers.userId, set: values }),
            db.delete(referralOfferCodes).where(eq(referralOfferCodes.userId, userId)),
        ])
        const company = await db.query.companies.findFirst({ where: eq(companies.id, pending.companyId), columns: { name: true } })
        return { success: true, data: { companyName: company?.name ?? "your company" } }
    } catch (error: unknown) {
        console.error("confirmReferrerCode:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not confirm the code" }
    }
}

/** Stop or start taking new requests. Open ones stay yours to answer. */
export async function setReferrerPaused(paused: boolean): Promise<Result<null>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        const [row] = await db.update(referralOffers).set({ status: paused ? "PAUSED" : "ACTIVE", updatedAt: new Date() }).where(eq(referralOffers.userId, userId)).returning({ id: referralOffers.id })
        if (!row) return { success: false, error: "Verify your company email first." }
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("setReferrerPaused:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not change that" }
    }
}

// ── The student side: asking ─────────────────────────────────────────────────

type Target = { jobSlug: string } | { importedJobId: string }

/** Resolve a job the student may ask about: a listed job, or a public (or their own) built import with a company. */
async function resolveTarget(target: Target, userId: string) {
    if ("jobSlug" in target) {
        const job = await db.query.jobs.findFirst({ where: and(eq(jobs.slug, target.jobSlug), jobPractisable), columns: { id: true, title: true, companyId: true, interviewProcessId: true } })
        if (!job) return null
        return { companyId: job.companyId, title: job.title, jobId: job.id as string | null, importedJobId: null as string | null, attach: { jobId: job.id, processId: job.interviewProcessId } as const }
    }
    const imp = await db.query.importedJobs.findFirst({ where: eq(importedJobs.id, target.importedJobId) })
    if (!imp || imp.status !== "READY" || !imp.companyId || !imp.processId) return null
    if (imp.visibility === "PRIVATE" && imp.ownerId !== userId) return null
    return { companyId: imp.companyId, title: imp.extracted?.title ?? "this job", jobId: null, importedJobId: imp.id, attach: { importProcessId: imp.companyProcessId ?? imp.processId } as const }
}

export interface ReferralAvailability {
    /** The company has a verified referrer with room right now. */
    available: boolean
    /** This student already asked about this job: where it stands. */
    existing: { status: string } | null
    hasResume: boolean
}

/** Whether to show "Ask for a referral" on a job, and in what state. */
export async function getReferralAvailability(target: Target): Promise<Result<ReferralAvailability>> {
    const userId = await currentUserId()
    if (!userId) return { success: true, data: { available: false, existing: null, hasResume: false } }
    try {
        await expireStale()
        const t = await resolveTarget(target, userId)
        if (!t) return { success: true, data: { available: false, existing: null, hasResume: false } }
        const [existing, room, resume] = await Promise.all([
            db.query.referralRequests.findFirst({
                where: and(eq(referralRequests.studentId, userId), t.jobId ? eq(referralRequests.jobId, t.jobId) : eq(referralRequests.importedJobId, t.importedJobId!)),
                columns: { status: true },
            }),
            companyHasRoom(t.companyId, userId),
            primaryResumeKey(userId),
        ])
        return { success: true, data: { available: room, existing: existing ? { status: existing.status } : null, hasResume: resume !== null } }
    } catch (error: unknown) {
        console.error("getReferralAvailability:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not check referrals" }
    }
}

/** Ask for a referral: to the referrer with the fewest open requests. */
export async function requestReferral(target: Target, input: { note: string; shareResume: boolean }): Promise<Result<{ id: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to ask for a referral.", code: "UNAUTHORIZED" }
    const note = input.note.replace(/\s+/g, " ").trim().slice(0, 500)
    if (note.length < 20) return { success: false, error: "Add a short note on why this role: a sentence or two." }
    try {
        await expireStale()
        const t = await resolveTarget(target, userId)
        if (!t) return { success: false, error: "That job isn't open for referrals." }
        const cap = await studentCapError(userId)
        if (cap) return { success: false, error: cap, code: "LIMIT" }
        const offer = await pickOffer(t.companyId, userId)
        if (!offer) return { success: false, error: "Every referrer at this company has a full inbox right now. Try again in a few days.", code: "FULL" }
        const attachment = await attachmentFor(userId, t.attach, input.shareResume)
        const [row] = await db.insert(referralRequests).values({
            studentId: userId, companyId: t.companyId, jobId: t.jobId, importedJobId: t.importedJobId, offerId: offer.id,
            note, attachment, shareResume: attachment.resume,
        }).onConflictDoNothing().returning({ id: referralRequests.id })
        if (!row) return { success: false, error: "You've already asked for a referral for this job.", code: "DUPLICATE" }
        await db.update(referralOffers).set({ lastAssignedAt: new Date() }).where(eq(referralOffers.id, offer.id))

        const company = await db.query.companies.findFirst({ where: eq(companies.id, t.companyId), columns: { name: true } })
        await notifyUser(offer.userId, {
            platform: "MAIN",
            kind: "REFERRAL_REQUEST",
            title: "A student asked you for a referral",
            body: `For ${t.title} at ${company?.name ?? "your company"}. Accept or decline within ${EXPIRE_DAYS} days.`,
            actor: { name: "ShipItHQ" },
            href: "/jobs/referrals",
        }).catch((e: unknown) => console.error("notify REFERRAL_REQUEST:", e))
        const [me] = await db.select({ email: users.email }).from(users).where(eq(users.id, offer.userId))
        if (me?.email) void sendReferralRequestEmail(me.email, { companyName: company?.name ?? "your company", jobTitle: t.title, url: absoluteUrl("/jobs/referrals") })
        return { success: true, data: { id: row.id } }
    } catch (error: unknown) {
        console.error("requestReferral:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send the request. Try again." }
    }
}

export interface MyReferralRequest {
    id: string
    jobTitle: string
    companyName: string
    href: string
    status: "OPEN" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN"
    /** Accepted: the referrer's first name, the only thing the student learns about them. */
    referrerFirstName: string | null
    createdAt: string
    decidedAt: string | null
}

export async function getMyReferralRequests(): Promise<Result<MyReferralRequest[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: true, data: [] }
    try {
        await expireStale()
        const rows = await db.query.referralRequests.findMany({
            where: eq(referralRequests.studentId, userId),
            with: { company: { columns: { name: true } }, job: { columns: { title: true, slug: true } }, importedJob: { columns: { id: true, extracted: true } }, offer: { with: { user: { columns: { name: true } } } } },
            orderBy: [desc(referralRequests.createdAt)],
            limit: 50,
        })
        return {
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                jobTitle: r.job?.title ?? r.importedJob?.extracted?.title ?? "A job",
                companyName: r.company.name,
                href: r.job ? `/jobs/${r.job.slug}` : r.importedJob ? `/jobs/import/${r.importedJob.id}` : "/jobs",
                status: r.status,
                referrerFirstName: r.status === "ACCEPTED" ? firstName(r.offer?.user?.name) : null,
                createdAt: r.createdAt.toISOString(),
                decidedAt: r.decidedAt?.toISOString() ?? null,
            })),
        }
    } catch (error: unknown) {
        console.error("getMyReferralRequests:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your requests" }
    }
}

export async function withdrawReferral(id: string): Promise<Result<null>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    try {
        const [row] = await db.update(referralRequests).set({ status: "WITHDRAWN", decidedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(referralRequests.id, id), eq(referralRequests.studentId, userId), eq(referralRequests.status, "OPEN"))).returning({ id: referralRequests.id })
        if (!row) return { success: false, error: "Only a request still waiting can be withdrawn." }
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("withdrawReferral:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not withdraw it" }
    }
}

// ── The employee side: answering ─────────────────────────────────────────────

export interface InboxRequest {
    id: string
    jobTitle: string
    jobHref: string
    studentName: string
    note: string
    attachment: ReferralAttachment
    status: "OPEN" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN"
    /** Only once accepted. */
    studentEmail: string | null
    createdAt: string
    expiresAt: string
}

/** The referrer's requests: open first (oldest first), then the answered ones. */
export async function getReferrerInbox(): Promise<Result<InboxRequest[]>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        await expireStale()
        const offer = await db.query.referralOffers.findFirst({ where: eq(referralOffers.userId, userId), columns: { id: true } })
        if (!offer) return { success: true, data: [] }
        const rows = await db.query.referralRequests.findMany({
            where: eq(referralRequests.offerId, offer.id),
            with: { student: { columns: { name: true, email: true } }, job: { columns: { title: true, slug: true } }, importedJob: { columns: { id: true, extracted: true } } },
            orderBy: [sql`case when ${referralRequests.status} = 'OPEN' then 0 else 1 end`, referralRequests.createdAt],
            limit: 100,
        })
        return {
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                jobTitle: r.job?.title ?? r.importedJob?.extracted?.title ?? "A job",
                jobHref: r.job ? `/jobs/${r.job.slug}` : r.importedJob ? `/jobs/import/${r.importedJob.id}` : "/jobs",
                studentName: r.student.name ?? "A student",
                note: r.note,
                attachment: r.attachment,
                status: r.status,
                studentEmail: r.status === "ACCEPTED" ? r.student.email : null,
                createdAt: r.createdAt.toISOString(),
                expiresAt: new Date(r.createdAt.getTime() + EXPIRE_DAYS * 86_400_000).toISOString(),
            })),
        }
    } catch (error: unknown) {
        console.error("getReferrerInbox:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load your requests" }
    }
}

/** The request's resume, as a link valid for an hour; only for the referrer it went to, and only if shared. */
export async function openReferralResume(id: string): Promise<Result<{ url: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        const r = await db.query.referralRequests.findFirst({ where: eq(referralRequests.id, id), with: { offer: { columns: { userId: true } } } })
        if (!r || r.offer?.userId !== userId) return { success: false, error: "That request isn't yours." }
        if (!r.shareResume) return { success: false, error: "The student didn't share a resume." }
        if (r.status !== "OPEN" && r.status !== "ACCEPTED") return { success: false, error: "This request has closed, so its resume is no longer shared." }
        const key = await primaryResumeKey(r.studentId)
        if (!key) return { success: false, error: "The student no longer has a resume on file." }
        return { success: true, data: { url: await getR2SignedUrl(key, 3600) } }
    } catch (error: unknown) {
        console.error("openReferralResume:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not open the resume" }
    }
}

/** Accept (the referrer gets the student's email; the student learns their first name) or decline (kindly, no name). */
export async function answerReferral(id: string, accept: boolean): Promise<Result<{ studentEmail: string | null }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to refer.", code: "UNAUTHORIZED" }
    try {
        await expireStale()
        const offer = await db.query.referralOffers.findFirst({ where: eq(referralOffers.userId, userId), columns: { id: true, companyId: true, expiresAt: true } })
        if (!offer) return { success: false, error: "That request isn't yours." }
        // Only while still verified at that company: a lapsed or moved referrer gets no student's email.
        if (offer.expiresAt <= new Date()) return { success: false, error: "Verify your company email again to answer requests." }
        const [row] = await db.update(referralRequests).set({ status: accept ? "ACCEPTED" : "DECLINED", decidedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(referralRequests.id, id), eq(referralRequests.offerId, offer.id), eq(referralRequests.companyId, offer.companyId), eq(referralRequests.status, "OPEN")))
            .returning({ studentId: referralRequests.studentId, companyId: referralRequests.companyId, jobId: referralRequests.jobId, importedJobId: referralRequests.importedJobId })
        if (!row) return { success: false, error: "That request was already answered or has closed." }
        const [student, me, company, job, imp] = await Promise.all([
            db.query.users.findFirst({ where: eq(users.id, row.studentId), columns: { email: true } }),
            db.query.users.findFirst({ where: eq(users.id, userId), columns: { name: true } }),
            db.query.companies.findFirst({ where: eq(companies.id, row.companyId), columns: { name: true } }),
            row.jobId ? db.query.jobs.findFirst({ where: eq(jobs.id, row.jobId), columns: { title: true } }) : null,
            row.importedJobId ? db.query.importedJobs.findFirst({ where: eq(importedJobs.id, row.importedJobId), columns: { extracted: true } }) : null,
        ])
        const what = `${job?.title ?? imp?.extracted?.title ?? "the job"} at ${company?.name ?? "the company"}`
        await notifyUser(row.studentId, accept ? {
            platform: "MAIN",
            kind: "REFERRAL_ANSWERED",
            severity: "SUCCESS",
            title: "You were referred",
            body: `${firstName(me?.name)} referred you for ${what} and has your email and resume. A referral puts you in front of the team; it isn't a promise of an interview.`,
            actor: { name: firstName(me?.name) },
            href: "/jobs/referrals",
        } : {
            platform: "MAIN",
            kind: "REFERRAL_ANSWERED",
            title: "Your referral request wasn't taken up",
            body: `The employee couldn't refer you for ${what} this time. It says nothing about you; keep practising the rounds and try another role.`,
            actor: { name: "ShipItHQ" },
            href: "/jobs/referrals",
        }).catch((e: unknown) => console.error("notify REFERRAL_ANSWERED:", e))
        return { success: true, data: { studentEmail: accept ? (student?.email ?? null) : null } }
    } catch (error: unknown) {
        console.error("answerReferral:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save your answer" }
    }
}
