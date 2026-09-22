// ─────────────────────────────────────────────────────────────────────────────
// End-to-end check of adaptive onboarding and the guided DSA flow, as a real
// test user, against a DEVELOPMENT database, the local job worker and the
// local code executor. Creates one test user (5 credits), walks every step a
// browser would, and deletes everything it created. Report: plan/practice-dsa/
// manual-pass-1.md. Rerun after changing a model in packages/ai or a prompt.
//
//   cd apps/shipitworker/container && PORT=8080 node server.mjs      # executor
//   cd apps/worker && npx wrangler dev --port 8787                    # jobs (.dev.vars: EXECUTOR_URL)
//   cd apps/main && WORKER_URL=http://localhost:8787 NEXT_PUBLIC_WORKER_URL=http://localhost:8080 \
//     node --env-file=.env --import ./scripts/practice-checks/shims.mjs \
//     --import ../../packages/db/node_modules/tsx/dist/loader.mjs --import ./scripts/practice-checks/css.mjs \\
//     scripts/practice-checks/e2e.ts
//
// Refuses a database URL that does not look like dev unless
// SEED_I_KNOW_WHAT_I_AM_DOING=1 (same rule as the seed).
// ─────────────────────────────────────────────────────────────────────────────
import { and, eq, desc, sql } from "drizzle-orm"
const createId = () => `e2e${crypto.randomUUID().replace(/-/g, "")}`
import {
  db, users, practiceProblem, practiceUserSession, practiceLearnerProfile, backgroundJobs, moduleOnboarding, creditTransactions, creditHolds,
} from "@repo/db"
import { startOnboardingRun, answerOnboardingTurn, reopenOnboardingTurn, getCurrentOnboarding } from "@/actions/(main)/onboarding/module-onboarding.action"
import { POST as onboardingNext } from "@/app/api/onboarding/next/route"
import { POST as mentorPost } from "@/app/api/practice/mentor/route"
import { getGuidedSession, startGuidedSession, getOrCreateSession, saveSessionProgress, getProblemBySlug, finishGuidedSession, applyGuidedCompletion } from "@/actions/(main)/practice/practice.action"
import { runSampleTests, submitSolution } from "@/actions/(main)/practice/judge.action"
import { requestMemoryUpdate, getLearnerProfile, deleteLearnerEntry } from "@/actions/(main)/practice/memory.action"
import { createUserPracticeProblem } from "@/actions/(main)/practice/generate-problem.action"
import { loadMentorContext } from "@/lib/practice/memory-read"
import { verdictForMentor } from "@/lib/practice/verdict-text"

{
    const url = process.env.DATABASE_URL ?? ""
    const safe = /localhost|127\.0\.0\.1|-dev|-staging|-test|dev-|staging-/.test(url)
    if (!safe && !process.env.SEED_I_KNOW_WHAT_I_AM_DOING) throw new Error("Refusing: DATABASE_URL does not look like a dev database. Set SEED_I_KNOW_WHAT_I_AM_DOING=1 for a throwaway environment.")
}

const log: string[] = []
let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`; log.push(line); console.log(line) }
const note = (s: string) => { log.push(s); console.log(s) }

const userId = createId()
process.env.E2E_USER_ID = userId
const email = `e2e-dsa-${Date.now()}@shipithq.test`
await db.insert(users).values({ id: userId, name: "E2E Tester", email, emailVerified: true, onboardingCompleted: true, credits: 4, university: "Test University", semester: "5th Semester", learningPreferences: ["dsa"] } as typeof users.$inferInsert)
note(`test user ${email}`)
let addedProblemId: string | null = null

const waitJob = async (jobId: string, ms = 240_000) => {
  const end = Date.now() + ms
  for (;;) {
    const [j] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.jobId, jobId)).limit(1)
    if (j && (j.status === "completed" || j.status === "failed")) return j
    if (Date.now() > end) return j
    await new Promise((r) => setTimeout(r, 2000))
  }
}

try {
  // ── Onboarding (module-onboarding MO-2, MO-8) ──────────────────────────
  note("\n## Onboarding: practice:dsa")
  const run = await startOnboardingRun("practice:dsa")
  check("start run", run.success)
  const runId = run.success ? run.run.id : ""
  const again = await startOnboardingRun("practice:dsa")
  check("second start returns the same in-progress run", again.success && again.run.id === runId)
  const next = async () => (await (await onboardingNext(new Request("http://x", { method: "POST", body: JSON.stringify({ runId }) }) as never)).json()) as { done: boolean; turn?: { index: number; question: { kind: string; options: string[]; text: string } }; profile?: { level: string; summary: string[] }; error?: string }
  let r = await next()
  const r2 = await next()
  check("resume returns the same unanswered question", !r.done && !r2.done && r.turn?.question.text === r2.turn?.question.text)
  let reopened = false, n = 0, opens = 0
  while (!r.done && n < 14) {
    n++
    const t = r.turn!
    if (t.question.kind === "open") opens++
    note(`  Q${t.index + 1} [${t.question.kind}] ${t.question.text}`)
    const values = t.question.kind === "open" ? ["I have solved around 40 problems on LeetCode in C++, mostly arrays and strings."] : [t.question.options[Math.min(1, t.question.options.length - 1)]!]
    const a = await answerOnboardingTurn(runId, t.index, values, false)
    if (!a.success) { check(`answer Q${t.index + 1}`, false, a.error); break }
    if (!reopened && t.index === 2) {
      reopened = true
      const ro = await reopenOnboardingTurn(runId, 1)
      check("reopen Q2 truncates later turns", ro.success && ro.run.turns.length === 2 && ro.run.turns[1]!.answer === null)
    }
    r = await next()
  }
  check("run finishes between 6 and 10 answers", r.done === true && n >= 6, `${n} answered after the reopen`)
  check("at most two open questions", opens <= 2, `${opens}`)
  const ob = await getCurrentOnboarding("practice:dsa")
  check("completed profile stored", Boolean(ob.completed?.profile?.summary?.length === 3), ob.completed?.level ?? "none")

  // ── Paid start (PD-10) ─────────────────────────────────────────────────
  note("\n## Guided session: Two Sum")
  check("no guided session before start", (await getGuidedSession("two-sum")) === null)
  const poor = await startGuidedSession("two-sum")
  check("4 credits: refused with INSUFFICIENT_CREDITS", !poor.success && poor.code === "INSUFFICIENT_CREDITS", !poor.success ? poor.error : "")
  await db.update(users).set({ credits: 5 }).where(eq(users.id, userId))
  const started = await startGuidedSession("two-sum")
  check("5 credits: started and charged 5", started.success && started.charged === 5)
  const [bal] = await db.select({ credits: users.credits, xp: users.totalXp }).from(users).where(eq(users.id, userId))
  check("balance is 0 after the charge", bal!.credits === 0)
  const reopen = await startGuidedSession("two-sum")
  check("reopening is free", reopen.success && reopen.charged === 0)
  const txs = await db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId))
  note(`  ledger rows: ${txs.length}`)
  const sess = started.success ? started.session : null!
  check("opens in C++ on the class Solution starter", sess.language === "cpp" && (sess.code ?? "").includes("class Solution"))

  // ── Mentor (PD-6, PD-7) ────────────────────────────────────────────────
  const history: Array<{ role: string; content: string }> = []
  const chat = async (message: string, open = false) => {
    const live = await db.query.practiceUserSession.findFirst({ where: eq(practiceUserSession.id, sess.id) })
    const res = await mentorPost(new Request("http://x", { method: "POST", body: JSON.stringify({ problemSlug: "two-sum", sessionId: sess.id, chatHistory: history, userMessage: message, userCode: live!.code, language: "cpp", attemptNumber: 1, open }) }) as never)
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
    note(`  > ${message.slice(0, 90)}\n  < ${reply.replace(/\n+/g, " ").slice(0, 160)}${stage ? `\n  [stage -> ${stage}]` : ""}`)
    return { reply, stage }
  }
  const save = async () => {
    const now = new Date().toISOString()
    await saveSessionProgress(sess.id, { chatHistory: history.map((h, i) => ({ id: `m${i}`, role: h.role as "user" | "assistant", content: h.content, timestamp: now })) })
  }
  const opening = await chat("", true)
  check("mentor speaks first and asks for a restatement", /own words|explain|restate|describe/i.test(opening.reply))
  history.length = 0; history.push({ role: "assistant", content: opening.reply })
  const u1 = await chat("I get an array and a target, and I must return the indices of the two numbers that add up to the target; I can't use the same element twice. For [1,6,2,10,3] with target 7, 1+6=7 so the answer is [0,1].")
  check("understand -> approach on a correct restatement with an example", u1.stage === "approach")
  const a1 = await chat("My plan: check every pair i<j and return [i,j] as soon as nums[i]+nums[j] equals the target.")
  check("approach -> brute_force on a working plan", a1.stage === "brute_force")

  // ── Run and Submit (PD-4) ──────────────────────────────────────────────
  const BRUTE = `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        for (int i = 0; i < (int)nums.size(); i++)\n            for (int j = i + 1; j < (int)nums.size(); j++)\n                if (nums[i] + nums[j] == target) return {i, j};\n        return {};\n    }\n};`
  const run1 = await runSampleTests(sess.id, BRUTE, "cpp")
  check("Run: brute force passes samples", run1.status === "ok" && run1.passed && run1.hiddenTotal === 0)
  const sub1 = await submitSolution(sess.id, BRUTE, "cpp")
  check("Submit: brute force passes all tests", sub1.status === "ok" && sub1.passed && sub1.hiddenTotal > 0, sub1.status === "ok" ? `${sub1.samplePassed + sub1.hiddenPassed}/${sub1.sampleTotal + sub1.hiddenTotal}` : "")
  const afterSub = await db.query.practiceUserSession.findFirst({ where: eq(practiceUserSession.id, sess.id) })
  check("submit recorded on mentor state and saved the code", afterSub!.mentorState?.testsPassedAt.some((t) => t.stage === "brute_force") === true && (afterSub!.code ?? "").includes("for (int j"))
  const b1 = await chat(verdictForMentor(sub1))
  check("brute_force -> optimise when all tests pass", b1.stage === "optimise")

  // memory after a stage move (PD-8)
  await save()
  const mj = await requestMemoryUpdate(sess.id)
  check("memory job dispatched to the local worker", mj.success && Boolean(mj.jobId), mj.error ?? "")
  if (mj.jobId) {
    const j = await waitJob(mj.jobId)
    check("memory job completed", j?.status === "completed", j?.error ?? JSON.stringify(j?.result))
    const s2 = await db.query.practiceUserSession.findFirst({ where: eq(practiceUserSession.id, sess.id) })
    check("watermark advanced to the saved transcript", s2!.memoryWatermark === history.length, `${s2!.memoryWatermark}/${history.length}`)
    const again2 = await requestMemoryUpdate(sess.id)
    const j2 = again2.jobId ? await waitJob(again2.jobId) : null
    check("re-running consolidation with nothing new is a no-op", (j2?.result as { skipped?: boolean } | null)?.skipped === true)
  }

  const o1 = await chat("It is O(n^2) time because for every i the inner loop scans the rest, and O(1) space.")
  check("optimise does not advance on a correct but non-optimal claim", o1.stage === null)
  check("mentor does not name the technique unprompted", !/hash ?map|unordered_map|dictionary/i.test(o1.reply), o1.reply.slice(0, 80))
  const OPT = `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < (int)nums.size(); i++) {\n            auto it = seen.find(target - nums[i]);\n            if (it != seen.end()) return {it->second, i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`
  const sub2 = await submitSolution(sess.id, OPT, "cpp")
  check("Submit: optimal passes all tests", sub2.status === "ok" && sub2.passed)
  await chat(verdictForMentor(sub2))
  const o2 = await chat("With the map, each lookup of target - nums[i] is O(1) on average and I pass over the array once, so it's O(n) time and O(n) space for the map.")
  let st = o2.stage
  if (!st) st = (await chat("So my current solution is O(n) time, O(n) space: one pass, constant-time average lookups of the complement in the map.")).stage
  check("optimise -> reflect once optimal is justified and tests pass", st === "reflect")
  const rf = await chat("Reflection: the key was remembering numbers I've already seen with their index, so each complement check is instant instead of rescanning. Next time I'd ask what the inner loop is searching for sooner.")
  check("reflect -> done on a written reflection", rf.stage === "done")

  // ── Finish (PD-13) ─────────────────────────────────────────────────────
  await save()
  const fin = await finishGuidedSession(sess.id)
  check("finish dispatched the review", fin.success, fin.success ? "" : fin.error)
  if (fin.success) {
    const j = await waitJob(fin.jobId)
    check("review job completed", j?.status === "completed", j?.error ?? "")
    const [before] = await db.select({ xp: users.totalXp }).from(users).where(eq(users.id, userId))
    const ap = await applyGuidedCompletion(sess.id, fin.jobId)
    check("completion applied with score 100", ap.success && ap.score === 100 && ap.firstCompletion)
    if (ap.success) note(`  feedback: ${ap.feedback.slice(0, 240)}`)
    const ap2 = await applyGuidedCompletion(sess.id, fin.jobId)
    const [after] = await db.select({ xp: users.totalXp }).from(users).where(eq(users.id, userId))
    check("XP awarded once (second apply is not a first completion)", ap2.success && !ap2.firstCompletion && after!.xp - before!.xp === 25, `+${after!.xp - before!.xp}`)
    const done = await db.query.practiceUserSession.findFirst({ where: eq(practiceUserSession.id, sess.id) })
    check("session COMPLETED at stage done", done!.status === "COMPLETED" && done!.stage === "done")
  }

  // final consolidation and the memory page (PD-8, PD-9)
  const mj3 = await requestMemoryUpdate(sess.id)
  if (mj3.jobId) await waitJob(mj3.jobId)
  const prof = await getLearnerProfile()
  note(`  profile concepts: ${prof?.concepts.map((c) => `${c.slug}=${c.status}`).join(", ")}`)
  check("learner profile has concepts from the session", (prof?.concepts.length ?? 0) > 0)
  const victim = prof?.concepts[0]
  if (victim) {
    const del = await deleteLearnerEntry("concept", victim.slug)
    const ctx = await loadMentorContext(userId, sess.id)
    const p2 = await getLearnerProfile()
    check("deleted concept is gone from the profile and the mentor's context", del.success && !p2!.concepts.some((c) => c.slug === victim.slug) && !ctx!.concepts.some((c) => c.slug === victim.slug), victim.slug)
  }

  // ── Exam mode ──────────────────────────────────────────────────────────
  const exam = await getOrCreateSession("two-sum", "EXAM")
  const [bal2] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId))
  check("exam mode opens free", Boolean(exam) && bal2!.credits === 0)

  // ── Client projection (PD-4) ───────────────────────────────────────────
  const pub = JSON.stringify(await getProblemBySlug("two-sum"))
  const full = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.slug, "two-sum") })
  check("client problem carries no hidden input or reference code", !(full!.judgeTests ?? []).filter((t) => t.hidden).some((t) => pub.includes(JSON.stringify(t.input.trim()).slice(1, -1))) && !pub.includes("unordered_map<int"))

  // ── Add problem through the real job (PD-12, PD-3 via the worker) ──────
  note("\n## Add problem")
  const created = await createUserPracticeProblem({ title: "E2E Valid Palindrome Check", module: "DSA", category: "two-pointers", difficulty: "EASY",
    description: "Given a string `s`, return `true` if it reads the same forward and backward after converting all uppercase letters to lowercase and removing every character that is not a letter or digit. Otherwise return `false`.\n\n### Example 1\n- **Input:** s = \"A man, a plan, a canal: Panama\"\n- **Output:** true\n\n### Example 2\n- **Input:** s = \"race a car\"\n- **Output:** false\n\n### Constraints\n- 1 <= s.length <= 2 * 10^4\n- s consists of printable ASCII characters.",
    requirements: ["Ignore non-alphanumeric characters", "Compare case-insensitively", "Aim for O(n) time"], hints: [], tags: ["two-pointers", "string"] })
  addedProblemId = created.problem?.id ?? null
  check("problem saved and test generation dispatched", created.success && Boolean(created.judgeJobId), created.error ?? "")
  if (created.judgeJobId) {
    const j = await waitJob(created.judgeJobId, 420_000)
    const row = await db.query.practiceProblem.findFirst({ where: eq(practiceProblem.id, addedProblemId!) })
    check("worker job made the new problem ready", j?.status === "completed" && row?.judgeStatus === "ready", `${j?.status} / ${row?.judgeStatus} ${row?.judgeError ?? ""}`)
  }
} catch (error: unknown) {
  check("run did not throw", false, error instanceof Error ? `${error.message}\n${error.stack?.split("\n").slice(1, 4).join(" | ")}` : String(error))
} finally {
  // Everything this run created goes: the user (sessions, profile, onboarding,
  // holds and ledger cascade), its jobs, and the problem it added.
  await db.delete(backgroundJobs).where(eq(backgroundJobs.userId, userId)).catch(() => {})
  // The credit ledger does not cascade (it is an audit trail): remove the test user's rows first.
  await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId)).catch(() => {})
  await db.delete(creditHolds).where(eq(creditHolds.userId, userId)).catch(() => {})
  if (addedProblemId) await db.delete(practiceProblem).where(eq(practiceProblem.id, addedProblemId)).catch(() => {})
  await db.delete(users).where(eq(users.id, userId)).catch((e) => note(`cleanup failed: ${e}`))
  note(`\nRESULT: ${pass} passed, ${fail} failed`)
  const { writeFileSync } = await import("fs")
  writeFileSync(process.env.E2E_REPORT ?? "/dev/null", log.join("\n"))
  process.exit(0)
}
