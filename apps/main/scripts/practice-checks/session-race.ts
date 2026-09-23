// Two requests opening the same problem at the same moment must not crash
// (the `uq_practice_user_session_user_id_problem_id_mode` violation Niraj hit,
// 2026-09-22). Run like the other practice checks.

import { and, eq } from "drizzle-orm"
import { db, users, practiceProblem, practiceUserSession } from "@repo/db"
import { getOrCreateSession } from "@/actions/(main)/practice/practice.action"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const userId = `e2e${crypto.randomUUID().replace(/-/g, "")}`
process.env.E2E_USER_ID = userId
await db.insert(users).values({ id: userId, name: "Race Tester", email: `e2e-race-${userId}@shipithq.test`, emailVerified: true, onboardingCompleted: true } as typeof users.$inferInsert)

try {
    const [problem] = await db.select({ id: practiceProblem.id, slug: practiceProblem.slug }).from(practiceProblem).where(eq(practiceProblem.module, "DSA")).limit(1)
    if (!problem) throw new Error("No DSA problem seeded")

    // Four at once, the way a page render plus a prefetch plus a second tab arrive.
    const results = await Promise.all([
        getOrCreateSession(problem.slug, "EXAM"),
        getOrCreateSession(problem.slug, "EXAM"),
        getOrCreateSession(problem.slug, "EXAM"),
        getOrCreateSession(problem.slug, "EXAM"),
    ])
    check("four simultaneous opens all return a session", results.every((r) => r !== null))
    const ids = new Set(results.map((r) => r?.id))
    check("they all get the SAME session", ids.size === 1, `${ids.size} distinct ids`)
    const rows = await db.select().from(practiceUserSession).where(and(eq(practiceUserSession.userId, userId), eq(practiceUserSession.problemId, problem.id), eq(practiceUserSession.mode, "EXAM")))
    check("exactly one row exists", rows.length === 1, `${rows.length} rows`)

    // The other mode is a different session, as the unique index intends.
    const assist = await getOrCreateSession(problem.slug, "ASSIST")
    check("the other mode still gets its own session", Boolean(assist) && assist!.id !== results[0]!.id)
    check("reopening returns the existing row, not a new one", (await getOrCreateSession(problem.slug, "EXAM"))?.id === results[0]!.id)
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    await db.delete(users).where(eq(users.id, userId)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
