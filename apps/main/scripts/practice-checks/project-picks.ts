// Check for plan/projects PJ-1 (projects picked from the onboarding), against a
// DEVELOPMENT database, the real idea catalogue and the real model. Run like the
// other checks, with SEED_I_KNOW_WHAT_I_AM_DOING=1.

import { eq } from "drizzle-orm"
import { db, users, moduleOnboarding, projectIdeas, projectRecommendation, type OnboardingProfile } from "@repo/db"
import { POST as picksPost } from "@/app/api/projects/recommendations/route"
import { getProjectPicks } from "@/actions/(main)/projects/recommendations.action"
import { MAX_IDEAS, MAX_WHY_CHARS } from "@/lib/projects/recommend-prompt"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const userId = `e2e${crypto.randomUUID().replace(/-/g, "")}`
process.env.E2E_USER_ID = userId

const PROFILE: OnboardingProfile = {
    level: "developing",
    facts: [
        "Has started five projects and finished one.",
        "Nothing is deployed anywhere public yet.",
        "Builds alone, uses React and wants to learn a backend.",
        "Has about 6 hours a week.",
        "Past projects died from scope, not interest.",
    ],
    strengths: ["React", "UI work"],
    gaps: ["Backends", "Finishing"],
    goals: ["A portfolio piece for placements"],
    summary: ["a", "b", "c"],
}

type Reply = { items?: Array<{ title: string; description: string; difficulty: string; technologies: string[]; why: string }>; needsOnboarding?: boolean; cached?: boolean; empty?: boolean }
const call = async (body: unknown) => {
    const res = (await picksPost(new Request("http://x/api/projects/recommendations", { method: "POST", body: JSON.stringify(body) }) as never)) as Response
    return { status: res.status, body: (await res.json()) as Reply }
}

await db.insert(users).values({ id: userId, name: "Picks Tester", email: `e2e-picks-${userId}@shipithq.test`, emailVerified: true, onboardingCompleted: true } as typeof users.$inferInsert)

try {
    // The picks are INVENTED from the profile (plan/projects, PJ-1), so they do not
    // need the catalogue. The catalogue is what the ideas page browses.
    const approved = await db.select({ id: projectIdeas.id }).from(projectIdeas).where(eq(projectIdeas.status, "APPROVED")).limit(200)
    console.log(`  catalogue: ${approved.length} approved ideas (browsing only)`)

    check("without the projects onboarding, picks are refused", (await call({})).body.needsOnboarding === true)
    check("the cached read is empty before anything is generated", (await getProjectPicks()).picks.length === 0)

    await db.insert(moduleOnboarding).values({
        userId, moduleKey: "projects", version: 1, status: "completed",
        turns: [], profile: PROFILE, level: PROFILE.level,
    } as typeof moduleOnboarding.$inferInsert)

    const first = await call({})
    const items = first.body.items ?? []
    check("picks come back", first.status === 200 && items.length > 0, `${items.length} picks`)
    check(`no more than ${MAX_IDEAS}`, items.length <= MAX_IDEAS)
    check("each pick has a title, a description and a difficulty", items.every((i) => i.title.length > 0 && i.description.length > 20 && ["EASY", "MEDIUM", "HARD"].includes(i.difficulty)))
    check("no two picks are the same project", new Set(items.map((i) => i.title.toLowerCase())).size === items.length)
    check("each pick names the tools it needs", items.every((i) => i.technologies.length >= 2))
    check("each pick says why, within the cap", items.every((i) => i.why.length > 0 && i.why.length <= MAX_WHY_CHARS))
    check("no em or en dashes in the reasons", items.every((i) => !/[—–]/.test(i.why)))
    console.log(`  first two: ${items.slice(0, 2).map((i) => `${i.title} - ${i.why}`).join(" | ")}`)

    const view = await getProjectPicks()
    check("the hub reads the same list, with titles", view.picks.length === items.length && view.picks.every((p) => p.title.length > 0))

    const started = Date.now()
    const second = await call({})
    check("a second call is served from the cache", second.body.cached === true && Date.now() - started < 1500)
    const tooSoon = await call({ force: true })
    check("picking again straight away is refused", tooSoon.status === 429)
    await db.update(projectRecommendation).set({ generatedAt: new Date(Date.now() - 5 * 60_000) }).where(eq(projectRecommendation.userId, userId))

    const forced = await call({ force: true })
    check("Pick again regenerates", forced.status === 200 && forced.body.cached === false && (forced.body.items ?? []).length > 0)
    const rows = await db.select().from(projectRecommendation).where(eq(projectRecommendation.userId, userId))
    check("one row per user", rows.length === 1)
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    await db.delete(users).where(eq(users.id, userId)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
