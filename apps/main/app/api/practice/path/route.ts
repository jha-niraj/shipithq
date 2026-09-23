import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { getSession } from "@repo/auth"
import {
    db, moduleOnboarding, practiceLearnerProfile, practicePath, practiceProblem, practiceUserSession,
    type OnboardingProfile, type PathStage,
} from "@repo/db"
import { openai } from "@/lib/openai-client"
import type { CatalogueEntry } from "@/lib/practice/recommend-prompt"
import {
    MAX_GOAL_CHARS, MAX_STAGES, MAX_STAGE_PROBLEMS, MIN_STAGE_PROBLEMS, PATH_SYSTEM, buildPathUserMessage,
} from "@/lib/practice/path-prompt"
import { MODULE_CONFIG, type PracticeModule } from "@/types/practice"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/practice/path  { module, force? }
//
// The learner's route through a module: stages of problems by topic, each ending
// in a checkpoint (plan/practice-path, PP-2). A route handler for the same
// reasons as the onboarding question route: nothing is charged, it is one
// completion, and the page is waiting on it.
//
// Cached in `practice_path`. `force` re-plans and KEEPS every checkpoint result
// already recorded, so asking for a new plan never costs somebody their work.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = modelFor("practicePath")
/** The shortest gap between two re-plans for one user. */
const REPLAN_COOLDOWN_MS = 60_000

const ONBOARDING_KEY: Record<PracticeModule, string> = {
    DSA: "practice:dsa",
    SYSTEM_DESIGN: "practice:system-design",
    WEB_FRONTEND: "practice:web-frontend",
    WEB_BACKEND: "practice:web-backend",
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const isModule = (v: unknown): v is PracticeModule => typeof v === "string" && v in MODULE_CONFIG

const emptyCheckpoint = () => ({
    quiz: { status: "todo" as const },
    mock: { status: "todo" as const },
    exam: { status: "todo" as const },
})

/**
 * Keep only what the catalogue holds, and only in a shape the page can draw.
 *
 * Model output, so nothing is trusted: an invented slug is dropped, a slug used
 * twice is kept once, a stage left too short after that is dropped whole, and the
 * whole thing is capped. A path that survives empty is reported as empty.
 */
function cleanStages(raw: unknown, catalogue: Map<string, CatalogueEntry>, topics: Set<string>): PathStage[] {
    if (!Array.isArray(raw)) return []
    const used = new Set<string>()
    const stages: PathStage[] = []
    for (const item of raw) {
        if (!item || typeof item !== "object") continue
        const topic = String((item as { topic?: unknown }).topic ?? "").trim()
        const goalRaw = String((item as { goal?: unknown }).goal ?? "").replace(/\s+/g, " ").trim()
        const slugsRaw = (item as { slugs?: unknown }).slugs
        if (!Array.isArray(slugsRaw)) continue
        const slugs: string[] = []
        for (const s of slugsRaw) {
            const slug = String(s ?? "").trim()
            if (!slug || used.has(slug) || !catalogue.has(slug)) continue
            used.add(slug)
            slugs.push(slug)
            if (slugs.length >= MAX_STAGE_PROBLEMS) break
        }
        if (slugs.length < MIN_STAGE_PROBLEMS) continue
        // The topic is a label; fall back to the first problem's own topic rather
        // than printing whatever the model called it.
        const first = catalogue.get(slugs[0]!)!
        stages.push({
            topic: topics.has(topic) ? topic : first.topic,
            goal: goalRaw.length > MAX_GOAL_CHARS ? `${goalRaw.slice(0, MAX_GOAL_CHARS - 1).trimEnd()}…` : goalRaw,
            slugs,
            // The exam part opens the stage's last problem, which its own order makes
            // the hardest one.
            checkpoint: { ...emptyCheckpoint(), examSlug: slugs[slugs.length - 1] },
        })
        if (stages.length >= MAX_STAGES) break
    }
    return stages
}

/**
 * Carry finished work across a re-plan.
 *
 * A stage in the new plan that covers the same topic as one in the old plan
 * inherits its checkpoint, because the checkpoint belongs to the topic, not to
 * the list of problems under it. Anything else starts fresh.
 */
function carryOver(next: PathStage[], previous: PathStage[]): PathStage[] {
    const byTopic = new Map(previous.map((s) => [s.topic, s]))
    return next.map((stage) => {
        const old = byTopic.get(stage.topic)
        if (!old) return stage
        return {
            ...stage,
            addedSlugs: old.addedSlugs,
            checkpoint: { ...old.checkpoint, examSlug: stage.checkpoint.examSlug ?? old.checkpoint.examSlug },
        }
    })
}

export async function POST(request: NextRequest) {
    const session = await getSession(request.headers)
    if (!session?.user?.id) return json(401, { error: "Unauthorized" })
    const userId = session.user.id

    let body: { module?: unknown; force?: unknown }
    try {
        body = (await request.json()) as typeof body
    } catch {
        return json(400, { error: "Invalid JSON body" })
    }
    if (!isModule(body.module)) return json(400, { error: "Unknown module" })
    const module = body.module
    const force = body.force === true

    const [cached] = await db
        .select()
        .from(practicePath)
        .where(and(eq(practicePath.userId, userId), eq(practicePath.module, module)))
        .limit(1)
    if (cached && cached.stages.length > 0 && !force) {
        return json(200, { stages: cached.stages, generatedAt: cached.generatedAt.toISOString(), cached: true })
    }
    /*
     * A held Re-plan button is an unlimited spend on our key: nothing is charged
     * for this call. The row already records when it was last written, so that is
     * the cooldown - no counter, no new table.
     */
    if (cached && force) {
        const sinceMs = Date.now() - cached.generatedAt.getTime()
        if (sinceMs < REPLAN_COOLDOWN_MS) {
            return json(429, {
                error: "Just a moment before planning again.",
                retryAfterSeconds: Math.ceil((REPLAN_COOLDOWN_MS - sinceMs) / 1000),
                stages: cached.stages,
                generatedAt: cached.generatedAt.toISOString(),
            })
        }
    }

    const completed = await db.query.moduleOnboarding.findFirst({
        where: and(
            eq(moduleOnboarding.userId, userId),
            eq(moduleOnboarding.moduleKey, ONBOARDING_KEY[module]),
            eq(moduleOnboarding.status, "completed"),
        ),
        orderBy: (t, { desc }) => [desc(t.version)],
    })
    const profile = completed?.profile as OnboardingProfile | null | undefined
    if (!profile) return json(409, { error: "Finish the onboarding first.", needsOnboarding: true })

    const problems = await db
        .select({
            slug: practiceProblem.slug,
            title: practiceProblem.title,
            category: practiceProblem.category,
            difficulty: practiceProblem.difficulty,
        })
        .from(practiceProblem)
        .where(and(eq(practiceProblem.module, module), eq(practiceProblem.isActive, true)))
    if (problems.length === 0) return json(200, { stages: [], generatedAt: new Date().toISOString(), cached: false, empty: true })

    const categories = MODULE_CONFIG[module]?.categories ?? {}
    const catalogue = new Map<string, CatalogueEntry>(
        problems.map((p) => [p.slug, {
            slug: p.slug,
            title: p.title,
            topic: categories[p.category]?.name ?? p.category,
            difficulty: p.difficulty,
        }]),
    )
    const topics = new Set([...catalogue.values()].map((c) => c.topic))

    const solved = await db
        .select({ slug: practiceProblem.slug })
        .from(practiceUserSession)
        .innerJoin(practiceProblem, eq(practiceProblem.id, practiceUserSession.problemId))
        .where(and(
            eq(practiceUserSession.userId, userId),
            eq(practiceUserSession.module, module),
            eq(practiceUserSession.status, "COMPLETED"),
        ))

    // What the mentor has seen, where there is any: a path planned after ten problems
    // should know which concepts wobbled, not just what the user said in onboarding.
    const memory = await db.query.practiceLearnerProfile.findFirst({
        where: and(eq(practiceLearnerProfile.userId, userId), eq(practiceLearnerProfile.module, module)),
        columns: { concepts: true, mistakes: true },
    })
    const weakConcepts = [
        ...(memory?.concepts ?? []).filter((c) => c.status === "shaky").map((c) => c.label),
        ...(memory?.mistakes ?? []).map((m) => m.label),
    ].slice(0, 12)

    let stages: PathStage[] = []
    try {
        const completion = (await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.4,
            max_tokens: 2200,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: PATH_SYSTEM },
                {
                    role: "user",
                    content: buildPathUserMessage({
                        moduleLabel: MODULE_CONFIG[module]?.label ?? module,
                        profile,
                        catalogue: [...catalogue.values()],
                        solvedSlugs: solved.map((s) => s.slug),
                        weakConcepts,
                    }),
                },
            ],
        })) as { choices?: Array<{ message?: { content?: string | null } }> }
        const content = completion?.choices?.[0]?.message?.content ?? "{}"
        stages = cleanStages((JSON.parse(content) as { stages?: unknown }).stages, catalogue, topics)
    } catch (error: unknown) {
        console.error("[practice/path] model call failed:", error)
        if (cached && cached.stages.length > 0) {
            return json(200, { stages: cached.stages, generatedAt: cached.generatedAt.toISOString(), cached: true, stale: true })
        }
        return json(502, { error: "Could not lay out your path. Try again." })
    }

    if (stages.length === 0) {
        return json(200, { stages: [], generatedAt: new Date().toISOString(), cached: false, empty: true })
    }
    if (cached?.stages.length) stages = carryOver(stages, cached.stages)

    const generatedAt = new Date()
    await db
        .insert(practicePath)
        .values({
            userId,
            module,
            stages,
            onboardingVersion: completed?.version ?? null,
            level: profile.level,
            generatedAt,
        })
        .onConflictDoUpdate({
            target: [practicePath.userId, practicePath.module],
            set: { stages, onboardingVersion: completed?.version ?? null, level: profile.level, generatedAt },
        })

    return json(200, { stages, generatedAt: generatedAt.toISOString(), cached: false })
}
