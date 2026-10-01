# Case 3: "The export that finished after it failed" (outline for review)

Topic: Serverless and edge (also Queues and background jobs). About 25 minutes, 10 chapters.
Written for the ear, each chapter opening on a hook. No code in chapters 1 to 5; real code
from chapter 6 on, in the code viewer. Status: approved 2026-10-01 (LJV-1).

A composite. The company, people and times are the story's own and marked (example). Every
platform behaviour is cited: S1 duration, S2 limitations, S3 `after`, S4 Workflows, S5
concepts, S6 pricing and limits, S7 errors and retrying, S8 background jobs guide, SRE.

**The company (example):** Tallyroom, a small analytics product on Vercel Pro. One feature
matters here: "Export the year", which builds a CSV and a PDF of a customer's year and
charges one export credit.

**The system map:** Browser, Export route (a Vercel Function), Database (the `exports` row),
Blob storage (the files), Email. The fix adds Workflow runtime (queue and event log) and
Steps; `after` moves the Export route's work into the runtime.

---

## What happened

### 1. The spinner that ended in a 504
- **Hook:** "The button said 'Exporting'. Five minutes later it said something else. What?"
- **Story:** Monday (example). An accounting firm presses Export the year. The tab spins for
  five minutes, then shows Vercel's error page. They press it twice more. Three credits gone,
  no file.
- **See (log):** `POST /api/export 504 FUNCTION_INVOCATION_TIMEOUT` at 300.0 s, three times.
- **Diagrams:** the pinned map, broken part the Export route, blast radius Browser and Email.
  Timeline: press, 300 s, retry, retry, ticket.
- **Check:** single choice, what ended the request (the function hit its maximum duration;
  not the database, not the browser). Pick on the map: where did the work stop.

### 2. Where the five minutes went
- **Hook:** "Nobody wrote a five-minute timeout. So who did?"
- **Sequence (builds):** Browser -> Export route -> Database, 12 queries -> Blob -> the cut
  at 300 s. The response the browser waited for never comes.
- **Beats:** a Vercel Function has a maximum duration; past it the platform terminates the
  invocation and answers 504 FUNCTION_INVOCATION_TIMEOUT (S2). It covers the whole
  lifecycle, including streaming the response (S2). Defaults (S1): Hobby 300 s and no
  more; Pro and Enterprise 300 s by default, up to 800 s, 1800 s in beta.
- **Compare:** Hobby / Pro / Enterprise: default, maximum, extended.
- **Note:** "The export was charged before the work and the work never finished. That order
  is its own bug, and chapter 9 comes back to it."
- **Check:** true/false, "a streamed response is exempt from the limit" (false, S2).

### 3. Fix one: turn the dial
- **Hook:** "There is a number in a config file. Change it and the 504 goes away. For how
  long?"
- **Story:** they set `maxDuration = 800` on the route. Exports finish. Tickets stop for
  three weeks (example).
- **Dashboard (illustrative):** export duration p95 creeping up week by week as customers'
  years fill with data; a dashed line at 800 s.
- **Story turn:** the largest customer's export takes about 14 minutes (example). It dies at
  800 s with the same 504. And everyone else's export holds a tab open for up to 13 minutes.
- **Beats:** raising the limit moves the cliff, it does not remove it. And the user still
  cannot leave: the file arrives in the response, so the tab is the job.
- **Check:** order, "what happens as data grows" (duration rises, crosses the new limit,
  504 returns).

### 4. Fix two: answer first, work after
- **Hook:** "What if the page did not wait at all?"
- **Story:** they answer `202 We'll email it to you` and move the work into `after()`. The
  page is instant. Tickets about spinners drop to zero.
- **Sequence (tabs: "What they hoped" / "What happens"):** response at 0.2 s, then the work
  continues on the same invocation, until the same clock ends it.
- **Beats:** `after` runs once the response is finished, for the route's default or
  configured max duration (S3). The clock did not move; only the person watching it did.
  Nothing records that the work started, so nothing notices that it stopped, and nothing
  retries it.
- **States diagram:** queued -> processing -> done, with processing -> (nothing) as the stuck
  state. The row the user sees says "processing" forever.
- **Check:** buckets, "what `after` changes / what it does not" (when the user gets a reply /
  the time limit, retries, a record of progress).

### 5. Nothing failed loudly
- **Hook:** "The error rate went to zero the week things got worse. How?"
- **Dashboard (illustrative):** 504s fall to zero after fix two; "exports processing for over
  20 minutes" climbs. Emails sent falls below exports requested.
- **Causes (right to left):** symptom: exports stuck in processing, no email. Trigger: a
  long export reaches the route's max duration inside `after`. Contributing: no record of
  progress, no retry, success measured by 5xx rate. Latent: the job lived inside a request.
- **Beats:** fix two turned a loud failure into a quiet one. The same lesson as case 1, on a
  different platform: a stopped job is not an error.
- **Check:** pick on the map, "every part that knew the job had stopped" (none: the answer is
  a deliberate trick question rendered as "Nothing"; or, if pick needs a part, the Database
  row that still says processing). Decide while writing; the check script must pass.

## How it was fixed

### 6. A function that can be paused
- **Hook:** "What if the job were a list of steps, and something remembered which ones were
  done?"
- **Beats:** Vercel Workflows (S4, S5). `"use workflow"` marks an orchestrating function;
  `"use step"` marks a unit of work. Each step compiles into its own route and runs as its own
  function invocation; between steps the workflow is suspended and costs nothing. Inputs and
  outputs go into an event log; after a crash or a deploy the workflow replays from the log
  and carries on where it stopped (S5). A run has no duration limit; each step is bounded by
  the function limit (S6).
- **Map change:** add Workflow runtime and Steps; the Export route now only calls `start()`
  and returns the run id.
- **Sequence (after):** Browser -> route: start() -> runId (0.3 s) -> step 1 ... step 10, each a
  separate invocation -> email.
- **Code viewer:** the `workflow` stage, `workflows/report.ts`, then Compare against `inline`.
- **Check:** single choice, "a 14-minute export of 10 steps on Pro: what limits it now?" (each
  step's own duration, not the total).

### 7. The step that ran twice (the twist)
- **Hook:** "Step 9 failed, retried, and succeeded. The customer got two emails. Why?"
- **Beats:** a step that throws is retried, 3 times by default (S7). A retried step starts
  again from its first line, it does not resume halfway (S7). Step 9 sent the email and then
  failed writing the 'sent' flag; the retry sent it again. Side effects in a step must be
  idempotent (S7): key the send on the export id and step, check before you act. A 4xx from a
  provider is not going to improve on retry: `FatalError` stops the loop; `RetryableError`
  sets when to try again (S7).
- **Check:** buckets: FatalError / RetryableError / let it retry (invalid email address;
  rate limited for 5 minutes; a network blip).

### 8. Leaving and coming back
- **Hook:** "The user closes the tab at step 4 and comes back at lunch. What should they see?"
- **Beats:** the export row stores the run id; the page reads the run's status, or reads the
  run's stream for progress (S4: streams). The tab is no longer the job. The Observability >
  Workflows tab shows every run, step, input, output and error (S4).
- **Code viewer:** the status route and the progress component.
- **Compare block:** the same fix on Cloudflare (Niraj's table): `"use workflow"` /
  `WorkflowEntrypoint.run`, `"use step"` / `step.do`, `sleep` / `step.sleep`, `start` /
  `env.X.create`. Link to case 1.
- **Talk:** "Why is a run id a better thing to store than a percentage?"

### 9. Operating it
- **Hook:** "You roll back a bad deploy. The workflow runs on the bad one keep going. Is that
  a bug?"
- **Beats:** runs stay on the deployment they started on, so a deploy does not break a
  running export (S5, skew protection). The same pinning means a rollback does not stop runs
  on the old deployment; cancel them from the Workflows tab or the CLI (S5). Replays that take
  over 240 s may be aborted, and runs past 2,000 events replay slower: batch small items into
  one step (S6). Charge on the settled result, not on the button press.
- **Checklist:** the after-ship list (alerts on runs older than N minutes, cancel on
  rollback, idempotent side effects, charge on completion).
- **Check:** single choice on what to do after a rollback.

### 10. How to run this one
- Severity (SEV-2, example, why), roles (incident commander, comms, ops), status updates
  (example), runbook: find exports stuck in processing, refund their credits, re-start them as
  runs. Cited to the SRE book like cases 1 and 2. Check: who talks to the customer.

## After the chapters
- **Predict / round / postmortem:** as cases 1 and 2. Postmortem written as a composite, with
  points per section.
- **Simulator:** controls: approach (inline / bigger limit / after / Workflow), export length
  (2, 6, 14 minutes), a crash at step N (on / off), a deploy mid-run (on / off). Lanes: the
  request, the work, the record, the email. Faithful: the limits and what `after` shares;
  illustrative: the timings.
- **Closing talk (mock):** role, opening, probe, as the other cases.
- **Build it:** the path and the project.
