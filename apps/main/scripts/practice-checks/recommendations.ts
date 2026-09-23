// ─────────────────────────────────────────────────────────────────────────────
// Check for plan/practice-dsa PD-15 (recommended problems), against a DEVELOPMENT
// database, the seeded DSA catalogue and the real model.
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/recommendations.ts
// ─────────────────────────────────────────────────────────────────────────────

import { and, eq } from "drizzle-orm"
import { db, users, moduleOnboarding, practiceProblem, practiceRecommendation, type OnboardingProfile } from "@repo/db"
import { POST as recommendPost } from "@/app/api/practice/recommendations/route"
import { getRecommendations } from "@/actions/(main)/practice/recommendations.action"
import { MAX_RECOMMENDATIONS, MAX_WHY_CHARS } from "@/lib/practice/recommend-prompt"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const createId = () => `e2e${crypto.randomUUID().replace(/-/g, "")}`
const userId = createId()
process.env.E2E_USER_ID = userId

const PROFILE: OnboardingProfile = {
    level: "developing",
    facts: [
        "Has solved around 30 problems, mostly on LeetCode and GeeksforGeeks.",
        "Uses C++ and is preparing for campus placements.",
        "Can give 5 to 10 hours a week.",
    ],
    strengths: ["Arrays", "Hashing"],
    gaps: ["Graphs", "Trees", "Dynamic programming"],
    goals: ["Clear campus placement interviews"],
    summary: [
        "You have solved around 30 problems, mostly on LeetCode and GeeksforGeeks.",
        "You are comfortable with Arrays and Hashing but fear Graphs and Trees.",
        "You can dedicate 5 to 10 hours a week to improve your DSA skills.",
    ],
}

type Reply = { items?: Array<{ slug: string; why: string }>; cached?: boolean; empty?: boolean; needsOnboarding?: boolean; error?: string; generatedAt?: string }
const call = async (body: unknown) => {
    const res = (await recommendPost(new Request("http://x/api/practice/recommendations", { method: "POST", body: JSON.stringify(body) }) as never)) as Response
    return { status: res.status, body: (await res.json()) as Reply }
}

await db.insert(users).values({ id: userId, name: "Rec Tester", email: `e2e-rec-${userId}@shipithq.test`, emailVerified: true, onboardingCompleted: true } as typeof users.$inferInsert)

try {
    const catalogue = await db.select({ slug: practiceProblem.slug, category: practiceProblem.category }).from(practiceProblem).where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true)))
    check("the DSA catalogue is seeded", catalogue.length >= 50, `${catalogue.length} problems`)
    const slugs = new Set(catalogue.map((c) => c.slug))

    // ── Without a completed onboarding ──────────────────────────────────────
    const none = await call({ module: "DSA" })
    check("no onboarding: refused, and says so", none.status === 409 && none.body.needsOnboarding === true)
    check("the cached read is empty before anything is generated", (await getRecommendations("DSA")).items.length === 0)

    // ── With one ────────────────────────────────────────────────────────────
    await db.insert(moduleOnboarding).values({
        userId, moduleKey: "practice:dsa", version: 1, status: "completed",
        turns: [], profile: PROFILE, level: PROFILE.level,
    } as typeof moduleOnboarding.$inferInsert)

    const first = await call({ module: "DSA" })
    const items = first.body.items ?? []
    check("recommendations come back", first.status === 200 && items.length > 0, `${items.length} items`)
    check(`between 10 and ${MAX_RECOMMENDATIONS} of them`, items.length >= 10 && items.length <= MAX_RECOMMENDATIONS, `${items.length}`)
    check("every slug is a real problem", items.every((i) => slugs.has(i.slug)), items.filter((i) => !slugs.has(i.slug)).map((i) => i.slug).join(", "))
    check("no duplicates", new Set(items.map((i) => i.slug)).size === items.length)
    check("each has a reason within the cap", items.every((i) => i.why.length > 0 && i.why.length <= MAX_WHY_CHARS))
    check("no em or en dashes in the reasons", items.every((i) => !/[—–]/.test(i.why)))
    const gapCats = new Set(["graphs", "trees", "dynamic-programming", "advanced-graphs", "1d-dp", "2d-dp"])
    const byCat = new Map(catalogue.map((c) => [c.slug, c.category]))
    const hitsGaps = items.some((i) => gapCats.has(byCat.get(i.slug) ?? ""))
    check("it reaches into the topics this learner avoids", hitsGaps, [...new Set(items.map((i) => byCat.get(i.slug)))].join(", ").slice(0, 90))
    console.log(`  first three: ${items.slice(0, 3).map((i) => `${i.slug} - ${i.why}`).join(" | ")}`)

    const [stored] = await db.select().from(practiceRecommendation).where(eq(practiceRecommendation.userId, userId))
    check("stored once, with the level it was built from", !!stored && stored.items.length === items.length && stored.level === "developing")
    check("the read action returns the same list", (await getRecommendations("DSA")).items.length === items.length)

    // ── Cache, and Refresh ──────────────────────────────────────────────────
    const startedAt = Date.now()
    const second = await call({ module: "DSA" })
    const tookMs = Date.now() - startedAt
    check("a second call is served from the cache, with no model call", second.body.cached === true && tookMs < 1500, `${tookMs} ms`)
    const same = (a: Array<{ slug: string; why: string }> = [], b: Array<{ slug: string; why: string }> = []) =>
        a.length === b.length && a.every((x, i) => x.slug === b[i]!.slug && x.why === b[i]!.why)
    check("the cached call returns the same list", same(second.body.items, items))
    const tooSoon = await call({ module: "DSA", force: true })
    check("a refresh straight after the last one is refused", tooSoon.status === 429)
    await db.update(practiceRecommendation).set({ generatedAt: new Date(Date.now() - 5 * 60_000) }).where(eq(practiceRecommendation.userId, userId))

    const forced = await call({ module: "DSA", force: true })
    check("Refresh regenerates", forced.status === 200 && forced.body.cached === false && (forced.body.items ?? []).length > 0)
    const [afterForce] = await db.select().from(practiceRecommendation).where(eq(practiceRecommendation.userId, userId))
    check("one row per user and module after a refresh", !!afterForce && (afterForce.generatedAt.getTime() >= (stored?.generatedAt.getTime() ?? 0)))

    // ── Bad input ───────────────────────────────────────────────────────────
    check("an unknown module is refused", (await call({ module: "NOPE" })).status === 400)
    check("a module with no catalogue returns an empty list", (await call({ module: "WEB_BACKEND" })).status === 409)
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    await db.delete(users).where(eq(users.id, userId)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
