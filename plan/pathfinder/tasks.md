# Pathfinder - tasks

Derived from `overview.md`. Build in order. `P` = `apps/main/app/(main)/pathfinder`,
`A` = `apps/main/actions/(main)/pathfinder`.

---

## PF-0 Delete goals with no content
- [x] Status: done (2026-09-27)
- **Why:** 2 goals titled "Master System Design" had no topics; opening one was an empty page. (DoD 11)
- **Files:** `packages/db/src/scripts/pathfinder-empty-goals.ts`
- **Edge cases:** one of the two had a fork. `forked_from_id` is not a foreign key, so the fork (which has content) is kept and only points at a goal that no longer exists.
- **Done when:** `pnpm script pathfinder-empty-goals` reports 0. Verified: deleted 2, then re-planned: 0.

## PF-1 Delete dead code (approved 2026-09-27)
- [x] Status: done (2026-09-27). Deleted the 3 components, the 3 `_` helpers, `getDailySessionByDate`, `saveSessionNotes`, `submitSubGoalQuiz`, `getPublicPathfinderGoalById`, `getPublicPathfinderGoalBySlug` and `startVerification`. Both UUID branches became one `or(slug, id)` lookup scoped to the owner. `'CODERZ'` moves to PF-11, which rewrites `submitProject`. tsc clean; each name has 0 hits.
- **Why:** dead files and actions make every later change look riskier than it is, and they hide what the module actually does. (DoD 10)
- **Files:**
  - `P/[slug]/_components/pathfinder-flashcards-tab.tsx`, `pathfinder-videos-tab.tsx`, `subgoal-quiz.tsx`
  - `A/goals.action.ts`: the `_getCategoryEmoji`, `_mapToMockCategory` and `_mapToMockLevel` helpers, and the UUID branches
  - `A/subgoals.action.ts`: `getDailySessionByDate`, `saveSessionNotes`, `submitSubGoalQuiz`
  - `A/explore.action.ts`: `getPublicPathfinderGoalById`, `getPublicPathfinderGoalBySlug`
  - `A/verification.action.ts`: `startVerification`, the UUID branch, and `'CODERZ'`
- **Steps:**
  1. Before removing each item, grep for importers across `apps/` and `packages/`.
  2. Keep `updateGoalStatus`, `deletePathfinderGoal` and the group actions. PF-4 and PF-5 wire them up.
  3. Keep `completeMockInterview` until PF-10 replaces it.
- **Edge cases:** a function called from `apps/worker` or `apps/admin`, which a grep of apps/main alone would miss.
- **Done when:** `tsc --noEmit` in apps/main is clean, and each deleted name has 0 hits across `apps` and `packages`.

## PF-2 Real paths: revalidation, ids, and the /studio links
- [x] Status: done (2026-09-27). Added `lib/pathfinder/revalidate.ts` (`revalidateGoal(goalId, { verify })`), which looks up the slug; all 10 id-based calls go through it. Removed the "Open Full Notes" button and Studio's "Open full Studio" link, since no `/studio` route exists. The `slug ?? id` fallbacks now resolve, because lookups accept either. Left for another module: `home/page.tsx:57` and `home/_components/continue-learning.tsx:162` also link to `/studio/<slug>`, which 404s.
- **Why:** each `revalidatePath('/pathfinder/${goalId}')` refreshes a page that doesn't exist, so the goal page shows stale counters. "Open Full Notes" goes to a 404. (DoD 10)
- **Files:**
  - `A/subgoals.action.ts`, `A/verification.action.ts`, `A/goals.action.ts`
  - `P/[slug]/_components/daily-practice-view.tsx:560`
  - `components/studio/studio-panel.tsx:211`
  - the dashboard (the `slug ?? id` fallbacks)
- **Steps:**
  1. Add a helper that looks up the goal's slug and revalidates `/pathfinder/<slug>` and `/pathfinder`.
  2. Drop the `?? goal.id` URL fallbacks. Slug is NOT NULL.
  3. "Open Full Notes" becomes the Notes tab (PF-8). Until then, remove the button.
- **Edge cases:** Studio is used by other modules, so check where `studio-panel`'s link is shown before changing it.
- **Done when:** grep finds no `revalidatePath(\`/pathfinder/${goalId` and no `"/studio` link in apps/main.

## PF-3 Explore: address by id, light listing, real landing
- [x] Status: done (2026-09-27). Rendered on dev: the grid with search and a card for the Kafka goal ("copied" count shown); the preview with "Open your copy" and Day 1 and Day 2; `/explore/nope` shows "This goal isn't available". The route is `explore/[id]` (`getPublicPathfinderGoal(id)` filters on `isPublic`). `getPublicPathfinderGoals` selects columns plus count subqueries (days, coding, copies), skips goals with 0 topics, and caps at 200. The sidebar layout and the placeholder are gone. `/pathfinder/explore` is `PathfinderShell` (PageHeader + TabsNav: My goals, Overview, Explore) over a searchable, filterable card grid with an empty state. The preview is one centred page, with the plan by day and a single "Copy to my goals" / "Open your copy" button. The skeletons match. Also neutralised the pink FRONTEND and slate SYSTEM_DESIGN category tints. tsc clean.
- **Why:** slugs are unique only per user, so `/pathfinder/explore/kafka` can open someone else's goal. The listing loads every topic of every public goal. The landing is a placeholder. (DoD 6)
- **Files:**
  - `A/explore.action.ts`
  - `P/explore/[slug]` (renamed to `P/explore/[id]`)
  - `P/explore/page.tsx`, `explore/_components/*`, `explore/layout.tsx`
- **Steps:**
  1. Rename the route to `[id]` and look up by id with `isPublic = true`.
  2. Make the listing select counts, not relations.
  3. The landing becomes a grid of goal cards with a search box and an empty state.
  4. Fix the divider's dark background (`layout.tsx:28`).
- **Edge cases:**
  - Old `/explore/<slug>` links: a slug is not a cuid, so it gets `notFound()`. No redirect is needed on dev.
  - Private goals must 404, not leak.
- **Done when:** the old slug collision can't happen, because the route only accepts ids and the query filters on `isPublic`. `/pathfinder/explore` renders a grid, and renders the empty state when there are 0 public goals.

## PF-4 Private by default, sharing is free, pricing gone
- [x] Status: done (2026-09-27). Migration `0067_pathfinder_private_default` (one statement: `ALTER COLUMN "is_public" SET DEFAULT false`) is applied on dev and reads back `false`; the existing goals keep their values (2 shared, 1 private). `createPathfinderGoal` defaults to private and no longer charges. The create sheet has a free "Share in Explore" switch in place of the paid Private card. Added `setGoalPublic` plus a `ShareToggle` in the goal header. Deleted `creator.action.ts`, `creator-earnings-sheet.tsx` and `PATHFINDER_CREDITS.privateGoalCreation` / `publicGoalCreation`. The purchase table and `credit_price` stay, unused.
- **Why:** today a goal is public unless you pay credits to hide it, and a goal can carry a price. Decision 2 drops both. (DoD 4)
- **Files:**
  - `packages/db/src/schema/pathfinder.ts` (`isPublic` default becomes false; a migration)
  - `A/goals.action.ts` (the ~:185 charge for private goals)
  - `A/creator.action.ts` (delete it)
  - `P/[slug]/_components/creator-earnings-sheet.tsx` (delete it)
  - `create-goal-sheet.tsx` and `create-interview-prep-sheet.tsx` (a Share switch, off)
  - the goal header (the Share switch)
  - `goal-preview-content.tsx` (remove the "Copy for N credits" copy)
- **Steps:**
  1. Generate the migration, show what it contains, then run `pnpm script migrations --apply`.
  2. Add a `setGoalPublic(goalId, on)` action, owner only.
- **Edge cases:**
  - Existing goals keep their current value. The migration changes only the default.
  - Existing `pathfinder_goal_purchase` rows stay as history.
- **Done when:**
  - A new goal is created with `is_public = false` and no credit movement.
  - The switch makes the goal appear in Explore and removes it again.
  - `creator.action` has 0 importers.

## PF-5 Copy a goal properly, for free
- [x] Status: done (2026-09-27). The core is in `lib/pathfinder/copy.ts` (`copyGoalFor(userId, goalId)`), wrapped by the `copyPathfinderGoal` action. Checked on dev as a throwaway user copying the Kafka goal: 16 of 16 topics, with no field differences (kind, isAIGenerated, isContentLoaded, aiCodingProblem, hasCoding, description); notes 2 of 2 studios and 4 of 4 steps; first day 2026-09-27 (today); a second copy returned the same id with `existing: true`; credits unchanged at 50. The user was deleted afterwards (goals left: 0).
- **Why:** copies drop each topic's kind, AI flags, coding problems and notes. Topics sit on "Generating" forever, and days start in the past. A second paid copy crashed on a unique index. (DoD 5)
- **Files:** `A/explore.action.ts` (`copyPathfinderGoal`), `goal-preview-content.tsx`
- **Steps:**
  1. Inside `withTransaction`, copy the goal (private) and its sessions. Re-base the dates: the first day becomes today, and the gaps are kept.
  2. Copy the topics with `kind`, `source`, `isAIGenerated`, `isContentLoaded`, `aiCodingProblem` and `hasCoding`.
  3. Copy each studio's notes into a new studio owned by the person copying.
  4. No credits and no purchase row.
  5. If the user already owns a copy (same `forkedFromId`), return it instead of copying again.
- **Edge cases:**
  - Copying your own goal: allowed, and it makes a new copy.
  - A topic whose source has no content yet: copy it as not loaded, so PF-7 can generate it.
  - Slug clash with one of the copier's own goals: reuse `generateAndCheckSlug`.
- **Done when:** on dev, copy the Kafka goal as a second user.
  - The copy has 16 topics, all with kind and content flags matching the source.
  - The first day is today.
  - A second copy returns the same id.
  - Credits are unchanged.

## PF-6 Manage goals and groups
- [ ] Status: built with PF-12 (2026-09-27), waiting on Niraj's click-through.
  - `goal-card.tsx` has an always-visible menu: Pause or Resume (ABANDONED is labelled "Paused"; there is no archive status, so there is no Archive item), Move to group, Share or Stop sharing, and Delete (an AlertDialog naming the goal and what goes with it).
  - `group-header.tsx` has Rename (a dialog) and Delete (the confirm says the goals stay, ungrouped).
  - The actions already checked the owner. The store updates in place.
- **Why:** a goal can't be paused, archived or deleted, and a group can't be renamed or deleted. The actions exist, but nothing calls them. (DoD 3)
- **Files:**
  - `A/goals.action.ts` (`updateGoalStatus`, `deletePathfinderGoal`)
  - `A/groups.action.ts`
  - the dashboard goal card menu and group headers
- **Steps:**
  1. Add a card menu: Pause or Resume, Archive, Move to group, Share, and Delete (with a confirm dialog naming the goal).
  2. Add a group header menu: Rename and Delete.
- **Edge cases:**
  - Deleting a group: `group_id` is `set null`, so the goals survive. Say so in the confirm.
  - Deleting a goal cascades to its verification, attempts and ledger. The confirm says so.
  - Only the owner can do any of these (check the owner in each action).
- **Done when:** each action works on dev, and a second user's call on the goal returns an error.

## PF-7 Generate AI-planned topics in the worker
- [ ] Status: built (2026-09-27); the end-to-end run needs the local worker, or a `pnpm release` of apps/worker.
  - `generateContentForAISubGoal` now makes the Studio, then dispatches `subgoal_generation` with `singleFlight` keyed on the topic. The inline model calls, `generateQuizAndCoding` and the `pathfinderQuizAndCoding` AI task are removed.
  - The worker job now sets `isContentLoaded: true`. Without that, a generated AI topic kept offering the button.
  - The row follows the job with `awaitBackgroundJob`. On failure it shows the error and the button comes back, because it is keyed on `isContentLoaded` rather than on having a Studio.
  - The toast no longer promises a quiz.
  - tsc is clean in main and worker.
- **Why:** "Generate Content" runs several LLM calls inside a server action. That breaks the long-running-work rule, and a timeout leaves the topic "Generating" forever. (DoD 7)
- **Files:**
  - `A/goals.action.ts` (`generateContentForAISubGoal`)
  - `apps/worker/src/jobs/` (`subgoal_generation`)
  - `daily-practice-view.tsx` (the button and the toast)
- **Steps:**
  1. Dispatch `startBackgroundJob("subgoal_generation", { subGoalId }, { cost })` for an existing topic, and follow it with `useBackgroundJob`.
  2. Make the job accept an existing topic, not only a new one.
  3. Fix the toast wording: no quiz is made.
- **Edge cases:**
  - Double click: one job per topic while one is running.
  - Failure: show Retry and refund, as the job hook already does.
- **Done when:** an AI-planned topic on dev goes from not loaded to loaded through the worker, with the job row showing a terminal status. A failed job shows Retry.

## PF-8 Goal page as a tabbed workspace
- [ ] Status: built (2026-09-27). Server render checked; waiting on Niraj's resize and phone-width check.
  - New files: `goal-workspace.tsx`, with the PageHeader, the Today/Plan/Notes/Verify `TabsNav` driven by `?tab=`, and a resizable topic list (30%, 20 to 45%) beside the topic. Below `lg` the list and the topic take turns, with an "All topics" back button. Also `topic-row.tsx` (the old row, lifted unchanged) and `notes-reader.tsx` (with `getGoalNotes`: every EXPLANATION step in plan order, plus a contents rail).
  - Today with nothing added points at the next unfinished topic.
  - `daily-practice-view.tsx` is deleted. The page no longer calls `getOrCreateDailySession` on every visit, which had created an empty session each day it was opened; `createSubGoal` still makes today's session.
  - Render check on dev as a throwaway user with a copied Kafka goal (deleted after): every tab returned 200 with its own content (Add a topic, Mock interview, Shared; Day 1 and Day 2 in Plan; the Notes reader; Verify's generate prompt). The dev log had no errors.
- **Why:** the goal page is a fixed 350px rail that breaks on mobile, with a hand-built header. (DoD 1)
- **Files:**
  - `P/[slug]/page.tsx`, `loading.tsx`
  - a new `P/[slug]/_components/goal-workspace.tsx`
  - split out from `daily-practice-view.tsx` (then deleted): `today-tab.tsx`, `plan-tab.tsx`, `notes-tab.tsx`
  - `subgoal-content-tabs.tsx`, `subgoal-coding.tsx`
- **Steps:**
  1. Header: `PageHeader` with the title, category, level and progress, and actions for Share, Mock and the usage widget.
  2. Add `TabsNav` driven by `?tab=`.
  3. **Today:** today's topics, a resizable list plus content.
  4. **Plan:** every day, grouped, with "Add a topic".
  5. **Notes:** every topic's notes in one reading view.
  6. **Verify:** PF-9.
  7. Below `lg`, the list and the content become a toggle.
- **Edge cases:**
  - A goal with no session today: Today offers to start today's session, or points at the next topic in the plan.
  - Interview-prep goals keep "Practise this job's rounds".
- **Done when:** every tab returns 200 on dev for the Kafka goal. There is no horizontal scroll at 375px (checked by Niraj). The skeleton matches.

## PF-9 Verify moves into the workspace
- [x] Status: done (2026-09-27).
  - The verify components moved to `[slug]/_components/verify/` and render in the Verify tab. Their "Back to Goal" headers are replaced by a one-line progress strip over all 4 sections (the old header counted 3).
  - `/pathfinder/<slug>/verify` redirects to `?tab=verify`. Checked: the response carries `NEXT_REDIRECT` to `?tab=verify`.
  - Both `window.location.reload()` calls are now `router.refresh()`.
  - The rotating-ring spinner in the generate sheet is removed; its real progress bar stays.
- **Why:** Verify is a separate page with its own header, and the quiz reloads the whole window. (DoD 8)
- **Files:** `P/[slug]/verify/*` (it becomes the Verify tab), `page.tsx` (redirects to `?tab=verify`), `quiz-verification.tsx`
- **Steps:**
  1. Render the four sections inside the tab.
  2. Replace `window.location.reload()` with state or `router.refresh()`.
  3. Keep the existing generation job.
- **Done when:** `/pathfinder/<slug>/verify` lands on the Verify tab, and a quiz submit updates without a reload.

## PF-10 Mock verification tied to a real session
- [x] Status: done (2026-09-27).
  - `startVerificationMock(goalId)` starts, or resumes, a voice session on the mock the verification job already writes (`mockInterviewId`). It stores `mockSessionId`, sets IN_PROGRESS and opens `/mock/voice/interview/<sessionId>`.
  - `refreshVerificationMock(slugOrId)` runs on every Verify render. It polls `progressVoiceMock` so a handed-in interview gets scored, then applies the session's own `overallScore` (70 passes, and a pass unlocks Project). The update is guarded on the session id, so one interview counts once. An unscored or expired session goes back to "start again".
  - The dead `completeMockInterview`, which took the score from the browser, is deleted. The CreateMockSheet fallback is gone, and so is the gradient.
  - Checked on dev: seeded a COMPLETED session scoring 82, then rendered Verify. The section went IN_PROGRESS → COMPLETED with score 82, attempts 1, and Project LOCKED → PENDING. A second render changed nothing. The user was deleted.
  - Not run end to end: a live voice interview, which Niraj can check in the browser.
- **Why:** the Mock link 404s because it passes a mock id where the route expects a session id. `completeMockInterview` has no callers, so the Project section can never unlock. (DoD 8)
- **Files:**
  - `A/verification.action.ts`
  - `mock-verification.tsx`
  - `actions/(main)/mockvoice/voice.action.ts` (`createCustomMockVoice`)
  - `session.action.ts` (`createMockVoiceSession`)
- **Steps:**
  1. "Start" creates a custom mock briefed on the goal (title, objectives, topics), then a session, and stores the session id in `verification.mockInterviewId`.
  2. `getVerificationStatus` reads that session. When the session is COMPLETED with a score, the section completes, with the score copied across.
  3. The link opens `/mock/voice/interview/<sessionId>`.
- **Edge cases:**
  - An abandoned or cancelled session: offer Start again, which makes a new session.
  - Credits follow the existing mock pricing.
- **Done when:** on dev, a session marked COMPLETED with a score flips the section to COMPLETED and unlocks Project.

## PF-11 Project verification tied to a real project
- [x] Status: done (2026-09-27).
  - Replaced `submitProject`, which threw away the form and trusted `'custom'` (and still carried the `'CODERZ'` type), with two actions:
    - `listMyProjectsForVerification`
    - `linkVerificationProject(goalId, projectId)`: rejects a project that has no progress row for this user; COMPLETED passes now, anything else waits as IN_PROGRESS.
  - `refreshVerificationProject(slugOrId)` runs on each Verify render: it passes the section when the project completes, and goes back to PENDING if the project is gone.
  - The UI lists your projects with their status, shows a "Waiting on <project>" card with an Open link, and the goal's suggested projects as ideas with "Find a project to build". The red gradient is gone.
  - Checked on dev: a linked project with COMPLETED progress took the section IN_PROGRESS → COMPLETED, and with the other three sections done the verification `passed` became true. The user was deleted.
  - Deviation: "start one from the goal" is a link to Projects Explore, not a generated project. Generating one is a larger feature and has no task yet.
- **Why:** the form throws away what you type, and nothing checks that a project exists. (DoD 8)
- **Files:** `project-verification.tsx`, `A/verification.action.ts` (`submitProject`)
- **Steps:**
  1. List the user's projects (`user_project_v2_progress` joined to `project_v2`) and let them pick one, or start one from the goal's topic.
  2. Store `projectId`.
  3. The section passes when that progress row is `COMPLETED`, and shows "Submitted, in review" for `SUBMITTED`.
  4. Remove the red gradient.
- **Edge cases:**
  - A project owned by someone else: rejected.
  - A project later reset: the section reads its live status.
- **Done when:** picking a COMPLETED project on dev passes the section, and passing a forged project id returns an error.

## PF-12 Dashboard: tabs like Projects
- [x] Status: done (2026-09-27). Rendered on dev: My goals (the card and New group, Prep for a job), and Overview (Active goals, Days practised, Keep going).
  - `PathfinderShell` wraps the page: `PageHeader` with the tabs My goals, Overview (`?tab=overview`) and Explore, and the actions New goal, Prep for a job and New group.
  - My goals: filter chips (Active, Paused, Completed, All) and grouped card grids. The store is the truth once seeded; there is no fallback to the server list, so a deleted last goal stays deleted.
  - Overview: a 5-cell `StatBand`, Days practised, and a "Keep going" list. The goal-trend, per-goal bar and category pie charts are gone.
  - `getUserPathfinderGoals` no longer loads the sessions, topics and verification for each goal. The skeleton matches.
- **Why:** the dashboard has a hand-built header, a remounting goals list and five charts. (DoD 2)
- **Files:** `P/page.tsx`, `P/_components/pathfinder-dashboard.tsx` (split up), `P/loading.tsx`, `P/explore/layout.tsx`
- **Steps:**
  1. `PageHeader` (New goal, Prep for a job, New group).
  2. `TabsNav`: My goals (`/pathfinder`), Overview (`?tab=overview`), Explore (`/pathfinder/explore`).
  3. Hoist `GoalsList` out of the render function.
  4. Overview: `StatBand` plus one trend.
- **Done when:** the three tabs render, and the skeleton matches.

## PF-13 Incident learning path, with Adopt (was INC-32)
- [x] Status: done (2026-09-27).
  - Owner: a "ShipItHQ" system account (`shipithq-official`, team@shipithq.com, no password), created by the script (Niraj, 2026-09-27).
  - Content is in `apps/main/content/incidents/paths.ts`: 3 days, 5 topics matching the case's `learn` list, each with hand-written notes grounded in the case's sources. Alarm retry facts are checked against Cloudflare's docs: at least once, up to 6 retries, backoff from 2 s.
  - `path-cases.ts` holds a slug list for the player, so the notes are not shipped to the browser.
  - `pnpm script incident-paths` refuses when the titles drift from `learn` or the two lists disagree. It compares the stored topics and notes against the content, rewrites in place (keeping the goal id, so copies stay linked), and is idempotent: apply, then "Nothing to do".
  - `adoptIncidentPath(caseSlug)` copies the path with `copyGoalFor`. The incident's "What you'll learn" has "Adopt this path", which uses the sign-in gate when signed out.
  - Checked on dev: adopting gave 5 topics, all 5 with notes and loaded; a second adopt returned the same copy; the incident page renders the button. The user was deleted.
- **Why:** an incident teaches what went wrong, and a path is how to learn the rest. (DoD 9)
- **Files:**
  - `packages/db/src/scripts/incident-paths.ts`
  - `apps/main/content/incidents/*` (`learn`)
  - `case-player.tsx` (`LearnList`)
- **Steps:**
  1. The script upserts one public goal per incident, owned by the ShipItHQ account. The account is found by email from env, and the script stops if it is missing.
  2. It has one topic per `learn` item, with hand-written notes.
  3. The incident's `meta.pathGoalId` points at it.
  4. "Adopt this path" calls `copyPathfinderGoal` (PF-5) and opens the copy.
- **Edge cases:** re-running the script updates the goal in place and never duplicates it. Signed out, Adopt opens the sign-in prompt.
- **Done when:** the preview lists 1 goal with 5 topics, `--apply` writes it, a second run shows nothing to change, and Adopt makes a working copy.

## PF-14 Refresh the older docs
- [x] Status: done (2026-09-27). Both srs docs now open with a pointer here and a list of what is out of date.
- **Why:** `srs/core-modules/pathfinder/00` and `01` describe files that have since changed.
- **Done when:** both docs point here for current state, and none of their facts contradict this file.
