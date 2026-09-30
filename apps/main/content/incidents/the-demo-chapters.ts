import type { Chapter, SourceRef } from "./types"

/**
 * Case one as chapters (plan/incidents INC-22, INC-23; Niraj, 2026-09-26: "the content
 * needs to be really great ... so the user understands the technical details and how
 * the process works and flows"). Each chapter teaches one mechanism: narrated, drawn as
 * a flowchart, then checked. Written for readers who know HTTP and are new to
 * serverless; every serverless term is in the glossary. No code.
 *
 * Sources: SW and WFP are Niraj's two Cloudflare docs (see the case file); chapter 9
 * links each platform's own documentation (AWS, Heroku, Vercel), checked 2026-09-26.
 * The minute-by-minute of the call is a dramatisation of Niraj's account.
 */

const SW = (section: string): SourceRef => ({ source: "SW", section })
const WFP = (section: string): SourceRef => ({ source: "WFP", section })
const S2 = (section: string): SourceRef => ({ source: "SRE", section })

export const DEMO_GLOSSARY: Record<string, { term: string; definition: string; pathTopic?: string }> = {
    worker: { term: "Worker", definition: "Your code running on Cloudflare's servers, close to the user. It starts when a request arrives and is meant to answer it.", pathTopic: "Long-running work on Cloudflare Workers" },
    isolate: { term: "Isolate", definition: "The small, sandboxed box a Worker runs in. It is created or reused for a request and can be paused while your code waits.", pathTopic: "Long-running work on Cloudflare Workers" },
    namespace: { term: "Dispatch namespace", definition: "Workers for Platforms: many customers' Workers deployed into one namespace by a platform. It removes some settings a normal Worker has.", pathTopic: "Long-running work on Cloudflare Workers" },
    cpu: { term: "CPU time", definition: "Time your code is actually executing. Waiting for a network reply does not count.", pathTopic: "Long-running work on Cloudflare Workers" },
    wallclock: { term: "Wall clock time", definition: "Real time, as on a clock on the wall. Waiting counts.", pathTopic: "Long-running work on Cloudflare Workers" },
    waituntil: { term: "waitUntil", definition: "A way to keep working after the response is sent. On Workers it gets at most 30 seconds of wall clock time.", pathTopic: "Durable Objects and alarms" },
    durableobject: { term: "Durable Object", definition: "A small, long-lived piece of state on Cloudflare with its own storage. It can set an alarm to run code later.", pathTopic: "Durable Objects and alarms" },
    alarm: { term: "Alarm", definition: "A Durable Object's timer. When it fires, your code runs as a fresh invocation, with no browser attached.", pathTopic: "Durable Objects and alarms" },
    invocation: { term: "Invocation", definition: "One run of your code, started by a request, an alarm or a schedule.", pathTopic: "Failures that leave no trace" },
    cancelled: { term: "Cancelled invocation", definition: "A run that is stopped from outside. Its catch and finally blocks never get to run.", pathTopic: "Failures that leave no trace" },
    cron: { term: "Cron trigger", definition: "Code that runs on a schedule, like every night at 3. Dropped silently in a dispatch namespace.", pathTopic: "Durable Objects and alarms" },
    opennext: { term: "OpenNext", definition: "The adapter that runs a Next.js app on Cloudflare Workers. Its request handler is what loads your .env into process.env.", pathTopic: "Failures that leave no trace" },
    envvar: { term: "Environment variable", definition: "A setting like DATABASE_URL that your code reads at runtime instead of hard-coding it.", pathTopic: "Failures that leave no trace" },
    reaper: { term: "Reaper", definition: "A scheduled check that finds jobs stuck in a working state and marks them failed, or restarts them.", pathTopic: "Operating it: retries, reapers, timeouts" },
    idempotent: { term: "Idempotent", definition: "Safe to run twice: the second run changes nothing. Retries need this.", pathTopic: "Operating it: retries, reapers, timeouts" },
    polling: { term: "Polling", definition: "The page asking the server every few seconds whether the job is done yet.", pathTopic: "Background jobs with a status row" },
}

export const DEMO_CHAPTERS: Chapter[] = [
    // ── 1 ─────────────────────────────────────────────────────────────────────
    {
        id: "incident",
        act: "What happened",
        title: "The incident",
        lead: "A two-minute job, a client on the call, and a refresh at 30 seconds.",
        terms: ["worker", "namespace"],
        blocks: [
            { kind: "say", focus: "row", text: "Hold one question while you listen. A job that worked every time on a laptop died on a live call, and nothing threw an error. So what ended it?" },
            { kind: "say", focus: "chat:0", text: "The feature was simple. Paste a brief, get a full report back. Behind the button were four calls to an AI model, each one waiting for the last. On the developer's laptop the whole thing took just over two minutes." },
            { kind: "say", focus: "chat:1", text: "It shipped the usual way. The button sends a request, the server does the work, the page waits. A teammate saw the risk that afternoon. The developer's reply is the whole mistake: the connection stays open, so it just waits." },
            {
                kind: "see", id: "chat", title: "#eng, Thursday 3:45 pm",
                lines: [
                    { t: "3:45", who: "Teammate", text: "That generate step runs over two minutes, right? On Workers that's going to get cut off." },
                    { t: "3:46", who: "Developer", text: "It's a normal request. The connection stays open, so it just waits." },
                    { t: "3:46", who: "Teammate", text: "I really wouldn't demo that one live." },
                    { t: "3:47", who: "Developer", text: "Worked every time locally. We're fine." },
                ],
            },
            { kind: "say", focus: "timeline:0", text: "Fifteen minutes later, on the call, they clicked Generate. A spinner. At twenty seconds the client asked if it was doing anything." },
            { kind: "say", focus: "timeline:2", text: "At thirty seconds, with nothing on screen, the developer refreshed the page to nudge it along." },
            { kind: "say", focus: "timeline:4", text: "The page came back and read the job. Generating. Three minutes later, still generating. Nothing was running, so nothing would ever finish." },
            {
                kind: "see", id: "timeline", title: "The call, second by second",
                lines: [
                    { t: "0:00", text: "Generate clicked. The request goes out and the page waits." },
                    { t: "0:05", text: "On the server, model call 1 of 4 starts.", tone: "muted" },
                    { t: "0:30", text: "Refresh. The browser drops the old request.", tone: "bad" },
                    { t: "0:31", text: "The page reloads and reads the job: Generating..." },
                    { t: "3:00", text: "Still Generating. Nothing is running, so nothing will finish.", tone: "bad" },
                ],
            },
            { kind: "say", focus: "row:2", text: "Here is the job's row the next morning. Status, generating. Error, empty. Last touched at the moment of the refresh, and never again." },
            {
                kind: "see", id: "row", title: "The job's row, the next morning",
                lines: [
                    { who: "status", text: "generating" },
                    { who: "events", text: "started (no 'ok', no 'failed')" },
                    { who: "error", text: "(empty)", tone: "bad" },
                    { who: "updated", text: "16:00:05, and never again" },
                ],
            },
            { kind: "say", focus: "stopped", text: "The diagnosis came fast. Cloudflare kills requests at 30 seconds. It sounds right. It's wrong, and the rest of this case is how you'd know." },
            { kind: "note", id: "stopped", text: "Nothing failed. Something stopped. Keep that difference in mind: it is the whole case." },
            { kind: "say", focus: "clock:refresh", text: "Here's the whole incident on one clock. T plus zero is the click on the call. The warning came fifteen minutes before it. The refresh came thirty seconds after." },
            { kind: "say", focus: "clock:detect", text: "Look at the spans. Two minutes and ten seconds to notice nothing was running. Three minutes to a workaround. And about eighteen hours to the real cause, after a wrong guess." },
            {
                kind: "timeline", id: "clock", timeline: {
                    start: "Thursday, 4:00 pm: Generate clicked on the client call",
                    caption: "Times from the story. The fix's ship date isn't in the sources, so the clock stops at the real cause.",
                    events: [
                        { id: "warn", at: -900000, kind: "comms", label: "Teammate warns", detail: "\"That generate step runs over two minutes... I really wouldn't demo that one live.\"" },
                        { id: "click", at: 0, kind: "action", label: "Generate clicked" },
                        { id: "call1", at: 5000, kind: "action", label: "Model call 1 starts" },
                        { id: "refresh", at: 30000, kind: "mistake", label: "Refresh to nudge it", detail: "The browser drops the old request, and the work inside it stops mid-call." },
                        { id: "stuck", at: 31000, kind: "signal", label: "Page: Generating" },
                        { id: "noticed", at: 130000, kind: "signal", label: "Still generating", detail: "Nothing is running, so nothing will ever finish." },
                        { id: "workaround", at: 180000, kind: "action", label: "Shows an old report", detail: "The demo carries on with an old result." },
                        { id: "blame", at: 65520000, kind: "mistake", label: "Blames Cloudflare", detail: "Friday, 10:12 am: \"Workers have a 30 second limit.\"" },
                        { id: "found", at: 65700000, kind: "resolution", label: "Real cause found", detail: "\"Workers have three things that are 30 seconds. Which one?\" None of them: it was the refresh." },
                    ],
                    spans: [
                        { id: "detect", label: "Time to notice", from: "click", to: "noticed" },
                        { id: "mitigate", label: "Time to a workaround", from: "click", to: "workaround" },
                        { id: "cause", label: "Time to the real cause", from: "click", to: "found" },
                    ],
                },
            },
            { kind: "say", focus: "board:errors", text: "And here's what a dashboard would have shown. Errors: zero, the whole time. Nothing failed, so an error alert would never fire." },
            { kind: "say", focus: "board:stuck", text: "The only line that moved is this one. A run marked generating with nothing behind it, and it stays there. That's the signal worth alerting on." },
            {
                kind: "dashboard", id: "board", dashboard: {
                    caption: "Errors stayed at zero, so an error alert never fires. The line worth watching is the stuck one.",
                    series: [
                        { id: "requests", name: "Open requests", unit: "requests", points: [[0, 0], [1000, 1], [30000, 1], [30500, 0], [31000, 1], [31600, 0], [180000, 0]] },
                        { id: "calls", name: "Model calls in flight", unit: "calls", points: [[0, 0], [5000, 0], [5100, 1], [30000, 1], [30500, 0], [180000, 0]] },
                        { id: "errors", name: "Errors logged", unit: "errors", points: [[0, 0], [180000, 0]] },
                        { id: "stuck", name: "Runs with nothing behind them", unit: "runs", bad: true, points: [[0, 0], [30000, 0], [30500, 1], [180000, 1]] },
                    ],
                    markers: [
                        { id: "m-refresh", at: 30000, label: "refresh" },
                        { id: "m-noticed", at: 130000, label: "noticed" },
                    ],
                },
            },
        ],
        check: [
            { id: "where-stopped", kind: "pick", figure: "map", prompt: "Tap the part of the system where the work stopped.", parts: [
                { id: "browser", label: "Browser" },
                { id: "worker", label: "Your handler" },
                { id: "db", label: "Database" },
                { id: "model", label: "AI model API" },
            ], answer: ["worker"], explanation: "The handler held the whole job, and it stopped when the refresh closed the connection. The model and the database were fine; they just stopped hearing from it." },
            { id: "row", kind: "single", prompt: "The next morning, what did the job's database row say?", options: [
                { id: "failed", label: "Failed, with a timeout error" },
                { id: "generating", label: "Still generating, with no error at all" },
                { id: "done", label: "Done, but with an empty report" },
            ], answer: "generating", explanation: "The row still said 'generating', with an empty error column. The work stopped without anything being written, which is the signature of a cancelled run." },
            { id: "empty-error", kind: "truefalse", prompt: "An empty error column means the job ran successfully.", answer: false, explanation: "Code can only record an error if it is still running. A run that is stopped from outside never gets the chance, so an empty error column can mean the opposite of success." },
        ],
        sources: [SW("The query that finds dead runs"), SW("The two sentences to remember")],
    },

    // ── 2 ─────────────────────────────────────────────────────────────────────
    {
        id: "request-life",
        act: "What happened",
        title: "How a request lives",
        lead: "Where 'inside the request' actually is, and why waiting is almost free.",
        terms: ["isolate", "invocation", "cpu", "wallclock"],
        blocks: [
            { kind: "say", focus: "life:browser", text: "A question before we follow the click. If your code sits waiting on an API for two minutes, how much of Cloudflare's CPU budget does that use? Keep your guess." },
            { kind: "say", focus: "life:browser", text: "The browser opens a connection and sends the request. Then it waits on that connection." },
            { kind: "say", focus: "life:worker", text: "Cloudflare starts your Worker in an isolate. That's a small sandboxed box, and it runs your handler." },
            { kind: "say", focus: "life:model", text: "Your handler calls the AI model and waits for the answer. Then it does that three more times." },
            { kind: "say", focus: "life:response", text: "When it finally returns, the response goes back down the same connection. Then the connection closes." },
            {
                kind: "flow", id: "life", flow: {
                    width: 760, height: 250,
                    caption: "Everything between the request arriving and the response leaving is 'inside the request'.",
                    nodes: [
                        { id: "browser", label: "Browser", sub: "waits on the connection", x: 10, y: 90, order: 1 },
                        { id: "worker", label: "Your handler", sub: "in a Worker isolate", x: 250, y: 90, tone: "strong", order: 2 },
                        { id: "model", label: "AI model API", sub: "about 30 s per call", x: 520, y: 20, order: 3 },
                        { id: "response", label: "Response", sub: "after about 2 minutes", x: 520, y: 170, order: 4 },
                    ],
                    edges: [
                        { from: "browser", to: "worker", label: "request", flowing: true },
                        { from: "worker", to: "model", label: "await x4", flowing: true },
                        { from: "worker", to: "response", label: "return" },
                        { from: "response", to: "browser", label: "same connection", dashed: true },
                    ],
                },
            },
            { kind: "say", focus: "clocks", text: "Now your guess. While the handler waits, the isolate is parked. It isn't running anything, so it uses almost no CPU at all." },
            { kind: "say", focus: "clocks", text: "Two minutes on the wall clock can be a fraction of a second of CPU. That's why the demo never came near a CPU limit." },
            { kind: "note", id: "clocks", text: "Two clocks run during a request. Wall clock time counts everything, waiting included. CPU time counts only the moments your code is actually executing." },
            { kind: "say", focus: "catch", text: "But here's the catch. The work only exists while the request exists. If the connection goes away, the handler goes with it, halfway through a model call or wherever it happened to be." },
            { kind: "note", id: "catch", text: "Work inside a request lives exactly as long as its connection." },
            { kind: "say", focus: "lifecycle:call1", text: "Here is the whole job, message by message. The click opens one request. The handler marks the job as generating, then starts the first of four model calls." },
            { kind: "say", focus: "lifecycle:cut", text: "At thirty seconds, the refresh. The browser drops the connection, and the handler goes with it. That's the red line across every lane." },
            { kind: "say", focus: "lifecycle:late", text: "The first answer comes back five seconds later, and nobody is there to take it. The reloaded page reads the row: still generating. Switch to Normal to see the two minutes it needed." },
            {
                kind: "sequence", id: "lifecycle", sequence: {
                    caption: "One request carried the whole job, so the job lived exactly as long as the connection.",
                    variants: { normal: "Nobody refreshes: four calls, about two minutes, then the report.", failing: "The refresh at 30 seconds: what actually happened on the call." },
                    actors: [
                        { id: "browser", label: "Browser", sub: "the client's tab" },
                        { id: "worker", label: "Your handler", sub: "a Worker isolate" },
                        { id: "model", label: "AI model API", sub: "about 30 s a call" },
                        { id: "db", label: "Database", sub: "the job's row" },
                    ],
                    messages: [
                        { id: "click", from: "browser", to: "worker", label: "Generate: one request", at: 0 },
                        { id: "mark", from: "worker", to: "db", label: "status = generating", at: 50 },
                        { id: "call1", from: "worker", to: "model", label: "call 1 of 4", at: 5000 },
                        { id: "reload", from: "browser", to: "worker", label: "reload: read the job", at: 31000, only: "failing" },
                        { id: "still", from: "worker", to: "browser", label: "generating", at: 31000, kind: "response", only: "failing" },
                        { id: "late", from: "model", to: "worker", label: "answer 1: nobody listening", at: 35000, kind: "failed", only: "failing" },
                        { id: "answers", from: "model", to: "worker", label: "answers 1 to 4, one by one", at: 120000, kind: "response", only: "normal" },
                        { id: "done", from: "worker", to: "db", label: "status = done, report saved", at: 121000, only: "normal" },
                        { id: "report", from: "worker", to: "browser", label: "the report", at: 121000, kind: "response", only: "normal" },
                    ],
                    cuts: [{ at: 30000, label: "Refresh: the connection closes, the handler stops", only: "failing" }],
                },
            },
        ],
        check: [
            { id: "night-order", kind: "order", prompt: "Put the failing night in order, message by message.", items: [
                { id: "click", label: "Generate: one request opens" },
                { id: "mark", label: "The handler sets the row to generating" },
                { id: "call1", label: "Model call 1 of 4 starts" },
                { id: "refresh", label: "The refresh closes the connection; the handler stops" },
                { id: "reload", label: "The reloaded page reads: generating" },
                { id: "late", label: "Answer 1 arrives, and nobody is listening" },
            ], explanation: "Everything after the refresh happens to a job with nothing running it, which is why the row never moves again." },
            { id: "order", kind: "order", prompt: "Put a request's life in order.", items: [
                { id: "open", label: "The browser opens a connection and sends the request" },
                { id: "start", label: "Cloudflare runs your handler in an isolate" },
                { id: "await", label: "Your handler awaits the AI model" },
                { id: "return", label: "Your handler returns the response" },
                { id: "close", label: "The connection closes" },
            ], explanation: "The response travels back on the same connection that carried the request, so the work lives exactly as long as that connection does." },
            { id: "where", kind: "single", prompt: "Where did the demo's two-minute job run?", options: [
                { id: "request", label: "Inside the request, before the response was returned" },
                { id: "background", label: "In the background, after the response" },
                { id: "queue", label: "In a queue" },
            ], answer: "request", explanation: "It was an ordinary request: the page waited while the handler did all four model calls. That is 'inside the request'." },
            { id: "await-cpu", kind: "truefalse", prompt: "While your code awaits the AI model's reply, it is using up CPU time.", answer: false, explanation: "Waiting on the network parks the isolate. CPU time counts only executing code, so a long wait costs almost nothing." },
        ],
        sources: [SW("CPU time is not elapsed time"), SW("The four execution models")],
    },

    // ── 3 ─────────────────────────────────────────────────────────────────────
    {
        id: "three-limits",
        act: "What happened",
        title: "Three limits, one number",
        lead: "CPU time, the waitUntil clock and the connection. They fail differently.",
        terms: ["cpu", "waituntil", "namespace"],
        blocks: [
            { kind: "say", focus: "limits", text: "Everyone agreed Cloudflare killed the request at 30 seconds. Here's the problem: three different limits on Workers use that same number. Which one was it? Keep your guess." },
            { kind: "say", focus: "limits:CPU time", text: "The first is CPU time. It counts only the moments your code is executing. The default is 30 seconds. On a standalone Worker you can raise it, up to five minutes. In a dispatch namespace, you can't." },
            { kind: "say", focus: "limits:waitUntil", text: "The second is waitUntil, for work after the response is sent. It gets 30 seconds of real time, on every plan, and you can't raise it." },
            { kind: "say", focus: "limits:The connection", text: "The third is the connection itself. Cloudflare puts no limit on it at all. It ends when the browser goes away: a closed tab, or a refresh." },
            { kind: "compare", id: "limits", columns: ["What it counts", "Default", "Can you raise it?"], rows: [
                { label: "CPU time", cells: ["Only time your code is executing", "30 seconds", "Standalone Worker: yes, up to 300,000 ms with limits.cpu_ms. Dispatch namespace: no."] },
                { label: "waitUntil", cells: ["Real time after the response is sent", "30 seconds", "No. Every plan, no exceptions."] },
                { label: "The connection", cells: ["Until the browser goes away", "No limit from Cloudflare", "It is the browser's to end: a closed tab or a refresh."] },
            ] },
            { kind: "say", focus: "stream:one", text: "Waiting doesn't burn CPU. But one common thing does, while looking idle. One JSON reply is parsed once, at the end. That costs almost nothing." },
            { kind: "say", focus: "stream:bad", text: "A streamed reply is parsed chunk by chunk, the whole way through. That's real work. A 30 second stream can spend a 30 second CPU budget on its own." },
            {
                kind: "flow", id: "stream", flow: {
                    width: 760, height: 210,
                    caption: "Same wait, different CPU: one reply parsed at the end, or every chunk parsed as it arrives.",
                    nodes: [
                        { id: "one", label: "One JSON reply", sub: "parsed once: tiny CPU", x: 10, y: 20, order: 1 },
                        { id: "ok", label: "Well under 30 s CPU", x: 290, y: 20, tone: "strong", order: 1 },
                        { id: "stream", label: "Streamed reply", sub: "every chunk parsed", x: 10, y: 130, order: 2 },
                        { id: "bad", label: "Can hit 30 s CPU", x: 290, y: 130, tone: "bad", order: 2 },
                    ],
                    edges: [
                        { from: "one", to: "ok" },
                        { from: "stream", to: "bad", bad: true, flowing: true },
                    ],
                },
            },
            { kind: "say", focus: "limits:The connection", text: "So, your guess. The demo didn't stream, and nothing ran after the response. It was the third one. The developer refreshed, the connection closed, and the work went with it." },
            { kind: "say", focus: "coincidence", text: "The 30 seconds was a coincidence, and it sent everyone looking in the wrong place." },
            { kind: "note", id: "coincidence", text: "So it was not Cloudflare's 30-second limit. It was a refresh at 30 seconds." },
        ],
        talk: {
            opening: "Everyone said Cloudflare killed it at 30 seconds. Which limit do you think it actually was, and what tells you?",
            probe: ["the difference between CPU time and wall clock time", "whether streaming was involved, and why that matters", "what evidence would separate a CPU kill from a closed connection"],
        },
        sources: [SW("The facts you are reasoning from"), SW("CPU time is not elapsed time"), WFP("The three limits, and which you can move")],
    },

    // ── 4 ─────────────────────────────────────────────────────────────────────
    {
        id: "survives",
        act: "What happened",
        title: "What survives what",
        lead: "Four places work can run, and three things that can happen to it.",
        terms: ["alarm", "cron"],
        blocks: [
            { kind: "say", focus: "switch", text: "Here's one to guess. If your work keeps going when you switch to another tab, is it running in the background?" },
            { kind: "say", focus: "table", text: "There are four places work can run on Workers. Inside the request. In waitUntil, after the response. In a Durable Object alarm. Or on a cron schedule." },
            { kind: "say", focus: "sim", text: "Each survives different things. Try the simulator: pick where the work runs and what the user does, and watch which lane survives." },
            { kind: "simulator", id: "sim" },
            { kind: "say", focus: "table:Inside the request", text: "Inside the request, the work lives and dies with the connection. Switching tabs keeps it. Closing or refreshing ends it." },
            { kind: "say", focus: "table:waitUntil", text: "waitUntil survives a closed tab. Then its own 30 second clock ends it." },
            { kind: "say", focus: "table:Durable Object alarm", text: "A Durable Object alarm doesn't care about the browser at all. That's why it's the one that fits a long job." },
            { kind: "say", focus: "table:Cron trigger", text: "Cron runs on a schedule, not per click. And in a dispatch namespace, it never runs at all." },
            { kind: "compare", id: "table", columns: ["Tab switched away", "Tab closed or refreshed", "A deploy"], rows: [
                { label: "Inside the request", cells: ["Survives", "Dies", "Dies"] },
                { label: "waitUntil", cells: ["Survives", "Survives, but only for 30 s", "Dies"] },
                { label: "Durable Object alarm", cells: ["Survives", "Survives", "Survives if it has not started; one running can be evicted"] },
                { label: "Cron trigger", cells: ["No browser involved", "No browser involved", "Survives on a standalone Worker; never runs in a dispatch namespace"] },
            ] },
            { kind: "say", focus: "switch", text: "So, the answer is no. Switching tabs keeps the connection open. It only proves the connection never broke." },
            { kind: "note", id: "switch", text: "\"It kept working when I switched tabs\" only proves the connection never broke. It is not a background job." },
        ],
        check: [
            { id: "buckets", kind: "buckets", prompt: "The work runs inside the request. What happens to it?", buckets: [
                { id: "survives", label: "Survives" },
                { id: "dies", label: "Dies" },
            ], items: [
                { id: "switch", label: "The user switches to another tab", bucket: "survives" },
                { id: "close", label: "The user closes the tab", bucket: "dies" },
                { id: "refresh", label: "The user refreshes the page", bucket: "dies" },
                { id: "deploy", label: "You deploy a new version", bucket: "dies" },
            ], explanation: "Only switching tabs keeps the connection. Closing, refreshing and deploying all end the request, and the work inside it." },
            { id: "waituntil-close", kind: "single", prompt: "The two-minute job runs in waitUntil. The user closes the tab at 20 seconds. What happens?", options: [
                { id: "finishes", label: "It finishes: waitUntil no longer needs the tab" },
                { id: "20", label: "It dies at 20 seconds, with the tab" },
                { id: "30", label: "It survives the close, then dies at 30 seconds" },
            ], answer: "30", explanation: "waitUntil does survive a closed tab. Then its own 30-second wall clock ends it, long before two minutes." },
            { id: "cron", kind: "truefalse", prompt: "In a dispatch namespace, a cron trigger is a safe way to run nightly work.", answer: false, explanation: "Cron triggers are silently dropped in a dispatch namespace: no error, no warning, no log. A Durable Object alarm that reschedules itself is the documented workaround." },
        ],
        sources: [SW("What survives what"), WFP("What the namespace takes away, and what it leaves"), WFP("The distinction everything turns on")],
    },

    // ── 5 ─────────────────────────────────────────────────────────────────────
    {
        id: "nothing-saved",
        act: "What happened",
        title: "Why nothing was saved",
        lead: "A run that is stopped from outside cannot write down that it stopped.",
        terms: ["cancelled"],
        blocks: [
            { kind: "say", focus: "cancel:start", text: "The job's code was careful. A catch block wrote 'failed' on any error. So why was the error column empty? Think about it before you listen on." },
            { kind: "say", focus: "cancel:start", text: "Here's the code's path. First it sets the status to generating." },
            { kind: "say", focus: "cancel:work", text: "Then it awaits the model. Call two of four." },
            { kind: "say", focus: "cancel:done", text: "If it finished, it would set done. It never got there." },
            { kind: "say", focus: "cancel:cut", text: "Instead the connection closed, and the run was cancelled, right in the middle of that await." },
            { kind: "say", focus: "cancel:catch", text: "And the catch block? It only runs if the code is still running. There was nothing left to run it." },
            {
                kind: "flow", id: "cancel", flow: {
                    width: 760, height: 250,
                    caption: "The catch block only runs if the code is still running. A cancelled run never reaches it.",
                    nodes: [
                        { id: "start", label: "status = generating", x: 10, y: 20, order: 1 },
                        { id: "work", label: "await the model", sub: "call 2 of 4", x: 270, y: 20, tone: "strong", order: 2 },
                        { id: "done", label: "status = done", x: 540, y: 20, tone: "muted", order: 3 },
                        { id: "cut", label: "Connection closed", sub: "the run is cancelled", x: 270, y: 150, tone: "bad", order: 4 },
                        { id: "catch", label: "catch: status = failed", sub: "never runs", x: 540, y: 150, tone: "muted", order: 5 },
                    ],
                    edges: [
                        { from: "start", to: "work", flowing: true },
                        { from: "work", to: "done", dashed: true, label: "never reached" },
                        { from: "work", to: "cut", bad: true },
                        { from: "cut", to: "catch", dashed: true, bad: true, label: "no isolate left" },
                    ],
                },
            },
            { kind: "say", focus: "cannot", text: "Error handling protects you from errors your code throws. It can't protect you from your code being switched off." },
            { kind: "say", focus: "cannot", text: "So something else has to notice. A status row anyone can check, and a rule like this: working for ten minutes with no progress means it died." },
            { kind: "note", id: "cannot", text: "A cancelled process cannot report that it was cancelled. Any design that waits for 'failed' to be written will wait forever on exactly the failure that matters most." },
            { kind: "say", focus: "row-states:generating", text: "Now follow the row, not the code. It's created, then set to generating. From there it has two ways out: done, or failed." },
            { kind: "say", focus: "row-states:stopped", text: "The refresh took a third way that no code wrote. The run stopped, and the row kept its last value. Generating, forever." },
            {
                kind: "states", id: "row-states", states: {
                    caption: "The row's states. Only two of the ways out write anything.",
                    states: [
                        { id: "created", label: "Job created" },
                        { id: "generating", label: "generating" },
                        { id: "done", label: "done", sub: "the report saved" },
                        { id: "failed", label: "failed", sub: "the catch block's error" },
                        { id: "stopped", label: "Run cancelled", sub: "writes nothing" },
                    ],
                    transitions: [
                        { from: "created", to: "generating", label: "start" },
                        { from: "generating", to: "done", label: "4 answers" },
                        { from: "generating", to: "failed", label: "an error" },
                        { from: "generating", to: "stopped", label: "refresh", bad: true },
                    ],
                    stuck: "generating",
                },
            },
            { kind: "say", focus: "why:symptom", text: "So why did it happen? Start from what people saw: a report that never arrived." },
            { kind: "say", focus: "why:trigger", text: "The trigger was the refresh at thirty seconds." },
            { kind: "say", focus: "why:inrequest", text: "But a refresh only matters because the whole job ran inside the request, and a cancelled run can't write down that it stopped." },
            { kind: "say", focus: "why:localdev", text: "And underneath, weaknesses that were there all along. Local dev enforces none of the Worker limits, so it never failed on a laptop." },
            {
                kind: "causes", id: "why", causes: {
                    caption: "Read it right to left: every one of these had to be true.",
                    symptom: { id: "symptom", label: "The report never arrived", detail: "The row still says generating, with an empty error column." },
                    trigger: { id: "trigger", label: "A refresh at 30 s", detail: "Refreshing closed the connection, which cancelled the run mid-call." },
                    contributing: [
                        { id: "inrequest", label: "The job ran inside the request", detail: "Its lifetime was the browser connection's." },
                        { id: "nocatch", label: "A cancelled run can't write", detail: "No catch block runs, so nothing records that it stopped." },
                        { id: "noreaper", label: "Nothing fails stalled runs", detail: "The page polls a dead row forever." },
                    ],
                    latent: [
                        { id: "localdev", label: "Local dev enforces no limits", detail: "It never failed on a laptop." },
                        { id: "tabs", label: "Tab switching looked like background work", detail: "It only proved the connection never broke." },
                    ],
                },
            },
        ],
        check: [
            { id: "left-wrong", kind: "pick", figure: "map", prompt: "Mark every part that was left with something wrong or missing.", parts: [
                { id: "browser", label: "Browser" },
                { id: "worker", label: "Your handler" },
                { id: "db", label: "Database" },
                { id: "model", label: "AI model API" },
            ], answer: ["db", "browser"], explanation: "The database row still said generating, and the browser never got its report. The handler was simply gone, and the model had nothing wrong with it." },
            { id: "why-empty", kind: "single", prompt: "Why was the error column empty?", options: [
                { id: "no-error", label: "Because no error happened" },
                { id: "cancelled", label: "Because the run was stopped before any code could record anything" },
                { id: "logging", label: "Because the error logging was misconfigured" },
            ], answer: "cancelled", explanation: "The run was cancelled from outside. Catch and finally blocks never ran, so nothing could be written." },
            { id: "try-catch", kind: "truefalse", prompt: "Wrapping the job in try/catch would have made the database say 'failed'.", answer: false, explanation: "try/catch handles thrown errors. A cancelled run throws nothing: it simply stops." },
        ],
        sources: [SW("5. Find the error handling around the long path"), SW("The two sentences to remember"), SW("Failure signatures")],
    },

    // ── 6 ─────────────────────────────────────────────────────────────────────
    {
        id: "fix",
        act: "How it was fixed",
        title: "The fix",
        lead: "Move the work off the request, into something no browser can reach.",
        terms: ["durableobject", "alarm", "polling", "reaper"],
        blocks: [
            { kind: "say", focus: "decide:q1", text: "One question decides where any long job belongs. Before you listen on, what would you ask first?" },
            { kind: "say", focus: "decide:stay", text: "Here it is. Must it survive a closed tab? If not, keep it in the request, and raise the CPU limit if it streams." },
            { kind: "say", focus: "decide:wu", text: "If it must, is it longer than 30 seconds? If not, waitUntil is enough." },
            { kind: "say", focus: "decide:do", text: "Longer than that, and it needs a Durable Object alarm, with a reaper for deploys. The demo was this one." },
            {
                kind: "flow", id: "decide", flow: {
                    width: 760, height: 300,
                    caption: "The decision, for any long piece of work.",
                    nodes: [
                        { id: "q1", label: "Must it survive a closed tab?", x: 10, y: 20, w: 220, decision: true, order: 1 },
                        { id: "stay", label: "Keep it in the request", sub: "raise cpu_ms if it streams", x: 10, y: 170, w: 220, tone: "muted", order: 2 },
                        { id: "q2", label: "Longer than 30 seconds?", x: 280, y: 20, w: 200, decision: true, order: 3 },
                        { id: "wu", label: "waitUntil", sub: "30 s of wall clock", x: 280, y: 170, w: 200, tone: "muted", order: 3 },
                        { id: "q3", label: "Must it survive a deploy?", x: 530, y: 20, w: 220, decision: true, order: 4 },
                        { id: "do", label: "Durable Object alarm", sub: "+ a reaper for deploys", x: 530, y: 170, w: 220, tone: "strong", order: 4 },
                    ],
                    edges: [
                        { from: "q1", to: "stay", label: "no" },
                        { from: "q1", to: "q2", label: "yes" },
                        { from: "q2", to: "wu", label: "no" },
                        { from: "q2", to: "q3", label: "yes" },
                        { from: "q3", to: "do", label: "yes or no" },
                    ],
                },
            },
            { kind: "say", focus: "shape:start", text: "Here's the shape of the fix. The click sends a start request." },
            { kind: "say", focus: "shape:do", text: "That request hands the job to a Durable Object. It sets an alarm and replies at once." },
            { kind: "say", focus: "shape:alarm", text: "The alarm fires a fresh run, with no browser attached, and does the four model calls." },
            { kind: "say", focus: "shape:row", text: "As it goes, it writes its status to a row. Working, then done." },
            { kind: "say", focus: "shape:page", text: "And the page never waits on the work. It reads that row every few seconds." },
            {
                kind: "flow", id: "shape", flow: {
                    width: 760, height: 270,
                    caption: "The request starts the work and returns. The alarm does the work. The page reads the row.",
                    nodes: [
                        { id: "page", label: "Page", sub: "polls every few seconds", x: 10, y: 100, order: 1 },
                        { id: "start", label: "Start request", sub: "returns 202 at once", x: 250, y: 20, order: 1 },
                        { id: "do", label: "Durable Object", sub: "sets an alarm", x: 520, y: 20, tone: "strong", order: 2 },
                        { id: "alarm", label: "alarm() runs the job", sub: "no browser attached", x: 520, y: 180, tone: "strong", order: 3 },
                        { id: "row", label: "Status row", sub: "working, then done", x: 250, y: 180, order: 4 },
                    ],
                    edges: [
                        { from: "page", to: "start", label: "click" },
                        { from: "start", to: "do" },
                        { from: "do", to: "alarm", flowing: true },
                        { from: "alarm", to: "row", label: "writes", flowing: true },
                        { from: "page", to: "row", label: "reads", dashed: true, flowing: true },
                    ],
                },
            },
            { kind: "say", focus: "shape:alarm", text: "Now closing the tab changes nothing. Refreshing just starts reading again. And if a deploy ends a run, the reaper marks it failed, so nothing waits forever." },
            { kind: "say", focus: "once", text: "One more thing. Let the job's id pick the Durable Object. Then a second click lands on the same one, and it can refuse to start twice." },
            { kind: "note", id: "once", text: "Make the job's id decide which Durable Object runs it (idFromName). A second click, or a second tab, lands on the same object." },
            { kind: "say", focus: "change:job", text: "Here's the fix drawn on the system itself. The handler only starts the job now, and replies at once. A Durable Object, picked by the job's id, does the four calls from its alarm." },
            { kind: "say", focus: "change:reaper", text: "And a reaper, on its own self-rescheduling alarm, fails any run with no progress for ten minutes. No row waits forever." },
            { kind: "map-change", id: "change", caption: "The fix as a change to the system." },
            { kind: "say", focus: "after:refresh", text: "Now replay the demo on the fixed system. The same refresh at thirty seconds just reads the row again, and the job carries on." },
            {
                kind: "sequence", id: "after", sequence: {
                    caption: "The work lives in the alarm, so the browser can come and go.",
                    tabs: { normal: "Nobody refreshes", failing: "Refresh at 30 s" },
                    variants: { normal: "The job runs in the alarm; the page reads the row until it says done.", failing: "The same refresh as the demo. The job carries on." },
                    actors: [
                        { id: "browser", label: "Browser", sub: "the client's tab" },
                        { id: "worker", label: "Start request", sub: "returns 202" },
                        { id: "job", label: "Job runner", sub: "Durable Object alarm" },
                        { id: "model", label: "AI model API", sub: "about 30 s a call" },
                        { id: "db", label: "Database", sub: "the status row" },
                    ],
                    messages: [
                        { id: "click", from: "browser", to: "worker", label: "Generate", at: 0 },
                        { id: "start", from: "worker", to: "job", label: "start job-123", at: 20 },
                        { id: "accepted", from: "worker", to: "browser", label: "202 Accepted", at: 40, kind: "response" },
                        { id: "mark", from: "job", to: "db", label: "status = working", at: 60 },
                        { id: "call1", from: "job", to: "model", label: "call 1 of 4", at: 5000 },
                        { id: "refresh", from: "browser", to: "worker", label: "reload: read the job", at: 31000, only: "failing" },
                        { id: "working", from: "worker", to: "browser", label: "working", at: 31000, kind: "response", only: "failing" },
                        { id: "answers", from: "model", to: "job", label: "answers 1 to 4", at: 120000, kind: "response" },
                        { id: "done", from: "job", to: "db", label: "status = done, report saved", at: 121000 },
                        { id: "poll", from: "browser", to: "worker", label: "poll: read the job", at: 124000, kind: "async" },
                        { id: "report", from: "worker", to: "browser", label: "done: the report", at: 124000, kind: "response" },
                    ],
                },
            },
        ],
        check: [
            { id: "fix-order", kind: "order", prompt: "Put the fixed flow in order.", items: [
                { id: "click", label: "The button sends a start request" },
                { id: "store", label: "The Durable Object stores the job and sets an alarm" },
                { id: "reply", label: "The start request returns at once" },
                { id: "run", label: "The alarm runs the four model calls" },
                { id: "write", label: "The alarm writes 'done' to the status row" },
            ], explanation: "The request only starts the work and returns. Everything slow happens in the alarm, which no browser can end." },
            { id: "why-safe", kind: "single", prompt: "Why does closing the tab no longer matter?", options: [
                { id: "no-client", label: "The work runs in an alarm, which has no browser attached" },
                { id: "longer", label: "The alarm has a longer CPU limit" },
                { id: "retry", label: "Cloudflare retries the request when the tab closes" },
            ], answer: "no-client", explanation: "An alarm is a fresh run with no connection to end. The page only reads a row." },
        ],
        sources: [SW("Phase 2 - classify each path"), SW("The four execution models"), SW("2. Two tabs start two runs"), WFP("The distinction everything turns on")],
    },

    // ── 7 ─────────────────────────────────────────────────────────────────────
    {
        id: "env",
        act: "How it was fixed",
        title: "The fix that failed without a trace",
        lead: "The alarm could not see the database URL, so it died before its first write.",
        terms: ["opennext", "envvar"],
        blocks: [
            { kind: "say", focus: "sees", text: "The fix shipped. The next job sat at generating, with zero events and no error. Same symptoms as the first incident. Is it the same cause? Guess before you listen on." },
            { kind: "say", focus: "env:req", text: "It isn't. Here's the difference. A normal request comes in." },
            { kind: "say", focus: "env:handler", text: "It passes through OpenNext's request handler, and that handler copies your .env values into process.env." },
            { kind: "say", focus: "env:ok", text: "So your code finds its database URL." },
            { kind: "say", focus: "env:alarm", text: "An alarm doesn't come in through that handler." },
            { kind: "say", focus: "env:bad", text: "So when the alarm loads your database code, the URL is missing. It throws on import, before it can write anything. The database is exactly what it couldn't reach." },
            {
                kind: "flow", id: "env", flow: {
                    width: 760, height: 260,
                    caption: "Only the request path loads your .env. The alarm path skips it.",
                    nodes: [
                        { id: "req", label: "A request", x: 10, y: 20, order: 1 },
                        { id: "handler", label: "OpenNext request handler", sub: "loads .env into process.env", x: 250, y: 20, w: 230, tone: "strong", order: 2 },
                        { id: "ok", label: "Your code", sub: "DATABASE_URL is there", x: 540, y: 20, order: 3 },
                        { id: "alarm", label: "An alarm", x: 10, y: 170, order: 4 },
                        { id: "bad", label: "Your code", sub: "DATABASE_URL is missing", x: 540, y: 170, tone: "bad", order: 5 },
                    ],
                    edges: [
                        { from: "req", to: "handler", flowing: true },
                        { from: "handler", to: "ok" },
                        { from: "alarm", to: "bad", bad: true, label: "skips the handler" },
                    ],
                },
            },
            { kind: "say", focus: "sees:1", text: "That's why the row looks exactly like the first incident. Generating, no events, no error." },
            {
                kind: "see", id: "sees", title: "What you see",
                lines: [
                    { who: "status", text: "generating" },
                    { who: "events", text: "none at all", tone: "bad" },
                    { who: "error", text: "(empty)", tone: "bad" },
                ],
            },
            { kind: "say", focus: "fixenv", text: "The fix is to do what the handler does, first. At the very start of the alarm, copy the bindings and the .env values into process.env. Then load your app, behind a dynamic import." },
            { kind: "note", id: "fixenv", text: "An alarm must set up its own environment before it loads the app: copy the bindings and the baked .env values into process.env, then dynamically import the code." },
        ],
        talk: {
            opening: "The fixed job now sits at 'generating' with zero events and no error. What do you check first, and why?",
            probe: ["how this differs from the original incident", "why no error could be written", "what the alarm needs before it loads the app"],
        },
        sources: [SW("Environment variables do not reach a background job"), SW("Failure signatures")],
    },

    // ── 8 ─────────────────────────────────────────────────────────────────────
    {
        id: "running",
        act: "How it was fixed",
        title: "Running it for real",
        lead: "Four things that bite after the fix ships, and how to prove it works.",
        terms: ["idempotent"],
        blocks: [
            { kind: "say", focus: "bites", text: "The alarm works in testing. What could still go wrong once real users arrive? Guess one before you listen on." },
            { kind: "say", focus: "bites:Alarms retry", text: "First, alarms retry. If the alarm throws, Cloudflare runs it again. Anything that charges a card or sends an email does it twice. So make the work idempotent." },
            { kind: "say", focus: "bites:Two tabs, two runs", text: "Second, two tabs can start two runs. Let the job's id pick the Durable Object, and refuse a second start." },
            { kind: "say", focus: "bites:Stuck rows stay stuck", text: "Third, shipping the fix doesn't rescue jobs already stuck. Fail them once, on purpose." },
            { kind: "say", focus: "bites:No timeout, no end", text: "Fourth, with no connection to end it, a call that never answers hangs forever. Give every outbound call a timeout." },
            { kind: "compare", id: "bites", columns: ["What happens", "What to do"], rows: [
                { label: "Alarms retry", cells: ["If the alarm throws, Cloudflare runs it again. Anything that charges or emails does it twice.", "Make the work idempotent, or catch inside the alarm and write a final status."] },
                { label: "Two tabs, two runs", cells: ["A fresh object per click means two clicks run the job twice.", "Derive the object from the job id (idFromName) and refuse a second start."] },
                { label: "Stuck rows stay stuck", cells: ["Shipping the fix does nothing for jobs already frozen at 'generating'.", "Fail them once, on purpose, and decide whether to retry."] },
                { label: "No timeout, no end", cells: ["Without the connection, a call that never answers hangs forever.", "Give every outbound call a timeout shorter than the CPU budget."] },
            ] },
            { kind: "say", focus: "prove", text: "Then prove it the physical way, in production. Start the longest run. Wait for its first progress. Close the browser. Wait the run's length plus a minute. Then read the row." },
            { kind: "note", id: "prove", text: "Neither the local dev server nor the local preview enforces these limits. Only production proves the fix." },
        ],
        check: [
            { id: "dev", kind: "truefalse", prompt: "If it works in next dev, the Worker's limits are fine.", answer: false, explanation: "next dev enforces none of the Worker limits, and the local preview does not either. Only production does." },
            { id: "retry", kind: "single", prompt: "An alarm charges a card, then throws. What happens next?", options: [
                { id: "twice", label: "Cloudflare runs the alarm again, and the card is charged twice" },
                { id: "once", label: "Nothing: an alarm runs exactly once" },
                { id: "refund", label: "Cloudflare refunds the charge" },
            ], answer: "twice", explanation: "A thrown alarm is retried. Work with side effects must be idempotent, or the alarm must catch and write a final status so nothing retries blindly." },
        ],
        sources: [SW("1. Alarms retry, so the work must be idempotent"), SW("2. Two tabs start two runs"), SW("3. Runs already stuck stay stuck"), SW("4. An outbound call with no timeout hangs the job"), SW("How to prove a fix worked"), SW("You cannot test any of this locally")],
    },


    // ── How to run this one (INC-72) ──────────────────────────────────────────
    {
        id: "people",
        act: "Beyond this case",
        title: "How to run this one",
        lead: "The same incident, run by a team: who decides, who fixes, who talks.",
        blocks: [
            { kind: "say", focus: "roles", text: "This was a demo, not a pager going off. But it became an incident, and incidents go better with a few clear roles. This is how a team should run it, not how it was run." },
            { kind: "say", focus: "roles:severity", text: "First, how bad is it? One customer-facing feature is broken for everyone who uses it, and nothing is lost but the stuck jobs. High, not an outage." },
            { kind: "say", focus: "roles:Incident lead", text: "One person leads. They decide, hand out the work, and keep a live note of what's known. They don't debug." },
            { kind: "say", focus: "roles:Comms", text: "One person talks to the client, in plain words, on a schedule. Everyone else stays quiet and fixes." },
            {
                kind: "roles", id: "roles", roles: {
                    severity: { level: "High (SEV-2)", why: "A customer-facing feature fails for everyone who uses it. Nothing else is down, and no data is lost beyond the stuck jobs." },
                    roles: [
                        { role: "Incident lead", does: "Owns the incident: decides, assigns the work, and keeps a live note of what is known. Doesn't debug." },
                        { role: "Operations", does: "The only one changing the system: finds runs stuck in generating and marks them failed, so no page waits forever." },
                        { role: "Comms", does: "Tells the client what happened and when they'll hear next, in plain words, on a schedule." },
                        { role: "Planning", does: "Files the follow-ups: the Durable Object refactor, the reaper, the release check." },
                    ],
                    sources: [S2("Managing Incidents")],
                },
            },
            { kind: "say", focus: "updates:Investigating", text: "Here's what the client could have read. First, an honest holding line: something's wrong, we're on it, next update at a set time." },
            { kind: "say", focus: "updates:Identified", text: "Then, once the cause is known, what it is and what to do meanwhile. Don't refresh while a report runs." },
            {
                kind: "status", id: "updates", status: {
                    caption: "How a team would post them: an example, not the incident's record.",
                    updates: [
                        { at: 180000, state: "Investigating", text: "Report generation isn't finishing for some jobs. We're looking into it. Next update in 30 minutes." },
                        { at: 65700000, state: "Identified", text: "A report stops if its page is refreshed or closed while it runs. Please keep the page open until it finishes. We're moving generation off the page." },
                        { at: 65700000 + 86400000, state: "Monitoring", text: "Reports now run in the background and survive a refresh. We're watching new runs." },
                        { at: 65700000 + 172800000, state: "Resolved", text: "Reports finish whether or not the page stays open. Stuck jobs from before have been marked failed; run them again." },
                    ],
                },
            },
            { kind: "say", focus: "book", text: "And the first thing operations reaches for: a short runbook, so nobody has to think under pressure." },
            { kind: "runbook", id: "book", title: "Stuck report jobs", steps: [
                "Find runs still generating with no progress for ten minutes.",
                "Mark them failed, with the reason, so their pages stop waiting.",
                "Tell each owner, and offer to run it again.",
                "Check whether a deploy or a refresh lines up with when they stopped.",
            ] },
        ],
        check: [
            { id: "who-talks", kind: "single", prompt: "During the incident, who tells the client what's going on?", options: [
                { id: "lead", label: "The incident lead, between decisions" },
                { id: "comms", label: "One person whose job is comms" },
                { id: "whoever", label: "Whoever is closest to the fix" },
            ], answer: "comms", explanation: "One voice, on a schedule. The lead stays free to decide, and the people fixing stay focused on the fix." },
        ],
        sources: [S2("Managing Incidents")],
    },

    // ── 9 ─────────────────────────────────────────────────────────────────────
    {
        id: "elsewhere",
        act: "Beyond this case",
        title: "The same bug elsewhere",
        lead: "This is not a Cloudflare bug. It is what happens when slow work lives inside a request.",
        blocks: [
            { kind: "say", focus: "platforms", text: "Is this a Cloudflare bug? Think about the last platform you shipped on before you listen." },
            { kind: "say", focus: "platforms", text: "Every platform puts a limit between a user and a slow request. The numbers differ. What happens to your work differs more." },
            { kind: "say", focus: "platforms:Cloudflare Workers", text: "On Workers, work inside the request stops with the connection." },
            { kind: "say", focus: "platforms:AWS API Gateway (REST)", text: "AWS API Gateway stops waiting at 29 seconds by default. Your backend may keep going." },
            { kind: "say", focus: "platforms:Heroku", text: "Heroku's router gives up at 30 seconds, but your app keeps working. So the user sees an error, retries, and the work runs twice." },
            { kind: "say", focus: "platforms:Vercel Functions", text: "Vercel stops a function at its plan's maximum duration." },
            { kind: "compare", id: "platforms", columns: ["The limit", "Can you raise it?", "Does the work stop?"], rows: [
                { label: "Cloudflare Workers", cells: ["The connection, 30 s of CPU, 30 s for waitUntil", "CPU on a standalone Worker; not in a dispatch namespace", "Yes: work inside the request stops with the connection"] },
                { label: "AWS API Gateway (REST)", cells: ["Integration timeout, 29 s by default", "Beyond 29 s only for Regional or private APIs, and it can cost throttle quota", "Check your backend: the gateway stops waiting at its timeout"] },
                { label: "Heroku", cells: ["The router ends a request that takes over 30 s (error H12)", "No; streaming responses get a rolling 55 s window", "No: your app keeps working on a request the user has already lost"] },
                { label: "Vercel Functions", cells: ["A maximum duration per plan (maxDuration)", "Up to your plan's maximum", "Yes, at the maximum duration"] },
            ] },
            { kind: "say", focus: "common", text: "Opposite behaviours, same lesson. The timeout at the front door and your work stopping are two different facts, and your database only knows about one of them." },
            { kind: "note", id: "common", text: "The fix every platform recommends is the same shape: start the work, hand it to a background worker, and let the page check a status. Only the names change." },
        ],
        check: [
            { id: "heroku", kind: "truefalse", prompt: "On Heroku, when the router times out a request at 30 seconds, your app stops working on it.", answer: false, explanation: "Heroku says your application will not know the request timed out and will continue to work on it. The user got an error; the work goes on." },
            { id: "common", kind: "single", prompt: "What is the common fix across Workers, AWS, Heroku and Vercel?", options: [
                { id: "bg", label: "Start the work, run it in the background, and have the page check a status" },
                { id: "raise", label: "Raise every timeout to the maximum" },
                { id: "stream", label: "Stream the response so the connection stays busy" },
            ], answer: "bg", explanation: "Raising limits only moves the wall, and streaming can cost CPU. Moving slow work off the request and polling a status works everywhere." },
        ],
        sources: [SW("The facts you are reasoning from")],
        links: [
            { label: "AWS: API Gateway quotas (integration timeout)", href: "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html" },
            { label: "Heroku: Request Timeout", href: "https://devcenter.heroku.com/articles/request-timeout" },
            { label: "Vercel: Configuring function duration", href: "https://vercel.com/docs/functions/configuring-functions/duration" },
        ],
    },
]

/** What this case teaches, for the sidebar and the learning path (INC-26, INC-32). */
export const DEMO_LEARN: { title: string; summary: string }[] = [
    { title: "Long-running work on Cloudflare Workers", summary: "Where work lives during a request, and the three limits that end it." },
    { title: "Durable Objects and alarms", summary: "Running work with no browser attached, and surviving closed tabs." },
    { title: "Background jobs with a status row", summary: "Start, run elsewhere, poll: the shape every platform recommends." },
    { title: "Failures that leave no trace", summary: "Cancelled runs, missing env in background jobs, and how to see them." },
    { title: "Operating it: retries, reapers, timeouts", summary: "Idempotency, one run per job, and proving it in production." },
]
