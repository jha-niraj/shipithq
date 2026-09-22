import { NextRequest } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { getSession } from "@repo/auth"
import {
    db, moduleOnboarding, ONBOARDING_MIN_QUESTIONS,
    type OnboardingProfile, type OnboardingQuestion, type OnboardingTurn,
} from "@repo/db"
import { openai } from "@/lib/openai-client"
import { isOnboardingModuleKey, onboardingModule } from "@/lib/onboarding/modules"
import { SYSTEM_PROMPT, buildUserMessage, type PromptMode } from "@/lib/onboarding/prompt"
import {
    answeredCount, checkProfile, checkQuestion, mayAskOpen, mayFinish, mustFinish, openCount,
} from "@/lib/onboarding/guards"
import { getOnboardingPromptUser } from "@/actions/(main)/onboarding/module-onboarding.action"
import type { OnboardingNextResponse } from "@/types/onboarding"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/next  { runId }
//
// Returns the next question for a run, or the finished profile. The one place
// the model is called for onboarding. A route handler rather than a worker job
// because nothing is charged, the completion is a few hundred JSON tokens, and
// the user is looking at an empty question slot while it runs; a job would add
// a dispatch and a poll ten times per run. Decision in plan/module-onboarding.
//
// Idempotent by construction: if the last turn is unanswered it is returned
// again, so a closed tab or a retried request never generates twice. Appends
// are conditional on the turn count that was read, so two concurrent calls
// cannot both append; the loser returns the winner's turn.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = "gpt-4o-mini"

type ModelReply = {
    done?: unknown
    question?: unknown
    profile?: unknown
}

async function askModel(system: string, user: string, maxTokens: number): Promise<ModelReply | null> {
    const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
    }) as { choices?: Array<{ message?: { content?: string | null } }> }

    const content = completion.choices?.[0]?.message?.content
    if (!content) return null
    try {
        return JSON.parse(content) as ModelReply
    } catch {
        return null
    }
}

function json(body: unknown, status = 200): Response {
    return Response.json(body, { status })
}

export async function POST(req: NextRequest) {
    const session = await getSession(req.headers)
    const userId = session?.user?.id
    if (!userId) return json({ error: "Not signed in." }, 401)
    if (!process.env.OPENAI_API_KEY) return json({ error: "Onboarding is not configured." }, 500)

    let runId: string
    try {
        const body = (await req.json()) as { runId?: unknown }
        runId = typeof body.runId === "string" ? body.runId : ""
    } catch {
        runId = ""
    }
    if (!runId) return json({ error: "Missing run." }, 400)

    const run = await db.query.moduleOnboarding.findFirst({
        where: and(eq(moduleOnboarding.id, runId), eq(moduleOnboarding.userId, userId)),
    })
    if (!run) return json({ error: "That onboarding no longer exists." }, 404)
    if (!isOnboardingModuleKey(run.moduleKey)) return json({ error: "Unknown module." }, 400)

    // Already finished: hand the profile back so a client that missed the reply
    // still lands on the summary.
    if (run.status === "completed" && run.profile) {
        const done: OnboardingNextResponse = { done: true, profile: run.profile, level: run.profile.level }
        return json(done)
    }

    const turns: OnboardingTurn[] = run.turns ?? []
    const last = turns[turns.length - 1]

    // Resume: the pending question is the next question.
    if (last && !last.answer) {
        const pending: OnboardingNextResponse = { done: false, turn: last }
        return json(pending)
    }

    const answered = answeredCount(turns)
    const openUsed = openCount(turns)
    const mod = onboardingModule(run.moduleKey)
    const promptUser = await getOnboardingPromptUser(userId)
    if (!promptUser) return json({ error: "Your profile could not be loaded." }, 500)

    const userMessageFor = (mode: PromptMode, rejection?: string) =>
        buildUserMessage({ user: promptUser, module: mod, turns, answered, openUsed, mode, rejection })

    let mode: PromptMode = mustFinish(answered)
        ? "profile_only"
        : mayAskOpen(turns) ? "question" : "question_options_only"

    let question: OnboardingQuestion | null = null
    let profile: OnboardingProfile | null = null
    let lastReason = "no reply"
    let rejection: string | undefined

    // Up to three model calls. A retry carries the reason the last reply was
    // rejected; without it the model tends to send the same reply again (the
    // simulation in plan/module-onboarding/manual-pass-1.md shows three runs
    // dying on a repeated two-option question before this was added).
    for (let attempt = 0; attempt < 3 && !question && !profile; attempt++) {
        const reply = await askModel(SYSTEM_PROMPT, userMessageFor(mode, rejection), mode === "profile_only" || answered >= ONBOARDING_MIN_QUESTIONS ? 700 : 400)
        if (!reply) {
            lastReason = "unreadable reply"
            rejection = "it was not a single valid JSON object"
            continue
        }

        const wantsDone = reply.done === true
        if (mode === "profile_only" || (wantsDone && mayFinish(answered))) {
            const p = checkProfile(reply.profile)
            if (p.ok) {
                profile = p.profile
                break
            }
            lastReason = p.reason
            rejection = `the profile was invalid (${p.reason})`
            mode = "profile_only"
            continue
        }

        // Either the model wanted a question, or it wanted to finish before the
        // floor. Both paths need a usable question.
        const q = checkQuestion(reply.question, mayAskOpen(turns))
        if (q.ok) {
            question = q.question
            break
        }
        lastReason = q.reason
        rejection = wantsDone
            ? `you tried to finish after ${answered} answers; at least ${ONBOARDING_MIN_QUESTIONS} are required, so ask a question instead`
            : q.reason === "open question not allowed"
                ? "open questions are used up; this one must be single or multi with 3 to 6 options"
                : q.reason === "too few options"
                    ? "a single or multi question needs at least 3 options"
                    : `the question was invalid (${q.reason})`
        mode = q.reason === "open question not allowed" ? "question_options_only" : mode
    }

    if (!question && !profile) {
        console.error("[onboarding/next] gave up:", lastReason, { runId, answered })
        return json({ error: "The next question did not come through. Try again." }, 502)
    }

    if (profile) {
        const [updated] = await db
            .update(moduleOnboarding)
            .set({ status: "completed", profile, level: profile.level, completedAt: new Date() })
            .where(and(
                eq(moduleOnboarding.id, runId),
                eq(moduleOnboarding.status, "in_progress"),
                sql`jsonb_array_length(${moduleOnboarding.turns}) = ${turns.length}`,
            ))
            .returning()
        // Lost the race to another completion: return what is stored.
        const stored = updated?.profile ?? (await db.query.moduleOnboarding.findFirst({ where: eq(moduleOnboarding.id, runId) }))?.profile
        if (!stored) return json({ error: "The onboarding changed. Reload and try again." }, 409)
        const done: OnboardingNextResponse = { done: true, profile: stored, level: stored.level }
        return json(done)
    }

    const turn: OnboardingTurn = {
        index: turns.length,
        question: question!,
        answer: null,
        askedAt: new Date().toISOString(),
        answeredAt: null,
    }
    const nextTurns = [...turns, turn]
    const [updated] = await db
        .update(moduleOnboarding)
        .set({ turns: nextTurns, openQuestionCount: openCount(nextTurns) })
        .where(and(
            eq(moduleOnboarding.id, runId),
            eq(moduleOnboarding.status, "in_progress"),
            sql`jsonb_array_length(${moduleOnboarding.turns}) = ${turns.length}`,
        ))
        .returning()

    if (updated) {
        const out: OnboardingNextResponse = { done: false, turn }
        return json(out)
    }

    // Someone else appended first (double click, retry). Their turn is the truth.
    const again = await db.query.moduleOnboarding.findFirst({ where: eq(moduleOnboarding.id, runId) })
    const theirs = again?.turns?.[again.turns.length - 1]
    if (again?.status === "completed" && again.profile) {
        const done: OnboardingNextResponse = { done: true, profile: again.profile, level: again.profile.level }
        return json(done)
    }
    if (theirs && !theirs.answer) {
        const out: OnboardingNextResponse = { done: false, turn: theirs }
        return json(out)
    }
    return json({ error: "The onboarding changed. Reload and try again." }, 409)
}
