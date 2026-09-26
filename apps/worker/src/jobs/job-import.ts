import { and, count, eq, inArray, isNull, ne, or, sql } from "drizzle-orm"
import { modelFor, type AiTask } from "@repo/ai"
import { exaSearch } from "@repo/exa"
import { companyLoops, pickLoop, roleGroupOf } from "@repo/db/company-loop"
import { BEHAVIOURAL_KNOWLEDGE, BEHAVIOURAL_RUBRIC, CULTURE_KNOWLEDGE, CULTURE_RUBRIC, PLATFORM_COOLDOWN_HOURS, POOL_TO_DRAW_RATIO } from "@repo/db/hiring-defaults"
import type { ImportedJobExtract, ImportedJobPlanRound } from "@repo/db/schema"
import { JOB_BINDINGS, type RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { SteppedJob } from "./stepped-job"
import type { StepContext, StepOutcome } from "./stepped-core"
import {
    EXTRACT_SYSTEM, MAX_JOB_TEXT, MODEL_TIMEOUT_MS, NOT_A_COMPANY_SITE, PLAN_SYSTEM, type ReportedLoopForPlan, ROUND_RULES, aptitudeSystem, bareDomain,
    designSystem, dsaSystem, extractUser, nearestDifficulty, normaliseCompanyName, notCompanySite, pickCompanySite, planUser,
    readJobPage, resolveDomain, validateAptitude, validateDesign, validateDsa, validateExtract, validatePlan, validateVoice,
    voiceSystem, type Check,
} from "./job-import-core"

const {
    importedJobs, companies, companyRequests, companyRequestVotes, companyProfileDrafts, backgroundJobs,
    interviewProcesses, interviewRounds, hiringRoundPoolItems, aptitudeQuestions, designPrompts, practiceProblem,
} = schema

type PoolItem = { kind: "PRACTICE_PROBLEM" | "APTITUDE_QUESTION" | "DESIGN_PROMPT"; refId: string; status: "LIVE" | "DRAFT" }
/** What one round step writes onto its round. */
interface BuiltRound {
    description: string
    topics: string[]
    pool: PoolItem[]
    rubric?: unknown
    mockKnowledgeBase?: string
}

/** What the company step did, for the log and the test. */
type CompanyLink = "company" | "request" | "requested" | "ambiguous" | "unlinked"

/*
 * job_import (plan/job-import): a pasted job becomes a practisable pipeline, one
 * alarm per step. The `imported_job` row is the source of truth and each step
 * writes its status there, so the app shows real progress and a stall is
 * visible. The input is only the row's id.
 *
 *   fetch     read the link (Firecrawl, then Exa); unreadable -> NEEDS_TEXT, wait
 *   extract   model call 1, strict schema; no company named -> NEEDS_TEXT, wait
 *   company   match or request the company (JI-4)
 *   plan      model call 2: the rounds (JI-5)
 *   round     one alarm per round (JI-5)
 *   ready     the pipeline, status READY (JI-5)
 *
 * The app resumes a waiting job from "fetch" once the student has pasted the
 * text (and the company name) onto the row.
 */

export interface JobImportInput { importId: string }
export interface JobImportState { round?: number; rounds?: number; processId?: string }

const LABEL: Record<string, string> = {
    fetch: "Reading the job",
    extract: "Reading the job",
    company: "Finding the company",
    plan: "Planning the rounds",
    ready: "Putting it together",
}

export class JobImport extends SteppedJob<JobImportInput, JobImportState> {
    protected readonly jobType: RunnableJobType = "job_import"
    protected readonly firstStep = "fetch"
    protected override get initialPhaseLabel() { return "Reading the job" }

    protected initialState(): JobImportState { return {} }

    protected labelFor(name: string, state: JobImportState): string {
        if (name === "round" && state.rounds) return `Building round ${(state.round ?? 0) + 1} of ${state.rounds}`
        return LABEL[name] ?? "Working"
    }

    private async setRow(id: string, patch: Partial<typeof importedJobs.$inferInsert>) {
        await this.db().update(importedJobs).set({ ...patch, updatedAt: new Date() }).where(eq(importedJobs.id, id))
    }

    private async row(id: string) {
        const [r] = await this.db().select().from(importedJobs).where(eq(importedJobs.id, id))
        if (!r) throw new Error("That import no longer exists")
        return r
    }

    protected override async onFail(message: string, input: JobImportInput): Promise<void> {
        // The student reads this: our own messages pass; a provider's or a crash's becomes a plain line.
        const technical = /openai|quota|api error|took too long|timed? ?out|fetch failed|ECONN|Unknown step|is not a function|undefined|null/i.test(message)
        if (technical) console.error(`[job_import] ${input.importId} failed:`, message)
        const shown = technical ? "Something went wrong on our side while building the rounds. Try again in a few minutes." : message
        await this.setRow(input.importId, { status: "FAILED", error: shown.slice(0, 500), step: null })
        // A half-built pipeline never went live, so nothing drew from it: remove it and the prompts it drafted.
        const db = this.db()
        await db.batch([
            db.delete(interviewProcesses).where(and(eq(interviewProcesses.importedJobId, input.importId), eq(interviewProcesses.isActive, false))),
            db.delete(designPrompts).where(and(sql`${designPrompts.key} like ${`import-${input.importId}-%`}`, eq(designPrompts.status, "DRAFT"))),
        ])
    }

    protected async runStep(name: string, ctx: StepContext<JobImportInput, JobImportState>): Promise<StepOutcome<JobImportState>> {
        const id = ctx.input.importId
        switch (name) {
            case "fetch": return this.fetchStep(id, ctx.state)
            case "extract": return this.extractStep(id, ctx.state)
            case "company": return this.companyStep(id, ctx.userId, ctx.state)
            case "plan": return this.planStep(id, ctx.state)
            case "round": return this.roundStep(id, ctx.state)
            case "ready": return this.readyStep(id, ctx.state)
            default: throw new Error(`Unknown step "${name}"`)
        }
    }

    /** Read the link, unless the text is already on the row (pasted, or after a resume). */
    private async fetchStep(id: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        const row = await this.row(id)
        if (row.sourceText?.trim()) {
            await this.setRow(id, { status: "EXTRACTING", step: "Reading the job", error: null })
            return { state, next: "extract", progress: 15 }
        }
        if (!row.sourceUrl) {
            await this.setRow(id, { status: "NEEDS_TEXT", step: null, error: "Paste the job's text and the company name." })
            return { state, wait: "Waiting for the job's text" }
        }
        await this.setRow(id, { status: "FETCHING", step: "Reading the job", error: null })
        const page = await readJobPage(row.sourceUrl, { firecrawl: this.env.FIRECRAWL_API_KEY, exa: this.env.EXA_API_KEY })
        if (!page.ok) {
            await this.setRow(id, { status: "NEEDS_TEXT", step: null, error: page.reason })
            return { state, wait: "Waiting for the job's text" }
        }
        await this.setRow(id, {
            status: "EXTRACTING",
            step: "Reading the job",
            sourceText: page.text.slice(0, MAX_JOB_TEXT),
            // A company named in the page title ("Role at Acme") is a hint; the student's own wins.
            companyNameHint: row.companyNameHint ?? (page.companyGuess || null),
        })
        return { state, next: "extract", progress: 15 }
    }

    /** Model call 1, to the strict schema; a malformed reply is retried once. */
    private async extractStep(id: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        const row = await this.row(id)
        const text = row.sourceText ?? ""
        let check: ReturnType<typeof validateExtract> | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await chatJSON({
                apiKey: this.env.OPENAI_API_KEY,
                model: modelFor("jobImportExtract"),
                system: EXTRACT_SYSTEM,
                user: extractUser(text, row.companyNameHint),
                maxTokens: 1500,
                temperature: 0,
                timeoutMs: MODEL_TIMEOUT_MS,
            })
            let parsed: unknown = null
            try { parsed = JSON.parse(raw) } catch { parsed = null }
            check = validateExtract(parsed, row.companyNameHint)
            if (check.ok || check.reason !== "INVALID") break
        }
        if (!check || !check.ok) {
            if (check?.reason === "NO_COMPANY") {
                await this.setRow(id, { status: "NEEDS_TEXT", step: null, error: "The posting doesn't name the company. Add the company name." })
                return { state, wait: "Waiting for the company name" }
            }
            // Not a job page, or the model twice gave nothing usable: fail, and the app refunds.
            throw new Error(check?.reason === "NOT_A_JOB" ? "That page isn't a single job posting. Paste one job's link or text." : "We couldn't read that job. Try pasting its text.")
        }
        await this.setRow(id, { status: "COMPANY", step: "Finding the company", extracted: check.value })
        return { state, next: "company", progress: 30, label: "Finding the company" }
    }

    /**
     * Match or request the company (JI-4): by website domain, then by normalised
     * name. Unknown: look its site up and check the page names it (decision), then
     * vote on or make a company request and start its scrape without waiting. No
     * site, several matches, or a rejected domain: the job stays unlinked under the
     * company's name, which is the admin's flag. Safe to re-run.
     */
    private async companyStep(id: string, userId: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        const row = await this.row(id)
        const ex = row.extracted
        if (!ex) throw new Error("The job wasn't read yet")
        let how: CompanyLink = row.companyId ? "company" : row.companyRequestId ? "request" : "unlinked"
        if (how === "unlinked") how = await this.linkCompany(id, userId, ex.company.name, ex.company.website)
        console.log(`[job_import] ${id} company "${ex.company.name}"${ex.company.agency ? " (agency)" : ""}: ${how}`)
        await this.setRow(id, { status: "PLANNING", step: "Planning the rounds" })
        return { state, next: "plan", progress: 40, label: "Planning the rounds" }
    }

    private async linkCompany(id: string, userId: string, name: string, website: string | null): Promise<CompanyLink> {
        const stated = website ? bareDomain(website) : null
        const statedOk = stated && !notCompanySite(stated) ? stated : null

        // 1. The domain the posting states.
        if (statedOk) {
            const hit = await this.linkDomain(id, userId, statedOk)
            if (hit) return hit
        }

        // 2. The name, against companies and open requests. Several: leave it for an admin.
        const byName = await this.matchName(name)
        if (byName === "ambiguous") return "ambiguous"
        if (byName?.kind === "company") {
            await this.setRow(id, { companyId: byName.id })
            return "company"
        }
        if (byName?.kind === "request") {
            const hit = await this.linkDomain(id, userId, byName.domain)
            if (hit) return hit
        }

        // 3. Unknown: find its site, follow redirects, match once more, else request it.
        const found = statedOk ?? (await this.findSite(name))
        if (!found) return "unlinked"
        const domain = await resolveDomain(found)
        if (domain !== statedOk) {
            const hit = await this.linkDomain(id, userId, domain)
            if (hit) return hit
        }
        return this.request(id, userId, domain, name)
    }

    /** Link to whatever already owns the domain: a company, or a live request (with this student's vote). */
    private async linkDomain(id: string, userId: string, domain: string): Promise<CompanyLink | null> {
        const db = this.db()
        const [co] = await db.select({ id: companies.id }).from(companies).where(eq(companies.websiteDomain, domain)).limit(1)
        if (co) {
            await this.setRow(id, { companyId: co.id })
            return "company"
        }
        const [req] = await db.select().from(companyRequests).where(eq(companyRequests.domain, domain)).limit(1)
        if (!req) return null
        if (req.companyId) {
            await this.setRow(id, { companyId: req.companyId })
            return "company"
        }
        // A rejected domain isn't reopened by an import; the job stays unlinked for an admin.
        if (req.status === "REJECTED") return "unlinked"
        await db.insert(companyRequestVotes).values({ requestId: req.id, userId }).onConflictDoNothing()
        await this.setRow(id, { companyRequestId: req.id })
        await this.ensureDraft(req.id, domain, userId)
        return "request"
    }

    /** One company or open request whose normalised name equals this one; "ambiguous" if several. */
    private async matchName(name: string): Promise<{ kind: "company"; id: string } | { kind: "request"; domain: string } | "ambiguous" | null> {
        const key = normaliseCompanyName(name)
        const first = key.split(" ")[0]
        if (!first || first.length < 2) return null
        const like = `%${first}%`
        const db = this.db()
        const [cos, reqs] = await Promise.all([
            db.select({ id: companies.id, name: companies.name }).from(companies).where(sql`lower(${companies.name}) like ${like}`).limit(50),
            db.select({ id: companyRequests.id, name: companyRequests.name, domain: companyRequests.domain, companyId: companyRequests.companyId })
                .from(companyRequests).where(and(sql`lower(${companyRequests.name}) like ${like}`, ne(companyRequests.status, "REJECTED"))).limit(50),
        ])
        const coHits = cos.filter((c) => normaliseCompanyName(c.name) === key)
        // A published request is its company, already counted above.
        const reqHits = reqs.filter((r) => !r.companyId && normaliseCompanyName(r.name) === key)
        if (coHits.length + reqHits.length > 1) return "ambiguous"
        if (coHits[0]) return { kind: "company", id: coHits[0].id }
        if (reqHits[0]) return { kind: "request", domain: reqHits[0].domain }
        return null
    }

    /** The company's own site from one Exa search, accepted only if its page names the company. */
    private async findSite(name: string): Promise<string | null> {
        if (!this.env.EXA_API_KEY) {
            console.warn("[job_import] EXA_API_KEY is not set: an unknown company's site can't be looked up")
            return null
        }
        try {
            const results = await exaSearch(this.env.EXA_API_KEY, `${name} company official website`, 6, {
                category: "company",
                excludeDomains: NOT_A_COMPANY_SITE,
                maxChars: 1500,
                timeoutMs: 15_000,
            })
            return pickCompanySite(results, name)
        } catch (error: unknown) {
            console.warn("[job_import] site lookup:", error instanceof Error ? error.message : error)
            return null
        }
    }

    /** A new company request for the domain, this student's vote, and its scrape (HR-7's flow, free). */
    private async request(id: string, userId: string, domain: string, name: string): Promise<CompanyLink> {
        const db = this.db()
        const [req] = await db.insert(companyRequests).values({ domain, name: name.slice(0, 80), createdByUserId: userId })
            .onConflictDoNothing().returning({ id: companyRequests.id })
        if (!req) {
            // Asked for a moment ago, or rejected: whatever owns the domain decides.
            return (await this.linkDomain(id, userId, domain)) ?? "unlinked"
        }
        await db.insert(companyRequestVotes).values({ requestId: req.id, userId }).onConflictDoNothing()
        await this.setRow(id, { companyRequestId: req.id })
        await this.ensureDraft(req.id, domain, userId)
        return "requested"
    }

    /**
     * Make sure the request has a draft being read or waiting for review; if not,
     * start `company_scrape` and return without waiting for it. A re-run after an
     * eviction lands here too, so a request is never left without its scrape.
     */
    private async ensureDraft(requestId: string, domain: string, userId: string): Promise<void> {
        const db = this.db()
        const [have] = await db.select({ id: companyProfileDrafts.id }).from(companyProfileDrafts)
            .where(and(
                inArray(companyProfileDrafts.status, ["SCRAPING", "READY"]),
                or(eq(companyProfileDrafts.requestId, requestId), eq(companyProfileDrafts.domain, domain)),
            )).limit(1)
        if (have) return

        const [draft] = await db.insert(companyProfileDrafts).values({ domain, requestId, createdByUserId: userId })
            .onConflictDoNothing().returning({ id: companyProfileDrafts.id })
        if (!draft) {
            // A scrape of the domain started meanwhile: the request joins it.
            await db.batch([
                db.update(companyProfileDrafts).set({ requestId }).where(and(eq(companyProfileDrafts.domain, domain), eq(companyProfileDrafts.status, "SCRAPING"))),
                db.update(companyRequests).set({ status: "SCRAPING" }).where(eq(companyRequests.id, requestId)),
            ])
            return
        }

        const jobId = crypto.randomUUID()
        try {
            await db.insert(backgroundJobs).values({ jobId, type: "company_scrape", status: "waiting", progress: 0, input: { draftId: draft.id }, userId })
            const ns = this.env[JOB_BINDINGS.company_scrape]
            const res = await ns.get(ns.idFromName(jobId)).fetch("https://do/start", {
                method: "POST",
                body: JSON.stringify({ jobId, userId, input: { draftId: draft.id } }),
            })
            if (!res.ok) throw new Error(`The scrape could not be started (${res.status})`)
            await db.batch([
                db.update(companyProfileDrafts).set({ workerJobId: jobId }).where(eq(companyProfileDrafts.id, draft.id)),
                db.update(companyRequests).set({ status: "SCRAPING" }).where(eq(companyRequests.id, requestId)),
            ])
        } catch (error: unknown) {
            // The request stands; the admin queue shows the failed draft and can retry it.
            const message = error instanceof Error ? error.message : "The scrape could not be started"
            await db.update(companyProfileDrafts).set({ status: "FAILED", error: message.slice(0, 500) }).where(eq(companyProfileDrafts.id, draft.id))
        }
    }

    // ── Rounds (JI-5) ────────────────────────────────────────────────────────

    /** One model call to a strict check, retried once when the reply doesn't pass. */
    private async ask<T>(task: AiTask, system: string, user: string, check: (raw: unknown) => Check<T>, maxTokens: number): Promise<Check<T>> {
        let last: Check<T> = { ok: false, detail: "no reply" }
        for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await chatJSON({ apiKey: this.env.OPENAI_API_KEY, model: modelFor(task), system, user, maxTokens, temperature: 0.2, timeoutMs: MODEL_TIMEOUT_MS })
            let parsed: unknown = null
            try { parsed = JSON.parse(raw) } catch { parsed = null }
            last = check(parsed)
            if (last.ok) return last
            console.warn(`[job_import] ${task} attempt ${attempt + 1}: ${last.detail}`)
        }
        return last
    }

    /**
     * Model call 2: the rounds. Then the pipeline's rows, inactive until the
     * ready step: one IMPORTED interview_process and a round per planned round.
     */
    private async planStep(id: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        const row = await this.row(id)
        const ex = row.extracted
        if (!ex) throw new Error("The job wasn't read yet")
        let plan = row.plan
        if (!plan) {
            const loop = row.companyId ? await this.reportedLoop(row.companyId, ex) : null
            const check = await this.ask("jobImportPlan", PLAN_SYSTEM, planUser(ex, loop), (raw) => validatePlan(raw, ex.level), 1500)
            if (!check.ok) throw new Error("We couldn't plan this job's rounds. Try again.")
            plan = check.value
            await this.setRow(id, { plan })
        }

        const db = this.db()
        let [proc] = await db.select({ id: interviewProcesses.id }).from(interviewProcesses).where(eq(interviewProcesses.importedJobId, id)).limit(1)
        if (!proc) {
            ;[proc] = await db.insert(interviewProcesses).values({
                ownerKind: "IMPORTED",
                importedJobId: id,
                companyId: row.companyId,
                isTemplate: false,
                isActive: false,
                name: `${ex.title} at ${ex.company.name}`.slice(0, 200),
                description: `Built by ShipItHQ from a posting a student imported. ${plan.rounds.length} rounds.`,
                updatedAt: new Date(),
            }).returning({ id: interviewProcesses.id })
        }
        await db.insert(interviewRounds).values(plan.rounds.map((r, i) => {
            const rule = ROUND_RULES[r.type]
            return {
                processId: proc!.id,
                roundNumber: i + 1,
                roundType: r.type,
                title: r.title,
                description: r.reason || r.title,
                format: rule.format,
                gateMode: r.gate,
                passMark: r.passMark,
                timeLimitMinutes: r.timeLimitMinutes,
                drawCount: r.drawCount,
                durationMinutes: r.timeLimitMinutes,
                cooldownHours: PLATFORM_COOLDOWN_HOURS,
                responseMode: rule.responseMode,
                hasMockInterview: false,
                updatedAt: new Date(),
            }
        })).onConflictDoNothing()

        const next = { ...state, round: 0, rounds: plan.rounds.length, processId: proc!.id }
        await this.setRow(id, { status: "ROUNDS", step: `Building round 1 of ${plan.rounds.length}` })
        return { state: next, next: "round", progress: 50 }
    }

    /**
     * The company's reported loop for this posting's role group (JI-11): the
     * family from the title, the level as read; the same family at another level
     * when the exact group has none, labelled so. Null: plan from the posting only.
     */
    private async reportedLoop(companyId: string, ex: ImportedJobExtract): Promise<ReportedLoopForPlan | null> {
        try {
            const guess = roleGroupOf(ex.title)
            const level = ex.level === "LEAD" ? "SENIOR" : ex.level ?? guess.level
            const g = pickLoop(await companyLoops(this.db(), companyId), { roleFamily: guess.roleFamily, level })
            if (!g) return null
            const group = `${g.roleFamily.toLowerCase().replace(/_/g, " ")} roles, ${g.level.toLowerCase()} level${g.level !== level ? `; this posting is ${level.toLowerCase()}` : ""}`
            return { group, recent: g.recent, order: g.order, rounds: g.rounds.map((r) => ({ type: r.type, questions: r.questions.map((q) => ({ text: q.text, reported: q.reported })) })) }
        } catch (error: unknown) {
            // Reports sharpen the plan; they never block it.
            console.warn("[job_import] reported loop:", error instanceof Error ? error.message : error)
            return null
        }
    }

    /** One alarm per round: pick from our banks (or draft where they're thin) and fill the round. */
    private async roundStep(id: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        const row = await this.row(id)
        const ex = row.extracted, plan = row.plan
        const i = state.round ?? 0
        if (!ex || !plan || !state.processId) throw new Error("The job's plan is missing")
        const planned = plan.rounds[i]
        if (!planned) return { state, next: "ready", progress: 90 }
        const db = this.db()
        const [round] = await db.select({ id: interviewRounds.id }).from(interviewRounds)
            .where(and(eq(interviewRounds.processId, state.processId), eq(interviewRounds.roundNumber, i + 1))).limit(1)
        if (!round) throw new Error(`Round ${i + 1} is missing`)

        const built = await this.buildRound(id, i, planned, ex)
        await db.update(interviewRounds).set({
            description: built.description || planned.reason || planned.title,
            topicsCovered: built.topics,
            ...(built.rubric !== undefined ? { rubric: built.rubric } : {}),
            ...(built.mockKnowledgeBase !== undefined ? { mockKnowledgeBase: built.mockKnowledgeBase } : {}),
            updatedAt: new Date(),
        }).where(eq(interviewRounds.id, round.id))
        if (built.pool.length) {
            await db.insert(hiringRoundPoolItems).values(built.pool.map((p) => ({ roundId: round.id, ...p }))).onConflictDoNothing()
        }

        const n = plan.rounds.length
        const done = i + 1
        const progress = 50 + Math.round((done / n) * 40)
        if (done < n) {
            await this.setRow(id, { step: `Building round ${done + 1} of ${n}` })
            return { state: { ...state, round: done }, next: "round", progress }
        }
        await this.setRow(id, { step: "Putting it together" })
        return { state: { ...state, round: done }, next: "ready", progress }
    }

    private async buildRound(id: string, i: number, r: ImportedJobPlanRound, ex: ImportedJobExtract): Promise<BuiltRound> {
        const job = planUser(ex)
        switch (r.type) {
            case "APTITUDE": return this.buildAptitude(r, job)
            case "DSA": return this.buildDsa(r, job)
            case "SYSTEM_DESIGN": return this.buildDesign(id, i, r, job)
            default: return this.buildVoice(r, job)
        }
    }

    /** The model picks sections, levels and topics; every question comes from the reviewed bank. */
    private async buildAptitude(r: ImportedJobPlanRound, job: string): Promise<BuiltRound> {
        const db = this.db()
        const live = and(isNull(aptitudeQuestions.companyId), eq(aptitudeQuestions.status, "LIVE"))
        const topicRows = await db.selectDistinct({ topic: aptitudeQuestions.topic }).from(aptitudeQuestions).where(live)
        const bankTopics = topicRows.map((t) => t.topic).sort()
        const check = await this.ask("jobImportRound", aptitudeSystem(bankTopics), job, (raw) => validateAptitude(raw, bankTopics), 600)
        const cfg = check.ok ? check.value : { sections: ["QUANT", "LOGICAL", "VERBAL"] as const, difficulties: ["EASY", "MEDIUM"] as const, topics: [], description: "" }
        const need = r.drawCount * POOL_TO_DRAW_RATIO
        const base = and(live, inArray(aptitudeQuestions.section, [...cfg.sections]), inArray(aptitudeQuestions.difficulty, [...cfg.difficulties]))
        let rows = cfg.topics.length
            ? await db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions).where(and(base, inArray(aptitudeQuestions.topic, cfg.topics)))
            : []
        // The picked topics alone are too few for fresh retakes: widen to the sections and levels.
        if (rows.length < need) rows = await db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions).where(base)
        if (rows.length < r.drawCount) rows = await db.select({ id: aptitudeQuestions.id }).from(aptitudeQuestions).where(live)
        return {
            description: cfg.description || `${r.drawCount} multiple-choice questions in ${r.timeLimitMinutes} minutes. Scored automatically.`,
            topics: cfg.topics.length ? cfg.topics.slice(0, 5) : ["Quantitative aptitude", "Logical reasoning", "Verbal ability"].filter((_, k) => cfg.sections.includes((["QUANT", "LOGICAL", "VERBAL"] as const)[k])),
            pool: rows.map((q) => ({ kind: "APTITUDE_QUESTION" as const, refId: q.id, status: "LIVE" as const })),
        }
    }

    /** Only problems with a ready judge are sent; the model picks among them; an id we didn't send is refused. */
    private async buildDsa(r: ImportedJobPlanRound, job: string): Promise<BuiltRound> {
        const db = this.db()
        const judged = and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true), eq(practiceProblem.judgeStatus, "ready"))
        const counts = await db.select({ d: practiceProblem.difficulty, n: count() }).from(practiceProblem).where(judged).groupBy(practiceProblem.difficulty)
        const need = r.drawCount * POOL_TO_DRAW_RATIO
        const pick = nearestDifficulty(r.difficulty ?? "MEDIUM", Object.fromEntries(counts.map((c) => [c.d, Number(c.n)])), need)
        const candidates = await db.select({ id: practiceProblem.id, title: practiceProblem.title, category: practiceProblem.category, difficulty: practiceProblem.difficulty })
            .from(practiceProblem).where(and(judged, eq(practiceProblem.difficulty, pick.difficulty)))
        if (candidates.length < r.drawCount) throw new Error("There aren't enough judged coding problems for this round yet.")
        const sent = new Set(candidates.map((c) => c.id))
        const check = await this.ask("jobImportRound", dsaSystem(candidates, need), job, (raw) => validateDsa(raw, sent), 800)
        const chosen = check.ok ? check.value.problemIds : []
        // Fewer than a fresh retake needs: top up from the same level, most relevant first.
        const ids = [...chosen, ...candidates.map((c) => c.id).filter((x) => !chosen.includes(x)).sort(() => Math.random() - 0.5)].slice(0, Math.max(need, chosen.length))
        const level = pick.difficulty.toLowerCase()
        const said = pick.nearest ? ` Pitched at ${level}: we don't have enough ${(r.difficulty ?? "MEDIUM").toLowerCase()} problems with a judge yet.` : ""
        return {
            description: `${(check.ok && check.value.description) || `${r.drawCount === 1 ? "One" : r.drawCount} ${level} problem${r.drawCount === 1 ? "" : "s"} in ${r.timeLimitMinutes} minutes, run against hidden tests.`}${said}`.slice(0, 500),
            topics: check.ok && check.value.topics.length ? check.value.topics : ["Data structures", "Algorithms"],
            pool: ids.map((refId) => ({ kind: "PRACTICE_PROBLEM" as const, refId, status: "LIVE" as const })),
        }
    }

    /** Library prompts that fit, and one AI-written prompt (DRAFT, flagged) only when none is close. */
    private async buildDesign(id: string, i: number, r: ImportedJobPlanRound, job: string): Promise<BuiltRound> {
        const db = this.db()
        const library = await db.select({ id: designPrompts.id, title: designPrompts.title, difficulty: designPrompts.difficulty })
            .from(designPrompts).where(and(isNull(designPrompts.companyId), eq(designPrompts.status, "LIVE")))
        const sent = new Set(library.map((p) => p.id))
        const difficulty = r.difficulty ?? "MEDIUM"
        const check = await this.ask("jobImportRound", designSystem(library, difficulty), job, (raw) => validateDesign(raw, sent), 1500)
        const pool: PoolItem[] = []
        if (check.ok) {
            for (const refId of check.value.promptIds) pool.push({ kind: "DESIGN_PROMPT", refId, status: "LIVE" })
            const np = check.value.newPrompt
            if (np) {
                // Keyed by the import and round, so a re-run of this step doesn't write it twice.
                const key = `import-${id}-r${i + 1}`
                await db.insert(designPrompts).values({ key, title: np.title, prompt: np.prompt, rubric: np.rubric, difficulty, status: "DRAFT" }).onConflictDoNothing()
                const [row] = await db.select({ id: designPrompts.id }).from(designPrompts).where(eq(designPrompts.key, key))
                if (row) pool.push({ kind: "DESIGN_PROMPT", refId: row.id, status: "DRAFT" })
            }
        }
        if (!pool.length) {
            // The model gave nothing usable twice: the library at the planned level.
            for (const p of library.filter((x) => x.difficulty === difficulty).slice(0, 4)) pool.push({ kind: "DESIGN_PROMPT", refId: p.id, status: "LIVE" })
        }
        if (!pool.length) throw new Error("There are no system design prompts to draw from yet.")
        return {
            description: (check.ok && check.value.description) || `Design one system in ${r.timeLimitMinutes} minutes: a diagram and a written answer, AI-assessed against the prompt's rubric.`,
            topics: check.ok && check.value.topics.length ? check.value.topics : ["System design"],
            pool,
        }
    }

    /** A rubric and interviewer brief fitted to the job; the platform's own if the model's don't pass. */
    private async buildVoice(r: ImportedJobPlanRound, job: string): Promise<BuiltRound> {
        const type = r.type as "VOICE_BEHAVIOURAL" | "VOICE_CULTURE"
        const check = await this.ask("jobImportRound", voiceSystem(type), job, validateVoice, 1500)
        if (check.ok) return { description: check.value.description, topics: check.value.topics, pool: [], rubric: check.value.rubric, mockKnowledgeBase: check.value.knowledgeBase }
        const behavioural = type === "VOICE_BEHAVIOURAL"
        return {
            description: behavioural ? "A spoken behavioural interview: projects you owned, setbacks and how you worked with others. AI-assessed." : "A spoken conversation about how you work, learn and why this role. AI-assessed.",
            topics: behavioural ? ["Ownership", "Impact", "Handling difficulty"] : ["Collaboration", "Learning", "Motivation"],
            pool: [],
            rubric: behavioural ? BEHAVIOURAL_RUBRIC : CULTURE_RUBRIC,
            mockKnowledgeBase: behavioural ? BEHAVIOURAL_KNOWLEDGE : CULTURE_KNOWLEDGE,
        }
    }

    /** Every round that draws has enough to draw; the pipeline goes live and the import is READY. */
    private async readyStep(id: string, state: JobImportState): Promise<StepOutcome<JobImportState>> {
        if (!state.processId) throw new Error("The job's pipeline is missing")
        const db = this.db()
        const rounds = await db.select({ id: interviewRounds.id, type: interviewRounds.roundType, draw: interviewRounds.drawCount })
            .from(interviewRounds).where(eq(interviewRounds.processId, state.processId))
        const sizes = rounds.length
            ? await db.select({ roundId: hiringRoundPoolItems.roundId, n: count() }).from(hiringRoundPoolItems)
                .where(inArray(hiringRoundPoolItems.roundId, rounds.map((r) => r.id))).groupBy(hiringRoundPoolItems.roundId)
            : []
        const size = (id: string) => Number(sizes.find((x) => x.roundId === id)?.n ?? 0)
        const short = rounds.filter((r) => r.type !== "VOICE_BEHAVIOURAL" && r.type !== "VOICE_CULTURE" && size(r.id) < r.draw)
        if (!rounds.length || short.length) throw new Error("A round couldn't be filled. Try importing again.")
        await db.update(interviewProcesses).set({ isActive: true, updatedAt: new Date() }).where(eq(interviewProcesses.id, state.processId))
        await this.setRow(id, { status: "READY", step: null, error: null, processId: state.processId })
        return { state, next: null, progress: 100, label: "Ready to practise" }
    }
}
