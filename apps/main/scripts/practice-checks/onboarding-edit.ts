// ─────────────────────────────────────────────────────────────────────────────
// Check for plan/module-onboarding MO-8 (edit an earlier answer in place) and
// MO-10 (the `?onboarding=1` param), against a DEVELOPMENT database and the real
// question model. Creates two test users and deletes them.
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/onboarding-edit.ts
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from "drizzle-orm"
import { db, users, moduleOnboarding } from "@repo/db"
import {
    startOnboardingRun, answerOnboardingTurn, editOnboardingAnswer,
} from "@/actions/(main)/onboarding/module-onboarding.action"
import { POST as onboardingNext } from "@/app/api/onboarding/next/route"
import * as React from "react"
// Server components compile with the classic JSX transform under plain tsx.
;(globalThis as { React?: typeof React }).React = React
const { PracticeModulePage } = await import("@/app/(main)/practice/_components/practice-module-page")

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const createId = () => `e2e${crypto.randomUUID().replace(/-/g, "")}`
const alice = createId(), bob = createId()
for (const id of [alice, bob]) {
    await db.insert(users).values({ id, name: "Edit Tester", email: `e2e-edit-${id}@shipithq.test`, emailVerified: true, onboardingCompleted: true, university: "Test University", semester: "5th Semester", learningPreferences: ["dsa"] } as typeof users.$inferInsert)
}
const as = (id: string) => { process.env.E2E_USER_ID = id }

type Next = { done: boolean; turn?: { index: number; question: { kind: string; options: string[]; text: string } }; error?: string }

/** Where a server page redirected to, or null when it rendered. */
async function redirectOf(fn: () => Promise<unknown>): Promise<string | null> {
    try { await fn(); return null } catch (e: unknown) {
        const digest = (e as { digest?: string })?.digest ?? ""
        if (!digest.startsWith("NEXT_REDIRECT")) throw e
        return digest.split(";")[2] ?? ""
    }
}
const page = (onboardingParam: boolean, resume = false, topic: string | null = null) =>
    PracticeModulePage({ module: "DSA", moduleLabel: "DSA", onboardingKey: "practice:dsa", topic, resume, onboardingParam })

try {
    as(alice)
    // ── MO-10: the URL follows what the page shows ─────────────────────────
    check("unfinished onboarding without the param redirects to it", (await redirectOf(() => page(false))) === "/practice/dsa?onboarding=1")
    check("with the param it renders (no redirect)", (await redirectOf(() => page(true))) === null)

    // ── MO-8: answer to question 5, then edit answer 1 ─────────────────────
    const run = await startOnboardingRun("practice:dsa")
    const runId = run.success ? run.run.id : ""
    const next = async () => (await (await onboardingNext(new Request("http://x", { method: "POST", body: JSON.stringify({ runId }) }) as never)).json()) as Next
    let r = await next()
    const firstQ = r.turn!
    for (let k = 0; k < 4 && !r.done; k++) {
        const t = r.turn!
        const values = t.question.kind === "open" ? ["About 40 problems, mostly arrays and strings, in C++."] : [t.question.options[0]!]
        const a = await answerOnboardingTurn(runId, t.index, values, false)
        if (!a.success) { check(`answer Q${t.index + 1}`, false, a.error); break }
        r = await next()
    }
    const current = r.turn!
    const [before] = await db.select().from(moduleOnboarding).where(eq(moduleOnboarding.id, runId))
    const turnsBefore = before!.turns
    check("on question 5 with 4 answered", turnsBefore.length === 5 && current.index === 4 && !turnsBefore[4]!.answer, `${turnsBefore.length} turns`)

    const q1 = turnsBefore[0]!
    const newValues = q1.question.kind === "open"
        ? ["Changed: I have solved about 150 problems."]
        : q1.question.kind === "multi"
            ? q1.question.options.slice(-2)
            : [q1.question.options[q1.question.options.length - 1]!]
    const edited = await editOnboardingAnswer(runId, 0, newValues, false)
    check("edit answer 1 succeeds", edited.success, edited.success ? "" : edited.error)
    const [after] = await db.select().from(moduleOnboarding).where(eq(moduleOnboarding.id, runId))
    const turnsAfter = after!.turns
    check("every turn is kept (no truncation)", turnsAfter.length === turnsBefore.length, `${turnsBefore.length} -> ${turnsAfter.length}`)
    check("only answer 1 changed", JSON.stringify(turnsAfter[0]!.answer!.values) === JSON.stringify(newValues)
        && turnsAfter.slice(1).every((t, i) => JSON.stringify(t) === JSON.stringify(turnsBefore[i + 1])))
    check("question 1 text unchanged", turnsAfter[0]!.question.text === firstQ.question.text)
    const resumed = await next()
    check("the current question is the same one, not regenerated", !resumed.done && resumed.turn?.index === 4 && resumed.turn.question.text === current.question.text)

    // ── Refusals ────────────────────────────────────────────────────────────
    const unanswered = await editOnboardingAnswer(runId, 4, [current.question.options[0] ?? "x"], false)
    check("editing the unanswered current question is refused", !unanswered.success)
    if (q1.question.kind !== "open") {
        const bogus = await editOnboardingAnswer(runId, 0, ["not one of the options"], false)
        check("an option that does not exist is refused", !bogus.success)
    }
    const outOfRange = await editOnboardingAnswer(runId, 99, ["x"], false)
    check("an index past the end is refused", !outOfRange.success)
    as(bob)
    const foreign = await editOnboardingAnswer(runId, 0, newValues, false)
    check("another user cannot edit it", !foreign.success)
    as(alice)

    // ── Finish, then the dashboard drops the param ──────────────────────────
    let n = 0
    r = resumed
    while (!r.done && n < 12) {
        n++
        const t = r.turn!
        const values = t.question.kind === "open" ? ["Mostly consistent practice, a few contests."] : [t.question.options[0]!]
        await answerOnboardingTurn(runId, t.index, values, false)
        r = await next()
    }
    check("the run still finishes after an edit", r.done === true, `${n} more answers`)
    const [done] = await db.select().from(moduleOnboarding).where(eq(moduleOnboarding.id, runId))
    check("the finished run keeps the edited answer", JSON.stringify(done!.turns[0]!.answer!.values) === JSON.stringify(newValues))
    const edit2 = await editOnboardingAnswer(runId, 0, newValues, false)
    check("a finished run cannot be edited", !edit2.success)
    check("completed + stale param redirects to the dashboard", (await redirectOf(() => page(true))) === "/practice/dsa")
    check("a topic filter survives that redirect", (await redirectOf(() => page(true, false, "arrays"))) === "/practice/dsa?topic=arrays")
    check("retake without the param goes to onboarding with retake", (await redirectOf(() => page(false, true))) === "/practice/dsa?onboarding=1&resume=1")
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    for (const id of [alice, bob]) await db.delete(users).where(eq(users.id, id)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
}
