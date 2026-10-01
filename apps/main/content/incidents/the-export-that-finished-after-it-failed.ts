import type { IncidentCase, SimLane, SimRun, SimValues, SourceRef } from "./types"
import { getIncidentMeta } from "./index"
import { EXPORT_CHAPTERS, EXPORT_GLOSSARY, EXPORT_LEARN } from "./the-export-chapters"

/**
 * Case three (plan/long-jobs-vercel, outline approved 2026-10-01): the Vercel twin of case
 * one. A composite, not one company's incident: Tallyroom, its people and its times are
 * the story's own. Every platform behaviour is cited to Vercel's or Next.js's documentation,
 * checked 2026-10-01, and the Workflow code is checked against workflow@4.8.10.
 *
 * Three wrong fixes and one right one: await it inline (504 at the limit), raise
 * maxDuration (works until the biggest customer), move it into after() (instant reply,
 * same clock, now silent), then Vercel Workflow.
 */

const DUR = (section: string): SourceRef => ({ source: "DUR", section })
const LIM = (section: string): SourceRef => ({ source: "LIM", section })
const AFTER = (section: string): SourceRef => ({ source: "AFTER", section })
const WF = (section: string): SourceRef => ({ source: "WF", section })
const WFC = (section: string): SourceRef => ({ source: "WFC", section })
const WFL = (section: string): SourceRef => ({ source: "WFL", section })
const ERR = (section: string): SourceRef => ({ source: "ERR", section })
const BG = (section: string): SourceRef => ({ source: "BG", section })
const NXT = (section: string): SourceRef => ({ source: "NXT", section })

// ── The simulator ──────────────────────────────────────────────────────────
//
// A script of the documented behaviour, not a live deployment. An export is ten equal
// steps; its length is the story's (example) numbers. The limits are the documented
// ones: 300 s by default, 800 s once raised on Pro. `after()` runs within the route's
// maximum duration (Next.js docs). A Workflow step is its own function, retried from its
// first line after a failure (Workflow SDK docs).

const SPAN = 900
const CRASH_AT = 120

function simulate(v: SimValues): SimRun {
    const len = Number(v.length) * 60
    const approach = v.approach
    const crash = v.event === "crash"
    const limit = approach === "inline" ? 300 : 800
    const step = len / 10

    const marks = (extra: SimRun["marks"] = []): SimRun["marks"] =>
        [...(crash ? [{ at: CRASH_AT, label: "The instance crashes", tone: "bad" as const }] : []), ...extra]

    // Inline, or inline with the dial turned up: the tab is the job.
    if (approach === "inline" || approach === "dial") {
        const end = crash && CRASH_AT < len ? CRASH_AT : Math.min(len, limit)
        const done = !(crash && CRASH_AT < len) && len <= limit
        const lanes: SimLane[] = [
            { id: "browser", label: "Browser", segments: [{ from: 0, to: end, state: "wait", label: "Holding the tab open" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: done ? ("done" as const) : ("dead" as const), label: done ? "Got the file" : crash && CRASH_AT < len ? "An error page" : "504 page" }] : [])] },
            { id: "work", label: "The export", segments: [{ from: 0, to: end, state: "run", label: "Running" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: done ? ("done" as const) : ("dead" as const), label: done ? "Done" : "Stopped" }] : [])] },
            { id: "row", label: "The exports row", segments: [{ from: 0, to: SPAN, state: "idle", label: "No row: the response is the file" }] },
            { id: "email", label: "Email", segments: [{ from: 0, to: SPAN, state: "idle", label: "Not used: the file comes back in the response" }] },
        ]
        if (crash && CRASH_AT < len) {
            return {
                verdict: "killed", end, headline: `Crashed at ${CRASH_AT} s`,
                reason: "The work lived in one invocation. When it went, so did the export, and nothing had written down that it started, so nothing knows to try again. The user waited two minutes for an error.",
                sources: [BG("Why inline execution fails")], lanes, marks: marks(),
                meter: { label: "Duration used", budget: limit, rate: 1 },
            }
        }
        if (!done) {
            return {
                verdict: "killed", end, headline: `504 at ${limit} s`,
                reason: approach === "inline"
                    ? "The function reached its maximum duration, 300 s by default, and the platform ended it with 504 FUNCTION_INVOCATION_TIMEOUT. The credit was already charged."
                    : "Raising maxDuration to 800 moved the cliff. A 14-minute export still reaches it, and fails the same way, after 13 minutes of a held tab.",
                sources: [DUR("Duration limits"), LIM("Max duration")], lanes, marks: marks([{ at: limit, label: `${limit} s: maxDuration`, tone: "bad" }]),
                meter: { label: "Duration used", budget: limit, rate: 1 },
            }
        }
        return {
            verdict: "completes", end: len, headline: "Finished, with the tab held open",
            reason: approach === "dial"
                ? "It fits under 800 s, so it finishes. The user sat on a spinner the whole time, and as data grows, the next one will not fit."
                : "It fits under 300 s. Nothing went wrong this time; the user waited the whole way.",
            sources: [DUR("Duration limits")], lanes, marks: marks(),
            meter: { label: "Duration used", budget: limit, rate: 1 },
        }
    }

    // after(): the reply goes at once, the work runs on the route's own clock.
    if (approach === "after") {
        const stop = crash && CRASH_AT < len ? CRASH_AT : len > limit ? limit : null
        const end = stop ?? len
        return {
            verdict: stop === null ? "completes" : "killed",
            end,
            headline: stop === null ? "Finished, and the user was free to leave" : stop === CRASH_AT ? `Crashed at ${CRASH_AT} s, and nobody knows` : `Stopped at ${limit} s, and nobody knows`,
            reason: stop === null
                ? "The reply went out at once and the work fit inside the route's 800 s. This is the run that made after() look like the fix."
                : stop === CRASH_AT
                    ? "after() keeps no record and has no retry. The work is gone, the row still says processing, and no email will ever come."
                    : "after() runs for the route's default or configured maximum duration. The user got their 202 long ago; the work met the same 800 s cliff, and this time no 504 reached anyone.",
            sources: stop === null ? [AFTER("after(callback)")] : [AFTER("Duration"), DUR("Duration limits")],
            lanes: [
                { id: "browser", label: "Browser", segments: [{ from: 0, to: 1, state: "done", label: "202: we'll email it" }, { from: 1, to: SPAN, state: "idle", label: "Free to leave" }] },
                { id: "work", label: "The export", segments: [{ from: 0, to: end, state: "run", label: "Running in after()" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: stop === null ? ("done" as const) : ("dead" as const), label: stop === null ? "Done" : "Stopped, nothing written" }] : [])] },
                { id: "row", label: "The exports row", segments: [{ from: 0, to: end, state: "run", label: "processing" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: stop === null ? ("done" as const) : ("dead" as const), label: stop === null ? "done" : "processing, forever" }] : [])] },
                { id: "email", label: "Email", segments: stop === null ? [{ from: 0, to: end, state: "idle", label: "Waiting" }, { from: end, to: SPAN, state: "done", label: "Sent" }] : [{ from: 0, to: SPAN, state: "never", label: "Never sent" }] },
            ],
            marks: marks([{ at: 0.5, label: "Reply sent", tone: "muted" }, ...(len > limit && !(crash && CRASH_AT < len) ? [{ at: limit, label: `${limit} s: maxDuration`, tone: "bad" as const }] : [])]),
            meter: { label: "Duration used", budget: limit, rate: 1 },
        }
    }

    // A workflow: one step at a time, each its own function; a crashed step is retried.
    const lost = crash && CRASH_AT < len ? CRASH_AT % step : 0
    const end = len + lost
    const failed = Math.floor(CRASH_AT / step) + 1
    return {
        verdict: "completes", end,
        headline: crash && CRASH_AT < len ? `Finished: step ${failed} ran again` : "Finished, one step at a time",
        reason: crash && CRASH_AT < len
            ? `The crash took step ${failed} with it. A failed step is retried from its first line, and the steps already done are not run again: their results are in the run's event log. The run lost ${Math.round(lost)} s, not the export.`
            : `Each step is its own function of about ${Math.round(step)} s, far under any limit. Between steps the run is suspended and uses nothing. A run has no maximum duration.`,
        sources: crash ? [ERR("Default retry behavior"), ERR("Step re-execution"), WFC("Workflow")] : [WFC("Step"), WFL("Workflow run limits")],
        lanes: [
            { id: "browser", label: "Browser", segments: [{ from: 0, to: 1, state: "done", label: "Run id" }, { from: 1, to: SPAN, state: "idle", label: "Free to leave; status by run id" }] },
            {
                id: "work", label: "The export", segments: crash && CRASH_AT < len
                    ? [{ from: 0, to: CRASH_AT, state: "run", label: `Steps 1 to ${failed - 1}, then step ${failed}` }, { from: CRASH_AT, to: CRASH_AT + 2, state: "dead", label: "Crash" }, { from: CRASH_AT + 2, to: end, state: "run", label: `Step ${failed} again, then the rest` }, ...(end < SPAN ? [{ from: end, to: SPAN, state: "done" as const, label: "Done" }] : [])]
                    : [{ from: 0, to: end, state: "run", label: "Ten steps, one at a time" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: "done" as const, label: "Done" }] : [])],
            },
            { id: "row", label: "The exports row", segments: [{ from: 0, to: end, state: "run", label: "processing, with the run id" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: "done" as const, label: "done" }] : [])] },
            { id: "email", label: "Email", segments: [{ from: 0, to: end, state: "idle", label: "Waiting" }, ...(end < SPAN ? [{ from: end, to: SPAN, state: "done" as const, label: "Sent once" }] : [])] },
        ],
        marks: marks([{ at: 0.5, label: "start(): run id", tone: "muted" }]),
    }
}

// ── Code shown in the fix ──────────────────────────────────────────────────

const INLINE_CODE = `// app/api/export/route.ts: the whole export inside one request.
export const maxDuration = 800   // fix one: up from the default 300

export async function POST(req: Request) {
  const { accountId } = await req.json()
  await chargeCredit(accountId)               // charged before the work
  const file = await buildYearExport(accountId) // 12 queries, a CSV, a PDF
  return new Response(file)                  // the tab is the job
}`

const AFTER_CODE = `import { after } from "next/server"

export const maxDuration = 800

export async function POST(req: Request) {
  const { accountId } = await req.json()
  await chargeCredit(accountId)
  const exportId = await markProcessing(accountId)
  // Runs once the response is sent, for the route's maximum duration: the same 800 s.
  after(() => buildAndEmail(exportId))
  return Response.json({ exportId }, { status: 202 })
}`

const WORKFLOW_CODE = `import { start } from "workflow/api"
import { exportWorkflow } from "@/workflows/export"

export async function POST(req: Request) {
  const { accountId } = await req.json()
  const exportId = await markProcessing(accountId)
  const run = await start(exportWorkflow, [exportId])
  await saveRunId(exportId, run.runId)        // the page reads status by this id
  return Response.json({ exportId }, { status: 202 })
}

// workflows/export.ts
export async function exportWorkflow(exportId: string) {
  "use workflow"
  for (const part of EXPORT_PARTS) await buildPart(exportId, part)  // one step each
  await sendLink(exportId)
  await settleCredit(exportId)                 // charge on the result, not the press
}`

const STATUS_CODE = `import { getRun } from "workflow/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const runId = await runIdFor(id)
  const status = await getRun(runId).status   // pending, running, completed, failed, cancelled
  return Response.json({ status })
}`

const IDEMPOTENT_CODE = `import { FatalError } from "workflow"

async function sendLink(exportId: string) {
  "use step"
  // A retried step starts again from this line. Check before acting.
  if (await alreadySent(exportId)) return
  const res = await email.send({ to: ownerOf(exportId), idempotencyKey: \`export-\${exportId}\` })
  if (res.status === 400) throw new FatalError("Bad address: retrying will not help")
  await markSent(exportId)
}`

// ── The case ───────────────────────────────────────────────────────────────

const meta = getIncidentMeta("the-export-that-finished-after-it-failed")!

export const exportThatFinishedAfterItFailed: IncidentCase = {
    ...meta,
    sources: {
        DUR: { title: "Vercel: Configuring Maximum Duration for Vercel Functions", author: "Vercel", date: "2026-08-24" },
        LIM: { title: "Vercel: Functions Limitations", author: "Vercel", date: "2026-10-01" },
        AFTER: { title: "Next.js: after", author: "Vercel (Next.js)", date: "2026-10-01" },
        WF: { title: "Vercel Workflows", author: "Vercel", date: "2026-09-04" },
        WFC: { title: "Vercel: Workflow Concepts", author: "Vercel", date: "2026-09-10" },
        WFL: { title: "Vercel: Workflow Pricing and Limits", author: "Vercel", date: "2026-09-16" },
        ERR: { title: "Workflow SDK: Errors and Retrying", author: "Vercel (Workflow SDK)", date: "2026-10-01" },
        BG: { title: "Vercel KB: How to run background jobs in Next.js", author: "Vercel", date: "2026-08-25" },
        NXT: { title: "Next.js source: build/index.ts, maxDuration into the functions manifest", author: "Vercel (Next.js)", date: "2026-10-01" },
        SRE: { title: "Site Reliability Engineering, chapter 14: Managing Incidents", author: "Google", date: "2016" },
    },

    story: [
        { kind: "scene", id: "feature", at: "January", text: "Tallyroom sells analytics to small businesses. One button matters more than it looks: Export the year. It builds a CSV and a PDF of everything a customer did in twelve months, and it costs one export credit. In January, every accountant presses it. (A composite: the company and its numbers are the story's own.)" },
        { kind: "scene", id: "ship", at: "Last spring", text: "It shipped as a single route on Vercel. The button posts, the function runs twelve queries, builds both files and returns them. On the developer's laptop it took forty seconds. Nobody asked how long it would take for a customer with five years of data." },
        {
            kind: "log", id: "monday", at: "Monday 9:02 am, the first 504",
            lines: [
                { t: "9:02:00", text: "POST /api/export  (accounting firm, 4,100 clients)" },
                { t: "9:02:00", text: "credit charged: 1", tone: "muted" },
                { t: "9:07:00", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
                { t: "9:07:30", text: "POST /api/export  (the same firm, again)" },
                { t: "9:12:30", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
                { t: "9:13:00", text: "POST /api/export  (and again)" },
                { t: "9:18:00", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
            ],
        },
        {
            kind: "thread", id: "ticket", at: "Monday 9:22 am", channel: "#support",
            messages: [
                { from: "Support", t: "9:22", text: "Accounting firm says Export the year spins for five minutes then shows an error page. Three tries, three credits gone." },
                { from: "The developer", t: "9:40", text: "300 seconds exactly, every time. That's the function's max duration. We're on Pro, I can raise it to 800." },
                { from: "A teammate", t: "9:41", text: "And when someone needs 801?" },
                { from: "The developer", t: "9:41", text: "Nobody needs 13 minutes for a CSV." },
            ],
        },
        {
            kind: "fork", id: "fork", at: "Monday 9:45 am",
            prompt: "You own the export. Customers are waiting. What do you ship today?",
            options: [
                { id: "dial", label: "Raise maxDuration to 800", consequence: "That's what they shipped. It worked for three weeks. Keep reading." },
                { id: "after", label: "Reply 202 and do the work in after()", consequence: "That's their second fix. The page is instant, and the work still runs on the route's clock. Chapter 4." },
                { id: "workflow", label: "Move the export into a Vercel Workflow", consequence: "The real fix, and a day's work, not a config line. Refund the three credits while you build it." },
                { id: "refund", label: "Refund the credits and tell the firm to export by quarter", consequence: "Honest, and a good holding move. It doesn't fix anything for the next big customer." },
            ],
            after: "They raised the dial.",
        },
        {
            kind: "evidence", id: "row", at: "Week 5, the database",
            title: "One export, two weeks after fix two",
            rows: [
                { label: "status", value: "processing" },
                { label: "started", value: "Feb 3, 10:14:07" },
                { label: "finished", value: "(empty)" },
                { label: "error", value: "(empty)" },
                { label: "email sent", value: "no" },
            ],
            note: "No 504 this time, because the user got a 202 at once. The work ran inside after(), on the same 800-second clock, and stopped there. Nothing was written, because nothing was left to write it.",
            sources: [AFTER("Duration"), DUR("Duration limits")],
        },
        { kind: "scene", id: "diagnosis", at: "What actually happened", text: "Three fixes, one problem. The export lived inside a request, so it had a request's lifetime. Raising the limit moved the cliff. after() moved the person watching the cliff. Only taking the work out of the request, into steps that something remembers, removed it." },
    ],

    model: {
        diagram: "vercel-long-work",
        intro: "A Vercel Function is built to answer a request. Everything it does, including work after the reply, lives on one clock: the function's maximum duration. Long work needs to live somewhere else.",
        steps: [
            { id: "limit", title: "One clock per invocation", focus: "limit", body: "Every function invocation has a maximum duration. With Fluid compute it is 300 s by default on every plan; Pro and Enterprise can raise it to 800 s, and to 1,800 s in beta. Past it, the platform ends the invocation with 504 FUNCTION_INVOCATION_TIMEOUT.", sources: [DUR("Duration limits"), LIM("Max duration")] },
            { id: "lifecycle", title: "The clock covers everything", focus: "lifecycle", body: "The maximum duration covers the whole request lifecycle, streaming the response included. A streamed reply does not buy more time.", sources: [LIM("Max duration")] },
            { id: "dial", title: "Raising it moves the cliff", focus: "dial", body: "maxDuration is a per-route setting. Raising it gives one route more time. Data grows; the next customer's export is longer; the cliff is still there.", sources: [DUR("Maximum duration for different runtimes")] },
            { id: "after", title: "after() shares the clock", focus: "after", body: "after() runs a callback once the response is finished, and it runs for the route's default or configured maximum duration. It changes when the user gets a reply. It does not change how long the work may run, and it keeps no record that the work started.", sources: [AFTER("after(callback)"), AFTER("Duration")] },
            { id: "workflow", title: "A workflow is steps something remembers", focus: "workflow", body: "With \"use workflow\" and \"use step\", each step compiles into its own route and runs as its own invocation. Inputs and outputs go into an event log, so after a crash or a deploy the run replays and carries on. A run has no maximum duration; each step is bounded by the function limit.", sources: [WFC("Workflow"), WFC("Step"), WFL("Workflow run limits")] },
            { id: "retry", title: "A retried step starts from the top", focus: "retry", body: "A step that throws is retried, three times by default. It starts again from its first line, so anything it does to the outside world must be safe to do twice.", sources: [ERR("Default retry behavior"), ERR("Step re-execution"), ERR("Idempotency for side effects")] },
        ],
    },

    simulator: {
        duration: SPAN,
        job: "Export the year: ten equal parts, as long as the customer's data makes it.",
        controls: [
            { id: "approach", label: "Where the export runs", options: [
                { value: "inline", label: "Inline, 300 s", hint: "awaited in the route, the default limit" },
                { value: "dial", label: "Inline, 800 s", hint: "fix one: maxDuration raised on Pro" },
                { value: "after", label: "after(), 800 s", hint: "fix two: reply first, work after" },
                { value: "workflow", label: "Workflow", hint: "the fix: one step per part" },
            ] },
            { id: "length", label: "Export length", options: [
                { value: "4", label: "4 minutes", hint: "a small customer" },
                { value: "6", label: "6 minutes", hint: "the accounting firm" },
                { value: "14", label: "14 minutes", hint: "the largest customer" },
            ] },
            { id: "event", label: "What happens", options: [
                { value: "none", label: "Nothing" },
                { value: "crash", label: "A crash at 2 minutes", hint: "the instance goes away mid-run" },
            ] },
        ],
        defaults: { approach: "inline", length: "6", event: "none" },
        simulate,
        ticks: [0, 300, 800, 900],
        line: null,
        fidelity: "Scripted from Vercel's and Next.js's documented behaviour, not a live deployment. The limits are the documented ones; the export lengths are the story's own. A crash stands for anything that ends an invocation early.",
    },

    predict: [
        {
            id: "inline-6", setup: "The export runs inline with the default limit. The accounting firm's export needs 6 minutes.",
            prompt: "What does the firm see?",
            scenario: { approach: "inline", length: "6", event: "none" },
            options: [
                { id: "file", label: "The file, after 6 minutes" },
                { id: "504", label: "An error page at 5 minutes" },
                { id: "partial", label: "Half a file" },
            ],
            answer: "504", explanation: "300 s is the default maximum duration on every plan. At 300 s the platform ends the invocation with 504 FUNCTION_INVOCATION_TIMEOUT.",
            sources: [DUR("Duration limits"), LIM("Max duration")],
        },
        {
            id: "dial-6", setup: "maxDuration is now 800. The same 6-minute export.",
            prompt: "What happens?",
            scenario: { approach: "dial", length: "6", event: "none" },
            options: [
                { id: "file", label: "The file arrives, after 6 minutes of spinner" },
                { id: "504", label: "Still a 504 at 5 minutes" },
                { id: "instant", label: "The page answers at once" },
            ],
            answer: "file", explanation: "It fits under 800 s, so it finishes. The user still holds the tab open for six minutes: the tab is the job.",
            sources: [DUR("Duration limits")],
        },
        {
            id: "dial-14", setup: "Three weeks later, the largest customer's export needs 14 minutes. maxDuration is 800.",
            prompt: "What happens?",
            scenario: { approach: "dial", length: "14", event: "none" },
            options: [
                { id: "file", label: "It finishes: Pro allows long functions" },
                { id: "504", label: "A 504 at 800 s, after 13 minutes of spinner" },
                { id: "auto", label: "Vercel raises the limit automatically" },
            ],
            answer: "504", explanation: "800 s is about 13.3 minutes. Raising the limit moved the cliff; it did not remove it.",
            sources: [DUR("Duration limits")],
        },
        {
            id: "after-6", setup: "Fix two: reply 202 at once and run the export in after(). The 6-minute export.",
            prompt: "What happens?",
            scenario: { approach: "after", length: "6", event: "none" },
            options: [
                { id: "done", label: "The page answers at once, and the email arrives 6 minutes later" },
                { id: "dies", label: "The work dies when the reply is sent" },
                { id: "504", label: "A 504 at 300 s" },
            ],
            answer: "done", explanation: "after() runs once the reply is sent, for the route's maximum duration, here 800 s. Six minutes fits. This is the run that made it look fixed.",
            sources: [AFTER("after(callback)"), AFTER("Duration")],
        },
        {
            id: "after-14", setup: "The same after() setup. The 14-minute export.",
            prompt: "What does the customer see, and what does the row say?",
            scenario: { approach: "after", length: "14", event: "none" },
            options: [
                { id: "504", label: "A 504 page, and the row says failed" },
                { id: "silent", label: "A 202 at once, then nothing; the row says processing forever" },
                { id: "done", label: "The email, 14 minutes later" },
            ],
            answer: "silent", explanation: "after() shares the route's 800 s. The work stops there, long after the 202. No response is left to carry a 504, and nothing writes a failure.",
            sources: [AFTER("Duration"), DUR("Duration limits")],
        },
        {
            id: "after-crash", setup: "after() again, a 4-minute export that fits easily. The instance crashes at 2 minutes.",
            prompt: "What happens next?",
            scenario: { approach: "after", length: "4", event: "crash" },
            options: [
                { id: "retry", label: "Vercel retries the callback" },
                { id: "lost", label: "It is gone: no record, no retry, the row says processing" },
                { id: "resume", label: "It resumes where it stopped" },
            ],
            answer: "lost", explanation: "after() is a callback, not a job. Nothing tracks it, retries it, or survives a crash.",
            sources: [BG("Why inline execution fails")],
        },
        {
            id: "wf-14", setup: "The export is now a workflow: ten steps, one per part. The 14-minute export.",
            prompt: "What limits it now?",
            scenario: { approach: "workflow", length: "14", event: "none" },
            options: [
                { id: "total", label: "The total: 14 minutes is over 800 s" },
                { id: "step", label: "Each step: about 84 s, far under the limit" },
                { id: "nothing", label: "Nothing at all limits a workflow" },
            ],
            answer: "step", explanation: "A run has no maximum duration; each step runs as its own function and is bounded by the function limit. Split the work so every step fits.",
            sources: [WFL("Workflow run limits"), WFC("Step")],
        },
        {
            id: "wf-crash", setup: "The workflow, the 6-minute export. The instance crashes at 2 minutes, in the middle of a step.",
            prompt: "What happens?",
            scenario: { approach: "workflow", length: "6", event: "crash" },
            options: [
                { id: "restart", label: "The whole export starts again from step 1" },
                { id: "step", label: "That step runs again from its first line; finished steps are not repeated" },
                { id: "fails", label: "The run fails" },
            ],
            answer: "step", explanation: "Finished steps are in the event log, so replay skips them. The failed step is retried, from its first line, which is why its side effects must be safe to do twice.",
            sources: [WFC("Workflow"), ERR("Step re-execution")],
        },
    ],

    fix: {
        intro: "Every long path asks the same three questions. The export answered yes to the first, and that was the whole story.",
        tree: {
            start: "near",
            nodes: [
                { id: "near", question: "Can it run near the function's limit, now or as data grows?", yes: "piece", no: "wait" },
                { id: "wait", question: "Must the reply wait for it?", yes: "inline", no: "after" },
                { id: "piece", question: "Can one piece of it run near the limit on its own?", yes: "split", no: "workflow" },
            ],
            leaves: [
                { id: "inline", title: "Keep it inline, with a timeout", body: "Short work the user waits for. Give each outbound call a timeout well under the route's limit." },
                { id: "after", title: "after(), for short side work", body: "Logging, analytics, a cache warm. It runs once the reply is sent, on the route's own clock, with no record and no retry." },
                { id: "workflow", title: "A workflow, a step per piece", body: "The export's fix. The route starts a run and replies; each step is its own function; the page reads status by run id." },
                { id: "split", title: "Split it until each step fits", body: "A step is bounded by the function limit. Batch by month, by account or by page so no single step comes near it." },
            ],
        },
        patterns: [
            {
                id: "workflow", title: "Start a workflow, reply at once", when: "Work that can run near the function limit, or must survive a crash or a deploy.",
                body: "The route starts a run and replies 202 with an id. Each part of the export is a step: its own function invocation, retried on failure, recorded in the run's event log. The credit is settled by the workflow when the result exists, not by the button.",
                code: [{ label: "Start and the workflow", lang: "ts", code: WORKFLOW_CODE }],
                sources: [WF("Vercel Workflows"), WFC("Workflow"), WFC("Step"), BG("Job triggering pattern")],
            },
            {
                id: "status", title: "Status by run id", when: "Whenever a user may leave and come back.",
                body: "Store the run id on the export row. The page asks the run for its status, or reads its stream for progress, so closing the tab changes nothing.",
                code: [{ label: "The status route", lang: "ts", code: STATUS_CODE }],
                sources: [WF("Features")],
            },
            {
                id: "after", title: "after(), for short work only", when: "A few seconds of side work that should not delay the reply.",
                body: "Logging, analytics, a cache warm. It runs once the response is finished.",
                doesNotFix: "Anything that can approach the route's maximum duration, or must be retried. It shares the route's clock and keeps no record.",
                code: [{ label: "Fix two, as shipped", lang: "ts", code: AFTER_CODE }],
                sources: [AFTER("after(callback)"), AFTER("Duration")],
            },
            {
                id: "dial", title: "Raise maxDuration", when: "Work that is long but bounded, where a user really must wait for the answer.",
                body: "One line per route; up to 800 s on Pro and Enterprise.",
                doesNotFix: "Growth. The next customer's data is bigger, and the user still cannot leave.",
                code: [{ label: "Fix one, as shipped", lang: "ts", code: INLINE_CODE }],
                sources: [DUR("Maximum duration for different runtimes"), DUR("Duration limits")],
            },
        ],
        twist: {
            title: "The step that ran twice",
            body: [
                "The workflow shipped, and the first big export sent the customer two emails with the same link.",
                "The send-link step sent the email and then failed writing 'sent' to the row. A step that throws is retried, and a retried step starts again from its first line. So it sent the email again.",
                "The fix: check before acting, and give the provider an idempotency key built from the export id. And when retrying cannot help, like a bad address, throw FatalError so the step stops instead of trying four times.",
            ],
            signature: "Duplicate emails, charges or rows, each pair a few seconds apart, from runs that succeeded.",
            code: [{ label: "An idempotent step", lang: "ts", code: IDEMPOTENT_CODE }],
            sources: [ERR("Default retry behavior"), ERR("Step re-execution"), ERR("Idempotency for side effects"), ERR("FatalError vs RetryableError")],
        },
        afterShip: [
            { title: "A rollback does not stop old runs", body: "Runs stay on the deployment they started on, so a deploy never breaks one mid-way. The same pinning means rolling back leaves runs on the bad deployment retrying. Cancel them from the Workflows tab or the CLI.", sources: [WFC("Skew Protection")] },
            { title: "Thousands of tiny steps slow a run", body: "Runs past 2,000 events replay slower, and a replay that takes over 240 s may be aborted. Bundle small items into each step.", sources: [WFL("Workflow run limits")] },
            { title: "Stuck rows from before stay stuck", body: "Exports frozen at processing by after() will not finish because the fix shipped. Find them, refund the credits, start them again as runs.", sources: [AFTER("Duration")] },
            { title: "Charge on the result", body: "Settle the credit in the workflow's last step, so a failed run never costs the customer.", sources: [WFC("Step")] },
        ],
    },

    postmortem: {
        summary: "Large year exports failed for three weeks in two different ways. First with a visible 504 at the function's maximum duration, then, after the work moved into after(), silently: the work stopped at the same limit after the user had been told it was on its way. Customers were charged for exports that never arrived.",
        sections: [
            { title: "Root cause", items: [
                "The export ran inside one function invocation, so it could never outlive that invocation's maximum duration.",
                "Raising maxDuration to 800 s moved the limit; the largest exports grew past it.",
                "after() runs on the route's own clock and keeps no record, so exports stopped at 800 s without a trace.",
            ] },
            { title: "Why nobody saw it coming", items: [
                "Local development does not enforce maxDuration, so the export never failed on a laptop.",
                "The error rate fell to zero after fix two, because a stopped callback produces no error and no response.",
                "Credits were charged when the button was pressed, so failures cost customers before anyone knew.",
            ] },
            { title: "What we changed", items: [
                "The export is a Vercel Workflow: the route starts a run and replies; each part is a step.",
                "The export row stores the run id; the page reads status and progress from the run.",
                "Steps with side effects check before acting and use idempotency keys; bad input throws FatalError.",
                "The credit is settled in the last step, on a finished export.",
                "An alert fires on exports processing for over 20 minutes; stuck exports from before were refunded and restarted.",
            ] },
        ],
        sources: [DUR("Duration limits"), AFTER("Duration"), WFC("Step"), ERR("Idempotency for side effects")],
    },

    postmortemPoints: {
        impact: [
            { id: "i-504", label: "Large exports failed with a 504 for the first three weeks" },
            { id: "i-silent", label: "Then they stopped silently, stuck at processing, with no email" },
            { id: "i-credits", label: "Customers were charged for exports that never arrived" },
        ],
        timeline: [
            { id: "t-first", label: "The first 504s on Monday morning" },
            { id: "t-dial", label: "maxDuration raised to 800 the same day" },
            { id: "t-after", label: "after() shipped when the largest customer hit 800 s" },
            { id: "t-found", label: "Stuck rows noticed weeks later, not from an alert" },
        ],
        causes: [
            { id: "c-inrequest", label: "The export lived inside one function invocation" },
            { id: "c-clock", label: "after() shares the route's maximum duration" },
            { id: "c-norecord", label: "Nothing recorded progress or retried a stopped export" },
            { id: "c-local", label: "Local dev does not enforce maxDuration" },
        ],
        well: [
            { id: "w-fast", label: "The first 504 was diagnosed within the hour" },
            { id: "w-row", label: "The exports row kept the evidence: processing, no finish time" },
        ],
        actions: [
            { id: "a-wf", label: "Run the export as a workflow, a step per part" },
            { id: "a-runid", label: "Store the run id; show status from the run" },
            { id: "a-idem", label: "Make side-effect steps idempotent" },
            { id: "a-charge", label: "Charge when the export exists" },
            { id: "a-alert", label: "Alert on exports processing too long" },
        ],
    },

    system: {
        caption: "Tallyroom's export: one route carried the whole job.",
        groups: [
            { id: "vercel", label: "Vercel" },
            { id: "data", label: "Data" },
        ],
        nodes: [
            { id: "browser", label: "Browser", sub: "Export the year", kind: "client", col: 0, row: 0 },
            { id: "route", label: "Export route", sub: "a Vercel Function", kind: "compute", group: "vercel", col: 1, row: 0 },
            { id: "db", label: "Database", sub: "the exports row", kind: "store", group: "data", col: 2, row: 1 },
            { id: "blob", label: "File storage", sub: "the CSV and PDF", kind: "store", group: "data", col: 2, row: 0 },
            { id: "email", label: "Email provider", sub: "sends the download link", kind: "external", col: 2, row: 2 },
        ],
        links: [
            { from: "browser", to: "route", label: "one request" },
            { from: "route", to: "db", label: "12 queries" },
            { from: "route", to: "blob", label: "write files" },
            { from: "route", to: "email", label: "send link", async: true },
        ],
        incident: {
            broken: ["route"],
            blast: ["browser", "db", "email"],
            note: "The route ran out of time: first with a 504 the user saw, then, inside after(), with nothing anyone saw. Rows stuck at processing, no email.",
        },
        after: {
            note: "The route only starts a run. Each part of the export is a step something remembers.",
            added: [
                { id: "runtime", label: "Workflow runtime", sub: "queue + event log", kind: "queue", group: "vercel", col: 1, row: 1 },
                { id: "steps", label: "Export steps", sub: "a function each", kind: "compute", group: "vercel", col: 2, row: 0 },
            ],
            addedLinks: [
                { from: "route", to: "runtime", label: "start(): run id" },
                { from: "runtime", to: "steps", label: "one step at a time" },
                { from: "steps", to: "db" },
                { from: "steps", to: "blob" },
                { from: "steps", to: "email" },
            ],
            removedLinks: [{ from: "route", to: "db" }, { from: "route", to: "blob" }, { from: "route", to: "email" }],
            changed: ["route", "browser"],
            move: { blob: { col: 3, row: 0 }, db: { col: 3, row: 1 }, email: { col: 3, row: 2 } },
            notes: {
                runtime: "Queues each step and records its result. After a crash or deploy, the run replays from this log.",
                steps: "Ten small functions of about 84 s each for the largest export, far under any limit. They write the files and the row, and send the link once. A failed one is retried from its first line.",
                route: "Starts the run and replies 202 with the export id. Nothing slow left in it.",
                browser: "Reads the run's status by id, so it can leave and come back.",
            },
        },
        chapters: {
            incident: ["browser", "route"],
            limits: ["route"],
            dial: ["route", "browser"],
            after: ["route", "db", "email"],
            quiet: ["db", "email"],
            workflow: ["route"],
            twice: ["email"],
            return: ["browser", "route"],
            operate: ["route"],
        },
    },
    chapters: EXPORT_CHAPTERS,
    learn: EXPORT_LEARN,
    glossary: EXPORT_GLOSSARY,

    build: {
        project: "long-jobs-on-vercel",
        title: "Long jobs on Vercel",
        summary: "Build the same app yourself: one slow function, an inline route that dies and a workflow that finishes, deployed on Vercel's free plan, with sprints and tasks to check off.",
    },

    mock: {
        role: "the incident lead running this case's postmortem",
        opening: "Exports failed for three weeks and we shipped two fixes that didn't fix it. Walk me through why each one failed.",
        probe: [
            "why raising maxDuration only moved the problem",
            "what after() changes and what it does not, and why the errors went to zero",
            "how a workflow step is bounded, and what that means for a 14-minute export",
            "what a retried step does to a side effect, and how you would make it safe",
        ],
        minutes: 8,
    },

    checklist: [
        { id: "limit", text: "For each long route I know its maximum duration and how close it runs to it.", why: "The default is 300 s on every plan, and it covers streaming too." },
        { id: "growth", text: "I know how its run time grows with the customer's data.", why: "A limit raised for today's biggest customer is tomorrow's 504." },
        { id: "after-short", text: "Nothing that can run near the limit is in after().", why: "after() shares the route's clock and keeps no record." },
        { id: "workflow", text: "Long or multi-step work runs as a workflow, a step per piece.", why: "A run has no maximum duration; each step is its own function." },
        { id: "step-fits", text: "Every step fits well under the function limit.", why: "A step is bounded by the function's maximum duration." },
        { id: "idempotent", text: "Every step with a side effect is safe to run twice.", why: "A retried step starts again from its first line." },
        { id: "fatal", text: "Errors retrying cannot fix throw FatalError.", why: "Otherwise a bad address is tried four times." },
        { id: "runid", text: "The page reads status by run id, so the user can leave.", why: "The tab is no longer the job." },
        { id: "charge", text: "Credits are charged on the result, not the press.", why: "A failed run should never cost the customer." },
        { id: "rollback", text: "After a rollback I cancel runs on the bad deployment.", why: "Runs stay pinned to the deployment they started on." },
    ],

    round: [
        {
            id: "exact-300", symptom: "A 504 FUNCTION_INVOCATION_TIMEOUT after exactly 300.0 seconds, every time.",
            options: [{ id: "max", label: "The function's maximum duration" }, { id: "db", label: "A slow database" }, { id: "client", label: "The browser gave up" }],
            answer: "max", explanation: "300 s is the default maximum duration, and FUNCTION_INVOCATION_TIMEOUT is the platform ending the invocation.",
            sources: [LIM("Max duration")],
        },
        {
            id: "silent-big", symptom: "The reply is instant and there are no errors, but large customers' exports stay at processing and their email never comes.",
            options: [{ id: "after", label: "The work runs in after(), on the route's clock" }, { id: "email", label: "The email provider is dropping mail" }, { id: "queue", label: "A queue is backed up" }],
            answer: "after", explanation: "Only the large ones, only silently: work after the reply, cut at the route's maximum duration.",
            sources: [AFTER("Duration")],
        },
        {
            id: "two-emails", symptom: "One successful export, two identical emails a few seconds apart.",
            options: [{ id: "retry", label: "A step sent it, then failed, and was retried from the top" }, { id: "twice", label: "The user clicked twice" }, { id: "provider", label: "The provider sent a duplicate" }],
            answer: "retry", explanation: "A retried step starts again from its first line. Check before acting, and use an idempotency key.",
            sources: [ERR("Step re-execution"), ERR("Idempotency for side effects")],
        },
        {
            id: "dev-fine", symptom: "The export works on a laptop and fails in production.",
            options: [{ id: "dev", label: "Local dev doesn't enforce maxDuration" }, { id: "data", label: "Production has a different database" }, { id: "cache", label: "A stale build cache" }],
            answer: "dev", explanation: "Next.js writes maxDuration into a manifest at build time for the platform to enforce. No Next.js runtime code stops a slow route, so next dev never will.",
            sources: [NXT("maxDuration is extracted at build time, not enforced at runtime")],
        },
        {
            id: "rollback", symptom: "After rolling back a bad deploy, runs keep failing and retrying on the old deployment.",
            options: [{ id: "pinned", label: "Runs are pinned to the deployment they started on" }, { id: "cache", label: "The rollback didn't take" }, { id: "bug", label: "A bug in the new deployment" }],
            answer: "pinned", explanation: "Pinning protects runs from a deploy, and keeps them on the old one after a rollback. Cancel them.",
            sources: [WFC("Skew Protection")],
        },
        {
            id: "slow-replay", symptom: "A run that processes 30,000 rows one step per row gets slower and slower.",
            options: [{ id: "events", label: "Too many events: replay grows with them" }, { id: "db", label: "The database is slowing down" }, { id: "limit", label: "A step hit its limit" }],
            answer: "events", explanation: "Runs past 2,000 events replay slower. Bundle rows into each step.",
            sources: [WFL("Workflow run limits")],
        },
        {
            id: "bad-address", symptom: "A step fails with 400 Invalid address, and is tried four times.",
            options: [{ id: "fatal", label: "It should throw FatalError" }, { id: "retryable", label: "It should throw RetryableError" }, { id: "fine", label: "That's correct behaviour" }],
            answer: "fatal", explanation: "By default a throwing step is retried three times. FatalError skips the retries when retrying cannot help.",
            sources: [ERR("FatalError vs RetryableError")],
        },
        {
            id: "stale-status", symptom: "The page says processing, but the run failed an hour ago.",
            options: [{ id: "row", label: "The page reads a row nothing updates on failure" }, { id: "cache", label: "The browser cached the page" }, { id: "slow", label: "Status updates take an hour" }],
            answer: "row", explanation: "Read the run's own status by id, or update the row in a final step that also runs on failure.",
            sources: [WF("Features")],
        },
    ],

    closing: [
        "Raising a limit moves the cliff. It doesn't remove it.",
        "after() changes who waits, not how long the work may run.",
        "A retried step starts again from its first line.",
    ],
}
