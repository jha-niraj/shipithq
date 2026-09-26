# worker - ShipItHQ background jobs

Every long-running operation in the product runs here, as a Cloudflare Durable
Object that schedules an **Alarm** and does the work off the request path.
Nothing in this worker does real work inside a `fetch` handler; a fetch only ever
accepts a job.

The rule it exists to enforce: **if it calls an LLM, or sleeps waiting on
somebody else's API, it does not belong in a server action.** A Worker request
has a hard budget, and a 60-second completion is killed long before it finishes -
usually after the user has already been charged.

## The shape

```
server action                      worker (Durable Object)
─────────────                      ───────────────────────
reserve credits (holdId = jobId)
insert background_job (waiting)  →  POST /api/v1/jobs  { type, jobId, input }
                                    ctx.storage.setAlarm(now)   ← returns immediately
return { jobId }                         ↓
                                    alarm() runs the real work
client polls the job             ←  writes status/progress/result to background_job
settle or release the hold on
the first terminal status
```

Credits are decided in the app (`lib/credits/hold.ts`), never in the worker, so
there is one place in the product where a charge or a refund can happen.

## Jobs

| type | class | what it waits on |
|---|---|---|
| `project_generation` | `ProjectGeneration` | one large blueprint completion, then the project/sprints/tasks it implies |
| `verification_generation` | `VerificationGeneration` | OpenAI Assistants run, polled up to 90s |
| `sprint_generation` | `SprintGeneration` | one multi-thousand-token completion |
| `project_quiz` | `ProjectQuiz` | 20 questions on `gpt-4-turbo-preview` |
| `standup_voice` | `StandupVoice` | Sarvam transcript (or typed turns), then an extraction completion |
| `voice_interview_score` | `VoiceInterviewScore` | Sarvam transcript (or typed turns), scored against a rubric |
| `resume_structure` | `ResumeStructure` | one gpt-4o pass turning an uploaded resume's extracted text into a structured draft |
| `resume_tailor` | `ResumeTailor` | a gpt-4o rewrite of a whole resume against a whole job description; writes a copy, never the source |
| `cover_letter` | `CoverLetter` | writes the letter from the resolved resume |
| `resume_ats_score` | `ResumeAtsScore` | scores a resume against a JD on gpt-4o-mini |
| `cover_letter_questions` | `CoverLetterQuestions` | the tailored questions asked before a letter is written |
| `resume_import` | `ResumeImport` | up to four Exa scrapes and six GitHub REST calls, then a gpt-4o pass. The longest non-model wait in the product |
| `practice_tests_generate` | `PracticeTestsGenerate` | one gpt-4o pass writing a C++ harness, reference solution and tests for a DSA problem, then the reference solution run against every test in the code executor. Marks the problem `ready` only if it passes; one repair attempt with the failing cases |
| `practice_memory_update` | `PracticeMemoryUpdate` | one gpt-4o-mini extraction over the new part of a guided DSA conversation, merged into the session's mentor state and the user's learner profile; applied at most once per window (watermark-guarded transaction) |
| `practice_reflect` | `PracticeReflect` | one gpt-4o pass writing the closing feedback for a finished guided DSA session; the score comes from recorded facts (100 optimal, 70 brute force), and the app applies completion and XP from the stored result |
| `company_scrape` | `CompanyScrape` | Firecrawl: up to 7 map searches and 12 page scrapes of a company's own site, then one gpt-4o-mini pass drafting its profile into `company_profile_draft`. Every field must cite a page it came from, and short facts must appear on that page |

## Adding a job type

**Five** edits, all five or none:

1. add the type to `JOB_TYPES` in `packages/db/src/schema/worker.ts` (text
   column, so no migration)
2. add a class in `src/jobs/` extending `JobDurableObject` - implement `run()`
   and nothing else
3. add it to `JOB_BINDINGS` in `src/env.ts` and export it from `src/jobs/index.ts`
4. add the binding **and** a NEW migration tag in `wrangler.jsonc` - tags are
   append-only, so never add classes to a tag that has already been deployed
5. **export the class from `src/index.ts`.** Wrangler binds Durable Objects by
   looking them up on the entry module's exports; a class it cannot find there
   has a binding with nothing behind it.

Step 5 said "four edits" until 2026-08-27 and did not exist, which is exactly how
`ResumeStructure` shipped bound-but-not-exported: it was correct in all four of
the places the list named. Nothing catches that. `tsc` is happy, the binding
type-checks, and the failure surfaces at dispatch - after the app has inserted
the `background_job` row and put a hold on the user's credits.

Then dispatch from the app with `startBackgroundJob(type, input, { cost })`.

`input` must be a **pointer** (ids), never a payload: minutes can pass before the
alarm fires, and every job re-reads current data rather than acting on a snapshot
that is already stale.

Two jobs carry a small payload anyway, and both are the same exception: a label
or some pasted text that has no row to point at (`resume_structure`'s
`draftName`, `resume_import`'s `pastedText`). Neither can go stale, because
neither exists anywhere else. Cap anything like that at the call site - a Durable
Object storage value is size-limited, and an oversized input fails the *dispatch*,
which is a much worse error to explain than a failed job.

## What `JobDurableObject` handles for you

- **Duplicate-run guard.** Two dispatches of the same jobId land on the same
  object; the second is refused. With credits held against the job, a second run
  is a second charge.
- **Catch, never rethrow.** A thrown alarm is auto-retried by the platform, which
  would run the whole job again.
- **Bounded retries.** Throw `RetryableError` for failures where nothing was
  decided yet (a 5xx from an upstream API); it is retried twice with backoff via
  another alarm. Everything else fails immediately, because it would fail
  identically on a retry.
- **Stale-run recovery.** A DO evicted mid-alarm never resumes. The re-fired
  alarm sees the run has gone stale and fails the job, so the app refunds -
  instead of the job sitting at `active` forever.
- **Storage sweep.** A finished job's DO storage is deleted by a later alarm.
- **Best-effort status writes.** A failed progress write never aborts a run the
  user has paid for.

## Stepped jobs (one alarm per step)

For a job that makes several slow calls in a row (`job_import`, plan/job-import),
extend `SteppedJob` (`src/jobs/stepped-job.ts`) instead of `JobDurableObject` and
implement `firstStep`, `initialState`, `runStep` and `labelFor`. Each alarm runs
one step, saves the job's state (the checkpoint), writes a status the app shows,
and schedules the next step. The rules live in `src/jobs/stepped-core.ts`, which
has no Workers imports, and are checked by `npx tsx scripts/stepped-core.check.ts`.

- A step returns `{ next, state }`, `{ next: null, state }` (done) or
  `{ wait: "label", state }` to pause until the app posts `/resume` with the step
  to continue from (e.g. after the student pastes a job's text).
- `RetryableError` retries **that step only**, twice with backoff; anything else
  fails the job at once.
- An eviction mid-step re-runs only that step once it has gone stale (3 minutes),
  at most twice, then fails the job; an eviction between steps just resumes.
- Steps must be safe to re-run: upserts or guarded updates, never blind inserts.

The five edits in "Adding a job type" apply unchanged.

## Routes

| | |
|---|---|
| `POST /api/v1/jobs` | dispatch. Body `{ type, jobId, input }`, `Bearer` a token signed with `action: "start_job"` and this `jobId` |
| `GET /api/v1/jobs/:jobId?type=…` | live phase straight from the DO. The app normally polls `background_job` instead |
| `POST /api/v1/generateproject` | legacy alias, still used by apps/uni |
| `POST /api/v1/generateverification` | legacy alias |
| `GET /health` | |

## Local development

```bash
cp .env.example .dev.vars     # wrangler reads .dev.vars for `wrangler dev`
pnpm dev                      # serves on :8787
```

`apps/main` falls back to `http://localhost:8787` when there is no service
binding, which is always the case under `next dev`.

Jobs that run code (`practice_tests_generate`) need the code executor. Locally,
run its container server directly and point the worker at it with
`EXECUTOR_URL` in `.dev.vars`; when set, it wins over the `CODE_EXECUTOR`
binding, which under `wrangler dev` points at a worker that is not running:

```bash
cd apps/shipitworker/container && PORT=8080 node server.mjs
# .dev.vars: EXECUTOR_URL="http://localhost:8080"
```

To fill a development database with DSA judge assets without deploying,
`scripts/generate-judge-assets.ts` runs the same generation code as the job
(usage at the top of the file).

## Deploying

```bash
pnpm release      # build + wrangler deploy --secrets-file .env.production
```

Use `release`, not `deploy` - `pnpm deploy` is a built-in pnpm command that
shadows the script. See `DEPLOYMENT.md` at the repo root for the ordering
against `apps/main` and `apps/uni`, which bind to this worker by name.
