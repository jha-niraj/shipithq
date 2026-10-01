import type { Chapter, SourceRef } from "./types"

/**
 * Case three as chapters (plan/long-jobs-vercel/case-outline.md, approved 2026-10-01). Ten
 * chapters: five on what happened (no code), four on the fix (real code from the
 * long-jobs-on-vercel sample, in the code viewer) and how to run it. A composite: Tallyroom
 * and its numbers are the story's own; every platform behaviour cites Vercel's or Next.js's
 * documentation, checked 2026-10-01.
 */

const DUR = (section: string): SourceRef => ({ source: "DUR", section })
const LIM = (section: string): SourceRef => ({ source: "LIM", section })
const AFTER = (section: string): SourceRef => ({ source: "AFTER", section })
const WF = (section: string): SourceRef => ({ source: "WF", section })
const WFC = (section: string): SourceRef => ({ source: "WFC", section })
const WFL = (section: string): SourceRef => ({ source: "WFL", section })
const ERR = (section: string): SourceRef => ({ source: "ERR", section })
const BG = (section: string): SourceRef => ({ source: "BG", section })
const S2 = (section: string): SourceRef => ({ source: "SRE", section })

const MIN = 60_000
const DAY = 86_400_000

const LIMITS = "Function limits on Vercel"
const AFTER_TOPIC = "after() and waitUntil"
const STEPS = "Workflows and steps"
const RETRIES = "Retries and idempotency"
const RETURN = "Leaving and coming back"

export const EXPORT_GLOSSARY: Record<string, { term: string; definition: string; pathTopic?: string }> = {
    function: { term: "Vercel Function", definition: "Your server code on Vercel. Each request starts an invocation of it, and every invocation has a time limit.", pathTopic: LIMITS },
    maxduration: { term: "maxDuration", definition: "How long one invocation of a function may run. 300 s by default; up to 800 s on Pro and Enterprise.", pathTopic: LIMITS },
    timeout504: { term: "504 FUNCTION_INVOCATION_TIMEOUT", definition: "What Vercel answers when a function reaches its maximum duration.", pathTopic: LIMITS },
    fluid: { term: "Fluid compute", definition: "How Vercel runs functions today, on by default: instances are reused and can serve several requests at once.", pathTopic: LIMITS },
    after: { term: "after()", definition: "A Next.js function that runs a callback once the response is sent. It runs for the route's maximum duration.", pathTopic: AFTER_TOPIC },
    waituntil: { term: "waitUntil", definition: "The platform primitive under after(): it keeps an invocation alive after the response, on the same clock.", pathTopic: AFTER_TOPIC },
    workflow: { term: "Workflow", definition: "A function marked \"use workflow\". It decides which step runs next, and is replayed from an event log to resume.", pathTopic: STEPS },
    step: { term: "Step", definition: "A function marked \"use step\". Each one runs as its own invocation, is retried on failure, and has its result recorded.", pathTopic: STEPS },
    eventlog: { term: "Event log", definition: "The run's record of every step's input and output. Replaying it is how a run resumes after a crash or a deploy.", pathTopic: STEPS },
    runid: { term: "Run id", definition: "The id start() returns for one run. Store it, and any page can ask the run how it is doing.", pathTopic: RETURN },
    idempotent: { term: "Idempotent", definition: "Safe to do twice: the second time changes nothing. Retried steps need this.", pathTopic: RETRIES },
    fatalerror: { term: "FatalError", definition: "An error a step throws to say retrying will not help, so the retries stop.", pathTopic: RETRIES },
    skew: { term: "Skew protection", definition: "A run stays on the deployment it started on, so a deploy cannot change its code half way.", pathTopic: RETRIES },
}

export const EXPORT_CHAPTERS: Chapter[] = [
    // ── 1 ─────────────────────────────────────────────────────────────────────
    {
        id: "incident",
        act: "What happened",
        title: "The spinner that ended in a 504",
        lead: "Export the year, five minutes of spinner, and three credits for nothing.",
        terms: ["function", "timeout504"],
        blocks: [
            { kind: "say", focus: "monday", text: "Hold one question while you listen. Nobody at this company wrote a five-minute timeout. So who did?" },
            { kind: "say", focus: "monday:0", text: "Tallyroom sells analytics to small businesses. In January every accountant presses one button: Export the year. It builds a CSV and a PDF of twelve months, and it costs one export credit." },
            { kind: "say", focus: "monday:2", text: "On Monday morning, an accounting firm with four thousand clients pressed it. The page showed a spinner. Five minutes later, an error page." },
            { kind: "say", focus: "monday:4", text: "They pressed it again, and again. Three tries, three error pages, three credits gone, and no file." },
            {
                kind: "see", id: "monday", title: "The function's log, Monday morning",
                lines: [
                    { t: "9:02:00", text: "POST /api/export  (accounting firm)" },
                    { t: "9:02:00", text: "credit charged", tone: "muted" },
                    { t: "9:07:00", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
                    { t: "9:12:30", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
                    { t: "9:18:00", text: "504 FUNCTION_INVOCATION_TIMEOUT  300.0 s", tone: "bad" },
                ],
            },
            { kind: "say", focus: "clock:e504a", text: "Here is the morning on one clock. T plus zero is the first press. The first 504 lands at exactly three hundred seconds." },
            { kind: "say", focus: "clock:detect", text: "Look at the spans. Twenty minutes until a support ticket. Under forty to the cause, because 300.0 seconds every time is a very loud clue." },
            {
                kind: "timeline", id: "clock", timeline: {
                    start: "Monday, 9:02 am: the firm presses Export the year",
                    caption: "Times from the story (an example). The 504s are the documented response at the maximum duration.",
                    events: [
                        { id: "press", at: 0, kind: "action", label: "Export pressed" },
                        { id: "e504a", at: 300_000, kind: "signal", label: "504 at 300 s", detail: "504 FUNCTION_INVOCATION_TIMEOUT. The credit was already charged." },
                        { id: "press2", at: 330_000, kind: "action", label: "Pressed again" },
                        { id: "e504b", at: 630_000, kind: "signal", label: "504 again" },
                        { id: "e504c", at: 960_000, kind: "signal", label: "Third 504" },
                        { id: "ticket", at: 20 * MIN, kind: "comms", label: "Support ticket", detail: "\"Spins for five minutes then shows an error page. Three tries, three credits gone.\"" },
                        { id: "cause", at: 38 * MIN, kind: "resolution", label: "Cause: maxDuration", detail: "\"300 seconds exactly, every time. That's the function's max duration.\"" },
                        { id: "dial", at: 180 * MIN, kind: "change", label: "maxDuration = 800", detail: "Fix one ships. It works for three weeks." },
                    ],
                    spans: [
                        { id: "detect", label: "Time to a ticket", from: "press", to: "ticket" },
                        { id: "diagnose", label: "Time to the cause", from: "press", to: "cause" },
                        { id: "mitigate", label: "Time to fix one", from: "press", to: "dial" },
                    ],
                },
            },
            { kind: "say", focus: "board:credits", text: "And the dashboard on-call would have seen. Credits charged climbs with every press." },
            { kind: "say", focus: "board:delivered", text: "Exports delivered stays at zero. The money moved before the work did." },
            {
                kind: "dashboard", id: "board", dashboard: {
                    caption: "Three presses, three 504s, three credits, and no file.",
                    series: [
                        { id: "inflight", name: "Exports in flight", unit: "exports", points: [[0, 0], [1000, 1], [300_000, 1], [300_500, 0], [330_000, 0], [330_500, 1], [630_000, 1], [630_500, 0], [660_000, 0], [660_500, 1], [960_000, 1], [960_500, 0], [22 * MIN, 0]] },
                        { id: "e504", name: "504 responses", unit: "responses", bad: true, points: [[0, 0], [299_500, 0], [300_000, 1], [629_500, 1], [630_000, 2], [959_500, 2], [960_000, 3], [22 * MIN, 3]] },
                        { id: "credits", name: "Credits charged", unit: "credits", points: [[0, 1], [329_500, 1], [330_000, 2], [659_500, 2], [660_000, 3], [22 * MIN, 3]] },
                        { id: "delivered", name: "Exports delivered", unit: "exports", points: [[0, 0], [22 * MIN, 0]] },
                    ],
                    markers: [
                        { id: "m-504", at: 300_000, label: "first 504" },
                        { id: "m-ticket", at: 20 * MIN, label: "ticket" },
                    ],
                },
            },
            { kind: "say", focus: "loud", text: "So who wrote the five minutes? Vercel did, as a default. The rest of this case is three attempts to get out from under it, and why only the last one worked." },
            { kind: "note", id: "loud", text: "300.0 seconds, every time. A failure at an exact round number is a limit, not a bug." },
        ],
        check: [
            { id: "where-stopped", kind: "pick", figure: "map", prompt: "Tap the part of the system where the work stopped.", parts: [
                { id: "browser", label: "Browser" },
                { id: "route", label: "Export route" },
                { id: "db", label: "Database" },
                { id: "blob", label: "File storage" },
                { id: "email", label: "Email" },
            ], answer: ["route"], explanation: "The route held the whole export inside one invocation, and the platform ended that invocation at 300 s. Everything else was fine; it just stopped being asked." },
            { id: "what-ended", kind: "single", prompt: "What ended each request at 300 seconds?", options: [
                { id: "max", label: "The function reached its maximum duration" },
                { id: "db", label: "The database timed out" },
                { id: "browser", label: "The browser gave up waiting" },
            ], answer: "max", explanation: "504 FUNCTION_INVOCATION_TIMEOUT is Vercel ending an invocation at its maximum duration. 300 s is the default." },
            { id: "charged", kind: "truefalse", prompt: "The firm was charged only for the export that worked.", answer: false, explanation: "The credit was charged at the start of each request, before the work. Three 504s, three credits." },
        ],
        sources: [LIM("Max duration"), DUR("Duration limits")],
    },

    // ── 2 ─────────────────────────────────────────────────────────────────────
    {
        id: "limits",
        act: "What happened",
        title: "Where the five minutes went",
        lead: "Every function invocation runs on one clock, and the clock covers everything.",
        terms: ["maxduration", "fluid"],
        blocks: [
            { kind: "say", focus: "life:press", text: "Guess first. If the function streamed its answer back bit by bit, would it get more than five minutes?" },
            { kind: "say", focus: "life:press", text: "Follow one press. The browser sends one request, and Vercel starts one invocation of the export route." },
            { kind: "say", focus: "life:charge", text: "The route charges the credit, then starts its twelve queries." },
            { kind: "say", focus: "life:rows", text: "For a firm with four thousand clients, the rows alone take four minutes to come back. Then the files still have to be built." },
            { kind: "say", focus: "life:cut", text: "At three hundred seconds the platform ends the invocation, wherever it is, and answers 504 on its behalf." },
            {
                kind: "sequence", id: "life", sequence: {
                    caption: "One press, one invocation, one clock.",
                    tabs: { normal: "If nothing stopped it", failing: "What happened" },
                    variants: { normal: "About six minutes, then the file comes back on the same request.", failing: "The platform ends the invocation at 300 s and answers 504." },
                    actors: [
                        { id: "browser", label: "Browser", sub: "the firm's tab" },
                        { id: "route", label: "Export route", sub: "one invocation" },
                        { id: "db", label: "Database", sub: "12 queries" },
                        { id: "blob", label: "File storage", sub: "CSV and PDF" },
                    ],
                    messages: [
                        { id: "press", from: "browser", to: "route", label: "POST /api/export", at: 0 },
                        { id: "charge", from: "route", to: "db", label: "charge 1 credit", at: 100 },
                        { id: "queries", from: "route", to: "db", label: "12 queries", at: 2000 },
                        { id: "rows", from: "db", to: "route", label: "a year of rows", at: 240_000, kind: "response" },
                        { id: "files", from: "route", to: "blob", label: "write CSV and PDF", at: 330_000, only: "normal" },
                        { id: "file", from: "route", to: "browser", label: "the file", at: 360_000, kind: "response", only: "normal" },
                        { id: "e504", from: "route", to: "browser", label: "504 FUNCTION_INVOCATION_TIMEOUT", at: 300_000, kind: "failed", only: "failing" },
                    ],
                    cuts: [{ at: 300_000, label: "300 s: the maximum duration. The invocation ends.", only: "failing" }],
                },
            },
            { kind: "say", focus: "plans:Hobby", text: "Here are the numbers. With Fluid compute, which is on by default, every plan starts at three hundred seconds. On Hobby, that is also the most you can have." },
            { kind: "say", focus: "plans:Pro", text: "On Pro and Enterprise you can raise it per route, up to eight hundred seconds, and in beta to thirty minutes." },
            { kind: "compare", id: "plans", columns: ["Default", "Maximum", "Extended, in beta"], rows: [
                { label: "Hobby", cells: ["300 s", "300 s", "Not available"] },
                { label: "Pro", cells: ["300 s", "800 s", "1,800 s, set per function"] },
                { label: "Enterprise", cells: ["300 s", "800 s", "1,800 s, set per function"] },
            ] },
            { kind: "say", focus: "whole", text: "Now your guess. The limit covers the whole request lifecycle, streaming the response included. Streaming doesn't buy time; it spends it." },
            { kind: "note", id: "whole", text: "One invocation, one clock. Past maxDuration, Vercel ends it with 504 FUNCTION_INVOCATION_TIMEOUT, streaming or not." },
        ],
        check: [
            { id: "stream", kind: "truefalse", prompt: "A function that streams its response is exempt from the maximum duration.", answer: false, explanation: "The limit covers the entire request lifecycle, including streaming the response." },
            { id: "hobby", kind: "single", prompt: "On the Hobby plan, how long can one function invocation run?", options: [
                { id: "300", label: "300 seconds, and no more" },
                { id: "800", label: "Up to 800 seconds if you set maxDuration" },
                { id: "60", label: "60 seconds" },
            ], answer: "300", explanation: "With Fluid compute, Hobby's default and maximum are both 300 s. 800 s is the Pro and Enterprise maximum." },
            { id: "order-life", kind: "order", prompt: "Put the failing press in order.", items: [
                { id: "press", label: "The browser sends POST /api/export" },
                { id: "charge", label: "The route charges a credit" },
                { id: "queries", label: "The route starts its 12 queries" },
                { id: "cut", label: "300 s pass and the invocation ends" },
                { id: "e504", label: "The browser gets a 504" },
            ], explanation: "Everything after the press happens inside one invocation, and the invocation's clock ends it." },
        ],
        sources: [DUR("Duration limits"), DUR("Extended max duration Beta"), LIM("Max duration")],
        links: [
            { label: "Vercel: Configuring maximum duration", href: "https://vercel.com/docs/functions/configuring-functions/duration" },
            { label: "Vercel: Functions limitations", href: "https://vercel.com/docs/functions/limitations" },
        ],
    },

    // ── 3 ─────────────────────────────────────────────────────────────────────
    {
        id: "dial",
        act: "What happened",
        title: "Fix one: turn the dial",
        lead: "maxDuration = 800. The 504s stop, for exactly as long as the data stays small.",
        terms: ["maxduration"],
        blocks: [
            { kind: "say", focus: "growth", text: "There's a number in a config file. Change it and the 504 goes away. For how long? Guess before you listen on." },
            { kind: "say", focus: "growth:limit", text: "Tallyroom is on Pro, so the fix took one line: export const maxDuration equals eight hundred. The firm's six-minute export finished. Tickets stopped." },
            { kind: "say", focus: "growth:longest", text: "But it's January. Every week customers add data, and the longest export grows with it." },
            { kind: "say", focus: "growth:m-big", text: "In week five, the largest customer's export needs fourteen minutes. Eight hundred seconds is thirteen and a third. The same 504 came back, after thirteen minutes of spinner." },
            {
                kind: "dashboard", id: "growth", dashboard: {
                    caption: "Week by week, the longest export grows into the raised limit.",
                    series: [
                        { id: "limit", name: "maxDuration", unit: "s", points: [[0, 800], [42 * DAY, 800]] },
                        { id: "longest", name: "Longest export", unit: "s", bad: true, points: [[0, 360], [7 * DAY, 420], [14 * DAY, 500], [21 * DAY, 590], [28 * DAY, 700], [35 * DAY, 840], [42 * DAY, 880]] },
                        { id: "e504", name: "504s a day", unit: "504s", points: [[0, 0], [33 * DAY, 0], [34 * DAY, 4], [42 * DAY, 6]] },
                    ],
                    markers: [
                        { id: "m-dial", at: 0, label: "800 s" },
                        { id: "m-big", at: 34 * DAY, label: "largest customer" },
                    ],
                },
            },
            { kind: "say", focus: "sim", text: "Try it. Set the export to fourteen minutes and watch the raised limit meet it." },
            { kind: "simulator", id: "sim", preset: { approach: "dial", length: "14", event: "none" } },
            { kind: "say", focus: "tab", text: "And even when it worked, it wasn't good. The file comes back in the response, so the user can't leave. The tab is the job." },
            { kind: "note", id: "tab", text: "Raising a limit moves the cliff. It doesn't remove it, and it doesn't let the user leave." },
        ],
        check: [
            { id: "grows", kind: "order", prompt: "Put what happened after fix one in order.", items: [
                { id: "raise", label: "maxDuration is raised to 800" },
                { id: "fits", label: "The firm's 6-minute export fits" },
                { id: "grows", label: "Customers' data grows week by week" },
                { id: "crosses", label: "The largest export needs 14 minutes" },
                { id: "back", label: "The 504 comes back, at 800 s" },
            ], explanation: "The limit stayed still and the work grew into it." },
            { id: "leave", kind: "truefalse", prompt: "With maxDuration at 800, the user can close the tab while the export runs.", answer: false, explanation: "The file is the response. Close the tab and nobody receives it." },
        ],
        talk: {
            opening: "Fix one was a single line and it worked for weeks. Was it a bad fix? Defend your answer.",
            probe: ["what grows with the customer's data", "what the user experiences while the export runs", "when raising maxDuration really is the right call"],
        },
        sources: [DUR("Maximum duration for different runtimes"), DUR("Duration limits")],
    },

    // ── 4 ─────────────────────────────────────────────────────────────────────
    {
        id: "after",
        act: "What happened",
        title: "Fix two: answer first, work after",
        lead: "after() made the page instant. It didn't give the work any more time.",
        terms: ["after", "waituntil"],
        blocks: [
            { kind: "say", focus: "seq", text: "What if the page didn't wait at all? Before you listen on: if the reply goes out at once, how long can the work behind it run?" },
            { kind: "say", focus: "seq:mark", text: "Fix two. The route marks the export as processing, replies two-oh-two, we'll email it, and hands the work to after()." },
            { kind: "say", focus: "seq:reply", text: "The page answers in a fifth of a second. The spinner tickets stopped overnight." },
            { kind: "say", focus: "seq:work", text: "after() runs the callback once the response is finished. On the same invocation." },
            { kind: "say", focus: "seq:cut", text: "And for how long? For the route's default or configured maximum duration. Eight hundred seconds. The fourteen-minute export still stops there." },
            { kind: "say", focus: "seq:cut", text: "Only now there is no response left to carry a 504. The user was told their export was on its way thirteen minutes ago." },
            {
                kind: "sequence", id: "seq", sequence: {
                    caption: "after() runs once the reply is sent, on the route's own clock.",
                    tabs: { normal: "What they hoped", failing: "What happens at 14 minutes" },
                    variants: { normal: "The reply at once, the work behind it, the email at the end.", failing: "The reply at once, then the work meets the same 800 s." },
                    actors: [
                        { id: "browser", label: "Browser", sub: "free to leave" },
                        { id: "route", label: "Export route", sub: "one invocation" },
                        { id: "db", label: "Database", sub: "the exports row" },
                        { id: "email", label: "Email", sub: "the link" },
                    ],
                    messages: [
                        { id: "press", from: "browser", to: "route", label: "POST /api/export", at: 0 },
                        { id: "mark", from: "route", to: "db", label: "status = processing", at: 80 },
                        { id: "reply", from: "route", to: "browser", label: "202: we'll email it", at: 200, kind: "response" },
                        { id: "work", from: "route", to: "db", label: "12 queries, in after()", at: 2000, kind: "async" },
                        { id: "done", from: "route", to: "db", label: "status = done", at: 840_000, only: "normal" },
                        { id: "mail", from: "route", to: "email", label: "send the link", at: 841_000, only: "normal" },
                    ],
                    cuts: [{ at: 800_000, label: "800 s: the route's maximum duration. The work stops; nothing is written.", only: "failing" }],
                },
            },
            { kind: "say", focus: "row:processing", text: "Now follow the row. Created, then processing. Two ways out were written in code: done, and failed." },
            { kind: "say", focus: "row:stopped", text: "The limit took a third way. The work stopped and the row kept its last value. Processing, forever." },
            {
                kind: "states", id: "row", states: {
                    caption: "The exports row. Only two of the ways out write anything.",
                    states: [
                        { id: "created", label: "Export requested" },
                        { id: "processing", label: "processing" },
                        { id: "done", label: "done", sub: "email sent" },
                        { id: "failed", label: "failed", sub: "a caught error" },
                        { id: "stopped", label: "Work stopped", sub: "writes nothing" },
                    ],
                    transitions: [
                        { from: "created", to: "processing", label: "202 sent" },
                        { from: "processing", to: "done", label: "finished" },
                        { from: "processing", to: "failed", label: "an error" },
                        { from: "processing", to: "stopped", label: "800 s", bad: true },
                    ],
                    stuck: "processing",
                },
            },
            { kind: "say", focus: "sim", text: "Try it: after(), fourteen minutes. Then try four minutes with a crash at two. Nothing retries either one." },
            { kind: "simulator", id: "sim", preset: { approach: "after", length: "14", event: "none" } },
            { kind: "note", id: "who", text: "after() changes who waits, not how long the work may run. And it keeps no record that the work started." },
        ],
        check: [
            { id: "after-buckets", kind: "buckets", prompt: "Moving the work into after(): what changed?", buckets: [
                { id: "changed", label: "Changed" },
                { id: "same", label: "Did not change" },
            ], items: [
                { id: "reply", label: "When the user gets a reply", bucket: "changed" },
                { id: "leave", label: "Whether the user can leave", bucket: "changed" },
                { id: "time", label: "How long the work may run", bucket: "same" },
                { id: "retry", label: "Whether anything retries a stopped export", bucket: "same" },
            ], explanation: "after() moves the reply earlier. The work still runs on the route's maximum duration, with no record and no retry." },
            { id: "after-clock", kind: "single", prompt: "maxDuration is 800. How long can a callback in after() run?", options: [
                { id: "800", label: "Within the route's 800 s, like the rest of the invocation" },
                { id: "forever", label: "As long as it needs: the response is already sent" },
                { id: "30", label: "30 seconds" },
            ], answer: "800", explanation: "after() runs for the route's default or configured maximum duration." },
        ],
        sources: [AFTER("after(callback)"), AFTER("Duration"), BG("Why inline execution fails")],
        links: [{ label: "Next.js: after", href: "https://nextjs.org/docs/app/api-reference/functions/after" }],
    },

    // ── 5 ─────────────────────────────────────────────────────────────────────
    {
        id: "quiet",
        act: "What happened",
        title: "Nothing failed loudly",
        lead: "The error rate fell to zero the week things got worse.",
        terms: [],
        blocks: [
            { kind: "say", focus: "weeks:e504", text: "How does an error rate go to zero while customers lose more exports? Think before you listen on." },
            { kind: "say", focus: "weeks:e504", text: "After fix two, the 504s stopped. There was no long response left to time out." },
            { kind: "say", focus: "weeks:errors", text: "Errors logged: zero. A stopped callback doesn't throw anything. It just stops." },
            { kind: "say", focus: "weeks:stuck", text: "The line that mattered was one nobody was watching. Exports stuck at processing, climbing every week, each one charged and never emailed." },
            {
                kind: "dashboard", id: "weeks", dashboard: {
                    caption: "Every alert was on errors, and errors went to zero.",
                    series: [
                        { id: "e504", name: "504s a day", unit: "504s", points: [[-3 * DAY, 0], [-2 * DAY, 3], [-DAY, 4], [0, 4], [DAY / 2, 0], [21 * DAY, 0]] },
                        { id: "errors", name: "Errors logged", unit: "errors", points: [[-3 * DAY, 0], [21 * DAY, 0]] },
                        { id: "stuck", name: "Stuck at processing", unit: "exports", bad: true, points: [[-3 * DAY, 0], [0, 0], [3 * DAY, 2], [7 * DAY, 6], [14 * DAY, 15], [21 * DAY, 24]] },
                    ],
                    markers: [
                        { id: "m-after", at: 0, label: "after() ships" },
                        { id: "m-found", at: 21 * DAY, label: "noticed" },
                    ],
                },
            },
            { kind: "say", focus: "why:symptom", text: "So why? Start from what customers saw: exports stuck at processing, with no email." },
            { kind: "say", focus: "why:trigger", text: "The trigger: a long export reaching the route's maximum duration, inside after()." },
            { kind: "say", focus: "why:norecord", text: "It only stayed hidden because nothing recorded progress, nothing retried, and success was measured by errors." },
            { kind: "say", focus: "why:inrequest", text: "Underneath it all, the weakness that was there from the first day. The job lived inside a request." },
            {
                kind: "causes", id: "why", causes: {
                    caption: "Read it right to left: every one of these had to be true.",
                    symptom: { id: "symptom", label: "Exports stuck at processing", detail: "Charged, never emailed, and no error anywhere." },
                    trigger: { id: "trigger", label: "A long export hits 800 s in after()", detail: "after() runs on the route's maximum duration." },
                    contributing: [
                        { id: "norecord", label: "No record of progress", detail: "Nothing could tell a running export from a stopped one." },
                        { id: "noretry", label: "Nothing retries", detail: "A stopped callback is simply gone." },
                        { id: "errors", label: "Success measured by errors", detail: "A stopped callback produces none." },
                    ],
                    latent: [
                        { id: "inrequest", label: "The job lived inside a request", detail: "So it had a request's lifetime, whatever the reply did." },
                        { id: "charge", label: "Charged on the press", detail: "Failures cost customers before anyone knew." },
                    ],
                },
            },
            { kind: "note", id: "stopped", text: "Same lesson as the Cloudflare case, on a different platform: a stopped job is not an error. Alert on what should have finished and didn't." },
        ],
        check: [
            { id: "evidence", kind: "pick", figure: "map", prompt: "Which part still held the evidence that exports had stopped?", parts: [
                { id: "browser", label: "Browser" },
                { id: "route", label: "Export route" },
                { id: "db", label: "Database" },
                { id: "blob", label: "File storage" },
                { id: "email", label: "Email" },
            ], answer: ["db"], explanation: "The exports row: processing, a start time and no finish time. The route was gone, the browser had its 202, and the email was never sent." },
            { id: "zero", kind: "single", prompt: "Why did errors fall to zero after fix two?", options: [
                { id: "stopped", label: "Stopped work throws nothing, and no response was left to time out" },
                { id: "fixed", label: "Because fix two fixed the export" },
                { id: "logging", label: "Because after() hides its logs" },
            ], answer: "stopped", explanation: "The 202 had already gone out, so no 504 could be sent, and work cut off by the limit throws nothing of its own." },
        ],
        sources: [AFTER("Duration"), BG("Why inline execution fails")],
    },

    // ── 6 ─────────────────────────────────────────────────────────────────────
    {
        id: "workflow",
        act: "How it was fixed",
        title: "A function that can be paused",
        lead: "Steps that something remembers, so no single invocation has to last.",
        terms: ["workflow", "step", "eventlog"],
        blocks: [
            { kind: "say", focus: "change", text: "What if the export were a list of steps, and something remembered which ones were done? Hold that idea." },
            { kind: "say", focus: "change:route", text: "Here is the fix on the system. The route no longer does the work. It starts a run and replies at once." },
            { kind: "say", focus: "change:runtime", text: "The Workflow runtime queues one step at a time and records each result in the run's event log." },
            { kind: "say", focus: "change:steps", text: "Each part of the export is a step: its own function invocation. For the largest customer, about eighty-four seconds each. Far under any limit." },
            { kind: "map-change", id: "change", caption: "The fix as a change to the system." },
            { kind: "say", focus: "code:L6-13", text: "Here is the real code, from the app you can build. The workflow function only decides what runs next: one step per part, in a loop." },
            { kind: "say", focus: "code:L18-29", text: "And each step does one part of the work. Between steps, the run is suspended and uses nothing." },
            { kind: "say", focus: "code:L4-5", text: "One rule matters here. After a crash or a deploy, the workflow function is replayed from the event log. Finished steps return their recorded results instead of running again. So the slow work belongs in steps, never in the workflow function itself." },
            { kind: "code", id: "code", sample: "long-jobs-on-vercel", stage: "workflow", file: "workflows/report.ts" },
            { kind: "say", focus: "run:start", text: "Now replay the export on the new system. The press starts a run and gets an id back in a third of a second." },
            { kind: "say", focus: "run:s1", text: "Then the steps run one at a time, each its own invocation. Switch to the crash tab: a step that dies is retried, and only that step." },
            {
                kind: "sequence", id: "run", sequence: {
                    caption: "The route starts the run; every step is its own invocation; the run itself has no time limit.",
                    tabs: { normal: "Nothing goes wrong", failing: "A crash at 2 minutes" },
                    variants: { normal: "Ten steps, one at a time, then the email.", failing: "Step 2's invocation crashes. Step 1 is not repeated; step 2 runs again." },
                    actors: [
                        { id: "browser", label: "Browser", sub: "free to leave" },
                        { id: "route", label: "Export route", sub: "starts the run" },
                        { id: "runtime", label: "Workflow runtime", sub: "queue + event log" },
                        { id: "steps", label: "Export steps", sub: "a function each" },
                        { id: "email", label: "Email" },
                    ],
                    messages: [
                        { id: "press", from: "browser", to: "route", label: "POST /api/export", at: 0 },
                        { id: "start", from: "route", to: "runtime", label: "start(): run id", at: 100 },
                        { id: "reply", from: "route", to: "browser", label: "202 + export id", at: 300, kind: "response" },
                        { id: "s1", from: "runtime", to: "steps", label: "step 1 of 10", at: 500 },
                        { id: "r1", from: "steps", to: "runtime", label: "result, recorded", at: 84_000, kind: "response" },
                        { id: "s2", from: "runtime", to: "steps", label: "step 2", at: 84_500 },
                        { id: "again", from: "runtime", to: "steps", label: "step 2 again, from its first line", at: 125_000, only: "failing" },
                        { id: "rest", from: "runtime", to: "steps", label: "steps 3 to 10, one at a time", at: 170_000, kind: "async" },
                        { id: "mail", from: "steps", to: "email", label: "send the link, once", at: 842_000 },
                    ],
                    cuts: [{ at: 120_000, label: "Step 2's invocation crashes", only: "failing" }],
                },
            },
            { kind: "note", id: "rule", text: "A run has no maximum duration. Each step does: it is a function, bounded by the function limit. Split the work so every step fits." },
        ],
        check: [
            { id: "what-limits", kind: "single", prompt: "A 14-minute export runs as 10 steps on Pro. What limits it now?", options: [
                { id: "step", label: "Each step's own duration, about 84 s, against the function limit" },
                { id: "total", label: "The total, 14 minutes, against 800 s" },
                { id: "none", label: "Nothing: workflows have no limits" },
            ], answer: "step", explanation: "A run has no duration limit; each step runs as a function and is bounded by the function's maximum duration." },
            { id: "replay", kind: "truefalse", prompt: "After a crash, a workflow runs every step again from step 1.", answer: false, explanation: "Finished steps are in the event log. Replay returns their recorded results; only the failed step runs again." },
            { id: "fix-order", kind: "order", prompt: "Put the fixed export in order.", items: [
                { id: "press", label: "The button posts to the route" },
                { id: "start", label: "The route calls start() and gets a run id" },
                { id: "reply", label: "The route replies 202 at once" },
                { id: "steps", label: "The steps run, one invocation each" },
                { id: "mail", label: "The last step sends the link" },
            ], explanation: "The route only starts the run. Everything slow happens in steps no browser can end." },
        ],
        sources: [WF("Vercel Workflows"), WFC("Workflow"), WFC("Step"), WFL("Workflow run limits")],
        links: [
            { label: "Vercel: Workflows", href: "https://vercel.com/docs/workflows" },
            { label: "Vercel: Workflow concepts", href: "https://vercel.com/docs/workflows/concepts" },
        ],
    },

    // ── 7 ─────────────────────────────────────────────────────────────────────
    {
        id: "twice",
        act: "How it was fixed",
        title: "The step that ran twice",
        lead: "Retries are the point of a step. They're also how a customer gets two emails.",
        terms: ["idempotent", "fatalerror"],
        blocks: [
            { kind: "say", focus: "twice", text: "The workflow shipped. The first big export succeeded, and the customer got two emails with the same link, four seconds apart. Why? Guess before you listen on." },
            { kind: "say", focus: "twice:send", text: "The last step sends the email." },
            { kind: "say", focus: "twice:mark", text: "Then it writes sent equals true to the row. That write failed, a blip, and the step threw." },
            { kind: "say", focus: "twice:retry", text: "A step that throws is retried, three times by default. And a retried step starts again from its first line. It doesn't resume half way." },
            { kind: "say", focus: "twice:send2", text: "So it sent the email again." },
            { kind: "say", focus: "twice:ignored", text: "Switch to the fixed tab. The step checks first, and sends with an idempotency key made from the export id. The provider sees the same key twice and sends once." },
            {
                kind: "sequence", id: "twice", sequence: {
                    caption: "A retried step starts from its first line, so its side effects happen again unless it guards them.",
                    tabs: { normal: "With a check and a key", failing: "As shipped" },
                    variants: { normal: "The retry finds the key already used. One email.", failing: "The retry sends again. Two emails." },
                    actors: [
                        { id: "runtime", label: "Workflow runtime" },
                        { id: "step", label: "send-link step" },
                        { id: "email", label: "Email provider" },
                        { id: "db", label: "Database" },
                    ],
                    messages: [
                        { id: "run", from: "runtime", to: "step", label: "run send-link", at: 0 },
                        { id: "check", from: "step", to: "db", label: "already sent? no", at: 200, only: "normal" },
                        { id: "send", from: "step", to: "email", label: "send the link", at: 500 },
                        { id: "ok", from: "email", to: "step", label: "accepted", at: 900, kind: "response" },
                        { id: "mark", from: "step", to: "db", label: "sent = true", at: 1000, kind: "failed" },
                        { id: "retry", from: "runtime", to: "step", label: "retry, from the first line", at: 4000 },
                        { id: "send2", from: "step", to: "email", label: "send the link again", at: 4300 },
                        { id: "ignored", from: "email", to: "step", label: "same key: not sent again", at: 4600, kind: "response", only: "normal" },
                        { id: "dup", from: "email", to: "step", label: "accepted: a second email", at: 4600, kind: "response", only: "failing" },
                    ],
                },
            },
            { kind: "say", focus: "kinds:FatalError", text: "And some failures shouldn't be retried at all. A bad email address will be just as bad four times. Throw FatalError, and the retries stop." },
            { kind: "say", focus: "kinds:RetryableError", text: "A rate limit will clear. Throw RetryableError with when to try again." },
            { kind: "compare", id: "kinds", columns: ["Use it when", "What happens"], rows: [
                { label: "Let it throw", cells: ["A blip: a network error, a timeout", "Retried, three times by default, each from the step's first line"] },
                { label: "RetryableError", cells: ["It will clear by a known time: a rate limit", "Retried after the delay you give"] },
                { label: "FatalError", cells: ["Retrying cannot help: a 400, bad input", "No retries. The error goes to the workflow"] },
            ] },
            { kind: "note", id: "first-line", text: "A retried step starts again from its first line. Anything it does to the outside world must be safe to do twice." },
        ],
        check: [
            { id: "error-kinds", kind: "buckets", prompt: "Which should each failure throw?", buckets: [
                { id: "fatal", label: "FatalError" },
                { id: "retryable", label: "RetryableError" },
                { id: "plain", label: "Let it throw" },
            ], items: [
                { id: "address", label: "400: the email address is invalid", bucket: "fatal" },
                { id: "rate", label: "429: rate limited, try again in 5 minutes", bucket: "retryable" },
                { id: "blip", label: "A network connection reset", bucket: "plain" },
            ], explanation: "Stop when retrying can't help, wait when you know how long, and let blips use the default retries." },
            { id: "why-two", kind: "single", prompt: "Why did the customer get two emails?", options: [
                { id: "retry", label: "The step failed after sending, and the retry started again from the top" },
                { id: "double", label: "The workflow called the step twice" },
                { id: "provider", label: "The provider sent a duplicate" },
            ], answer: "retry", explanation: "Retried steps restart from their first line. The send happened again because nothing checked first." },
        ],
        sources: [ERR("Default retry behavior"), ERR("Step re-execution"), ERR("Idempotency for side effects"), ERR("FatalError vs RetryableError")],
        links: [{ label: "Workflow SDK: Errors and retrying", href: "https://workflow-sdk.dev/docs/foundations/errors-and-retries" }],
    },

    // ── 8 ─────────────────────────────────────────────────────────────────────
    {
        id: "return",
        act: "How it was fixed",
        title: "Leaving and coming back",
        lead: "The tab is no longer the job. The run id is.",
        terms: ["runid"],
        blocks: [
            { kind: "say", focus: "back", text: "The user starts an export at step one, closes the laptop and comes back at lunch. What should they see?" },
            { kind: "say", focus: "back:id", text: "When the route starts the run, it gets an id back, and stores it. The export row keeps it, and in the app you can build, so does the page's address." },
            { kind: "say", focus: "back:cut", text: "The tab closes. The run doesn't notice. It never knew the tab existed." },
            { kind: "say", focus: "back:status", text: "At lunch, the same link asks the run for its status by that id. Completed. And the file is there." },
            {
                kind: "sequence", id: "back", sequence: {
                    caption: "Status comes from the run, so any page, any time, can ask.",
                    actors: [
                        { id: "browser", label: "Browser" },
                        { id: "route", label: "Your routes" },
                        { id: "runtime", label: "Workflow runtime" },
                    ],
                    messages: [
                        { id: "start", from: "browser", to: "route", label: "Run", at: 0 },
                        { id: "begin", from: "route", to: "runtime", label: "start()", at: 100 },
                        { id: "id", from: "route", to: "browser", label: "run id, kept in the URL", at: 300, kind: "response" },
                        { id: "open", from: "browser", to: "route", label: "the same link, later", at: 45 * MIN },
                        { id: "status", from: "route", to: "runtime", label: "getRun(id).status", at: 45 * MIN + 100 },
                        { id: "completed", from: "runtime", to: "route", label: "completed", at: 45 * MIN + 200, kind: "response" },
                        { id: "shown", from: "route", to: "browser", label: "done, and the file", at: 45 * MIN + 300, kind: "response" },
                    ],
                    cuts: [{ at: MIN, label: "The tab closes. The run carries on." }],
                },
            },
            { kind: "say", focus: "card:L9-14", text: "Here is how the app you can build does it. The run id lives in the page's address, so the link itself is the way back." },
            { kind: "say", focus: "card:L19-26", text: "Pressing Run starts the run and puts its id in the address. Everything else on the card reads from that id: the status every five seconds, and each finished step from the run's stream." },
            { kind: "code", id: "card", sample: "long-jobs-on-vercel", stage: "workflow", file: "components/workflow-card.tsx" },
            { kind: "say", focus: "cf", text: "If you've read the Cloudflare case, this shape is familiar. Cloudflare has its own native Workflows now, with the same idea and different names." },
            { kind: "compare", id: "cf", columns: ["Vercel Workflow SDK", "Cloudflare Workflows"], rows: [
                { label: "The workflow", cells: ["A function with \"use workflow\"", "A class extending WorkflowEntrypoint, with run(event, step)"] },
                { label: "A step", cells: ["A function with \"use step\"", "await step.do(\"name\", async () => ...)"] },
                { label: "Waiting", cells: ["sleep(\"10m\")", "await step.sleep(\"wait\", \"10 minutes\")"] },
                { label: "Starting a run", cells: ["start(fn, args)", "env.MY_WORKFLOW.create({ params })"] },
            ] },
            { kind: "note", id: "runid", text: "Store the run id, not a percentage. The run knows how it is doing; your row only knows what it was last told." },
        ],
        check: [
            { id: "close", kind: "truefalse", prompt: "Closing the tab cancels the workflow run.", answer: false, explanation: "The run never depended on the tab. The page only reads its status by id." },
            { id: "store", kind: "single", prompt: "What should the export row store so any page can show progress later?", options: [
                { id: "runid", label: "The run id" },
                { id: "percent", label: "A percentage the page updates" },
                { id: "nothing", label: "Nothing: the browser keeps the state" },
            ], answer: "runid", explanation: "With the run id, getRun(id) answers from the run itself, whoever asks and whenever." },
        ],
        talk: {
            opening: "Why is a run id a better thing to store than a percentage complete?",
            probe: ["what happens to a stored percentage when the work stops", "who can ask the run for its status, and when", "what the user sees after closing the tab"],
        },
        sources: [WF("Features"), WFC("Workflow")],
        links: [{ label: "Cloudflare: Workflows", href: "https://developers.cloudflare.com/workflows/" }],
    },

    // ── 9 ─────────────────────────────────────────────────────────────────────
    {
        id: "operate",
        act: "How it was fixed",
        title: "Operating it",
        lead: "Rollbacks, replays, stuck rows and when to charge.",
        terms: ["skew"],
        blocks: [
            { kind: "say", focus: "bites", text: "You roll back a bad deploy, and the workflow runs on the bad one keep going. Is that a bug? Guess first." },
            { kind: "say", focus: "bites:A rollback", text: "It isn't. Runs stay on the deployment they started on, so a deploy can never change a run's code half way. The same pinning means a rollback leaves runs on the bad deployment, retrying. Cancel them from the Workflows tab or the CLI." },
            { kind: "say", focus: "bites:Thousands of tiny steps", text: "Second. A run past two thousand events replays slower, and a replay over two hundred and forty seconds may be aborted. Don't make one step per row. Bundle rows into each step." },
            { kind: "say", focus: "bites:Stuck rows", text: "Third. Exports frozen at processing by fix two won't finish because the fix shipped. Find them, refund the credits, and start them again as runs." },
            { kind: "say", focus: "bites:Charging", text: "And fourth. Charge in the last step, when the export exists, so a failed run never costs anyone." },
            { kind: "compare", id: "bites", columns: ["What happens", "What to do"], rows: [
                { label: "A rollback", cells: ["Runs stay on the deployment they started on, and keep retrying there.", "Cancel runs on the bad deployment from the Workflows tab or the CLI."] },
                { label: "Thousands of tiny steps", cells: ["Past 2,000 events a run replays slower; over 240 s, a replay may be aborted.", "Bundle many items into each step."] },
                { label: "Stuck rows", cells: ["Exports stuck by after() stay stuck after the fix ships.", "Find them, refund, and start them again as runs."] },
                { label: "Charging", cells: ["Charging on the press billed failed exports.", "Settle the credit in the last step."] },
            ] },
            { kind: "say", focus: "watch", text: "And watch it. The Workflows tab in Observability shows every run, every step, its input, output and error. Alert on runs that should have finished and haven't." },
            { kind: "note", id: "watch", text: "Every step, input, output, sleep and error is recorded. Use it: alert on runs older than they should be, not only on errors." },
        ],
        check: [
            { id: "rollback", kind: "single", prompt: "You roll back a bad deploy. What do you do about workflow runs started on it?", options: [
                { id: "cancel", label: "Cancel them: they stay on that deployment and keep retrying" },
                { id: "nothing", label: "Nothing: the rollback moves them to the good deployment" },
                { id: "redeploy", label: "Deploy again to restart them" },
            ], answer: "cancel", explanation: "Runs are pinned to the deployment they started on. That protects them from deploys, and keeps them on a bad one after a rollback." },
            { id: "batch", kind: "truefalse", prompt: "For 30,000 rows, one step per row is the safest design.", answer: false, explanation: "Every step adds events, and runs past 2,000 events replay slower. Bundle rows into steps." },
        ],
        sources: [WFC("Skew Protection"), WFL("Workflow run limits"), WF("Observability")],
        links: [{ label: "Vercel: Workflow pricing and limits", href: "https://vercel.com/docs/workflows/pricing" }],
    },

    // ── How to run this one (INC-72) ──────────────────────────────────────────
    {
        id: "people",
        act: "Beyond this case",
        title: "How to run this one",
        lead: "The same incident, run by a team: who decides, who fixes, who talks.",
        blocks: [
            { kind: "say", focus: "roles", text: "This is how a team should run it, not how Tallyroom did. Start with how bad it is." },
            { kind: "say", focus: "roles:severity", text: "A paid feature fails for the biggest customers, and they are charged for it. Nothing else is down. High, not an outage." },
            { kind: "say", focus: "roles:Incident lead", text: "One person leads, decides and keeps the live notes. They don't debug." },
            { kind: "say", focus: "roles:Comms", text: "One person talks to the affected customers, with the refund in the first message, not the third." },
            {
                kind: "roles", id: "roles", roles: {
                    severity: { level: "High (SEV-2)", why: "A paid feature fails for the largest customers and charges them for it. Nothing else is down, and no data is lost." },
                    roles: [
                        { role: "Incident lead", does: "Owns the incident: decides, assigns the work, and keeps a live note of what is known. Doesn't debug." },
                        { role: "Operations", does: "The only one changing the system: finds exports stuck at processing, refunds them, and restarts them as runs." },
                        { role: "Comms", does: "Tells affected customers what happened, that they've been refunded, and when they'll hear next." },
                        { role: "Planning", does: "Files the follow-ups: the workflow, idempotent steps, charging on completion, the stuck-export alert." },
                    ],
                    sources: [S2("Managing Incidents")],
                },
            },
            { kind: "say", focus: "updates:Investigating", text: "Here's what customers could have read. First, an honest holding line." },
            { kind: "say", focus: "updates:Identified", text: "Then the cause in plain words, and what to do meanwhile." },
            {
                kind: "status", id: "updates", status: {
                    caption: "How a team would post them: an example, not the incident's record.",
                    updates: [
                        { at: 20 * MIN, state: "Investigating", text: "Some large year exports are failing. Credits for failed exports will be refunded. Next update in an hour." },
                        { at: 21 * DAY, state: "Identified", text: "Very large exports can stop before they finish and stay at processing. Please export by quarter for now; we're refunding every affected export." },
                        { at: 22 * DAY, state: "Monitoring", text: "Exports now run in the background in steps and can be left running. We're watching the largest ones." },
                        { at: 24 * DAY, state: "Resolved", text: "Exports of any size finish, and you're only charged when the file exists. Stuck exports were restarted." },
                    ],
                },
            },
            { kind: "say", focus: "book", text: "And the runbook operations reaches for first." },
            { kind: "runbook", id: "book", title: "Exports stuck at processing", steps: [
                "Find exports processing for over 20 minutes with no finish time.",
                "Refund their credits first, then tell each owner.",
                "Start each again as a workflow run and store the new run id.",
                "Check the Workflows tab for failed steps before closing the incident.",
            ] },
        ],
        check: [
            { id: "who-talks", kind: "single", prompt: "Who tells affected customers about refunds?", options: [
                { id: "comms", label: "One person whose job is comms" },
                { id: "lead", label: "The incident lead, between decisions" },
                { id: "ops", label: "Whoever restarted their export" },
            ], answer: "comms", explanation: "One voice, on a schedule. The lead stays free to decide, and operations stays on the fix." },
        ],
        sources: [S2("Managing Incidents")],
    },
]

/** What this case teaches: the Pathfinder path's seven days, in order (plan/long-jobs-vercel LJV-8). */
export const EXPORT_LEARN: { title: string; summary: string }[] = [
    { title: LIMITS, summary: "maxDuration on every plan, the 504, and what the limit covers." },
    { title: AFTER_TOPIC, summary: "Work after the reply, on the same clock, with no record." },
    { title: STEPS, summary: "\"use workflow\" and \"use step\", the event log and replay." },
    { title: RETRIES, summary: "Retries from the first line, idempotent side effects, FatalError." },
    { title: RETURN, summary: "Run ids, status and streams: a page the user can leave." },
    { title: "Build day 1: the slow function and the 504", summary: "The report in ten steps, run inline on Vercel until it dies." },
    { title: "Build day 2: the workflow, deployed", summary: "The same steps as a workflow, deployed and operated." },
]
