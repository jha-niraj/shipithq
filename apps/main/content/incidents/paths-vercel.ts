import type { IncidentPath } from "./paths"

/**
 * The Pathfinder path behind case three, "The export that finished after it failed"
 * (plan/long-jobs-vercel LJV-8): five days of concepts, then two days building the
 * long-jobs-on-vercel app. Topic titles match the case's `learn` list exactly; the seed
 * refuses drift. Facts are from Vercel's, Next.js's and the Workflow SDK's documentation,
 * checked 2026-10-01, and the code from the reference sample (workflow@4.8.10). A topic's
 * `code` shows that file of the sample in the read-only viewer on the day.
 */

const SAMPLE = "long-jobs-on-vercel"

export const VERCEL_PATH: IncidentPath = {
    slug: "incident-the-export-that-finished-after-it-failed",
    title: "Long-running work on Vercel",
    overview: "The learning path behind \"The export that finished after it failed\": the clock every Vercel Function runs on, why raising it and after() only move the problem, and how Vercel Workflows run work for as long as it needs. Five days of concepts, then two days building a small app that shows both: an inline route that dies and a workflow that finishes.",
    category: "BACKEND",
    level: "INTERMEDIATE",
    learningObjectives: [
        "Say what a function's maximum duration covers on each plan, and recognise the 504 it ends with",
        "Explain why after() changes who waits but not how long work may run",
        "Write a workflow whose steps each fit the function limit, and explain replay",
        "Make steps safe to retry, and stop retries that cannot help",
        "Build a page the user can leave and come back to, reading status by run id",
        "Deploy both versions on Vercel's free plan and watch one fail and one finish",
    ],
    prerequisites: [
        "You can write a Next.js App Router route handler and a client component",
        "You have a Vercel account (Hobby is enough) and Node.js 20 or newer",
    ],
    days: [
        [
            {
                title: "Function limits on Vercel",
                summary: "maxDuration on every plan, the 504, and what the limit covers.",
                notes: `## One request, one invocation, one clock

On Vercel, your route handlers and server actions run as **Vercel Functions**. Each request starts an **invocation**, and every invocation has a **maximum duration**. When it is reached, Vercel ends the invocation and answers:

\`\`\`
504 FUNCTION_INVOCATION_TIMEOUT
\`\`\`

Nothing in your code throws. The platform stops it from outside, wherever it was.

## The numbers

With Fluid compute, which is on by default:

| Plan | Default | Maximum | Extended (beta) |
|---|---|---|---|
| Hobby | 300 s | 300 s | not available |
| Pro | 300 s | 800 s | 1,800 s, per function |
| Enterprise | 300 s | 800 s | 1,800 s, per function |

## What the limit covers

The limit covers the **whole request lifecycle**, including streaming the response. A streamed reply does not buy more time; it spends it.

## Setting it

In the App Router, a route exports it:

\`\`\`ts
// app/api/report/route.ts
export const maxDuration = 60 // this route may run for 60 seconds

export async function POST() { /* ... */ }
\`\`\`

## The trap: it works on your laptop

Next.js writes \`maxDuration\` into a manifest at build time for the platform to enforce. Nothing in \`next dev\` stops a slow route, so a route that takes ten minutes locally works every time, until it is deployed.

## Check yourself

- A route on Hobby needs 6 minutes. What does the user see? (A 504 at 300 s.)
- Does streaming the response give a route more time? (No: the limit covers streaming.)
- Why did it work locally? (Local dev does not enforce maxDuration.)

Source: Vercel, "Configuring maximum duration" and "Functions limitations".`,
            },
        ],
        [
            {
                title: "after() and waitUntil",
                summary: "Work after the reply, on the same clock, with no record.",
                notes: `## Answering first

Next.js's \`after()\` runs a callback **once the response is finished**. It is the right tool for work the user should not wait for: logging, analytics, warming a cache.

\`\`\`ts
import { after } from "next/server"

export async function POST(req: Request) {
  const order = await saveOrder(await req.json())
  after(() => logOrder(order.id)) // runs after the reply goes out
  return Response.json(order)
}
\`\`\`

On Vercel it keeps the invocation alive with the platform's \`waitUntil\`.

## The clock did not move

\`after()\` runs **for the route's default or configured maximum duration**. It is still the same invocation. So moving a 14-minute export into \`after()\` on a route with \`maxDuration = 800\` changes one thing: the user gets a reply at once. The work still stops at 800 s.

## And now it fails quietly

Before, the user saw a 504. With \`after()\` the 202 went out long ago, so there is no response left to carry an error. The work just stops. Nothing:

- records that it started,
- notices that it stopped,
- retries it.

A row that said \`processing\` says \`processing\` forever.

## When after() is right

| Use \`after()\` | Do not use it |
|---|---|
| A few seconds of side work | Anything that can approach the route's limit |
| Work you can afford to lose | Work that must finish, or be retried |
| Logging, analytics, cache warms | Exports, imports, model pipelines, emails people wait for |

## Check yourself

- \`maxDuration\` is 800. How long can a callback in \`after()\` run? (Within the same 800 s.)
- Why did errors go to zero when the export moved into \`after()\`? (No response was left to time out, and stopped work throws nothing.)

Source: Next.js, "after"; Vercel KB, "How to run background jobs in Next.js".`,
            },
        ],
        [
            {
                title: "Workflows and steps",
                summary: "\"use workflow\" and \"use step\", the event log and replay.",
                notes: `## Two directives

Vercel Workflows builds on the open-source **Workflow SDK** (\`npm i workflow\`). It adds two directives to ordinary async functions:

- \`"use workflow"\` marks a function that **orchestrates**: it decides what runs next.
- \`"use step"\` marks a function that **does a unit of work**.

\`\`\`ts
export async function reportWorkflow() {
  "use workflow"
  const lines = []
  for (let step = 1; step <= 10; step++) {
    lines.push(await reportStep(step)) // each call is one step
  }
  return { lines }
}

async function reportStep(step: number) {
  "use step"
  return await runReportStep(step) // the real work: Node.js, npm, fetch, anything
}
\`\`\`

## How it runs

- Each step **compiles into its own route** and runs as **its own function invocation**.
- While a step runs, the workflow is **suspended** and uses nothing.
- Every step's input and output goes into the run's **event log**.

So no single invocation has to last. A run has **no maximum duration**; each step is bounded by the function limit. Split the work so every step fits.

## Replay

After a crash or a deploy, the workflow function is **replayed** from the event log. Steps that already finished return their recorded results instead of running again, and the run carries on from where it stopped.

That is why the workflow function must only orchestrate. It runs in a sandbox without native \`fetch\`, \`setTimeout\`, \`fs\` or \`crypto\`. Anything with a side effect belongs in a step.

## Starting a run

\`\`\`ts
import { start } from "workflow/api"

export async function POST() {
  const run = await start(reportWorkflow) // returns at once
  return Response.json({ runId: run.runId })
}
\`\`\`

In Next.js, wrap the config so the directives are compiled:

\`\`\`ts
// next.config.ts
import { withWorkflow } from "workflow/next"
export default withWorkflow({})
\`\`\`

## Check yourself

- A 14-minute export runs as 10 steps on Pro. What limits it? (Each step's own duration, about 84 s.)
- After a crash, does step 1 run again? (No: its result is in the event log.)
- Why must the workflow function not call the database itself? (It is replayed; side effects belong in steps.)

Source: Vercel, "Workflows" and "Workflow concepts"; Workflow SDK skill notes.`,
            },
        ],
        [
            {
                title: "Retries and idempotency",
                summary: "Retries from the first line, idempotent side effects, FatalError.",
                notes: `## Steps retry

A step that throws is retried, **3 times by default** (so up to 4 runs). Set \`maxRetries\` on a step to change it.

A retried step **starts again from its first line**. It does not resume half way.

## The double email

\`\`\`ts
async function sendLink(exportId: string) {
  "use step"
  await email.send(/* ... */) // 1. succeeds
  await markSent(exportId)    // 2. throws: a blip
}                             // retry: 1. sends again
\`\`\`

The customer gets two emails. Anything a step does to the outside world must be **idempotent**: safe to do twice.

## Making it safe

- **Check before acting**: if it is already sent, return.
- **Give the provider an idempotency key**. \`getStepMetadata().stepId\` is documented for exactly this: a stable id for the step, for operations like charging a customer that must happen once.

\`\`\`ts
import { getStepMetadata } from "workflow"

async function charge(exportId: string) {
  "use step"
  const { stepId, attempt } = getStepMetadata()
  await payments.charge({ amount: 1, idempotencyKey: stepId })
}
\`\`\`

## When retrying cannot help

| Throw | When | What happens |
|---|---|---|
| a plain \`Error\` | A blip: a reset, a timeout | Retried, 3 times by default |
| \`RetryableError\` | It will clear by a known time: a 429 | Retried after \`retryAfter\` |
| \`FatalError\` | A 400, bad input | No retries; the error goes to the workflow |

\`\`\`ts
import { FatalError, RetryableError } from "workflow"

if (res.status === 429) throw new RetryableError("Rate limited", { retryAfter: "5m" })
if (res.status >= 400) throw new FatalError(\`Client error: \${res.status}\`)
\`\`\`

## Check yourself

- A step sends an email, then throws. What happens? (It runs again from the top and sends again, unless guarded.)
- A 400 Invalid address: which error? (FatalError.)

Source: Workflow SDK, "Errors and retrying"; the SDK's StepMetadata type.`,
            },
        ],
        [
            {
                title: "Leaving and coming back",
                summary: "Run ids, status and streams: a page the user can leave.",
                notes: `## The tab is no longer the job

With a workflow, the route starts a run and replies with its **run id**. Store it: on your row, and in the page's URL. Then any page, any time, can ask the run how it is doing.

## Status

\`\`\`ts
import { getRun } from "workflow/api"

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const run = getRun(runId)
  if (!(await run.exists)) return Response.json({ error: "No such run" }, { status: 404 })
  const status = await run.status // pending, running, completed, failed or cancelled
  return Response.json({ status, result: status === "completed" ? await run.returnValue : null })
}
\`\`\`

## Progress, as it happens

A step can write to the run's stream with \`getWritable()\`, and a route can hand that stream to the browser with \`run.getReadable()\`. \`startIndex\` lets a page that comes back ask only for what it has not seen.

\`\`\`ts
const lines = getRun(runId).getReadable({ startIndex: from })
\`\`\`

## Store the run id, not a percentage

A stored percentage is only what the work last said before it stopped. The run knows how it is doing now.

## Watching runs

Every step, input, output, sleep and error is recorded. On Vercel: your project, **Observability**, then **Workflows**. Locally:

\`\`\`bash
npx workflow inspect runs   # recent runs
npx workflow web            # a dashboard in the browser
\`\`\`

## Check yourself

- The user closes the tab at step 4. What happens to the run? (Nothing: it never knew about the tab.)
- What should the row store? (The run id.)

Source: Vercel, "Workflows" (observability, streams); Workflow SDK, getRun.`,
            },
        ],
        [
            {
                title: "Build day 1: the slow function and the 504",
                summary: "The report in ten steps, run inline on Vercel until it dies.",
                code: [
                    { sample: SAMPLE, stage: "inline", file: "lib/report.ts", note: "The slow function: ten steps of 15 seconds, with a knob to fail one step once." },
                    { sample: SAMPLE, stage: "inline", file: "app/api/report/inline/route.ts", note: "The inline route: awaits all ten steps, stopped at 60 seconds." },
                    { sample: SAMPLE, stage: "inline", file: "components/inline-card.tsx", note: "The card: a Run button and a clock that counts until the answer or the 504." },
                ],
                notes: `## What you build today

A small Next.js app with one slow function: a weekly report in **10 steps of 15 seconds**, 150 seconds of work. One route runs it inline and is stopped at **60 seconds**: the 60 stands in for Hobby's 300, so you see the same cliff in a minute instead of five. Every file is in the code viewer below.

## 1. Create the app

\`\`\`bash
npx create-next-app@latest long-jobs-on-vercel --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"
cd long-jobs-on-vercel
\`\`\`

## 2. The slow function

Create \`lib/report.ts\` from the viewer. Each step waits 15 seconds and returns a line of the report. \`FAIL_ONCE_AT\` makes one step throw on its first attempt; you use it tomorrow.

## 3. The inline route

Create \`app/api/report/inline/route.ts\`. Note the first line that matters:

\`\`\`ts
export const maxDuration = 60
\`\`\`

## 4. The page

Create \`components/elapsed.tsx\`, \`components/inline-card.tsx\` and replace \`app/page.tsx\` and \`app/globals.css\`.

## 5. Run it locally, and notice it works

\`\`\`bash
npm run dev
\`\`\`

Press **Run inline**. After about 150 seconds: **Done: 10 steps**. Local dev does not enforce \`maxDuration\`, which is the trap from day 1.

## 6. Deploy, and watch it die

Push to a new GitHub repo, then import it at vercel.com/new (or run \`npx vercel\`). Open the deployment and press **Run inline**. At 60 seconds: **Failed with 504**.

In the Vercel dashboard, open the deployment's **Logs**: the request ends at 60 s with a timeout.

## If something differs

- **It finished in production.** Check that \`maxDuration\` is exported from the route file itself, not from the page.
- **An older project.** Projects deployed before April 23, 2025 without Fluid compute allow at most 60 s on Hobby, so 60 still fits; turn on Fluid compute in the project's Functions settings to match these notes.

## Done when

The deployed page shows a 504 at about 60 seconds, and your local run finished. You have seen the cliff, and why nobody sees it on a laptop.`,
            },
        ],
        [
            {
                title: "Build day 2: the workflow, deployed",
                summary: "The same steps as a workflow, deployed and operated.",
                code: [
                    { sample: SAMPLE, stage: "workflow", file: "workflows/report.ts", note: "The workflow: one step per report step, progress written to the run's stream." },
                    { sample: SAMPLE, stage: "workflow", file: "app/api/report/workflow/route.ts", note: "Starts a run and answers at once with its id." },
                    { sample: SAMPLE, stage: "workflow", file: "app/api/report/workflow/[runId]/route.ts", note: "The run's status, for a page that was closed and opened again." },
                    { sample: SAMPLE, stage: "workflow", file: "app/api/report/workflow/[runId]/progress/route.ts", note: "Each finished step as a line of JSON, from where the page left off." },
                    { sample: SAMPLE, stage: "workflow", file: "components/workflow-card.tsx", note: "The card: run id in the URL, status every five seconds, steps as they finish." },
                ],
                notes: `## What you build today

The same ten steps as a **workflow**. Each step is its own function of about 15 seconds, so nothing comes near any limit, and the run can take as long as it needs. Use **Compare** in the viewer to see exactly what changed since yesterday: a dependency, the config, one workflow file, three routes and a card.

## 1. Install and wrap the config

\`\`\`bash
npm i workflow
\`\`\`

\`\`\`ts
// next.config.ts
import { withWorkflow } from "workflow/next"
export default withWorkflow({})
\`\`\`

Add \`.swc\` to \`.gitignore\`.

## 2. The workflow

Create \`workflows/report.ts\`. The workflow function only loops and calls the step; the step does the work, reads its attempt number, and writes its result to the run's stream.

## 3. The routes and the card

Create the three routes under \`app/api/report/workflow/\` and \`components/workflow-card.tsx\`, then add the card to \`app/page.tsx\` inside \`<Suspense>\` (it reads the URL).

## 4. Run it locally

\`\`\`bash
npm run dev
\`\`\`

Press **Run with Workflow**. Steps appear one by one. Locally, runs are kept by the SDK's local backend; see them with:

\`\`\`bash
npx workflow inspect runs
npx workflow web
\`\`\`

## 5. Leave and come back

Start a run, copy the URL (it has \`?run=...\`), close the tab, wait a minute, open the URL. The card picks up where the run is.

## 6. Make a step fail once

Set \`FAIL_ONCE_AT=4\` (in \`.env.local\`, and in the Vercel project's environment variables), restart, run again. Step 4 fails, is retried from its first line, and the run finishes. In the inspector, step 4 shows a retry.

## 7. Deploy, and compare

Deploy as yesterday. Press both buttons: **inline** dies at 60 s; **workflow** finishes in about two and a half minutes. In the dashboard: **Observability**, then **Workflows** shows the run, each step, and the retry.

## 8. Operate it

- Cancel a run you started by mistake: \`npx workflow cancel <run_id> --backend vercel --project <project> --team <team>\`, or from the Workflows tab.
- Remember: runs stay on the deployment they started on. After a rollback, cancel runs on the bad one.

## Done when

On your deployment, the inline run fails with a 504 at about 60 s, the workflow run completes, a run survives closing the tab, and the Workflows tab shows a step that was retried.`,
            },
        ],
    ],
}
