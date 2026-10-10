// ─────────────────────────────────────────────────────────────────────────────
// Checks for plan/pathfinder PF-15 (a passed verification pays once), PF-16
// (the quiz is graded on the server and its answers never leave it) and PF-17
// (coding is judged Practice problems; runs the backfill script) and PF-19
// (passing a section never resets a finished one), against a
// DEVELOPMENT database. Creates a test user with a goal whose four sections are
// done, settles it twice at the same moment through `settleVerification` (what
// `checkVerificationCompletion` calls), and counts the refunds. In the app the
// section guards (mock session id, project IN_PROGRESS) already stop most
// doubles before this point; this checks the last line holds on its own.
// Deletes the user (goals cascade).
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     scripts/practice-checks/pathfinder-verify.ts
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from "node:child_process"
import { and, eq, inArray, like } from "drizzle-orm"
import { db, users, pathfinderGoals, pathfinderVerifications, creditTransactions, practiceProblem } from "@repo/db"
import { settleVerification } from "@/lib/pathfinder/settle"
import {
    submitVerificationQuiz, getVerificationStatus, getVerificationCoding, runVerificationSamples, submitVerificationCoding,
} from "@/actions/(main)/pathfinder/verification.action"
import { getPathfinderGoal } from "@/actions/(main)/pathfinder/goals.action"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`) }
const userId = `e2e${crypto.randomUUID().replace(/-/g, "")}`

try {
    await db.insert(users).values({ id: userId, name: "Verify Tester", email: `e2e-verify-${userId}@shipithq.test`, emailVerified: true, onboardingCompleted: true, credits: 0 } as typeof users.$inferInsert)
    process.env.E2E_USER_ID = userId

    const [goal] = await db.insert(pathfinderGoals).values({
        userId, title: "Race test goal", slug: `race-${userId}`, category: "DSA", level: "BEGINNER",
    } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
    const [v] = await db.insert(pathfinderVerifications).values({
        goalId: goal!.id,
        quizStatus: "COMPLETED", quizScore: 100,
        codingStatus: "COMPLETED", codingScore: 100,
        mockStatus: "COMPLETED", mockScore: 100,
        projectStatus: "LOCKED",
        verificationCreditsCharged: 100,
        generatedPlan: { quizQuestions: [] },
    } as typeof pathfinderVerifications.$inferInsert).returning({ id: pathfinderVerifications.id })

    const settle = () => settleVerification({
        verificationId: v!.id, goalId: goal!.id, userId, overallScore: 100,
        refundCredits: 100, refundDescription: "Pathfinder Verification Refund: 100% score (100 credits)",
    })
    const results = await Promise.all([settle(), settle()])
    check("exactly one call wins", results.filter(Boolean).length === 1, JSON.stringify(results))

    const refunds = await db.select().from(creditTransactions)
        .where(and(eq(creditTransactions.userId, userId), like(creditTransactions.description, "Pathfinder Verification Refund%")))
    check("exactly one refund row", refunds.length === 1, `${refunds.length} rows`)

    const [u] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId))
    check("credits raised once", u?.credits === 100, `credits = ${u?.credits}`)

    const [after] = await db.select({ passed: pathfinderVerifications.passed }).from(pathfinderVerifications).where(eq(pathfinderVerifications.id, v!.id))
    const [g] = await db.select({ status: pathfinderGoals.status }).from(pathfinderGoals).where(eq(pathfinderGoals.id, goal!.id))
    check("verification passed, goal completed", after?.passed === true && g?.status === "COMPLETED", `passed=${after?.passed} status=${g?.status}`)

    // ── PF-16: the quiz ──────────────────────────────────────────────────────
    // Five questions, the answer to each is option 1. The last has no id, as in
    // older plans, so it is addressed by position ("q4").
    const quizQuestions = Array.from({ length: 5 }, (_, i) => ({
        ...(i < 4 ? { id: `pf16-${i}` } : {}),
        question: `Question ${i}`, options: ["a", "b", "c", "d"], correctAnswer: 1,
        explanation: `SECRET-EXPLANATION-${i}`, difficulty: "EASY", category: "test",
    }))
    const [quizGoal] = await db.insert(pathfinderGoals).values({
        userId, title: "Quiz test goal", slug: `quiz-${userId}`, category: "DSA", level: "BEGINNER",
    } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
    await db.insert(pathfinderVerifications).values({
        goalId: quizGoal!.id, quizStatus: "PENDING", generatedPlan: { quizQuestions },
    } as typeof pathfinderVerifications.$inferInsert)

    const leaks = (x: unknown) => /correctAnswer|SECRET-EXPLANATION/.test(JSON.stringify(x))
    const viaGoal = await getPathfinderGoal(quizGoal!.id)
    const viaStatus = await getVerificationStatus(quizGoal!.id)
    check("getPathfinderGoal returns the questions", ((viaGoal.goal?.verification?.generatedPlan as { quizQuestions?: unknown[] })?.quizQuestions?.length ?? 0) === 5)
    check("getPathfinderGoal leaks no answer", !leaks(viaGoal), leaks(viaGoal) ? "found" : "")
    check("getVerificationStatus leaks no answer", !leaks(viaStatus))
    const ids = ((viaGoal.goal?.verification?.generatedPlan as { quizQuestions: { id: string }[] }).quizQuestions).map((q) => q.id)
    check("an id-less question is addressed by position", ids[4] === "q4", ids.join(","))

    // Two right, three wrong, every one claiming isCorrect, plus an unknown id
    // and a repeat of a right answer that would make three if it counted.
    const forged = [
        { questionId: "pf16-0", selectedAnswer: 1 }, { questionId: "q4", selectedAnswer: 1 },
        { questionId: "pf16-1", selectedAnswer: 0 }, { questionId: "pf16-2", selectedAnswer: 3 },
        { questionId: "pf16-1", selectedAnswer: 1 }, { questionId: "nope", selectedAnswer: 1 },
    ].map((a) => ({ ...a, isCorrect: true, timeTaken: 1 }))
    const fail1 = await submitVerificationQuiz({ goalId: quizGoal!.id, answers: forged, totalTime: 10 })
    check("forged isCorrect earns only what the choices earn", fail1.success === true && fail1.score === 40 && fail1.passed === false, `score=${fail1.score} passed=${fail1.passed}`)
    check("a failed attempt reveals no answer", !leaks(fail1), leaks(fail1) ? "found" : "")
    check("a failed attempt says which were wrong", (fail1.review ?? []).filter((r) => !r.correct).length === 3)

    const allRight = quizQuestions.map((q, i) => ({ questionId: q.id ?? `q${i}`, selectedAnswer: 1, timeTaken: 1 }))
    const pass1 = await submitVerificationQuiz({ goalId: quizGoal!.id, answers: allRight, totalTime: 10 })
    check("all right scores 100 and passes", pass1.score === 100 && pass1.passed === true, `score=${pass1.score}`)
    check("a pass reveals answers and explanations", (pass1.review ?? []).every((r) => r.correctAnswer === 1 && r.explanation?.startsWith("SECRET-EXPLANATION")))

    // ── PF-17: coding ────────────────────────────────────────────────────────
    // Two plans made before PF-17 (AI-written coding questions, no ids): a DSA
    // goal and a Kafka goal. The backfill gives the first judged problems and
    // the second none.
    const legacyPlan = { quizQuestions, codingQuestions: [{ id: "old", title: "Old", solution: { javascript: "x" } }] }
    const mkGoal = async (title: string, category: string) => {
        const [g] = await db.insert(pathfinderGoals).values({ userId, title, slug: `${category}-${title.replace(/\W+/g, "-")}-${userId}`, category, level: "BEGINNER" } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
        const [v] = await db.insert(pathfinderVerifications).values({
            goalId: g!.id, quizStatus: "PENDING", codingStatus: "PENDING", mockStatus: "PENDING", generatedPlan: legacyPlan,
        } as typeof pathfinderVerifications.$inferInsert).returning({ id: pathfinderVerifications.id })
        return { goalId: g!.id, vId: v!.id }
    }
    const dsa = await mkGoal("Arrays and hashing warmup", "DSA")
    const kafka = await mkGoal("Kafka Event Streaming", "BACKEND")

    const before = await getVerificationCoding(dsa.goalId)
    check("an old plan is refused until backfilled", !before.success && /older version/.test(before.error ?? ""), before.success ? "" : before.error)

    const run = (flag: string) => execSync(`pnpm script pathfinder-coding-problems ${flag}`, { cwd: "../../packages/db", encoding: "utf8" })
    const preview = run("")
    check("backfill preview lists both goals", preview.includes(dsa.vId) && preview.includes(kafka.vId))
    const applied = run("--apply")
    check("backfill applies and nothing is left", /Done: every generated verification has judged problems/.test(applied), applied.split("\n").slice(-3).join(" "))

    const [kv] = await db.select().from(pathfinderVerifications).where(eq(pathfinderVerifications.id, kafka.vId))
    check("Kafka goal: no problems, coding LOCKED", JSON.stringify((kv!.generatedPlan as { codingProblemIds?: unknown }).codingProblemIds) === "[]" && kv!.codingStatus === "LOCKED", `${kv!.codingStatus}`)

    const loaded = await getVerificationCoding(dsa.goalId)
    check("DSA goal gets 3 judged problems", loaded.success && loaded.problems.length === 3, loaded.success ? loaded.problems.map((p) => p.title).join(" | ") : loaded.error)
    if (!loaded.success) throw new Error("cannot continue PF-17 checks")
    check("the page gets no hidden test, harness or reference solution", !/"hidden":true|referenceSolution|harness|USER_CODE/.test(JSON.stringify(loaded)))
    check("old coding questions are gone from the plan", !JSON.stringify((await getPathfinderGoal(dsa.goalId)).goal?.verification).includes("codingQuestions"))

    const problemIds = loaded.problems.map((p) => p.id)
    const refs = await db.select({ id: practiceProblem.id, ref: practiceProblem.referenceSolution }).from(practiceProblem).where(inArray(practiceProblem.id, problemIds))
    const solution = (id: string) => {
        const r = refs.find((x) => x.id === id)!.ref ?? {}
        const lang = loaded.problems.find((p) => p.id === id)!.languages.find((l) => typeof (r as Record<string, string>)[l] === "string")!
        return { language: lang, code: (r as Record<string, string>)[lang]! }
    }
    const first = problemIds[0]!
    const wrong = { goalId: dsa.goalId, problemId: first, language: solution(first).language, code: loaded.problems[0]!.starterCode }

    const outsider = await runVerificationSamples({ ...wrong, problemId: "not-in-this-verification" })
    check("a problem outside the verification is refused", outsider.status === "unavailable" && /not part of/.test(outsider.message))

    const sampleRun = await runVerificationSamples({ ...solution(first), goalId: dsa.goalId, problemId: first })
    check("Run judges the reference solution's samples", sampleRun.status === "ok" && sampleRun.passed && sampleRun.kind === "run", sampleRun.status === "ok" ? `${sampleRun.samplePassed}/${sampleRun.sampleTotal}` : sampleRun.message)

    // Another problem's solution: compiles against the wrong harness, fails fast.
    const forgedCode = await submitVerificationCoding({ ...solution(problemIds[1]!), goalId: dsa.goalId, problemId: first, passed: true, testsPassed: 99, totalTests: 99 } as typeof wrong)
    check("a forged passed:true with wrong code fails", forgedCode.success === true && !(forgedCode.result.status === "ok" && forgedCode.result.passed), forgedCode.success ? `status=${forgedCode.result.status} score=${forgedCode.score}` : forgedCode.error)
    check("hidden cases come back blank", !forgedCode.success || forgedCode.result.status !== "ok" || forgedCode.result.cases.filter((c) => c.hidden).every((c) => c.input === "" && c.expectedOutput === ""))

    let last: Awaited<ReturnType<typeof submitVerificationCoding>> | null = null
    for (const id of problemIds) {
        last = await submitVerificationCoding({ ...solution(id), goalId: dsa.goalId, problemId: id })
        check(`reference solution solves ${loaded.problems.find((p) => p.id === id)!.title}`, last.success && last.result.status === "ok" && last.result.passed, last.success ? `${last.result.status} score=${last.score}` : last.error)
    }
    check("all three solved completes coding at 100", !!last?.success && last.overallPassed && last.score === 100)
    const [dv] = await db.select({ s: pathfinderVerifications.codingStatus, n: pathfinderVerifications.codingScore }).from(pathfinderVerifications).where(eq(pathfinderVerifications.id, dsa.vId))
    check("the row says COMPLETED, 100", dv?.s === "COMPLETED" && dv?.n === 100, `${dv?.s} ${dv?.n}`)

    // Last, because it ties the executor up: the unedited starter runs out of
    // time, which counts as a submit (it is the code's, not the judge's).
    const freshGoal = await mkGoal("Arrays again", "DSA")
    run("--apply")
    const fresh = await getVerificationCoding(freshGoal.goalId)
    if (fresh.success) {
        const p0 = fresh.problems[0]!
        const tle = await submitVerificationCoding({ goalId: freshGoal.goalId, problemId: p0.id, language: p0.languages[0]!, code: p0.starterCode })
        const after = await getVerificationCoding(freshGoal.goalId)
        check("starter code fails as a submit", tle.success === true && !(tle.result.status === "ok" && tle.result.passed), tle.success ? `${tle.result.status}` : tle.error)
        check("and is counted against the submits", after.success && after.submitsLeft === fresh.submitsLeft - 1, after.success ? `${fresh.submitsLeft} -> ${after.submitsLeft}` : "")
    } else check("fresh goal loads", false, fresh.error)

    // Kafka goal: quiz and mock at 100 with no coding section verifies at 100.
    await db.update(pathfinderVerifications).set({ quizStatus: "COMPLETED", quizScore: 100, mockStatus: "COMPLETED", mockScore: 100, verificationCreditsCharged: 20 }).where(eq(pathfinderVerifications.id, kafka.vId))
    const k = await submitVerificationQuiz({ goalId: kafka.goalId, answers: allRight, totalTime: 5 })
    const [kAfter] = await db.select({ passed: pathfinderVerifications.passed, score: pathfinderVerifications.overallScore }).from(pathfinderVerifications).where(eq(pathfinderVerifications.id, kafka.vId))
    check("a goal with no coding section verifies at 100", k.success === true && kAfter?.passed === true && kAfter?.score === 100, `passed=${kAfter?.passed} score=${kAfter?.score}`)

    // ── PF-19: order ─────────────────────────────────────────────────────────
    // Coding and mock done first, the quiz last: passing it must not reset
    // coding, and the verification passes.
    const [og] = await db.insert(pathfinderGoals).values({ userId, title: "Order goal", slug: `order-${userId}`, category: "DSA", level: "BEGINNER" } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
    const [ov] = await db.insert(pathfinderVerifications).values({
        goalId: og!.id, quizStatus: "PENDING", codingStatus: "COMPLETED", codingScore: 100, mockStatus: "COMPLETED", mockScore: 100,
        generatedPlan: { quizQuestions, codingProblemIds: ["x"] },
    } as typeof pathfinderVerifications.$inferInsert).returning({ id: pathfinderVerifications.id })
    await submitVerificationQuiz({ goalId: og!.id, answers: allRight, totalTime: 5 })
    const [oAfter] = await db.select().from(pathfinderVerifications).where(eq(pathfinderVerifications.id, ov!.id))
    check("quiz last keeps coding COMPLETED", oAfter?.codingStatus === "COMPLETED", oAfter?.codingStatus)
    check("and the verification passes", oAfter?.passed === true, `passed=${oAfter?.passed} score=${oAfter?.overallScore}`)

    // A LOCKED coding section still opens when the quiz passes...
    const [lg] = await db.insert(pathfinderGoals).values({ userId, title: "Locked goal", slug: `locked-${userId}`, category: "DSA", level: "BEGINNER" } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
    const [lv] = await db.insert(pathfinderVerifications).values({ goalId: lg!.id, quizStatus: "PENDING", codingStatus: "LOCKED", generatedPlan: { quizQuestions, codingProblemIds: ["x"] } } as typeof pathfinderVerifications.$inferInsert).returning({ id: pathfinderVerifications.id })
    await submitVerificationQuiz({ goalId: lg!.id, answers: allRight, totalTime: 5 })
    const [lAfter] = await db.select({ s: pathfinderVerifications.codingStatus }).from(pathfinderVerifications).where(eq(pathfinderVerifications.id, lv!.id))
    check("a LOCKED coding section opens on a quiz pass", lAfter?.s === "PENDING", lAfter?.s)

    // ...unless the goal has no coding section.
    const [ng] = await db.insert(pathfinderGoals).values({ userId, title: "No coding goal", slug: `nocode-${userId}`, category: "BACKEND", level: "BEGINNER" } as typeof pathfinderGoals.$inferInsert).returning({ id: pathfinderGoals.id })
    const [nv] = await db.insert(pathfinderVerifications).values({ goalId: ng!.id, quizStatus: "PENDING", codingStatus: "LOCKED", generatedPlan: { quizQuestions, codingProblemIds: [] } } as typeof pathfinderVerifications.$inferInsert).returning({ id: pathfinderVerifications.id })
    await submitVerificationQuiz({ goalId: ng!.id, answers: allRight, totalTime: 5 })
    const [nAfter] = await db.select({ s: pathfinderVerifications.codingStatus }).from(pathfinderVerifications).where(eq(pathfinderVerifications.id, nv!.id))
    check("no coding section stays LOCKED on a quiz pass", nAfter?.s === "LOCKED", nAfter?.s)
} finally {
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
    const left = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
    const goalsLeft = await db.select({ id: pathfinderGoals.id }).from(pathfinderGoals).where(eq(pathfinderGoals.userId, userId))
    console.log(`cleanup: test user ${left.length ? "STILL PRESENT" : "deleted"}, ${goalsLeft.length} goals left`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
