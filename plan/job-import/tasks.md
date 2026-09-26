# Job import - tasks

Derived from `overview.md`. Depends on `plan/hiring-rounds` (HR-1, HR-2, HR-4 to HR-9,
and the round runners) and `plan/interview-prep` IP-4 (the job-description extractor).
Build in order.

| ID | Task | Status |
|---|---|---|
| JI-1 | Schema: `imported_job` and pipeline provenance | done 2026-09-26 |
| JI-2 | A stepped Durable Object: one alarm per step, checkpointed | done 2026-09-26 |
| JI-3 | `job_import`: fetch and extract | done 2026-09-26 |
| JI-4 | `job_import`: company match, or request and scrape in parallel | done 2026-09-26 |
| JI-5 | `job_import`: plan the rounds, then one alarm per round, grounded in our banks | done 2026-09-26 |
| JI-6 | Server action: dedup, visibility, cost, dispatch | done 2026-09-26 |
| JI-7 | UI: "Paste a job", live progress, needs-text fallback, into practice | code done 2026-09-26; browser check is Niraj's |
| JI-8 | Entry points: /jobs, company page, /home, Pathfinder | code done 2026-09-26; browser check is Niraj's |
| JI-9 | Company side: imported jobs and pipelines, adopt, edit or replace | done 2026-09-26 (browser check is Niraj's) |
| JI-10 | Prove it end to end on dev | not started |
| JI-11 | The plan step reads the company's reported loop (CMP-2) | code done 2026-09-26; the live plan waits on OpenAI credits (with JI-10) |

## JI-1 - Schema
**Why** One row per imported job, shared across students, with its state.
**Files** `packages/db/src/schema/job-import.ts`, `schema/index.ts`, a migration.
**Steps** `imported_job`: id, `sourceUrl`, `urlHash` (unique when public), `sourceText`,
`visibility` (PUBLIC | PRIVATE), `ownerId`, `status` (QUEUED, FETCHING, NEEDS_TEXT,
EXTRACTING, COMPANY, PLANNING, ROUNDS, READY, FAILED), `step` detail, `extracted` jsonb,
`companyId` (nullable), `companyRequestId` (nullable), `processId` (nullable),
`backgroundJobId`, timestamps. On `interview_process`: `pipeline_owner_kind` gains
`IMPORTED` (one enum, decision round 2; no `source` column) and `importedJobId`; the
owner check lets an IMPORTED pipeline have no company yet. `hiring_round_pool_item`
gains `status` (LIVE | DRAFT, default LIVE): items generated here are DRAFT.
**Edge cases** the same URL private and public (unique only across PUBLIC); a private
import later made public (merge into an existing public one if it appeared meanwhile).
**Done when** the migration previews with only these changes and applies on dev.

**Done 2026-09-26.** Migration `0060_job_import` (numbered after another session's
0059): the `imported_job` table with its two enums and the public-URL unique index,
`pipeline_owner_kind` + `IMPORTED`, `interview_process.imported_job_id`, the owner
check rewritten on `owner_kind::text` (safe in the same transaction as the new enum
value), and `hiring_round_pool_item.status` (LIVE | DRAFT, existing rows LIVE).
Previewed with only these changes, applied on dev; `tsc` clean in main, hiring, admin
and worker. Noted for JI-4: `company_request.domain` is required, so an unknown
company needs its website found before a request can be made.

## JI-2 - Stepped Durable Object
**Why** Decision: one alarm per step, so a failed round retries alone.
**Files** `apps/worker/src/jobs/stepped-job.ts` (a subclass of `JobDurableObject`),
`apps/worker/README.md`.
**Steps** A step list with checkpointed state in DO storage; each alarm runs one step,
saves, writes status, and schedules the next with `setAlarm(now)`; `RetryableError`
retries that step only; stale-run recovery applies per step.
**Edge cases** an eviction between steps (resumes from the checkpoint); a step that
keeps failing (fails the job after the bounded retries, hold released).
**Done when** a test job of three steps survives a forced throw in step two and
completes, with three status writes.

**Done 2026-09-26.** `src/jobs/stepped-core.ts` (pure rules), `src/jobs/stepped-job.ts`
(the Durable Object glue and `/resume`), `RetryableError` moved to `src/jobs/retryable.ts`
(re-exported from `base.ts`; `writeStatus` and `fail` now protected), README section
"Stepped jobs". `scripts/stepped-core.check.ts` passes 11/11: a throw in step two
retries only step two and completes with the checkpoint holding each step's work once
and a status per step; an eviction mid-step defers, then re-runs only that step; a step
that keeps failing fails after 1 try and 2 retries; a plain error fails at once; a
step can pause the job, a stray alarm does nothing, resume works once. (More than three
status writes: one when each step starts and one when it hands on.) The live Durable
Object round trip is proved with `job_import` in JI-3.

## JI-3 - Fetch and extract
**Files** `apps/worker/src/jobs/job-import.ts` (+ the five edits in the README),
`packages/ai/src/tasks.ts` (a `job_import_extract` task), `packages/firecrawl`.
**Steps** Scrape the URL (LinkedIn included) with a timeout; unreadable, blocked or
empty -> status NEEDS_TEXT and stop (the job waits for the student). With text: model
call 1 to a strict schema (title, company {name, website?}, level, location, skills,
requirements, responsibilities). Reuse IP-4's extractor where it fits.
**Edge cases** a page that is a login wall (detect, NEEDS_TEXT); a posting with no company
name (ask for it); a non-job page (fail with a clear message, refund).
**Done when** a careers-page URL extracts; a LinkedIn URL either extracts or lands on
NEEDS_TEXT; text plus company name extracts.

**Done 2026-09-26.** Live checks: a Greenhouse careers link (SpaceX) read by Firecrawl in
2.6 s and extracted to the schema; a real LinkedIn job link hit its sign-in wall on both
readers and returned the "paste the text" reason; a LinkedIn search page refused with its
own message; pasted text plus a company name extracted with the student's name; text with
no company asked for it; a homepage refused as not a job (8/8). Through the real worker
(9/9): dispatch, read and extract into `imported_job`; a row with nothing to read waits on
NEEDS_TEXT and resumes once (a second resume and a token for another job are refused);
a failing step marks `imported_job` FAILED and `background_job` failed.
- `src/jobs/job-import.ts` (the steps), `src/jobs/job-import-core.ts` (read and extract,
  testable in Node), `readJobPage` Firecrawl then Exa with the shared wall check; the wall
  check and cleaners moved unchanged to `@repo/exa/job-page` (apps/main imports them),
  `exaContents` added to `@repo/exa`, `chatJSON` gained a timeout, `@repo/db/job-import-url`
  (normalise and hash a link; LinkedIn's forms of one job collapse to its id), the task
  lines, the five edits (tag `v18`), and `POST /api/v1/jobs/:jobId/resume` (token action
  `resume_job`, scoped to the job).
- Firecrawl reports LinkedIn's refusal as a rejected key; that is logged, and the student
  reads "That site blocks automated readers".

## JI-4 - Company
**Files** `job-import.ts`, the existing company request flow (HR-7) and `company_scrape`.
**Steps** Match by website domain, then by normalised name. Found: link. Not found:
create (or vote on) a company request and dispatch `company_scrape` from the official
site; do not wait. Link the imported job to the request; relink to the company when
its draft is published.
**Edge cases** a name with several matches (prefer domain; otherwise leave unlinked and
flag for admin); staffing agencies posting for a client (link to the agency, note it).
**Done when** a known company links in the run; an unknown one produces an admin draft
and the job relinks on publish.

**Done 2026-09-26.** `company` step in `apps/worker/src/jobs/job-import.ts`, pure helpers
in `job-import-core.ts` (`normaliseCompanyName`, `bareDomain`, `notCompanySite`,
`pageNamesCompany`, `pickCompanySite`, `resolveDomain`). Order: the posting's stated
domain, then the normalised name against companies and open requests (several matches:
unlinked, the admin's flag), then one Exa search whose result counts only if its page
names the company, redirects followed, matched once more, else a new request with the
importer's vote and a `company_scrape` dispatched from the worker without waiting. A
request that already has a draft reading or in review is not scraped again; a re-run
after an eviction re-checks that, so a request is never left without its scrape. A
rejected domain is not reopened by an import. The extract gained `company.agency`
(a staffing agency posting for an unnamed client): the job links to the agency and the
flag is kept on `extracted`. Admin `publishCompanyDraft` now sets `imported_job.company_id`
for every job on the request. Live through the local worker, 11/11: stated domain
links a differently named company, "Vantorra Systems" matches "Vantorra Systems Pvt.
Ltd.", two "Dunmere Labs" stay unlinked, a made-up company stays unlinked and named,
Hasura is looked up to hasura.io, requested with the vote, drafted and scraped, and the
publish relink moves the job. Test rows removed, only those it made. Found on the way:
the worker's `.dev.vars` had no `EXA_API_KEY` (copied from apps/main/.env); production
needs it too, and a missing key now logs a warning instead of failing silently.

## JI-5 - Rounds
**Files** `job-import.ts`, `packages/ai/src/tasks.ts` (`job_import_plan`,
`job_import_round`), the pools (`hiring_round_pool_item`, `aptitude_question`,
`design_prompt`, practice problems with `judgeStatus` ready).
**Steps** Model call 2 plans rounds (type, order, pass mark 0-100, gate HARD or
ADVISORY, time limit, draw size, reason). Then one alarm per round: DSA - send
candidate judged problems filtered by tags and level, the model picks IDs; aptitude -
the model picks the section mix, questions drawn from the bank; system design - pick a
library prompt or write one as DRAFT; voice - a rubric and question themes. Validate,
retry once, save. Then create the `interview_process` (source IMPORTED) with its rounds.
**Edge cases** a round type we cannot run (LLD, take-home) is shown "not practisable
yet", never silently dropped; a DSA bank with no match at that level (nearest level,
said so); the model returning an ID we did not send (reject, retry).
**Done when** three different postings produce three different, sensible pipelines,
every DSA item has a ready judge, and generated items are DRAFT.

**Done 2026-09-26.** Steps `plan`, `round` (one alarm each) and `ready` in
`job-import.ts`; prompts and strict checks in `job-import-core.ts`, 24 pure checks in
`apps/worker/scripts/job-import-core.check.ts`. Migration 0061 adds `imported_job.plan`
(the rounds and the rounds we can't run), applied on dev. The extract also keeps the
posting's stated `process`, which the plan mirrors; without it the take-home was lost.
`plan` makes the IMPORTED `interview_process` (inactive) and its rounds; each `round`
fills one: aptitude picks sections, levels and bank topics and draws the reviewed bank;
DSA sends only judge-ready problems at the level (or the nearest with enough, said in
the description) and refuses an id it didn't send; design picks library prompts and
drafts one (DRAFT, keyed `import-<id>-r<n>`) only when none fits; voice writes a rubric
and interviewer brief, or falls back to the platform's. `ready` checks every pool covers
its draw, turns the pipeline on and sets READY. A failed import removes its inactive
pipeline and drafted prompts. Admin publish now also moves the pipeline's `company_id`.
Limits recorded in overview.md ("Round limits"). Live through the local worker:
trainee (mass hiring) APTITUDE>DSA(2 easy)>BEHAVIOURAL>CULTURE; senior payments
CULTURE(recruiter)>DSA>DESIGN(payments ledger)>BEHAVIOURAL with the take-home kept as not
practisable; data intern APTITUDE>DSA>CULTURE; an ad-tech posting drafted "Design a
real-time bidding system" as DRAFT beside the library's ledger prompt. Every DSA item
judge-ready, 33/33 across the runs; test rows removed. Bugs fixed on the way: the ready
count used a raw subquery that Drizzle bound to the wrong table (every pool read 0).

## JI-6 - Server action
**Files** `apps/main/actions/(main)/jobs/import.action.ts`.
**Steps** Parse input (URL or text + company); on-platform job -> return its pipeline;
public URL already imported -> return it (free); else check the daily cap (3 new public
a day) or hold 15 credits for private; insert `imported_job`; `startBackgroundJob(
"job_import", ..., { cost })`. A NEEDS_TEXT resume action continues the same job.
**Edge cases** cap reached (tell the student; offer private); insufficient credits;
duplicate clicks (idempotent on urlHash and owner).
**Done when** each branch is exercised on dev and the credit ledger shows hold, settle
and refund correctly.

**Done 2026-09-26.** `apps/main/actions/(main)/jobs/import.action.ts`: `importJob`,
`getImport`, `resumeImport`, `cancelImport`. Price `job_import_private: 15` in
`lib/credits/pricing.ts`; the cap (3 public, rolling 24 hours, failed ones not counted)
in the action, pointing at the overview. Pasted text dedupes like a link: the hash of
the company and the normalised text, so the same posting pasted twice is one public
import. A private import of a posting already public returns the public one, free. A
failed public import is retried on its own row (a link has one public row). A public
import waiting for its text can be finished by any student, a private one only by its
owner; the owner can cancel one waiting, which refunds a private hold. `getImport`
settles or refunds the first time it sees a finished job, like `getBackgroundJobStatus`.
Shared helpers moved rather than copied: `jobHoldId` to `lib/credits/hold.ts`, and the
worker token to `lib/workers/token.ts` with its action (`start_job`, `resume_job`).
Exercised on dev through the real action code (auth and headers stubbed to a fresh test
user, the local worker running), 24/24: on-platform link, bad input, private hold ->
READY -> settled, not-a-job -> FAILED -> refunded, second click, private-of-public free,
failed public retried, LinkedIn search page -> NEEDS_TEXT -> resume (double click
harmless) -> READY, private waiting -> cancel -> refunded, the fourth public refused
with the private offer, the window rolling, too few credits with the public offer, and
another student refused a private import. Test user and rows removed.

## JI-7 - UI
**Files** `apps/main/components/job-import/*`.
**Steps** A paste field (URL or text), public or private with the cost shown, live
progress steps from the job's status (Reading the job, Found the company, Planning the
rounds, Round 2 of 4, Ready), the NEEDS_TEXT form (text + company name), and on READY
the pipeline view with Start practising. Skeletons per the loading rule.
**Done when** each state renders and the flow reaches a practice run.

**Code done 2026-09-26** (Niraj chose own pages over a sheet, recorded in overview.md).
`/jobs/import` (paste form: link or text + company, public with the 24-hour count or
private with the balance) and `/jobs/import/<id>` (live steps polled every 2 s, the
paste-the-text form with cancel, the failure with its reason, then at READY the same
URL renders the job's rounds via `RoundsOverviewView` in a new `import` context, with
the rounds we can't run listed under them). `/companies/pending/<request>` is the holding
page, redirecting to the company once published. Components in
`components/job-import/`; every route has a skeleton shaped like it. The run engine takes
`{ importId }` (`getImportRounds`, `startRound`), the runner goes back to the import's
page, My rounds lists import runs under practice, and a round whose pool holds a DRAFT
item says "AI-written, not yet reviewed". Server path verified through the real actions,
14/14: allowance, READY view, rounds with the DRAFT label, round 1 open and round 2
locked, an attempt started, the runner's way back, My rounds, a private import hidden
from others, the holding page, and both links after publish. The fixture was a built
pipeline because **the dev OpenAI key is out of credits** (`insufficient_quota`; main
uses the same key). Found on the way: an exhausted quota was retried like a rate limit,
and the raw provider error reached the student; both fixed (`openai.ts` fails at once on
`insufficient_quota`; `onFail` shows a plain line and logs the detail).
**Browser check (Niraj):** paste a link, watch the steps, practise round 1; a LinkedIn
search link shows the paste form; a private import shows the refund on failure; the
holding page from a pending company's job.

## JI-8 - Entry points
**Files** `app/(jobs)/jobs/page.tsx`, `app/(jobs)/companies/[slug]/page.tsx`,
`app/(main)/home`, Pathfinder create flow.
**Done when** all four open the same flow, the company page prefilling the company.

**Code done 2026-09-26** (placements decided by Niraj, recorded in overview.md): a
"Practise any job" tab, last in the /jobs strip and active on every import page; a
"Practise a job" button in the /home header (its skeleton gained the button); on the
company page, "Paste a <company> job" (prefilled with `?company=`) above a new "Jobs
students imported" section listing its READY imports, public ones plus the viewer's
private ones (skeleton updated); on an interview-prep goal, "Practise this job's rounds"
opens the same form in a sheet prefilled with the goal's posting and a company guessed
from the scraped title or the company's site (`getPrepGoalPosting`, owner only). Checked
through the real code, 5/5: the company page's list (public + own private, not others'
private; public only signed out) with rounds and minutes, the prep goal's prefill, and
another student refused.
**Browser check (Niraj):** each of the four opens the form; the tab highlights on
/jobs/import; the company page's button fills the company.

## JI-9 - Company side
**Files** `apps/hiring` pipelines and jobs, the company page.
**Steps** Under a verified company: imported jobs and their pipelines, labelled
"Imported by students"; adopt (make it the company's), edit, or replace; replacing
redirects future practice to the company's own pipeline.
**Done when** a verified test company adopts one and students then practise the
company's version.

**Done 2026-09-26** ("copy, then redirect", Niraj). Migration 0062 adds
`imported_job.company_process_id` (FK, set null), applied on dev. Hiring app:
`lib/imported-jobs.ts` and `actions/imported` (`getImportedJobs`, `adoptImport`,
`replaceImport`, `revertImport`), shown under the pipelines at /interview-config as
"Imported by students": each job with the rounds ShipItHQ built, the AI-written label,
the rounds not practisable, a practising count hidden below 10, and private imports
marked but never naming the student. An unverified company sees only how many are
waiting. Adopt copies into a company template (`sourceTemplateId` = the imported
pipeline, so a second Adopt returns the same copy; counts toward the plan's limit) and
opens it in the builder; `copyRounds` now carries each pool item's status so AI-written
items stay labelled in any copy. Replace takes a ready company pipeline only. Undo points
back at ShipItHQ's. Deleting the company's pipeline falls back on its own (FK set null).
Main app: the import's practice pipeline is `company_process_id ?? process_id` in
`getImportRounds`, `startRound`, the runner's way back, My rounds and the company page;
the rounds page says it's the company's own. Verified in two halves, 11/11 in hiring
(unverified count only and refused, verified list anonymous, adopt, pool with DRAFT,
second adopt, replace refuses an empty pipeline, undo, replace, a non-member refused) and
5/5 in main (the student's rounds are the company's, Start runs on it, the runner and My
rounds still lead to the import's page, the company page's count); rows removed.

## JI-10 - End to end
**Done when** on dev: a careers URL, a LinkedIn URL and pasted text each reach a
practice run; a forced mid-round failure resumes; a private import settles 15 credits
and a failed one refunds; the unknown company appears in the admin queue.

## JI-11 - Plan with what students reported
**Why** CMP-3 meant an imported pipeline to be shaped by the company's reported loop,
and CMP-5's copy says so ("from the posting and what students reported"). Without it the
plan reads only the posting.
**Files** `apps/worker/src/jobs/job-import.ts` (plan step), `job-import-core.ts`
(`planUser`), `@repo/db/company-loop`.
**Steps** When the import is linked to a company with a ready loop for the posting's group
(`roleGroupOf(title)`, `pickLoop`), add it to the plan prompt: the usual round order with
its share and each round's most reported questions with counts, as evidence the model
weighs above its own guess; the plan keeps the reason ("students report ..."). No loop:
unchanged.
**Edge cases** the posting's stated process disagrees with reports (prefer the posting,
say so in the reason); a loop from a different level (same family) is labelled as such.
**Done when** an import for a company with a seeded loop plans rounds that follow the
reported order, and one without a loop is unchanged.

**Code done 2026-09-26.** `planStep` reads `companyLoops` for a linked company (family
from the title, level as read, the same family at another level labelled so) and
`planUser` appends "REPORTED BY STUDENTS" (order with its share, counted questions); the
plan rules say to follow it for the rounds we run unless the posting states otherwise,
and to say so in the reason. A failure reading reports never blocks the plan. Pure
checks 27/27 (no reports: prompt unchanged; with reports: order, share, counts). The
live check (a seeded company's import following the reported order) runs with JI-10
once OpenAI has credits.

## Code review sweep (2026-09-26)

An independent read-only review of the job-import, interview-report and referral code
found ten defects; each was checked against the code and fixed, then tested:
1. Referrer code: failed tries were read-then-written, so parallel guesses each saw 0,
   and a new code reset the count. Now every try spends an attempt atomically first
   (`attempts < 5`, returning), and a new code keeps the count while the old one lives.
   Test: 10 guesses at once count 5, none succeed; a new code while locked is refused.
2. A referrer could open a student's resume after the request closed: now only while
   it is OPEN or ACCEPTED.
3. A company pipeline shared by several imports (Replace) could show another student's
   private import in the runner and My rounds: both lookups now see only public imports
   and the viewer's own, the viewer's first.
4. A double click on a private import could hold 15 credits twice: migration 0066 adds a
   unique index on (owner, link) for live private imports; the action returns the one
   already there. Test: two at once give one import and one hold.
5. A referrer who re-verified at another company, or whose six months lapsed, could still
   accept the old company's requests and get the student's email: re-verifying elsewhere
   expires the old open requests, and answering needs a live offer at the request's
   company.
6. A paste that reached the worker a moment before its job recorded "waiting" got a 409
   read as success, leaving the import stuck: the action retries for up to 4 seconds and
   puts the form back if the import never moved.
7. Publishing a company was three separate writes; a failure part way left a PUBLISHED
   draft nothing could repair: now one transaction.
8. Two admins approving a student's reports at once could pay a sixth: a per-student
   advisory lock inside the approval transaction.
9. "Practise a job like this" could link a design import to a backend loop: it now
   matches the role family as well as the level.
10. The referral attachment included failed rounds: now rounds cleared only, as planned.
Suites re-run after the fixes: referrals 31/31 and caps 3/3, JI-7 14/14, JI-8 5/5,
JI-9 11/11 and 5/5, CMP-1b 18/18, CMP-1d 12/12, CMP-2b 6/6, CMP-2e 7/7, the pure checks
27/27 and 11/11.
