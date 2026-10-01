# Long-running work on Vercel - tasks

Derived from `overview.md`. Built in order. A task is done when its "Done when" is verified.
Content tasks follow the incident conventions in `plan/incidents/overview.md` and the visual
kit (INC-62 to INC-73).

---

## Round 1: the outline and the reference code

### - [x] LJV-1 Approve the case outline
Status: done (2026-10-01)
- **Why:** the case is the centre of the other three; its chapters decide what the path and the
  project teach.
- **Files:** `plan/long-jobs-vercel/case-outline.md`.
- **Steps:** Niraj reads the outline; changes go into the file; status set to approved with
  the date.
- **Edge cases:** chapter 5's map check must have a real answer (the pick kind needs at least
  one part); every platform claim maps to S1 to S8.
- **Done when:** the outline's status line reads "approved" with a date.

### - [x] LJV-2 Write the reference code, two stages
Status: done (2026-10-01). Both stages typecheck clean against workflow@4.8.10 and next@16.3.8
(installed in the scratchpad); run status values confirmed from the SDK: pending, running,
completed, failed, cancelled. Files beyond the list: `components/elapsed.tsx`,
`components/inline-card.tsx`, `components/workflow-card.tsx`,
`app/api/report/workflow/[runId]/progress/route.ts` (the stream, from `?from=`).
- **Why:** every code view (case, path, project hints) shows this code, and it is Niraj's
  reference when he builds the real repo (LJV-16).
- **Files:** `samples/long-jobs-on-vercel/inline/**`, `samples/long-jobs-on-vercel/workflow/**`,
  `samples/long-jobs-on-vercel/README.md`. Outside `apps/*` and `packages/*`, so it is not a
  workspace package and no tsc or build touches it.
- **Steps:** a minimal Next.js App Router app:
  - `lib/report.ts`: the 10 named steps, `STEP_MS` (15 s), `runReportStep(i, attempt)` (waits,
    returns a line of the report), a `FAIL_ONCE_AT` knob that throws on attempt 1 of one step.
  - `app/api/report/inline/route.ts`: `maxDuration = 60`, awaits all 10 steps, returns the
    report. Dies at 60 s.
  - `app/page.tsx`, `components/run-card.tsx`: a Run button and a live elapsed clock per card.
  - The `workflow` stage adds: `next.config.ts` with `withWorkflow`, `workflows/report.ts`
    (`"use workflow"`, a `"use step"` per report step, progress written with `getWritable`),
    `app/api/report/workflow/route.ts` (`start()` returns `runId`),
    `app/api/report/workflow/[runId]/route.ts` (status via `getRun`), the second card, and the
    run id kept in the URL so leaving and coming back works.
- **Edge cases:** the inline stage must not import `workflow` at all (the diff is the lesson).
  Comments are short and plain; no em dashes. Anything the docs did not confirm (the exact
  status values) is marked `// check against the installed SDK` for LJV-16.
- **Done when:** the two trees exist; `diff -r inline workflow` shows only the files listed as
  added or changed above.

---

## Round 2: the code viewer

### - [x] LJV-3 Store code samples in the database
Status: done (2026-10-01). Migration 0079_code_samples (two tables, indexes, cascade FK) applied on
dev; `pnpm script code-samples --apply` wrote 27 files; re-plan "Nothing to change"; `--from` a
copy with one edit and one deletion previews `change (+1 -0)` and `remove`.
- **Why:** Niraj, 2026-10-01: "we will have this code on db". One store, read by the case, the
  path and the project.
- **Files:** `packages/db/src/schema/code-samples.ts` (new), `packages/db/src/schema/index.ts`,
  a migration via `pnpm db:generate --name code_samples`,
  `packages/db/src/scripts/code-samples.ts` (new).
- **Steps:** tables `code_sample` (slug unique, title, summary, repo_url, stages jsonb: ordered
  `{id, label, note}`), `code_sample_file` (sample_id, stage, path, language, content; unique
  on sample, stage, path). The script reads `samples/<slug>/<stage>/**` (or `--from <dir>` for a
  repo laid out the same way), prints the DB host and per file `add / change (+N -M lines) /
  remove / same`, and writes nothing; `--apply` writes, then plans again and shows nothing left.
- **Edge cases:** skip `node_modules`, `.next`, `.swc`, lockfiles and binaries; refuse a file
  over 200 KB; normalise line endings; paths always with forward slashes.
- **Done when:** the migration is reported then applied; `pnpm script code-samples` previews
  every file as `add`; `--apply` writes them; a second preview shows all `same`.

### - [x] LJV-4 The read-only code viewer
Status: done (2026-10-01). Checked in Chrome on case 3: both stages, Compare on `app/page.tsx`
(5 added lines in emerald with + markers, the route files marked added, page.tsx changed), and at
360 px the tree becomes a picker with nothing overflowing. Changed from the plan: the sample is
read through `GET /api/code-samples/<slug>` (`lib/code-samples/load.ts`), not a server action,
because actions run one at a time per page and a read queued behind a slow one stayed on its
skeleton; the route is public in `middleware.ts` like the cases. Two library traps fixed:
react-syntax-highlighter only passes `lineProps` a line number when it shows numbers (Compare
hides them instead), and React's dev second mount is covered by one shared load per sample.
- **Why:** learners read the two versions inside ShipItHQ, and see exactly what Workflow added.
- **Files:** `apps/main/components/code-sample/code-sample-viewer.tsx`,
  `apps/main/components/code-sample/line-diff.ts`,
  `apps/main/components/code-sample/code-sample-skeleton.tsx`,
  `apps/main/actions/(main)/code-samples.action.ts`.
- **Steps:** file tree on the left (folders open), highlighted code on the right
  (`react-syntax-highlighter`, already a dependency), the stage switch as the shared segmented
  `Tabs`, a Compare toggle that diffs the open file between two stages (a small LCS line diff,
  no new dependency; added lines emerald, removed rose), files only in one stage marked
  "added" / "removed" in the tree. Props: `sample`, `stage`, `file`, `highlight` (line ranges),
  `compareWith`. A loader action, cached per sample.
- **Edge cases:** below `sm` the tree becomes a file picker; long lines scroll inside the code
  pane, never the page; light and dark themes legible; a file missing in the chosen stage
  falls back to the first file with a note.
- **Done when:** in Chrome, the viewer shows both stages, Compare on `app/page.tsx` shows the
  added card, and at 390 px wide there is no horizontal page scroll.

---

## Round 3: the case

### - [x] LJV-5 A `code` block and a `build` link for cases
Status: done (2026-10-01). The Build it card sits in the "Keep learning" step beside the path (the
step about what comes next), not the closing. The check script fails on a planted wrong file name
(`workflows/reprot.ts`) and on a missing project blueprint.
- **Why:** chapters 6 and 8 show real code, and every case should be able to point at a path
  and a project to build.
- **Files:** `apps/main/content/incidents/types.ts`, `apps/main/components/incidents/player/case-player.tsx`,
  `apps/main/scripts/check-incident-diagrams.ts`.
- **Steps:** `ChapterBlock` kind `code` (`sample`, `stage`, `file`, `highlight?`,
  `compareWith?`); `IncidentCase.build?: { project?: string; path?: boolean }` rendered as a
  "Build it" card on the closing step; the check script verifies a code block's sample, stage
  and file exist in `samples/` and the project slug exists in the blueprints.
- **Edge cases:** a case with no `build` shows no card; narration focus on a code block
  (`block:L12-20`) highlights those lines.
- **Done when:** a code block renders in the player, and the check script fails on a planted
  wrong file name.

### - [x] LJV-6 Write the case
Status: done (2026-10-01). Both checks pass (the sims check now also asserts every prediction's
scenario and all 24 simulator settings). Every chapter checked in Chrome. Fixes found on the way:
the map's Email moved below Data (a link crossed File storage), piled-up link labels dropped from
the fixed map, dashboard counts drawn as steps, the shared `see` log's time column widened, the
simulator's axis ticks and 30 s line made per case (`ticks`, `line`) with chapter presets applied,
the index hero picking art by case (case 3 has its own, `export-art.tsx`), and the map strip's
Expand made compact (Niraj, 2026-10-01).
- **Why:** the incident itself (overview DoD 1, 2).
- **Files:** `apps/main/content/incidents/the-export-that-finished-after-it-failed.ts`,
  `apps/main/content/incidents/the-export-chapters.ts`, `index.ts` (meta, `alsoIn: ["queues"]`),
  `cases.ts`.
- **Steps:** every chapter of the approved outline, with the visual kit, checks, narration
  focus, story, model, simulator, predict, fix tree, patterns, twist, after-ship, checklist,
  round, closing, glossary, learn, mock, postmortem and points, sources S1 to S8 and SRE.
- **Edge cases:** illustrative numbers captioned as such; no product names other than Vercel,
  Next.js and Cloudflare (they are the subject); the twist must agree with S7 (a retried step
  restarts from its first line).
- **Done when:** `check-incident-diagrams` and `check-incident-sims` pass; the case plays end to
  end in Chrome.

### - [x] LJV-7 Seed and check the case
Status: done (2026-10-01). 29 steps; re-plan clean; opens under Serverless and edge and under
Queues and background jobs.
- **Files:** `pnpm script incidents-seed`.
- **Done when:** the preview lists the new case and its steps; `--apply` writes them; the case
  opens from `/incidents` under both topics.

---

## Round 4: the path

### - [x] LJV-8 Write the path "Long-running work on Vercel"
Status: done (2026-10-01). In `content/incidents/paths-vercel.ts`. The seed preview listed 7 days and 7
topics with no drift error; applied; re-plan matched.
- **Why:** structured learning with code (overview DoD 6).
- **Files:** `apps/main/content/incidents/paths.ts`, `path-cases.ts`.
- **Steps:** seven days: limits and the 504; `after` and `waitUntil`; workflows and steps;
  retries and idempotency; leaving and coming back; build day 6 (steps and the inline route,
  watch it die); build day 7 (Workflow, deploy, operate). Notes in markdown, each grounded in
  the sources. A topic may carry `code: { sample, stage, file }[]`.
- **Edge cases:** titles match the case's `learn` list exactly; build days say what to do when
  the local run differs from production (the 60 s limit only applies on Vercel).
- **Done when:** the path seed preview lists 7 sessions and their topics with no drift error.

### - [x] LJV-9 Code on path days
Status: done (2026-10-01). Adopted the path from the case as a test learner (`pnpm script
e2e-hiring --user=e2e-learner@shipithq.dev --learner`, a new flag for a student account with
onboarding done); day 6 shows its three files in the viewer on the Inline stage. The path seed's
digest now includes each topic's code, so a code-only edit is detected; cases 1 and 2 unchanged.
- **Files:** `packages/db/src/scripts/incident-paths.ts`,
  `apps/main/components/studio/steps/code-step.tsx`, `apps/main/types/studios.ts`.
- **Steps:** a topic with `code` gets a second Studio step of type `CODE` whose metadata is
  `{ sample, stage, file }`; `CodeStep` renders the read-only viewer when `metadata.sample` is
  set (no enum change, no migration).
- **Edge cases:** an adopted copy keeps the metadata; existing CODE steps are unchanged.
- **Done when:** adopting the path from the case shows the viewer on days 6 and 7.

---

## Round 5: the project and the mock

### - [x] LJV-10 The official project "Long jobs on Vercel"
Status: done (2026-10-01). Seeded by a new preview-first script, `pnpm script curated-project
--slug=long-jobs-on-vercel`, which calls the catalogue seed's functions for one slug (they take an
optional slug now; `seed/index.ts` runs its main only when executed, not when imported). 5 sprints
(setup + 4), 19 tasks; re-plan matched; the idea is linked. The test learner enrolled and the
workspace shows every sprint with its quiz and mock.
- **Why:** learners who want to build it on their own, with sprints, tasks and criteria
  (overview DoD 8).
- **Files:** `packages/db/src/seed/project-ideas.ts`, `seed/data.ts`,
  `seed/blueprints/long-jobs-on-vercel.ts`, `seed/blueprints/index.ts`,
  `seed/blueprints/setup.ts`, and the existing preview-first project seed script.
- **Steps:** a setup sprint (a Next.js app deployed to Vercel, Hobby is enough) and four
  sprints: the slow function and the inline 504; the workflow; leaving and coming back;
  retries, idempotency and operating it. Each task with falsifiable criteria and hints that
  nudge, never solve.
- **Edge cases:** no database needed (run status comes from Workflow); criteria must be
  provable on Hobby (all functions under 300 s).
- **Done when:** the seed preview lists the project, its sprints and task counts; after
  `--apply` it appears in Projects and a test user can enrol.

### - [x] LJV-11 The predefined mock "Background jobs on Vercel"
Status: done (2026-10-01), except starting a session: it costs 15 credits and the test account has none,
so that one check waits for a funded account. `pnpm script mock-presets` added it (re-plan "same"); it
shows on /mock/voice as Official. The page that lists ShipItHQ mocks is /mock/voice, not /mockvoice.
- **Files:** `packages/db/src/scripts/mock-presets.ts` (new), `packages/db/src/schema/mock.ts`
  (read only).
- **Steps:** a `mock_interview_voice` row with `byAdmin`, `isPredefined`, a stable
  `predefinedId`, a knowledge base drawn from the sources, the level and the duration;
  previewed per row, written with `--apply`.
- **Done when:** the Mocks page lists it and a session can start.

---

## Round 6: verify

### - [x] LJV-12 Seed the code and check everything in Chrome
Status: done (2026-10-01). Case, path days 6 and 7, project and mock opened as a signed-in test learner;
tsc clean in apps/main, packages/db, hiring, uni and admin (PageHeader is shared); the dash grep finds
nothing new. Fixed on the way, at Niraj's request: the map strip's Expand made compact; the Pathfinder
goal page lost its "My goals" breadcrumb, its header wraps below sm with the tabs scrolling sideways
(shared PageHeader), the usage widget reads "N pending" at button height, the topic list defaults to
24%, notes use the panel's full width (StudioViewer `fullWidth`), and markdown code blocks are as tall
as their code (up to 24 lines).
- **Done when:** case, path days 6 and 7, and project all open signed in; the viewer passes
  LJV-4's checks; `tsc --noEmit` is clean in apps/main and packages/db; the dash grep is empty.

---

## Later, with Niraj

### - [ ] LJV-16 Build the real repo
Blocked on: Niraj's time. Niraj builds `long-jobs-on-vercel` locally from the path's build days,
with help; the snags become "If this goes wrong" notes on those days. Then
`pnpm script code-samples --from <repo> --apply` replaces the snapshot.

### - [ ] LJV-17 Host the live demo
Blocked on: LJV-16. Deploy on Niraj's personal Vercel account, with the rate limit (one run per
visitor every 5 minutes, 3 at once), and add the URL to the case and the path.
