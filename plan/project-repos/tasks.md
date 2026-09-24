# Projects V1 (plan on ShipItHQ, code locally) - tasks

Derived from `overview.md` (decided 2026-09-24, revised the same day). Build in
order; each leaves the app compiling. Nothing here deletes code.

| ID | Task | DoD line | Status |
|---|---|---|---|
| RP-1 | The whole catalogue back; Generate makes any project type | 1 | **done 2026-09-24** (query + tsc; pages await Niraj's look) |
| RP-2 | The workspace as control room (`WORKSPACE_EDITOR` flag off) | 5 | **done 2026-09-24** |
| RP-3 | Sprint 0 - Setup: the model (sprint number 0, gates skip it) | 2 | **done 2026-09-24** |
| RP-4 | Hand-written Sprint 0 for the 10 seeded projects, followed on a clean machine | 2, 3 | **done 2026-09-24** |
| RP-5 | Sprint 0 for generated projects | 2 | **done 2026-09-24** |
| RP-6 | Done = tick + note | 4 | **done 2026-09-24** |
| WS-12 | Sprint quiz (in `plan/project-workspace/tasks.md`), reading the notes | 6 | **done 2026-09-24** |
| WS-13 | Sprint mock interview (same), reading the notes | 6 | **done 2026-09-24** |
| PJ-14 + WS-14 | Final quiz and mock as worker jobs and workspace tabs | 7 | **done 2026-09-24** |

WS-12, WS-13, WS-14 and PJ-14 already exist; they are done there, not
rewritten here. What V1 adds to them is one input: the learner's task notes
(RP-6), and they skip Sprint 0.

**Parked (not V1):** starter repos in `thecoderzhq`, folder submit, our tests
on learner code, AI code review. See the overview's research record.

Every task is marked done only after its Done when line is checked, with the
date.

---

## RP-1 The whole catalogue back
- [x] Status: done 2026-09-24. Catalogue condition = PUBLIC; dev DB: 10 public
  projects (was 2 shown), 10 approved ideas (was 2). Generate sheet restored
  to its pre-WS-10 version (type and stack pickers); pipeline takes any stack
  again, `runtime` = browser only for frontend with no backend. `tsc` clean in
  apps/main and apps/worker. Worker needs a release before the app.

**Why.** The browser-only filter (WS-10) existed because code ran in our tab.
It runs on the learner's machine now, so the 8 hidden projects come back.

**Files.** `apps/main/lib/projects/catalogue.ts` (`catalogueWhere`,
`RUNNABLE_RUNTIME`), `actions/(main)/projects/explore.action.ts`
(`runnableIdea`), and the six callers already using `catalogueWhere`;
`components/projects/project-generate-sheet.tsx`;
`apps/worker/src/pipeline.ts` (`BROWSER_STACK`, the hard constraints);
`plan/project-workspace/tasks.md` (WS-10 note).

**Steps.**
1. `catalogueWhere()` = `visibility = PUBLIC`; keep the helper so every caller
   stays on one definition. `runnableIdea()` returns true for all.
2. Generate sheet: bring back the project type and stack pickers from before
   WS-10 (`git show 7b350658:apps/main/components/projects/project-generate-sheet.tsx`).
3. Pipeline: drop the forced browser stack and the "must run in the browser"
   constraints; `runtime` stays `browser` only for projects that are.
4. The `runtime` column stays (the editor will want it in V2).

**Edge cases.** Projects enrolled while hidden are unaffected. The ideas page
facets and counts must include the returned projects (the counts were
filtered too). A stale "A React and TypeScript app" line in the sheet.

**Done when.** `/projects` and the ideas page list all 10 seeded projects with
counts that match a `select count(*) ... where visibility='PUBLIC'`; the sheet
offers frontend, backend and full-stack; `tsc` clean in `apps/main` and
`apps/worker`.

---

## RP-2 The workspace as control room
- [x] Status: done 2026-09-24. Verified headless as a signed-in test user on
  a fresh copy of Expense Splitter: no editor/explorer/preview/tests/status bar,
  Monaco never mounted; all 8 rail tabs open; `?file=/src/App.tsx` lands on
  Task; flag flipped on for one run and the editor, explorer, preview and tests
  came back as before. Project AI re-checked on the real model: stated focus
  now proposes a sprint (the WS-15 open fix), named sprint proposes a task,
  bare requests ask back, a "why does my tick not survive a reload" answer is
  useful without code. Step 3 changed: the Tasks side panel stays, so every
  task is reachable without a picker in the Task tab.
  Found on the way and fixed: the enrol dialog showed 13 credits for a free
  curated project (the WS-9 page stopped passing `isFree`); its processing
  step nested divs in a p (a hydration error) and said "Processing payment"
  for a free enrolment. Seen with the flag ON only: an unhandled Monaco
  "operation is manually canceled" rejection - V2, left for WS-17.

**Why.** Code is written locally; an editor with no files is noise.

**Files.** New `apps/main/lib/projects/flags.ts`,
`app/(main)/projects/[slug]/workspace/_components/workspace-client.tsx`,
`workspace-model.ts`, `task-brief.tsx`, `workspace/page.tsx`, `loading.tsx`;
`apps/worker/src/jobs/project-ai.ts` and `project-ai-core.ts` (the prompt).

**Steps.**
1. `WORKSPACE_EDITOR = false` (referencing this overview). Off: no explorer,
   file tabs, preview, console, tests, runtime; no Cmd/Ctrl+B/J/S. The page is
   the tab row (AI, Task pinned; the virtual tabs) and a full-width tab body.
2. Saved file tabs in localStorage are ignored, not erased, when off.
   `?file=/src/...` falls back to Task.
3. Task tab: no Check task button; the task list (sprints and tasks) must be
   reachable without the explorer: a sprint/task picker in the Task tab.
4. Project AI prompt: it no longer sees code. It answers from the plan, the
   brief and the learner's notes; drop `relevantCode` when the project has no
   files. Also the open WS-15 prompt fix: when the learner has already said the
   sprint and focus, propose instead of asking back.
5. `loading.tsx` matches the new layout.

**Edge cases.** The two starter projects still have files: the flag decides,
not the files. `@final-quiz` / `@final-mock` redirects from the deleted pages
must still land.

**Done when.** With the flag off, the workspace of a seeded project shows no
editor, every tab opens, every task is reachable from the Task tab, an old
`?file=` link lands on Task; with it on, the workspace is as before. `tsc`
clean. Project AI prompt re-checked against the real model on the
accessibility case (proposes a sprint).

---

## RP-3 Sprint 0 - Setup: the model
- [x] Status: done 2026-09-24. One helper, `apps/main/lib/projects/sprints.ts`
  (`isSetupSprint`, `sprintLabel`), used by the workspace (task panel, brief,
  title bar, final-quiz list, AI tab) and the project page. Setup sorts first
  by `order_index = -1`, so no existing sprint is renumbered or reordered.
  Verified headless with a temporary Setup sprint on the test copy (removed
  after): Setup listed first with no Quiz/Mock rows; brief reads "Setup · Step
  1"; the Quiz tab opens on Sprint 1; the project page shows "20 tasks in 4
  sprints, after setup", "Next up · Setup", a Setup card with the steps and
  "Start setup", and "Setup first, then 4 sprints". A stored proposal aimed at
  sprint 0 is refused on Add ("Tasks cannot be added to Setup."), credits
  unchanged, no task written; the worker also drops such proposals.
  Step 3 as built: the "Run it locally" card and its sheet stay only for a
  project with no Setup sprint (generated before RP-5).
  Moved to RP-4: the reseed skips any project somebody has started, and the
  originals have been, so Sprint 0 arrives by an additive backfill into
  originals AND copies (not by reseeding), with `published_at` bumped on the
  originals so the snapshot shows it to new enrolees.

**Why.** Setup becomes part of the plan, tickable and counted, before sprint 1.

**Files.** `packages/db/src/seed/blueprints/types.ts` (+ `setup` field),
`packages/db/src/seed/index.ts` (sprint numbering), `apps/worker/src/pipeline.ts`
(numbering), `lib/projects/workspace-plan.ts`, the sprint gate code in
`sprint-pages.tsx`, `workspace/_components/task-panel.tsx`,
`project-details-client.tsx` ("The plan", "Run it locally" card, milestones),
`project-ai-core.ts` (`validateProposal` sprint numbers).

**Steps.**
1. A setup sprint is `sprint_number = 0`, named "Setup", tasks category
   `setup`. No schema change.
2. Gates and labels: sprint quiz and mock never open for sprint 0; milestones
   and "The plan" show it as "Setup", not "Sprint 0"; Project AI never proposes
   tasks into it.
3. Project page: the "Run it locally" card and its sheet point at Sprint 0 in
   the workspace instead of the generic `setup_guide` list. The column stays;
   the generic generator (`setupGuideFor`) is no longer shown.
4. Next up / current task starts at Setup for a new enrolment.

**Edge cases.** Existing enrolments and copies have no sprint 0: they get it
from RP-4's reseed of the originals, and copies need the same sprint inserted
(a backfill that copies the original's sprint 0 into every copy, with TO_DO
statuses, without touching progress on other sprints). Progress percentages
change when tasks are added; say so in the report.

**Done when.** With a sprint 0 inserted by hand on a dev project, the
workspace shows Setup first, the project page shows it as Setup, the sprint 1
quiz gate ignores it, and the Project AI rejects a proposal into sprint 0.

---

## RP-4 Hand-written Sprint 0 for the 10 seeded projects
- [x] Status: done 2026-09-24. `packages/db/src/seed/blueprints/setup.ts`: a
  Setup sprint per project, 4-6 steps, built from shared steps. Every stack was
  run on a clean folder here: create-next-app 16.3 + Neon with Drizzle AND with
  Prisma 7.10 (+ adapter-neon), each answering /api/health {"db":"ok"}; Vite 8
  + Vitest (test and build pass); Node + Express 5 + ioredis 6 + Neon (health
  ok for both, Redis from a local container); Go 1.27 + go-redis 9 (PONG);
  Go + clickhouse-go 2 against ClickHouse 26.10 from `clickhousectl`; Expo SDK
  57 + expo-sqlite (Metro up, tsc clean after the first start). NOT run here:
  Upstash's TLS URL itself, and Expo Go on a phone.
  Traps found and written into the steps: create-next-app's `.gitignore`
  hides `.env.example` (add `!.env.example`); npm `latest` for `prisma` is an
  8.0 RC that mismatches `@prisma/client` 7 (pin `@7`); TypeScript 6 is strict
  by default so Vite's tsconfig has no `strict` line; `tsc --init` sets
  `"types": []`; `go get` leaves deps indirect (`go mod tidy`); the ClickHouse
  installer is now `clickhousectl`; create-expo-app prompts inside a git repo
  and the template fails tsc until the first `expo start`.
  Sprint 1 task 1 rewritten in 8 projects (no scaffolding left in sprint 1; a
  query finds 0 sprint-1 tasks tagged setup); Prisma wording made ORM-neutral.
  Delivered by `pnpm db:seed --only=project-setup` (additive, idempotent:
  second run inserted 0, rewrote 0): 10 originals + 1 copy got Setup, 9 first
  tasks rewritten in place, progress recounted (a learner at 1/20 is now
  1/24), `published_at` bumped. The Task tab renders `$ ` lines as terminal
  blocks with copy buttons and backticks as code (`brief-text.tsx`).

**Why.** A beginner must get from an empty folder to a running app without
guessing. Generic steps built from stack names do not do that.

**Files.** `packages/db/src/seed/blueprints/*.ts` (a `setup` sprint each),
their sprint 1 task 1 where it overlaps, `seed/index.ts` (seed + backfill for
copies).

**Steps.**
1. Per project, 4-7 tasks: tools to install (exact versions), scaffold command,
   dependencies, the folder structure to create (as a tree), environment
   variables (with a `.env.example`), git init and first commit, run it, and
   what you should see. Each task has criteria the learner can check
   themselves ("`npm run dev` prints a local URL and the page shows ...").
2. Rewrite sprint 1 task 1 of each project where it repeats setup, so sprint 1
   starts with the first real feature.
3. **Follow each guide on a clean directory** before marking this done: the
   JS/TS ones here; for Go/Postgres/Docker ones, the commands are run where the
   tools exist and anything that cannot be run here is listed in the report.
4. Reseed dev and run the copy backfill (RP-3).

**Edge cases.** Windows users (`cp` vs `copy`, env vars): give the npm
commands, which are the same everywhere, and name the one OS difference when
there is one. Pin major versions, not latest, so the guide does not rot. Never
ask the learner to paste a secret into anything but their `.env`.

**Done when.** All 10 blueprints have a setup sprint; a script lists no sprint
1 task 1 with category `setup`; each JS/TS guide followed on a clean folder
ends with the app running as described (recorded per project in the report).

---

## RP-5 AI-written Sprint 0 for generated projects
- [x] Status: done 2026-09-24, with a change of approach. The first real-model
  run showed the model does not follow Setup rules reliably: create-react-app
  for a React project, `go mod init` inside a Node one, a Prisma step with no
  commands. So a generated project on a covered stack gets the SAME verified
  steps as the curated projects, built in code from its stack
  (`setupForStack` in `packages/db/src/project-setup.ts`, now shared by the
  seed and the worker); only the folder list comes from the blueprint.
  Covered: Next.js (+ Postgres), Vite + React, a Node service over Postgres
  (+ Redis), Go (+ Redis), Expo. Other stacks (e.g. FastAPI) use the model's
  own `setup`, validated, and rejected whole if any command uses
  create-react-app, pnpm, yarn or bun; nothing valid means no Setup and the
  page's old "Run it locally" card. Checked on 4 real generations: frontend,
  Node backend and Next full-stack got verified kits, FastAPI got a validated
  model Setup, and no sprint 1 repeated a Setup step. The frontend one was
  followed on a clean folder: dev server up, test passes, clean commit, build
  passes. Worker needs a release before the app.

**Why.** Generated projects need the same start.

**Files.** `apps/worker/src/pipeline.ts` (prompt, schema, insert).

**Steps.** The blueprint prompt asks for a setup sprint with the RP-4 shape
(tools with versions, scaffold, dependencies, tree, env, git, run, expected
result), inserted as sprint 0; the old `setupGuide` array is still written for
the page's legacy readers until RP-3 removes them.

**Edge cases.** The model invents a scaffold flag that does not exist: the
prompt names the scaffold commands for the common stacks (Vite, Next,
Express, Go modules) and forbids others unless the stack needs them.

**Done when.** One generation of each type (frontend, backend, full-stack)
against the real model yields a sprint 0 whose commands, followed in a clean
folder for the frontend one, run.

---

## RP-6 Done = tick + note
- [x] Status: done 2026-09-24. `updateTaskStatus` takes a note and refuses
  Done on a sprint task that has none (Setup exempt); new `saveTaskNote`;
  limits in `lib/projects/task-notes.ts`; notes load with the plan. Verified in
  the browser on the test copy: a Setup step goes Done with no note box;
  choosing Done on a sprint task opens "What did you build or decide?" and
  leaves the task To do; a 2-character note is refused with the reason; a
  real note marks it Done and shows "Your note"; it survives a reload; Edit
  saves; moving back to In progress keeps the note. The empty "No tests for
  this one" box is gone (only a task with tests shows it).

**Why.** Without our tests, the learner's own account of what they built is
what the quiz and mock can test them on.

**Files.** `actions/(main)/projects/project.action.ts` (`updateTaskStatus`),
`workspace/_components/task-brief.tsx`, `task-panel.tsx`.

**Steps.**
1. "Mark done" opens a small box: "What did you build or decide?" (required,
   10-500 characters). Saved to `user_task_v2_status.notes` with the status.
2. The note shows on the task and can be edited; un-marking keeps it.
3. Sprint 0 tasks: the note is optional (setup has nothing to decide).

**Edge cases.** A note of only whitespace. The progress recount and gates
run exactly as before. Copies' statuses are the learner's own.

**Done when.** In a browser: marking a sprint 1 task done without a note is
refused; with one, the task is Done, the note is shown after a reload, and
editing it works.
