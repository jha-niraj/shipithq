# Project workspace - tasks

Derived from `overview.md`. Build in order; each leaves the app compiling.

**2026-09-24:** V1 of Projects is code-locally (`plan/project-repos`). The editor,
explorer and preview are switched off there (RP-2), not deleted; they return in V2.

| ID | Task | Status |
|---|---|---|
| WS-1 | Files: schema, actions, copy on enrol (and freeze at publish) | built 2026-09-23 |
| WS-2 | Starter repos for the two browser-runnable projects (Vite layout) | built 2026-09-24 |
| WS-3 (a-f) | The workspace shell, tabs, URL state, and five review passes | built 2026-09-24 |
| WS-9 | The redesigned project page; the board, tasks, quiz and mock pages deleted | built 2026-09-24 |
| **Build order from here** | | |
| WS-10 | Frontend only: hide what the browser cannot run; generation makes React only | done 2026-09-24, **reversed by RP-1** the same day |
| WS-4 | The runtime: live preview and console (Sandpack) | **done 2026-09-24** (runtime verified headless; UI awaits Niraj's look) |
| WS-5 | Task tests and "Check task" | **done 2026-09-24** (tests verified headless; UI awaits Niraj's look) |
| WS-11 | Real types in the editor | **done 2026-09-24** (verified with the TypeScript compiler; UI awaits Niraj's look) |
| WS-15 | The Project AI | **built 2026-09-24**; prompt fix done in RP-2 (V1: no code, reads notes); worker deploy + browser pass pending |
| WS-12 | Sprint quiz | **done 2026-09-24** |
| WS-13 | Sprint mock interview | **done 2026-09-24** |
| WS-14 | Final quiz and final mock, wired as tabs (with PJ-14) | **done 2026-09-24** |
| WS-16 | Generated projects: AI-written starter and tests (+15 credits) | not started |
| WS-7 | AI review of a task's change (5 credits) | superseded by RP-6 (plan/project-repos, 2026-09-24) |
| WS-17 | Editor leftovers: panel sizes, Cmd/Ctrl+P, folder moves, Monaco cancel rejection on unmount | waits for V2 (editor off in V1, RP-2) |
| WS-18 | Clean-up: legacy enrolments and the old board's leftovers | not started |
| WS-19 | Tests for sprints 2-4 of both curated projects | not started |

Every task below states its Done when; a task is marked done only after that
line is checked, with the date.

---|---|---|
| WS-1 | Files: schema, actions, copy on enrol | built 2026-09-23, awaiting a signed-in check |
| WS-2 | Starter repos for the two browser-runnable projects | built 2026-09-23; renders once WS-3/WS-4 exist |
| WS-3 | The workspace shell, tabs and URL state | built 2026-09-24; first pass reviewed, WS-3b applied |
| WS-4 | The runtime: live preview | not started |
| WS-5 | Task tests and "Check task" | not started |
| WS-6 | The board's panels inside the workspace | not started |
| WS-7 | AI review of a task's change (5 credits) | not started |
| WS-8 | Entry points and the skeleton | not started |

---

## WS-1 Files: schema, actions, copy on enrol

**Why.** The workspace needs somewhere for a project's code to live, per copy.

**Files.** `packages/db/src/schema/projects.ts` (+ migration), new
`apps/main/actions/(main)/projects/workspace.action.ts`,
`project.action.ts` (`enrollInProject`).

**Steps.**
1. Table `project_v2_file`: `id`, `project_id -> project_v2 (cascade)`, `path`
   (normalised, leading `/`), `content text`, `is_readonly`, `updated_at`;
   unique `(project_id, path)`.
2. Actions: `listFiles(projectId)`, `saveFile(projectId, path, content)`,
   `createFile`, `renameFile`, `deleteFile`. Owner only. Size caps (per file
   200 KB, per project 5 MB) as constants referencing this doc.
3. `enrollInProject` copies the original's files into the copy.

**Edge cases.** Path traversal (`..`, backslashes, empty segments) is refused.
Two tabs saving the same file: last write wins, with `updated_at` returned so
the editor can warn on a stale write. A read-only file (a provided test) cannot
be saved.

**Done when.** A copy made by enrolling has the original's files, and
`saveFile` on someone else's project returns "not found".

**Status (2026-09-23).** Built. Migration 0024 (`project_v2_file`, FK,
unique `(project_id, path)`) applied to dev. `workspace.action.ts` has
list/save/create/rename/delete, owner-only, with the limits in
`lib/projects/workspace.ts` and stale-write detection on save. Enrolling copies
the files inside the enrolment transaction. `tsc` clean; the path rules pass
10 cases (traversal, backslash, control characters, empty, over-long). Not yet
exercised signed-in: the "Done when" needs a real session, so it is checked in
WS-3 when the page calls these actions.

**Files are frozen at publish (Niraj, 2026-09-23).** Migration 0025 adds
`project_v2_published_file`. "Make public" copies the live files into it in
the same transaction as the visibility flip; enrolling copies from it, never
from the owner's live files. The seed writes a curated project's starter into
both (WS-2).

## WS-2 Starter repos for the two browser-runnable projects

**Why.** Sprint 1, task 1 should be a real edit to real code, not setup.

**Files.** `packages/db/src/seed/starters/` (one folder per project),
`seed/index.ts`.

**Steps.** A minimal React + TypeScript app for `habit-tracker-weekly-review`
and `markdown-notes-with-search` that runs in the bundler, plus the tests for
their sprint 1 tasks. The seed writes them as files of the curated project.

**Edge cases.** Only packages the bundler resolves. The tests must fail on the
untouched starter (or they check nothing) and pass on a reference solution,
which is kept outside the seeded files.

**Done when.** Both projects open in the workspace and render; sprint 1's tests
fail before the task and pass on the reference solution.

**Status (2026-09-23).** Built.
- `packages/db/src/seed/starters/<slug>/files` (seeded) and `/solution` (never
  seeded). Each sprint 1 task is a small module of typed stubs that throw
  "TODO: sprint 1, task N", so the app runs and every test fails honestly.
- Tests test logic, not rendering, and use only describe/it/expect (vitest here,
  Sandpack's Jest in the browser). Storage and timers are injected (a
  `StorageLike`, a `Scheduler`) so they need no browser.
- `pnpm starters:check` (packages/db): all 9 test files fail on the stubs with
  real per-test failures (it flags a file that errors on load, which is how the
  habit tracker's task 5 fixture was caught and fixed) and pass on the solution.
  Solutions and tests also typecheck under `strict`.
- Markdown notes task 2 (IndexedDB) has no test: IndexedDB needs a real
  browser. It keeps the manual status buttons, as WS-5 allows.
- Seeded to dev with `--only=project-starters`: 16 and 15 files, tests
  read-only, live and published snapshots identical.
- "Done when" part one (open and render) waits for WS-3 and WS-4.

**Open.** Sprint 1 task 1 of both blueprints still says "create a React
project"; with a starter that is already done. The task text should say
"make the starter yours" - a content edit to the two blueprint files, taken in
WS-5 when tests are attached to tasks.

## WS-3 The workspace shell, tabs and URL state

**Why.** The page itself: the part Niraj asked to be really great.

**Files.** `app/(main)/projects/[slug]/workspace/{page,loading}.tsx`,
`_components/*`.

**Steps.**
1. Layout: activity rail, task panel, editor, explorer on the right, preview,
   bottom panel; resizable and collapsible, sizes remembered.
2. Editor tabs: open, close, reorder, dirty dot, middle-click, overflow
   scroll; `TASK.md` as a rendered read-only tab.
3. `localStorage` per project: open tabs, active tab, panel sizes. Guarded
   reads; stale paths (a deleted file) are dropped on restore.
4. URL: `?task=`, `?file=`, `?panel=`, `?bottom=`, via `history.replaceState`
   (as the board does, PJ-17).
5. Explorer: tree, new file or folder, rename, delete, with the save state.
6. Keyboard: Cmd/Ctrl+S saves, Cmd/Ctrl+W closes a tab, Cmd/Ctrl+P opens a file
   by name.

**Edge cases.** The URL and `localStorage` disagree: the URL wins for the
active file, and the stored tabs are still restored. A file open in a tab is
deleted: its tab closes. Below `lg`: a message and a link to the board.

**Done when.** Open three files and TASK.md, reload: the same tabs return in
the same order with the same one active, and the URL reopens the same task
and panel.

**Status (2026-09-24).** Built as a real route, so Niraj can review the
layout in the app before the runtime goes in. Owner only; a non-owner with a
copy is redirected to their copy's workspace, anyone else to the project page.
- Title bar (project, current task, done count), activity rail (Tasks,
  Resources, Errors, Standup; Quiz, Mock and the board as links), resizable
  tasks | editor + preview | explorer columns, tests/console below, status bar.
- Tabs: TASK.md (rendered brief, status toggle, the task's test file) and
  files in Monaco, one model per file. Dirty dot, close on x or middle-click,
  drag to reorder, restored per project from localStorage.
- Autosave 800ms after typing stops, Cmd/Ctrl+S now, Cmd/Ctrl+W closes; a stale
  write keeps this editor's text and warns; leaving with unsaved edits asks.
- Explorer: create, rename in place, delete via an app dialog; tests locked.
- URL: `?task`, `?file`, `?panel`, `?bottom` via `history.replaceState`.
- Placeholders, said plainly in the UI: the preview (WS-4) and "Check task"
  (WS-5). Resources, Errors and Standup already use the real components, which
  pulls part of WS-6 forward.
- Not yet: remembered panel sizes, Cmd/Ctrl+P, and Monaco type errors
  (switched off until the runtime can supply package typings).

## WS-6 and WS-8 (folded in)

WS-6 (the board's panels inside the workspace) was done inside WS-3b: Resources,
Errors and Standup open as tabs using the real components. WS-8 (entry points
and skeleton) was done by WS-3 and WS-9: the workspace has its loading.tsx, and
the project page's primary action opens it.

## WS-3b Niraj's first pass on the workspace (2026-09-24)

**Why.** Niraj used the page and liked the layout; this is the list that makes
it final before any runtime work. UI and layout only, no new functionality.

**Decisions (Niraj).** Frontend (React) projects only, for now and for v1.
Quiz and mock interview are per sprint and appear as tabs like the task brief.
Errors, Resources and Standup open as full tabs in the editor area, and the
left side stays the task list. Sprint generation from the workspace is not
needed now; a button for it comes later.

**Steps.**
1. **Fix: a tab switch wrote one file's text into another.** Monaco got both
   `path` and a controlled `value`; on a switch it reported the previous
   file's text as a change and the handler filed it under the new tab. Seen in
   dev: `package.json` held `tests/s1-t5.test.ts`. The editor is now
   uncontrolled per model and a change is attributed to the model it happened
   in. An edit that matches the saved text is not a change.
2. The save status reads from real dirty state, not from "a change fired".
3. Starters match what `npm create vite@latest -- --template react-ts`
   produces: `index.html` at the root, `src/main.tsx`, `App.css`,
   `index.css`, `vite-env.d.ts`, `vite.config.ts`, `tsconfig.app.json` and
   `tsconfig.node.json`, `public/`. Strictness moves to `tsconfig.app.json`.
4. Virtual tabs: **Task**, **Quiz**, **Mock interview** (per sprint),
   **Resources**, **Errors**, **Standup**. The task list shows each sprint's
   Quiz and Mock interview after its tasks.
5. Explorer: new folder as well as new file, from the header and from any
   folder; a file-type icon per extension (monochrome, per CLAUDE.md).
6. Preview can be closed and reopened.
7. Editor settings in the tab strip, VS Code style: font size, font, word
   wrap, minimap, line numbers, tab size. Remembered per viewer.
8. Every scrolling region uses `ScrollArea`.
9. The task list is narrower and denser.
10. The bottom panel's tabs have a pointer cursor.
11. Buttons in the Errors panel had dark ink on a dark fill (the same forced
    gradient on the default variant as PJ-17 step 5); fixed.

**Done when.** Switching between ten tabs and reloading changes no file on the
server; the explorer creates a folder and a file in it; each of the six
virtual tabs opens from the rail or the task list and its URL.

**Status (2026-09-24).** All eleven steps built; `tsc` clean; awaiting Niraj's
pass. Found while building: the save timer read `files` from its closure, so a
second edit made while a save was in flight would have sent the old version
stamp and raised a false "changed in another tab"; it reads the latest files
through a ref now. Starters re-seeded in the Vite layout (47 files), which also
restored the corrupted `package.json`; `pnpm starters:check` still green.
An empty folder is kept only in the page until a file goes into it.

## WS-3c Niraj's second pass (2026-09-24)

**Steps.**
1. Explorer drag and drop: drag a file onto a folder (or the empty area, for
   the root) to move it. A move is a rename on the server. Test files stay put.
2. Fix: dragging a tab to the RIGHT did nothing - it was reinserted before its
   right-hand neighbour, which is where it already was.
3. Fix: editor settings other than font size had no effect. Tab size is a
   per-model option that Monaco's indentation detection overrides; fonts need
   a remeasure. Settings are now applied to the editor and model directly.
4. Resources: the type dropdown's menu matches its trigger's width; the full
   pages (Resources, Errors, Standup, Quiz, Mock interview) have less top space.
5. Closing Tests and Console leaves a thin bar in its own place to reopen it,
   not a link in the status bar. Keyboard: Cmd/Ctrl+B tasks, Cmd/Ctrl+J the
   bottom panel, Cmd/Ctrl+Alt+B the explorer (VS Code's keys).
6. File-type icons in their language's colour (TypeScript blue, React cyan,
   and so on). **A deliberate exception to CLAUDE.md's monochrome palette,
   asked for by Niraj on 2026-09-24**, limited to file-type icons, with a
   darker shade of each in light mode so they hold contrast.
7. A "+" menu on the task list: Generate sprint, Add task. Mockup only,
   disabled and labelled as such.
8. The explorer can be hidden and shown (open by default), from its header,
   the title bar's layout toggles, and the keyboard.

**Status (2026-09-24).** All eight built; `tsc` clean; awaiting Niraj's pass.
Folders cannot be dragged yet (a folder move is a rename of every file in it,
which wants a server action of its own); files can.

## WS-3d Niraj's third pass (2026-09-24)

**Steps and status.** All built 2026-09-24, `tsc` clean, awaiting Niraj's pass.
1. **Editor settings, second fix.** Fonts were named but never loaded, so every
   choice fell back to the same system monospace (and Menlo IS the Mac system
   font). JetBrains Mono, Fira Code and Geist Mono now load through
   `next/font`, Monaco gets their real family names, and it remeasures once a
   font arrives. The switches are single `role="switch"` buttons, not a Radix
   Switch inside a `<label>`. Tab size says what it does: it applies to the
   Tab key and new lines, and never re-indents existing text (VS Code agrees).
2. **Pinned tabs: AI first, Task second.** Neither closes, drags, or can be
   dropped among; Cmd/Ctrl+W and middle-click skip them.
3. **The AI tab** replaces the "+" menu: the learner asks for a task or a
   sprint and it asks back (which sprint? what should it focus on?). Layout
   only; the example conversation is labelled as one, the input is disabled.
   When wired it runs as a worker job, per CLAUDE.md.
4. **Less padding** on every page tab: left-aligned at 24px, 16px from the top,
   no centred column; titles one size down.
5. **Final quiz and Final mock interview** at the foot of the rail, in place of
   the board link.

## WS-3e Niraj's fourth pass (2026-09-24)

Built 2026-09-24, `tsc` clean, awaiting Niraj's pass.
1. **Final quiz and Final mock interview open as tabs** in the workspace, not
   on another page. They cover every sprint and show their gate from `gates.ts`
   (opens at 50% and 75% of tasks, and where you are). Layout only, like the
   sprint ones; the sprint and final pages share one quiz and one mock layout.
2. **Every page tab sits in one centred column, `max-w-7xl`** (`PAGE_COLUMN`),
   input rows included, so it stays in the middle whether the preview and the
   explorer are open or closed.
3. In development only, the rail leaves room at its foot for Next's dev badge,
   which covered the last button.
4. The project page and its setup guide stay as they are (Niraj: "this is also
   great").

## WS-3f Fifth pass (2026-09-24)

Built, `tsc` clean, awaiting Niraj's pass.
- Page tabs centre at `max-w-4xl` (Niraj chose 896px): `max-w-7xl` is wider
  than the editor pane at normal widths, so it never engaged.
- Resource type icons: one neutral ink in both themes. They were
  `text-neutral-800`, dark on the dark menu, so a highlighted row's icon
  vanished ("Course" looked iconless); YouTube red and Design pink broke the
  palette. Video and Blog Article got their own icons, in the form and the list.
- A MOCKUP of a proposed project page at `/projects/<slug>/redesign`, real
  data, inert buttons: hero as one band with progress inside it, a "Next up"
  strip, and one body (about, outcomes, the plan with every sprint's tasks)
  with a side column (stack, run it locally, final gates) instead of the
  Overview / Setup Guide tabs. Temporary: deleted once a layout is chosen.

## WS-9 The redesigned project page; the old pages deleted
- [x] Done 2026-09-24 (`tsc` clean; awaiting Niraj's browser pass).

**What.** `/projects/<slug>` is the approved redesign: the hero as one band
with progress and the primary action, "Next up", then one body (about,
outcomes, the plan) with a side column (stack, run it locally with the full
setup guide in a sheet, final gates). Primary action by viewer: your copy ->
open it; owner started -> workspace; owner not started -> start building;
public -> enrol. Standup, Submit (at 90%), Make public and "Your copy of X" kept.

**Deleted, approved by Niraj 2026-09-24.** Routes `/projects/<slug>/sprints`,
`/tasks`, `/quiz`, `/aimock`; the components only they used
(`progress-gate`, `sprint-mock-interview`, `sprint-generation-sheet`,
`page-overview-card`, `components/main/quiz-results`); the `/redesign` mockup.
`next.config` redirects the four routes into the workspace (quiz and mock to
their tabs). Every link and `revalidatePath` now points at the workspace.
**Kept:** every server action - quiz generation, mock knowledge base, add task,
task details, assessments - because the workspace tabs are wired to them.

**Legacy enrolments** (progress on someone else's project, from before copies)
are offered enrolment with a line explaining it; WS-18 removes the rows.

## WS-10 Frontend only
**Why.** Decided 2026-09-24: the browser runtime runs React, so the catalogue
shows only what runs, and generation only makes what runs.
**Files.** `packages/db/src/schema/projects.ts` (+ migration), seed,
`project.action.ts` (catalogue queries), `categories.action.ts`,
`explore.action.ts`, the generation sheet, `apps/worker/src/pipeline.ts`.
**Steps.**
1. `projects_v2.runtime` text, `'browser' | 'server'`, default `'browser'`.
   The seed sets it per curated project (2 browser, 8 server).
2. Every catalogue query (public list, all projects, explore ideas' linked
   project, overview counts, jobs feed) filters `runtime = 'browser'`.
3. Generation: the stack pickers offer React + TypeScript + Vite only; the
   worker prompt says frontend-only (no backend, no database beyond
   localStorage / IndexedDB). Generated projects are `'browser'`.
**Edge cases.** A user already enrolled in a hidden project keeps their copy
and its workspace; only discovery is filtered. Pathfinder's private projects
follow the same generation rule.
**Done when.** The catalogue lists exactly habit-tracker-weekly-review and
markdown-notes-with-search, and a newly generated project is React + Vite.

- [x] **Done 2026-09-24.** Migration 0026: `projects_v2.runtime` (+ index),
  backfilled - 2 curated `browser`, 8 `server`; generated projects by their
  declared backend; copies from their original. The seed derives it from
  whether a starter folder exists, so there is no second list.
  `lib/projects/catalogue.ts` (`catalogueWhere()`) is now the only public
  filter: hub, all-projects, categories, overview count, platform stats, jobs
  feed. Explore hides ideas whose blueprint needs a server, and its facets and
  tab count use the same rule. Generation: the worker fixes the stack (React +
  TypeScript on Vite, browser storage), states hard constraints in the prompt,
  pins `technologies` and stamps `runtime = 'browser'` - in the worker, because
  the AI chat tool and Pathfinder start generations too. The form lost its
  project-type and stack pickers for one plain line. **Verified:** the catalogue
  query returns exactly the two projects and Explore shows 2 of 10 ideas (dev
  DB); `tsc` clean in main, worker and db. **Deploy:** the worker change needs a
  worker release before the app release; the first real generation after it is
  the live check of the React-only rule.

## WS-4 The runtime: live preview and console
**Why.** The preview panel is the point of the workspace: code you write runs
beside you.
**Files.** `workspace/_components/preview-pane.tsx` (new), `workspace-client.tsx`,
`apps/main/package.json` (`@codesandbox/sandpack-react`).
**Steps.**
1. Sandpack provider with the `vite-react-ts` template and CodeSandbox's hosted
   bundler; the project's files mounted as Sandpack files, `index.html` and
   `src/main.tsx` as entry. Only the preview and console come from Sandpack;
   the editor stays Monaco.
2. Live: buffer changes (not only saved files) are pushed to Sandpack,
   debounced ~300ms, so the preview follows typing.
3. Console tab: Sandpack's console output, with clear and a count badge.
4. Errors: a compile or runtime error shows as an overlay in the preview and a
   line in the console, never a blank frame.
5. Preview toolbar: reload, open in a new tab, the current URL path.
**Edge cases.** A package not in `package.json` (Sandpack resolves only
declared deps); a very large file; the preview panel closed (Sandpack stays
mounted but paused, so reopening is instant); a hidden-runtime (`server`)
project shows the "runs outside the browser" message instead.
**Done when.** In the habit tracker, editing `APP_NAME` in `src/config.ts`
changes the heading in the preview without saving and without a reload, and
a `console.log` in `App.tsx` appears in the Console tab.

- [x] **Done 2026-09-24.** Sandpack 2.20, `@codesandbox/sandpack-react`.
  **The client bundler, not the Vite template:** Sandpack's Vite template runs
  on Nodebox, which supports Vite 4 (the starters are Vite 6), and Sandpack's
  test runner only exists on the client bundler. `runtime-files.ts` is the
  boundary, pure and tested: it sends the project's files as they are, with the
  entry `src/main.tsx`, the project's `index.html` as `public/index.html` minus
  Vite's module script, runtime dependencies only, and a `tsconfig.json` built
  from `tsconfig.app.json` (Vite's root one is only references). One provider
  wraps preview, console and tests; edits reach it from the editor's buffers,
  300ms after typing stops. Preview has reload and open-in-new-tab; the Console
  tab has a count (red if any error) and clear.
  **Verified** on Sandpack's real hosted bundler with Playwright's cached
  Chromium (harness in the session scratchpad): the untouched habit-tracker
  starter renders "My App"; changing `src/config.ts` changes the heading to
  "Edited live" without a reload; a `console.log` in `App.tsx` reaches the host
  (twice - StrictMode, correct). `tsc` clean. **Not yet seen:** the React
  wiring inside the workspace page itself.

## WS-5 Task tests and "Check task"
**Why.** A task is done when its tests say so (decided 2026-09-24: all green
marks it Done automatically).
**Files.** schema (`project_v2_task.test_path`, + migration), seed, enrol copy,
`task-brief.tsx`, `workspace-client.tsx`, a `test-runner.tsx`.
**Steps.**
1. `test_path` text on tasks; the seed sets it from `/tests/s<n>-t<m>.test.ts`;
   enrolment copies it. `testPathFor()` in `workspace-model.ts` is deleted.
2. "Check task" runs that one test file with Sandpack's Jest (`SandpackTests`
   filtered to the path) against the current buffers.
3. The Tests panel shows each test, pass or fail, with the assertion message.
4. All green -> `updateTaskStatus(task, 'COMPLETED')`; the task list, the
   header count, the project page and the gates update. A failed run never
   changes a Done task.
5. Rewrite sprint 1 task 1 of both blueprints from "create a React project" to
   "make the starter yours" (the starter already exists).
**Edge cases.** A task with no test keeps the manual status toggle. A test
file that errors on load reports as an error, not as "0 passed". A run while
a save is in flight uses the buffers, so the result matches the editor.
**Done when.** In the habit tracker, sprint 1 task 2's check fails on the
starter, passes after writing the functions, and the task shows Done on the
project page after a reload.

- [x] **Done 2026-09-24.** Migration 0027 `project_v2_task.test_path`; the seed
  sets it from each starter's `/tests/s<sprint>-t<task>.test.ts` (habit tracker
  sprint 1: 5 of 5, notes sprint 1: 4 of 5 - IndexedDB is manual); enrolment
  copies it. `testPathFor()` is gone. Tests are sent to the sandbox and run
  there by `TestBridge`: waits for the bundler, keeps results by `test.path`,
  reports a file that fails to load, gives up after a minute. "Check task" runs
  the task's file against the buffers; the Tests panel shows each test and its
  message; all green marks THAT task Done (captured before the run), never
  un-does a Done task. With the preview closed the sandbox stays mounted
  off-screen so tests still run. Sprint 1 task 1 of both blueprints now reads
  "make the starter yours" (applied to dev directly, since the blueprint re-seed
  skips started projects); the notes brief no longer claims a stored title.
  **Verified** on the real bundler: sprint 1 task 2 fails all four tests on the
  starter ("TODO: sprint 1, task 2") and passes all four on the reference
  solution; task 1 fails for the right reasons (placeholder name, strict off),
  which also proves JSON imports work there. Found: a run for one path runs
  every test file, hence filtering by path. `tsc` clean. **Not yet seen:** the
  button and panel in the page, and the Done write, in a browser.

## WS-19 Tests for sprints 2-4 of both curated projects
**Why.** Found in WS-5: WS-2 wrote tests for sprint 1 only, so 30 of the 40
curated tasks can only be ticked by hand.
**Steps.** Per sprint: stub modules added to the starter where a task needs a
new one, a test per task, the reference solution extended, `pnpm
starters:check` green, re-seed. Tasks that are visual or need a browser API the
tests cannot see (IndexedDB, layout) stay manual and say so.
**Done when.** `starters:check` covers sprints 1-4 and every task that can be
tested has a `test_path`.

## WS-11 Real types in the editor
**Why.** Semantic checking is off because Monaco cannot see React's types, so
the editor misses real mistakes.
**Steps.** Load `@types/react`, `@types/react-dom` and the project's own files
into Monaco's TypeScript worker as extra libs and models; switch semantic
validation back on; read `strict` from `tsconfig.app.json` so the editor
agrees with the task.
**Edge cases.** Types for `marked` (the notes project). Packages without types
fall back to `any` quietly, never a wall of red.
**Done when.** A wrong prop type in `App.tsx` is underlined, and a correct
file shows no errors.

- [x] **Done 2026-09-24.** `pnpm workspace-types` (apps/main) writes
  `public/workspace/types.json` (13 files, 226 KB) from the installed @types/react
  19 and @types/react-dom 19 and marked 18, plus stubs for csstype, vite/client,
  vite, @vitejs/plugin-react, vitest/config and the test globals. Static: no CDN
  at runtime, no TypeScript compiler in the page. `editor-types.ts` loads it
  once, sets compiler options from the project's `tsconfig.app.json` (so strict
  follows task 1), keeps a model for every source file so imports resolve, and
  turns semantic checking on only once the types are in.
  **Verified** by compiling both starters with the TypeScript compiler, the same
  checker Monaco runs, fed exactly `types.json` and these options: both starters
  show no errors, and `tabIndex="first"` on the heading is reported as "Type
  'string' is not assignable to type 'number'". The first run caught
  `vite.config.ts` importing build tooling the bundle lacked, hence the three
  tooling stubs. **Not yet seen:** the squiggles in the page itself.

## WS-15 The Project AI
**Why.** Decided 2026-09-24: one pinned tab that adds tasks, plans sprints,
answers questions about the code, and breaks a task into steps.
**Files.** schema (`project_ai_message`, + migration), `apps/worker` job
`project_ai` (DO + alarm, per CLAUDE.md; all five edits from its README),
`AI_TASKS` entry in `packages/ai`, `workspace/_components/ai-assistant.tsx`,
a server action to dispatch and one to apply a confirmed change.
**Steps.**
1. Conversation stored per project copy; the tab shows it and resumes after a
   reload (`useBackgroundJob`).
2. The job gets: the question, the plan (sprints and tasks), the current task,
   and - for code questions - the files the question is about (size-capped).
3. It answers with text, or with a PROPOSED change: a task (sprint, title,
   brief, done-when, hint) or a sprint (name, goal, tasks). It asks back when
   the sprint or the focus is unclear.
4. A proposal shows as a card with Add / Change / Discard. Only Add writes,
   through the existing add-task and sprint actions, and only Add is charged
   (5 credits, held at dispatch of the proposal, settled on Add, refunded on
   Discard).
5. Questions and "break into steps" are free. It never edits files.
**Edge cases.** A proposal for a sprint that was deleted meanwhile; two tabs
sending at once (one job at a time per project); a question about a file over
the cap (it says which part it read).
**Done when.** "Add a task for a dark mode toggle" asks which sprint, and
after "Sprint 2" and Add, the task appears at the end of sprint 2 in the task
list and 5 credits leave the balance once.

- [ ] **Built 2026-09-24, not yet done.** Migration 0028 `project_ai_message`;
  worker job `project_ai` with all five README edits (JOB_TYPES, class, env +
  jobs/index, wrangler binding + new tag v9, entry export); `AI_TASKS.projectAi`;
  prompt and validation in `project-ai-core.ts` (pure). App:
  `project-ai.action.ts` (send with an in-flight check before storing the
  message, list with the pending job for reload, Add in one transaction that
  claims the proposal, debits 5 in SQL, writes the rows, logs the ledger and
  recounts progress; Discard free); `lib/projects/workspace-plan.ts` shared by
  the page and Add. Price `project_ai_write: 5` in `pricing.ts`. The AI tab is
  live: history, resume after reload, suggestion chips, proposal cards.
  **Checked against the real model (gpt-4o-mini, habit tracker's real plan):**
  "Add a task for a dark mode toggle" asked which sprint and proposed nothing;
  after "Sprint 2." it proposed a valid task for sprint 2 with 3 criteria; a
  proposal for a sprint that does not exist is dropped by validation.
  **Open:** "Plan a new sprint on accessibility: keyboard use and screen
  readers" ASKED what to prioritise instead of proposing, though the focus was
  given - the prompt needs "if the focus is already stated, propose". Then:
  release the worker, and a browser pass for the whole flow including the
  5-credit Add.

## WS-12 Sprint quiz
- [x] Status: done 2026-09-24. Built as its own tables (migration 0029:
  `project_v2_sprint_quiz`, unique per sprint, questions as jsonb; and
  `project_v2_sprint_quiz_attempt`, a row per attempt) instead of a
  `sprint_id` on `project_v2_quiz`, whose one-quiz-per-project shape several
  readers rely on. Worker job `sprint_quiz` (five edits, tag v10), prompt and
  validation in `sprint-quiz-core.ts` (8-10 questions, 4 distinct options,
  options shuffled on save because the model parks the answer in slot B),
  `modelFor("sprintQuiz")`, price `sprint_quiz: 25`. Answers never reach the
  browser before the learner answers; the score is recomputed on the server.
  Verified in the browser as a signed-in test user with the worker running
  locally: sprint 2 locked, listing its 5 open tasks; sprint 1 (all done, with
  notes) "Generate quiz · 25 credits" -> generated in 23s -> questions built
  on the learner's notes -> one at a time with right/wrong and explanation ->
  score 3/9 saved; reload keeps it; a retake is free (ledger: one -25 row,
  balance 500 -> 475); Review lists all 9 with answers. Found and fixed: a
  loader inside a <p> (hydration error).
**Why.** Each sprint ends with a quiz on what it built (25 credits; opens when
all its tasks are Done).
**Files.** schema (a `sprint_id` on `project_v2_quiz`, nullable = final quiz;
unique per sprint), a worker job `sprint_quiz`, `projectv2-quiz.action.ts`,
`sprint-pages.tsx`.
**Steps.** Generate on request (hold 25, settle or refund); questions from the
sprint's tasks and the user's current files; take it in the tab (one question
at a time, explanation after each); score and history kept; retake allowed
without paying again.
**V1 (plan/project-repos, 2026-09-24):** questions come from the sprint's
tasks and the learner's task notes (RP-6), not files; never for Sprint 0.
**Edge cases.** Opening before the gate shows what is left; a sprint whose
tasks change after generation keeps its quiz; enrolment copies no quiz for a
sprint (it is generated per copy).
**Done when.** With sprint 1 all Done, Generate charges 25 once, the quiz
runs in the tab, and the score is still there after a reload.

## WS-13 Sprint mock interview
- [x] Status: done 2026-09-24. Table `project_v2_sprint_mock_session`
  (migration 0030; transcript jsonb saved line by line, feedback jsonb). One
  worker job `sprint_mock` (tag v11) with three steps: open (the session's 30
  credits are held on this dispatch, so a session that never asks a question
  is refunded), turn (next question or one follow-up; the job that writes the
  closing line also writes the feedback), feedback (ended early). Prompts in
  `sprint-mock-core.ts`: 5 main questions, follow-up on vague answers, uses the
  learner's notes, hard cap of 9 interviewer turns. Answers are appended in
  SQL only while the interviewer is waiting (a double send changes nothing);
  a stalled turn offers "Ask again"; a dead "opening" session never blocks a
  new one. Dictation reuses `useDictation` (Sarvam).
  Verified in the browser with the worker local: sprint 2 locked; a full
  sprint 1 interview (8 answers, one follow-up after "I dunno", notes quoted),
  a reload mid-session kept all 5 lines, it closed itself, feedback 65/100 with
  strengths, gaps and next steps; listed under Past interviews and readable;
  one -30 ledger row per session; ending early gives a "nothing to score"
  report. Found and fixed on the way: Sarvam rejected Chrome's
  `audio/webm;codecs=opus`, so EVERY dictation (the practice page's too) got a
  502 - `packages/ai/src/sarvam/stt.ts` now strips the codec; the tab's
  dictation then returned 200s. A real phone/mic check is still Niraj's.
**Why.** Each sprint ends with a mock interview about its decisions (30 per
session; opens when all its tasks are Done; text plus Sarvam dictation).
**Files.** worker jobs for the question plan and the feedback (PJ-14's mock
calls move here), `projectv2-mock.action.ts`, `sprint-pages.tsx`, the practice
page's dictation hook (reused, not copied).
**Steps.** Start (hold 30) -> questions one at a time as text -> answer typed
or dictated -> follow-ups -> end -> feedback with strengths, gaps and a score;
the transcript is kept and re-readable.
**V1 (plan/project-repos, 2026-09-24):** the interviewer reads the sprint's
tasks and the learner's task notes (RP-6); never for Sprint 0.
**Edge cases.** Refund if the session never produces a first question; voice
unavailable falls back to typing (as on the practice page); leaving mid-session
keeps the transcript so far.
**Done when.** A full sprint-1 mock runs in the tab by typing and by
dictation, feedback appears, and it is still readable after a reload.

## WS-14 Final quiz and final mock, wired as tabs
- [x] Status: done 2026-09-24, by reusing WS-12 and WS-13 with the whole
  project as scope rather than the old final quiz/mock code (which hardcoded
  gpt-4-turbo-preview, sent correct answers to the browser, ignored notes, and
  made inline model calls - PJ-14). Migration 0031: `sprint_id` nullable on
  the sprint quiz and mock tables (null = final), one final quiz per project
  by a partial unique index. Gates 50% / 75% of all tasks, now in
  `@repo/db/project-gates` so the worker re-checks the same numbers; prices
  stay `project_quiz` 25 and `project_mock` 30.
  Verified in the browser: at 23% both tabs say "Opens at 50%/75%... you are
  at 23%"; at 77% the final quiz generated in 21s (10 questions across
  sprints) and answered; the final interview opened on the learner's notes,
  followed up, and ended early with feedback (85); ledger one -25 and one -30.
**Why.** The tabs exist (layout); the old pages are deleted, so these must work
before anyone reaches 50%.
**Depends on** PJ-14 (the inline model calls move to the worker).
**Steps.** Wire the Final quiz tab to the existing project quiz (generation,
attempt, results) and the Final mock tab to the WS-13 flow with the whole
project as scope; gates stay 50% and 75%.
**Done when.** At 50% the final quiz can be generated and taken in its tab,
and at 75% the final mock runs; neither needs a page outside the workspace.

## WS-16 Generated projects: AI-written starter and tests
**Why.** Decided 2026-09-24: a generated project gets a starter and per-task
tests like the curated ones, written by the worker.
**Files.** `apps/worker/src/pipeline.ts` (a new stage), validation module
shared with `pnpm starters:check`'s rules, generation sheet (price).
**Steps.**
1. After the plan exists, a second stage writes the Vite starter's own module
   stubs and one test file per task, as structured JSON.
2. **Restrictions, enforced in code, not in the prompt:** paths only under
   `src/` and `tests/`; allowed dependencies only (react, react-dom, and a
   short list); per-file and total size caps; tests use only describe/it/expect
   and import only the module their task names; no network, timers or
   randomness in tests; each stub exports every name its test imports; files
   parse as TypeScript. A file that fails is dropped and its task keeps manual
   status - generation never fails as a whole on one bad test.
3. Written to the project's files and, if public, its published snapshot.
**Edge cases.** The model proposes a dependency outside the list (rejected, the
task falls back); a test that would pass on the stub (cannot be checked in the
worker without running it, so the first "Check task" on an untouched starter
that PASSES flags the test as broken and hides it).
**Price:** +15 credits on top of generation (overview, Prices; decided 2026-09-24). The constant in `lib/credits/pricing.ts` references it.
**Done when.** A newly generated project opens with runnable code and a test
for most tasks, and every test fails on the untouched starter.

## WS-7 AI review of a task's change
5 credits (`overview.md`, Prices). A worker job reads the task brief and the
diff of the task's files against their state when the task began, and returns
review notes in the Task tab. Needs a snapshot of files at task start (taken
when a task first moves to In progress).
**Done when.** Requesting a review on a finished task returns notes that refer
to the actual change, and 5 credits are charged once.

## WS-17 Editor leftovers
Panel sizes remembered per viewer; Cmd/Ctrl+P quick open by file name;
dragging a folder (moves every file under it, one server action, atomic).
**Done when.** Sizes survive a reload, Cmd/Ctrl+P opens a file by typing part
of its name, and a folder drag moves all its files.

## WS-18 Clean-up
Remove legacy enrolment rows (progress on a project the user does not own) in
dev, with the count reported first; delete the `/sprints`, `/tasks`, `/quiz`
and `/aimock` redirects once nothing links to them for a release; remove
`sprint-generation.action.ts`'s board-only exports if WS-15 does not use them.
**Done when.** No progress row points at a project its user does not own, and
the redirects are gone with no 404s in the logs.

## WS-20 The Project AI as a docked right panel; every tab closable
- [x] Status: done 2026-09-24. Default 40% wide (25-55%), per Niraj's example width; header "Project AI" with a close button, the icon removed and the description cut to one line (Niraj, mid-task). Verified in the browser: open by default at 460px of 1152; dragging the handle widened it to 610px and the width survived a reload; its X closed it and it stayed closed after a reload; the rail reopened it; the Task tab has a close button and closing it leaves "Nothing open"; `?file=@ai` opens the panel. The workspace skeleton includes the panel. Niraj, 2026-09-24: keep the AI "on the right side opened", closable, wider, resizable; Task, Resources, Errors and the rest closable too.

**Files.** `workspace/_components/workspace-client.tsx`, `workspace-model.ts`, `editor-tabs.tsx`, `ai-assistant.tsx`, `loading.tsx`.
**Steps.** The AI leaves the tab row and becomes a resizable panel on the right (about a third of the width by default, 22-50%), open by default, with a close button in its header; the rail's AI button and the title bar toggle it; open/closed and width remembered per browser. No pinned tabs: Task closes like any other; with nothing open the centre says how to open something. `?file=@ai` opens the panel.
**Edge cases.** Old saved tabs containing `@ai` are dropped from the tab row. Narrow windows: the panel keeps a sensible minimum.
**Done when.** In a real page the AI is open on the right beside the Task tab, closes and reopens, resizes by dragging, and stays closed after a reload once closed; Task closes; `tsc` clean.

## WS-21 Back and Next on the Task tab
- [x] Status: done 2026-09-24. Verified: the first task shows no Back; Next from Setup's last step opens Sprint 1 task 1 and moves `?task=`; Alt+Left and Alt+Right step back and forward; each button names the neighbour and where it is ("Setup, step 6", "Sprint 1, task 2"). Niraj, 2026-09-24: "add the back and next button ... easier for the users".
**Files.** `workspace/_components/task-brief.tsx`, `workspace-client.tsx`.
**Steps.** Under the brief, "Previous" and "Next" buttons naming the neighbouring task, crossing sprint boundaries (Setup -> Sprint 1 -> ...); disabled at either end; Alt+Left / Alt+Right as shortcuts; the URL's `?task=` follows.
**Done when.** In a real page Next moves from Setup's last step to Sprint 1 task 1 and Back returns; the first task has no Back; `tsc` clean.

## WS-22 Project AI: inline, a cleaner panel, and a new mark
- [x] Status: done 2026-09-24, verified in the browser against Done when.
**Why.** A reply is a single short completion (well under 30s) and free, so a Durable Object round trip only adds a failure point ("Could not start the job" whenever the worker is down). The dashed "How it goes" example and the description line read as clutter; the two-spark star "is not looking right".
**Files.** `actions/(main)/projects/project-ai.action.ts` (inline reply), `packages/ai/src/project-ai.ts` (the prompt and validation, moved from the worker so the app and the worker share them), `workspace/_components/ai-assistant.tsx`, `workspace-client.tsx`, `packages/ui/src/components/ui/ai-mark.tsx` (the Orbit mark), `apps/main/components/navigation/sidebar.tsx`, `CLAUDE.md` (the exception).
**Steps.** `sendAiMessage` stores the question, calls the model inline with a 25s timeout, validates the proposal with the same code the worker used, stores the reply, returns both; no job, no polling. Remove the dashed example and the description; an empty conversation shows the suggestion chips only. Proposal cards keep Add (5 credits) and Cancel; a new sprint is appended after the last one. The Orbit mark (a dot with a broken ring) replaces the two sparks everywhere AIGlyph is used.
**Edge cases.** Model timeout or bad JSON: the question is removed again and put back in the input with the error, so nothing unanswered is left in the thread; no credits involved. Two sends at once: a question newer than any reply (under 40s old) blocks the next.
**Done when.** With the worker NOT running, asking "Add a task to sprint 2 for exporting CSV" returns a proposal card in one request; Add creates the task at the end of sprint 2 and charges 5; Cancel discards; "Plan a new sprint on accessibility" proposes a sprint that Add appends after the last sprint; `tsc` clean.

## WS-23 The rail: quiz and mock open the next one not done; the gates sit at the bottom
- [x] Status: done 2026-09-24, verified in the browser against Done when.
**Steps.** "Sprint quiz" opens the first build sprint whose quiz you have not taken (no attempt yet), and "Sprint mock interview" the first whose mock you have not finished; when all are done, the last sprint's. The final quiz/mock buttons sit at the very bottom of the rail; the rail no longer reserves room for Next's dev badge (development only, and draggable - moving it to the bottom right put it over the AI panel's send button).
**Done when.** With sprint 1's quiz taken, the rail's quiz opens sprint 2; the rail's mock opens sprint 1 while it has no ended session; the final gates are at the rail's foot.
**Verified 2026-09-24 (WS-22, WS-23).** With no worker running: "Add a task for a dark mode toggle" asked which sprint and listed Sprints 1 to 5 only; "Put the dark mode task in Sprint 4" proposed it there; "Plan a new sprint on offline support..." proposed Sprint 6 at once with a one-line reply; Cancel showed "Cancelled."; Add on the accessibility sprint created Sprint 5 at the bottom and took 5 credits. Replies took 4 to 9 seconds. Two things the prompt alone did not hold, so they are enforced in code (`lib/projects/project-ai-reply.ts`): the valid sprints are stated in the request, and a reply longer than 320 characters beside a card is replaced by one sentence. The rail's Sprint quiz and Sprint mock opened Sprint 2 (Sprint 1's were done), and the final gates sit 8px from the rail's foot. The worker's `ProjectAi` class was then removed (approved by Niraj, 2026-09-24): binding, exports and file gone, wrangler migration `v12` deletes the class, and the `project_ai` job type stays in `JOB_TYPES` so past job rows remain valid.


## WS-24 The sprint mock interview talks inline, not through the worker
- [ ] Status: not started. Niraj, 2026-09-25.

**Why.** Every question and answer in a sprint mock is a chat turn, and each
one is dispatched as a `sprint_mock` worker job (`step: 'turn'`). The new rule
in CLAUDE.md "Long-running work" says chat runs inline. A turn takes a few
seconds, and the job round trip only adds failure points: it's the same
"Could not start the job" failure the Project AI had.

**Files.**
- `apps/main/actions/(main)/projects/sprint-mock.action.ts`: the `open`,
  `turn` and `feedback` steps
- `apps/worker/src/jobs/sprint-mock-core.ts`: the prompts and validation,
  moved to `packages/ai` as the Project AI's were
- `sprint-mock.tsx`, where client polling is replaced by awaiting the action

**Steps.**
- **Turns and opening question:** answered inline, with a 25-second timeout.
- **The session's credits:** held by the action when the session opens and
  settled at feedback, as the job did.
- **Feedback:** inline too, if it reliably finishes in under 30 seconds.
  Measure it first, and keep it in the worker if not.
- Remove the `SprintMock` class once nothing dispatches it, with a wrangler
  `deleted_classes` migration, as was done for `ProjectAi`.

**Edge cases.**
- A turn that fails puts the learner's answer back into the box so they can
  resend it. It is never lost.
- Two answers sent at once: only one is in flight per session.

**Done when.**
- With the worker stopped, a full sprint mock (opening question, 5 turns,
  feedback) completes.
- The credits held at open are settled exactly once.
