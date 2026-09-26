"use server"

import { and, count, eq, gte, ne } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, backgroundJobs, importedJobs, isTerminalJobStatus, jobs, pathfinderGoals, users } from "@repo/db"
import { companyFromTitle } from "@repo/exa/job-page"
import { jobUrlHash, normaliseJobUrl } from "@repo/db/job-import-url"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"
import { jobHoldId, releaseCredits, settleCredits } from "@/lib/credits/hold"
import { priceOf } from "@/lib/credits/pricing"
import { callWorker } from "@/lib/workers/client"
import { issueWorkerToken } from "@/lib/workers/token"

/*
 * "Practise any job" (plan/job-import JI-6): a pasted link or text becomes an
 * `imported_job`, built by the `job_import` worker job into a pipeline.
 *
 * The decisions are in plan/job-import/overview.md (Visibility and cost): a
 * public import is free, 3 new ones in a rolling 24 hours; a private one holds
 * 15 credits, settled at READY and refunded if it fails; practising an import
 * that already exists is free. A job already on ShipItHQ goes straight to its
 * own rounds.
 */

/** New public imports per student in a rolling 24 hours (overview.md, "Daily cap"). */
const PUBLIC_IMPORTS_PER_DAY = 3
const DAY_MS = 86_400_000
const MIN_TEXT = 200
const MAX_TEXT = 20_000

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

export type ImportOutcome =
    /** The job is on ShipItHQ already: practise its own rounds. */
    | { kind: "on_platform"; href: string }
    /** An import, new or existing; the page follows its status. */
    | { kind: "import"; importId: string; existing: boolean }

export interface ImportView {
    id: string
    status: string
    step: string | null
    error: string | null
    visibility: "PUBLIC" | "PRIVATE"
    title: string | null
    /** The posting's seniority, as read (JI-3). */
    level: "INTERN" | "ENTRY" | "MID" | "SENIOR" | "LEAD" | null
    companyName: string | null
    companyId: string | null
    companyRequestId: string | null
    processId: string | null
    notPractisable: { name: string; reason: string }[]
    progress: number
    isOwner: boolean
    /** Waiting for the posting's text: this viewer may paste it. */
    canResume: boolean
}

async function currentUserId(): Promise<string | null> {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

/** A link to one of our own job pages ("/jobs/<slug>"), on this app's host. */
function onPlatformSlug(normalised: string): string | null {
    const url = new URL(normalised)
    const own = new Set(["app.shipithq.com", "shipithq.com"])
    try { own.add(new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "").hostname.replace(/^www\./, "")) } catch { /* unset */ }
    if (!own.has(url.hostname)) return null
    return url.pathname.match(/^\/jobs\/([a-z0-9-]+)(?:\/rounds)?$/)?.[1] ?? null
}

/** Pasted text as one comparable string: the same posting pasted twice is one public import. */
const normaliseText = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase()

/**
 * Start an import, or return the one that already exists. Pass a link, or the
 * posting's text with the company's name.
 */
export async function importJob(input: { url?: string; text?: string; companyName?: string; visibility: "PUBLIC" | "PRIVATE" }): Promise<Result<ImportOutcome>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to practise a job.", code: "UNAUTHORIZED" }
    const visibility: "PUBLIC" | "PRIVATE" = input.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"

    let sourceUrl: string | null = null
    let sourceText: string | null = null
    let companyNameHint: string | null = null
    let hash: string
    if (input.url?.trim()) {
        sourceUrl = normaliseJobUrl(input.url)
        if (!sourceUrl) return { success: false, error: "That doesn't look like a link. Paste the job's full address, starting with https://." }
        const slug = onPlatformSlug(sourceUrl)
        if (slug) {
            const job = await db.query.jobs.findFirst({ where: eq(jobs.slug, slug), columns: { slug: true, interviewProcessId: true } })
            if (job) return { success: true, data: { kind: "on_platform", href: job.interviewProcessId ? `/jobs/${job.slug}/rounds` : `/jobs/${job.slug}` } }
        }
        hash = await jobUrlHash(sourceUrl)
    } else {
        const text = (input.text ?? "").trim()
        companyNameHint = (input.companyName ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || null
        if (text.length < MIN_TEXT) return { success: false, error: "Paste the whole posting: the role, what you'd do and what they ask for." }
        if (!companyNameHint || companyNameHint.length < 2) return { success: false, error: "Add the company's name." }
        sourceText = text.slice(0, MAX_TEXT)
        hash = await jobUrlHash(`text:${normaliseText(`${companyNameHint} ${sourceText}`)}`)
    }

    try {
        // Already imported publicly: anyone practises it free, private or not. A failed one is imported again.
        const [pub] = await db.select({ id: importedJobs.id, status: importedJobs.status }).from(importedJobs)
            .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PUBLIC"))).limit(1)
        if (pub && pub.status !== "FAILED") return { success: true, data: { kind: "import", importId: pub.id, existing: true } }

        // A second click on the same private import.
        if (visibility === "PRIVATE") {
            const [mine] = await db.select({ id: importedJobs.id }).from(importedJobs)
                .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.ownerId, userId), eq(importedJobs.visibility, "PRIVATE"), ne(importedJobs.status, "FAILED"))).limit(1)
            if (mine) return { success: true, data: { kind: "import", importId: mine.id, existing: true } }
        } else {
            // Rolling 24 hours; a failed import doesn't count, since it cost nothing.
            const [{ made } = { made: 0 }] = await db.select({ made: count() }).from(importedJobs).where(and(
                eq(importedJobs.ownerId, userId), eq(importedJobs.visibility, "PUBLIC"), ne(importedJobs.status, "FAILED"),
                gte(importedJobs.createdAt, new Date(Date.now() - DAY_MS)),
            ))
            if (Number(made) >= PUBLIC_IMPORTS_PER_DAY) {
                return {
                    success: false,
                    code: "DAILY_LIMIT",
                    error: `You've imported ${PUBLIC_IMPORTS_PER_DAY} public jobs in the last 24 hours. Import this one privately for ${priceOf("job_import_private")} credits, or come back later.`,
                }
            }
        }

        const cost = visibility === "PRIVATE" ? priceOf("job_import_private") : 0
        const fields = { sourceUrl, sourceText, companyNameHint, visibility, ownerId: userId, cost, status: "QUEUED" as const, step: null, error: null }
        let importId: string
        if (pub && visibility === "PUBLIC") {
            // The failed public row is reused, since its link can only have one public row.
            const [again] = await db.update(importedJobs).set({
                ...fields, extracted: null, plan: null, companyId: null, companyRequestId: null, processId: null, backgroundJobId: null, createdAt: new Date(), updatedAt: new Date(),
            }).where(and(eq(importedJobs.id, pub.id), eq(importedJobs.status, "FAILED"))).returning({ id: importedJobs.id })
            if (!again) return { success: true, data: { kind: "import", importId: pub.id, existing: true } }
            importId = again.id
        } else {
            const [row] = await db.insert(importedJobs).values({ ...fields, urlHash: hash }).onConflictDoNothing().returning({ id: importedJobs.id })
            if (!row) {
                // A double click (private: the owner's live import) or someone else a moment ago (public): that one.
                const [theirs] = await db.select({ id: importedJobs.id }).from(importedJobs)
                    .where(and(eq(importedJobs.urlHash, hash), visibility === "PRIVATE"
                        ? and(eq(importedJobs.visibility, "PRIVATE"), eq(importedJobs.ownerId, userId), ne(importedJobs.status, "FAILED"))
                        : eq(importedJobs.visibility, "PUBLIC"))).limit(1)
                return theirs ? { success: true, data: { kind: "import", importId: theirs.id, existing: true } } : { success: false, error: "Could not start the import. Try again." }
            }
            importId = row.id
        }

        const job = await startBackgroundJob("job_import", { importId }, cost ? { cost, reason: "Private job import" } : {})
        if (!job.success || !job.jobId) {
            await db.update(importedJobs).set({ status: "FAILED", error: job.error ?? "Could not start the import", updatedAt: new Date() }).where(eq(importedJobs.id, importId))
            if (job.code === "INSUFFICIENT_CREDITS") {
                return { success: false, code: job.code, error: `A private import costs ${cost} credits and you have ${job.available ?? 0}. Import it publicly for free instead.` }
            }
            return { success: false, error: job.error ?? "Could not start the import. Try again." }
        }
        await db.update(importedJobs).set({ backgroundJobId: job.jobId, updatedAt: new Date() }).where(eq(importedJobs.id, importId))
        return { success: true, data: { kind: "import", importId, existing: false } }
    } catch (error: unknown) {
        console.error("importJob:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start the import. Try again." }
    }
}

export interface ImportAllowance {
    signedIn: boolean
    publicLeft: number
    publicPerDay: number
    privatePrice: number
    credits: number
}

/** What the paste form shows: public imports left in the rolling 24 hours, and the private price against the balance. */
export async function getImportAllowance(): Promise<ImportAllowance> {
    const base = { publicPerDay: PUBLIC_IMPORTS_PER_DAY, privatePrice: priceOf("job_import_private") }
    const userId = await currentUserId()
    if (!userId) return { ...base, signedIn: false, publicLeft: PUBLIC_IMPORTS_PER_DAY, credits: 0 }
    const [[{ made } = { made: 0 }], [me]] = await Promise.all([
        db.select({ made: count() }).from(importedJobs).where(and(
            eq(importedJobs.ownerId, userId), eq(importedJobs.visibility, "PUBLIC"), ne(importedJobs.status, "FAILED"),
            gte(importedJobs.createdAt, new Date(Date.now() - DAY_MS)),
        )),
        db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)),
    ])
    return { ...base, signedIn: true, publicLeft: Math.max(0, PUBLIC_IMPORTS_PER_DAY - Number(made)), credits: me?.credits ?? 0 }
}

/**
 * The posting an interview-prep goal was made from, for "Practise this job's
 * rounds" on the goal (plan/job-import JI-8). The owner's own goal only. The
 * company is a guess from the scraped title or the company's site; the student
 * can correct it in the form.
 */
export async function getPrepGoalPosting(goalId: string): Promise<Result<{ text: string; company: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    const goal = await db.query.pathfinderGoals.findFirst({
        where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.category, "INTERVIEW_PREP")),
        columns: { userId: true, sourceJobDescription: true, sourceCompanyUrl: true, sourceCompanyInfo: true },
    })
    // Someone else's (public) goal: its posting is theirs to import, not the viewer's.
    if (goal && goal.userId !== userId) return { success: false, error: "Only the goal's owner can import its posting. Paste the job yourself instead.", code: "NOT_OWNER" }
    if (!goal?.sourceJobDescription) return { success: false, error: "This goal doesn't keep its posting. Paste the job instead.", code: "NO_POSTING" }
    const scrapedTitle = (goal.sourceCompanyInfo as { scrapedTitle?: string } | null)?.scrapedTitle ?? ""
    let company = scrapedTitle ? companyFromTitle(scrapedTitle) : ""
    if (!company && goal.sourceCompanyUrl) {
        try {
            const host = new URL(/^https?:\/\//i.test(goal.sourceCompanyUrl) ? goal.sourceCompanyUrl : `https://${goal.sourceCompanyUrl}`).hostname.replace(/^www\./, "")
            company = host.split(".")[0]!.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        } catch { /* not a URL */ }
    }
    return { success: true, data: { text: goal.sourceJobDescription.slice(0, MAX_TEXT), company } }
}

/** An import this viewer may see: any public one, or their own private one. */
async function visibleImport(importId: string, userId: string) {
    const row = await db.query.importedJobs.findFirst({ where: eq(importedJobs.id, importId) })
    if (!row) return null
    if (row.visibility === "PRIVATE" && row.ownerId !== userId) return null
    return row
}

/**
 * Where an import stands, for the page that follows it. Settles or refunds a
 * private import's credits the first time it's seen finished (both idempotent).
 */
export async function getImport(importId: string): Promise<Result<ImportView>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to see this import.", code: "UNAUTHORIZED" }
    try {
        const row = await visibleImport(importId, userId)
        if (!row) return { success: false, error: "That import doesn't exist.", code: "NOT_FOUND" }
        let progress = row.status === "READY" ? 100 : 0
        if (row.backgroundJobId) {
            const [job] = await db.select({ status: backgroundJobs.status, progress: backgroundJobs.progress, error: backgroundJobs.error })
                .from(backgroundJobs).where(eq(backgroundJobs.jobId, row.backgroundJobId)).limit(1)
            if (job) {
                progress = Math.max(progress, job.progress)
                if (row.cost > 0 && isTerminalJobStatus(job.status)) {
                    if (job.status === "completed") await settleCredits(jobHoldId(row.backgroundJobId))
                    else await releaseCredits(jobHoldId(row.backgroundJobId), job.error ?? "import failed")
                }
            }
        }
        const isOwner = row.ownerId === userId
        return {
            success: true,
            data: {
                id: row.id,
                status: row.status,
                step: row.step,
                error: row.error,
                visibility: row.visibility,
                title: row.extracted?.title ?? null,
                level: row.extracted?.level ?? null,
                companyName: row.extracted?.company.name ?? row.companyNameHint,
                companyId: row.companyId,
                companyRequestId: row.companyRequestId,
                processId: row.processId,
                notPractisable: row.plan?.notPractisable ?? [],
                progress,
                isOwner,
                canResume: row.status === "NEEDS_TEXT" && (isOwner || row.visibility === "PUBLIC"),
            },
        }
    } catch (error: unknown) {
        console.error("getImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not load the import." }
    }
}

/**
 * The link couldn't be read: the student pastes the posting (and the company)
 * and the same job continues from the start. A public import can be finished
 * by any student; a private one only by its owner.
 */
export async function resumeImport(importId: string, input: { text: string; companyName: string }): Promise<Result<{ importId: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    const text = input.text.trim()
    const companyName = input.companyName.replace(/\s+/g, " ").trim().slice(0, 120)
    if (text.length < MIN_TEXT) return { success: false, error: "Paste the whole posting: the role, what you'd do and what they ask for." }
    if (companyName.length < 2) return { success: false, error: "Add the company's name." }
    try {
        const row = await visibleImport(importId, userId)
        if (!row) return { success: false, error: "That import doesn't exist.", code: "NOT_FOUND" }
        // Already continuing (a second click, another tab, or another student's paste): nothing to do.
        if (row.status !== "NEEDS_TEXT" && row.status !== "FAILED") return { success: true, data: { importId } }
        if (row.status !== "NEEDS_TEXT" || !row.backgroundJobId) return { success: false, error: "This import isn't waiting for text.", code: "NOT_WAITING" }
        if (row.visibility === "PRIVATE" && row.ownerId !== userId) return { success: false, error: "That import doesn't exist.", code: "NOT_FOUND" }

        // Guarded on the status, so a double click writes once.
        const [claimed] = await db.update(importedJobs).set({ sourceText: text.slice(0, MAX_TEXT), companyNameHint: companyName, status: "QUEUED", step: "Reading the job", error: null, updatedAt: new Date() })
            .where(and(eq(importedJobs.id, importId), eq(importedJobs.status, "NEEDS_TEXT"))).returning({ id: importedJobs.id })
        if (!claimed) return { success: true, data: { importId } }

        // The worker writes NEEDS_TEXT on the row a moment before its job records "waiting", so an
        // early paste can get a 409 that means "not yet": try again briefly (a review finding).
        const resume = () => callWorker(`/api/v1/jobs/${row.backgroundJobId}/resume`, {
            token: issueWorkerToken(userId, row.backgroundJobId!, "resume_job"),
            body: { type: "job_import", step: "fetch" },
        })
        let res = await resume()
        for (let i = 0; i < 4 && res.status === 409; i++) {
            // Another tab resumed it: the row has already moved past QUEUED, nothing to do.
            const [now] = await db.select({ status: importedJobs.status }).from(importedJobs).where(eq(importedJobs.id, importId))
            if (now && now.status !== "QUEUED") break
            await new Promise((r) => setTimeout(r, 1000))
            res = await resume()
        }
        // Still 409 with the row untouched after 4 seconds: the job can't take it; put the form back.
        const stuck = res.status === 409 && (await db.select({ status: importedJobs.status }).from(importedJobs).where(eq(importedJobs.id, importId)))[0]?.status === "QUEUED"
        if ((!res.ok && res.status !== 409) || stuck) {
            await db.update(importedJobs).set({ status: "NEEDS_TEXT", step: null, error: "Couldn't continue just now. Try again." }).where(eq(importedJobs.id, importId))
            return { success: false, error: "Couldn't continue just now. Try again." }
        }
        return { success: true, data: { importId } }
    } catch (error: unknown) {
        console.error("resumeImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't continue just now. Try again." }
    }
}

/**
 * Give up on an import waiting for its text. Its owner only; a private one's
 * credits come back. The waiting job is left idle and is never resumed.
 */
export async function cancelImport(importId: string): Promise<Result<{ importId: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    try {
        const [row] = await db.update(importedJobs).set({ status: "FAILED", step: null, error: "Cancelled", updatedAt: new Date() })
            .where(and(eq(importedJobs.id, importId), eq(importedJobs.ownerId, userId), eq(importedJobs.status, "NEEDS_TEXT")))
            .returning({ jobId: importedJobs.backgroundJobId, cost: importedJobs.cost })
        if (!row) return { success: false, error: "Only an import waiting for its text can be cancelled." }
        if (row.jobId) {
            await db.update(backgroundJobs).set({ status: "failed", error: "Cancelled" }).where(eq(backgroundJobs.jobId, row.jobId))
            if (row.cost > 0) await releaseCredits(jobHoldId(row.jobId), "import cancelled")
        }
        return { success: true, data: { importId } }
    } catch (error: unknown) {
        console.error("cancelImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not cancel the import." }
    }
}
