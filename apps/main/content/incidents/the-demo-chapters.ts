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
        ],
        check: [
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
        ],
        check: [
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
        ],
        check: [
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
