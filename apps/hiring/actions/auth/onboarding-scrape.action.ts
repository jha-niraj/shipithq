"use server"

import crypto from "crypto"
import { headers } from "next/headers"
import { and, desc, eq, gt, inArray } from "drizzle-orm"
import { backgroundJobs, companyProfileDrafts, db, isTerminalJobStatus, type CompanyDraftFields } from "@repo/db"
import { getSession } from "@repo/auth"
import { checkWorkEmail } from "@repo/auth/work-email"
import { dispatchJob } from "@/lib/workers"

/*
 * Onboarding reads the owner's website first (plan/hiring-ui HU-14, Niraj
 * 2026-09-28): the same `company_scrape` worker job an admin or a student's
 * request uses (HR-5), on gpt-4o, free to the company and once per company. The
 * owner then keeps or skips each field it found. Only the owner's own domain can
 * be read (the work email's, or a subdomain of it), so this is never a free
 * scraper for someone else's site.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

/** A finished read is reused for this long instead of reading the site again. */
const REUSE_DAYS = 30

export type OnboardingScrape =
    | { status: "reading" }
    | { status: "ready"; fields: CompanyDraftFields; pages: number }
    | { status: "failed"; error: string }

function hostOf(raw: string): string | null {
    try {
        const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
        return url.hostname.toLowerCase().replace(/^www\./, "")
    } catch {
        return null
    }
}

async function signedInOwner() {
    const session = await getSession(await headers())
    if (!session?.user?.id) return null
    const email = checkWorkEmail(session.user.email ?? "")
    if (!email.ok) return null
    return { userId: session.user.id, domain: email.domain.toLowerCase() }
}

/** Start reading the site (or reuse a recent read of it). Returns the draft to poll. */
export async function startOnboardingScrape(website: string): Promise<Result<{ draftId: string }>> {
    const me = await signedInOwner()
    if (!me) return { success: false, error: "Sign in with your work email first" }
    const host = hostOf(website)
    if (!host) return { success: false, error: "That doesn't look like a website address" }
    if (host !== me.domain && !host.endsWith(`.${me.domain}`)) {
        return { success: false, error: `We can read ${me.domain}, your email's domain. Fill the rest in by hand.` }
    }

    try {
        // A read already running, or a good one from the last month: use it, free and instant.
        const recent = await db.query.companyProfileDrafts.findFirst({
            where: and(
                eq(companyProfileDrafts.domain, me.domain),
                inArray(companyProfileDrafts.status, ["SCRAPING", "READY", "PUBLISHED"]),
                gt(companyProfileDrafts.createdAt, new Date(Date.now() - REUSE_DAYS * 86_400_000)),
            ),
            orderBy: [desc(companyProfileDrafts.createdAt)],
            columns: { id: true },
        })
        if (recent) return { success: true, data: { draftId: recent.id } }

        const [draft] = await db.insert(companyProfileDrafts).values({ domain: me.domain, createdByUserId: me.userId })
            .onConflictDoNothing().returning({ id: companyProfileDrafts.id })
        if (!draft) return { success: false, error: "Your site is being read already. Try again in a moment." }

        const jobId = crypto.randomUUID()
        const input = { draftId: draft.id }
        await db.batch([
            db.insert(backgroundJobs).values({ jobId, type: "company_scrape", status: "waiting", progress: 0, input, userId: me.userId }),
            db.update(companyProfileDrafts).set({ workerJobId: jobId }).where(eq(companyProfileDrafts.id, draft.id)),
        ])
        try {
            await dispatchJob("company_scrape", jobId, me.userId, input)
        } catch (error: unknown) {
            const reason = (error instanceof Error ? error.message : "The job worker could not be reached").slice(0, 500)
            await db.batch([
                db.update(backgroundJobs).set({ status: "failed", error: reason }).where(eq(backgroundJobs.jobId, jobId)),
                db.update(companyProfileDrafts).set({ status: "FAILED", error: reason }).where(eq(companyProfileDrafts.id, draft.id)),
            ])
            return { success: false, error: "We couldn't start reading your site. Fill it in by hand; you can change everything later." }
        }
        return { success: true, data: { draftId: draft.id } }
    } catch (error: unknown) {
        console.error("startOnboardingScrape:", error instanceof Error ? error.message : error)
        return { success: false, error: "We couldn't start reading your site" }
    }
}

/** Where the read is. Only the person who started it (or anyone on the same domain) may look. */
export async function getOnboardingScrape(draftId: string): Promise<Result<OnboardingScrape>> {
    const me = await signedInOwner()
    if (!me) return { success: false, error: "Sign in with your work email first" }
    const draft = await db.query.companyProfileDrafts.findFirst({ where: eq(companyProfileDrafts.id, draftId) })
    if (!draft || draft.domain !== me.domain) return { success: false, error: "Not found" }

    if (draft.status === "READY" || draft.status === "PUBLISHED") {
        return { success: true, data: { status: "ready", fields: draft.fields, pages: draft.sourcePages.length } }
    }
    if (draft.status === "FAILED" || draft.status === "DISCARDED") {
        return { success: true, data: { status: "failed", error: draft.error ?? "Your site couldn't be read" } }
    }
    // Still SCRAPING: if the job itself ended without writing the draft, say so rather than wait forever.
    if (draft.workerJobId) {
        const job = await db.query.backgroundJobs.findFirst({ where: eq(backgroundJobs.jobId, draft.workerJobId), columns: { status: true, error: true } })
        if (job && isTerminalJobStatus(job.status) && job.status !== "completed") {
            const error = job.error ?? "The read stopped without finishing"
            await db.update(companyProfileDrafts).set({ status: "FAILED", error: error.slice(0, 500) })
                .where(and(eq(companyProfileDrafts.id, draft.id), eq(companyProfileDrafts.status, "SCRAPING")))
            return { success: true, data: { status: "failed", error } }
        }
    }
    return { success: true, data: { status: "reading" } }
}
