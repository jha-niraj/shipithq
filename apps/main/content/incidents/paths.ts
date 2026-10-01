/**
 * The hand-written Pathfinder path for each incident (plan/pathfinder PF-13, plan/incidents
 * INC-32). One shared goal per case, owned by the ShipItHQ account, seeded by
 * `pnpm script incident-paths`. "Adopt this path" on the incident copies it into the
 * reader's own goals.
 *
 * The topics are the case's `learn` list, in order; each carries notes written here,
 * not generated, and grounded in the same sources as the case. Keep the titles in step
 * with `learn`: the seed refuses a path whose titles drift from it.
 */

import { VERCEL_PATH } from "./paths-vercel"

export interface PathTopic {
    title: string
    /** One line, shown under the title in the plan. */
    summary: string
    /** The topic's notes, in markdown. Seeded as the Studio's EXPLANATION step. */
    notes: string
    /**
     * Files of a code sample to read on this day (plan/long-jobs-vercel LJV-9), each seeded as
     * a CODE Studio step whose metadata names the sample, stage and file.
     */
    code?: { sample: string; stage: string; file: string; note: string }[]
}

export interface IncidentPath {
    /** The goal's slug on the ShipItHQ account. */
    slug: string
    title: string
    overview: string
    category: "BACKEND"
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    learningObjectives: string[]
    prerequisites: string[]
    /** Topics grouped by day, in order. */
    days: PathTopic[][]
}

const DEMO: IncidentPath = {
    slug: "incident-the-demo-that-died-at-30-seconds",
    title: "Long-running work on Cloudflare Workers",
    overview: "The learning path behind \"The demo that died at 30 seconds\": where work actually lives during a request, the limits that end it, and how to move slow work into a background job that survives a closed tab, a refresh and a deploy.",
    category: "BACKEND",
    level: "INTERMEDIATE",
    learningObjectives: [
        "Tell CPU time, waitUntil and the connection apart, and say which one ended a request",
        "Move slow work into a Durable Object alarm that runs with no browser attached",
        "Design a job with a status row the page can poll",
        "Notice a job that was switched off, not failed, and clean it up",
        "Ship a background job that is safe to retry and proven in production",
    ],
    prerequisites: [
        "You can write an HTTP handler and call an API with fetch",
        "You have deployed at least one Worker, or are happy to try",
    ],
    days: [
        [
            {
                title: "Long-running work on Cloudflare Workers",
                summary: "Where work lives during a request, and the three limits that end it.",
                notes: `## Where your work lives

When a request reaches a Worker, Cloudflare runs your handler inside an **isolate**: a small sandbox that exists for as long as the request needs it. Everything your handler starts (a model call, a database write, a loop) lives inside that request. If the request goes away, the work goes with it.

## Two clocks

A request is measured by two different clocks:

- **Wall-clock time** counts everything, including time spent waiting on a network call.
- **CPU time** counts only the moments your code is actually executing.

While your handler \`await\`s a slow API, the isolate is parked. Two minutes on the wall clock can be a fraction of a second of CPU. That is why a request can run for minutes without hitting a CPU limit.

## The three limits people confuse

| | What it counts | Default | Can you raise it? |
|---|---|---|---|
| CPU time | Only time your code executes | 30 seconds | A standalone Worker can go up to 300,000 ms with \`limits.cpu_ms\`. In a Workers for Platforms dispatch namespace, no. |
| \`waitUntil\` | Real time after the response is sent | 30 seconds | No. |
| The connection | Until the browser goes away | No limit from Cloudflare | It is the browser's to end: a closed tab or a refresh. |

"Workers kill requests at 30 seconds" mixes these up. They share a number, not a cause.

## What makes CPU time run out

Waiting is cheap. **Streaming** is not: if you stream a model's answer, your code parses every chunk, stitches tokens together and fires callbacks the whole way through. That is real CPU work, proportional to the length of the answer. A long streamed reply can spend a 30-second CPU budget on its own.

## Try it

1. Write a Worker that awaits a 90-second \`setTimeout\` wrapped in a promise, then returns. Deploy it and call it with \`curl\`. It finishes: waiting is not CPU.
2. Call it again and press Ctrl+C after 20 seconds. Add a log after the wait. The log never appears: the connection ended, and the work ended with it.

## Check yourself

- A request spends 2 minutes waiting on an API and 50 ms parsing the reply. Which limit is it near? (None of them.)
- Why does "it kept working when I switched tabs" prove nothing about background work? (Switching tabs keeps the connection open.)`,
            },
            {
                title: "Durable Objects and alarms",
                summary: "Running work with no browser attached, and surviving closed tabs.",
                notes: `## Why a request is the wrong home for slow work

Ask one question of any long job: **must it survive the tab closing?** If yes, it cannot live inside the request, because the request ends when the browser does.

On Workers there are four places work can run:

- **Inside the request.** Ends when the connection ends.
- **\`waitUntil\`**, after the response. Capped at 30 seconds of real time.
- **A Durable Object alarm.** Runs later, with no browser attached.
- **A cron trigger.** Runs on a schedule, not per job.

For a job a user starts and waits on, the alarm is the one that fits.

## Durable Objects in one paragraph

A Durable Object is a single, addressable instance with its own storage. You reach it by id. Two requests that ask for the same id reach the same object, which makes it a natural owner for one job.

\`\`\`ts
const id = env.JOBS.idFromName(jobId) // same job id, same object
const stub = env.JOBS.get(id)
await stub.start(input)
\`\`\`

## Alarms

Each Durable Object can schedule **one alarm at a time** with \`setAlarm()\`. When the time comes, Cloudflare calls the object's \`alarm()\` handler. It is a fresh run, with no request and no browser behind it.

\`\`\`ts
export class Job extends DurableObject {
  async start(input) {
    await this.ctx.storage.put("input", input)
    await this.ctx.storage.setAlarm(Date.now()) // run as soon as possible
  }
  async alarm(info) {
    const input = await this.ctx.storage.get("input")
    // do the slow work here; no browser can cancel it
  }
}
\`\`\`

## What the docs promise

- \`alarm()\` has **at-least-once** execution. If it throws, Cloudflare retries it with exponential backoff, starting at 2 seconds, **up to 6 retries**.
- Only one \`alarm()\` runs at a time per object.
- \`alarmInfo.isRetry\` and \`alarmInfo.retryCount\` tell you when you are on a retry.

At-least-once means *possibly more than once*. The next topics are about living with that.

## Try it

Build the object above. Start a job, close the browser immediately, and read the object's storage a minute later. The work finished with no one watching.`,
            },
        ],
        [
            {
                title: "Background jobs with a status row",
                summary: "Start, run elsewhere, poll: the shape every platform recommends.",
                notes: `## The shape

Every platform that puts a limit between a user and a slow request recommends the same fix, under different names:

1. **Start.** The button's request creates a job and hands it to a worker. It replies at once with the job id.
2. **Run elsewhere.** The worker (here, a Durable Object alarm) does the slow part.
3. **Poll.** The page asks for the job's status every few seconds until it is done.

## The status row

Keep one row per job in your database, and make it the single source of truth:

| column | why |
|---|---|
| \`id\` | the job id the page polls |
| \`status\` | \`waiting\`, \`working\`, \`done\`, \`failed\` |
| \`progress\` | a number and a label, so a long wait is not a frozen spinner |
| \`result\` or \`error\` | what the page shows when it ends |
| \`updated_at\` | when the job last proved it was alive |

The worker writes it; the page only reads it. A refresh just starts polling again. Coming back tomorrow reads \`done\`.

## Starting twice

A double click, or the same page open in two tabs, should not run the job twice. Derive the Durable Object from the job id (\`idFromName(jobId)\`) and have \`start()\` refuse when the job is already running. If the job costs credits, hold them when it starts and settle or refund when it ends, so a failure never charges.

## What the page shows

- \`waiting\` or \`working\`: the progress label and number.
- \`done\`: the result.
- \`failed\`: the error, and a way to try again.

## Heroku, Vercel, AWS: same fix

Heroku's router gives up after 30 seconds, but your app keeps running, so a user who retries runs the work twice. API Gateway has a 29-second default. Vercel caps a function's duration per plan. The numbers and the failure modes differ; the fix is the same shape.

## Try it

Add a \`jobs\` table, a \`POST /jobs\` that inserts a row and calls the Durable Object, and a \`GET /jobs/:id\` that returns the row. Poll it from a page every 2 seconds.`,
            },
            {
                title: "Failures that leave no trace",
                summary: "Cancelled runs, missing env in background jobs, and how to see them.",
                notes: `## Nothing failed. Something stopped.

A careful job sets \`working\`, does the work, sets \`done\`, and in a \`catch\` sets \`failed\`. It can still sit at \`working\` forever with no error. Why?

Error handling protects you from errors your code **throws**. It cannot protect you from your code being **switched off**. When a request's connection closes, the isolate stops running that request's code mid-\`await\`. There is no one left to run the \`catch\`.

> A cancelled process cannot report that it was cancelled. Any design that waits for \`failed\` to be written will wait forever on exactly the failure that matters most.

## So something else has to notice

Add a **reaper**: a rule, run on a schedule, that says "working for more than N minutes with no progress means it died".

\`\`\`sql
update jobs
set status = 'failed', error = 'Stopped without finishing'
where status = 'working'
  and updated_at < now() - interval '10 minutes';
\`\`\`

Pick N longer than your slowest honest run, and have the job touch \`updated_at\` whenever it makes progress.

## The second incident: an alarm with no secrets

Moving the work into an alarm is where the next silent failure usually appears. The job starts, sits at \`working\` with **zero events and no error**, and the page polls forever.

On OpenNext, your app's secrets often come from your \`.env\` file, baked into the bundle at build time, and only OpenNext's request handler copies them into \`process.env\`. An alarm never passes through that handler. So the first thing your job does, reading an API key or a database URL, finds nothing, and it can fail before it has written a single event.

The fix: at the very start of \`alarm()\`, copy the real bindings and the baked \`.env\` values into \`process.env\`, and only then load the app code that reads them.

## Make it visible

- Write an event at every step, starting with "started". Zero events means it died before the first line of your code.
- Log the job id with every line.
- Treat "no error and no progress" as its own state, not as "still running".`,
            },
        ],
        [
            {
                title: "Operating it: retries, reapers, timeouts",
                summary: "Idempotency, one run per job, and proving it in production.",
                notes: `## Four things that bite after it ships

| What happens | What to do |
|---|---|
| **Alarms retry.** If \`alarm()\` throws, Cloudflare runs it again, up to 6 times. Anything that charges or emails does it twice. | Make the work **idempotent**, or catch inside the alarm and write a final status yourself. |
| **Two tabs, two runs.** A fresh object per click runs the job twice. | Derive the object from the job id (\`idFromName\`) and refuse a second start. |
| **Stuck rows stay stuck.** Shipping the fix does nothing for jobs already frozen at \`working\`. | Fail them once, on purpose, and decide whether to retry. |
| **No timeout, no end.** Without a connection, a call that never answers hangs forever. | Give every outbound call a timeout shorter than your CPU budget. |

## Idempotent, concretely

A step is idempotent when running it twice leaves the same result as running it once. Two common ways:

- **Check before you act.** "If this job already has a result, return it."
- **Use a key the other side understands.** Payment and email APIs accept an idempotency key; pass the job id.

Because retries are capped at 6, the docs recommend catching errors inside \`alarm()\` and scheduling a new alarm yourself when you want a job to keep retrying through a long outage.

## Timeouts

\`\`\`ts
const res = await fetch(url, { signal: AbortSignal.timeout(25_000) })
\`\`\`

An abort is an error your code can catch, which means the job can write \`failed\` and stop, instead of hanging where no reaper has looked yet.

## Prove it the physical way

Local tools will not show you these failures: neither \`next dev\` nor the local preview enforces the Worker limits. So:

1. In production, start the longest run you have.
2. Wait until it writes its first progress.
3. Close the browser entirely.
4. Wait the run's length plus a minute.
5. Read the row. It should say \`done\`.

Then do it again with a deploy in the middle, and once more with a forced error, and read the row each time.

## You are done when

- A closed tab, a refresh and a deploy each leave the job finishing or clearly failed.
- A double click runs one job.
- No row stays at \`working\` longer than your reaper allows.`,
            },
        ],
    ],
}

const LOGIN: IncidentPath = {
    slug: "incident-the-login-that-said-yes-to-guessing",
    title: "Protecting logins",
    overview: "The learning path behind \"The login that said yes to guessing\": why a login needs something counting the guesses, the ways to count, the attacks that slip past one counter, and how to answer in grades instead of a hard lock.",
    category: "BACKEND",
    level: "INTERMEDIATE",
    learningObjectives: [
        "Explain why a correct login still needs rate limiting",
        "Choose between a fixed window, a sliding window and a token bucket",
        "Recognise brute force, credential stuffing and password spraying",
        "Design graded answers from several signals without locking real users out",
        "Keep counts correct across many servers, and decide fail open or fail closed",
    ],
    prerequisites: ["You know what an HTTP status code is", "You have built or used a login form"],
    days: [
        [
            {
                title: "How logins fail under guessing",
                summary: "What a login does, and why nothing in it counts.",
                notes: `## A login judges each attempt alone

A login does three things: look up the account, check the password against the stored hash, and answer \`200\` or \`401\`. Each attempt is judged on its own. Nothing in those steps remembers the attempt before.

## The hash is slow on purpose

Services store a slow, one-way hash of your password, not the password. Slow is the point: if the database leaks, each guess against it costs real time. But slow hashing is **not** a rate limit. A script can still send as many guesses as it likes, and each one makes your server do that slow work.

## The arithmetic

Ten guesses a second is 36,000 an hour, or 864,000 a day, against one account. A weak password falls long before that.

## What to take away

- A \`401\` is the right answer to one wrong guess. It is not a defence.
- The missing piece is something that **counts** attempts and changes the answer when there are too many.

## Try it

Open the case's simulator, pick "One email" and "None", and watch the account fall at guess 3,000.`,
            },
        ],
        [
            {
                title: "Rate limits: windows and buckets",
                summary: "429, Retry-After, and three ways to count.",
                notes: `## 429 Too Many Requests

The status code for "you've sent too many requests in a given amount of time". The response should explain the condition, and it may carry a **\`Retry-After\`** header: a number of seconds, or a date to come back. A 429 must **not** be stored by a cache.

The standard deliberately does not say *how* to count or *per what*. That design is yours.

## Refuse before the expensive part

Put the check before the password hash. A refused guess teaches the attacker nothing and costs your server almost nothing.

## Three ways to count

| | Counts | The catch |
|---|---|---|
| Fixed window | since the minute began on the clock | 5 at 12:00:59 and 5 at 12:01:00 all pass |
| Sliding window | the last 60 seconds, from now | store when each attempt happened |
| Token bucket | tokens left, refilling steadily | allows a burst up to the bucket's size |

A sliding window or a token bucket closes the fixed window's edge. A bucket is the natural fit when you *want* to allow a small burst (a person retyping quickly) but not a stream.

## Try it

"One email" against "Counter per email": the attacker drops from 120 guesses a minute to about 5.`,
            },
        ],
        [
            {
                title: "Spraying, stuffing and lockouts",
                summary: "The attacks that slip past one counter, and the fix that locks people out.",
                notes: `## Three shapes of the same attack

- **Brute force:** many passwords against one account.
- **Credential stuffing:** email and password pairs leaked from other sites, tried here.
- **Password spraying:** one common password against many accounts, one guess each.

A counter per email stops brute force and is blind to spraying: each email sees one failure.

## The lockout trap

Tightening the fix to "lock the account after 5 failures" stops guessing, and lets anyone lock a real person out by typing their email wrong five times. Guidance on logins warns about exactly this: a lockout must not become a denial of service. If you lock at all, keep it short, grow it gradually, and never block password recovery.

## The botnet

Counting per IP address catches a spray from one machine. A botnet sends each guess from a different address, so no address fails twice. Blocking addresses stops simple attacks; it should never be the only defence. And the reverse problem: an office or a mobile network puts many real people behind one address.

## Try it

"Password spray" against "Counter per email" (40 accounts), then "One email" against "Lock the email" (Sam is locked out), then "Botnet spray" against "Counter per address".`,
            },
        ],
        [
            {
                title: "Signals and graded responses",
                summary: "Many signals, one score, and answers between yes and no.",
                notes: `## No single counter is enough, so they vote

Signals that are useful together:
- failures on this **email** recently
- failures from this **address** recently
- whether this is a **device** seen before (a browser with a sign-in cookie)
- whether the whole service is failing far more logins than usual (a **spike**)

They add up to one score.

## Graded answers

| Score | Answer | Costs a person | Costs a script |
|---|---|---|---|
| low | allow | nothing | nothing |
| rising | slow down (a growing delay) | a second | its whole rate |
| high | ask for proof (a code, a bot check) | a moment | the attack |
| certain | refuse | (should be nobody) | everything |

Standards guidance lists the same tools: waits that grow as failures pile up, a bot check, and risk-based signals like the address, location, timing and browser.

## Close the enumeration leak

"No account for that email" and "wrong password" must look the same: the same message and the same work done, so the timing matches too. Otherwise the login tells anyone who has an account.

## Try it

"Combined score" against every attack: the attackers are stopped, and the 30 office staff and Sam still get in.`,
            },
        ],
        [
            {
                title: "Running limiters at scale",
                summary: "Shared counters, Cloudflare's options, and failing open or closed.",
                notes: `## One count, many servers

A count kept in each server's memory sees only the requests that server got. Spread an attack across ten servers and each sees a tenth: nobody trips the limit. The count must live in **one shared place**, and adding one must be a single step so two requests can't both read 4 and both write 5.

## On Cloudflare

- **A Durable Object per key:** every request for a given email reaches the same object, which holds that count exactly. The right tool for an exact per-account count.
- **The rate limiting binding:** simple and fast, but it counts **per Cloudflare location**, catches up a moment late, and its window is 10 or 60 seconds. It is deliberately permissive, not an accounting system: good for a coarse endpoint limit, not an exact count per account.

## Decide the failure mode first

If the counter store is unreachable:
- **Fail open:** logins proceed unlimited. Real users are fine; guessing is possible until it's back.
- **Fail closed:** nobody can log in. Safe from guessing; an outage for everyone.

Many teams fail open for a short time with alerting, and closed for the most sensitive actions. Whatever you choose, write it down before the outage.

## The same shape everywhere

One-time codes (a million six-digit codes), password reset, sign-up, invite links, API keys: anything that answers yes or no to a guess needs something counting the guesses.`,
            },
        ],
    ],
}

export const INCIDENT_PATHS: Record<string, IncidentPath> = {
    "the-demo-that-died-at-30-seconds": DEMO,
    "the-login-that-said-yes-to-guessing": LOGIN,
    "the-export-that-finished-after-it-failed": VERCEL_PATH,
}

/** The ShipItHQ account that owns every official path (plan/pathfinder decision, 2026-09-27). */
export const PATH_OWNER = { email: "team@shipithq.com", name: "ShipItHQ", username: "shipithq" } as const
