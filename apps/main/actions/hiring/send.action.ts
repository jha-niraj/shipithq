"use server"

import { and, eq, inArray, like } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getSession } from "@repo/auth"
import { db, hiringSends, jobs, notifications, notifyCompany, resumeDraft } from "@repo/db"
import { closeThreadsForSend } from "@repo/db/inbox"
import { emailNewResults } from "@/lib/inbox/email"
import {
    MAX_PROJECTS, RETENTION_DAYS, SEND_CONSENT_TEXT, attemptPreviews, buildProfile, buildSnapshot, sendProfileOptions, sendState,
    type SendLinks, type SendProfileOptions, type SendState, type SnapshotRound,
} from "@/lib/hiring/send"

/*
 * Sending a run's results to a company, and withdrawing them (plan/hiring-rounds
 * HR-17). Everything the browser sends is a request: the server re-checks the
 * run, every chosen attempt and every link before anything is stored.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

async function userId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

export interface SendPage {
    state: SendState
    profile: SendProfileOptions
    /** Each scored attempt as the company would see it, for the live preview. */
    previews: Record<string, SnapshotRound>
    consentText: string
    maxProjects: number
}

export async function getSendPage(jobSlug: string): Promise<Result<SendPage>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Sign in to send your results.", code: "UNAUTHORIZED" }
    try {
        const state = await sendState(uid, jobSlug)
        if (!state) return { success: false, error: "That role doesn't exist.", code: "NOT_FOUND" }
        const [profile, previews] = await Promise.all([sendProfileOptions(uid), state.run ? attemptPreviews(state.run.id) : {}])
        return { success: true, data: { state, profile, previews, consentText: SEND_CONSENT_TEXT(state.company.name), maxProjects: MAX_PROJECTS } }
    } catch (error: unknown) {
        console.error("getSendPage:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the send page" }
    }
}

export interface SendInput {
    runId: string
    /** roundId -> attemptId */
    picks: Record<string, string>
    links: SendLinks
    consent: boolean
}

/** Send, once. A second click while one is active gets the same send back. */
export async function sendResults(jobSlug: string, input: SendInput): Promise<Result<{ sendId: string }>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Sign in to send your results.", code: "UNAUTHORIZED" }
    if (input?.consent !== true) return { success: false, error: "Tick the consent box to send.", code: "NO_CONSENT" }
    try {
        const state = await sendState(uid, jobSlug)
        if (!state) return { success: false, error: "That role doesn't exist." }
        if (state.activeSend) return { success: true, data: { sendId: state.activeSend.id } }
        if (state.blocks.length) return { success: false, error: state.blocks[0]!.message, code: state.blocks[0]!.code }
        if (!state.run || state.run.id !== input.runId) return { success: false, error: "Your rounds changed. Reload the page and check them." }

        const picks = typeof input.picks === "object" && input.picks ? input.picks : {}
        const profile = await buildProfile(uid, {
            resumeId: typeof input.links?.resumeId === "string" ? input.links.resumeId : null,
            github: input.links?.github === true,
            knowMe: input.links?.knowMe === true,
            projects: Array.isArray(input.links?.projects) ? input.links.projects.filter((p): p is string => typeof p === "string") : [],
        })
        if ("error" in profile) return { success: false, error: profile.error }
        const snapshot = await buildSnapshot({
            runId: state.run.id,
            picks,
            jobTitle: state.job.title,
            companyName: state.company.name,
            reusedFromJob: state.run.reusedFrom?.jobTitle ?? null,
        })
        if ("error" in snapshot) return { success: false, error: snapshot.error }

        const consentText = SEND_CONSENT_TEXT(state.company.name)
        const inserted = await db.insert(hiringSends).values({
            runId: state.run.id,
            userId: uid,
            companyId: state.company.id,
            jobId: state.job.id,
            snapshot,
            profile: profile.profile,
            consentText,
            consentedAt: new Date(),
        }).onConflictDoNothing().returning({ id: hiringSends.id })
        let sendId = inserted[0]?.id
        if (!sendId) {
            // Lost a race with another tab: the unique index kept one active send.
            const existing = await db.query.hiringSends.findFirst({
                where: and(eq(hiringSends.userId, uid), eq(hiringSends.jobId, state.job.id), inArray(hiringSends.status, ["SENT", "VIEWED", "INVITED"])),
                columns: { id: true },
            })
            if (!existing) return { success: false, error: "Could not send. Try again." }
            sendId = existing.id
        }
        // The chosen resume's link has to open for the company (said on the screen before consent).
        if (profile.resumeToPublish) {
            await db.update(resumeDraft).set({ isPublic: true }).where(and(eq(resumeDraft.id, profile.resumeToPublish), eq(resumeDraft.userId, uid)))
        }
        // Only a new send is announced: a double click that returned the existing one isn't.
        if (inserted[0]?.id) {
            await notifyCompany(state.company.id, "view_candidates", {
                kind: "SEND_RECEIVED",
                title: `sent results for ${state.job.title}`,
                body: `${profile.profile.headline}. ${snapshot.rounds.map((r) => `${r.title} ${r.attempt.score}`).join(" · ")}`,
                actor: { name: profile.profile.name },
                context: { label: state.job.title, href: `/applications/${state.job.slug}` },
                href: `/applications/${state.job.slug}?send=${sendId}`,
            }).catch((e: unknown) => console.error("notify SEND_RECEIVED:", e))
            await emailNewResults({
                companyId: state.company.id,
                candidateName: profile.profile.name,
                headline: profile.profile.headline,
                jobTitle: state.job.title,
                scores: snapshot.rounds.map((r) => `${r.title} ${r.attempt.score}`).join(" · "),
                path: `/applications/${state.job.slug}?send=${sendId}`,
            }).catch((e: unknown) => console.error("email NEW_RESULTS:", e))
        }
        revalidatePath(`/jobs/${jobSlug}/rounds`)
        return { success: true, data: { sendId } }
    } catch (error: unknown) {
        console.error("sendResults:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not send your results" }
    }
}

/**
 * Take a send back: the company stops seeing it at once, and the snapshot is
 * deleted after the retention period. An invite is final, so it can't be withdrawn.
 */
export async function withdrawSend(sendId: string): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    try {
        const send = await db.query.hiringSends.findFirst({ where: and(eq(hiringSends.id, sendId), eq(hiringSends.userId, uid)), columns: { id: true, status: true, jobId: true, companyId: true, profile: true } })
        if (!send) return { success: false, error: "That send doesn't exist." }
        if (send.status === "WITHDRAWN") return { success: true, data: null }
        if (send.status === "INVITED") return { success: false, error: "You've been invited, so this send can't be withdrawn. Reply to the company instead." }
        if (send.status === "DECLINED") return { success: false, error: "The company has already decided on this send." }
        await db.update(hiringSends).set({
            status: "WITHDRAWN",
            purgeAfter: new Date(Date.now() + RETENTION_DAYS * 24 * 3_600_000),
        }).where(and(eq(hiringSends.id, sendId), inArray(hiringSends.status, ["SENT", "VIEWED"])))
        // The company can't write to them any more (plan/inbox DoD 10), and is told.
        await closeThreadsForSend(sendId)
        // "Sent results" notices for it disappear from the company's Inboxes (HR-25).
        await db.delete(notifications).where(and(
            eq(notifications.companyId, send.companyId),
            eq(notifications.kind, "SEND_RECEIVED"),
            like(notifications.actionUrl, `%send=${sendId}`),
        ))
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, send.jobId), columns: { title: true, slug: true } })
        await notifyCompany(send.companyId, "view_candidates", {
            kind: "SEND_WITHDRAWN",
            title: `withdrew their results for ${job?.title ?? "a role"}`,
            body: "They no longer appear in this role's list.",
            actor: { name: (send.profile as { name?: string } | null)?.name ?? "A candidate" },
            context: job ? { label: job.title, href: `/applications/${job.slug}` } : null,
            href: job ? `/applications/${job.slug}` : null,
        }).catch((e: unknown) => console.error("notify SEND_WITHDRAWN:", e))
        revalidatePath("/jobs")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("withdrawSend:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not withdraw" }
    }
}

const STUDENT_OUTCOMES = ["INTERVIEWING", "OFFER", "HIRED", "NOT_SELECTED"] as const
const OUTCOME_WORDS: Record<(typeof STUDENT_OUTCOMES)[number], string> = { INTERVIEWING: "Interviewing", OFFER: "Offer", HIRED: "Hired", NOT_SELECTED: "Not selected" }

/**
 * After an invite, the student records what happened too (HR-19, DoD 17): for
 * when a company goes quiet. The company sees it beside its own.
 */
export async function setStudentOutcome(sendId: string, outcome: (typeof STUDENT_OUTCOMES)[number]): Promise<Result<null>> {
    const uid = await userId()
    if (!uid) return { success: false, error: "Signed out", code: "UNAUTHORIZED" }
    if (!STUDENT_OUTCOMES.includes(outcome)) return { success: false, error: "Unknown outcome." }
    try {
        const [s] = await db.update(hiringSends).set({ studentOutcome: outcome, studentOutcomeAt: new Date() })
            .where(and(eq(hiringSends.id, sendId), eq(hiringSends.userId, uid), eq(hiringSends.status, "INVITED")))
            .returning({ companyId: hiringSends.companyId, jobId: hiringSends.jobId, profile: hiringSends.profile })
        if (!s) return { success: false, error: "You can record an outcome once you've been invited." }
        const job = await db.query.jobs.findFirst({ where: eq(jobs.id, s.jobId), columns: { title: true, slug: true } })
        await notifyCompany(s.companyId, "view_candidates", {
            kind: "STUDENT_OUTCOME",
            title: `marked their application: ${OUTCOME_WORDS[outcome]}`,
            body: `For ${job?.title ?? "a role"}.`,
            actor: { name: (s.profile as { name?: string } | null)?.name ?? "A candidate" },
            context: job ? { label: job.title, href: `/applications/${job.slug}` } : null,
            href: job ? `/applications/${job.slug}?send=${sendId}` : null,
        }).catch((e: unknown) => console.error("notify STUDENT_OUTCOME:", e))
        revalidatePath("/jobs")
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("setStudentOutcome:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not save" }
    }
}
