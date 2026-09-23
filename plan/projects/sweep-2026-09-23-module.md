# Projects module, deep sweep - 2026-09-23

Three passes over the whole module, after the Explore rebuild and PJ-8 to PJ-12:
the server-action layer, every component, and every loading and pending state.
About 120 findings. What was fixed today is in the first half; what is still
open, with the reason, is in the second.

Two things came back clean and are worth recording: **no `db.transaction(`**
anywhere in the action layer (all seven transactional sites use
`withTransaction`), and **no spinners** - no `animate-spin`, no `Loader2`, no
rotating ring - in the whole module.

## Fixed

### Security: an id from the browser was enough

`lib/projects/access.ts` is new. One rule, the one the sprints page already
enforced: you created this project, or you started it. A task id and a sprint id
resolve up to a project and ask the same question. It is not a `"use server"`
file, so nothing in it is reachable from the browser.

- **`prepareSprintMockKnowledge` had no session lookup at all** and returns the
  project's whole knowledge base - every sprint goal, task description and
  success criterion. A project id was enough to read the paid content of a
  private project.
- **Three assessment actions ran gpt-4o-mini on any task id**
  (`generateTaskQuizQuestions`, `getCodeChallengeInstructions`,
  `submitCodeForValidation`), with no enrolment check and, in that whole file, no
  credit charge either.
- **`updateProjectScore(projectId, userId?)`** took the user id from the caller
  in a `"use server"` file, so any signed-in user could overwrite anybody's
  scores. The parameter is gone; the score belongs to whoever is asking.
- **`addSprintToProject` only checked the project existed**, so any signed-in
  user could write browser-supplied sprints into anyone's project - and a
  personal sprint still consumes a sprint number on the shared project.
- **`getProjectResources` had no auth**, and `addProjectResource` accepted any
  string as a link: `javascript:` and `data:` URLs went into a row the list
  renders as an anchor. Both gated; links must be http or https.
- **Mock feedback was written to an unscoped session id.** The transcript write
  was scoped but its result was not checked, so a guessed id then settled
  somebody else's credit hold and overwrote their interview result.
- `startSprintMockSession`, `getSprintMockStatus`, `saveSprintMockResult`,
  `getTaskAssessmentStatus` and both sprint-completion readers: same guard.

### Money

- **The quiz dispatch had no single flight.** The `if (project.quiz)` check is a
  read-then-write: two tabs both saw no quiz, both dispatched, both held 25
  credits. Keyed per project now, the way sprint generation already was.
- **"Start Interview" showed nothing while it ran**, and creating a session
  charges 30 credits, so a second click bought a second interview. Both mock
  entry points and the hang-up button now have a pending state.
- **"Generate · N credits" was gated on `canProceed` alone**, never on submit, so
  a double click bought two projects at 13 to 55 credits each.

### Broken behaviour

- **Clicking a node in the blueprint flowchart blanked the page.** It set the tab
  to `tasks`; the tabs are overview, pages and setup. It goes to the board now.
- **The flowchart never updated.** `useNodesState` takes an initial value and
  ignores it afterwards, so ticking a task off left the old status on screen for
  as long as the page stayed open.
- **The flowchart canvas was four times too tall.** `tasks?.length ?? 0 / 4`
  parses as `tasks?.length ?? (0 / 4)`, so the row count was the task count.
- **The quiz rendered a blank white page** when generation succeeded and the read
  came back null - `return null` with no message and no way out.
- **Two more auth redirects went to `/login`**, which is not a route. Every
  redirect in the module now goes to `/signin` with a callback.
- **"Sort by" on Mine did nothing.** It set state nothing read. Title and
  Progress sort now; Rating is gone, because there is no rating on the row.
- **The Submit button on a project card linked to `/projects/<slug>/submit`**, a
  route that does not exist. Submitting is a sheet on the project page.
- **Opening a resource could be eaten by the popup blocker**: it awaited a view
  count before `window.open`, which breaks the user-gesture chain. Opens first,
  counts after.

### Loaders, which is what Niraj asked about

The dot-matrix loaders are `InlineLoader` (`sm` in a button, `md` in a row, `lg`
in a panel) and `ShipItHQLoader` for a whole page. Added where an action ran with
no sign of it: both mock interview start buttons, the hang-up button, the
generate sheet's submit, and the helpful vote and delete on a resource.

Two `dynamic()` imports had no `loading:` at all and rendered a blank hole: the
**blueprint flowchart** (a large React Flow chunk in the middle of the page) and
the **orb**, which IS the interview screen.

## Still open, and why

Grouped, worst first. None of these is a one-line fix.

### Money, in the features around the edges

- **`task-details.action.ts`**: debit, then two inserts, none atomic, no refund
  path anywhere in the file. `project_v2_task_detail.task_id` is unique, so two
  concurrent generations both burn a model call, both debit, and the loser's
  insert throws after the debit. Same shape on the "grant access" branch.
- **`standup.action.ts`**: 20 to 35 credits debited, then four unguarded writes.
  Any failure after the debit leaves the user charged a week with no config and
  no standups. `createStandupConfig` is a read-then-write, so two clicks buy two
  configs and half the paid standups become invisible. `renewStandupConfig` has
  no idempotency guard at all - each call charges again.
- **`standup-voice.action.ts`**: the config row is inserted BEFORE the payment
  transaction, so a failed debit leaves an unpaid config behind that
  `createStandupConfig` then refuses to replace - permanently locking that
  project out of standups.
- **`daily-standup-sheet.tsx` charges real credits for a feature that does not
  exist**: the panel it opens says "the submission interface is being built".
- **Sprint generation is free** while the quiz costs 25 - a creator can
  regenerate indefinitely.

### Races and non-atomic writes

`startProject` (duplicate progress rows, `totalStarted` inflated),
`updateTaskStatus` (two status rows for one task, progress over 100 percent),
`totalCompleted` incremented on every re-completion, `submitProject`,
`toggleResourceHelpful` (a lost update - the count and the array disagree
permanently), the quiz attempt's delete-then-insert, and both
generate-if-absent assessment paths, which branch on a read that is 5 to 20
seconds stale.

### Six inline model calls in server actions

`projectassessments` (quiz, code challenge, code review - the last embeds
user-supplied code, so its latency is unbounded), `task-details`, and
`projectv2-mock` twice. These belong in `apps/worker` behind
`startBackgroundJob`: a Worker request has a hard budget and a 60-second
completion is killed long after the user has been charged.

### Errors the user should not see

`toErrorMessage` returns `error.message` verbatim, and a Drizzle failure's
message is `Failed query: insert into project_v2_task_detail (...) values ($1,
$2...)`. That string is returned to the browser from about a dozen places.

### Stale pages

Whole files that mutate and revalidate nothing: `projectv2-mock.action.ts`,
`projectv2-quiz.action.ts`, `project-score.action.ts`, plus `updateTaskStatus`,
`updateTaskNotes`, `startQuiz`, `submitProject` and both assessment generators.
`/projects/[slug]` serves stale progress and scores after a successful write.
Separately, `tasks.action.ts` passes a browser-supplied `path` straight into
`revalidatePath`.

### Duplication

- **Two task lists**: `components/projects/task-list-progress.tsx` is a
  near-verbatim copy of the one in `tasks-page-client.tsx`, and a third lives in
  the sprints board.
- **`daily-standup-tab.tsx` and `daily-standup-sheet.tsx`** share the day picker,
  the config handler, the cost panel and the insufficient-credits block, all
  copied.
- **Four copies of the raw-red "Insufficient credits" panel**, while the
  enrolment dialog uses the destructive tokens for the same message.
- **Six "back to project" affordances, seven empty-state designs.**
- **Credit prices are literals in six files** despite `lib/credits/pricing.ts`.

### Cosmetic, in bulk

`min-h-screen` and `max-w-4xl` inside the shell's page column on five screens;
`py-12 px-6` and `container mx-auto` where `px-page` is the convention; pink
gradients on the quiz CTA and the progress banner; `text-gray-*` in two
components; `shadow-2xl` on several cards; about a dozen conditionals where every
arm is the identical string (`difficultyColors`, `statusColors`, `severityConfig`
MEDIUM vs LOW, a ternary whose branches match); `bg-neutral-900 text-neutral-800`
code blocks in three places, which is near-black on near-black.

### Skeletons that do not match their page

`[slug]/loading.tsx` draws 8 tab pills for a 3-tab page and a 2/3+1/3 body for a
2-column one. `sprints/loading.tsx` draws a 3-column card grid for what is a rail
plus two panes. `quiz` and `aimock` both draw the stage AFTER payment, so the
first paint never matches. `tasks/loading.tsx` draws a 3-column kanban for a
single-column list.

### Dead code - DELETED 2026-09-23, approved by Niraj

`components/projects/task-list-progress.tsx` (738 lines; its `TaskItem` type moved
to `types/project.ts`, which was the only thing anybody imported),
`[slug]/_components/index.ts`, `[slug]/_components/team-members-display.tsx`,
`[slug]/not-found.tsx`, and the share-dialog state with its five Dialog imports,
four unused icons and an unused `useEffect`. About 1,050 lines.

### Standups - NOT FOR SALE, decided 2026-09-23

Both the sheet and the tab charged 5 credits a day for a standup that has nowhere
to be submitted. `STANDUPS_FOR_SALE = false` in each; the configure-and-pay form
is intact and unreachable behind it. Flip both when the submission screen ships.

### The six inline model calls - PJ-14

Planned as its own task, to be done after manual testing.

### Dead code, awaiting a decision (none left)

`[slug]/_components/index.ts` (a barrel nobody imports),
`team-members-display.tsx` (only reachable through that barrel),
the ~700 live lines of `components/projects/task-list-progress.tsx`,
`[slug]/not-found.tsx` (unreachable - `page.tsx` short-circuits), and the unused
share-dialog state and imports on the detail page.
