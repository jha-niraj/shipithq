import { and, eq, sql } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import type { RunnableJobType } from "../env"
import { schema } from "../db"
import { chatJSON } from "../openai"
import { companyLoops, pickLoop } from "@repo/db/company-loop"
import { JobDurableObject, RetryableError, type ProgressFn, type StoredJob } from "./base"

const { pathfinderGoals, pathfinderDailySessions, pathfinderSubGoals } = schema

/**
 * Turn a job description into a Pathfinder goal full of interview questions.
 *
 * This is the replacement for the standalone Job Interview Assistant - see
 * `plan/interview-prep/`. That module ran the identical generation INSIDE a
 * server action (`jobinterview.action.ts:391`), which is the shape this repo
 * keeps getting bitten by: a Worker request has a hard budget, so a multi-second
 * LLM call is killed after the user has already been charged.
 *
 * As a job it gets a row, a status, retries and a visible failure.
 *
 * The output is not a bespoke record type. It is ordinary `pathfinderSubGoals`,
 * so the questions are answered, scored, published and sold by machinery that
 * already exists. That is the entire argument for the migration: the Interview
 * Assistant's five tables were a second copy of Pathfinder's.
 */

interface InterviewPrepInput {
    /** Pointer only - the goal, its job description and its company info are re-read here. */
    goalId: string
    counts?: { technical?: number; behavioral?: number; coding?: number }
    /**
     * The company and role group the posting matched (plan/competition/skillmeet
     * CMP-2e): its reported questions go first. Absent: generated only.
     */
    reported?: { companyId: string; companyName: string; roleFamily: string; level: string }
}

/** At most this many reported questions lead a goal. */
const MAX_REPORTED = 10
const REPORT_ROUND_LABEL: Record<string, string> = {
    ONLINE_ASSESSMENT: "online assessment", APTITUDE: "aptitude test", DSA: "coding round", LLD: "low-level design round",
    SYSTEM_DESIGN: "system design round", TAKE_HOME: "take-home", TECHNICAL: "technical interview", BEHAVIOURAL: "behavioural round",
    HIRING_MANAGER: "hiring manager round", HR: "HR round", OTHER: "interview",
}
const FAMILY_LABEL: Record<string, string> = {
    SOFTWARE: "Software engineer", FRONTEND: "Frontend", BACKEND: "Backend", FULL_STACK: "Full stack", MOBILE: "Mobile", DATA_ML: "Data / ML",
    DEVOPS_SRE: "DevOps / SRE", QA: "QA", PRODUCT: "Product", DESIGN: "Design", OTHER: "Other",
}
const LEVEL_LABEL: Record<string, string> = { INTERN: "Intern", ENTRY: "Entry", MID: "Mid", SENIOR: "Senior" }
const BEHAVIOURAL_ROUNDS = new Set(["BEHAVIOURAL", "HR", "HIRING_MANAGER"])

interface GeneratedQuestion {
    title: string
    description: string
}

interface GeneratedCodingQuestion extends GeneratedQuestion {
    difficulty?: string
    starterCode?: string
    hints?: string[]
    sampleInput?: string
    sampleOutput?: string
}

/** Matches the `aiCodingProblem` shape `SubGoalCoding` already reads. */
interface CodingProblem {
    id?: string
    title?: string
    description?: string
    difficulty?: string
    starterCode?: string
    hints?: string[]
    sampleInput?: string
    sampleOutput?: string
}

const DEFAULT_COUNTS = { technical: 8, behavioral: 8, coding: 3 }

/**
 * A sub-goal title is a list row, not a paragraph. The model returns questions
 * of wildly varying length and a 400-character "title" wrecks the layout, so the
 * full text always lives in `description` and the title is a trim of it.
 */
const MAX_TITLE = 120

function asTitle(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim()
    if (flat.length <= MAX_TITLE) return flat
    return `${flat.slice(0, MAX_TITLE - 1).trimEnd()}…`
}

export class InterviewPrepGeneration extends JobDurableObject<InterviewPrepInput> {
    protected readonly jobType: RunnableJobType = "interview_prep_generation"
    protected override get initialPhaseLabel() {
        return "Reading the job description"
    }

    protected async run(job: StoredJob<InterviewPrepInput>, progress: ProgressFn): Promise<unknown> {
        const db = this.db()
        const { goalId } = job.input
        const counts = { ...DEFAULT_COUNTS, ...(job.input.counts ?? {}) }

        // Scoped to the job's userId, which came from the signed token.
        const goal = await db.query.pathfinderGoals.findFirst({
            where: and(eq(pathfinderGoals.id, goalId), eq(pathfinderGoals.userId, job.userId)),
        })
        if (!goal) throw new Error("That goal no longer exists")

        const jobDescription = (goal.sourceJobDescription ?? "").trim()
        if (!jobDescription) {
            throw new Error("This goal has no job description to generate from")
        }

        // Idempotency guard on DATA, not on the job row. An alarm can re-fire
        // after a Durable Object eviction, and appending unconditionally would
        // silently double every question. `goal-creation.ts` guards the same way.
        const existing = await db.$count(pathfinderSubGoals, eq(pathfinderSubGoals.goalId, goalId))
        if (existing > 0) {
            return { goalId, skipped: true, reason: "This goal already has questions", questionCount: 0 }
        }

        await progress(30, "Writing the questions")

        const generated = await this.generate(goal.title, jobDescription, goal.sourceCompanyInfo, counts)
        const total =
            generated.technical.length + generated.behavioral.length + generated.coding.length
        if (total === 0) throw new Error("The generator returned no questions")

        await progress(75, `Saving ${total} questions`)

        // One daily session to hang the questions off, created if today has none.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split("T")[0] as string

        // `onConflictDoNothing`, not read-then-write.
        //
        // A plain findFirst-then-insert lost a race in the very first live run:
        // the goal page opens today's session when it loads, and the user lands on
        // that page the instant the goal is created - while this job is starting.
        // Both saw no session and both inserted, and the second hit
        //
        //     duplicate key value violates unique constraint "idx_pfds_goal_id_date"
        //
        // which fails the whole job after the credits are already held. The index
        // is the authority, so let it arbitrate: insert, ignore the conflict, then
        // read back whichever row won.
        const [inserted] = await db
            .insert(pathfinderDailySessions)
            .values({ goalId, userId: job.userId, date: todayStr })
            .onConflictDoNothing()
            .returning()

        const dailySession =
            inserted ??
            (await db.query.pathfinderDailySessions.findFirst({
                where: and(
                    eq(pathfinderDailySessions.goalId, goalId),
                    eq(pathfinderDailySessions.date, todayStr),
                ),
            }))
        if (!dailySession) throw new Error("Could not open a session for these questions")

        // Reported questions first (CMP-2e): what students were actually asked at
        // this company, in the usual round order, each saying how often.
        const reported = await this.reportedQuestions(db, job.input.reported)

        // Ordered technical, then behavioral, then coding: that is the shape of a
        // real interview loop, and `order` is what the UI sorts by.
        let order = 0
        const rows = [
            ...reported,
            ...generated.technical.map((q) => ({
                title: asTitle(q.title),
                description: q.description,
                kind: "TECHNICAL" as const,
                hasCoding: false,
                aiCodingProblem: null,
            })),
            ...generated.behavioral.map((q) => ({
                title: asTitle(q.title),
                description: q.description,
                kind: "BEHAVIORAL" as const,
                hasCoding: false,
                aiCodingProblem: null,
            })),
            ...generated.coding.map((q) => ({
                title: asTitle(q.title),
                description: q.description,
                kind: "CODING" as const,
                hasCoding: true,
                // An ARRAY, because that is what `SubGoalCoding` reads. One
                // problem per question, but the column holds a list.
                aiCodingProblem: [
                    {
                        title: asTitle(q.title),
                        description: q.description,
                        difficulty: q.difficulty ?? "Medium",
                        starterCode: q.starterCode ?? "",
                        hints: Array.isArray(q.hints) ? q.hints : [],
                        sampleInput: q.sampleInput ?? "",
                        sampleOutput: q.sampleOutput ?? "",
                    } satisfies CodingProblem,
                ],
            })),
        ].map((r) => ({
            goalId,
            sessionId: dailySession.id,
            source: "source" in r ? r.source : "text",
            isAIGenerated: !("source" in r),
            // No explanation is written for these - the question IS the content -
            // so they are complete on arrival rather than showing a "Generate
            // Content" button that would rewrite the question as a lesson.
            isContentLoaded: true,
            order: order++,
            ...r,
        }))

        // All of them in ONE insert. The neon-http driver has no transactions, so
        // a loop that fails at question 12 leaves a half-built goal with the
        // counters below never updated.
        await db.insert(pathfinderSubGoals).values(rows)

        const codingCount = generated.coding.length
        await db.batch([
            db
                .update(pathfinderDailySessions)
                .set({
                    totalSubGoals: sql`${pathfinderDailySessions.totalSubGoals} + ${rows.length}`,
                    totalCodingProblems: sql`${pathfinderDailySessions.totalCodingProblems} + ${codingCount}`,
                })
                .where(eq(pathfinderDailySessions.id, dailySession.id)),
            db
                .update(pathfinderGoals)
                .set({
                    totalSubGoals: sql`${pathfinderGoals.totalSubGoals} + ${rows.length}`,
                    lastActivityAt: new Date(),
                })
                .where(eq(pathfinderGoals.id, goalId)),
        ])

        return {
            goalId,
            sessionId: dailySession.id,
            questionCount: rows.length,
            technical: generated.technical.length,
            behavioral: generated.behavioral.length,
            coding: codingCount,
            skipped: false,
        }
    }

    /**
     * Up to 10 questions students reported for the matched company and role
     * group, as sub-goal rows that say how often each was asked. Only a loop
     * that meets the threshold is used; otherwise none (never invent frequency).
     */
    private async reportedQuestions(db: ReturnType<typeof this.db>, match: InterviewPrepInput["reported"]) {
        if (!match) return []
        const group = pickLoop(await companyLoops(db, match.companyId), { roleFamily: match.roleFamily, level: match.level })
        if (!group) return []
        const who = `${FAMILY_LABEL[group.roleFamily] ?? group.roleFamily}, ${LEVEL_LABEL[group.level] ?? group.level}`
        const out: { title: string; description: string; kind: "TECHNICAL" | "BEHAVIORAL"; hasCoding: false; aiCodingProblem: null; source: "interview_report" }[] = []
        for (const round of group.rounds) {
            for (const q of round.questions) {
                if (out.length >= MAX_REPORTED) break
                out.push({
                    title: asTitle(q.text),
                    description: `Reported ${q.reported} ${q.reported === 1 ? "time" : "times"} by students (${who}) in the ${REPORT_ROUND_LABEL[round.type] ?? "interview"} at ${match.companyName}.`,
                    kind: BEHAVIOURAL_ROUNDS.has(round.type) ? "BEHAVIORAL" : "TECHNICAL",
                    hasCoding: false,
                    aiCodingProblem: null,
                    source: "interview_report",
                })
            }
        }
        return out
    }

    private async generate(
        position: string,
        jobDescription: string,
        companyInfo: unknown,
        counts: { technical: number; behavioral: number; coding: number },
    ): Promise<{
        technical: GeneratedQuestion[]
        behavioral: GeneratedQuestion[]
        coding: GeneratedCodingQuestion[]
    }> {
        // The job description is the whole input and can be very long. Cap it:
        // the tail of a posting is benefits and equal-opportunity boilerplate,
        // and spending the context window on it costs questions.
        const jd = jobDescription.slice(0, 6000)
        const company =
            companyInfo && typeof companyInfo === "object"
                ? JSON.stringify(companyInfo).slice(0, 1500)
                : ""

        const prompt = `You are an experienced interviewer preparing a candidate for a specific role.

Role: ${position}

Job description:
${jd}
${company ? `\nCompany context:\n${company}\n` : ""}
Write interview questions this candidate should expect for THIS role, drawn from the job description above rather than generic lists.

Produce exactly:
- ${counts.technical} technical questions
- ${counts.behavioral} behavioral questions
- ${counts.coding} coding questions

Rules:
- Ground every question in something the job description actually asks for. If it names a technology, ask about that technology.
- "title" is the question itself, one sentence.
- "description" is what a strong answer covers, 2-4 sentences. Do not write the answer out.
- Behavioral questions must be answerable from experience, not trivia.
- Coding questions need a real problem statement, a difficulty of Easy, Medium or Hard, starter code, one sample input and its expected output.
- EVERY coding question must be built around a data structure, protocol, storage system or failure mode that the job description NAMES. Read the description again and pick from it.
  A posting about Kafka and Postgres gets problems about partition assignment, consumer offsets, batching, retries, deduplication or query planning. It must NOT get textbook exercises like Fibonacci, FizzBuzz, reversing a string or balancing brackets - those are the questions a candidate has already seen a hundred times and they say nothing about this role.
  If the description names nothing technical enough to build a coding question from, return FEWER coding questions rather than inventing a generic one.

Return JSON:
{
  "technical":  [ { "title": "...", "description": "..." } ],
  "behavioral": [ { "title": "...", "description": "..." } ],
  "coding":     [ { "title": "...", "description": "...", "difficulty": "Medium", "starterCode": "...", "hints": ["..."], "sampleInput": "...", "sampleOutput": "..." } ]
}

Return ONLY valid JSON, no markdown.`

        let raw: string
        try {
            raw = await chatJSON({
                apiKey: this.env.OPENAI_API_KEY,
                model: modelFor("interviewPrepQuestions"),
                temperature: 0.7,
                // Higher than goal-creation's 2000: this returns three lists, and
                // the coding entries carry starter code. A truncated response is
                // unparseable JSON, which surfaces as "output we could not read"
                // and costs the whole job.
                maxTokens: 6000,
                system: "",
                user: prompt,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "The generator was unreachable"
            // A 4xx is our fault (bad key, bad request) and will fail identically
            // on retry. Everything else gets retried.
            if (/OpenAI API error 4\d\d/.test(message)) throw new Error(message)
            throw new RetryableError(message)
        }

        let parsed: { technical?: unknown; behavioral?: unknown; coding?: unknown }
        try {
            parsed = JSON.parse(raw) as typeof parsed
        } catch {
            throw new Error("The generator returned output we could not read")
        }

        const clean = <T extends GeneratedQuestion>(value: unknown): T[] =>
            (Array.isArray(value) ? value : [])
                .filter(
                    (q): q is T =>
                        !!q && typeof (q as T).title === "string" && !!(q as T).title.trim(),
                )
                .map((q) => ({
                    ...q,
                    title: q.title.trim(),
                    description: typeof q.description === "string" ? q.description.trim() : "",
                }))

        return {
            technical: clean<GeneratedQuestion>(parsed.technical),
            behavioral: clean<GeneratedQuestion>(parsed.behavioral),
            coding: clean<GeneratedCodingQuestion>(parsed.coding),
        }
    }
}
