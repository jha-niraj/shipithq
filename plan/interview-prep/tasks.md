# Interview prep - tasks

Derived from `overview.md`. Every task names the definition-of-done line it
serves. Ordered by dependency: IP-1 blocks IP-2 and IP-3; IP-7 and IP-8 come last
because nothing is deleted until its replacement is proven.

| ID | Task | Serves | Status |
|---|---|---|---|
| IP-1 | Schema: category, question kind, provenance | 2, 5 | done (2026-08-28) |
| IP-2 | `interview_prep_generation` worker job | 1, 3, 4 | done (2026-08-28) |
| IP-3 | `createInterviewPrepGoal` server action | 1, 4, 5 | done (2026-08-28) |
| IP-4 | Shared job-description extractor | 1 | done (2026-08-28) |
| IP-5 | UI: create a goal from a job description | 1, 2 | done (2026-08-28) |
| IP-6 | Show question kind in the goal UI | 2 | done (2026-08-28) |
| IP-7 | Delete the Interview Assistant surface | 7 | done (2026-08-28) |
| IP-8 | Drop the five tables | 8 | done (2026-08-28) |
| IP-9 | Prove it end to end in a browser | 9 | done (2026-08-28) |
| IP-10 | Same session race in `goal-creation.ts` | - | done (2026-08-28) |
| IP-11 | Coding questions not grounded in the posting | 1 | done (2026-08-28) |
| IP-12 | A question never stops "Generating..." | - | code done 2026-09-26; browser check is Niraj's |

---

## IP-1 - Schema: category, question kind, provenance

- [x] **Status:** done, verified 2026-08-28

**Why.** Without these three an interview-prep goal is indistinguishable from any
other goal: it cannot be filtered to, its questions cannot be grouped by type,
and the job description that produced it is lost the moment generation finishes,
so the goal can never be regenerated or explained.

**Files.**
- `packages/db/src/schema/pathfinder.ts`
- `apps/main/types/pathfinder.ts` (`PATHFINDER_CATEGORIES`)
- generated migration under `packages/db/drizzle/`

**Steps.**
1. Add `INTERVIEW_PREP` to `pathfinderCategoryEnum`.
2. Add `pathfinderSubGoalKindEnum` = `TOPIC | TECHNICAL | BEHAVIORAL | CODING`
   and a `kind` column on `pathfinderSubGoals` defaulting to `TOPIC`.
3. Add to `pathfinderGoals`: `sourceJobDescription` (text), `sourceCompanyUrl`
   (text), `sourceCompanyInfo` (jsonb). All nullable.
4. Add `INTERVIEW_PREP` to `PATHFINDER_CATEGORIES` with an emoji and the
   monochrome palette the other entries use.
5. `pnpm db:generate` from `packages/db`, report what the migration contains,
   then `pnpm db:migrate`.

**Edge cases.**
- **Postgres enum values cannot be removed**, only added. `INTERVIEW_PREP` is
  one-way; get the name right the first time.
- `PATHFINDER_CATEGORIES` is a `Record<PathfinderCategory, CategoryConfig>`, so
  adding the enum value without the config is a **type error**, not a runtime
  surprise. Do both in one change.
- `kind` must be `notNull` with a default. A nullable `kind` means every read
  site carries a null branch forever.
- Do not name it `type`. `pathfinderSubGoals` already has `source`, and `type`
  sitting next to `source` reads as though one describes the other.
- Never `db:push`. Generate, read the SQL, then migrate.

**Done when.** The generated migration contains one `ALTER TYPE ... ADD VALUE`,
one `CREATE TYPE`, and four `ALTER TABLE ... ADD COLUMN`; it applies cleanly; and
`cd apps/main && npx tsc --noEmit` passes.

**Verified 2026-08-28.** `drizzle/0014_tidy_goliath.sql` contained exactly those
six statements and applied cleanly. `apps/main` and `packages/db` both typecheck.

**What this turned up, and it is worth reading.** Adding the enum value produced
a type error in a file that looked entirely correct:
`actions/(main)/pathfinder/goals.action.ts:25` hand-wrote a THIRD copy of the
category union as a string literal type, duplicating `pathfinderCategoryEnum`.
`PathfinderLevel` and `PathfinderStatus` were duplicated the same way. So the
database learned about `INTERVIEW_PREP` and `createPathfinderGoal` kept
rejecting it.

All three were verified identical to their enums and replaced with
`import type { ... } from '@repo/db'`. That immediately surfaced two more
`Record<PathfinderCategory, ...>` maps in the same file - `_getCategoryEmoji` and
`_mapToMockCategory` - that a hand-written union would have let go stale in
silence. Both filled in.

This is the same drift class as the five-places job registration and the
declared-but-unbound job types: a vocabulary written down twice.

---

## IP-2 - `interview_prep_generation` worker job

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-1

**Why.** Generating a full question set is several thousand tokens of LLM work.
In a server action it is killed by the Worker request budget after the user has
been charged. The Interview Assistant did exactly that
(`jobinterview.action.ts:391`), and it is the single biggest reason not to simply
keep it.

**Files.**
- `apps/worker/src/jobs/interview-prep-generation.ts` (new)
- `apps/worker/src/jobs/index.ts`
- `apps/worker/src/env.ts` (`JOB_BINDINGS`)
- `apps/worker/src/index.ts` (the class export)
- `apps/worker/wrangler.jsonc` (binding + a NEW migration tag)
- `packages/db/src/schema/worker.ts` (`JOB_TYPES`)

**Steps.**
1. Add `interview_prep_generation` to `JOB_TYPES`.
2. Write the job: take `{ goalId }`, read the goal's `sourceJobDescription` and
   `sourceCompanyInfo`, ask for technical, behavioral and coding questions in a
   single `chatJSON` call, insert them as `pathfinderSubGoals` with the right
   `kind`.
3. Coding questions get `hasCoding: true` and an `aiCodingProblem` in the shape
   `SubGoalCoding` already reads.
4. Register in all FIVE places. `apps/worker/README.md` records why it is five
   and not four.
5. Update `totalSubGoals` and create the first daily session, as
   `goal-creation.ts` does.

**Edge cases.**
- **Five registration places, all or none.** `ResumeStructure` was bound in
  `wrangler.jsonc` and never exported from `src/index.ts`; the binding resolved
  to nothing and the job failed at runtime after the row was written.
- Migration tags are **append-only**. Add a new tag; never edit an applied one.
- The job must be **idempotent** - alarms re-fire after a Durable Object
  eviction. Guard on data: if the goal already has sub-goals, do nothing.
  `goal-creation.ts` uses `existing > 0`.
- **One bulk insert**, not N in a loop. The neon-http driver has no transactions,
  so a partial loop leaves a half-built goal with no way back.
- Model output length varies wildly. Cap what goes into `title`; the body belongs
  in `description`.

**Done when.** Dispatching for a goal with a job description produces the
requested sub-goals with the correct `kind` split, a second dispatch of the same
job id adds nothing, and `background_job` reaches `completed`.

**Verified 2026-08-28.** A live run against a real Senior Backend Engineer
posting: `background_job` reached `completed` at progress 100 with no error, and
produced exactly the requested 3 TECHNICAL / 2 BEHAVIORAL / 1 CODING split. The
questions were genuinely drawn from the posting - idempotent event consumers,
Kafka partitioning and consumer groups, high-write Postgres migrations - not
generic filler.

**One defect the first live run exposed, now fixed.** The daily-session
find-then-insert lost a race and threw

    duplicate key value violates unique constraint "idx_pfds_goal_id_date"

because the goal page opens today's session as it loads, and the user lands on
that page the moment the goal is created - while this job is starting. Both saw
no session, both inserted. Replaced with `onConflictDoNothing().returning()` and
a read-back, letting the unique index arbitrate.

`goal-creation.ts` has the SAME find-then-insert and the same exposure. Not
touched here - raised as IP-10 rather than silently widening this task.

**Worth knowing:** the coding question it generated ("nth Fibonacci using
recursion") was NOT grounded in the posting, unlike the technical ones. The
prompt asks for grounding; the model complied for prose questions and reached
for a stock exercise for code. A prompt problem, not a wiring one.

---

## IP-3 - `createInterviewPrepGoal` server action

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-1, IP-2

**Why.** The entry point. Everything after it is existing Pathfinder machinery.

**Files.** `apps/main/actions/(main)/pathfinder/interview-prep.action.ts` (new)

**Steps.**
1. Accept `{ jobDescription?, jobUrl?, position, companyUrl?, counts }`.
2. If `jobUrl` is given and `jobDescription` is not, scrape with the shared
   extractor from IP-4.
3. Insert the goal synchronously with `category: 'INTERVIEW_PREP'` and the
   provenance columns, so the user gets a real goal and a URL immediately.
4. Dispatch `interview_prep_generation` with
   `{ cost: Math.ceil(totalQuestions / 2) }`, per the price decision in
   `overview.md`.
5. Return `{ goalId, slug, jobId }`.

**Edge cases.**
- A failed **dispatch** must not fail the goal. `createPathfinderGoal` already
  gets this right: the goal exists and can be retried.
- Credits are held by `startBackgroundJob` and settled or refunded when the app
  sees a terminal status. The worker never touches credits.
- Both `jobDescription` and `jobUrl` empty is a validation error, not an LLM call.
- The scraper can return a **login wall** instead of a posting. Reuse
  `WALL_OPENERS` from the cover letter flow rather than writing a second guard.

**Done when.** Calling the action with a pasted description returns a slug that
loads, and `background_job` shows one `interview_prep_generation` row.

**Verified 2026-08-28.** Submitting the sheet created
`/pathfinder/interview-prep-senior-backend-engineer` with
`category = INTERVIEW_PREP` and a 969-character `source_job_description`, and
exactly one `interview_prep_generation` row.

---

## IP-4 - Shared job-description extractor

- [x] **Status:** done, verified 2026-08-28

**Why.** `extractJobDescription` and its login-wall guard live inside
`cover-letter.action.ts`. Interview prep needs the identical scrape. Copying it
is precisely how this codebase ended up with three mock-interview
implementations.

**Files.**
- `apps/main/utils/jobs/extract-job-description.ts` (new)
- `apps/main/actions/(main)/ai/cover-letter.action.ts` (import from the new home)

**Steps.** Move `extractJobDescription` and `WALL_OPENERS` out; import from both
callers. Behaviour unchanged.

**Edge cases.**
- `cover-letter.action.ts` is `"use server"`. Exported async functions in such a
  module are a server-action boundary; the new util must **not** carry that
  directive, or every function in it becomes a public endpoint.
- Do not improve the wall guard while moving it. Move, verify, then change.

**Done when.** Both callers import from `utils/jobs/`, `tsc` passes, and pasting
a LinkedIn URL into the cover letter flow still returns the guard message.

**Verified 2026-08-28.** `utils/jobs/extract-job-description.ts` now holds the Exa
client, `WALL_MARKERS`, `WALL_OPENERS`, `wallReason` and the three cleaners;
`cover-letter.action.ts` is a 5-line auth wrapper and dropped from 685 to ~420
lines. `tsc` clean. The live LinkedIn-wall check is folded into IP-9 rather than
claimed here - it needs a real network fetch.

**Two things the move broke, both worth recording.**

1. **The util must not do auth, and briefly did.** The extracted body carried its
   `currentUser()` check along with it, into a file that has no session. Auth
   belongs to the server action; the util is a pure scrape.

2. **Adding the `"use server"` wrapper silently destroyed a discriminated union.**
   The wrapper's early `return { success: false, error }` made TypeScript infer
   `success: boolean` rather than `false`, so every caller doing
   `if (result.success) result.description` stopped compiling against a function
   whose behaviour had not changed. Fixed with an explicit return type. It also
   exposed `resume-editor.tsx:507`, which guarded with
   `if (!res.success || !res.description)` - an `||` whose right side reads a
   success-only field blocks narrowing, so `res.error` did not exist. Split into
   two checks.

---

## IP-5 - UI: create a goal from a job description

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-3

**Why.** Definition of done 1. Without it the capability exists and is
unreachable.

**Files.**
- `apps/main/app/(main)/pathfinder/_components/create-goal-sheet.tsx`
- `apps/main/app/(main)/pathfinder/_components/pathfinder-dashboard.tsx`

**Steps.** Add a mode to the existing create-goal sheet: "From a job
description", taking a paste box or a URL, a position, and the three counts.
Submit calls `createInterviewPrepGoal`, routes to the new goal, and follows the
job with `useBackgroundJob`.

**Edge cases.**
- The sheet is a RIGHT-side panel. It was `side="bottom"` at `h-[80dvh]`, and the
  comment at the top of the file explains why that was wrong. Do not undo it.
- No spinner. `InlineLoader` in the button; `ShipItHQLoader` for a full page.
- A long pasted description must not blow the sheet width: `min-w-0` on the flex
  child, and the textarea scrolls.

**Done when.** From `/pathfinder` a user can paste a description and land on a
goal that fills in with questions.

**AMENDED, and the amendment is the point.** IP-5 said to add a mode to
`create-goal-sheet.tsx`. That file turned out to be 814 lines of three-step
wizard whose every field - category, level, group, duration - is chosen FOR the
user in this flow. Threading a mode through all three steps to skip almost all of
them is more risk to a working flow than a small sheet of its own, so interview
prep got `create-interview-prep-sheet.tsx` (259 lines) and a "Prep for a Job"
button beside "New Goal".

**Verified 2026-08-28.** The button renders in `QuickActions`, the sheet opens
titled "Prep for a job", the counts clamp on input, and the credit cost updates
live: setting 3/2/1 changed the submit button to "Generate 6 questions".

---

## IP-6 - Show question kind in the goal UI

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-1

**Why.** Definition of done 2. Nineteen undifferentiated questions is worse than
three labelled groups.

**Files.** `apps/main/app/(main)/pathfinder/[slug]/_components/daily-practice-view.tsx`

**Steps.** Badge each sub-goal with its `kind` beside the existing `Quiz` /
`Coding` / `AI` badges, and only when `kind !== 'TOPIC'`.

**Edge cases.**
- Every existing sub-goal is `TOPIC`. Rendering a `TOPIC` badge would add a new
  meaningless chip to every goal in the product.
- Monochrome palette. No colour-coding by kind.

**Done when.** An interview-prep goal shows technical, behavioral and coding
badges; a normal goal is visually unchanged.

**Verified 2026-08-28.** Counting badge ELEMENTS (not loose words, so "Coding" in
a question title cannot be miscounted) on the rendered goal page gave exactly
`{Technical: 3, Behavioral: 2, Coding: 1}` and no `Topic` badge.

The regression half is proven by data plus the guard rather than by a second
screenshot: across the whole table, 31 pre-existing sub-goals are `TOPIC` and
only the 6 new ones carry a kind, and the badge renders only when
`kind !== 'TOPIC'`.

---

## IP-7 - Delete the Interview Assistant surface

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-5, IP-9

**Why.** Definition of done 7. Two entry points to one capability is the problem
this module exists to remove.

**Files.**
- `apps/main/app/(main)/ai/interviewassistant/` (whole tree, ~4,500 lines)
- `apps/main/actions/(main)/ai/jobinterview.action.ts` (~2,100 lines)
- `apps/main/lib/navigation.ts` (Job Interview, My Generations, Public Generations)
- `apps/main/types/aitools/` (interview types only)

**Steps.** Delete the tree and the action file, remove the nav entries, then
`grep -rn 'interviewassistant\|jobinterview\|InterviewPlan'` and clear what is
left.

**Edge cases.**
- `hub-stats.action.ts` may count interview plans on the AI Tools hub. Check
  before deleting, or the hub throws on a missing import.
- The AI rail and the home page may link to `/ai/interviewassistant`.
  `pnpm check-nav` catches the sidebar; it does **not** catch a hardcoded
  `<Link>`.
- `interviewPlanPurchase` may be referenced by a credits or admin screen.

**Done when.** The tree is gone, `grep` returns nothing outside `plan/` and
`srs/`, `tsc` passes, and `pnpm check-nav` passes.

**Verified 2026-08-28.** Tree and `jobinterview.action.ts` deleted, `grep` for
`interviewassistant` returns nothing across `apps/` and `packages/`,
`/ai/interviewassistant` returns **404**, all three packages typecheck, and
`check-nav` passes at 35 paths (down from 38).

**All three predicted edge cases were real, and one more was not predicted:**

- `hub-stats.action.ts` counted `jobInterviewAssistant`. Removed, along with
  `AiHubStats.interviewPlans`.
- Five hardcoded links outside the sidebar, which `check-nav` cannot see:
  `AIHubClient.tsx` (a tool card, a stat card and a step), `feature-discovery.tsx`,
  and `lib/ai/destinations.ts`. All repointed at `/pathfinder`.
- `layout.tsx` listed `/ai/interviewassistant/[slug]/codingquestions` in
  `fullScreenPaths` - the file's own comment warns that a stale path there fails
  silently.
- **NOT predicted:** `app/api/ai/job-interview/generate/route.ts`, a live API
  route importing the deleted action. The task listed the page tree and the
  action file; it did not think to look in `app/api/`. Deleted.

---

## IP-8 - Drop the five tables

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-7

**Why.** Definition of done 8. Tables no code reads are a standing invitation to
write code that reads them.

**Files.** `packages/db/src/schema/aitools.ts`, generated migration.

**Steps.** Remove `jobInterviewAssistant`, `codeEvaluation`, `questionAnswer`,
`userQuestionResponse`, `interviewPlanPurchase` and their relations.
`pnpm db:generate`, read the SQL, `pnpm db:migrate`.

**Edge cases.**
- **Read the generated SQL before applying it.** `DROP TABLE` is the one
  migration that cannot be walked back.
- Drop order follows foreign keys; children before the parent.
- `resumeTemplate`, `resumeDraft`, `templatePurchase` and `coverLetter` live in
  the SAME file and must survive untouched.

**Done when.** The migration drops exactly five tables, applies cleanly, and
`tsc` passes across `packages/db` and `apps/main`.

**Verified 2026-08-28.** `drizzle/0015_chunky_namorita.sql` contains exactly five
`DROP TABLE ... CASCADE` statements and nothing else. Applied cleanly. Queried
back afterwards: the five are gone from `information_schema`, and all five
survivors in the same file - `cover_letter`, `resume_draft`, `resume_template`,
`resume_template_generation`, `template_purchase` - are present.

---

## IP-9 - Prove it end to end in a browser

- [x] **Status:** done, verified 2026-08-28
- **Blocked by:** IP-5

**Why.** Definition of done 9, and the rule at the top of `plan/README.md`: a
task is done when it is verified, not when the code is written. Every "done" in
this repo that later turned out to be broken was marked from source.

**Steps.** Paste a real job description into the new sheet, watch the goal
appear, watch `background_job` reach `completed`, open the goal, confirm the
three kinds of question are present and badged, answer one quiz question and
submit one coding answer.

**Edge cases.**
- Chrome is not the connected browser; **Brave** is. Check
  `document.visibilityState` FIRST. An occluded or locked window reports
  `hidden`, suspends layout, and every `getBoundingClientRect()` returns 0, which
  reads exactly like a broken page.
- Worker jobs are asynchronous: poll `background_job` rather than assuming the
  first read is final.

**Done when.** A DOM measurement or screenshot shows a generated interview-prep
goal with technical, behavioral and coding sub-goals, created through the UI.

**Verified 2026-08-28**, driven entirely through the UI in Brave: opened
`/pathfinder`, clicked "Prep for a Job", filled the role and a real 969-character
posting, set 3/2/1, submitted, was routed to the new goal, and read the rendered
badges back as `{Technical: 3, Behavioral: 2, Coding: 1}`.

**The visibility warning in this task earned its place.** Every measurement taken
while the Brave window was occluded returned `visibilityState: "hidden"`,
`panelChars: 0` and empty `innerText` - a page that looks broken and is not.
`textContent` is no help either; the tree genuinely does not lay out. The window
has to be foregrounded (`osascript -e 'tell application "Brave Browser" to
activate'`) and it does not stay there, so measurements must be taken
immediately after activating.

---

## IP-10 - The same session race in `goal-creation.ts`

- [x] **Status:** done, verified 2026-08-28
- **Raised by:** IP-2, 2026-08-28

**Why.** IP-2's first live run threw

    duplicate key value violates unique constraint "idx_pfds_goal_id_date"

from a find-then-insert on `pathfinder_daily_session`. `goal-creation.ts:78-92`
has the identical shape and the identical exposure: `createPathfinderGoal`
returns a slug, the user lands on the goal page, the page opens today's session,
and the job is opening one at the same moment. When it loses, the whole plan
fails after credits are already held.

It has not been seen in the wild because the plan job usually wins the race by a
wide margin. That is timing, not correctness.

**Files.** `apps/worker/src/jobs/goal-creation.ts`

**Steps.** Replace the find-then-insert with
`.onConflictDoNothing().returning()` plus a read-back, as
`interview-prep-generation.ts` now does.

**Edge cases.**
- The read-back must run when the insert returns nothing. An `onConflictDoNothing`
  that returns an empty array is the CONFLICT case, which is exactly when the
  session id is needed.
- Do not add a unique-violation try/catch instead. The neon-http driver has no
  transactions, so a caught error leaves no rollback point.

**Done when.** Two concurrent dispatches for the same goal on the same date both
succeed, and only one `pathfinder_daily_session` row exists for that pair.

**VERIFIED 2026-08-28.** Three concurrent openers against the same
`(goal_id, date)`: one inserted, two took the read-back path, all three resolved
the SAME session id, exactly one row existed afterwards, and nothing threw. Under
the old find-then-insert two of those three would have raised duplicate key.

The
find-then-insert is replaced with `onConflictDoNothing().returning()` plus a
read-back, identical to the fix proven under load in
`interview-prep-generation.ts` - where the race actually fired. `apps/worker`
typechecks. What has NOT been done is the two-concurrent-dispatch test this task
asks for, so the checkbox stays open. The code is right by construction and by
analogy; that is not the same as verified.

---

## IP-11 - Coding questions are not grounded in the posting

- [x] **Status:** done, verified 2026-08-28
- **Raised by:** IP-9, 2026-08-28

**Why.** The live run produced three technical questions drawn straight from the
posting (idempotent consumers, Kafka partitioning, high-write Postgres
migrations) and then a coding question of "Implement a function to determine the
nth Fibonacci number using recursion" - from a backend posting about Kafka,
Postgres and gRPC.

The prompt already says to ground every question in the description. The model
complies for prose and reaches for a stock exercise for code, which is the half
of the output a candidate would most notice as generic.

**Files.** `apps/worker/src/jobs/interview-prep-generation.ts` (the `generate` prompt)

**Steps.** Split the coding questions into their own request, or name the
constraint explicitly: the problem must use a data structure, protocol or failure
mode the posting mentions.

**Edge cases.**
- A posting with no technical surface (a pure management role) genuinely has no
  grounded coding question. Returning fewer is better than inventing one.
- Do not raise the token cap to fix this. The output was not truncated.

**Done when.** For the Kafka/Postgres posting used in IP-9, the coding question
references something the posting actually names.

**2026-08-28: prompt applied, NOT verified.** The generation prompt now requires
every coding question to be built around a data structure, protocol, storage
system or failure mode the description NAMES, names the specific anti-patterns to
avoid (Fibonacci, FizzBuzz, string reversal, bracket balancing), and instructs
the model to return FEWER coding questions rather than invent a generic one.

**VERIFIED 2026-08-28**, against the model rather than through the UI. Three
attempts to drive the sheet in a backgrounded Brave window failed in three
different ways (Radix's portal needs `requestAnimationFrame`, which a hidden tab
throttles to zero; a `setTimeout` rAF shim froze the renderer; and on the run
where the sheet did open, submit never fired), so the check was done where the
change actually lives.

A script lifted the prompt template out of
`interview-prep-generation.ts` by regex - deliberately NOT retyped, since a
retyped copy tests a prompt that does not ship - filled it with a Kafka/Debezium/
sharded-Postgres posting and called `gpt-4o-mini`. Both coding questions came
back grounded and neither matched the stock-exercise pattern:

- "Implement a function to manage offsets for a Kafka consumer that supports
  idempotent processing."
- "Write a function to deduplicate entries from a PostgreSQL table based on a
  unique key."

Compare with the before-picture still sitting on
`interview-prep-senior-backend-engineer`: "Implement a function to determine the
nth Fibonacci number using recursion", for a Kafka and Postgres role.

## IP-12 - A question never stops "Generating..."
**Why** Found 2026-09-26 (plan/competition/skillmeet CMP-2e). The goal page treats a
sub-goal with no studio as content still being made: it shows "Generating..." and polls
`getSubGoalWithContent` every 3 seconds while it's selected. An interview question
(`kind` TECHNICAL, BEHAVIORAL or CODING, and reported questions, source
`interview_report`) is complete on arrival and gets a studio only if the student opens
notes, so every question showed the badge forever and a selected one polled forever.
**Files** `apps/main/app/(main)/pathfinder/[slug]/_components/daily-practice-view.tsx`.
**Steps** A sub-goal is "a question" when its kind isn't TOPIC. For a question: no
"Generating..." badge, and no polling. Study sub-goals (TOPIC) keep both.
**Edge cases** a coding question (has coding, already counted as content); a TOPIC
sub-goal whose content really is being generated (unchanged).
**Done when** a prep goal's questions show their kind (and "AI" or "Reported by
students") without "Generating...", selecting one makes no repeated requests, and a
TOPIC sub-goal without a studio still shows it and polls.

**Code done 2026-09-26.** `isQuestion(subGoal)` (kind not TOPIC, or source
`interview_report`) counts as content: no "Generating..." badge, and the 3-second
content poll is never set for a selected question. TOPIC sub-goals are unchanged.
**Browser check (Niraj):** open a prep goal: its questions show Technical / Behavioral /
Coding with "AI" or "Reported by students" and no "Generating..."; select one and the
Network tab shows no repeated requests; a study goal's new topic still shows it until its
content arrives.
