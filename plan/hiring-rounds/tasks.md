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

Report the generated SQL, then apply it with `pnpm script migrations` (preview)
and `--apply`.

**Edge cases.**
- Existing rounds get `gateMode = ADVISORY` and `passMark = 0`, so nothing that
  works today starts blocking anyone.
- Existing companies are `SELF_SERVE` and `CLAIMED` (they signed up).
- A `job.interviewProcessId` that points at nothing is set to null by the
  migration and counted in the preview, not left dangling.

**Done when.**
- `pnpm script migrations` previews the SQL, and `--apply` then reports nothing
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
- [x] Status: done 2026-09-25. 320 LIVE rows seeded; the re-run shows "Nothing to change".
  - 320 questions: QUANT 112, LOGICAL 107, VERBAL 101. Answer positions are
    A 78, B 81, C 81, D 80. Generated quant and logical questions carry a
    `recheck` that works the answer out a second way; the validator runs them all.
  - Spot check: 28 distinct random questions (seeds 3 and 11), worked by hand,
    none wrong.
  - Re-seeding leaves a question someone set to DRAFT as DRAFT and lists it, as
    the edge case below needs.

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
- [x] Status: done 2026-09-25.
  - Migrations 0039 to 0042 are applied, and the six new tables and the
    `template_key` column were checked in the database.
  - `pnpm script seed-pipelines --apply` wrote 12 design prompts, 3
    pipelines, 13 rounds and 1,074 pool items. The re-run says "Nothing to
    change"; every pool holds at least 4x its draw.
  - Two fixes came out of the first real run:
    - Seed scripts now stop with the exact `pnpm script migrations` command
      when migrations are pending (`_migrations-check.ts`), instead of
      failing on a raw query.
    - The re-plan compared `jsonb` rubrics by key order, which Postgres
      changes, so it called 15 unchanged rows "changed". It now compares
      canonical JSON.

**DoD** 7.
**Why.** Unclaimed pages, and companies that set nothing up, need something to
practise, labelled as ShipItHQ's.

**Decisions.** In the overview: "ShipItHQ's platform pipelines" (pass mark 60,
HARD on aptitude and DSA, ADVISORY on AI-assessed rounds, the standard sizes,
and the `design_prompt` table).

**Files.**
- `packages/db/src/schema/hiring-rounds.ts`: a `design_prompt` table (`key`
  unique, `companyId` null for ShipItHQ's, `title`, `prompt`, `rubric`
  `[{ criterion, weight, lookFor }]`, `difficulty`, `status` DRAFT | LIVE).
- `packages/db/src/schema/jobmock.ts`: `interview_process.template_key`, text,
  unique and nullable, the seed key for platform pipelines.
- The migration for both (0039; 0038 is another session's `resume_file`).
- `packages/db/src/seed/design-prompts.ts`: 12 prompts (4 EASY, 6 MEDIUM,
  2 HARD), each with a rubric whose weights sum to 100.
- `packages/db/src/seed/hiring-pipelines.ts`: the three pipelines.
- `packages/db/src/scripts/seed-pipelines.ts`, run with
  `pnpm script seed-pipelines [--apply]`. It seeds the design prompts, then
  the pipelines, rounds and pools.

**Steps.** Three `PLATFORM` template pipelines:
- **Backend SDE-1:** aptitude, DSA easy, DSA medium, system design,
  behavioural
- **Frontend intern:** aptitude (EASY and MEDIUM only), DSA easy, behavioural
- **Full-stack SDE-1:** aptitude, DSA easy, DSA medium, system design,
  culture

The script is idempotent and upserts on keys:
- pipelines on `template_key`
- rounds on `(processId, roundNumber)`
- pool items on `(round, kind, ref)`

It adds items that are missing and never deletes one: a pool item may be
referenced by past attempts' drawn sets. Voice rounds carry a rubric and
`mockKnowledgeBase`, and no pool.

**Edge cases.**
- DSA pools reference only problems with `judgeStatus` ready.
- The pass marks are ShipItHQ's call (60) and are shown as such.
- A platform pipeline has no `companyId`
  (`chk_interview_process_owner` allows it only for PLATFORM).

**Done when.** The preview and apply scripts are clean, a re-run shows nothing
to change, and each pool holds at least `drawCount x 4` items. The script
checks this, and refuses to apply otherwise.

---

## Phase B - Company profiles

## HR-5 Company scrape (worker job, on Niraj's packages)
- [x] Status: done 2026-09-25, verified against all three "Done when" lines
  with the local worker.
  - **razorpay.com:** READY. It read 8 pages (homepage, /about, /careers,
    engineering.razorpay.com), and every kept field cites one of them.
    Culture was dropped as `not_cited` (the model made up a URL from a page's
    title), and benefits were dropped as `not_an_employer_page`.
  - **linkedin.com:** FAILED before any request left the worker.
  - **A domain that does not exist:** FAILED with Firecrawl's own DNS reason.
  - The first real run exposed three problems, and each one now has a check:
    1. gpt-4o-mini copied the prompt's example benefits word for word. The
       examples are gone, and every short fact (size, locations, tech stack,
       benefits, name) must appear on the page it cites (`grounded`).
    2. Map's `search` is fuzzy (for razorpay.com, "about" returned docs pages
       titled "About Payment Pages") and its index did not hold /about-us or
       /jobs. `probeWellKnown` now finds /about, /careers and the rest with
       free plain requests, and `scrapeSite` gained `seeds` to read them first.
    3. Asked for benefits, the model listed what the product gives customers,
       even when told not to. Culture and benefits must now cite an
       employer-facing page (`isEmployerPage`).
  - `scrapeSite` also gained `filter` (`isRelevantPage`: the homepage, plus
    sections and subdomains about working there; locale prefixes like /in/
    are skipped). This drops off-domain, docs, legal and robots-disallowed
    URLs before any credit is spent.
  - The job's result lists every dropped field with its reason, and with what
    the model cited when the reason is `not_cited`.
  - Robots.txt: Firecrawl only documents it for crawl, so the job reads
    robots.txt itself (`*` and `FirecrawlAgent`, longest match wins).
  - 41 offline checks cover `company-scrape-core.ts`.
  - Firecrawl's free plan allows 10 requests a minute: one run is about 7 map
    searches plus up to 12 pages, so runs close together get 429s and
    partial drafts.
  - `company_profile_draft` has its own migration (0037), not HR-1's.
  - The dead `docs/web-data-providers/firecrawl-vs-exa.md` reference is dropped
    from the package header.

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
- [ ] Status: code done 2026-09-25, and `tsc` is clean in admin and main. The
  admin-UI checks in "Done when" are Niraj's.
  - **Admin setup:** `apps/admin/.env` created (gitignored; main's values plus
    WORKER_*), the `WORKER` service binding added, and `WORKER_SECRET` moved
    into the used section of both env examples.
  - **Admin pages:** Drafts list at `/hiring/companies/drafts`, with the
    add-from-website form, a StatBand, the table and polling. Review page at
    `/drafts/[id]`, with field rows, source links, keep switches, dropped
    reasons, the pages read, and a two-step Discard. Both have matching
    `loading.tsx`, and "Company drafts" is in the hiring sidebar.
  - **Main pages:** found while wiring the label, `browseCompanies` never
    returned `claimStatus`, and `getCompanyBySlug` hard-coded `techStack` and
    `benefits` to `[]`. Both now read the row. The company page shows no logo
    for an unclaimed company, and says it is unclaimed.
  - `verifiedBy` now comes from the session, and the verification queue leaves
    out UNCLAIMED companies.

**DoD** 1, 2.

**Decisions (Niraj, 2026-09-25):**
- **Admin env:** as with hiring, `apps/admin/.env` is copied from main's, plus
  `WORKER_URL` and `WORKER_SECRET`, and admin's `wrangler.jsonc` gets the
  `WORKER` service binding.
- **Review UI:** a Drafts list under Companies, and a full review page per
  draft. Each field is a row with an editable value, its source link and a
  keep toggle; the pages read sit in a side column; Publish is at the bottom.

**Made here (not a product decision):** a published unclaimed company keeps
`verificationStatus` PENDING, since it is genuinely unverified. The admin
verification queue leaves out UNCLAIMED companies, so it lists only real
claims (HR-8) and self-serve sign-ups.

**Files.**
- `apps/admin/actions/hiring/company-drafts.action.ts` (new):
  - `startCompanyScrape`
  - `listCompanyDrafts`
  - `getCompanyDraft`
  - `discardCompanyDraft`
  - `publishCompanyDraft`
- `apps/admin/lib/workers.ts` (new): the job token and the worker call, as in
  main's `lib/workers/client.ts`.
- `apps/admin/app/(console)/hiring/companies/drafts/page.tsx`, `loading.tsx`
  and `_components/*`: the Drafts list with the "Add from website" form.
- `apps/admin/app/(console)/hiring/companies/drafts/[id]/page.tsx`,
  `loading.tsx` and `_components/*`: the review page.
- `apps/admin/app/(console)/hiring/companies/_components/companies-client.tsx`:
  links to Drafts.
- `apps/admin/actions/hiring/hiring.action.ts`: the queue filter, and
  `verifiedBy` from the session rather than from the caller's argument (anyone
  with hiring write access could put another admin's id on a verification).
- `apps/main/app/(jobs)/companies/companies-content.tsx`: the "Unclaimed - not
  affiliated with ShipItHQ" label, with no logo.

**Steps.**
1. **Start a scrape.** The admin enters a URL or a bare domain. The domain
   goes through `toCompanyDomain`, and social or non-company hosts are
   refused.
   - A domain that already belongs to a company returns that company.
   - A domain already being scraped returns that draft.
   - Otherwise: insert the draft (SCRAPING) and the `background_job`, then
     dispatch `company_scrape`.
2. **The Drafts list** polls while anything is SCRAPING. A FAILED draft shows
   Firecrawl's reason and can be retried.
3. **Review.** The admin edits values, drops fields and publishes. The
   company is created with:
   - a slug from its name
   - `website` https://domain and `websiteDomain`
   - `profileSource` SCRAPED, `claimStatus` UNCLAIMED, `scrapedAt`
   - no logo
   The draft becomes PUBLISHED, with `companyId` set; it keeps the source per
   field, which the public page cites (HR-23).
4. Every start, discard and publish is written to the admin audit log.

**Edge cases.**
- A company whose domain already exists is not created twice. The admin is
  sent to the existing company instead. This is checked again at publish time,
  because a self-serve sign-up can claim the domain in between.
- **An orphaned SCRAPING draft** (found in HR-5's run, 2026-09-25): a job the
  platform kills before `run()`'s catch (an evicted Durable Object; stale-run
  recovery fails the job but never touches the draft) leaves its draft in
  SCRAPING, and `uq_company_profile_draft_scraping` then blocks that domain
  forever. Before dispatching, the dispatcher (here and in HR-7) marks FAILED
  any SCRAPING draft for the domain whose `background_job` is terminal or
  older than 15 minutes.

- A dispatch that fails marks the draft FAILED with the reason, and the job
  failed, so nothing is left in SCRAPING.
- A slug collision gets a numeric suffix.
- Publishing requires a name and a description; every other field is
  optional.

**Done when.**
- A company created from a URL appears on `/companies` labelled "Unclaimed -
  not affiliated with ShipItHQ", with no logo.
- The draft is PUBLISHED and points at the company.
- A second scrape of the same domain goes to the existing company.
- `tsc` is clean in admin and main.
- The browser pass is Niraj's.

## HR-7 Students request a company
- [ ] Status: code done 2026-09-25, and `tsc` is clean in main, admin and
  worker. Waiting on migration 0041; the checks in "Done when" are Niraj's.
  - **Main:** `actions/companies/request.action.ts` has `lookupCompany`,
    `requestCompany` and `getMyCompanyRequests`. The `/companies/request` page
    has search, candidates, "Your requests", "How it works" and a matching
    `loading.tsx`. Entry points: the Companies header, the Companies empty
    state (carries the search as `?q=`), and the Browse empty state.
  - **Admin:** the Drafts queue has an "Asked by" column and puts the
    most-voted drafts that are ready for review first.
    - The review page says how many students asked.
    - Publishing makes every voter follow the company, and sends them an
      in-app notification and an email.
    - Discarding a requested draft needs a reason, which rejects the request
      and tells the students by notification and email.
    - A retry from the queue stays linked to the request.
  - **Worker:** marks the request DRAFTED when its draft is ready.
  - **Reopening:** a rejected domain can be asked for again after 30 days. It
    counts as a new request, and the old votes are cleared, because those
    students were already told it was not added.
  - `request` is a reserved company slug: the static route would shadow a
    company page with that slug.

**Decisions (Niraj, 2026-09-25; recorded in the overview):**
- Notify in-app and by email.
- Students get 10 name lookups a day.
- Exa for the name, Firecrawl to read.

**Changed while planning:**
- A `company_lookup` table (`userId`, `query`, `createdAt`) counts lookups;
  there is no rate-limit table to reuse.
- The request action lives at `apps/main/actions/companies/request.action.ts`,
  beside the other company actions (`actions/(jobs)` does not exist).
- `company_profile_draft.request_id` gets its foreign key (set null).
- The worker's `company_scrape` marks the request DRAFTED when its draft is
  READY.
- The admin queue is HR-6's Drafts page: it shows each request's votes and
  sorts drafts ready for review by votes.
- Publishing a requested draft marks the request PUBLISHED, links
  `companyId`, makes every voter follow the company, and notifies them.
- Discarding a requested draft asks for a reason and rejects the request,
  telling the voters why.
- Candidates show a letter tile, not a favicon: a favicon service would learn
  every domain a student looks up.

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
- [ ] Status: code done 2026-09-25, and `tsc` is clean in hiring, admin and
  main. Waiting on migration 0042; the checks in "Done when" are Niraj's.
  - **Hiring onboarding:**
    - three new states: `claimable` (the form: job title, optional LinkedIn,
      note), `claim_pending` (the wait screen) and `claim_in_review`
    - `claimCompany` writes the claim and CLAIM_PENDING in one transaction,
      with the unique index guarding a race
    - `completeOnboarding` refuses to create a second company for a domain
      whose page is unclaimed
  - **Admin:** `claims.action.ts` (list, approve, reject) and a "Claims on
    company pages" section above the sign-up queue.
    - Each claim shows whether the email domain matches, and any earlier
      rejections.
    - Approve (one transaction): the claim is approved; the company becomes
      CLAIMED and VERIFIED, with its owner recorded; the four roles are
      created if missing; the claimant becomes an Owner member and gets an
      in-app hiring notification. Then an email.
    - Reject: needs a reason; the page goes back to UNCLAIMED, and the
      claimant is emailed and sees the reason at their next onboarding.
  - **Found and fixed:** the old sign-up queue would have listed
    claim-pending companies, and approving there verified a company with no
    Owner. That queue and its dashboard count now take CLAIMED companies only,
    and `verifyCompany` refuses anything else.
  - **Main:** a page with a claim still pending keeps the "Unclaimed" label and
    shows no logo.

**DoD** 1, 4.

**Decisions (Niraj, 2026-09-25):**
- **While a claim is pending**, onboarding shows a wait screen: no workspace,
  and nothing on the page changes. On approval the claimant becomes Owner of
  the existing page, which keeps its jobs, followers and profile, and is told
  by email.
- **The claim form** asks for a job title (required), and optionally a
  LinkedIn profile URL and a short note. The admin sees these beside the
  email-domain match.

**Made here:**
- A rejected claim returns the page to UNCLAIMED. Anyone from the domain,
  including the same person, may claim again; the admin console shows earlier
  rejections for the company.
- The claimant is emailed either way; on approval they also get an in-app
  hiring notification.

**Files.**
- `packages/db/src/schema/hiring-rounds.ts`: `company_claim`, with:
  - `companyId`, `userId`, `email`
  - `jobTitle`, `linkedinUrl`, `note`
  - `status` PENDING | APPROVED | REJECTED
  - `rejectReason`, `decidedAt`, `decidedByUserId`
  - a partial unique index: one PENDING per company
  Migration 0042.
- `apps/hiring/actions/auth/onboarding.action.ts`:
  - `getOnboardingEligibility` gains `claimable`, `claim_pending` and
    `claim_in_review`
  - new `claimCompany`
  - `completeOnboarding` refuses a domain whose page is unclaimed
- `apps/hiring/app/(auth)/onboarding/page.tsx`: the claim form and the pending
  screen.
- `apps/admin/actions/hiring/claims.action.ts` (new): `listCompanyClaims`,
  `approveCompanyClaim` and `rejectCompanyClaim`.
- `apps/admin/lib/emails/company-claim.ts` (new).
- `apps/admin/app/(console)/hiring/companies/verification/*`: a Claims section
  above the existing queue.

**Steps.**
1. **Onboarding** checks the email's domain:
   - an UNCLAIMED page offers "Claim <company>" with the form
   - a page with this user's PENDING claim shows the wait screen
   - a page claimed by someone else shows "Someone from <company> has claimed
     it; once approved, ask them for an invite"
2. **Claiming** writes the claim and sets the company CLAIM_PENDING, in one
   transaction.
3. **Approving** (admin), in one transaction:
   - the claim becomes APPROVED
   - the company becomes CLAIMED and VERIFIED, with `verifiedAt`,
     `verifiedBy` and `createdByUserId`
   - the four roles are created if the company has none
   - the claimant becomes an Owner member
   Then the email and the in-app notification.
4. **Rejecting** (admin, with a reason) sets the claim REJECTED and the
   company back to UNCLAIMED, then emails the reason.

**Edge cases.**
- Free-mail domains (gmail and the like) can never claim: `checkWorkEmail`.
- A second claim while one is pending is refused; the unique index guards the
  race.
- A claimant who has joined another company by the time of approval: approval
  is refused with that reason, and the admin rejects instead.
- The domain must still match at approval time, because the user's email can
  change.

**Done when.**
- An `@company.com` account claims and sees Pending.
- After admin approval the page shows Verified, and the claimant signs in to
  the workspace as Owner.
- A gmail account is refused.
- Rejecting puts the page back to Unclaimed and the claimant sees the reason
  on their next visit.

## HR-9 Company page labels
- [ ] Status: code done 2026-09-25, and `tsc` is clean in main. Needs
  migration 0039 and `pnpm script seed-pipelines --apply` before the ShipItHQ
  pipelines appear. The browser check is Niraj's.
  - `CompanyTrustBadge` is the only label on directory cards (compact, with
    the explanation as its tooltip) and on the company page (with the
    explanation line). The old verified tick and unclaimed text are gone.
  - Logos follow `companyTrust().showLogo`: never on an unclaimed page or one
    with a claim pending.
  - The process section shows "By ShipItHQ" with a line saying these are not
    the company's own process, and has a pipeline switcher.
  - No "official" anywhere under /companies (grep, 2026-09-25).

**Made here:**
- One helper, `apps/main/lib/company-trust.ts`, decides the label from
  `claimStatus` and `verificationStatus`, and one component renders it, so the
  list and the page cannot disagree.
  - A pending claim still reads Unclaimed.
  - A rejected self-serve sign-up reads Unverified.
- `getCompanyInterviewProcesses` returns the company's templates only (it
  returned jobs' private copies too).
  - When a company has none, it returns ShipItHQ's platform pipelines,
    flagged `byShipItHQ`.
  - The page gets a switcher when there is more than one pipeline; it showed
    only the default before.

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
- [ ] Status: code done 2026-09-25, and `tsc` is clean in hiring. Migration
  0044 is applied. The browser check ("builds a 4-round pipeline, reload shows
  it unchanged") is Niraj's.
  - **List page:** a StatBand, "Your pipelines", three ShipItHQ template cards
    ("Use this template" copies the rounds and pools), and inline New and
    "Draft with AI" panels showing the drafts left today.
  - **Builder:**
    - a round list you can drag or move with the arrows, showing each round's
      gate and pass mark and marking problems
    - an editor for type, title, description, gate, pass mark, time limit,
      cool-down, questions per attempt, and the question level for a new or
      changed round, with a pool warning
    - for voice rounds: the answer mode, a rubric editor (weights must sum to
      100) and the interviewer brief
    - Save stays disabled until every round passes `roundProblems`; the
      server checks the same rules again
    - asks before leaving with unsaved changes, and deletion is two-step
      (refused while jobs use the pipeline)
  - **AI draft:** checked for real against gpt-4o-mini on an intern role and a
    senior role (2026-09-25). The first run gave two aptitude rounds and DSA
    titles that didn't match their levels. Now the prompt allows one round per
    type (two for DSA), the server enforces that, a second DSA round is a
    level harder, and DSA titles come from the level they really draw.
  - The sidebar says "Interview pipelines"; home's `/interview-config/new`
    link now points at the list.

**Decisions (Niraj, 2026-09-25):**
- **Structure:** a list page and a builder page. `/interview-config` lists
  the company's pipelines (rounds, gates, jobs using each), with New, "Draft
  with AI" and "Start from a ShipItHQ template". `/interview-config/[id]` is
  the builder.
- **Saving:** one explicit Save writes the whole pipeline, checked on the
  server. Leaving with unsaved changes asks first.
- **Old round types:** not in production, so nothing is preserved. The builder
  offers only the five v1 types. An old round shows as "Legacy", and Save
  refuses until its type is changed.
- **The AI draft cap** lives in `@repo/pricing` (`HIRING_AI_LIMITS`), for
  Niraj to set; it starts at 10 a day per company.

**Made here:**
- Drafts are counted in a `company_ai_usage` table (`companyId`, `userId`,
  `kind`, `createdAt`), which the company AI panel (HA-11) will reuse.
  Migration 0043.
- Reordering uses framer-motion's `Reorder`, with up and down buttons for the
  keyboard; there is no new dependency.
- A new or AI-drafted round gets a default pool: the LIVE bank for aptitude,
  judge-ready problems of its difficulty for DSA, and the prompts for system
  design. That makes a pipeline usable at once; HR-11 edits the pools.
- The old `interview-config-content.tsx` and its two `components/*` files are
  replaced (Niraj: "not in production, no worries").
- The builder's right column leaves room for the company AI dock (HA-11).

**Files (as built).**
- `packages/db/src/schema/hiring-rounds.ts`: `company_ai_usage`.
- `packages/pricing/src/hiring.ts`: `HIRING_AI_LIMITS`.
- `packages/ai/src/tasks.ts`: `pipelineDraft`.
- `apps/hiring/lib/ai.ts`: one JSON completion with a 25-second timeout.
- `apps/hiring/actions/interview-config/pipeline-builder.action.ts`.
- `apps/hiring/app/(main)/interview-config/page.tsx` and `loading.tsx`: the
  list.
- `apps/hiring/app/(main)/interview-config/[id]/page.tsx` and `loading.tsx`:
  the builder.

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
- [ ] Status: code done 2026-09-25, and `tsc` is clean in hiring and worker.
  The browser check (20 picked problems with a draw of 2 saves; a pool of 3
  warns) is Niraj's.
  - **Pool sheet:** search; difficulty, section, "Yours" and topic filters;
    "Tick all shown" and Clear; a running count with the draw and repeat
    warnings. It is read-only for members without the permission. It opens
    seeded with the pool Save would use, so opening it alone changes nothing.
  - **Design prompts:** "Write your own" saves a LIVE, private prompt with a
    rubric (weights must sum to 100) and ticks it.
  - **Aptitude, "Generate with AI":** a worker job, `aptitude_generate`, with
    all five registration edits and wrangler tag v14. Hiring gained
    `lib/workers.ts`, WORKER_* env and the `WORKER` binding.
    - Found in real runs on 2026-09-25:
      - Asked to mark its own answer, gpt-4o-mini got 6 of 10 quant
        questions wrong.
      - With answer-first writing, answer-text matching and a blind second
        solve, 8 of 10 were kept, all correct.
      - End to end on the local worker: 10 of 10 created, all correct by
        hand.
      - Every answer was option A until the job shuffled the options. After
        the shuffle the answers spread across A to D.
    - 10 reviewed-correct DRAFT questions are left in E2E Hiring Co for the
      manual pass.
  - **Review:** each draft can be edited (question, four options, correct
    answer, explanation), then approved (LIVE and pickable) or rejected
    (deleted; it was never drawn).

**Decisions (Niraj, 2026-09-25):**
- **The picker** is a side sheet opened from the round ("Pool: 22 problems ·
  Edit pool"). It has search, filters, a checkbox list with difficulty and
  topic, a running count, and "select all shown". Pool changes save with the
  pipeline's Save.
- **Aptitude draws evenly** across the sections present in the pool (about
  7/7/6 of 20); HR-14's runner does it, with no setting.
- **Generate with AI:** the company chooses how many questions per
  generation. The range and the daily cap live in `@repo/pricing`
  (`HIRING_AI_LIMITS`), for Niraj to set: 5 to 30 per generation, 5
  generations a day.

**Made here:**
- `getPipeline` returns each round's pool as ref ids.
- `savePipeline` accepts `pool` per round. When set, the pool is replaced
  with exactly those items, after checking each one exists, is the right kind,
  and is visible to this company. A company's DRAFT questions are never
  drawable.
- A company-written design prompt (title, brief, rubric, difficulty) is saved
  LIVE and private to the company: writing it is the approval.
- The AI generation is a worker job, `aptitude_generate`, because a batch can
  take longer than 30 seconds. Hiring dispatches it the way admin does
  (`lib/workers.ts` and the `WORKER` binding). The job writes DRAFT rows with
  `companyId` set, and only after checking four distinct options and exactly
  one correct answer.

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
- [ ] Status: code done 2026-09-25, and `tsc` is clean in hiring. The browser
  check ("editing a job's copy leaves the template unchanged, and the reverse")
  is Niraj's. The separation is structural: a job's copy is its own
  `interview_process` rows, made by `createJobCopy`.
  - `lib/pipelines.ts` (server-only) holds:
    - `copyRounds` and `createJobCopy`
    - `runsUsing`
    - `pipelineReadiness` (the builder's `roundProblems` over saved rounds
      and pool sizes)
    - `isUsableTemplate`
  - **Creating:** `createJob` checks the template, then copies it in the same
    transaction. Publishing (on create, `updateJob` to ACTIVE, or
    `publishJob`) needs a ready pipeline; drafts don't. `duplicateJob` copies
    the pipeline.
  - **The builder** reads and saves job copies. Saving a copy with runs forks
    it: a new copy, and the job moves to it. It counts a template's jobs by
    source, and deleting a template leaves the jobs' copies alone.
  - **Pages:** `/jobs/new` has the Pipeline section (the closest ShipItHQ
    template follows the title until picked).
    - `/jobs/[slug]/edit` is new (it was a 404 from the jobs list): the same
      form in edit mode, with the job's copy, "Edit rounds for this job",
      Replace, readiness problems and the runs warning.
    - `/jobs/[slug]/pipeline` is new: the builder with the job banner.
    - Both reuse existing skeletons.

**DoD** 6.

**Decisions (Niraj, 2026-09-25):**
- **Copy when chosen:** picking a pipeline for a job copies it at once
  (`isTemplate` false, `jobId`, `sourceTemplateId`). Template edits never reach
  a job. Once candidates have started a job's rounds (a `hiring_run` points at
  its copy), saving that copy forks a new version: the job moves to it, and
  in-progress runs keep the rounds they started with.
- **Where it's edited:** the job form (new, and the missing edit page) has a
  Pipeline section. It picks a template, defaulting to the closest ShipItHQ
  one, lists the rounds, and has "Edit rounds for this job", which opens the
  same builder at `/jobs/[slug]/pipeline` with a banner naming the source
  template.

**Found while planning:**
- `/jobs/[slug]/edit` is linked from the jobs list but doesn't exist (a 404).
  It is built here.
- `createJob` and `updateJob` accepted any `interviewProcessId` (HA-18). Now
  the id must be the company's template or a ShipItHQ one, and it is always
  copied.
- `duplicateJob` shared the original job's process; it now gets its own copy.
- The builder's list counted jobs by direct reference; with copies, it counts
  jobs whose copy came from the template.

**Files.**
- `apps/hiring/actions/jobs/job-pipeline.action.ts` (new):
  - `getPipelineChoices`
  - `assignJobPipeline`
  - `getJobPipeline`
  - `pipelineReadiness`
- `apps/hiring/actions/jobs/job-crud.ts` and `job-status.ts`: copy on
  create, publish only with a ready pipeline, copy on duplicate.
- `apps/hiring/actions/interview-config/pipeline-builder.action.ts`: job
  copies (read, save, fork on write), and jobs counted by source.
- `apps/hiring/app/(main)/jobs/new/*`: the Pipeline section.
- `apps/hiring/app/(main)/jobs/[slug]/edit/*` (new): the same form in edit
  mode.
- `apps/hiring/app/(main)/jobs/[slug]/pipeline/*` (new): the builder for the
  job's copy.

**Steps.**
- Publishing (create as ACTIVE, or `publishJob`) needs a pipeline with at
  least one round and no problems: no legacy types, and every pool at least
  its draw. A draft may be saved without one.
- The closest ShipItHQ template is picked by the title: "intern" goes to
  Frontend intern, "full stack" or "full-stack" to Full-stack SDE-1, anything
  else to Backend SDE-1. It follows the title until the company picks one
  itself.

**Edge cases.**
- A published job whose pipeline changes shows a warning that in-progress
  runs keep the rounds they started with.
- Replacing a job's pipeline deletes its old copy only when no run uses it.

**Done when.** Editing a job's copy leaves the template unchanged, and the
reverse holds too.

---

## Phase D - Student side (apps/main)

## HR-13 Runs and the round runner
- [x] Status: done 2026-09-25 for the engine; the pages' browser pass is
  Niraj's.
  - **Verified against the dev DB** (e2e student, Backend SDE-1 practice
    run):
    - 20 distinct questions drawn, spread 7/6/7 across the sections; 5
      credits held, then settled (265 to 260)
    - 10 of 20 right scored 50, matching a hand count
    - the failed HARD round cooled down and kept round 2 locked, and a retake
      inside the cool-down was refused
    - after the cool-down, the retake drew a set with 0 overlap
    - the test run was deleted afterwards
  - **Rules:** `lib/hiring/round-state.ts` is pure, with 8 offline checks. A
    NOT_SCORED attempt (refunded) neither clears a round nor starts a
    cool-down: the student did nothing wrong.
  - **Engine:** `lib/hiring/runs.ts` (server-only) holds:
    - the draw (fresh when the pool allows, aptitude spread evenly)
    - aptitude scoring
    - `closeAttempt` (settle or refund, then COMPLETE)
    - expiry on read
    - `liveAttemptFor` and `recordAiBlocked`, and the integrity merge
  - **Schema:** migration 0045 (practice runs: nullable `job_id`,
    `company_id`, a per-pipeline live index); 0046 adds
    `hiring_attempt.responses` and `responded_at`.
  - **Actions:** `actions/hiring/run.action.ts`: `getJobRounds`,
    `getPracticeRounds`, `startRound` (run, state check, draw, hold, attempt;
    two tabs join one attempt), `getRunnerAttempt` (never sends answers
    before scoring), `saveAttempt` (refused after `endsAt`), and
    `submitAttempt` (a late one scores what was saved in time).
  - **Pages:**
    - `/jobs/[slug]/rounds` and `/companies/[slug]/rounds/[processId]`: the
      overview, with its skeleton
    - `/round/[attemptId]` in the new `(focus)` group: the runner, with its
      skeleton
    - "Take the rounds" on the job page, "Practise these rounds" on company
      pages with ShipItHQ pipelines
  - **AI off during a round:** `/api/ai/chat`, `/api/practice/mentor` and
    `sendAiMessage` refuse with 403 and count `aiBlocked`.

**Made here (following decisions already recorded):**
- **Practice runs without a job:** DoD 8 starts a pipeline "from the
  company page or Browse", and an unclaimed page offers ShipItHQ's pipelines,
  which have no job. So `hiring_run.job_id` becomes nullable and gains
  `company_id`. A practice run has one live run per (user, pipeline); a job
  run keeps one per (user, job). Migration 0045.
- **Routes:**
  - the run overview stays in the jobs shell: `/jobs/[slug]/rounds` for a
    job, and `/companies/[slug]/rounds/[processId]` for company-page practice
  - the attempt runner is `/round/[attemptId]`, in a new `(focus)` route
    group with its own minimal layout: no sidebar, no AI panel, a slim top
    bar (role, round, timer, progress, Exit with confirmation)
- **Order:** rounds are taken in order. Round N+1 opens when round N is
  passed (HARD at or above its mark), or finished at all (ADVISORY).
- **Prices** are in `lib/credits/pricing.ts`, with the overview's numbers:
  aptitude 5, DSA 5, system design 15, voice 30. Held when an attempt starts
  (the hold id is the attempt id); settled when it is scored; released when
  scoring fails ("not scored").
- **Draws** leave out what this student was drawn last time for the same
  round, when the pool allows. Aptitude draws spread evenly across the
  sections in the pool (Niraj, HR-11).
- **Exit** leaves the attempt running: the timer is the server's, and the
  student can come back before `endsAt`. A late submission scores only what
  was saved before `endsAt`. An attempt read after its end is closed with what
  it has.
- **AI off during an attempt:** `hasLiveAttempt(userId)` is checked by
  `/api/ai/chat`, the practice mentor and the Project AI, and a refusal adds
  one `aiBlocked` to the attempt's integrity signals.

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
- [ ] Status: code done 2026-09-25, built with HR-13. The scoring is verified
  against a hand count (above). Recording the signals in the browser is part
  of Niraj's pass.
  - One question at a time, with a question palette.
  - Autosave, 1.2 s after a change.
  - Keys: 1 to 4 or A to D answer; the arrow keys move.
  - Server-clocked timer; the attempt is handed in at zero.
  - Submit confirms when questions are unanswered.
  - Integrity: tab leaves, pastes and seconds per question go with every
    save, merged on the server (never decreasing).
  - The results review shows the right answer and the explanation per
    question, only after scoring.

**DoD** 8, 12.
**Steps.**
- A timed MCQ runner, one question at a time.
- Scored on the server, with a per-question breakdown.
- Integrity signals: pastes, tab leaves, time per question.

**Edge cases.** The correct answers never reach the browser before submit.

**Done when.** The score matches a hand count on a seeded attempt, and the
signals are recorded.

## HR-15 DSA runner
- [ ] Status: code done 2026-09-25; the live judge check is Niraj's manual pass.
  - `lib/hiring/dsa.ts`: `loadDsaProblems` (sample tests only, never the
    harness, hidden tests or reference), `runSamples`, and `scoreDsa`, which
    runs every test of each drawn problem in parallel. Score = share of tests
    passed, averaged over the problems (17/17 and 0/17 is 50). Code equal to the
    starter is "not attempted" (0, no judge call); a compile error is 0; the judge
    being unreachable throws `JudgeUnavailable`, so the attempt is NOT_SCORED and
    refunded. Hidden cases are kept as pass/fail only in the breakdown, so a
    retake can't be learnt from it.
  - `runRoundCode` (run.action.ts): sample tests for a drawn problem while the
    attempt is live, capped at 60 runs per attempt, counted atomically in
    `integrity.judgeRuns` before running.
  - Hand-in marks the attempt SUBMITTED; the runner's Scoring view then calls
    `finishScoring`, so a slow or killed judge call is a retry, not a lost
    submission. The judge runs inline like practice Run/Submit (no worker job
    exists for it); an expired attempt goes the same way via `closeIfExpired`.
  - `components/hiring/dsa-runner.tsx`: problem tabs, the practice
    `CodeEditor` locked to the problem's harness languages (C++ today), the
    practice `CasesPanel`, autosave, paste and tab-leave counts, runs left.
    Result shows tests passed per problem, failing sample cases, compiler
    output and the submitted code.
  - **Verified 2026-09-25** against the dev DB: two drawn problems left empty
    score 0 with no judge call; with the executor down the scorer throws
    `JudgeUnavailable` (refund path) instead of scoring 0.
  - **Manual pass (needs shipitworker running):** take a DSA round with two
    problems, solve only one, submit: the score reads about 50 and the result
    lists 17/17 and 0/17 with the failing samples.

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
- [ ] Status: system design done 2026-09-25; voice moved to plan/voice VO-11
  (Sarvam agent, decided 2026-09-25). The dead `/mock/company/...` link on
  `/companies/[slug]/mock` now goes to `/jobs/<slug>/rounds` (2026-09-25).
  - **System design:** `components/hiring/design-runner.tsx` (brief and rubric
    left; Excalidraw diagram and written answer right, autosaved), scored by
    `lib/hiring/design.ts` in one inline call, 25 s timeout. Empty answer and
    diagram is 0 with no model call. Result shows the AI-assessed label, each
    criterion's score/10 with evidence, the summary, and the diagram
    (read-only; `ExcalidrawCanvas` gained `viewOnly`) and written answer.
    `components/hiring/runner-shell.tsx` now holds the shared top bar and the
    server-offset clock for every runner, plus a Scoring view for handed-in
    attempts that retries `finishScoring`.
  - **Verified 2026-09-25** with the real model: a solid URL-shortener answer
    with a two-box diagram scored 80 (8,9,8,7), an empty answer 0, an off-topic
    answer 0 on every criterion.

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
- [ ] Status: code done 2026-09-26 and verified server side. The company seeing
  the send lands with HR-18 (its applicants view renders the same
  `SendPreview` from the stored snapshot). The browser pass is Niraj's.
  - **Verified 2026-09-26** against the dev DB with a throwaway fixture (a
    verified company, four jobs and pipelines, a student, a run and attempts,
    all deleted after), 22/22:
    - identical pipelines hash the same; a different pass mark doesn't
    - the profile gate names missing education, and `buildProfile` refuses
      until it's added
    - the default picks are the latest passing attempts; a failing attempt is
      listed but not selectable
    - reuse: an identical pipeline's run is offered for another role at the
      same company; a different pipeline isn't
    - a paused job is blocked as closed
    - the snapshot refuses a below-mark attempt and an attempt from outside the
      run
    - the snapshot carries attempt 2 of 2, integrity (1 paste, 2 tab leaves,
      150 s), aptitude by section, and the design rubric and answer
    - no email anywhere in what's sent
    - the live preview equals the stored snapshot for the same picks
    - a second active send for the job is dropped by the unique index
    - after a withdrawal, the job is sendable again
    - a later retake doesn't change a stored snapshot
  - **Manual pass:**
    - clear a job's rounds, and the rounds page shows "Every round cleared" with
      Send
    - the send page's preview changes as attempts, resume, GitHub, KnowMe and
      projects are toggled
    - with a missing headline, Send stays disabled and "Add it" links to
      `/profile`
    - send, then the rounds page shows Sent with Withdraw; withdraw, and Send
      comes back
    - on a second role with the same rounds, "You've already cleared these
      rounds" appears
    - on an unclaimed company's job, "Practice only until ... joins ShipItHQ"

**Decisions (Niraj, 2026-09-26).**
- **Layout:** two panes. Choices on the left (attempt per round, profile gate,
  links, consent, Send), and on the right a live preview of exactly what the
  company will see, updating as the choices change. The panes stack on mobile.
- **Projects:** one picker covering both the student's ShipItHQ workspace
  projects (`project_v2` they created, linked at `/projects/<slug>`) and their
  profile portfolio projects. Only public ones can be attached; a private one
  reads "Make public to attach". At most 3.
- **Resume:** the student picks one of their resumes (the primary is
  preselected), and the send carries its `/r/<slug>` link. Sending makes that
  resume public, and the screen says so before the consent tick.
- **Reuse is in this task.** A pipeline's content hash covers its rounds,
  their settings and their pools. On another role at the same company with the
  same hash, a completed run offers "Send your existing results" with no
  retake.

**Files (as built).**
- `apps/main/lib/hiring/send.ts` (server-only):
  - `pipelineHash`
  - `sendState`: what blocks a send, and why
  - `buildSnapshot` and `buildProfile`
- `apps/main/actions/hiring/send.action.ts`: `getSendPage`, `sendResults`,
  `withdrawSend`
- `apps/main/app/(jobs)/jobs/[slug]/rounds/send/{page,loading}.tsx` and
  `_components/send-client.tsx`
- `apps/main/components/hiring/send-preview.tsx`: the company's view, reused by
  HR-18
- `components/hiring/rounds-overview.tsx`: Send, Sent, Withdraw and "Send your
  existing results"

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
  - An unverified company is refused like an unclaimed one: only a Verified
    company receives results (`companyTrust`).
  - A job that isn't ACTIVE counts as closed.
- One active send per (student, job).
  - The unique index enforces it. A double click gets the existing send back,
    not an error.
- Withdrawing hides the send from the company straight away.
  - It sets WITHDRAWN and `purgeAfter` = now + 90 days.
  - Withdrawing an INVITED send is refused: the decision is made.
- The snapshot is a copy. Retaking a round later never changes a sent
  snapshot.
- The chosen attempts must belong to the run, be SCORED, and meet the round's
  mark if the round is HARD. The server checks every pick; the browser's picks
  are only a request.
- The email is never in the snapshot or the profile (DoD 10).
- Reuse needs the same company and the same hash, and the run must be
  COMPLETE. If either pipeline changed since, the hashes differ and reuse isn't
  offered.
- A workspace project link needs the company member to be signed in to
  ShipItHQ to open it. A portfolio project links to the public profile. This
  is noted in the preview.

**Done when.**
- A complete run sends, and the company can see it.
- An unclaimed company shows "Practice only until this company joins".
- A withdrawn send disappears from the company's list.

---

## Phase E - Company review

## HR-18 Applicants by round
- [x] Status: done 2026-09-26, verified server side. The browser pass is
  Niraj's.
  - **Decisions (Niraj, 2026-09-26):**
    - `/applications/<job>` is the sends workspace outright. Old applications
      had no users, so no history tab; the old code was deleted with his
      approval.
    - The send view is shared through `@repo/ui`.
    - Compare is a full-width view of up to 3 candidates.
    - Each list row shows the name, a score per round (with the attempt number
      when > 1), an integrity flag, the sent date and an unread dot.
    - The sidebar says "Results" (per role) and "Candidates" (people).
  - **Shared:**
    - `packages/db/src/hiring-send-types.ts` (`SentProfile`, `SnapshotRound`,
      `SendSnapshot`, `TranscriptTurn`), exported as
      `@repo/db/hiring-send-types`.
    - `packages/ui/src/components/hiring/{send-view,transcript-pane}.tsx`
      (`SendView`, `ProfileCard`, `RoundCard`, `TranscriptPane`). Each app
      passes its own Excalidraw viewer as `renderDiagram` (main:
      `components/hiring/diagram-viewer.tsx`; hiring: the same, with
      `@excalidraw/excalidraw` 0.18.0 added). The student's preview and the
      company's view are one component.
  - **Hiring app:**
    - `lib/sends.ts`: `jobSendsFor`, `sendFor` (the first open sets VIEWED; the
      email only after `emailRevealedAt`), `rolesFor`, `candidatesFor`,
      `integrityFlag`.
    - `lib/send-sort.ts` (the list's sort and filter, pure).
    - `actions/sends` (thin, `view_candidates`).
    - `/applications`: Results by role, with a StatBand.
    - `/applications/<job>`: the workspace.
      - Left: the list, sortable by newest, average or any round, and filtered
        by at least N in a round.
      - Middle: Overview and one tab per round.
      - The shell's AI rail stays on the right.
      - Up and Down keys move, and Esc leaves compare.
      - On phones the list and the candidate take turns.
      - `?send=` opens one directly.
  - **Found:** a raw `max(created_at)` read timestamps 5.5 h off (IST); it now
    decodes through the column's own mapper, and the time reads back exact.
  - **Verified 2026-09-26** against the dev DB with throwaway fixtures (deleted
    after), 16/16 plus 5/5:
    - 5 sends listed, and a withdrawn one isn't
    - sorting by the DSA round gives Asha 100, Zoya 95, Meera 88, Kabir 67,
      Ravi 50
    - the "at least 70 in round 1" filter works
    - "a2" is shown, and 4 pastes raises the flag
    - role counts leave the withdrawn one out
    - opening marks it VIEWED and the new count drops
    - the email is hidden until an invite reveals it
    - another company can see neither the role nor the send, and a withdrawn
      send can't be opened
    - three open for compare
    - Candidates: one row per person, the withdrawn role left out, the latest
      name wins

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
- [x] Status: done 2026-09-26, verified server side. The browser pass and the
  real emails are Niraj's.
  - **Migration `0051_send_decision`:** `hiring_send.decision_note` and
    `decided_by_user_id`.
    - Note: `--apply` also applied another session's pending
      `0050_idea_timeline` (additive: a feedback status value and five nullable
      columns).
  - **`apps/hiring/lib/decisions.ts`:**
    - `draftFeedback`: `modelFor("candidateFeedback")`, inline 25 s, from the
      candidate's own results and the team's private note
    - `decide`: conditional on SENT/VIEWED, so it's final and race-safe
      - Invite: INVITED, the email revealed, and the thread opened with the
        message plus the inviter's name and email ("invited you to talk about
        ..." in the student's Companies tab, with the thread's hourly email).
      - Decline: DECLINED, purgeAfter 90 days, a DECLINED notice (Rounds tab)
        and `sendDeclineEmail`.
    - `setCompanyOutcome`: only after an invite, and the student hears it.
  - **`actions/sends/decisions.ts`:**
    - draft needs "invite or decline" plus "use AI", counted in
      `company_ai_usage` against `HIRING_AI_LIMITS.feedbackDraftsPerDay` (100,
      Niraj)
    - decide and outcome need "invite or decline"
  - **Workspace:** a Decide bar on the candidate, and "Decide (N)" for the
    ticked ones.
    - `decide-panel.tsx`: Invite or Decline, the team note, drafts landing one
      by one, Redraft, and a Send per candidate. A decline can go with no
      message.
    - `DecisionCard`: the decision, the feedback, the private note, the outcome
      picker, and the candidate's own outcome.
  - **Student side:**
    - `sendState` blocks `NEEDS_RETAKE` after a decline until a newer scored
      attempt exists.
    - The rounds page shows Declined (the feedback and what to do next) and
      Invited (the message, the inviter's contact, "Open the conversation",
      and their own outcome, which notifies the company with
      `STUDENT_OUTCOME`).
  - **Verified 2026-09-26:**
    - The draft on the real model: invite and decline, 88 to 94 words, real
      strengths and gaps, a blunt note softened, an injection note ignored,
      nothing invented.
    - Decisions against the dev DB, 13/13:
      - the invite's state, contact and inbox item
      - the company now sees the email
      - final, and needs a message
      - a concurrent decide: one wins
      - a decline with no message, and retention
      - outcomes only after an invite
      - company isolation
    - The resend rule, 3/3.

**Decisions (Niraj, 2026-09-26).**
- **After a decline,** the send stays in the student's history with the
  feedback. They can retake rounds (normal cool-downs) and send again, but only
  once at least one round has a new attempt since the declined send, so the
  same results aren't resent unchanged.
- **Where the company decides:** a Decide bar in the workspace, under the
  candidate's header, with Invite and Decline. Each opens a panel with:
  - the team's short note on why
  - "Draft feedback" (AI, editable)
  - Send
- **Batches:** with several ticked, "Draft feedback for N" makes one
  reviewable draft per candidate, each landing as it's ready. Nothing goes out
  until that draft's own Send.
- **Messages:** the invite's message and the thread live in the shared Inbox
  (plan/inbox), built first.
- **Contact:** an invite reveals the inviting member's name and work email
  to the student (Niraj, 2026-09-26). The conversation also continues in the
  Inbox.
- **Decline feedback** is optional but drafted by default. The team can send
  it, edit it, or clear it and decline with no message (Niraj, 2026-09-26).

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
- [x] Status: done 2026-09-26. The browser pass is Niraj's.
  - **Niraj, 2026-09-26:**
    - `/jobs` stays Spark, overriding "redirect to Browse" below.
    - The old apply flow is removed (no production data).
  - `/jobs/spark` redirects to `/jobs`.
  - "Take the rounds" is the one primary action on the job page (a note shows
    when a role has no rounds yet) and in Spark's Process section.
  - **Deleted:**
    - the "I'm Interested" block and `handleShowInterest` on the job page
    - `jobs/components/job-detail-sheet.tsx` (imported nowhere; a second copy of
      the apply flow)
    - `showInterest`, `startPreparing`, `performCommitmentCheck`,
      `submitApplication`, `getApplicationDetails` and `updatePreparationStatus`
      from `actions/jobs/applications.ts`
  - `withdrawApplication` and `getMyApplications` stay for the Applied tab until
    HR-22.
  - The "swipe" copy on Saved and Browse now says Spark. No swipe component
    remains.

**DoD** 15.
**Why.** Decided 2026-09-25: rounds first, the swipe deck retired.

**Files.**
- `app/(jobs)/jobs/spark/*`
- `app/(jobs)/jobs/page.tsx`
- `jobs/components/jobs-tabs.tsx`
- `swipe-card.tsx` and `spark-skeleton.tsx`
- the jobs navigation in `lib/navigation`

**Changed 2026-09-25 (Niraj):** Spark stays, rebuilt as a stepped job panel
(plan/jobs JB-18). This task removes the swipe deck, not Spark, and gives
Spark's panel the "Take the rounds" action.

**Steps.**
- `/jobs` redirects to Browse.
- On a job page and in Spark's panel, the primary action becomes "Take the
  rounds".
- Remove the swipe deck components that JB-18 left unused. Done 2026-09-25:
  `swipe-card.tsx` deleted with Niraj's approval.

The deletion itself was approved as part of the 2026-09-25 decision. List the
files in the PR before removing them.

**Edge cases.**
- Existing `job_application` rows keep their history and still show under
  Applied.
- Old `/jobs/spark` links redirect instead of returning 404.

**Done when.** `/jobs` lands on Browse, `/jobs/spark` is the stepped panel,
no swipe-deck component remains, and the old applications still list.

## HR-21 Consent, retention and legal pages
- [x] Status: done 2026-09-26, verified server side. The lawyer's review and the
  browser pass of Settings > Delete account are Niraj's.
  - **Purge (Niraj: a daily Cloudflare cron, not an alarm):** the worker's
    `scheduled` handler runs `purgeExpiredSends` from `@repo/db/hiring-purge`
    at 03:00 UTC (`"crons": ["0 3 * * *"]`). A purged send keeps its row
    (status, dates, outcome) and loses its snapshot and profile. By hand:
    `pnpm script send-purge` (preview) / `--apply`. Checked 5/5 with sends
    forced past, before and without a purge date.
  - **Delete account (Niraj: hard delete everything, now):** Settings >
    Account > Delete account lists what goes, asks for the email typed out,
    and refuses a company Owner until ownership moves. `removeStudentHiringData`
    notifies each company, marks threads "Account deleted" and closed, then the
    user row goes; resume files and the avatar leave R2. Migration
    `0053_user_delete_fks` made 17 foreign keys cascade or set null so nothing
    blocks the delete; payments and the credit ledger stay with no user.
    Checked 11/11, after fixing a deleted student's messages showing "Student".
  - **Legal copy:** `apps/web` terms (section 06 Hiring Rounds) and privacy
    (section 02 Hiring Rounds), and the hiring app's terms (section 05
    Candidate Results): sends and consent, AI assessment with a person
    deciding, voice consent and transcripts, integrity signals, unclaimed
    pages, 90-day retention and account deletion. Draft copy for the lawyer.

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
- [x] Status: done 2026-09-26, verified server side (9/9 on seeded runs: a
  cool-down, a cleared run ready to send, a declined run that needs a retake,
  an unclaimed company's run marked practice only, viewed, invited with the
  inviter's contact and the Inbox link, declined with feedback, and a practice
  run). The browser pass is Niraj's.
  - `lib/hiring/my-rounds.ts` (`loadMyRounds`), `app/(jobs)/jobs/rounds/*`,
    and `components/hiring/send-controls.tsx` (Withdraw and the outcome
    select, now shared with the job's rounds page).
  - The jobs tab count is now runs in progress or finished.

**Decisions (Niraj, 2026-09-26).**
- The page moves to `/jobs/rounds`; `/jobs/applications` redirects there, and
  the tab and sidebar entry read "My rounds".
- Stacked sections, empty ones hidden: In progress, Sent, Invited, Declined
  and withdrawn, Practice (runs from company pages, labelled practice only).
- **No History section.** The old apply flow is gone (HR-20), so the old
  interview journey under `/jobs/applications/[applicationId]/*`,
  `applications-content.tsx`, and `getMyApplications` / `withdrawApplication`
  are deleted (approved).

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

## HR-22a Marketing copy still describes applying
- [x] Status: done 2026-09-26. Found during HR-22; no `apps/web` line mentions
  applying or cites `jobs/applications` (grep).

**Why.** `apps/web/content/modules.ts` (the jobs module: "Show interest and
prepare, then apply", "Interview rounds you take right here") and
`apps/web/app/(home)/features/_components/feature-modules.ts` still describe
the apply flow HR-20 removed, and cite deleted files as evidence.
**Steps.** Rewrite those lines for rounds and sends, and point the evidence at
`app/(jobs)/jobs/rounds` and `lib/hiring/send.ts`.
**Done when.** No line in `apps/web` mentions applying through ShipItHQ or cites
`jobs/applications`.

## HR-23 The public company page
- [x] Status: done 2026-09-26, verified server side (11/11: a verified company
  with 11 students and 5 decided sends, one under every minimum, and an
  unclaimed one with a published draft). The browser pass is Niraj's.
  - `lib/companies/public-page.ts` (`loadCompanyPage`), the page rebuilt as
    `_components/company-page.tsx` (server) with `follow-button.tsx`, and a
    matching `loading.tsx`. `lib/hiring/round-types.ts` holds the round labels.
  - ShipItHQ's practice pipelines show only when the company has neither
    templates nor a role with rounds.

**Decisions (Niraj, 2026-09-26).**
- Main column plus a right rail. Main: open roles (each with its pipeline, a
  time estimate, and Start or Continue), then About, Stack, Culture, Benefits.
  Rail: the stats and quick facts.
- **Pass rates are per role, per round**, each against that round's own pass
  mark: every role has its own pipeline and settings. A round's rate shows
  only once 10 students have a scored attempt on it.
- The old Mock Interview Hub (`/companies/[slug]/mock`,
  `actions/companies/mock.ts`) is deleted (approved): it predates rounds, and
  the page's claim that scores of 75% or more are shared automatically
  contradicted per-send consent.

**DoD** 1, 22.
**Files.** `apps/main/app/(jobs)/companies/[slug]/*`, and its loading skeleton.

**Steps.** The sections from DoD 22.
- The stats show only past a minimum count, so small numbers never identify a
  person. The minimum is 10 practising and 5 sends (Niraj, 2026-09-25; recorded
  in the overview). Under it, the value is '-' with "Too few to show".
- Unclaimed pages cite a source per profile field, and show no logo.

**Done when.** A verified company and an unclaimed one each render every
section correctly, and stats stay hidden under the minimum.

## HR-24 Reporting and blocking
- [x] Status: done 2026-09-26, verified server side (19/19 plus 2/2: all four
  report kinds from both sides, a duplicate kept as one, a wrong reason
  refused, block and unblock on messages, threads and invites, a hidden job
  and a suspended company out of every list, sends and conversations). The
  admin queue and the buttons need Niraj's browser pass.
  - **Migration `0055_moderation`:** `report`, `company_block`,
    `company.suspended_at` / `suspended_reason`, `job.admin_hidden_at` /
    `admin_hidden_reason`.
  - `@repo/db/moderation` (`jobListed`, `jobVisible`, `conversationPaused`,
    block, `createReport`) and `@repo/db/report-reasons`. All 21 student job
    lists use `jobListed`.
  - Shared `ReportDialog` (`@repo/ui/components/moderation/report-dialog`);
    Report on the company page, the job page, Inbox messages on both sides
    and the candidate view; Block on the thread, the company page, and
    Settings > Privacy.
  - Hiring: `requirePermission` refuses write permissions while suspended, a
    banner explains it, and a hidden job can't be republished.
  - Admin: Hiring > Reports (hide or show a job, suspend or lift a company,
    review a student's attempts at `/hiring/students/<id>`, close as actioned
    or dismissed with an Inbox update to the reporter).

**Decisions (Niraj, 2026-09-26).**
- **The report form:** a reason from a short list for that kind of target,
  plus an optional note of up to 1,000 characters.
- **Suspending a company freezes it everywhere:** its page says "Suspended",
  its jobs leave every list, rounds can't start, sends are blocked, and it
  can't message or decide. Members can still sign in to the hiring app and see
  a banner. An admin can lift it.
- **Hiding a job** takes it out of every list and stops new runs; the company
  can't republish it while it's hidden.
- **Blocking:** a student blocks or unblocks a company on its thread and on
  its page, and Settings > Privacy lists every block. A block closes an open
  thread, and the company sees "This candidate isn't accepting messages".
- **Follow-up:** closing a report sends the reporter one Inbox update, "We
  reviewed your report", saying whether action was taken and nothing about
  the other party.
- One condition, `jobListed` in `@repo/db`, decides whether a job is listed
  (ACTIVE, not hidden, company not suspended), so no list can miss it.

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
- [ ] Status: code done 2026-09-26; the real email is Niraj's check.
  - In-app: `SEND_RECEIVED` goes to members with "view candidates" (the
    Inbox's Results tab, plan/inbox IN-8).
  - Email: `sendNewResultsEmail` (`@repo/email/messages`) goes to the same
    members, linking to `/applications/<job>?send=<id>` on the hiring app.
  - Withdrawing a send deletes its `SEND_RECEIVED` rows and closes its thread.

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
- [x] Status: done 2026-09-26, verified server side (8/8: 12 students with
  retakes counted as 12 practising, 10 scored, 6 passed; the public page's rate
  matches; a closed job startable and out of the lists, sending refused, a
  waiting send kept; a draft not startable).
  - `jobPractisable` (`@repo/db/moderation`): visible and not a draft. The
    rounds page and `startRound` use it; `jobListed` still decides the lists.
  - `roundFunnels` (`@repo/db/hiring-stats`) counts per round in SQL and
    returns no student id. The public page uses it; HA-15's Home will too.

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
