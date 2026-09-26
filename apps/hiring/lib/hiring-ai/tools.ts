import "server-only"
import { and, asc, count, desc, eq, gte, ilike, inArray, ne, sql } from "drizzle-orm"
import { db, companyAiUsage, hiringSends, interviewRounds, jobs, messages, messageThreads, users, type HiringPermission } from "@repo/db"
import { modelFor } from "@repo/ai"
import { HIRING_AI_LIMITS } from "@repo/pricing"
import type { AssistantChatProposal } from "@repo/db/assistant"
import { conversationPaused } from "@repo/db/moderation"
import { AiUnavailableError, chatJSON } from "@/lib/ai"
import { DRAFT_SYSTEM, normalisePipelineDraft } from "@/lib/pipeline-draft"
import { docText, docsForAi } from "@/lib/documents"
import { EXTRA_CREDIT_COST, lockedSendIds, refundCredits, spendCredits } from "@/lib/plan"
import type { RoundDraft } from "@/types/pipeline"
import type { SendSnapshot, SentProfile } from "@repo/db/hiring-send-types"
import { notPurged } from "@repo/db/hiring-purge"
import { roundFunnels } from "@repo/db/hiring-stats"
import { resultsText } from "@/lib/decisions"
import { integrityFlag } from "@/lib/sends"

/*
 * What the company AI panel can read (plan/hiring-app HA-11, Niraj 2026-09-26):
 * roles and pipelines, the results candidates sent this company, message
 * threads, and anonymous practice numbers. Every query takes the company from
 * the signed-in member's context, never from the model, so a question can
 * only ever reach this company's rows. Read-only: nothing here changes a send
 * (reading a result through the AI doesn't mark it viewed).
 */

export interface ToolScope { companyId: string; userId: string; can: (p: HiringPermission) => boolean }
export interface ToolAction { label: string; href: string; kind?: string }
/** A proposal is shown as a confirm card; nothing is done until the member confirms (HA-12). */
export interface ToolOutcome { result: unknown; actions?: ToolAction[]; proposal?: AssistantChatProposal }

/** A message proposal: the recipients are fixed here, when the card is made, and never re-read on Send. */
export interface MessageProposalData { text: string; recipients: { sendId: string; name: string; role: string }[]; skipped: { name: string; reason: string }[] }
/** A pipeline proposal: rounds already checked and clamped the way the builder's "Draft with AI" does. */
export interface PipelineProposalData { name: string; description: string; rounds: RoundDraft[] }

const MAX_RECIPIENTS = 50
const DAY_MS = 86_400_000

const LIMIT = 50
// The candidate's name as they sent it, read from the send's profile.
const sqlProfileName = sql<string>`${hiringSends.profile}->>'name'`

export const TOOL_SPECS = [
    {
        type: "function" as const,
        function: {
            name: "list_roles",
            description: "This company's roles (jobs): status, the rounds in each role's pipeline with pass marks, and how many results are waiting, invited or declined.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "list_candidates",
            description: "Candidates who sent this company their results, with each round's score against its pass mark, the average, integrity flags and where the decision stands. Use it to rank, filter or find who is waiting.",
            parameters: {
                type: "object",
                properties: {
                    role: { type: "string", description: "Part of a role's title, to limit to that role." },
                    status: { type: "string", enum: ["undecided", "invited", "declined", "all"], description: "Default all." },
                    sort_by_round_type: { type: "string", enum: ["APTITUDE", "DSA", "SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"], description: "Sort by the score on this kind of round, highest first. Default: by average." },
                    limit: { type: "number", description: "At most 50. Default 20." },
                },
                additionalProperties: false,
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "get_candidate",
            description: "One candidate's results in full: every round's score, the assessor's rubric summary and evidence, integrity counts, the profile they sent, and the team's decision and note.",
            parameters: {
                type: "object",
                properties: { name: { type: "string", description: "The candidate's name, or part of it." } },
                required: ["name"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "round_stats",
            description: "Anonymous numbers per round of each role: how many students are practising it, how many have a score, and how many reached the pass mark. No names; includes students who never sent results.",
            parameters: {
                type: "object",
                properties: { role: { type: "string", description: "Part of a role's title. Default: every role." } },
                additionalProperties: false,
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "propose_message",
            description: "Propose a message to one candidate or a filtered group. It does NOT send: the member sees a card listing every recipient and the text, and presses Send. Each candidate gets their own private thread. Use only when asked to write to candidates.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "The message, written to the candidate as \"you\". No greeting with a name placeholder; it goes to each person as is." },
                    names: { type: "array", items: { type: "string" }, description: "Specific candidates by name." },
                    role: { type: "string", description: "Part of a role's title." },
                    status: { type: "string", enum: ["undecided", "invited", "declined", "all"] },
                    min_score: { type: "object", properties: { round_type: { type: "string", enum: ["APTITUDE", "DSA", "SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"] }, min: { type: "number" } }, required: ["round_type", "min"], additionalProperties: false },
                },
                required: ["text"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "propose_pipeline",
            description: "Propose a new pipeline (rounds) for a role. It does NOT create it: the member sees the rounds on a card and presses Add, which saves an editable pipeline in the builder.",
            parameters: {
                type: "object",
                properties: {
                    role: { type: "string", description: "The role, like \"Backend engineer (1-3 years)\"." },
                    details: { type: "string", description: "What the company wants the rounds to check, in its words." },
                },
                required: ["role"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "list_documents",
            description: "The company's document library: job descriptions, hiring policies and the like, uploaded by the team. Names only.",
            parameters: { type: "object", properties: {}, additionalProperties: false },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "read_document",
            description: "Read one document from the company's library, by its name or part of it. Use it when a question depends on a JD, a policy or anything the team uploaded.",
            parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false },
        },
    },
    {
        type: "function" as const,
        function: {
            name: "list_threads",
            description: "This company's message threads with candidates, newest first, with the latest messages in each.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Part of a candidate's name, to read that one conversation." },
                    limit: { type: "number", description: "Threads to return, at most 20. Default 10." },
                },
                additionalProperties: false,
            },
        },
    },
]

const str = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const num = (v: unknown, fallback: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.min(max, Math.floor(v))) : fallback)
const resultHref = (jobSlug: string, sendId: string) => `/applications/${jobSlug}?send=${sendId}`

async function roles(scope: ToolScope, titlePart?: string) {
    return db.select({ id: jobs.id, title: jobs.title, slug: jobs.slug, status: jobs.status, processId: jobs.interviewProcessId })
        .from(jobs)
        .where(and(eq(jobs.companyId, scope.companyId), titlePart ? ilike(jobs.title, `%${titlePart}%`) : undefined))
        .orderBy(desc(jobs.createdAt))
}

async function listRoles(scope: ToolScope): Promise<ToolOutcome> {
    const rows = await roles(scope)
    const processIds = rows.map((r) => r.processId).filter((x): x is string => Boolean(x))
    const [rounds, sends] = await Promise.all([
        processIds.length ? db.select().from(interviewRounds).where(inArray(interviewRounds.processId, processIds)).orderBy(asc(interviewRounds.roundNumber)) : [],
        db.select({ jobId: hiringSends.jobId, status: hiringSends.status }).from(hiringSends)
            .where(and(eq(hiringSends.companyId, scope.companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged)),
    ])
    const result = rows.map((j) => {
        const mine = sends.filter((s) => s.jobId === j.id)
        return {
            role: j.title,
            status: j.status,
            rounds: rounds.filter((r) => r.processId === j.processId).map((r) => ({ number: r.roundNumber, type: r.roundType, title: r.title, passMark: r.passMark, gate: r.gateMode })),
            results: {
                waiting: mine.filter((s) => s.status === "SENT" || s.status === "VIEWED").length,
                invited: mine.filter((s) => s.status === "INVITED").length,
                declined: mine.filter((s) => s.status === "DECLINED").length,
            },
        }
    })
    return { result: { roles: result, _summary: `Read ${rows.length} role${rows.length === 1 ? "" : "s"}` } }
}

async function sendsFor(scope: ToolScope, opts: { role?: string; status?: string; name?: string }) {
    const where = [eq(hiringSends.companyId, scope.companyId), ne(hiringSends.status, "WITHDRAWN"), notPurged]
    if (opts.role) where.push(ilike(jobs.title, `%${opts.role}%`))
    if (opts.status === "undecided") where.push(inArray(hiringSends.status, ["SENT", "VIEWED"]))
    else if (opts.status === "invited") where.push(eq(hiringSends.status, "INVITED"))
    else if (opts.status === "declined") where.push(eq(hiringSends.status, "DECLINED"))
    if (opts.name) where.push(ilike(sqlProfileName, `%${opts.name}%`))
    // Results locked by the plan's monthly limit stay closed to the AI too (HA-20).
    const locked = await lockedSendIds(scope.companyId)
    const rows = await db.select({ send: hiringSends, jobTitle: jobs.title, jobSlug: jobs.slug })
        .from(hiringSends).innerJoin(jobs, eq(jobs.id, hiringSends.jobId))
        .where(and(...where))
        .orderBy(desc(hiringSends.createdAt))
        .limit(500)
    return rows.filter((r) => !locked.has(r.send.id))
}


async function listCandidates(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    const role = str(args.role) || undefined
    const status = str(args.status) || "all"
    const sortType = str(args.sort_by_round_type) || null
    const limit = num(args.limit, 20, LIMIT)
    const rows = await sendsFor(scope, { role, status })
    const list = rows.map((r) => {
        const snap = r.send.snapshot as SendSnapshot
        const profile = r.send.profile as SentProfile
        const scores = snap.rounds.map((x) => ({ round: x.number, type: x.type, title: x.title, score: x.attempt.score, passMark: x.passMark, passed: x.attempt.score >= x.passMark, attempt: `${x.attempt.number} of ${x.attempt.of}` }))
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : null
        const flag = integrityFlag(snap.rounds)
        return {
            name: profile.name,
            headline: profile.headline,
            role: r.jobTitle,
            status: r.send.status === "SENT" || r.send.status === "VIEWED" ? "waiting for a decision" : r.send.status.toLowerCase(),
            sentAt: r.send.createdAt.toISOString().slice(0, 10),
            scores,
            average: avg,
            integrityFlag: flag.flagged ? `${flag.pastes} pastes, ${flag.tabLeaves} tab leaves` : null,
            outcome: r.send.companyOutcome,
            _href: resultHref(r.jobSlug, r.send.id),
        }
    })
    const key = (c: (typeof list)[number]) => (sortType ? (c.scores.find((s) => s.type === sortType)?.score ?? -1) : (c.average ?? -1))
    list.sort((a, b) => key(b) - key(a))
    const top = list.slice(0, limit)
    return {
        result: { candidates: top.map(({ _href, ...c }) => c), total: list.length, _summary: `Read ${list.length} result${list.length === 1 ? "" : "s"}` },
        // Buttons to the first few, from the rows themselves (never a link the model writes).
        actions: top.slice(0, 3).map((c) => ({ label: `Open ${c.name}`, href: c._href, kind: "candidate" })),
    }
}

async function getCandidate(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    const name = str(args.name, 80)
    if (!name) return { result: { error: "Give a name." } }
    const rows = await sendsFor(scope, { name })
    if (!rows.length) return { result: { error: `No candidate named like "${name}" has sent results to this company.` } }
    if (rows.length > 5) return { result: { error: "Several candidates match; ask for a fuller name.", matches: rows.slice(0, 10).map((r) => ({ name: (r.send.profile as SentProfile).name, role: r.jobTitle })) } }
    const out = rows.map((r) => {
        const snap = r.send.snapshot as SendSnapshot
        const profile = r.send.profile as SentProfile
        return {
            name: profile.name,
            headline: profile.headline,
            education: profile.education.map((e) => `${e.degree ? `${e.degree}, ` : ""}${e.institution}`),
            links: profile.links.map((l) => `${l.kind}: ${l.label}`),
            role: r.jobTitle,
            status: r.send.status,
            sentAt: r.send.createdAt.toISOString().slice(0, 10),
            results: resultsText(snap),
            integrity: snap.rounds.map((x) => ({ round: x.number, pastes: x.attempt.integrity.pastes, tabLeaves: x.attempt.integrity.tabLeaves, aiBlocked: x.attempt.integrity.aiBlocked })),
            decision: { decidedAt: r.send.decidedAt?.toISOString().slice(0, 10) ?? null, teamNote: r.send.decisionNote, feedbackSent: r.send.feedback, companyOutcome: r.send.companyOutcome, candidateOutcome: r.send.studentOutcome },
            _href: resultHref(r.jobSlug, r.send.id),
        }
    })
    return {
        result: { candidates: out.map(({ _href, ...c }) => c), _summary: `Read ${out[0]!.name}'s results` },
        actions: out.slice(0, 2).map((c) => ({ label: `Open ${c.name}`, href: c._href, kind: "candidate" })),
    }
}

async function roundStats(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    const rows = (await roles(scope, str(args.role) || undefined)).filter((r) => r.processId)
    const rounds = rows.length ? await db.select().from(interviewRounds).where(inArray(interviewRounds.processId, rows.map((r) => r.processId!))).orderBy(asc(interviewRounds.roundNumber)) : []
    const funnels = await roundFunnels(rounds.map((r) => r.id))
    const out = rows.map((j) => ({
        role: j.title,
        rounds: rounds.filter((r) => r.processId === j.processId).map((r) => {
            const f = funnels.get(r.id)
            return { number: r.roundNumber, type: r.roundType, passMark: r.passMark, practising: f?.practising ?? 0, scored: f?.scored ?? 0, passed: f?.passed ?? 0 }
        }),
    }))
    return { result: { roles: out, note: "Counts of students, not attempts; anonymous.", _summary: `Read practice numbers for ${out.length} role${out.length === 1 ? "" : "s"}` } }
}

async function listThreads(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    const name = str(args.name, 80)
    const limit = num(args.limit, 10, 20)
    const threads = await db.select({ id: messageThreads.id, subject: messageThreads.subject, lastAt: messageThreads.lastMessageAt, closedAt: messageThreads.closedAt, deleted: messageThreads.studentDeletedAt, student: users.name, jobTitle: jobs.title })
        .from(messageThreads)
        .leftJoin(users, eq(users.id, messageThreads.userId))
        .leftJoin(jobs, eq(jobs.id, messageThreads.jobId))
        .where(and(eq(messageThreads.companyId, scope.companyId), name ? ilike(users.name, `%${name}%`) : undefined))
        .orderBy(desc(messageThreads.lastMessageAt))
        .limit(limit)
    const msgs = threads.length
        ? await db.select({ threadId: messages.threadId, kind: messages.authorKind, body: messages.body, at: messages.createdAt, author: users.name })
            .from(messages).leftJoin(users, eq(users.id, messages.authorUserId))
            .where(inArray(messages.threadId, threads.map((t) => t.id)))
            .orderBy(desc(messages.createdAt))
        : []
    const out = threads.map((t) => ({
        candidate: t.deleted ? "Account deleted" : (t.student ?? "Candidate"),
        about: t.jobTitle ?? t.subject,
        closed: Boolean(t.closedAt || t.deleted),
        latest: msgs.filter((m) => m.threadId === t.id).slice(0, 10).reverse()
            .map((m) => ({ from: m.kind === "COMPANY" ? `${m.author ?? "Team"} (team)` : "candidate", at: m.at.toISOString().slice(0, 16).replace("T", " "), text: m.body.slice(0, 600) })),
    }))
    return { result: { threads: out, _summary: `Read ${out.length} conversation${out.length === 1 ? "" : "s"}` } }
}

async function proposeMessage(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    if (!scope.can("message_candidates")) return { result: { error: "This member's role can't message candidates, so nothing was proposed. Tell them to ask the company's owner." } }
    const text = str(args.text, 3000)
    if (text.length < 5) return { result: { error: "Write the message first." } }
    const names = Array.isArray(args.names) ? args.names.map((n) => str(n, 80)).filter(Boolean).slice(0, MAX_RECIPIENTS) : []
    const min = args.min_score && typeof args.min_score === "object" ? args.min_score as { round_type?: unknown; min?: unknown } : null
    let rows = await sendsFor(scope, { role: str(args.role) || undefined, status: str(args.status) || "all" })
    if (names.length) rows = rows.filter((r) => names.some((n) => (r.send.profile as SentProfile).name.toLowerCase().includes(n.toLowerCase())))
    if (min && typeof min.round_type === "string" && typeof min.min === "number") {
        rows = rows.filter((r) => (r.send.snapshot as SendSnapshot).rounds.some((x) => x.type === min.round_type && x.attempt.score > (min.min as number)))
    }
    // One student can have sent to two roles: they get one message.
    const byStudent = new Map<string, (typeof rows)[number]>()
    for (const r of rows) if (!byStudent.has(r.send.userId)) byStudent.set(r.send.userId, r)
    const recipients: MessageProposalData["recipients"] = []
    const skipped: MessageProposalData["skipped"] = []
    for (const r of byStudent.values()) {
        const name = (r.send.profile as SentProfile).name
        if ((await conversationPaused(scope.companyId, r.send.userId)) === "BLOCKED") { skipped.push({ name, reason: "isn't accepting messages" }); continue }
        if (recipients.length >= MAX_RECIPIENTS) { skipped.push({ name, reason: `over the ${MAX_RECIPIENTS}-person limit` }); continue }
        recipients.push({ sendId: r.send.id, name, role: r.jobTitle })
    }
    if (!recipients.length) return { result: { error: "No candidate matches, so nothing was proposed.", skipped } }
    const data: MessageProposalData = { text, recipients, skipped }
    return {
        result: { proposed: true, recipients: recipients.map((r) => r.name), skipped, note: "A card with Send and Cancel is shown. Nothing is sent until the member presses Send. Don't repeat the list or the text." },
        proposal: { kind: "message", status: "pending", data: data as unknown as Record<string, unknown> },
    }
}

async function proposePipeline(scope: ToolScope, args: Record<string, unknown>): Promise<ToolOutcome> {
    if (!scope.can("manage_pipelines")) return { result: { error: "This member's role can't manage pipelines, so nothing was proposed." } }
    const role = str(args.role, 120)
    if (role.length < 2) return { result: { error: "Name the role first." } }
    // A pipeline draft counts toward the company's daily drafts, as in the builder.
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(companyAiUsage)
        .where(and(eq(companyAiUsage.companyId, scope.companyId), eq(companyAiUsage.kind, "pipeline_draft"), gte(companyAiUsage.createdAt, new Date(Date.now() - DAY_MS))))
    // Past the free daily drafts, one costs company credits, refunded if it fails (plan/hiring-app HA-20).
    let charge: string | null = null
    if (Number(n) >= HIRING_AI_LIMITS.pipelineDraftsPerDay) {
        charge = `pipeline-draft:${crypto.randomUUID()}`
        const paid = await spendCredits(scope.companyId, EXTRA_CREDIT_COST.pipelineDraft, `AI pipeline draft past today's ${HIRING_AI_LIMITS.pipelineDraftsPerDay} free`, charge, scope.userId)
        if (!paid.ok) return { result: { error: `Today's ${HIRING_AI_LIMITS.pipelineDraftsPerDay} free pipeline drafts are used. ${paid.error}` } }
    }
    const refund = () => charge ? refundCredits(scope.companyId, EXTRA_CREDIT_COST.pipelineDraft, "The AI draft failed", charge) : Promise.resolve()
    await db.insert(companyAiUsage).values({ companyId: scope.companyId, userId: scope.userId, kind: "pipeline_draft" })
    let raw: unknown
    try {
        raw = await chatJSON({ model: modelFor("pipelineDraft"), system: DRAFT_SYSTEM, user: `Role: ${role}\n\nWhat the company says about it:\n${str(args.details, 2000) || "(nothing more)"}`, maxTokens: 1500 })
    } catch (error: unknown) {
        await refund()
        return { result: { error: error instanceof AiUnavailableError ? error.message : "The draft failed." } }
    }
    const draft = normalisePipelineDraft(raw, role)
    if (!draft) { await refund(); return { result: { error: "The draft didn't have usable rounds. Ask for more detail about the role." } } }
    return {
        result: { proposed: true, name: draft.name, rounds: draft.rounds.map((r) => `${r.title} (${r.roundType}, ${r.gateMode}${r.gateMode === "HARD" ? ` ${r.passMark}` : ""}, ${r.timeLimitMinutes} min)`), note: "A card with Add and Cancel is shown. Nothing is created until the member presses Add. Don't repeat the rounds." },
        proposal: { kind: "pipeline", status: "pending", data: draft as unknown as Record<string, unknown> },
    }
}

export async function runTool(name: string, rawArgs: string, scope: ToolScope): Promise<ToolOutcome | null> {
    let args: Record<string, unknown> = {}
    try { args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {} } catch { args = {} }
    switch (name) {
        case "list_roles": return listRoles(scope)
        case "list_candidates": return listCandidates(scope, args)
        case "get_candidate": return getCandidate(scope, args)
        case "round_stats": return roundStats(scope, args)
        case "list_threads": return listThreads(scope, args)
        case "list_documents": {
            const docs = await docsForAi(scope.companyId)
            return { result: { documents: docs.map((d) => ({ name: d.name, chars: d.chars, uploaded: d.createdAt.toISOString().slice(0, 10) })), _summary: `Read ${docs.length} document name${docs.length === 1 ? "" : "s"}` } }
        }
        case "read_document": {
            const found = await docText(scope.companyId, { name: str(args.name, 200) })
            if (!found.length) return { result: { error: "No document with that name in the library." } }
            const d = found[0]!
            return { result: { name: d.name, text: d.text.slice(0, 30_000), truncated: d.truncated || d.text.length > 30_000, _summary: `Read ${d.name}` } }
        }
        case "propose_message": return proposeMessage(scope, args)
        case "propose_pipeline": return proposePipeline(scope, args)
        default: return null
    }
}

