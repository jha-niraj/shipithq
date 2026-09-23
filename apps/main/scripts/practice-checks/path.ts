// ─────────────────────────────────────────────────────────────────────────────
// Check for plan/practice-path PP-2 (building a path), against a DEVELOPMENT
// database, the seeded DSA catalogue and the real model.
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/path.ts
// ─────────────────────────────────────────────────────────────────────────────

import { and, eq } from "drizzle-orm"
import { db, users, moduleOnboarding, practiceProblem, practicePath, type OnboardingProfile, type PathStage } from "@repo/db"
import { POST as pathPost } from "@/app/api/practice/path/route"
import { MAX_GOAL_CHARS, MAX_STAGES, MAX_STAGE_PROBLEMS, MIN_STAGES, MIN_STAGE_PROBLEMS } from "@/lib/practice/path-prompt"

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
    facts: ["Has solved around 30 problems.", "Uses C++, preparing for campus placements.", "Has 5 to 10 hours a week."],
    strengths: ["Arrays", "Hashing"],
    gaps: ["Graphs", "Trees", "Dynamic programming"],
    goals: ["Clear campus placement interviews"],
    summary: ["a", "b", "c"],
}

type Reply = { stages?: PathStage[]; cached?: boolean; error?: string; needsOnboarding?: boolean; retryAfterSeconds?: number }
const call = async (body: unknown) => {
    const res = (await pathPost(new Request("http://x/api/practice/path", { method: "POST", body: JSON.stringify(body) }) as never)) as Response
    return { status: res.status, body: (await res.json()) as Reply }
}

await db.insert(users).values({ id: userId, name: "Path Tester", email: `e2e-path-${userId}@shipithq.test`, emailVerified: true, onboardingCompleted: true } as typeof users.$inferInsert)

try {
    const catalogue = await db.select({ slug: practiceProblem.slug, category: practiceProblem.category }).from(practiceProblem).where(and(eq(practiceProblem.module, "DSA"), eq(practiceProblem.isActive, true)))
    const slugs = new Set(catalogue.map((c) => c.slug))

    check("without an onboarding, a path is refused", (await call({ module: "DSA" })).body.needsOnboarding === true)

    await db.insert(moduleOnboarding).values({
        userId, moduleKey: "practice:dsa", version: 1, status: "completed",
        turns: [], profile: PROFILE, level: PROFILE.level,
    } as typeof moduleOnboarding.$inferInsert)

    const first = await call({ module: "DSA" })
    const stages = first.body.stages ?? []
    check("a path comes back", first.status === 200 && stages.length > 0, `${stages.length} stages`)
    check(`between ${MIN_STAGES} and ${MAX_STAGES} stages`, stages.length >= MIN_STAGES && stages.length <= MAX_STAGES, `${stages.length}`)
    check(`every stage has ${MIN_STAGE_PROBLEMS} to ${MAX_STAGE_PROBLEMS} problems`, stages.every((s) => s.slugs.length >= MIN_STAGE_PROBLEMS && s.slugs.length <= MAX_STAGE_PROBLEMS), stages.map((s) => s.slugs.length).join(","))
    const all = stages.flatMap((s) => s.slugs)
    check("every slug is a real problem", all.every((s) => slugs.has(s)))
    check("no problem appears twice in the whole path", new Set(all).size === all.length, `${all.length} slots, ${new Set(all).size} unique`)
    check("every stage has a goal within the cap", stages.every((s) => s.goal.length > 0 && s.goal.length <= MAX_GOAL_CHARS))
    check("no em or en dashes in the goals", stages.every((s) => !/[—–]/.test(s.goal)))
    check("every stage starts with an untouched checkpoint", stages.every((s) => s.checkpoint.quiz.status === "todo" && s.checkpoint.mock.status === "todo" && s.checkpoint.exam.status === "todo"))
    check("the exam part points at the stage's last problem", stages.every((s) => s.checkpoint.examSlug === s.slugs[s.slugs.length - 1]))
    const byCat = new Map(catalogue.map((c) => [c.slug, c.category]))
    const gapCats = new Set(["graphs", "advanced-graphs", "trees", "dynamic-programming", "1d-dp", "2d-dp"])
    const firstGapStage = stages.findIndex((s) => s.slugs.some((slug) => gapCats.has(byCat.get(slug) ?? "")))
    check("the topics they avoid appear, but not first", firstGapStage > 0, `first at stage ${firstGapStage + 1}`)
    console.log(`  stages: ${stages.map((s) => `${s.topic} (${s.slugs.length})`).join(" -> ")}`)
    console.log(`  goal 1: ${stages[0]?.goal}`)

    const [stored] = await db.select().from(practicePath).where(eq(practicePath.userId, userId))
    check("stored once, with the level it was planned from", !!stored && stored.stages.length === stages.length && stored.level === "developing")

    const cachedCallStart = Date.now()
    const second = await call({ module: "DSA" })
    check("a second call is served from the cache", second.body.cached === true && Date.now() - cachedCallStart < 1500)

    // ── A re-plan keeps finished work ───────────────────────────────────────
    const marked = stages.map((s, i): PathStage => i === 0
        ? { ...s, checkpoint: { ...s.checkpoint, quiz: { status: "passed", score: 83, at: new Date().toISOString() } } }
        : s)
    await db.update(practicePath).set({ stages: marked }).where(eq(practicePath.userId, userId))
    // The cooldown: a re-plan seconds after the last one is refused, because
    // nothing is charged for it (sweep, 2026-09-22).
    const tooSoon = await call({ module: "DSA", force: true })
    check("a re-plan straight after the last one is refused", tooSoon.status === 429)
    await db.update(practicePath).set({ generatedAt: new Date(Date.now() - 5 * 60_000) }).where(eq(practicePath.userId, userId))

    const replanned = await call({ module: "DSA", force: true })
    const newStages = replanned.body.stages ?? []
    check("a re-plan produces a path again", replanned.status === 200 && newStages.length > 0, `${newStages.length} stages`)
    const keptTopic = newStages.find((s) => s.topic === stages[0]!.topic)
    check("a passed checkpoint survives the re-plan", !keptTopic || keptTopic.checkpoint.quiz.status === "passed", keptTopic ? keptTopic.checkpoint.quiz.status : "topic gone")

    check("an unknown module is refused", (await call({ module: "NOPE" })).status === 400)
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    await db.delete(users).where(eq(users.id, userId)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
