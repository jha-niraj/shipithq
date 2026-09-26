import type { IncidentCase, SimLane, SimRun, SimValues, SourceRef } from "./types"
import { getIncidentMeta } from "./index"

/**
 * Case one (plan/incidents/overview.md, "The first case").
 *
 * A real incident: a job of over two minutes, deployed into a Workers for
 * Platforms namespace, running inside the request, killed in front of a client
 * when the connection dropped (Niraj, 2026-09-26). Everyone blamed "the 30-second
 * limit". It was none of the three limits that share that number, and telling them
 * apart is the lesson.
 *
 * Sources: SW = "Long-Running Work on Standalone Workers", WFP = "Long-Running Work
 * on Workers for Platforms" (both Niraj, 2026-09-25). Every claim names a section.
 * The minute-by-minute of the call (the refresh at about 30 s) is a dramatisation
 * for Niraj to confirm; the mechanism is his account.
 */

const SW = (section: string): SourceRef => ({ source: "SW", section })
const WFP = (section: string): SourceRef => ({ source: "WFP", section })

// ── The simulator ──────────────────────────────────────────────────────────
//
// A faithful script of the documented behaviour, not a live Worker. The job is
// 120 s of model calls. Non-streaming, it uses almost no CPU (waiting parks the
// isolate); streaming, the illustration charges CPU at the rate of wall time,
// which is the worst case the docs describe ("a 30-second model call can exhaust
// a 30-second CPU budget").

const JOB = 120
const WAIT_UNTIL_CAP = 30

function simulate(v: SimValues): SimRun {
    const ns = v.platform === "namespace"
    const streaming = v.streaming === "on"
    const cpuBudget = !ns && v.cpu === "raised" ? 300 : 30
    const cpuRate = streaming ? 1 : 0.003
    const cpuDeath = streaming ? cpuBudget / cpuRate : Infinity
    const at = Number(v.at)
    const event = v.event
    const meter = { label: "CPU used", budget: cpuBudget, rate: cpuRate }

    const eventMark = (): SimRun["marks"] => {
        if (event === "background") return [{ at, label: "Tab backgrounded", tone: "muted" }]
        if (event === "close") return [{ at, label: "Tab closed", tone: "bad" }]
        if (event === "refresh") return [{ at, label: "Page refreshed", tone: "bad" }]
        if (event === "deploy") return [{ at, label: "Deploy", tone: "bad" }]
        return []
    }
    const disconnects = event === "close" || event === "refresh"

    /** The browser's lane: waiting on the response, or polling a status row. */
    const browser = (mode: "waits" | "polls", end: number): SimLane => {
        const segs: SimLane["segments"] = []
        const label = mode === "waits" ? "Waiting for the response" : "Polling the status"
        if (event === "background" && at < end) {
            segs.push({ from: 0, to: at, state: "wait", label }, { from: at, to: end, state: "background", label: "Backgrounded, still connected" })
        } else if (disconnects && at < end) {
            segs.push({ from: 0, to: at, state: "wait", label }, { from: at, to: JOB, state: "idle", label: event === "refresh" ? "New page, old request gone" : "Gone" })
        } else {
            segs.push({ from: 0, to: end, state: "wait", label })
        }
        return { id: "browser", label: "Browser", segments: segs }
    }
    const work = (end: number, ok: boolean, label: string): SimLane => ({
        id: "work",
        label: "The job",
        segments: [
            { from: 0, to: end, state: "run", label: "Running" },
            ...(end < JOB ? [{ from: end, to: JOB, state: ok ? ("done" as const) : ("dead" as const), label }] : []),
        ],
    })

    // Crons: no browser at all.
    if (v.runtime === "cron") {
        if (ns) {
            return {
                verdict: "never-runs", end: 0,
                headline: "The schedule never fired",
                reason: "Cron triggers are silently dropped in a dispatch namespace. No error, no warning, no log: the job simply never starts.",
                sources: [WFP("What the namespace takes away, and what it leaves")],
                lanes: [{ id: "work", label: "The job", segments: [{ from: 0, to: JOB, state: "never", label: "Never started" }] }],
                marks: [],
            }
        }
        if (cpuDeath < JOB) {
            return {
                verdict: "killed", end: cpuDeath,
                headline: `Killed at ${cpuDeath} s of CPU`,
                reason: "A cron fires here, with no browser to lose. But it is still an invocation with a CPU budget, and a streamed response spends CPU the whole way through.",
                sources: [SW("CPU time is not elapsed time"), SW("What survives what")],
                lanes: [work(cpuDeath, false, "Killed: CPU")], marks: [{ at: cpuDeath, label: "CPU budget spent", tone: "bad" }], meter,
            }
        }
        return {
            verdict: "completes", end: JOB,
            headline: "Finished on schedule",
            reason: "On a standalone Worker, `triggers.crons` fire, survive deploys and need no browser. They run on a schedule, though, not when a user presses a button.",
            sources: [SW("What survives what"), SW("Standalone-specific facts worth knowing")],
            lanes: [work(JOB, true, "Done")], marks: [], meter,
        }
    }

    // Inside the request: it lives exactly as long as the connection.
    if (v.runtime === "request") {
        const eventKill = disconnects || event === "deploy" ? at : Infinity
        const killAt = Math.min(eventKill, cpuDeath)
        if (killAt < JOB) {
            const byCpu = cpuDeath <= eventKill
            const headline = byCpu ? `Killed at ${killAt} s: CPU budget` : `Killed at ${killAt} s: ${event === "deploy" ? "the deploy" : "the connection closed"}`
            const reason = byCpu
                ? ns
                    ? "The response streams, so parsing it costs CPU the whole way. 30 s of CPU is the ceiling in a namespace, and `limits.cpu_ms` is rejected there."
                    : "The response streams, so parsing it costs CPU the whole way. The default is 30 s; `limits.cpu_ms` raises it to 300 s on a standalone Worker."
                : event === "deploy"
                    ? "A deploy replaces the isolate. Work inside a request dies with it, and its catch block never runs."
                    : "The work lived inside the request, so it lived exactly as long as the connection. The browser ended it. A cancelled invocation cannot run its catch block, so nothing records that it stopped."
            return {
                verdict: "killed", end: killAt, headline, reason,
                sources: byCpu ? [SW("CPU time is not elapsed time"), WFP("Why the CPU ceiling may not matter")] : [SW("What survives what"), SW("5. Find the error handling around the long path")],
                lanes: [browser("waits", killAt), work(killAt, false, "Killed, nothing written")],
                marks: [...eventMark(), ...(byCpu ? [{ at: killAt, label: "CPU budget spent", tone: "bad" as const }] : [])],
                meter,
            }
        }
        return {
            verdict: "completes", end: JOB,
            headline: "Finished",
            reason: event === "background"
                ? "Backgrounding a tab throttles timers but does not abort an in-flight fetch. The connection never broke. That is not a background job; it is a request nobody interrupted."
                : "Nobody closed anything, and waiting on the model cost almost no CPU. It works, for exactly as long as nobody touches the tab.",
            sources: [SW("What survives what"), SW("CPU time is not elapsed time")],
            lanes: [browser("waits", JOB), work(JOB, true, "Done")], marks: eventMark(), meter,
        }
    }

    // waitUntil: the response is sent at once, the work gets 30 s of wall clock.
    if (v.runtime === "waitUntil") {
        const killAt = Math.min(event === "deploy" ? at : Infinity, WAIT_UNTIL_CAP, cpuDeath)
        const byDeploy = event === "deploy" && at < WAIT_UNTIL_CAP
        return {
            verdict: "killed", end: killAt,
            headline: byDeploy ? `Killed at ${killAt} s: the deploy` : `Cut off at ${WAIT_UNTIL_CAP} s`,
            reason: byDeploy
                ? "`waitUntil` survives a closed tab, but not a deploy."
                : disconnects && at < WAIT_UNTIL_CAP
                    ? "Closing the tab did not kill it: `waitUntil` runs after the response. The 30-second wall clock did. It applies on every plan and nothing raises it."
                    : "`waitUntil` gives work 30 seconds of real time after the response, on every plan, with no setting to raise it. Right for sending an email; wrong for a two-minute job.",
            sources: [SW("The facts you are reasoning from"), SW("What survives what")],
            lanes: [
                { id: "browser", label: "Browser", segments: [{ from: 0, to: 1, state: "done", label: "Got the response" }, { from: 1, to: JOB, state: "idle", label: "Nothing to wait for" }] },
                work(killAt, false, "Killed, nothing written"),
            ],
            marks: [{ at: 0.5, label: "Response sent", tone: "muted" }, ...eventMark(), { at: WAIT_UNTIL_CAP, label: "30 s wall clock", tone: "bad" }],
        }
    }

    // A Durable Object alarm: a fresh invocation with no client attached.
    if (cpuDeath < JOB && !(event === "deploy" && at < cpuDeath)) {
        return {
            verdict: "killed", end: cpuDeath,
            headline: `Killed at ${cpuDeath} s of CPU`,
            reason: ns
                ? "An alarm has no wall-clock limit, but it is bounded by CPU, and a streamed response spends CPU throughout. In a namespace the ceiling is 30 s and cannot move: stop streaming inside the job, or leave the namespace."
                : "An alarm has no wall-clock limit, but it is bounded by CPU, and a streamed response spends CPU throughout. Raise `limits.cpu_ms`, or stop streaming inside the job.",
            sources: [SW("The facts you are reasoning from"), WFP("Why the CPU ceiling may not matter")],
            lanes: [browser("polls", cpuDeath), work(cpuDeath, false, "Killed: CPU")],
            marks: [...eventMark(), { at: cpuDeath, label: "CPU budget spent", tone: "bad" }], meter,
        }
    }
    if (event === "deploy" && at < JOB) {
        return {
            verdict: "evicted", end: at,
            headline: "Evicted mid-run by the deploy",
            reason: "A scheduled alarm survives a deploy, but one already running can be evicted with its isolate. The row stays in a working state. Surviving a deploy needs the alarm plus a reaper that finds and restarts stalled runs.",
            sources: [SW("Phase 2 - classify each path"), SW("What survives what")],
            lanes: [browser("polls", at), work(at, false, "Evicted, row still 'working'")],
            marks: eventMark(), meter,
        }
    }
    return {
        verdict: "completes", end: JOB,
        headline: "Finished, tab or no tab",
        reason: disconnects
            ? "The alarm never had a browser to lose. The page left, the job kept going, and when the user comes back the poll reads 'done' from the database."
            : "The alarm runs with no client attached and no wall-clock limit. The page only polls a status row.",
        sources: [SW("What survives what"), SW("The four execution models")],
        lanes: [browser("polls", JOB), work(JOB, true, "Done")], marks: eventMark(), meter,
    }
}

// ── Code shown in the fix ──────────────────────────────────────────────────

const ALARM_CODE = `export class JobDO {
  constructor(private state: DurableObjectState, private env: Env) {}

  // The button's request lands here and returns at once: 202, no waiting.
  async fetch(req: Request) {
    await this.state.storage.put("job", await req.json())
    await this.state.storage.setAlarm(Date.now())
    return new Response(null, { status: 202 })
  }

  // A fresh invocation with no client attached. Closing the tab cannot reach it.
  async alarm() {
    const job = await this.state.storage.get<Job>("job")
    if (!job) return
    try {
      await markStatus(job.id, "working")
      await doTheWork(job.id)          // every external call has a timeout
      await markStatus(job.id, "done")
    } catch (err) {
      await markStatus(job.id, "failed") // a terminal row: nothing retries blindly
    } finally {
      await this.state.storage.delete("job")
    }
  }
}`

const START_CODE = `// One job, one Durable Object: a second click finds the same instance.
const stub = env.JOB_DO.get(env.JOB_DO.idFromName(jobId))
await stub.fetch("https://job/start", { method: "POST", body: JSON.stringify({ id: jobId }) })

// The page never waits on the work. It polls the row the alarm writes.
const { status } = await fetch(\`/api/jobs/\${jobId}\`).then((r) => r.json())`

const WAIT_UNTIL_CODE = `import { getCloudflareContext } from "@opennextjs/cloudflare"

const { ctx } = getCloudflareContext({ async: false })
ctx.waitUntil(sendTheEmail(id).catch(console.error))  // 30 s of wall clock, then gone
return { started: true }`

const CPU_CODE = `// wrangler.jsonc, standalone Worker only. Rejected in a dispatch namespace.
{
  "limits": { "cpu_ms": 300000 }
}`

const REAPER_SQL = `-- Runs that started and never finished: the signature of a cancelled invocation.
update job
set status = 'failed', error = 'stalled: no progress for 10 minutes'
where status = 'working'
  and updated_at < now() - interval '10 minutes';`

const ENV_CODE = `// @ts-ignore generated by \`opennextjs-cloudflare build\`: the app's .env, baked in
import * as nextEnvVars from "../../../.open-next/cloudflare/next-env.mjs"

function hydrateProcessEnv(env: Record<string, unknown>) {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") process.env[key] = value      // real bindings win
  }
  const mode = typeof env.NEXTJS_ENV === "string" ? env.NEXTJS_ENV : "production"
  const baked = (nextEnvVars as Record<string, Record<string, string> | undefined>)[mode]
  for (const [key, value] of Object.entries(baked ?? {})) {
    process.env[key] ??= value                                    // .env fills the gaps
  }
}

async alarm() {
  hydrateProcessEnv(this.env)                  // BEFORE the first import
  const { doTheWork } = await import("@/lib/work")  // dynamic, so env exists first
  // ...
}`

// ── The case ───────────────────────────────────────────────────────────────

const meta = getIncidentMeta("the-demo-that-died-at-30-seconds")!

export const demoThatDiedAt30Seconds: IncidentCase = {
    ...meta,
    sources: {
        SW: { title: "Long-Running Work on Standalone Workers", author: "Niraj Jha", date: "2026-09-25" },
        WFP: { title: "Long-Running Work on Workers for Platforms", author: "Niraj Jha", date: "2026-09-25" },
    },

    story: [
        { kind: "scene", id: "build", at: "Monday", text: "The feature is easy to describe: paste a brief, get a full report back. Under the hood it is four model calls in a row, each one waiting on the last. On the developer's laptop it takes a little over two minutes. Every single time. It has never failed once." },
        { kind: "scene", id: "ship", at: "Tuesday", text: "It ships the way most features ship. The button calls the server, the server does the work, the page waits for the answer. The app runs on Cloudflare, deployed into a Workers for Platforms dispatch namespace. Nobody asks where those two minutes actually live." },
        {
            kind: "thread", id: "warning", at: "Thursday, 3:45 pm", channel: "#eng",
            messages: [
                { from: "A teammate", t: "3:45", text: "Quick one before your 4 o'clock. That generate step runs over two minutes, right? On Workers that's going to get cut off." },
                { from: "The developer", t: "3:46", text: "It's a normal request. The connection stays open, so it just waits for it." },
                { from: "A teammate", t: "3:46", text: "I really wouldn't demo that one live." },
                { from: "The developer", t: "3:47", text: "Worked every time locally. We're fine." },
            ],
        },
        {
            kind: "fork", id: "fork", at: "3:47 pm, thirteen minutes left",
            prompt: "You're the developer. The client joins in thirteen minutes. What do you do?",
            options: [
                { id: "ship", label: "Demo it as it is", consequence: "That's the call they made. Keep reading." },
                { id: "waituntil", label: "Wrap the work in waitUntil so it runs after the response", consequence: "Then it dies at exactly 30 seconds instead. `waitUntil` gets 30 seconds of wall clock on every plan, and there's no setting to raise it." },
                { id: "cpu", label: "Raise the CPU limit in wrangler.jsonc", consequence: "Wrangler rejects `limits.cpu_ms` inside a dispatch namespace. And CPU isn't what's about to kill it anyway." },
                { id: "postpone", label: "Move the demo", consequence: "The safe call. The real fix is a Durable Object alarm, and that's a refactor, not a thirteen-minute change." },
            ],
            after: "They demoed it as it was.",
        },
        {
            kind: "log", id: "call", at: "4:00 pm, the call",
            lines: [
                { t: "0:00", text: "The client shares a brief. The developer clicks Generate." },
                { t: "0:01", text: "The request goes out. The page shows a spinner and waits.", tone: "muted" },
                { t: "0:05", text: "On the server, model call 1 of 4 starts.", tone: "muted" },
                { t: "0:15", text: "Client: \"Is it doing something?\"" },
                { t: "0:20", text: "Developer: \"It's thinking. Big brief.\"", tone: "muted" },
                { t: "0:30", text: "Still a spinner. The developer hits refresh to nudge it.", tone: "bad" },
                { t: "0:30", text: "The browser drops the old request. The work inside it stops, mid-call.", tone: "bad" },
                { t: "0:31", text: "The page reloads and reads the job: Generating..." },
                { t: "2:10", text: "Still Generating. Nothing is running, so nothing will ever finish.", tone: "bad" },
                { t: "3:00", text: "Developer: \"Let me show you one I ran earlier.\"", tone: "bad" },
            ],
        },
        {
            kind: "evidence", id: "row", at: "Friday morning, the database",
            title: "The job's row, the next day",
            rows: [
                { label: "status", value: "generating" },
                { label: "events", value: "started (no ok, no failed)" },
                { label: "error", value: "(empty)" },
                { label: "updated", value: "16:00:05, and never again" },
            ],
            note: "Look at the error column. It's empty. Nothing failed; something stopped. A cancelled invocation can't run its own catch block, so it can't write down that it was cancelled. The page will poll this row forever.",
            sources: [SW("The query that finds dead runs"), SW("The two sentences to remember")],
        },
        {
            kind: "thread", id: "blame", at: "Friday, 10:12 am", channel: "#eng",
            messages: [
                { from: "The developer", t: "10:12", text: "Cloudflare killed it. Workers have a 30 second limit." },
                { from: "A teammate", t: "10:14", text: "Workers have three things that are 30 seconds. Which one?" },
                { from: "The developer", t: "10:14", text: "Does it matter?" },
                { from: "A teammate", t: "10:15", text: "It's the whole fix." },
            ],
        },
        { kind: "scene", id: "diagnosis", at: "What actually happened", text: "\"Cloudflare kills requests at 30 seconds\" sounds right. It died around 30 seconds, and the warning was about a limit. But it was none of the three limits. It was the refresh. The work lived inside a request, and the browser ended the request. The rest of this case is about telling those apart, because each one has a different fix." },
    ],

    model: {
        diagram: "worker-limits",
        intro: "Here's the trap. \"The 30-second limit\" is really three different limits that happen to share a number, plus a fourth thing that has no number at all. Each one fails differently, and each one needs a different fix.",
        steps: [
            { id: "three", title: "Three limits, one number", focus: "overview", body: "CPU time: 30 seconds by default. The `waitUntil` wall clock: 30 seconds. The client connection: no platform limit at all, because it belongs to the browser. When someone says \"it died at 30 seconds\", your first question is: which of these?", sources: [SW("The facts you are reasoning from")] },
            { id: "cpu", title: "CPU time counts work, not waiting", focus: "cpu", body: "Only the time your JavaScript is actually executing counts. The default budget is 30 seconds. On a standalone Worker you can raise it to 300,000 ms with `limits.cpu_ms`. Inside a dispatch namespace, like the demo's, wrangler rejects that setting, so 30 seconds is the ceiling.", sources: [SW("The facts you are reasoning from"), WFP("The three limits, and which you can move")] },
            { id: "idle", title: "Waiting is nearly free", focus: "cpu-idle", body: "While your code awaits the network, the isolate is parked and the CPU clock barely moves. A 150-second call to a model that returns one JSON body can burn a few hundred milliseconds of CPU. That's why the demo's two minutes of waiting never came close to the CPU limit.", sources: [SW("CPU time is not elapsed time")] },
            { id: "stream", title: "Streaming is not", focus: "cpu-stream", body: "Stream the response instead and everything changes. Every chunk is parsed, tokens are stitched together, callbacks fire the whole way through. That's real CPU, and it grows with the length of the answer. A 30-second model call can spend a 30-second budget while looking completely idle.", sources: [SW("CPU time is not elapsed time")] },
            { id: "waituntil", title: "waitUntil has a wall clock", focus: "waituntil", body: "`waitUntil` lets work keep going after the response is sent. But only for 30 seconds of real time, on every plan, with no setting to change it. It's the right tool for sending an email, and the wrong one for a two-minute job.", sources: [SW("The facts you are reasoning from")] },
            { id: "connection", title: "The connection belongs to the browser", focus: "connection", body: "Work inside a request lives exactly as long as the request does. Switch tabs and the connection stays open, so the work carries on. Close the tab or hit refresh and the connection ends, and the work ends with it. No platform limit was involved in the demo. Just a refresh.", sources: [SW("What survives what")] },
            { id: "alarm", title: "An alarm has nobody to lose", focus: "alarm", body: "A Durable Object alarm is a fresh invocation with no browser attached. Closing the tab can't reach it, it has no wall-clock limit, and it works fine inside a dispatch namespace. It's still bounded by CPU, like everything else, so don't stream inside it.", sources: [SW("The facts you are reasoning from"), WFP("The distinction everything turns on")] },
        ],
    },

    simulator: {
        duration: JOB,
        job: "A two-minute job: four model calls, one after another.",
        controls: [
            { id: "platform", label: "Platform", options: [
                { value: "namespace", label: "Dispatch namespace", hint: "Workers for Platforms, like the demo" },
                { value: "standalone", label: "Standalone Worker", hint: "Plain wrangler deploy" },
            ] },
            { id: "runtime", label: "Where the work runs", options: [
                { value: "request", label: "Inside the request" },
                { value: "waitUntil", label: "waitUntil" },
                { value: "alarm", label: "Durable Object alarm" },
                { value: "cron", label: "Cron trigger" },
            ] },
            { id: "streaming", label: "Model response", options: [
                { value: "off", label: "One JSON body" },
                { value: "on", label: "Streamed" },
            ] },
            { id: "cpu", label: "CPU budget", options: [
                { value: "default", label: "Default, 30 s" },
                { value: "raised", label: "cpu_ms 300,000", disabledWhen: { platform: "namespace" }, disabledReason: "Rejected by wrangler in a dispatch namespace" },
            ] },
            { id: "event", label: "What happens", options: [
                { value: "none", label: "Nothing" },
                { value: "background", label: "Tab backgrounded" },
                { value: "refresh", label: "Page refreshed" },
                { value: "close", label: "Tab closed" },
                { value: "deploy", label: "A deploy" },
            ] },
            { id: "at", label: "When", options: [
                { value: "20", label: "At 20 s" },
                { value: "45", label: "At 45 s" },
                { value: "90", label: "At 90 s" },
            ] },
        ],
        defaults: { platform: "namespace", runtime: "request", streaming: "off", cpu: "default", event: "refresh", at: "20" },
        simulate,
        fidelity: "Scripted from the documented behaviour, not a live Worker. When streamed, CPU is drawn at the rate of wall time, the worst case the docs describe; real CPU depends on the response's length.",
    },

    predict: [
        {
            id: "background", setup: "The job runs inside the request. The user switches to another tab at 20 s.",
            prompt: "What happens to the job?",
            scenario: { platform: "namespace", runtime: "request", streaming: "off", cpu: "default", event: "background", at: "20" },
            options: [
                { id: "completes", label: "It finishes" },
                { id: "paused", label: "It pauses until the tab is back" },
                { id: "killed", label: "It dies when the tab loses focus" },
                { id: "thirty", label: "It dies at 30 s" },
            ],
            answer: "completes",
            explanation: "Backgrounding throttles timers but does not abort an in-flight fetch. So \"it kept working when I switched tabs\" proves only that the connection never broke. It is not evidence of a background job.",
            sources: [SW("What survives what")],
        },
        {
            id: "refresh", setup: "The same job. The user refreshes the page at 20 s, as the developer did in the demo.",
            prompt: "What happens, and what does the database say afterwards?",
            scenario: { platform: "namespace", runtime: "request", streaming: "off", cpu: "default", event: "refresh", at: "20" },
            options: [
                { id: "continues", label: "It keeps running on the server and finishes" },
                { id: "failed-row", label: "It stops, and the catch block marks the row failed" },
                { id: "silent", label: "It stops, and the row still says it is working" },
                { id: "retries", label: "Cloudflare retries it for the new page" },
            ],
            answer: "silent",
            explanation: "The work lived inside the request, so it ended with the connection. A cancelled invocation cannot run its catch block, so no failure is ever written. The row says 'working' forever: the exact evidence from the demo.",
            sources: [SW("What survives what"), SW("5. Find the error handling around the long path")],
        },
        {
            id: "waituntil", setup: "Now the work is wrapped in waitUntil, so the response returns at once. The user closes the tab at 20 s.",
            prompt: "Does the two-minute job finish?",
            scenario: { platform: "namespace", runtime: "waitUntil", streaming: "off", cpu: "default", event: "close", at: "20" },
            options: [
                { id: "finishes", label: "Yes: it no longer depends on the tab" },
                { id: "close", label: "No: it dies when the tab closes" },
                { id: "thirty", label: "No: it survives the close and dies at 30 s" },
                { id: "plan", label: "Only on a paid plan" },
            ],
            answer: "thirty",
            explanation: "`waitUntil` does survive the closed tab. Then its own wall clock ends it at 30 seconds. That cap applies on every plan and nothing raises it: right for an email, wrong for this.",
            sources: [SW("The facts you are reasoning from"), SW("What survives what")],
        },
        {
            id: "stream", setup: "A standalone Worker, work inside the request, nobody touches the tab. This time the model's reply is streamed.",
            prompt: "The job waits on the model for most of its two minutes. Is CPU a problem?",
            scenario: { platform: "standalone", runtime: "request", streaming: "on", cpu: "default", event: "none", at: "90" },
            options: [
                { id: "no", label: "No: waiting on the network costs no CPU" },
                { id: "yes", label: "Yes: parsing the stream spends CPU the whole time" },
                { id: "wall", label: "Only if it runs over 30 s of wall clock" },
            ],
            answer: "yes",
            explanation: "Waiting is free only when there is one body to parse at the end. A stream is parsed chunk by chunk, with callbacks firing throughout. That CPU grows with the response, and a 30-second call can spend the 30-second budget.",
            sources: [SW("CPU time is not elapsed time")],
        },
        {
            id: "cpu-raised", setup: "Same streamed job on the standalone Worker, now with `limits.cpu_ms` raised to 300,000. The user closes the tab at 45 s.",
            prompt: "Does it finish?",
            scenario: { platform: "standalone", runtime: "request", streaming: "on", cpu: "raised", event: "close", at: "45" },
            options: [
                { id: "yes", label: "Yes: it has five minutes of CPU now" },
                { id: "no", label: "No: it dies with the connection at 45 s" },
            ],
            answer: "no",
            explanation: "Raising `cpu_ms` fixes CPU, not disconnection. The work is still inside the request. Check which limit a path is actually hitting before fixing the other one.",
            sources: [SW("Two traps worth checking explicitly")],
        },
        {
            id: "cron", setup: "To avoid the request entirely, the job moves to a nightly cron trigger. The app stays in its dispatch namespace.",
            prompt: "What happens the first night?",
            scenario: { platform: "namespace", runtime: "cron", streaming: "off", cpu: "default", event: "none", at: "20" },
            options: [
                { id: "runs", label: "It runs, with no browser to lose" },
                { id: "error", label: "It fails with an error in the logs" },
                { id: "never", label: "Nothing runs, and nothing says so" },
            ],
            answer: "never",
            explanation: "Cron triggers are silently dropped in a dispatch namespace: no error, no warning, no log. It works in local preview, which is how nobody notices.",
            sources: [WFP("What the namespace takes away, and what it leaves"), WFP("You cannot test any of this locally")],
        },
        {
            id: "alarm", setup: "The job runs in a Durable Object alarm, and the page polls a status row. Still in the namespace. The user closes the tab at 45 s.",
            prompt: "What happens?",
            scenario: { platform: "namespace", runtime: "alarm", streaming: "off", cpu: "default", event: "close", at: "45" },
            options: [
                { id: "finishes", label: "It finishes; the row says done when they come back" },
                { id: "dies", label: "It dies with the tab" },
                { id: "thirty", label: "It dies at 30 s" },
            ],
            answer: "finishes",
            explanation: "An alarm is a fresh invocation with no client attached, with no wall-clock limit, and it fires normally in a namespace. The page only reads a row.",
            sources: [SW("What survives what"), WFP("The distinction everything turns on")],
        },
        {
            id: "deploy", setup: "The same alarm is 45 s into its run when somebody deploys.",
            prompt: "What happens to the run in flight?",
            scenario: { platform: "namespace", runtime: "alarm", streaming: "off", cpu: "default", event: "deploy", at: "45" },
            options: [
                { id: "finishes", label: "It finishes: alarms survive deploys" },
                { id: "evicted", label: "It can be evicted, and the row stays 'working'" },
                { id: "restarts", label: "Cloudflare restarts it from the beginning" },
            ],
            answer: "evicted",
            explanation: "A scheduled alarm survives a deploy, but one already running can be evicted with its isolate. Nothing writes a terminal row. That is why surviving a deploy needs the alarm plus a reaper.",
            sources: [SW("Phase 2 - classify each path")],
        },
    ],

    fix: {
        intro: "The demo needed work that outlives the tab, runs over 30 seconds and lives in a namespace. Walk the same questions for any long path.",
        tree: {
            start: "tab",
            nodes: [
                { id: "tab", question: "Must the work survive the tab closing?", yes: "long", no: "stay" },
                { id: "long", question: "Can it run longer than 30 seconds?", yes: "deploy", no: "waituntil" },
                { id: "deploy", question: "Must it survive a deploy mid-run?", yes: "alarm-reaper", no: "alarm" },
            ],
            leaves: [
                { id: "stay", title: "Leave it in the request", body: "Nothing is broken. If it streams and runs long, raise `limits.cpu_ms`, on a standalone Worker only." },
                { id: "waituntil", title: "waitUntil", body: "The response returns at once, and the work gets 30 seconds of wall clock. The right tool with a hard ceiling." },
                { id: "alarm", title: "A Durable Object alarm", body: "The only thing with no wall-clock cap, and it works in a namespace. The page polls a status row." },
                { id: "alarm-reaper", title: "An alarm plus a reaper", body: "An alarm mid-flight can still be evicted by a deploy. A reaper finds runs stuck in a working state and fails or restarts them. This is the demo's fix." },
            ],
        },
        patterns: [
            {
                id: "alarm", title: "Run it in a Durable Object alarm", when: "Work that must outlive the tab and run longer than 30 seconds.",
                body: "The button's request starts the job and returns 202 at once. The alarm does the work with no client attached and writes its status to the database. The page polls that row, so closing the tab, refreshing or coming back tomorrow all read the same truth.",
                code: [{ label: "The Durable Object", lang: "ts", code: ALARM_CODE }, { label: "Start and poll", lang: "ts", code: START_CODE }],
                sources: [SW("The four execution models"), WFP("The distinction everything turns on")],
            },
            {
                id: "reaper", title: "Add a reaper", when: "Whenever a run must survive a deploy, or a stuck row must not poll forever.",
                body: "A cancelled process cannot report that it was cancelled. So something else has to notice: a scheduled check that fails runs with no progress for N minutes. In a namespace, schedule it with a self-rescheduling alarm, because crons never fire there.",
                code: [{ label: "The reaper's query", lang: "sql", code: REAPER_SQL }],
                sources: [SW("Phase 2 - classify each path"), SW("3. Runs already stuck stay stuck"), WFP("The distinction everything turns on")],
            },
            {
                id: "waituntil", title: "waitUntil, for short work only", when: "Work under 30 seconds that should not delay the response.",
                body: "Sending an email or writing an analytics row: the response returns at once and the work finishes behind it.",
                doesNotFix: "Anything over 30 seconds, or a deploy.",
                code: [{ label: "TypeScript", lang: "ts", code: WAIT_UNTIL_CODE }],
                sources: [SW("The four execution models")],
            },
            {
                id: "cpu", title: "Raise cpu_ms, on a standalone Worker", when: "A streamed path that runs out of CPU, not out of connection.",
                body: "One line of config and the cheapest real fix, where it is available. It is not available in a dispatch namespace.",
                doesNotFix: "A closed tab. The work is still inside the request.",
                code: [{ label: "wrangler.jsonc", lang: "jsonc", code: CPU_CODE }],
                sources: [SW("Standalone-specific facts worth knowing"), SW("Two traps worth checking explicitly")],
            },
        ],
        twist: {
            title: "The fix that failed without a trace",
            body: [
                "Moving the work into an alarm is where the second incident usually happens. The job starts, sits in its first status with zero events and an empty error column, and the page polls forever.",
                "On OpenNext, the app's secrets are usually the `.env` file baked into the bundle at build time, and only OpenNext's request handler loads them into `process.env`. An alarm never passes through that handler. So the job imports its database module, validation throws \"DATABASE_URL is required\", and nothing reaches the database, because the database is exactly what is missing.",
                "The fix does what the request handler does, before the first import: real bindings first, then the baked `.env` filling the gaps, and the app code behind a dynamic `import()`.",
            ],
            signature: "Job in its first working status, zero events, no error, polling forever.",
            code: [{ label: "Hydrate env in the alarm", lang: "ts", code: ENV_CODE }],
            sources: [SW("Environment variables do not reach a background job"), SW("Failure signatures")],
        },
        afterShip: [
            { title: "Alarms retry", body: "If `alarm()` throws, Cloudflare runs it again. Anything that charges, posts or emails does it twice unless the work is idempotent or the alarm catches and writes a terminal row.", sources: [SW("1. Alarms retry, so the work must be idempotent")] },
            { title: "Two tabs start two runs", body: "`newUniqueId()` makes a fresh object per click. Derive the id from the job with `idFromName`, and the object can refuse a second start.", sources: [SW("2. Two tabs start two runs")] },
            { title: "Stuck runs stay stuck", body: "Shipping the fix does nothing for rows already frozen in a working state. Fail them once, on purpose, and decide whether to retry.", sources: [SW("3. Runs already stuck stay stuck")] },
            { title: "No timeout, no end", body: "The alarm removed the connection deadline that was quietly bounding every call. Give each outbound call a timeout shorter than the CPU ceiling.", sources: [SW("4. An outbound call with no timeout hangs the job")] },
        ],
    },

    postmortem: {
        summary: "A report generation job was killed mid-run during a client demo. The work ran inside the HTTP request, so when the page was refreshed the connection closed and the work stopped. No error was recorded, and the job's row stayed in a working state.",
        sections: [
            { title: "Root cause", items: [
                "The two-minute job ran inside the request, so its lifetime was the browser connection's.",
                "Refreshing the page ended the connection. The invocation was cancelled, so no catch block ran and nothing was written.",
            ] },
            { title: "Why nobody saw it coming", items: [
                "Local dev enforces none of the Worker limits, so it never failed on a laptop.",
                "Switching tabs keeps the connection open, which looked like the job running in the background.",
                "Nothing marked a stalled run as failed, so the page polled a dead row forever.",
            ] },
            { title: "What we changed", items: [
                "The job runs in a Durable Object alarm; the button returns 202 and the page polls a status row.",
                "The alarm loads env before its first import, because it never passes through the request handler.",
                "A reaper fails runs with no progress for ten minutes, scheduled by a self-rescheduling alarm, because crons never fire in the namespace.",
                "Every outbound call has a timeout, and a job id maps to one object with idFromName.",
                "The release check closes the browser mid-run in production and reads the row.",
            ] },
        ],
        sources: [SW("What survives what"), SW("Environment variables do not reach a background job"), SW("What bites after the fix ships"), WFP("The distinction everything turns on"), SW("How to prove a fix worked")],
    },

    checklist: [
        { id: "which-limit", text: "For each long path, I know which limit it can hit: CPU, the waitUntil clock, or the connection.", why: "A fix for one does nothing for the others." },
        { id: "outside-request", text: "Anything that must survive a closed tab runs outside the request.", why: "Work inside a request lives exactly as long as the connection." },
        { id: "waituntil-short", text: "Nothing that can take over 30 seconds is in waitUntil.", why: "Its wall clock is 30 s on every plan." },
        { id: "streaming", text: "Streamed calls have a CPU budget that fits them.", why: "Parsing a stream costs CPU the whole way; in a namespace, 30 s is the ceiling." },
        { id: "no-namespace-cron", text: "No cron triggers in a dispatch namespace; a self-rescheduling alarm instead.", why: "Crons there are silently dropped." },
        { id: "env", text: "The alarm hydrates process.env before its first import.", why: "Otherwise it dies before its first write, with no trace." },
        { id: "timeouts", text: "Every outbound call has a timeout shorter than the CPU ceiling.", why: "Fail with a message rather than be cut off without one." },
        { id: "once", text: "Starting twice cannot run twice.", why: "`idFromName(jobId)` gives one object per job." },
        { id: "reaper", text: "A reaper, or a stall check on the job's own timestamp, clears runs that stopped.", why: "A cancelled process cannot report that it was cancelled." },
        { id: "prod-test", text: "I proved it by closing the browser mid-run, in production, and reading the row.", why: "Neither `next dev` nor Miniflare enforces these limits." },
    ],

    round: [
        {
            id: "no-error", symptom: "A `started` row with no matching `ok` or `failed`, and no error text.",
            options: [{ id: "cancelled", label: "The invocation was cancelled" }, { id: "bug", label: "An exception nobody logged" }, { id: "db", label: "The database write failed" }],
            answer: "cancelled", explanation: "A catch block cannot run without an isolate. Nothing failed; something stopped.",
            sources: [SW("Failure signatures")],
        },
        {
            id: "tab-switch", symptom: "It works when the user switches tabs, and dies when they close the tab.",
            options: [{ id: "request", label: "The work runs inside the request" }, { id: "cpu", label: "The CPU budget" }, { id: "waituntil", label: "The waitUntil wall clock" }],
            answer: "request", explanation: "This is the definitive test: backgrounding keeps the connection, closing ends it.",
            sources: [SW("Failure signatures")],
        },
        {
            id: "long-only", symptom: "It dies at about 30 seconds, but only when the response is long.",
            options: [{ id: "waituntil", label: "The waitUntil wall clock" }, { id: "cpu", label: "CPU spent parsing a stream" }, { id: "connection", label: "The connection" }],
            answer: "cpu", explanation: "A wall clock would not care how long the response is. Streamed parsing costs CPU in proportion to it.",
            sources: [SW("Failure signatures"), WFP("Failure signatures")],
        },
        {
            id: "exact-30", symptom: "The page already got its answer. The work behind it always stops at almost exactly 30 seconds, whatever it is doing.",
            options: [{ id: "waituntil", label: "The waitUntil wall clock" }, { id: "connection", label: "The user closed the tab" }, { id: "deploy", label: "A deploy" }],
            answer: "waituntil", explanation: "Work after the response, cut at 30 s of real time every time: that is `waitUntil`.",
            sources: [SW("Failure signatures")],
        },
        {
            id: "zero-events", symptom: "A job sits in its first working status: zero events, no error, and the page polls forever.",
            options: [{ id: "env", label: "The alarm could not load env" }, { id: "queue", label: "The job is queued behind another" }, { id: "cpu", label: "It ran out of CPU" }],
            answer: "env", explanation: "It died before its first write, because the database URL it needed never reached the alarm.",
            sources: [SW("Failure signatures"), SW("Environment variables do not reach a background job")],
        },
        {
            id: "never-ran", symptom: "A scheduled job in a dispatch namespace has never once run. No errors anywhere.",
            options: [{ id: "expr", label: "A wrong cron expression" }, { id: "dropped", label: "Crons are dropped in a namespace" }, { id: "timezone", label: "It runs in UTC" }],
            answer: "dropped", explanation: "Silently dropped: no error, no warning, no log. A self-rescheduling alarm is the documented workaround.",
            sources: [WFP("Failure signatures")],
        },
        {
            id: "no-banner", symptom: "The stall banner never appears on a stuck job.",
            options: [{ id: "last-event", label: "The stall check measures time since the last event, and there are none" }, { id: "css", label: "The banner is hidden by the layout" }, { id: "fine", label: "The job is not actually stuck" }],
            answer: "last-event", explanation: "Fall back to the job's own timestamp when no events exist.",
            sources: [SW("Failure signatures")],
        },
        {
            id: "dev-fine", symptom: "Everything works in dev and fails in production.",
            options: [{ id: "limits", label: "Dev enforces none of the Worker limits" }, { id: "data", label: "Production has more data" }, { id: "cache", label: "A stale cache in production" }],
            answer: "limits", explanation: "`next dev` has no Worker limits, and Miniflare does not enforce them either. Working in dev is not evidence.",
            sources: [SW("You cannot test any of this locally")],
        },
    ],

    closing: [
        "A cancelled process cannot report that it was cancelled.",
        "A background job does not inherit the request's environment.",
        "`void` is not a background job. It discards a promise.",
    ],
}
