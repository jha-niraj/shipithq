# Hiring rounds - tasks

Derived from `overview.md`. IDs are `HR-n`. Each task names the definition-of-done
line(s) it serves (DoD n). Build in order: every phase depends on the one before it.

Starting point, mapped 2026-09-25:
- **Hiring app** (`apps/hiring`): interview processes and rounds already exist
  (`interview_process`, `interview_round` in `packages/db/src/schema/jobmock.ts`;
  editor in `app/(main)/interview-config`, actions in
  `actions/interview-config/interview-rounds.ts`), as do AI-generated templates
  (`interview_process_template` in `hiring.ts`).
- **Attempts:** `job_mock_session` already stores a transcript, code, test
  results, score and AI analysis per round.
- **Companies:** a company has `verificationStatus` and a nullable
  `createdByUserId`, and `apps/admin` has a verification console
  (`app/(console)/hiring/companies`).
- **Student tools to reuse:** the DSA judge (`actions/(main)/practice/judge.action.ts`,
  EXAM mode), the Excalidraw system-design canvas, and voice mock
  (`mock_conversation` / `mock_feedback` worker jobs).
- **Missing:**
  - an APTITUDE round type
  - pass marks and gate modes
  - question pools
  - scored attempts that can be retaken
  - sending results
  - claimed/unclaimed companies
  - a scraper
- **Broken today:** `/companies/[slug]/mock` links to `/mock/company/...`, a
  route that does not exist (fixed by HR-16).

---

## Phase A - Data

## HR-1 Schema: companies, pipelines, rounds, pools
- [x] Status: done 2026-09-25, verified.
  - **Migration `0035_hiring_rounds_foundation`**, applied:
    - companies get `profile_source`, `claim_status` (default CLAIMED) and
      `scraped_at`. `website_domain` came with HA-5.
    - pipelines get `owner_kind`, `is_template`, `source_template_id` and
      `job_id`, and `company_id` becomes nullable with a check that
      COMPANY-owned pipelines keep one
    - rounds get the APTITUDE, DSA, VOICE_BEHAVIOURAL and VOICE_CULTURE types,
      plus `gate_mode` (default ADVISORY), `pass_mark` (0), `time_limit_minutes`,
      `draw_count` (1), `cooldown_hours` (24), `rubric` and `response_mode`
      (EITHER)
    - new `hiring_round_pool_item` table
    - `job.interview_process_id` becomes a real FK (ON DELETE set null),
      preceded by a clean-up UPDATE for links to missing pipelines. The preview
      counted 0 of 12 jobs affected.
  - **Checked after applying:** all 8 companies are CLAIMED / SELF_SERVE, and
    the dev database has no pipelines or rounds yet, so the defaults will show
    in HR-4's seed.
  - `tsc` is clean in apps/main, apps/admin and apps/hiring, after two knock-ons:
    - apps/main's per-company pipeline counts skip platform pipelines
    - apps/hiring's `InterviewProcess.companyId` is nullable and its round-type
      union gained the four new types

**DoD** 1, 5, 6, 7.
**Why.** None of the gating can be stored today: rounds have no pass mark, no gate mode and no pool, and a company cannot be marked unclaimed.

**Files.**
- `packages/db/src/schema/hiring.ts` (company)
- `packages/db/src/schema/jobmock.ts` (interview_process, interview_round)
- `packages/db/src/schema/jobs.ts` (`job.interviewProcessId`)
- a new migration via `pnpm db:generate --name hiring_rounds`

**Steps.**
- **`company`:** add
  - `profileSource` (`SELF_SERVE` | `SCRAPED`)
  - `claimStatus` (`UNCLAIMED` | `CLAIM_PENDING` | `CLAIMED`)
  - `websiteDomain` (already added by `plan/hiring-app` HA-5; reuse it)
  - `scrapedAt`
- **`interview_process`:** add
  - `ownerKind` (`COMPANY` | `PLATFORM`)
  - `isTemplate`
  - `sourceTemplateId`
  - `jobId` (nullable, for a job's own edited copy)
- **`interview_round`:**
  - add `APTITUDE`, `VOICE_BEHAVIOURAL` and `VOICE_CULTURE` to the round type
    (keep the old values so existing rows stay valid)
  - add `gateMode` (`HARD` | `ADVISORY`), `passMark` (0-100),
    `timeLimitMinutes`, `drawCount`, `cooldownHours`, `rubric` (jsonb, for
    AI-scored rounds), and `responseMode` (`VOICE` | `TYPED` | `EITHER`, for
    voice rounds)
- **New table `hiring_round_pool_item`:** `roundId`, `kind`
  (`PRACTICE_PROBLEM` | `APTITUDE_QUESTION` | `DESIGN_PROMPT`), `refId`,
  `weight`.
- **`job.interviewProcessId`:** turn it into a real foreign key (it is plain
  text today).

Report the generated SQL, then apply it with `pnpm db:migrations` (preview)
and `--apply`.

**Edge cases.**
- Existing rounds get `gateMode = ADVISORY` and `passMark = 0`, so nothing that
  works today starts blocking anyone.
- Existing companies are `SELF_SERVE` and `CLAIMED` (they signed up).
- A `job.interviewProcessId` that points at nothing is set to null by the
  migration and counted in the preview, not left dangling.

**Done when.**
- `pnpm db:migrations` previews the SQL, and `--apply` then reports nothing
  pending.
- Every existing company reads `CLAIMED`.
- Every existing round reads `ADVISORY` / 0.
- `cd apps/main && npx tsc --noEmit`, and the same for `apps/hiring` and
  `apps/admin`, are clean.

## HR-2 Schema: runs, attempts, sends, consent
- [x] Status: done 2026-09-25, verified.
  - **Schema:** `packages/db/src/schema/hiring-rounds.ts` holds `hiring_run`,
    `hiring_attempt` and `hiring_send`, plus HR-3's `aptitude_question`, in
    migration `0036_hiring_runs_sends_aptitude`, which is only new tables and
    was applied.
    - A send stores `userId` too, so "one active send per (student, job)" is a
      partial unique index.
    - The send carries `profile`, `feedback`, `emailRevealedAt`, both
      outcomes, and `purgeAfter`.
    - An attempt holds typed `integrity` (pastes, tab leaves, seconds per
      item, long silences, aiBlocked).
    - A partial unique index allows one live attempt per round.
  - **The check** ran inside a transaction that was rolled back:
    - a run with two attempts (55, 81) and a send round-trips through the
      relations
    - a second IN_PROGRESS run for the same student and job is refused
    - a second active send is refused
    - 0 rows remain afterwards

**DoD** 8, 9, 10, 12, 14.
**Why.** A student's progress through a pipeline, each scored attempt and each send need rows of their own. `job_mock_session` is one mock session, not a gated attempt.

**Files.**
- a new `packages/db/src/schema/hiring-rounds.ts`, exported from
  `packages/db/src/schema/index.ts`
- the migration

**Steps.**
- **`hiring_run`:** `userId`, `jobId`, `processId`, `status` (`IN_PROGRESS` |
  `COMPLETE` | `SENT` | `ABANDONED`), `startedAt`.
- **`hiring_attempt`:**
  - who and where: `runId`, `roundId`, `attemptNumber`
  - what was asked: `drawnItems` (jsonb, frozen at start)
  - timing: `startedAt`, `endsAt`, `submittedAt`
  - result: `status`, `score`, `breakdown` (jsonb), `aiRubricResult`
    (jsonb), `transcriptRef`, `integrity` (jsonb: pastes, tab leaves, time per
    item, long silences)
  - money: `creditsHeld`, `jobId` (worker)
- **`hiring_send`:**
  - `runId`, `companyId`, `jobId`
  - `snapshot` (jsonb: exactly what the company sees)
  - `consentText`, `consentedAt`
  - `status` (`SENT` | `VIEWED` | `INVITED` | `DECLINED` | `WITHDRAWN`),
    `companyMessage`, `decidedAt`, `purgeAfter`
  - `profile` (jsonb: name, headline, education, chosen links),
    `emailRevealedAt`
  - `companyOutcome` and `studentOutcome` (`INTERVIEWING` | `OFFER` | `HIRED`
    | `NOT_SELECTED`), with a timestamp for each

**Edge cases.**
- A run is unique per (user, job) while it is `IN_PROGRESS`.
- Starting a run again after `SENT` makes a new run, and history is kept.
- `drawnItems` are frozen when the attempt starts, so editing the pool later
  cannot change an attempt that is in flight or finished.
- The snapshot is a copy, so the company's view cannot change if the student
  retakes later.

**Done when.**
- The migration is applied.
- `tsc` is clean in the three apps.
- A throwaway insert and select script (preview-first) round-trips a run with
  two attempts and a send.

## HR-3 Aptitude question bank
- [ ] Status: written and reviewed 2026-09-25, waiting on the seed `--apply`.
  - 320 questions: QUANT 112, LOGICAL 107, VERBAL 101. Answer positions are
    A 78, B 81, C 81, D 80. Generated quant and logical questions carry a
    `recheck` that works the answer out a second way; the validator runs them all.
  - Spot check: 28 distinct random questions (seeds 3 and 11), worked by hand,
    none wrong.
  - Re-seeding leaves a question someone set to DRAFT as DRAFT and lists it, as
    the edge case below needs.
  - Left: `pnpm script seed-aptitude --apply`, then a re-run showing nothing to
    change.

**DoD** 5, 8.
**Why.** Aptitude is a v1 round type and there is no content. The `assessment_question` tables are keyed by programming language and unused.

**Files.**
- `hiring-rounds.ts` (new table `aptitude_question`: `section` QUANT |
  LOGICAL | VERBAL, `topic`, `difficulty`, `prompt`, `options`,
  `correctIndex`, `explanation`, `status` DRAFT | LIVE, and `companyId`:
  null for ShipItHQ's bank, set for a company's own AI-generated questions,
  see HR-11)
- `packages/db/src/seed/aptitude/*.ts` (content)
- `packages/db/src/scripts/seed-aptitude.ts` (`pnpm script seed-aptitude [--apply]`)

**Steps.**
- Draft about 300 questions (100 per section) with AI.
- Review the options and answers by hand: every question must have exactly one
  correct option.
- Seed them as LIVE through a preview-first, idempotent script that upserts on
  a stable key.

**Edge cases.**
- No question copied from a published test book.
- A question found wrong later is set to DRAFT, not deleted, because past
  attempts reference it.

**Done when.**
- The preview lists about 300 inserts (320 as written), `--apply` writes them, and a re-run shows
  nothing to change.
- A spot check of 30 random questions finds no wrong answer.

## HR-4 ShipItHQ's generic role pipelines
- [ ] Status: not started.

**DoD** 7.
**Why.** Unclaimed pages, and companies that set nothing up, need something to practise, labelled as ShipItHQ's.

**Files.**
- `packages/db/src/seed/hiring-pipelines.ts`
- `packages/db/src/scripts/seed-pipelines.ts` (`pnpm db:seed-pipelines [--apply]`)

**Steps.** Create three `PLATFORM` template pipelines, each with pools drawn
from the DSA catalogue, the aptitude bank and design prompts:
- **Backend SDE-1:** aptitude, 2 DSA, system design, behavioural
- **Frontend intern:** aptitude, DSA, behavioural
- **Full-stack SDE-1:** aptitude, 2 DSA, system design, culture

**Edge cases.**
- DSA pools reference only problems with `judgeStatus` ready.
- The pass marks are ShipItHQ's call (proposed: 60) and are shown as such.

**Done when.** The preview and apply scripts are clean, and each pipeline's
pools hold at least `drawCount x 4` items, so a retake can draw a fresh set.

---

## Phase B - Company profiles

## HR-5 Company scrape (worker job, on Niraj's packages)
- [ ] Status: built 2026-09-25, waiting on migration 0037 for the real-site run.
  - All five registration edits are made. `company_profile_draft` is in
    `schema/hiring-rounds.ts`, in its own migration (0037), not HR-1's.
  - `scrapeSite` gained a `filter` option, so off-domain and robots-disallowed
    URLs are dropped before a credit is spent. Firecrawl only documents robots.txt
    for crawl, so the job reads robots.txt itself (`*` and `FirecrawlAgent`).
  - The pure parts are in `company-scrape-core.ts`: 16 offline checks pass
    (robots rules, refused domains, citation and personal-data stripping).
  - The dead `docs/web-data-providers/firecrawl-vs-exa.md` reference is dropped
    from the package header.
  - Left: run on razorpay.com, linkedin.com and a site that is down (Niraj's
    pick, 2026-09-25).

**DoD** 2, 3.
**Why.** Unclaimed pages are built from the company's own site, both when an
admin adds a company (HR-6) and when a student requests one (HR-7).

**Files.**
- The five edits in `apps/worker/README.md`, for a new job type
  `company_scrape`:
  - `JOB_TYPES` in `packages/db/src/schema/worker.ts`
  - `apps/worker/src/jobs/company-scrape.ts`
  - the `env.ts` bindings and `jobs/index.ts`
  - `wrangler.jsonc`, with a new migration tag
  - `src/index.ts`
- `@repo/firecrawl` and `@repo/exa` added to `apps/worker/package.json`.
  Nothing consumes them yet.
- `FIRECRAWL_API_KEY` in `apps/worker/.env.production.example` and
  `.dev.vars` (the value comes from Niraj; `EXA_API_KEY` already exists).
- `modelFor("companyProfileDraft")` in `packages/ai/src/tasks.ts`.
- A draft table `company_profile_draft` (in HR-1's migration): `domain`,
  `fields` (jsonb, each field with its source URL), `status`, `requestId`.

**Steps.**
- Input is a confirmed domain.
- Call `scrapeSite(key, url, { maxPages: 12, prefer: ["about", "careers",
  "jobs", "engineering", "team", "culture", "benefits"] })`.
  - Keep only pages on that domain.
  - Treat `degraded` as a partial result and say so in the draft.
  - If `scrapeSite` throws (every page failed), fail the job with the real
    reason.
- Have the model draft the profile fields (description, industry, size,
  locations, tech stack, culture, benefits, careers URL), each with its source
  URL.
- Store the result as a draft, never on the live company row.
- Before writing the code, read both packages' headers, and Firecrawl's `/v2`
  docs through Context7. The packages already hold the retry, timeout and
  error policy, so do not add another layer on top.

**Edge cases.**
- Refuse any domain in `SOCIAL_DOMAINS` (LinkedIn included) and honour
  robots.txt.
- Drop personal names and emails from the draft.
- Cost is bounded by `maxPages`: map credits plus 12 pages, at most.
- The package header refers to
  `docs/web-data-providers/firecrawl-vs-exa.md`, which is not in the repo.
  Add it or drop the reference.

**Done when.**
- A real company site produces a draft in which every field cites a page on
  its own domain.
- `linkedin.com/company/x` is refused before any credit is spent.
- A site that is down fails with Firecrawl's reason, not an empty draft.

## HR-6 Admin: create, review and publish unclaimed companies
- [ ] Status: not started.

**DoD** 1, 2.
**Files.** `apps/admin/app/(console)/hiring/companies/*` (a new "Add from website" flow and a draft review screen).

**Steps.**
- The admin enters a URL, which dispatches `company_scrape`.
- The admin reviews and edits the draft field by field, then publishes it as
  a `SCRAPED` / `UNCLAIMED` company, without a logo.

**Edge cases.**
- A company whose domain already exists is not created twice. The admin is
  sent to the existing company instead.

**Done when.** A company created from a URL appears on `/companies` labelled
"Unclaimed - not affiliated with ShipItHQ", with no logo.

## HR-7 Students request a company
- [ ] Status: not started.

**DoD** 3.
**Why.** Students find companies before we do. A request is also a demand
signal: the vote count tells the admin which companies matter.

**Files.**
- `hiring-rounds.ts`: `company_request` (`domain` unique, `name`,
  `status` PENDING | SCRAPING | DRAFTED | PUBLISHED | REJECTED, `companyId`,
  `rejectReason`) and `company_request_vote` (`requestId`, `userId`, unique
  per pair)
- `apps/main/app/(jobs)/companies/request/*` (new), plus an entry point on
  `/companies` and in Browse's empty state
- `apps/main/actions/(jobs)/company-request.action.ts` (new)
- the admin queue in `apps/admin/app/(console)/hiring/companies/*` (sorted by
  votes; it reuses HR-6's review screen)

**Steps.**
1. The student types a name or pastes a URL.
   - **A URL:** `toCompanyDomain`.
   - **A name:** `exaSearch` for the official site, filtering out
     `SOCIAL_DOMAINS`, and show the top result's name, domain and favicon:
     "Is this the company?" The student confirms or picks another.
2. Look up the confirmed domain:
   - already a company: show "Already here" and link to it
   - already requested: add a vote
   - otherwise: create the request, then dispatch `company_scrape` (HR-5)
3. The draft lands in the admin queue. Publishing it runs HR-6's publish,
   links `companyId`, marks the request PUBLISHED, notifies every requester
   and voter, and adds them to `company_follower`.
4. Rejecting it stores a reason, and the requesters are told.

**Edge cases.**
- The 3-a-day cap counts new requests, not votes.
- The Exa lookup is free to the student, and the scrape cost is ShipItHQ's.
- A domain that redirects elsewhere (an acquisition) is resolved to where it
  lands before the dedupe check.
- A rejected domain can be requested again only after 30 days.

**Done when.**
- A name request resolves, is confirmed, scrapes into a draft, and shows in
  the admin queue.
- A second student's request for the same domain shows as a vote (the queue
  says 2).
- A fourth new request in a day is refused.
- Publishing notifies both students, and both follow the company.

## HR-8 Claim and verify
- [ ] Status: not started.

**DoD** 1, 4.
**Files.**
- `apps/hiring` onboarding (`app/(auth)/onboarding`, and the actions that
  create a company)
- a new claim flow
- the admin verification console

**Steps.**
- At onboarding, if the email's domain matches an unclaimed company, offer
  "Claim [company]" instead of creating a new one.
- The claim sets `CLAIM_PENDING`.
- An admin approves it, which sets `CLAIMED`, VERIFIED, `createdByUserId` and
  the founder membership.

**Edge cases.**
- Free-mail domains (gmail and the like) can never claim.
- A second claim while one is pending is refused.
- A rejected claim returns the page to UNCLAIMED.

**Done when.**
- An `@company.com` account claims and sees Pending, and after admin approval
  the page shows Verified.
- A gmail account is refused.

## HR-9 Company page labels
- [ ] Status: not started.

**DoD** 1, 7.
**Files.**
- `apps/main/app/(jobs)/companies/[slug]/*`
- `apps/main/app/(jobs)/companies/page.tsx`

**Steps.** Show exactly one badge, with a one-line explanation:
- Verified
- Unverified (self-serve, waiting for verification)
- "Unclaimed - not affiliated with ShipItHQ"

Unverified and unclaimed companies show "practice only". Label platform pipelines "By
ShipItHQ".

**Done when.** A verified company and an unclaimed one each show the right
label, and no unclaimed page shows a logo or the word "official".

---

## Phase C - Company side (apps/hiring)

Built on `plan/hiring-app` HA-1 to HA-9 (the shared shell, sign-in, roles and
permissions). Every action below checks its permission with `requirePermission`
(HA-6): "manage pipelines" for HR-10 to HR-12.

## HR-10 Pipeline builder with gates
- [ ] Status: not started.

**DoD** 5.
**Files.**
- `apps/hiring/app/(main)/interview-config/*`
- `actions/interview-config/interview-rounds.ts`

**Layout.** An ordered list of rounds on the left (drag to reorder, with each
round's pass mark) and the selected round's settings and pool on the right,
with the company AI docked. It replaces today's interview-config page.

**Steps.**
- Add the fields from HR-1 to the round editor: type, gate mode, pass mark,
  time limit, draw count, cool-down, rubric.
- "Draft with AI" turns the company's description into rounds, which it then
  edits. This reuses the template generation and needs a
  `modelFor("pipelineDraft")` task. It is one model call, run inline with a
  25-second timeout.

**Edge cases.**
- The draw count can't exceed the pool size.
- A HARD round needs a pass mark above 0.
- Editing a template never changes a job's copy (see HR-12).

**Done when.** A founder builds a 4-round pipeline with a HARD DSA round at 65
and an ADVISORY culture round, and reloading shows it unchanged.

## HR-11 Round pools
- [ ] Status: not started.

**DoD** 5.
**Files.** A new pool picker inside the round editor.

**Steps.** What each round type's pool holds:
- **DSA:** search the judged catalogue and pick problems.
- **Aptitude:** pick sections and a difficulty mix, or specific questions,
  from ShipItHQ's bank. Or "Generate with AI" on the company's own topics
  (`modelFor("aptitudeGenerate")`, a worker job, because a batch of
  questions can take longer than 30 seconds). Generated questions arrive
  as DRAFT, private to that company, and only questions the company approves
  one by one can be drawn.
- **System design:** pick prompts, or write a prompt with a rubric.
- **Voice:** a rubric plus the knowledge the interviewer should probe
  (`mockKnowledgeBase`).

**Edge cases.**
- A pool smaller than `drawCount x 2` shows a warning: "retakes will repeat
  questions".
- A company's generated questions never appear in ShipItHQ's bank or in
  another company's picker.
- A generated question with other than exactly one correct option is
  rejected before the company sees it.

**Done when.** A DSA round with 20 picked problems and a draw of 2 saves, and
the warning appears for a pool of 3.

## HR-12 Jobs use a pipeline
- [ ] Status: not started.

**DoD** 6.
**Files.** `apps/hiring/app/(main)/jobs/new`, the job editor, and the job actions.

**Steps.** A job must have a pipeline to publish. A new job starts from the
closest ShipItHQ template, and can instead pick one of the company's
templates.
The first edit makes a job-owned copy (`jobId` set, `sourceTemplateId`
recorded).

**Edge cases.** A published job whose pipeline changes shows a warning that
in-progress runs keep the rounds they started with.

**Done when.** Editing a job's copy leaves the template unchanged, and the
reverse holds too.

---

## Phase D - Student side (apps/main)

## HR-13 Runs and the round runner
- [ ] Status: not started.

**DoD** 8, 9, 13.
**Files.**
- `apps/main/actions/(jobs)/hiring-run.action.ts` (new)
- `apps/main/app/(jobs)/jobs/[slug]/rounds/*` (new: the run overview and each
  round's page)
- `apps/main/lib/credits/pricing.ts` (the new prices, referencing
  `overview.md`)

**Layout.** Focused and full page: the sidebar and AI panel are hidden, and a
slim top bar shows the role, the round, the timer, progress and an exit that
asks for confirmation. DSA embeds the practice workspace, and the other round
types fill the page.

**Steps.**
- **Start:** create a run from the job's pipeline.
- **Round page:** its state is locked, available, cooling down or passed.
- **Starting an attempt:**
  - check the cool-down
  - draw `drawCount` items at random, leaving out the ones the student saw
    last time when the pool allows
  - freeze the draw
  - hold the credits
  - set `endsAt`
- **Unlocking:** a HARD round below its mark keeps the next round locked, and
  an ADVISORY round never does.

**Edge cases.**
- **No AI during an attempt:** while a student has a live attempt,
  `/api/ai/chat`, the practice mentor and the Project AI refuse on the server
  ("AI is off during a round") and add a `aiBlocked` event to the attempt's
  integrity signals.
- A submission after `endsAt` is still accepted, but scores only what was
  saved before `endsAt`. The server clock decides.
- Two tabs cannot run two attempts of the same round.
- A failed attempt refunds its held credits.

**Done when.** On a seeded pipeline: a failed HARD round keeps the next round
locked, a retake inside the cool-down is refused, and the retake after it
draws a different set.

## HR-14 Aptitude runner
- [ ] Status: not started.

**DoD** 8, 12.
**Steps.**
- A timed MCQ runner, one question at a time.
- Scored on the server, with a per-question breakdown.
- Integrity signals: pastes, tab leaves, time per question.

**Edge cases.** The correct answers never reach the browser before submit.

**Done when.** The score matches a hand count on a seeded attempt, and the
signals are recorded.

## HR-15 DSA runner
- [ ] Status: not started.

**DoD** 8, 12.
**Steps.**
- Reuse the practice workspace in EXAM mode, with the drawn problems as tabs.
- Score = weighted judge tests passed.
- Record paste events in the editor.

**Edge cases.** The judge being down fails the attempt with a refund. It never
scores 0.

**Done when.** Solving one of two drawn problems scores about 50, and the
judge output is kept in the breakdown.

## HR-16 System design and voice runners
- [ ] Status: not started.

**DoD** 8, 12, 14.
**Steps.**
- **System design:** the Excalidraw canvas and a written answer, scored against
  the round's rubric: one inline model call with a 25-second timeout
  (CLAUDE.md "Long-running work"; it is not a worker job).
- **Voice:** reuse the voice mock with the round's rubric and knowledge,
  scored by the `mock_feedback` path.
  - Following `responseMode`, the student speaks, types, or chooses, and the
    attempt records which.
  - Ask for recording consent before the first spoken question.
  - Typed turns reply inline (CLAUDE.md "Long-running work").
- Both show an "AI-assessed" label, the rubric result, and the diagram or
  transcript.
- Fix or replace the dead `/mock/company/...` link from `/companies/[slug]/mock`.

**Edge cases.**
- A timeout or failure in AI scoring refunds and marks the attempt "not scored"
  instead of failing it.
- Declining recording consent means no voice round.

**Done when.** Each runner produces a scored attempt with a visible rubric
breakdown, and no link on `/companies/[slug]/mock` leads to a 404.

## HR-17 Results and send
- [ ] Status: not started.

**DoD** 10, 14.
**Files.** `app/(jobs)/jobs/[slug]/rounds/send/*` and `actions/(jobs)/hiring-send.action.ts`.

**Steps.**
- **Summary:** the best and latest attempt per round, with the scores.
- **Picking what to send:** the student chooses which completed attempts make
  up the send. The default is the latest passing attempt of each round.
- **Profile gate:** name, headline and education are required. The screen
  links to whatever is missing.
- **Reuse:** a completed run can also be sent to another role at the same
  company whose pipeline is identical (compared by a content hash of its
  rounds and pools), without retaking.
- **Choosing links:** resume, GitHub, KnowMe, and up to 3 projects. Name,
  headline and education always go. The email is held back until an invite.
- **Preview:** exactly what the company will see.
- **Consent:** one explicit tick, with the text stored.
- **Send:** write the snapshot, and mark it `purgeAfter` per the retention
  rule.
- **Withdraw:** available afterwards.

**Edge cases.**
- Sending is refused for an unclaimed company, a closed job, or any failed
  HARD gate. The page says why.
- One active send per (student, job).
- Withdrawing hides the send from the company straight away.

**Done when.**
- A complete run sends, and the company can see it.
- An unclaimed company shows "Practice only until this company joins".
- A withdrawn send disappears from the company's list.

---

## Phase E - Company review

## HR-18 Applicants by round
- [ ] Status: not started.

**DoD** 11, 12.
**Files.** `apps/hiring/app/(main)/applications/[jobSlug]/*`.

**Layout.** The project workspace's: the candidate list on the left (sortable
by any round), the candidate's rounds as tabs in the middle, the company AI
docked on the right, and arrow keys to move between candidates. Built on the
shared shell (`plan/hiring-app` HA-1).

**Steps.**
- **List:** one row per send, showing the score per round, the attempt
  numbers, an integrity summary and when it was sent.
- **Filter and sort:** by any round's score.
- **Detail:** the round breakdowns, rubrics and transcripts.
- **Compare:** up to three side by side.
- Opening a send marks it VIEWED.

**Edge cases.** Withdrawn sends never appear, not even in counts.

**Done when.** With 5 seeded sends, sorting by the DSA round orders them
correctly and the compare view shows three.

## HR-19 Invite or decline
- [ ] Status: not started.

**DoD** 11.
**Steps.**
- **Invite:** the company writes an optional message. It opens a message
  thread (`plan/hiring-app` HA-10), and the student gets an email and an
  in-app notice. The company's contact is revealed to the student.
- **Outcome:** after an invite, the company marks Interviewing, Offer, Hired or
  Not selected, and the student can record their own. Each side sees both.
  These feed Home and the company page's "answers in X days".
- **Feedback drafted by AI and sent by people** (DoD 28), for an invite or a
  decline:
  - the team adds a short note on why
  - "Draft feedback" writes a personal message from the candidate's full
    results: scores, breakdowns, rubric results, strengths and gaps
  - the team edits it and sends it with the decision
  - with several candidates selected, it drafts one per candidate, each
    reviewable before any is sent
  - each draft is one inline model call (`modelFor("candidateFeedback")`,
    25-second timeout). A batch runs them in parallel and shows each as it
    lands.
- **Decline:** the company can add an optional reason, and the student sees
  the reason and feedback. The student is told,
  and the run can be retaken.

**Edge cases.** An invite or decline is final for that send. Retaking needs a
new send.

**Done when.**
- An invite reaches the student in both channels, and a decline reopens
  retakes.
- For 3 selected candidates, drafts are generated, each naming that
  candidate's own round results. One is edited, and the student receives the
  edited text.
- A draft never goes out without Send.

---

## Phase F - The job board, and trust

## HR-20 Retire the swipe deck; Browse and rounds are the way in
- [ ] Status: not started.

**DoD** 15.
**Why.** Decided 2026-09-25: rounds first, the swipe deck retired.

**Files.**
- `app/(jobs)/jobs/spark/*`
- `app/(jobs)/jobs/page.tsx`
- `jobs/components/jobs-tabs.tsx`
- `swipe-card.tsx` and `spark-skeleton.tsx`
- the jobs navigation in `lib/navigation`

**Steps.**
- `/jobs` redirects to Browse.
- On a job page, the primary action becomes "Take the rounds".
- Remove the Spark tab and its components.

The deletion itself was approved as part of the 2026-09-25 decision. List the
files in the PR before removing them.

**Edge cases.**
- Existing `job_application` rows keep their history and still show under
  Applied.
- Old `/jobs/spark` links redirect instead of returning 404.

**Done when.** `/jobs` and `/jobs/spark` land on Browse, no Spark component
remains, and the old applications still list.

## HR-21 Consent, retention and legal pages
- [ ] Status: not started.

**DoD** 14.
**Files.**
- a new worker alarm `hiring_send_purge`
- `apps/web` terms and privacy pages
- the hiring app's company terms

**Steps.**
- Purge snapshots past `purgeAfter`.
- **Deleting an account** withdraws the student's sends, deletes their
  snapshots immediately, and marks their threads "account deleted".
- Add the terms for sends, AI assessment, recording and unclaimed pages.
- A lawyer reviews the text before launch. This is a non-code step, Niraj's.

**Done when.** A send forced past `purgeAfter` has its snapshot removed on the
next alarm, and the terms pages describe sends, consent and AI scoring.


---

## Phase G - Added in the second planning pass (2026-09-25)

## HR-22 My rounds (student hub)
- [ ] Status: not started.

**DoD** 16, 17.
**Files.**
- `apps/main/app/(jobs)/jobs/applications/*` (becomes My rounds, with the tab
  relabelled in `jobs-tabs.tsx`)
- its `loading.tsx`

**Steps.** Sections for:
- **In progress:** each run's next round and any cool-down countdown.
- **Sent:** viewed or not.
- **Invited:** with the company's thread (HA-10) and the outcome, which the
  student can record too.
- **Declined** and **withdrawn.**
- **History:** the old `job_application` rows, read-only, below.

**Edge cases.** A run for a closed job, or for an unverified or unclaimed
company, shows "practice only".

**Done when.** Each state appears in its section with seeded runs, and the
student's own outcome can be set and shows on the company side.

## HR-23 The public company page
- [ ] Status: not started.

**DoD** 1, 22.
**Files.** `apps/main/app/(jobs)/companies/[slug]/*`, and its loading skeleton.

**Steps.** The sections from DoD 22.
- The stats show only past a minimum count (proposed: 10 practising, 5 sends),
  so small numbers never identify a person.
- Unclaimed pages cite a source per profile field, and show no logo.

**Done when.** A verified company and an unclaimed one each render every
section correctly, and stats stay hidden under the minimum.

## HR-24 Reporting and blocking
- [ ] Status: not started.

**DoD** 20.
**Files.**
- a new `report` table (`reporterId`, `targetKind` COMPANY | JOB | MESSAGE |
  STUDENT, `targetId`, `reason`, `status`) and a `company_block` table
- report buttons on the company page, the job page, each message, and the
  company's candidate view
- an admin queue in `apps/admin`

**Steps.**
- Admin actions: hide a job, suspend a company (its pages show "suspended",
  sends are blocked), and review a student's attempts.
- A student's block stops the company from opening or continuing a thread.

**Edge cases.**
- A company never learns who reported it.
- A blocked company sees "this candidate isn't accepting messages", not the
  reason.

**Done when.** Each of the four report types reaches the admin queue, and a
block stops a company's message on the server.

## HR-25 The company is told about each send
- [ ] Status: not started.

**DoD** 19.
**Steps.** On each send:
- a `notifications` row (platform HIRING) for every member with "view
  candidates"
- a `NEW_SEND` email to each of them, linking to that candidate in the review
  workspace

**Edge cases.** A withdrawn send hides its notification.

**Done when.** One send produces one in-app notice and one email per eligible
member, and none for a member without "view candidates".

## HR-26 Closed jobs and anonymous practice numbers
- [ ] Status: not started.

**DoD** 18, 21.
**Steps.**
- **Closed job:** keep its pipeline startable as practice and block sending on
  the server. Waiting sends stay with the company.
- **Anonymous numbers:** per round, how many are practising and how many pass,
  for Home (`plan/hiring-app` HA-15) and the company page (HR-23). These never
  include a student id in any company-facing query.

**Done when.**
- Starting a closed job's run works, and sending is refused.
- The company sees counts that match the database and no identity.
