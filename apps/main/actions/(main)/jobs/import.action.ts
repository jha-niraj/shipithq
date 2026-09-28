"use server"

import { and, count, desc, eq, gte, inArray, isNotNull, isNull, ne, or } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { db, backgroundJobs, importedJobs, isTerminalJobStatus, jobs, pathfinderGoals, users } from "@repo/db"
import { companyFromTitle } from "@repo/exa/job-page"
import { jobUrlHash, normaliseJobUrl } from "@repo/db/job-import-url"
import { guessJobFacts, unwrapJobText } from "@repo/db/job-text"
import { startBackgroundJob } from "@/actions/(main)/workers/jobs.action"
import { jobHoldId, releaseCredits, settleCredits } from "@/lib/credits/hold"
import { priceOf } from "@/lib/credits/pricing"
import { callWorker } from "@/lib/workers/client"
import { issueWorkerToken } from "@/lib/workers/token"

/*
 * "Practise any job" (plan/job-import JI-6): a pasted link or text becomes an
 * `imported_job`, built by the `job_import` worker job into a pipeline.
 *
 * Every import starts as its student's private draft: the page is read (or the paste
 * cleaned) and waits at REVIEW for them to check and edit it, free and uncounted
 * (JI-13). Build applies the decisions in plan/job-import/overview.md (Visibility
 * and cost): a public build is free, 3 in a rolling 24 hours; a private one holds
 * 15 credits, settled at READY and refunded if it fails; practising an import
 * that already exists is free. A job already on ShipItHQ goes straight to its
 * own rounds.
 */

/** New public imports per student in a rolling 24 hours (overview.md, "Daily cap"). */
const PUBLIC_IMPORTS_PER_DAY = 3
const DAY_MS = 86_400_000
const MIN_TEXT = 200
const MAX_TEXT = 20_000
/** The error a draft keeps when someone else's build of the same job came first: `DUPLICATE:<their id>`. */
const DUPLICATE = "DUPLICATE:"

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

export type ImportOutcome =
    /** The job is on ShipItHQ already: practise its own rounds. */
    | { kind: "on_platform"; href: string }
    /** An import, new or existing; the page follows its status. */
    | { kind: "import"; importId: string; existing: boolean }

export interface ImportView {
    id: string
    /** What was read from the link (or pasted), to show the student (JI; Niraj 2026-09-28). */
    sourceText: string | null
    sourceUrl: string | null
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
    /** Title, company and location as read, then as the student corrected them (JI-14). */
    facts: { title: string; company: string; location: string } | null
    /** Still the student's draft: not built yet (JI-15). */
    draft: boolean
    /** Someone's build of the same job came first; practise that one. */
    duplicateOf: string | null
    updatedAt: string
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
 * Start an import as the student's own draft (JI-13), or return one that already
 * exists. Pass a link, or the posting's text with the company's name. Nothing is
 * charged or counted here: the page is read (or the paste cleaned) and waits at
 * REVIEW for the student to check it; `buildImport` is where the cap and credits apply.
 */
export async function importJob(input: { url?: string; text?: string; companyName?: string }): Promise<Result<ImportOutcome>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to practise a job.", code: "UNAUTHORIZED" }

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
        // Already built publicly: anyone practises it free. A failed one can be imported again.
        const [pub] = await db.select({ id: importedJobs.id }).from(importedJobs)
            .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PUBLIC"), ne(importedJobs.status, "FAILED"))).limit(1)
        if (pub) return { success: true, data: { kind: "import", importId: pub.id, existing: true } }

        // The student's own draft or private build of the same job: back to where they were.
        const [mine] = await db.select({ id: importedJobs.id }).from(importedJobs)
            .where(and(eq(importedJobs.ownerId, userId), ne(importedJobs.status, "FAILED"), or(eq(importedJobs.draftHash, hash), and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PRIVATE")))))
            .orderBy(desc(importedJobs.createdAt)).limit(1)
        if (mine) return { success: true, data: { kind: "import", importId: mine.id, existing: true } }

        // A draft is private and unhashed until Build, so two students checking the same link never collide.
        const base = { sourceUrl, companyNameHint, visibility: "PRIVATE" as const, ownerId: userId, cost: 0, draftHash: hash, urlHash: null, step: null, error: null }
        if (sourceText) {
            // Pasted: nothing to read, so straight to the student's check (JI-13).
            const text = unwrapJobText(sourceText).slice(0, MAX_TEXT)
            const [row] = await db.insert(importedJobs).values({ ...base, status: "REVIEW", readText: sourceText, sourceText: text, facts: guessJobFacts("", text, companyNameHint) })
                .returning({ id: importedJobs.id })
            return { success: true, data: { kind: "import", importId: row!.id, existing: false } }
        }
        const [row] = await db.insert(importedJobs).values({ ...base, status: "QUEUED" }).returning({ id: importedJobs.id })
        const importId = row!.id
        const job = await startBackgroundJob("job_import", { importId }, {})
        if (!job.success || !job.jobId) {
            await db.update(importedJobs).set({ status: "FAILED", error: job.error ?? "Could not start the import", updatedAt: new Date() }).where(eq(importedJobs.id, importId))
            return { success: false, error: job.error ?? "Could not start the import. Try again." }
        }
        await db.update(importedJobs).set({ backgroundJobId: job.jobId, updatedAt: new Date() }).where(eq(importedJobs.id, importId))
        return { success: true, data: { kind: "import", importId, existing: false } }
    } catch (error: unknown) {
        console.error("importJob:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start the import. Try again." }
    }
}

export interface ImportFacts { title: string; company: string; location: string }

/** Autosave of the review step (JI-14): the owner's own draft, while it waits at REVIEW. */
export async function saveImportReview(importId: string, input: { facts: ImportFacts; text: string }): Promise<Result<{ savedAt: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    const clip = (s: string) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 120)
    const facts = { title: clip(input.facts.title), company: clip(input.facts.company), location: clip(input.facts.location) }
    try {
        const [row] = await db.update(importedJobs).set({ facts, sourceText: (input.text ?? "").slice(0, MAX_TEXT), updatedAt: new Date() })
            .where(and(eq(importedJobs.id, importId), eq(importedJobs.ownerId, userId), eq(importedJobs.status, "REVIEW")))
            .returning({ at: importedJobs.updatedAt })
        if (!row) return { success: false, error: "This job isn't waiting for your check any more.", code: "NOT_REVIEW" }
        return { success: true, data: { savedAt: row.at.toISOString() } }
    } catch (error: unknown) {
        console.error("saveImportReview:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't save your edits. They're still here; try again." }
    }
}

/** "Read the page again" (JI-14): the owner's draft of a link goes back through the read. Free. */
export async function rereadImport(importId: string): Promise<Result<{ importId: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    try {
        const [row] = await db.update(importedJobs).set({ status: "QUEUED", step: "Reading the job", error: null, sourceText: null, readText: null, facts: null, updatedAt: new Date() })
            .where(and(eq(importedJobs.id, importId), eq(importedJobs.ownerId, userId), isNull(importedJobs.builtAt), isNotNull(importedJobs.sourceUrl), inArray(importedJobs.status, ["REVIEW", "NEEDS_TEXT"])))
            .returning({ id: importedJobs.id, jobId: importedJobs.backgroundJobId })
        if (!row) return { success: false, error: "Only a link you haven't built yet can be read again." }
        // A read left waiting for pasted text is replaced by the new one.
        if (row.jobId) await db.update(backgroundJobs).set({ status: "failed", error: "Read again" }).where(and(eq(backgroundJobs.jobId, row.jobId), eq(backgroundJobs.status, "waiting")))
        const job = await startBackgroundJob("job_import", { importId }, {})
        if (!job.success || !job.jobId) {
            await db.update(importedJobs).set({ status: "NEEDS_TEXT", step: null, error: "Couldn't read the page again just now. Paste the text instead." }).where(eq(importedJobs.id, importId))
            return { success: false, error: job.error ?? "Couldn't read the page again. Try again." }
        }
        await db.update(importedJobs).set({ backgroundJobId: job.jobId }).where(eq(importedJobs.id, importId))
        return { success: true, data: { importId } }
    } catch (error: unknown) {
        console.error("rereadImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't read the page again. Try again." }
    }
}

/** A unique-index clash from Postgres (a public build of the same link won the race). */
const isUniqueViolation = (e: unknown) => {
    const err = e as { code?: string; cause?: { code?: string } } | null
    return err?.code === "23505" || err?.cause?.code === "23505"
}

/**
 * Build (JI-15): the student checked the text; now the cap or the credits apply and the
 * model runs. The draft's hash becomes the import's `url_hash`, so a public build is the
 * one shared import of that link. Someone else built it publicly first: the student goes
 * there, free, and this draft is kept as a duplicate pointing at it.
 */
export async function buildImport(importId: string, visibility: "PUBLIC" | "PRIVATE"): Promise<Result<ImportOutcome>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    const vis: "PUBLIC" | "PRIVATE" = visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
    try {
        const row = await db.query.importedJobs.findFirst({ where: and(eq(importedJobs.id, importId), eq(importedJobs.ownerId, userId)) })
        if (!row) return { success: false, error: "That import doesn't exist.", code: "NOT_FOUND" }
        if (row.status !== "REVIEW") return { success: true, data: { kind: "import", importId, existing: true } }
        const text = (row.sourceText ?? "").trim()
        if (text.length < MIN_TEXT) return { success: false, error: "The posting is too short to build from. Add the role, what you'd do and what they ask for." }
        const company = row.facts?.company?.trim() ?? ""
        if (company.length < 2) return { success: false, error: "Add the company's name." }
        const hash = row.draftHash ?? await jobUrlHash(`text:${normaliseText(`${company} ${text}`)}`)

        const [pub] = await db.select({ id: importedJobs.id }).from(importedJobs)
            .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PUBLIC"), ne(importedJobs.status, "FAILED"))).limit(1)
        const duplicateOf = async (id: string): Promise<Result<ImportOutcome>> => {
            await db.update(importedJobs).set({ status: "FAILED", error: `${DUPLICATE}${id}`, updatedAt: new Date() }).where(eq(importedJobs.id, importId))
            return { success: true, data: { kind: "import", importId: id, existing: true } }
        }
        if (pub) return duplicateOf(pub.id)

        if (vis === "PUBLIC") {
            const [{ made } = { made: 0 }] = await db.select({ made: count() }).from(importedJobs).where(and(
                eq(importedJobs.ownerId, userId), eq(importedJobs.visibility, "PUBLIC"), ne(importedJobs.status, "FAILED"),
                gte(importedJobs.builtAt, new Date(Date.now() - DAY_MS)),
            ))
            if (Number(made) >= PUBLIC_IMPORTS_PER_DAY) {
                return {
                    success: false,
                    code: "DAILY_LIMIT",
                    error: `You've built ${PUBLIC_IMPORTS_PER_DAY} public jobs in the last 24 hours. Build this one privately for ${priceOf("job_import_private")} credits, or come back later.`,
                }
            }
            // A failed public build of the link holds the one public slot: free it.
            await db.update(importedJobs).set({ urlHash: null }).where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PUBLIC"), eq(importedJobs.status, "FAILED")))
        } else {
            const [mine] = await db.select({ id: importedJobs.id }).from(importedJobs)
                .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.ownerId, userId), eq(importedJobs.visibility, "PRIVATE"), ne(importedJobs.status, "FAILED"))).limit(1)
            if (mine) return duplicateOf(mine.id)
        }

        const cost = vis === "PRIVATE" ? priceOf("job_import_private") : 0
        let claimed: { id: string } | undefined
        try {
            // Guarded on REVIEW, so a double click builds once.
            ;[claimed] = await db.update(importedJobs).set({
                visibility: vis, cost, urlHash: hash, builtAt: new Date(), companyNameHint: company,
                status: "QUEUED", step: "Reading the job", error: null, updatedAt: new Date(),
            }).where(and(eq(importedJobs.id, importId), eq(importedJobs.status, "REVIEW"))).returning({ id: importedJobs.id })
        } catch (e: unknown) {
            if (!isUniqueViolation(e)) throw e
            // Someone else's public build of the link landed a moment ago.
            const [theirs] = await db.select({ id: importedJobs.id }).from(importedJobs)
                .where(and(eq(importedJobs.urlHash, hash), eq(importedJobs.visibility, "PUBLIC"))).limit(1)
            if (theirs) return duplicateOf(theirs.id)
            throw e
        }
        if (!claimed) return { success: true, data: { kind: "import", importId, existing: true } }

        const job = await startBackgroundJob("job_import", { importId, build: true }, cost ? { cost, reason: "Private job import" } : {})
        if (!job.success || !job.jobId) {
            // Back to the student's check, uncharged and uncounted.
            await db.update(importedJobs).set({ visibility: "PRIVATE", cost: 0, urlHash: null, builtAt: null, status: "REVIEW", step: null, error: null, updatedAt: new Date() }).where(eq(importedJobs.id, importId))
            if (job.code === "INSUFFICIENT_CREDITS") {
                return { success: false, code: job.code, error: `A private build costs ${cost} credits and you have ${job.available ?? 0}. Build it publicly for free instead.` }
            }
            return { success: false, error: job.error ?? "Could not start building. Try again." }
        }
        await db.update(importedJobs).set({ backgroundJobId: job.jobId, updatedAt: new Date() }).where(eq(importedJobs.id, importId))
        return { success: true, data: { kind: "import", importId, existing: false } }
    } catch (error: unknown) {
        console.error("buildImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not start building. Try again." }
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
            gte(importedJobs.builtAt, new Date(Date.now() - DAY_MS)),
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
                sourceText: row.sourceText,
                sourceUrl: row.sourceUrl,
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
                facts: row.facts ?? null,
                draft: !row.builtAt && Boolean(row.draftHash),
                duplicateOf: row.error?.startsWith(DUPLICATE) ? row.error.slice(DUPLICATE.length) : null,
                updatedAt: row.updatedAt.toISOString(),
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
 * Give up on an import waiting for its text, or on a draft not built yet (JI-14's
 * "Discard"). Its owner only; a private one's credits come back. A waiting job is
 * left idle and is never resumed.
 */
export async function cancelImport(importId: string): Promise<Result<{ importId: string }>> {
    const userId = await currentUserId()
    if (!userId) return { success: false, error: "Sign in to continue.", code: "UNAUTHORIZED" }
    try {
        const [row] = await db.update(importedJobs).set({ status: "FAILED", step: null, error: "Cancelled", updatedAt: new Date() })
            .where(and(eq(importedJobs.id, importId), eq(importedJobs.ownerId, userId), or(eq(importedJobs.status, "NEEDS_TEXT"), and(eq(importedJobs.status, "REVIEW"), isNull(importedJobs.builtAt)))))
            .returning({ jobId: importedJobs.backgroundJobId, cost: importedJobs.cost })
        if (!row) return { success: false, error: "Only an import waiting for its text, or one you haven't built, can be cancelled." }
        if (row.jobId) {
            await db.update(backgroundJobs).set({ status: "failed", error: "Cancelled" }).where(and(eq(backgroundJobs.jobId, row.jobId), eq(backgroundJobs.status, "waiting")))
            if (row.cost > 0) await releaseCredits(jobHoldId(row.jobId), "import cancelled")
        }
        return { success: true, data: { importId } }
    } catch (error: unknown) {
        console.error("cancelImport:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not cancel the import." }
    }
}

export interface MyImport {
    id: string
    title: string
    company: string
    /** What the list says: the student's next move or where the build is. */
    state: "reading" | "review" | "needs_text" | "building" | "ready" | "failed" | "duplicate" | "cancelled"
    visibility: "PUBLIC" | "PRIVATE"
    href: string
    at: string
}

/** A row's place in the student's list (JI-16). */
function importState(r: { status: string; error: string | null }): MyImport["state"] {
    if (r.status === "FAILED") return r.error?.startsWith(DUPLICATE) ? "duplicate" : r.error === "Cancelled" ? "cancelled" : "failed"
    if (r.status === "QUEUED" || r.status === "FETCHING") return "reading"
    if (r.status === "REVIEW") return "review"
    if (r.status === "NEEDS_TEXT") return "needs_text"
    if (r.status === "READY") return "ready"
    return "building"
}

/**
 * The viewer's own imports, newest first (JI-16, JI-17): drafts included, so one left
 * mid-review can be picked up where it was.
 */
export async function listMyImports(limit = 30): Promise<MyImport[]> {
    const userId = await currentUserId()
    if (!userId) return []
    const rows = await db.select({
        id: importedJobs.id, status: importedJobs.status, error: importedJobs.error, visibility: importedJobs.visibility,
        facts: importedJobs.facts, extracted: importedJobs.extracted, hint: importedJobs.companyNameHint, sourceUrl: importedJobs.sourceUrl,
        updatedAt: importedJobs.updatedAt,
    }).from(importedJobs).where(eq(importedJobs.ownerId, userId)).orderBy(desc(importedJobs.updatedAt)).limit(Math.min(Math.max(limit, 1), 100))
    return rows.map((r) => {
        const state = importState(r)
        let host = ""
        try { host = r.sourceUrl ? new URL(r.sourceUrl).hostname.replace(/^www\./, "") : "" } catch { /* not a URL */ }
        return {
            id: r.id,
            title: r.extracted?.title || r.facts?.title || (host ? `A job on ${host}` : "A pasted job"),
            company: r.extracted?.company.name || r.facts?.company || r.hint || "",
            state,
            visibility: r.visibility,
            href: `/jobs/import/${state === "duplicate" ? r.error!.slice(DUPLICATE.length) : r.id}`,
            at: r.updatedAt.toISOString(),
        }
    })
}
