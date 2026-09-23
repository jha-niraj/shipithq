# Project workspace - tasks

Derived from `overview.md`. Build in order; each leaves the app compiling.

| ID | Task | Status |
|---|---|---|
| WS-1 | Files: schema, actions, copy on enrol | not started |
| WS-2 | Starter repos for the two browser-runnable projects | not started |
| WS-3 | The workspace shell, tabs and URL state | not started |
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

## WS-4 The runtime: live preview

**Steps.** Mount the project's files into the runtime chosen in `overview.md`,
keep the preview live as files change, and show a console. For a stack v1
cannot run, show the explanation, not a broken frame.

**Done when.** Editing `App.tsx` in the habit tracker changes the preview
without a reload.

## WS-5 Task tests and "Check task"

**Steps.** `project_v2_task.test_files` (jsonb: path to content). "Check task"
runs that task's tests with the project's files; the result shows in the Tests
panel; all green sets the task COMPLETED through the existing status action,
so progress and gates stay one source of truth.

**Edge cases.** A task with no tests keeps the manual status buttons. Test
files are read-only in the explorer. A failing run never un-completes a task
that was completed earlier.

**Done when.** In the habit tracker, sprint 1 task 1's check fails on the
starter and, after the edit, passes and ticks the task on the board as well.

## WS-6 The board's panels inside the workspace

**Steps.** Quiz, mock, resources, errors and standup open as panels from the
activity rail, reusing the components the board uses, addressed by `?panel=`.

**Done when.** Each panel opens from the rail and from its URL.

## WS-7 AI review of a task's change

5 credits (`overview.md`, Prices). A worker job (per CLAUDE.md: never
inline) that reads the task brief and the diff of the task's files against the
files as they stood when the task began, and returns review notes.

## WS-8 Entry points and the skeleton

**Steps.** "Open workspace" on the project page and the board for owners; a
`loading.tsx` that matches the shell.

**Done when.** Both entry points land on the workspace, and the skeleton does
not reflow into the real page.
