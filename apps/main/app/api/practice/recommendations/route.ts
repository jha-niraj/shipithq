import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { modelFor } from "@repo/ai"
import { getSession } from "@repo/auth"
import {
    db, moduleOnboarding, practiceProblem, practiceRecommendation, practiceUserSession,
    type OnboardingProfile, type RecommendedProblem,
} from "@repo/db"
import { openai } from "@/lib/openai-client"
import {
    MAX_RECOMMENDATIONS, MAX_WHY_CHARS, RECOMMEND_SYSTEM, buildRecommendUserMessage, type CatalogueEntry,
} from "@/lib/practice/recommend-prompt"
import { MODULE_CONFIG, type PracticeModule } from "@/types/practice"

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/practice/recommendations  { module, force? }
//
// Which problems this user should do next, picked by the model from the module's
// catalogue and the answers they gave in onboarding (plan/practice-dsa, PD-15).
//
// A route handler, like the onboarding question route and for the same reasons:
// nothing is charged, it is one completion of a few hundred JSON tokens, and the
// user is watching the tab it fills. Cached in `practice_recommendation`; only
// `force` (the Refresh control) pays for a second call.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = modelFor("practiceRecommendations")
/** The shortest gap between two refreshes for one user. */
const REFRESH_COOLDOWN_MS = 60_000
/** The onboarding key behind each practice module's profile. */
const ONBOARDING_KEY: Record<PracticeModule, string> = {
    DSA: "practice:dsa",
    SYSTEM_DESIGN: "practice:system-design",
    WEB_FRONTEND: "practice:web-frontend",
    WEB_BACKEND: "practice:web-backend",
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

function isModule(value: unknown): value is PracticeModule {
    return typeof value === "string" && value in MODULE_CONFIG
}

/**
 * Keep only what the catalogue actually contains, in the model's order.
 *
 * Everything here is model output, so nothing is trusted: an invented slug is
 * dropped rather than shown as a dead row, a repeat is dropped, and a reason
 * that runs long is cut. A list that survives empty is reported as empty, and
 * the tab falls back to the full catalogue.
 */
function cleanItems(raw: unknown, catalogue: Map<string, CatalogueEntry>): RecommendedProblem[] {
    if (!Array.isArray(raw)) return []
    const seen = new Set<string>()
    const out: RecommendedProblem[] = []
    for (const item of raw) {
        if (!item || typeof item !== "object") continue
        const slug = String((item as { slug?: unknown }).slug ?? "").trim()
        if (!slug || seen.has(slug) || !catalogue.has(slug)) continue
        seen.add(slug)
        const why = String((item as { why?: unknown }).why ?? "").replace(/\s+/g, " ").trim()
        out.push({ slug, why: why.length > MAX_WHY_CHARS ? `${why.slice(0, MAX_WHY_CHARS - 1).trimEnd()}…` : why })
        if (out.length >= MAX_RECOMMENDATIONS) break
    }
    return out
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
        .from(practiceRecommendation)
        .where(and(eq(practiceRecommendation.userId, userId), eq(practiceRecommendation.module, module)))
        .limit(1)
    if (cached && !force) {
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

    // The profile IS the input. Without a completed onboarding there is nothing to
    // recommend from, and guessing would be worse than the catalogue's own order.
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
    if (problems.length === 0) return json(200, { items: [], generatedAt: new Date().toISOString(), cached: false })

    const categories = MODULE_CONFIG[module]?.categories ?? {}
    const catalogue = new Map<string, CatalogueEntry>(
        problems.map((p) => [p.slug, {
            slug: p.slug,
            title: p.title,
            topic: categories[p.category]?.name ?? p.category,
            difficulty: p.difficulty,
        }]),
    )

    const solved = await db
        .select({ slug: practiceProblem.slug })
        .from(practiceUserSession)
        .innerJoin(practiceProblem, eq(practiceProblem.id, practiceUserSession.problemId))
        .where(and(
            eq(practiceUserSession.userId, userId),
            eq(practiceUserSession.module, module),
            eq(practiceUserSession.status, "COMPLETED"),
        ))

    let items: RecommendedProblem[] = []
    try {
        const completion = (await openai.chat.completions.create({
            model: MODEL,
            temperature: 0.4,
            max_tokens: 1800,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: RECOMMEND_SYSTEM },
                {
                    role: "user",
                    content: buildRecommendUserMessage({
                        moduleLabel: MODULE_CONFIG[module]?.label ?? module,
                        profile,
                        catalogue: [...catalogue.values()],
                        solvedSlugs: solved.map((s) => s.slug),
                    }),
                },
            ],
        })) as { choices?: Array<{ message?: { content?: string | null } }> }
        const content = completion?.choices?.[0]?.message?.content ?? "{}"
        items = cleanItems((JSON.parse(content) as { items?: unknown }).items, catalogue)
    } catch (error: unknown) {
        console.error("[practice/recommendations] model call failed:", error)
        // A cached list is better than nothing when a refresh fails.
        if (cached) return json(200, { items: cached.items, generatedAt: cached.generatedAt.toISOString(), cached: true, stale: true })
        return json(502, { error: "Could not work out your recommendations. Try again." })
    }

    if (items.length === 0) {
        return json(200, { items: [], generatedAt: new Date().toISOString(), cached: false, empty: true })
    }

    const generatedAt = new Date()
    await db
        .insert(practiceRecommendation)
        .values({
            userId,
            module,
            items,
            onboardingVersion: completed?.version ?? null,
            level: profile.level,
            generatedAt,
        })
        .onConflictDoUpdate({
            target: [practiceRecommendation.userId, practiceRecommendation.module],
            set: { items, onboardingVersion: completed?.version ?? null, level: profile.level, generatedAt },
        })

    return json(200, { items, generatedAt: generatedAt.toISOString(), cached: false })
}
