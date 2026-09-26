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

export const DEMO_GLOSSARY: Record<string, { term: string; definition: string }> = {
    worker: { term: "Worker", definition: "Your code running on Cloudflare's servers, close to the user. It starts when a request arrives and is meant to answer it." },
    isolate: { term: "Isolate", definition: "The small, sandboxed box a Worker runs in. It is created or reused for a request and can be paused while your code waits." },
    namespace: { term: "Dispatch namespace", definition: "Workers for Platforms: many customers' Workers deployed into one namespace by a platform. It removes some settings a normal Worker has." },
    cpu: { term: "CPU time", definition: "Time your code is actually executing. Waiting for a network reply does not count." },
    wallclock: { term: "Wall clock time", definition: "Real time, as on a clock on the wall. Waiting counts." },
    waituntil: { term: "waitUntil", definition: "A way to keep working after the response is sent. On Workers it gets at most 30 seconds of wall clock time." },
    durableobject: { term: "Durable Object", definition: "A small, long-lived piece of state on Cloudflare with its own storage. It can set an alarm to run code later." },
    alarm: { term: "Alarm", definition: "A Durable Object's timer. When it fires, your code runs as a fresh invocation, with no browser attached." },
    invocation: { term: "Invocation", definition: "One run of your code, started by a request, an alarm or a schedule." },
    cancelled: { term: "Cancelled invocation", definition: "A run that is stopped from outside. Its catch and finally blocks never get to run." },
    cron: { term: "Cron trigger", definition: "Code that runs on a schedule, like every night at 3. Dropped silently in a dispatch namespace." },
    opennext: { term: "OpenNext", definition: "The adapter that runs a Next.js app on Cloudflare Workers. Its request handler is what loads your .env into process.env." },
    envvar: { term: "Environment variable", definition: "A setting like DATABASE_URL that your code reads at runtime instead of hard-coding it." },
    reaper: { term: "Reaper", definition: "A scheduled check that finds jobs stuck in a working state and marks them failed, or restarts them." },
    idempotent: { term: "Idempotent", definition: "Safe to run twice: the second run changes nothing. Retries need this." },
    polling: { term: "Polling", definition: "The page asking the server every few seconds whether the job is done yet." },
}

export const DEMO_CHAPTERS: Chapter[] = [
    // ── 1 ─────────────────────────────────────────────────────────────────────
    {
        id: "incident",
        title: "The incident",
        lead: "A two-minute job, a client on the call, and a refresh at 30 seconds.",
        terms: ["worker", "namespace"],
        blocks: [
            { kind: "say", text: "Here's what happened. The feature was simple to describe: paste a brief, get a full report back. Under the hood it made four calls to an AI model, one after another, each waiting for the last. On the developer's laptop it took a little over two minutes, and it never failed." },
            { kind: "say", text: "It shipped the way most features ship. The button sends a request, the server does the work, the page waits for the answer. The app ran on Cloudflare Workers, deployed into a Workers for Platforms dispatch namespace. Nobody asked where those two minutes would actually live." },
            {
                kind: "see", title: "#eng, Thursday 3:45 pm",
                lines: [
                    { t: "3:45", who: "Teammate", text: "That generate step runs over two minutes, right? On Workers that's going to get cut off." },
                    { t: "3:46", who: "Developer", text: "It's a normal request. The connection stays open, so it just waits." },
                    { t: "3:46", who: "Teammate", text: "I really wouldn't demo that one live." },
                    { t: "3:47", who: "Developer", text: "Worked every time locally. We're fine." },
                ],
            },
            { kind: "say", text: "Fifteen minutes later, on the call, the developer clicked Generate. The page showed a spinner. Twenty seconds in, the client asked if it was doing anything. At thirty seconds, with nothing on screen, the developer refreshed the page to nudge it." },
            {
                kind: "see", title: "The call, second by second",
                lines: [
                    { t: "0:00", text: "Generate clicked. The request goes out and the page waits." },
                    { t: "0:05", text: "On the server, model call 1 of 4 starts.", tone: "muted" },
                    { t: "0:30", text: "Refresh. The browser drops the old request.", tone: "bad" },
                    { t: "0:31", text: "The page reloads and reads the job: Generating..." },
                    { t: "3:00", text: "Still Generating. Nothing is running, so nothing will finish.", tone: "bad" },
                ],
            },
            {
                kind: "see", title: "The job's row, the next morning",
                lines: [
                    { who: "status", text: "generating" },
                    { who: "events", text: "started (no 'ok', no 'failed')" },
                    { who: "error", text: "(empty)", tone: "bad" },
                    { who: "updated", text: "16:00:05, and never again" },
                ],
            },
            { kind: "note", text: "Nothing failed. Something stopped. Keep that difference in mind: it is the whole case." },
            { kind: "say", text: "The next morning the diagnosis was quick: Cloudflare kills requests at 30 seconds. It sounds right. It is wrong, and the rest of this case is how you would know." },
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
        title: "How a request lives",
        lead: "Where 'inside the request' actually is, and why waiting is almost free.",
        terms: ["isolate", "invocation", "cpu", "wallclock"],
        blocks: [
            { kind: "say", text: "Let's follow the button click. The browser opens a connection and sends the request. Cloudflare starts your Worker in an isolate, a small sandboxed box, and runs your handler. Your handler calls the AI model and waits for the answer, four times. When it finally returns, the response goes back down the same connection and the connection closes." },
            {
                kind: "flow", flow: {
                    width: 760, height: 250,
                    caption: "Everything between the request arriving and the response leaving is 'inside the request'.",
                    nodes: [
                        { id: "browser", label: "Browser", sub: "waits on the connection", x: 10, y: 90 },
                        { id: "worker", label: "Your handler", sub: "in a Worker isolate", x: 250, y: 90, tone: "strong" },
                        { id: "model", label: "AI model API", sub: "about 30 s per call", x: 520, y: 20 },
                        { id: "response", label: "Response", sub: "after about 2 minutes", x: 520, y: 170 },
                    ],
                    edges: [
                        { from: "browser", to: "worker", label: "request", flowing: true },
                        { from: "worker", to: "model", label: "await x4", flowing: true },
                        { from: "worker", to: "response", label: "return" },
                        { from: "response", to: "browser", label: "same connection", dashed: true },
                    ],
                },
            },
            { kind: "say", text: "Now the important part. While your handler awaits the model, the isolate is parked. It isn't executing anything, so it uses almost no CPU time. Two minutes on the wall clock can be a fraction of a second of CPU. That is why the demo never came close to a CPU limit." },
            { kind: "note", text: "Two clocks run during a request. Wall clock time counts everything, waiting included. CPU time counts only the moments your code is actually executing." },
            { kind: "say", text: "But there is a catch. The work only exists while the request exists. If the connection goes away, the handler goes with it, halfway through the second model call or wherever it happened to be." },
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
        title: "Three limits, one number",
        lead: "CPU time, the waitUntil clock and the connection. They fail differently.",
        terms: ["cpu", "waituntil", "namespace"],
        blocks: [
            { kind: "say", text: "When someone says 'Workers kill requests at 30 seconds', they are mixing up three different things that happen to share a number. Let's pull them apart." },
            { kind: "compare", columns: ["What it counts", "Default", "Can you raise it?"], rows: [
                { label: "CPU time", cells: ["Only time your code is executing", "30 seconds", "Standalone Worker: yes, up to 300,000 ms with limits.cpu_ms. Dispatch namespace: no."] },
                { label: "waitUntil", cells: ["Real time after the response is sent", "30 seconds", "No. Every plan, no exceptions."] },
                { label: "The connection", cells: ["Until the browser goes away", "No limit from Cloudflare", "It is the browser's to end: a closed tab or a refresh."] },
            ] },
            { kind: "say", text: "CPU time is only a problem when your code is busy. And one common thing makes it busy while looking idle: streaming. If you stream the model's answer, your code parses every chunk, stitches tokens together and fires callbacks the whole way through. That is real CPU work, proportional to the length of the answer. A 30-second streamed reply can spend a 30-second CPU budget." },
            {
                kind: "flow", flow: {
                    width: 760, height: 210,
                    caption: "Same wait, different CPU: one reply parsed at the end, or every chunk parsed as it arrives.",
                    nodes: [
                        { id: "one", label: "One JSON reply", sub: "parsed once: tiny CPU", x: 10, y: 20 },
                        { id: "ok", label: "Well under 30 s CPU", x: 290, y: 20, tone: "strong" },
                        { id: "stream", label: "Streamed reply", sub: "every chunk parsed", x: 10, y: 130 },
                        { id: "bad", label: "Can hit 30 s CPU", x: 290, y: 130, tone: "bad" },
                    ],
                    edges: [
                        { from: "one", to: "ok" },
                        { from: "stream", to: "bad", bad: true, flowing: true },
                    ],
                },
            },
            { kind: "say", text: "The demo did not stream, and it never got near 30 seconds of CPU. It was not waitUntil either: nothing ran after the response. What ended it was the third thing, the one with no limit at all. The developer refreshed, the browser dropped the connection, and the work went with it." },
            { kind: "note", text: "So it was not Cloudflare's 30-second limit. It was a refresh at 30 seconds. The number was a coincidence, and it sent everyone looking in the wrong place." },
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
        title: "What survives what",
        lead: "Four places work can run, and three things that can happen to it.",
        terms: ["alarm", "cron"],
        blocks: [
            { kind: "say", text: "There are four places your work can run on Workers: inside the request, in waitUntil after the response, in a Durable Object alarm, or on a cron schedule. Each one survives different events. Try it in the simulator: pick where the work runs and what the user does, and watch which lane survives." },
            { kind: "simulator" },
            { kind: "compare", columns: ["Tab switched away", "Tab closed or refreshed", "A deploy"], rows: [
                { label: "Inside the request", cells: ["Survives", "Dies", "Dies"] },
                { label: "waitUntil", cells: ["Survives", "Survives, but only for 30 s", "Dies"] },
                { label: "Durable Object alarm", cells: ["Survives", "Survives", "Survives if it has not started; one running can be evicted"] },
                { label: "Cron trigger", cells: ["No browser involved", "No browser involved", "Survives on a standalone Worker; never runs in a dispatch namespace"] },
            ] },
            { kind: "note", text: "Switching tabs keeps the connection open. So 'it kept working when I switched tabs' only proves the connection never broke. It is not a background job." },
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
        title: "Why nothing was saved",
        lead: "A run that is stopped from outside cannot write down that it stopped.",
        terms: ["cancelled"],
        blocks: [
            { kind: "say", text: "The job's code was careful. It set the status to 'generating', did the work, then set 'done'. If anything threw, a catch block set 'failed' with the error. So why did the row say 'generating' forever, with no error?" },
            {
                kind: "flow", flow: {
                    width: 760, height: 250,
                    caption: "The catch block only runs if the code is still running. A cancelled run never reaches it.",
                    nodes: [
                        { id: "start", label: "status = generating", x: 10, y: 20 },
                        { id: "work", label: "await the model", sub: "call 2 of 4", x: 270, y: 20, tone: "strong" },
                        { id: "done", label: "status = done", x: 540, y: 20, tone: "muted" },
                        { id: "cut", label: "Connection closed", sub: "the run is cancelled", x: 270, y: 150, tone: "bad" },
                        { id: "catch", label: "catch: status = failed", sub: "never runs", x: 540, y: 150, tone: "muted" },
                    ],
                    edges: [
                        { from: "start", to: "work", flowing: true },
                        { from: "work", to: "done", dashed: true, label: "never reached" },
                        { from: "work", to: "cut", bad: true },
                        { from: "cut", to: "catch", dashed: true, bad: true, label: "no isolate left" },
                    ],
                },
            },
            { kind: "say", text: "Error handling protects you from errors your code throws. It cannot protect you from your code being switched off. When the connection closed, the isolate stopped running this request's code, mid-await. There was no one left to run the catch block." },
            { kind: "note", text: "A cancelled process cannot report that it was cancelled. Any design that waits for 'failed' to be written will wait forever on exactly the failure that matters most." },
            { kind: "say", text: "So something else has to notice. The fix will need a status row that someone outside the job can check, and a rule like 'working for more than ten minutes with no progress means it died'." },
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
        title: "The fix",
        lead: "Move the work off the request, into something no browser can reach.",
        terms: ["durableobject", "alarm", "polling", "reaper"],
        blocks: [
            { kind: "say", text: "The question to ask for any long job is a short one: must it survive the tab closing? If yes, the work cannot live inside the request. Here is how you choose where it goes." },
            {
                kind: "flow", flow: {
                    width: 760, height: 300,
                    caption: "The decision, for any long piece of work.",
                    nodes: [
                        { id: "q1", label: "Must it survive a closed tab?", x: 10, y: 20, w: 220, decision: true },
                        { id: "stay", label: "Keep it in the request", sub: "raise cpu_ms if it streams", x: 10, y: 170, w: 220, tone: "muted" },
                        { id: "q2", label: "Longer than 30 seconds?", x: 280, y: 20, w: 200, decision: true },
                        { id: "wu", label: "waitUntil", sub: "30 s of wall clock", x: 280, y: 170, w: 200, tone: "muted" },
                        { id: "q3", label: "Must it survive a deploy?", x: 530, y: 20, w: 220, decision: true },
                        { id: "do", label: "Durable Object alarm", sub: "+ a reaper for deploys", x: 530, y: 170, w: 220, tone: "strong" },
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
            { kind: "say", text: "The demo needed the right-hand answer. Here is the shape. The button's request only starts the job: it hands the work to a Durable Object, which sets an alarm and replies at once. The alarm fires a fresh run with no browser attached, does the four model calls, and writes the job's status to the database. The page never waits on the work. It polls the status row every few seconds." },
            {
                kind: "flow", flow: {
                    width: 760, height: 270,
                    caption: "The request starts the work and returns. The alarm does the work. The page reads the row.",
                    nodes: [
                        { id: "page", label: "Page", sub: "polls every few seconds", x: 10, y: 100 },
                        { id: "start", label: "Start request", sub: "returns 202 at once", x: 250, y: 20 },
                        { id: "do", label: "Durable Object", sub: "sets an alarm", x: 520, y: 20, tone: "strong" },
                        { id: "alarm", label: "alarm() runs the job", sub: "no browser attached", x: 520, y: 180, tone: "strong" },
                        { id: "row", label: "Status row", sub: "working, then done", x: 250, y: 180 },
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
            { kind: "say", text: "Now closing the tab changes nothing: the alarm never had a browser to lose. Refreshing just starts polling again. Coming back tomorrow reads 'done'. And for deploys, a reaper checks for jobs stuck in 'working' with no progress and marks them failed, so nothing polls forever." },
            { kind: "note", text: "Make the job's id decide which Durable Object runs it (idFromName). Then a second click, or a second tab, lands on the same object, and it can refuse to start twice." },
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
        title: "The fix that failed without a trace",
        lead: "The alarm could not see the database URL, so it died before its first write.",
        terms: ["opennext", "envvar"],
        blocks: [
            { kind: "say", text: "Moving work into an alarm is where the second incident usually happens. The job starts, sits at 'generating' with zero events and no error, and the page polls forever. It looks exactly like the first incident, but the cause is different." },
            {
                kind: "flow", flow: {
                    width: 760, height: 260,
                    caption: "Only the request path loads your .env. The alarm path skips it.",
                    nodes: [
                        { id: "req", label: "A request", x: 10, y: 20 },
                        { id: "handler", label: "OpenNext request handler", sub: "loads .env into process.env", x: 250, y: 20, w: 230, tone: "strong" },
                        { id: "ok", label: "Your code", sub: "DATABASE_URL is there", x: 540, y: 20 },
                        { id: "alarm", label: "An alarm", x: 10, y: 170 },
                        { id: "bad", label: "Your code", sub: "DATABASE_URL is missing", x: 540, y: 170, tone: "bad" },
                    ],
                    edges: [
                        { from: "req", to: "handler", flowing: true },
                        { from: "handler", to: "ok" },
                        { from: "alarm", to: "bad", bad: true, label: "skips the handler" },
                    ],
                },
            },
            { kind: "say", text: "On OpenNext, your app's secrets usually come from your .env file, baked into the bundle at build time. Only OpenNext's request handler copies them into process.env. An alarm never passes through that handler. So when the alarm imports your database module, it finds no DATABASE_URL, throws on import, and never writes a thing: the database is exactly what it could not reach." },
            {
                kind: "see", title: "What you see",
                lines: [
                    { who: "status", text: "generating" },
                    { who: "events", text: "none at all", tone: "bad" },
                    { who: "error", text: "(empty)", tone: "bad" },
                ],
            },
            { kind: "say", text: "The fix is to do what the request handler does, before anything else: at the very start of the alarm, copy the real bindings and the baked .env values into process.env, and only then load your app's code. Keep the app code behind a dynamic import, so it is loaded after that step, not before." },
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
        title: "Running it for real",
        lead: "Four things that bite after the fix ships, and how to prove it works.",
        terms: ["idempotent"],
        blocks: [
            { kind: "say", text: "The alarm works. Before you call it done, four things are invisible until real traffic hits them." },
            { kind: "compare", columns: ["What happens", "What to do"], rows: [
                { label: "Alarms retry", cells: ["If the alarm throws, Cloudflare runs it again. Anything that charges or emails does it twice.", "Make the work idempotent, or catch inside the alarm and write a final status."] },
                { label: "Two tabs, two runs", cells: ["A fresh object per click means two clicks run the job twice.", "Derive the object from the job id (idFromName) and refuse a second start."] },
                { label: "Stuck rows stay stuck", cells: ["Shipping the fix does nothing for jobs already frozen at 'generating'.", "Fail them once, on purpose, and decide whether to retry."] },
                { label: "No timeout, no end", cells: ["Without the connection, a call that never answers hangs forever.", "Give every outbound call a timeout shorter than the CPU budget."] },
            ] },
            { kind: "say", text: "Then prove it, the physical way. Start the longest run, wait until it has written its first progress, close the browser entirely, wait the run's length plus a minute, and read the row. Do it in production: neither the local dev server nor the local preview enforces these limits, so 'it works on my machine' proves nothing here." },
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
        title: "The same bug elsewhere",
        lead: "This is not a Cloudflare bug. It is what happens when slow work lives inside a request.",
        blocks: [
            { kind: "say", text: "Every platform puts some limit between a user and a slow request. The numbers differ, and so does what happens to your work when the limit is hit. That second part is the one that burns people." },
            { kind: "compare", columns: ["The limit", "Can you raise it?", "Does the work stop?"], rows: [
                { label: "Cloudflare Workers", cells: ["The connection, 30 s of CPU, 30 s for waitUntil", "CPU on a standalone Worker; not in a dispatch namespace", "Yes: work inside the request stops with the connection"] },
                { label: "AWS API Gateway (REST)", cells: ["Integration timeout, 29 s by default", "Beyond 29 s only for Regional or private APIs, and it can cost throttle quota", "Check your backend: the gateway stops waiting at its timeout"] },
                { label: "Heroku", cells: ["The router ends a request that takes over 30 s (error H12)", "No; streaming responses get a rolling 55 s window", "No: your app keeps working on a request the user has already lost"] },
                { label: "Vercel Functions", cells: ["A maximum duration per plan (maxDuration)", "Up to your plan's maximum", "Yes, at the maximum duration"] },
            ] },
            { kind: "say", text: "Look at Heroku's row. When the router gives up at 30 seconds, your app keeps going. So the user sees an error, retries, and now the work runs twice. On Workers, the work stops with the connection. Opposite behaviour, same lesson: a timeout at the front door and your work stopping are two separate facts, and your database only knows about one of them." },
            { kind: "note", text: "The fix every platform recommends is the same shape: start the work, hand it to a background worker, and let the page check a status. Only the names change." },
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
