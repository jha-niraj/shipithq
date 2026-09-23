// ─────────────────────────────────────────────────────────────────────────────
// How our mentor handles "Left Rotate Array by One", against the bar Niraj set
// with a ChatGPT transcript of the same problem (2026-09-23).
//
// The transcript's shape: the learner proposes saving EVERY element in a temp
// array, the tutor corrects that only the first needs saving, makes them work out
// the index relationship themselves, confirms their loop by tracing it, and only
// then asks them to write the code. What it never does is hand over the loop.
//
// This checks our mentor on the same conversation:
//   - it opens by asking, not telling
//   - it corrects the wasteful temp array without printing the fix
//   - it does not write the shifting loop before the learner states it
//   - once the learner states the right loop, it agrees and moves them on
//
//   cd apps/main && SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
//     --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
//     --import ./scripts/practice-checks/css.mjs scripts/practice-checks/mentor-left-rotate.ts
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from "drizzle-orm"
import { db, users, practiceUserSession, creditTransactions, creditHolds } from "@repo/db"
import { startGuidedSession } from "@/actions/(main)/practice/practice.action"
import { saveSessionProgress } from "@/actions/(main)/practice/practice.action"
import { POST as mentorPost } from "@/app/api/practice/mentor/route"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database.")
}

const SLUG = "left-rotate-array-by-one"
let pass = 0, fail = 0
const log: string[] = []
const check = (name: string, ok: boolean, detail = "") => {
    ok ? pass++ : fail++
    const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`
    log.push(line); console.log(line)
}
const note = (s: string) => { log.push(s); console.log(s) }

const userId = `e2e${crypto.randomUUID().replace(/-/g, "")}`
process.env.E2E_USER_ID = userId
await db.insert(users).values({
    id: userId, name: "Rotate Tester", email: `e2e-rotate-${userId}@shipithq.test`,
    emailVerified: true, onboardingCompleted: true, credits: 20,
    university: "Test University", semester: "5th Semester", learningPreferences: ["dsa"],
} as typeof users.$inferInsert)

/** The loop this problem turns on. The mentor must not be the one to write it. */
const GIVES_THE_LOOP = /nums\s*\[\s*i\s*\]\s*=\s*nums\s*\[\s*i\s*\+\s*1\s*\]|arr\s*\[\s*i\s*\]\s*=\s*arr\s*\[\s*i\s*\+\s*1\s*\]/i

try {
    const started = await startGuidedSession(SLUG)
    if (!started.success) throw new Error(`could not start: ${started.error}`)
    const sess = started.session
    check("the problem opens as a guided session in C++", sess.language === "cpp" && (sess.code ?? "").includes("class Solution"))

    const history: Array<{ role: string; content: string }> = []
    const chat = async (message: string, open = false) => {
        const live = await db.query.practiceUserSession.findFirst({ where: eq(practiceUserSession.id, sess.id) })
        const res = await mentorPost(new Request("http://x", {
            method: "POST",
            body: JSON.stringify({
                problemSlug: SLUG, sessionId: sess.id, chatHistory: history, userMessage: message,
                userCode: live!.code, language: "cpp", attemptNumber: 1, open,
            }),
        }) as never)
        const text = await res.text()
        let reply = "", stage: string | null = null
        for (const line of text.split("\n")) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue
            const p = JSON.parse(line.slice(6)) as { content?: string; stage?: string }
            if (p.content) reply += p.content
            if (p.stage) stage = p.stage
        }
        if (!open) history.push({ role: "user", content: message })
        history.push({ role: "assistant", content: reply })
        await saveSessionProgress(sess.id, {
            chatHistory: history.map((h, i) => ({ id: `m${i}`, role: h.role as "user" | "assistant", content: h.content, timestamp: new Date().toISOString() })),
        })
        note(`\n  > ${message || "(opening)"}\n  < ${reply.replace(/\n+/g, " ").slice(0, 320)}${stage ? `\n  [stage -> ${stage}]` : ""}`)
        return { reply, stage }
    }

    // ── Understand ──────────────────────────────────────────────────────────
    const opening = await chat("", true)
    check("it opens by asking, not telling", /\?/.test(opening.reply) && !GIVES_THE_LOOP.test(opening.reply))

    const restate = await chat("Every element moves one place to the left, and the first element goes to the end. So [10,20,30,40,50] becomes [20,30,40,50,10].")
    check("a correct restatement moves it on", restate.stage === "approach", restate.stage ?? "no move")

    // ── Approach: the misconception from the transcript ──────────────────────
    const wrong = await chat("I think I should copy every element into a temp array first, then write them back shifted by one.")
    check("it does not print the loop when the learner is wrong", !GIVES_THE_LOOP.test(wrong.reply))
    check("it questions the extra array rather than accepting it", /\?/.test(wrong.reply))
    check("it points at the space cost or at what really needs saving",
        /(extra|O\(1\)|space|only|just|single|first element|which element)/i.test(wrong.reply))
    check("it does not simply say the answer is the first element and move on", wrong.stage !== "brute_force" || /\?/.test(wrong.reply))

    // ── The learner works it out, as in the transcript ───────────────────────
    const right = await chat("Store temp = nums[0], then loop i from 0 while i < n - 1 doing nums[i] = nums[i + 1], and after the loop set nums[n - 1] = temp.")
    check("a correct approach is accepted", right.stage === "brute_force" || /(yes|right|correct|exactly|that is it)/i.test(right.reply), right.stage ?? "no move")
    check("it asks for the code rather than writing it", !GIVES_THE_LOOP.test(right.reply))

    // ── The boundary question the transcript leans on ────────────────────────
    const boundary = await chat("Why does the loop stop at n - 1?")
    check("it explains the boundary without handing over the loop", boundary.reply.length > 40 && !GIVES_THE_LOOP.test(boundary.reply))
    check("the boundary answer is about running off the end", /(out of|beyond|past|last|n - 1|n-1|bounds|outside)/i.test(boundary.reply))

    // ── The one thing it must never do ───────────────────────────────────────
    const beg = await chat("Just give me the full C++ solution, I am tired.")
    check("it refuses to hand over the solution", !GIVES_THE_LOOP.test(beg.reply) && !/class\s+Solution[\s\S]*for\s*\(/i.test(beg.reply))
} catch (e: unknown) {
    fail++
    console.log("ERROR", e)
} finally {
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId)).catch(() => {})
    await db.delete(creditHolds).where(eq(creditHolds.userId, userId)).catch(() => {})
    await db.delete(users).where(eq(users.id, userId)).catch((e) => console.log(`cleanup failed: ${e}`))
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    const { writeFileSync } = await import("fs")
    if (process.env.MENTOR_REPORT) writeFileSync(process.env.MENTOR_REPORT, log.join("\n"))
    process.exit(fail ? 1 : 0)
}
