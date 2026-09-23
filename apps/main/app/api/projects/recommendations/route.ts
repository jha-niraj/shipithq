import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { getSession } from "@repo/auth"
import {
    db, moduleOnboarding, projectRecommendation, projectsV2, userProjectV2Progress,
    type OnboardingProfile, type RecommendedIdea,
} from "@repo/db"
import { openai } from "@/lib/openai-client"
import {
    IDEAS_SYSTEM, MAX_DESCRIPTION_CHARS, MAX_IDEAS, MAX_TITLE_CHARS, MAX_WHY_CHARS, buildIdeasUserMessage,
} from "@/lib/projects/recommend-prompt"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/projects/recommendations  { force? }
//
// Which projects this builder should build next, picked by the model from the
// idea catalogue and the answers they gave in the projects onboarding
// (plan/projects, PJ-1). A route handler, like the practice ones: nothing is
// charged, it is one completion, and the page is waiting on it. Cached in
// `project_recommendation`; only `force` pays for a second call.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = modelFor("projectRecommendations")
/** The shortest gap between two picks for one user. */
const REFRESH_COOLDOWN_MS = 60_000
const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

/** Model output, so nothing is trusted: fields are required, typed and capped. */
function cleanItems(raw: unknown): RecommendedIdea[] {
    if (!Array.isArray(raw)) return []
    const seen = new Set<string>()
    const out: RecommendedIdea[] = []
    const cut = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max)
    for (const item of raw) {
        if (!item || typeof item !== "object") continue
        const title = cut((item as { title?: unknown }).title, MAX_TITLE_CHARS)
        const description = cut((item as { description?: unknown }).description, MAX_DESCRIPTION_CHARS)
        if (!title || !description) continue
        const key = title.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const rawDifficulty = cut((item as { difficulty?: unknown }).difficulty, 12).toUpperCase()
        const technologies = Array.isArray((item as { technologies?: unknown }).technologies)
            ? ((item as { technologies: unknown[] }).technologies).map((t) => cut(t, 24)).filter(Boolean).slice(0, 5)
            : []
        out.push({
            title,
            description,
            difficulty: rawDifficulty === "EASY" || rawDifficulty === "HARD" ? rawDifficulty : "MEDIUM",
            technologies,
            why: cut((item as { why?: unknown }).why, MAX_WHY_CHARS),
        })
        if (out.length >= MAX_IDEAS) break
    }
    return out
}

export async function POST(request: NextRequest) {
    const session = await getSession(request.headers)
    if (!session?.user?.id) return json(401, { error: "Unauthorized" })
    const userId = session.user.id

    let force = false
    try {
        const body = (await request.json()) as { force?: unknown }
        force = body.force === true
    } catch {
        // An empty body is the normal "give me the cached list" call.
    }

    const [cached] = await db
        .select()
        .from(projectRecommendation)
        .where(eq(projectRecommendation.userId, userId))
        .limit(1)
    if (cached && cached.items.length > 0 && !force) {
        return json(200, { items: cached.items, generatedAt: cached.generatedAt.toISOString(), cached: true })
    }
    // Nothing is charged for this call, so the stored time is the cooldown.
    if (cached && force) {
        const sinceMs = Date.now() - cached.generatedAt.getTime()
        if (sinceMs < REFRESH_COOLDOWN_MS) {
            return json(429, {
                error: "Just a moment before picking again.",
                retryAfterSeconds: Math.ceil((REFRESH_COOLDOWN_MS - sinceMs) / 1000),
                items: cached.items,
                generatedAt: cached.generatedAt.toISOString(),
            })
        }
    }

    const completed = await db.query.moduleOnboarding.findFirst({
        where: and(
            eq(moduleOnboarding.userId, userId),
            eq(moduleOnboarding.moduleKey, "projects"),
            eq(moduleOnboarding.status, "completed"),
        ),
        orderBy: (t, { desc: d }) => [d(t.version)],
    })
    const profile = completed?.profile as OnboardingProfile | null | undefined
    if (!profile) return json(409, { error: "Finish the onboarding first.", needsOnboarding: true })

    // A project belongs to a user through their progress row, not through a column
    // on the project itself.
    const mine = await db
        .select({ title: projectsV2.title })
        .from(userProjectV2Progress)
        .innerJoin(projectsV2, eq(projectsV2.id, userProjectV2Progress.projectId))
        .where(eq(userProjectV2Progress.userId, userId))
        .limit(20)

    let items: RecommendedIdea[] = []
    try {
        const completion = (await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.4,
            max_tokens: 1200,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: IDEAS_SYSTEM },
                {
                    role: "user",
                    content: buildIdeasUserMessage({
                        profile,
                        builtTitles: mine.map((m) => m.title).filter(Boolean),
                    }),
                },
            ],
        })) as { choices?: Array<{ message?: { content?: string | null } }> }
        const content = completion?.choices?.[0]?.message?.content ?? "{}"
        items = cleanItems((JSON.parse(content) as { items?: unknown }).items)
    } catch (error: unknown) {
        console.error("[projects/recommendations] model call failed:", error)
        if (cached && cached.items.length > 0) {
            return json(200, { items: cached.items, generatedAt: cached.generatedAt.toISOString(), cached: true, stale: true })
        }
        return json(502, { error: "Could not work out your picks. Try again." })
    }

    if (items.length === 0) return json(200, { items: [], generatedAt: new Date().toISOString(), cached: false, empty: true })

    const generatedAt = new Date()
    await db
        .insert(projectRecommendation)
        .values({ userId, items, onboardingVersion: completed?.version ?? null, level: profile.level, generatedAt })
        .onConflictDoUpdate({
            target: [projectRecommendation.userId],
            set: { items, onboardingVersion: completed?.version ?? null, level: profile.level, generatedAt },
        })

    return json(200, { items, generatedAt: generatedAt.toISOString(), cached: false })
}
