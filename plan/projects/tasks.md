# Projects - tasks

Derived from `overview.md`. Order matters: UI first, then actions, then schema,
so every step leaves the app compiling.

| ID | Task | Serves | Status |
|---|---|---|---|
| PRJ-1 | Remove team membership, invitations and visibility | 1, 2 | done (2026-08-20) |
| PRJ-2 | Remove third-party feature and sprint suggestions | 3 | done (2026-08-20) |
| PRJ-3 | Remove leaderboards | 4 | done (2026-08-20) |
| PRJ-4 | Remove voting and moderation from ideas and errors | 3 | done (2026-08-20) |
| PRJ-5 | Drop the tables | 6 | done (2026-08-20) |
| PRJ-6 | Verify the solo loop still compiles and holds together | 5 | done (2026-08-20) |
| PRJ-7 | /projects is the user's own overview, not a sales page | 7 | done (2026-08-29) |
| PRJ-8 | The generate sheet has no button to open it | 5 | done (2026-08-29) |
| PRJ-9 | The generate sheet asks too much | 5 | done (2026-08-29) |
| PRJ-10 | /projects/ideas renders a void when the catalogue is empty | 7 | done (2026-08-29) |

---

## PRJ-1 - Remove team membership, invitations and visibility

**Status:** done (2026-08-20)
**Serves:** 1, 2

**Why.** `team-collaboration.action.ts` is 559 lines of invite / accept /
decline / cancel / remove-member / update-role / update-visibility. It is the
single largest piece of the thing being removed.

**Files**
- delete: `actions/(main)/projects/team-collaboration.action.ts`
- edit: `app/(main)/projects/[slug]/_components/project-details-client.tsx`
- schema: `projectV2Members`, `projectV2Invitations`, `projectV2MemberRoleEnum`

**`visibility` STAYS.** Checked before deleting, and it is not what it looks
like: `eq(projectsV2.visibility, 'PUBLIC')` is the filter that separates the
**platform catalogue** from a user's own projects, and it is read by the browse
page, categories, platform stats and the jobs feed. Dropping it would empty the
project catalogue.

What goes is `updateProjectVisibility` - the action letting a user flip their own
project public, which IS the sharing mechanism - and its UI control.

**Edge cases**
- **`visibility` looked like sharing and is not.** Found by grepping the string
  rather than the symbol: six call sites filter the public catalogue on it. The
  column and its enum stay; only the user-facing toggle goes. This is the edge
  case that would have broken project browsing.
- **`teacherMemberId` on `projects_v2` looks like membership and is not.** It is
  the `apps/uni` integration point. Leave it.
- **`projectV2Members` may be referenced by relations** declared on other tables.
  Drizzle relations are runtime objects; a dangling `many(projectV2Members)`
  compiles and then throws on the first query that uses `with`.
- **The uni app may read these tables.** Check `apps/uni` before dropping, and
  typecheck it afterwards.

**Done when**
No file references membership, invitations or visibility; `tsc --noEmit` passes
in `apps/main` and `apps/uni`.

---

## PRJ-2 - Remove third-party feature and sprint suggestions

**Status:** done (2026-08-20)
**Serves:** 3

**Why.** `project_v2_feature_suggestion` carries `suggestedBy: VISITOR` and an
`addedByUsers` array - it exists so people can propose features on projects that
are not theirs. `sprint-suggestions.action.ts` is the same idea for sprints.

**Files**
- delete: `actions/(main)/projects/feature-suggestions.action.ts`
- delete: `actions/(main)/projects/sprint-suggestions.action.ts`
- delete: `components/projects/feature-suggestion-sheet.tsx`
- delete: `components/projects/feature-suggestions-list.tsx`
- edit: `app/(main)/projects/[slug]/_components/project-assistant-buttons.tsx`
- edit: `app/(main)/projects/[slug]/sprints/_components/sprints-page-client.tsx`
- schema: `projectV2FeatureSuggestions`, `projectV2SprintSuggestions`,
  `featureSuggestionTypeEnum`, `featureSuggestionStatusEnum`,
  `suggestionSourceEnum`

**Edge cases**
- **`sprint-suggestions.action.ts` was explicitly KEPT as CLN-10** two tasks ago,
  on the grounds that it was the only bridge to a live table. That reasoning is
  now void - the table is going too. Update `plan/cleanup/candidates.md` so the
  record does not contradict itself.
- **`sprints-page-client.tsx` renders the suggestion list inline.** Remove the
  section, not just the import, or an empty panel is left behind.
- **`adoptSuggestionToMyTasks` sounds solo and is not** - it adopts somebody
  else's suggestion onto your tasks. It goes with the rest.
- **Do not confuse this with generating tasks.** Generating sprints and tasks
  with AI is the core loop and stays.

**Done when**
Nothing imports either action, both components are gone, and the sprints page
renders without an empty suggestions region.

---

## PRJ-3 - Remove leaderboards

**Status:** done (2026-08-20)
**Serves:** 4

**Why.** Two tables and three routes whose only purpose is ranking users against
each other.

**Files**
- delete: `actions/(main)/projects/leaderboard.action.ts`
- delete: `app/(main)/projects/leaderboard/` (route + `[username]` subroute)
- delete: `app/(main)/projects/[slug]/leaderboard/`
- edit: any nav or card linking to those routes
- schema: `projectV2Leaderboards`, `projectV2GlobalLeaderboards`

**Edge cases**
- **`lib/urls.ts` exports `projectLeaderboardUrl`.** A shareable-URL helper for a
  route that will 404. Remove it and its callers.
- **Links from the projects hub and project cards** must go, or the user gets a
  404 from a button that looks fine.
- **`user-progress-sheet.tsx` and `ProjectsHubClient.tsx`** both matched the
  leaderboard grep - check whether they link to it or merely mention rank.
- **Deleting a route directory means its `loading.tsx` too.**

**Done when**
`grep -rn "leaderboard"` across `apps/main` returns nothing that resolves to a
route, and no page links to one.

---

## PRJ-4 - Remove voting and moderation from ideas and errors

**Status:** done (2026-08-20)
**Serves:** 3

**Why.** The idea catalogue and the error log both stay (see `overview.md`); the
community layer on top of them does not.

**Files**
- edit: `actions/(main)/projects/project-ideas.action.ts` - drop
  `toggleProjectUpvote`, `checkUserUpvote`, `getTopUpvotedProjects`,
  `submitProjectIdea`, `getUserSubmittedProjectIdeas`, `approveProjectIdea`,
  `rejectProjectIdea`, `submitProblemStatement`
- edit: `actions/(main)/projects/project-errors.action.ts` - drop `voteOnError`,
  `moderateError`, `getPendingErrors`
- edit: `components/projects/errors-tab.tsx`
- schema: `projectIdeaUpvotes`, `projectV2ErrorVotes`

**Edge cases**
- **`projectIdeas.upvotes` is a denormalised counter column** on a table that
  stays. With the vote table gone nothing can write it. Drop the column too
  rather than leaving a field frozen at 0 that the UI still renders.
- **Keep the READ side of ideas.** `getProjectIdeasByTechnology`,
  `getProjectIdeaById`, `searchProjectIdeas`, `incrementProjectView`,
  `getProblemStatements` are how a solo user finds a project. They stay.
- **Keep the owner's own error CRUD**: create, update, delete, get, stats.
- **`projectIdeaStatusEnum` / `projectErrorStatusEnum`** exist for the moderation
  queue. Check whether anything else reads them before dropping.
- **The ideas grid may sort by upvotes.** Re-sort by something that still exists
  or the list silently comes back in insertion order.

**Done when**
No vote or moderation action remains; the ideas browser and the owner's error log
both still work.

---

## PRJ-5 - Drop the tables

**Status:** done (2026-08-20)
**Serves:** 6
**Blocked by:** PRJ-1 .. PRJ-4

**Why.** A schema that still describes teams and invitations is a schema that
will grow code for them again.

**Tables**
`project_v2_member`, `project_v2_invitation`, `project_v2_feature_suggestion`,
`project_v2_sprint_suggestion`, `project_v2_leaderboard`,
`project_v2_global_leaderboard`, `project_idea_upvote`, `project_v2_error_vote`

**Columns** `project_idea.upvotes` only. `projects_v2.visibility` STAYS - see
PRJ-1.

**Enums** `project_v2_member_role`, `feature_suggestion_type`,
`feature_suggestion_status`, `suggestion_source`. `project_v2_visibility` stays.

**Edge cases**
- **All eight tables hold zero rows** - verified 2026-08-20. Re-verify
  immediately before generating the migration rather than trusting this line.
- **`db:generate` then `db:migrate`, never `db:push`.** Push leaves the database
  ahead of the migration chain, and the chain is how a fresh environment is
  built. Niraj confirmed this is not production, which removes the data risk, not
  the reason for keeping the chain honest.
- **Drop order.** Foreign keys mean children go before parents; drizzle-kit
  usually orders this correctly, but the generated SQL must be READ before it is
  applied, not assumed.
- **Enums are dropped separately from tables** in Postgres, and dropping one that
  a surviving column still uses fails the whole migration.
- **Report the migration contents before applying** - per `CLAUDE.md`, and doubly
  so for a migration whose entire body is `DROP`.

**Done when**
The migration is generated, read, applied, and `pg_stat_user_tables` no longer
lists any of the eight.

---

## PRJ-6 - Verify the solo loop still holds together

**Status:** done (2026-08-20)
**Serves:** 5
**Blocked by:** PRJ-5

**Steps**
1. `tsc --noEmit` in `apps/main`, `apps/uni`, `packages/db`.
2. Grep for every deleted symbol and table name; expect nothing.
3. Walk the loop in the code: project -> sprint -> task generate/delete -> quiz
   -> mock -> submission -> progress, confirming each still has its action and
   its route.

**Edge cases**
- **Drizzle `relations()` blocks are runtime, not compile-time.** A dangling
  relation to a dropped table typechecks and then throws on the first `with`
  query. Grep the relation blocks specifically.
- **A deleted route may still be linked from a `loading.tsx` skeleton** or a nav
  array, neither of which the compiler checks.

**Done when**
All three packages typecheck, no dangling references remain, and every step of
the solo loop still resolves to real code.


---

## Outcome

**Deleted** - 8 tables, 4 enums, 1 column, 1 index, and ~2,800 lines of code
across 9 files plus 3 route directories.

Actions: `team-collaboration`, `feature-suggestions`, `sprint-suggestions`,
`leaderboard`. Components: `project-settings-tab`, `feature-suggestion-sheet`,
`feature-suggestions-list`, `user-progress-sheet`, `submit-project-idea-sheet`.
Routes: `/projects/leaderboard`, `/projects/leaderboard/[username]`,
`/projects/[slug]/leaderboard`.

**Two things were nearly deleted and were not:**

- **`projects_v2.visibility`** reads like a sharing toggle and is not. Six call
  sites use `eq(projectsV2.visibility, 'PUBLIC')` to separate the platform
  catalogue from a user's own projects - browse, categories, platform stats and
  the jobs feed all depend on it. Dropping it would have emptied the project
  catalogue. The column and enum stayed; only `updateProjectVisibility` and its
  UI control went.

- **`updateProjectScore`** lived in `leaderboard.action.ts` but did two jobs: it
  wrote the user's own `user_project_v2_progress.totalScore` AND mirrored it into
  the two ranking tables. Deleting the file wholesale would have silently stopped
  every project score from updating. It was lifted into
  `actions/(main)/projects/project-score.action.ts` with the calculation, queries
  and weights unchanged and only the two leaderboard lines removed.

**Behaviour changes worth knowing before testing:**

- `/projects/[slug]/sprints` gated on project membership. It now gates on
  enrolment - you are the creator, or you have a progress row from starting it.
- The project page's "Share Your Progress" dialog is gone; the link it shared was
  the leaderboard URL.
- Error helpful/encountered counts still display but are read-only - nothing can
  vote them up any more.
- Project ideas are browse-only: no community submission, no moderation queue, no
  upvotes. The grid now sorts by views rather than upvotes, and the assistant's
  `search_project_ideas` tool sorts by build count.

---

## PRJ-7 - `/projects` is the user's own overview, not a sales page

**Status:** done (2026-08-29)
**Serves:** 7

**Why.** Niraj, 2026-08-29: *"the overview page should be about the user and what
are the things that the user have done across this all module and not
marketing."*

`ProjectsHubClient.tsx` (457 lines) is a marketing landing page rendered **inside
the authenticated app shell**: a centred hero reading *"Build Real Projects,
Master Real Skills"*, a "Stop watching tutorials" sub-headline, a four-up stat
band, a `features` array of four sales blurbs, a "Community Showcase" section,
and a closing *"Join thousands of developers"* call to action.

Every part of that is aimed at somebody deciding whether to sign up. The reader
is signed up, is paying, and came to see their own work.

**And two of the four stats are not true.** The band reads `0+ Projects Built ·
0+ Active Builders · 0+ Tasks Completed · 94% Success Rate`. The first three are
real and zero; the fourth is hardcoded, because with zero completed tasks there
is nothing to compute a rate from. A screen that shows three honest zeroes next
to one invented 94% is worse than one that shows nothing.

One of the four `features` blurbs also advertises *"Community Driven - Project
sharing, Community voting, Inspiration gallery"*. All three were **deleted in
PRJ-1 through PRJ-4**. The marketing copy outlived the features it describes.

**Files**
- `app/(main)/projects/_components/ProjectsHubClient.tsx` - rewritten
- `app/(main)/projects/page.tsx` - server-render the user's own data
- `app/(main)/projects/loading.tsx` - re-match the skeleton
- new: an action returning the signed-in user's own project state

**Steps**
1. Server-fetch the user's own state: projects in progress, next task, recent
   activity, totals that come from their own rows.
2. Rebuild the page as: what you are building now -> pick up where you left off
   -> start something new -> discovery below.
3. Delete the hero, the `features` array, the closing CTA and the stat band.
4. Re-match `loading.tsx`.

**Edge cases**
- **Zero is the normal state.** Every projects table has 0 rows today, so the
  first-run view IS the view. It must read as an invitation, not as a broken
  dashboard.
- **Do not invent a number to fill a card.** If a rate cannot be computed from
  the user's own rows, the card does not exist.
- **`getProjectsPageStats` is platform-wide**, not per-user. A hub about the user
  should not lead with counts of everyone else's work; check what still needs it
  before deleting the call.
- **The stat band is duplicated in `loading.tsx`.** A skeleton left matching the
  old layout is worse than none.

**Done when** `/projects` opens on the signed-in user's own projects, contains no
sales copy, and every number on it is computed from their rows.

---

## PRJ-8 - The generate sheet has no button to open it

**Status:** done (2026-08-29)
**Serves:** 5

**Why.** Niraj, 2026-08-29: *"I can see the button to open the sheet"* - meaning
he cannot.

`project-generate-sheet.tsx:187` is:

    {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

`trigger` is an optional prop. **Three of the four call sites pass nothing**, so
those three render a `<Sheet>` with no trigger and no external `isOpen` - a
component that mounts, renders nothing, and cannot be opened:

- `ProjectsHubClient.tsx:184` - the hub's PRIMARY hero action. The screenshot
  shows only "Browse Ideas" beside it, because the generate button is not a
  styling problem, it is absent.
- `ProjectsHubClient.tsx:450` - the closing call to action.
- `public-projects-grid.tsx:72` - the "Registry Empty" empty state, whose entire
  job is to offer the one action that fills it.

Only `ProjectIdeasClient.tsx:682` drives it properly, through `isOpen`.

**The design fault under the bug:** a component whose only purpose is to open
renders nothing when told nothing about how to open it. The optional prop should
have a default, so forgetting it produces a button rather than silence.

**Files** `components/projects/project-generate-sheet.tsx`, the three call sites.

**Steps**
1. Default the trigger to a real "Generate a project" button when neither
   `trigger` nor `isOpen` is supplied.
2. Widen the sheet - `sm:max-w-[560px]` is narrow for a two-column form.

**Edge cases**
- **Do not render a default trigger when `isOpen` is controlled.** The ideas page
  drives it externally and would get a second, stray button.
- The sheet already opens from the right (`side="right"`), which is what Niraj
  asked for. Keep it; widen only.

**Done when** every call site shows a button, and clicking it opens the sheet
from the right.

---

## PRJ-9 - The generate sheet asks too much

**Status:** done (2026-08-29)
**Serves:** 5

**Why.** Niraj, 2026-08-29: *"from the generation sheet project make sure that we
are not asking much questions."*

Two steps and, counted from the form state: title, description, generation type
(7 options), difficulty (3), technologies, learning focus, five separate stack
pickers (frontend, backend, database, deployment, AI provider), visibility, and
an assessment toggle.

The user is asking an AI to design a project **for** them. Every stack question
is one the generator is better placed to answer, and answering nine of them is
the same work as writing the brief by hand.

**Steps** Reduce to what genuinely changes the output and cannot be inferred -
what to build, and roughly how hard. Everything else becomes optional, behind a
disclosure, with a sensible default.

**Edge cases**
- **`ProjectEchoSchema` is the worker's input contract.** Fields dropped from the
  UI must still be sent with defaults, or the worker's validation rejects the
  job - the failure would land after the credit hold.
- **Cost depends on the answers**: `(visibility === 'PUBLIC' ? 13 : 25) +
  (includeAssessment ? 30 : 0)`. Hiding a field that changes the price is worse
  than asking for it. Either keep it visible or fix the default and say the price
  plainly.

**Done when** the first screen asks for what to build and nothing else, and a
project can be generated without opening the optional section.

---

## PRJ-10 - `/projects/ideas` renders a void when the catalogue is empty

**Status:** done (2026-08-29)
**Serves:** 7

**Why.** The screenshot shows the page with a "Categories" heading over an empty
rail and roughly 900px of nothing beside it.

Nothing is broken. `project_category`, `project_technology` and `project_idea`
all hold **0 rows**, and the page has no empty state - it renders the frame it
would use if there were data. A first-time visitor cannot tell that apart from a
page that failed to load, and the module's own catalogue is the thing that is
supposed to give them somewhere to start.

**Steps** Give the category rail and the results panel real empty states, and
offer the action that works with no catalogue at all: generating a project.

**Edge cases**
- **Distinguish "loading" from "empty".** They currently look identical, which is
  half of why the screen reads as broken.
- **The generate sheet is already imported here** and driven correctly. The empty
  state should open it rather than introduce a second path.

**Done when** the page with an empty database says so and offers one action.

---

## Where the module stands, 2026-08-29

Asked for directly: *"scan the whole of them as well perfectly and then complete
this and tell me where do we stand."*

### The headline

**Every one of the 24 projects tables holds 0 rows.** `project_v2`,
`project_idea`, `project_category`, `project_technology`, `user_project_v2_progress`
- all zero. The module is ~13,000 lines of implementation that has never been
run by a real user. As with KnowMe, "complete" here means the code paths exist,
not that they work.

That is also the direct cause of both screenshots Niraj sent: the hub's `0+`
counts, and the ideas page rendering a category rail over a void.

### Worker migration - the part Niraj asked about is already done

*"make sure that this big project generation process goes to the worker on do +
alarms"* - **it already does, and has for a while.**

| flow | where it runs |
|---|---|
| Project generation | `apps/worker/src/jobs/project-generation.ts` - DO + Alarm |
| Sprint generation | `apps/worker/src/jobs/sprint-generation.ts` - DO + Alarm |
| Quiz generation | `apps/worker/src/jobs/project-quiz.ts` - DO + Alarm |
| Standup voice | `apps/worker/src/jobs/standup-voice.ts` - DO + Alarm |

Project generation is in fact the reference implementation the other jobs copied,
including the two details that matter: a duplicate-run guard for alarms that
re-fire after a DO eviction, and catching rather than rethrowing so the platform
does not auto-retry into a second charge.

**Still inline, and deliberately so:**

| flow | LLM calls | why it has not moved |
|---|---|---|
| `projectassessments.action.ts` | 3 | `PRJ-W2` - blocked on whether assessments survive the narrowing at all |
| `projectv2-mock.action.ts` | 2 | `PRJ-W3` - blocked on the overlap with the standalone `mock` module |
| `task-details.action.ts` | 1 | `PRJ-W5` - "migrate on measurement, not on principle" |

The first two are **decisions**, not work. Both are listed as open questions in
`srs/core-modules/projects/00-state-of-play.md` and neither has been answered.

### Fixed today

- **PRJ-7** `/projects` is the user's own work. The hero, the four sales blurbs,
  the "Community Showcase" and the closing "Join thousands of developers" are
  gone, along with a hardcoded `94% Success Rate` that was never computed from
  anything. New `getMyProjectsOverview` reads only the signed-in user's rows.
- **PRJ-8** The generate sheet had **no button**. `{trigger && <SheetTrigger>}`
  with no fallback, and three of four call sites passed nothing - including the
  hub's primary hero action and the "Registry Empty" state whose only job was to
  offer it. It now defaults to a real button.
- **PRJ-9** Two steps and nine questions became one screen and three.
- **PRJ-10** The ideas page now says the catalogue is empty instead of rendering
  the frame it would use if it were not.

### Still open, in the order I would take them

1. **PRJ-B1 - credits are debited with no refund on failure.** `_refundCredits`
   is defined in `project.action.ts:57` and called by nothing; the underscore is
   the only thing keeping the linter quiet. This costs real money and is the
   highest-value item left in the module. `lib/credits/hold.ts` (SHARED-3) exists
   now, so the fix is routing debits through it rather than building anything.
2. **PRJ-B2 - no error boundaries.** There is no `error.tsx` anywhere under
   `app/(main)/projects`, so a thrown error in any of 12 routes replaces the
   entire app shell - sidebar and AI rail included.
3. **PRJ-B3 - the dark-mode tab strip.** `project-details-client.tsx:768`/`:779`
   apply `dark:bg-white` ungated by `data-[state=active]`, so in dark mode every
   tab is white and the active one is invisible.
4. **The two decisions** above, which unblock `PRJ-W2` and `PRJ-W3`.
5. **PRJ-B4 - 43 `catch (error: any)`**, banned by `CLAUDE.md` and actively
   producing `undefined` in user-facing messages.

### Not verified, and worth saying

The new hub and the ideas empty state were verified by server-rendered HTML and a
clean compile, not by eye: the MCP browser tab reports `visibilityState: hidden`,
which throttles React's streaming badly enough that the page never leaves its
Suspense fallback. Both need a human look.

---

## PJ-1 Projects picked from the onboarding

- [x] Status: done (2026-09-22). `scripts/practice-checks/project-picks.ts` 13/13 against the dev database and the real model: six projects, each with a title, a description, a difficulty, its tools and a reason, none repeated, no dashes, refused without the onboarding, cached second call, Pick again regenerates, one row per user.

**Why.** The projects onboarding asks what someone has built, what stopped the projects that died and how many hours they have. Nothing read it. Niraj, 2026-09-22: learn about the user "so that we can suggest the projects to them as well and they can generate that".

**Decision (Niraj, 2026-09-22).** The picks are INVENTED from the profile rather than ranked out of the catalogue: a project idea carries no tests, so an invented one is safe, and one sized to the hours someone actually has beats the nearest row in a fixed list. The curated catalogue stays, for browsing.

**What it is.** `project_recommendation` holds six projects per user. `/api/projects/recommendations` proposes them from the completed projects onboarding, caps and cleans everything the model returns, and caches; `force` re-picks. The hub shows them under "Picked for you", each with its reason, and "Build this" opens the existing generator with the title and description already filled in.

## PJ-2 The curated idea catalogue

- [x] Status: done (2026-09-22). 30 ideas seeded with `pnpm db:seed --only=project-ideas`; the table was empty before, so the ideas page had nothing to browse.

**What it is.** `packages/db/src/seed/project-ideas.ts`: 30 ideas across web, backend, realtime, devtools and CLI, easy to hard. Each names the thing, says what it does and says what the hard part will be, which is what makes it a project rather than a tutorial. Seeded as curated and approved, upserted on the title so re-running edits rather than duplicates, and left out of `--clear`.


---

## PJ-3 One page header, title left and tabs right
- [ ] Status: built (2026-09-23). Render check 13/13 plus 18/18 for practice. Practice (hub, module pages, memory) and the projects Explore page all draw it. Needs a browser to judge the spacing.

**Why.** Niraj, 2026-09-23: "put the tabs on the right and then keep the title bar on the left that will save the space ... and we can keep this page header as common". Practice spends a whole row on its tabs above the title, and projects has no shared header at all.

**Files.** New `packages/ui/src/components/ui/page-header.tsx`; `app/(main)/practice/_components/{practice-layout-wrapper,practice-tabs}.tsx`; the practice module pages; the projects pages.

**Done when.** Practice and projects draw the same header: title and subtitle on the left, tabs on the right of the same row, one height and one spacing, wrapping to two rows only when it must.

## PJ-4 /projects/explore
- [ ] Status: built (2026-09-23). Render check covers the three tabs, both browse modes, the filter controls and the empty state; `check-nav` passes with the sidebar pointing at the tabs. Needs a browser for the panes themselves.

**Why.** Four list routes, none of them obviously the one to open. Niraj, 2026-09-23: one Explore page with tabs, filters as technology-first and problem-first, dropdowns, and the state in the URL.

**Decisions (Niraj, 2026-09-23).** Tabs are Ideas, Community and Mine. Explore replaces `/projects/ideas`, `/projects/allprojects` and `/projects/myprojects`, which redirect into the matching tab. The hub at `/projects` stays as the dashboard.

**Steps.** `?tab=ideas|community|mine` picks the pane, and each pane keeps its own layout. The Ideas pane carries the technology-first and problem-first switch and the filter dropdowns, all in the URL (`mode`, `stack`, `difficulty`, `category`), so a filtered view is shareable and survives a reload. The three old routes redirect.

**Done when.** One page browses everything, every filter is in the URL, and the old links land in the right tab.

## PJ-5 The list pages scroll
- [x] Status: done (2026-09-23). `SmoothScroll` is off both list clients. It bound Lenis to the document as the root scroller while the real scroller is the shell's ScrollArea, so the wheel went nowhere.

**Why.** "All Projects page is not even scrolling." `AllProjectsClient` and `MyProjectsClient` wrap themselves in `SmoothScroll`, which binds Lenis to the document as the root scroller. In this shell the scroller is the page card's ScrollArea, so Lenis takes the wheel and nothing moves.

**Done when.** Every projects list scrolls with the wheel, the trackpad and the keyboard.

## PJ-6 Generating a project knows who you are
- [ ] Status: built (2026-09-23). The sheet lists up to three picks from the projects onboarding while the form is untouched, and filling one sets the title, description and difficulty. Needs a browser to confirm the fill.

**Why.** The onboarding asks what someone has built and how long they have, and the generate sheet ignored it.

**Decision (Niraj, 2026-09-23).** The sheet shows three suggestions from the profile; pressing one fills the title and description, which stay editable.

**Done when.** Opening the sheet with an empty form offers three suggestions, one press fills it, and a user with no onboarding sees the plain form with no empty section.

## PJ-7 Close the seven open items from the 2026-09-23 sweep
- [ ] Status: server verified (2026-09-23). `scripts/practice-checks/projects-money.ts` 25/25, twice: three sprints added at once get 1, 2, 3; a personal sprint takes a number and the creator's next one still lands; ticking a task moves the project's progress; one call returns every sprint's status; a mock session charges 30, refunds 30 when the call recorded nothing, refunds nothing on a second abandon, keeps the charge and settles the hold when it connected, and a session left two hours is swept closed and refunded. Typecheck clean in `apps/main` and `apps/worker`, `check-nav` 36/36, `check-destinations` 17/17, render checks 13/18/15/8 unaffected. The two worker changes need `apps/worker` deployed BEFORE `apps/main`, or the old worker debits while the new app also holds. The interview page's own wiring has not been through a browser.

**Why.** The sweep left seven findings open, four of them about money. Niraj chose, through AskUserQuestion on 2026-09-23: fix both worker items now and deploy when ready; refund a dropped call that recorded nothing; keep the `updateTaskStatus` that recalculates progress and delete the other; delete all three dead files.

**Decisions (Niraj, 2026-09-23).**
- A mock interview that ends with no conversation and no transcript is CANCELLED and fully refunded. One that connected keeps the charge, because the minutes were spent.
- An unfinished mock session is abandoned after **one hour** and closed by a sweep on the paths that already read the table.
- Project generation is paid for the way every other job is: a hold at dispatch, settled or refunded by the app. The worker no longer touches credits.

**What changed.**
1. `apps/worker/src/pipeline.ts` - the unguarded `credits - cost` and its ledger row are gone; `projectsworker.action.ts` passes `cost` to `startBackgroundJob`, which reserves under a SQL balance guard.
2. `apps/worker/src/jobs/project-quiz.ts` - a project that already has a quiz now throws instead of returning, so the 25-credit hold is released rather than settled.
3. `sprint-generation.action.ts` - `insertSprintWithNextNumber` recomputes `max(sprint_number) + 1` inside a five-attempt retry on the unique index, so a personal sprint or a concurrent accept no longer produces "Failed to add sprint".
4. `projectv2-mock.action.ts` - the hold is keyed on the session id and held open for the call: settled when a transcript is saved, released when nothing was recorded. `abandonProjectMockSession` and an hourly sweep close what the browser never closed; the interview page calls it on a dropped connection, a token failure, an end before connect, and unmount.
5. `tasks.action.ts` - its `updateTaskStatus` is deleted and the sprints page uses the one in `project.action.ts`, which recalculates `user_project_v2_progress`. The sprints page also reverts its optimistic tick when the action reports a failure.
6. `projectassessments.action.ts` - `getSprintCompletionStatuses(projectId)` returns every sprint's status in five queries; the sprints page made one call per sprint in series on mount.
7. Deleted, approved by Niraj: `components/projects/project-analytics.tsx`, `app/(main)/projects/_components/recent-submissions-grid.tsx`, `app/(main)/projects/ideas/_components/ProjectIdeasClient.tsx` (1,540 lines, no importers).

**Done when.** A generation with too few credits at debit time can no longer go negative; a second quiz job refunds; two sprints added at once both land; a call that drops before it connects shows the refund and leaves no IN_PROGRESS row; ticking a task on the sprints page moves the project's progress bar; the sprints page issues one completion-status call.

---

# The 2026-09-23 browser pass

Niraj went through the module in a browser and found four things, listed as
PJ-8 to PJ-11, plus the state of the pages under a project, which is PJ-12.
Decisions he took by AskUserQuestion on 2026-09-23 are recorded in the task
that depends on them. Taken in order.

## PJ-8 The idea cards say more, and the topbar stays put
- [ ] Status: built (2026-09-23). `projects-render.tsx` 30/30: the card is a column whose body takes the slack so the buttons line up, it states sprints, tasks and hours, it shows the outcome chips and both the stack and the categories, and it links to the project when a blueprint exists or offers to generate it when one does not. The header is a sticky band with its own opaque surface and its own padding. Both skeletons follow it. Needs a browser to judge the band and the card height.

**What the numbers come from.** The blueprint, through `project_idea.blueprint_project_id`, counted in SQL - not copied onto the idea. One source of truth for how long a project is: the project. Until PJ-11 seeds the blueprints, the meta row is empty and the card offers "Generate this" instead of "Build this".

**Why.** "These projects cards should have some more information and keep the
button at the bottom so that it looks consistent" and "the topbar should be
sticky as well so that it should not go with the page when scrolling". Today a
card carries a title, three lines of description and a stack line, and the
"Build this" button sits directly under whatever the description ended at - so
in a row of three cards the three buttons are at three different heights. The
header, its tabs and "New project" scroll away with the grid.

**Decision (Niraj, 2026-09-23).** The card carries, beyond the title and
description: sprints and tasks count, estimated hours, what you will learn, and
the category chips. Both browse modes read off the same card.

**Files.**
- `apps/main/app/(main)/projects/explore/_components/ideas-pane.tsx`
- `apps/main/app/(main)/projects/explore/_components/explore-shell.tsx`
- `apps/main/actions/(main)/projects/explore.action.ts` (the extra fields)
- `packages/db/src/seed/project-ideas.ts` (hours and outcomes per idea)
- `apps/main/app/(main)/projects/explore/loading.tsx` (match the taller card)

**Steps.**
1. Add `estimatedHours` and `outcomes: string[]` to `CuratedIdea` and fill them
   for every idea that survives PJ-11. Sprints and tasks come from the seeded
   blueprint, so they are counted in the query, not stored twice.
2. `getIdeas` returns `estimatedHours`, `outcomes`, `sprintCount`, `taskCount`
   and `slug` (null until PJ-11 gives the idea a blueprint).
3. The card becomes a flex column with `flex-1` on the description block and the
   button row pinned at the end, so every button in a row lines up whatever the
   title wraps to. Meta row: `4 sprints - 18 tasks - ~20 hours`. Outcome chips
   under it, at most three. Category chips beside the stack line.
4. The header moves out of the scrolling column into a `sticky top-0 z-20`
   band with an opaque surface (`bg-white/85 dark:bg-neutral-950/85
   backdrop-blur` and a bottom border), because `data-app-page` is deliberately
   transparent over the backdrop. The `px-page` padding moves onto the header
   itself so the stuck band reaches both edges.
5. Update `loading.tsx` to the new card height and the sticky band.

**Edge cases.**
- The scroller is the shell's `ScrollArea` viewport, not the window, so sticky
  is relative to it. Nothing between the header and the viewport may have
  `overflow-hidden` or a `transform` - in particular the header must be a
  sibling of the embedded list clients, not inside one of their `motion.div`
  wrappers, or the transform will contain it and it will scroll away.
- Sticky and `space-y-*` fight: the sibling margin renders above the stuck
  element. The header gets its own spacing, not the column's.
- An idea with no outcomes yet renders no chip row rather than an empty one.
- z-index in this app is already inconsistent (10, 20 and 30 are all in use for
  sticky bars). Use 20 and say so here.

**Done when.** In a browser, scrolling the ideas grid leaves the title, the
three tabs and "New project" fixed at the top with nothing showing through
them; every "Build this" in a row sits on the same line; and each card states
its sprints, tasks, hours, what you will learn and its categories.

## PJ-9 The Mine tab looks like the tabs above it
- [ ] Status: built (2026-09-23). `projects-render.tsx` 21/21: the Mine strip is the shared segmented trough, hugs its labels, carries all four filters and has no `gray` left on it. Community got the same treatment - its filter panel had `shadow-2xl` and its heading was gradient clip-text. Needs a browser for the rhythm.

**Why.** "This Mine page tabs are not looking great so remove any external
styles from this tab and use the one from tabs directly - Community, Mine is
looking so classy". `MyProjectsClient` renders `<TabsList className="">` with no
props, which gives the default card variant with `w-full` and `flex-1`
triggers: four labels stretched across the whole page. The empty state beside
it is from an older language - `shadow-2xl` on an empty card, `p-5` plus
`py-12`, `text-gray-*` instead of neutral, and a button that re-hardcodes
`bg-black dark:bg-white`. The column also runs `mb-6, mb-8, mb-8, mb-8, mb-6,
mb-8 + mt-8`, three scales and one 4rem collision.

**Files.**
- `apps/main/app/(main)/projects/myprojects/_components/MyProjectsClient.tsx`
- `apps/main/app/(main)/projects/allprojects/_components/AllProjectsClient.tsx`
  (the same header and gray palette)

**Steps.**
1. `<TabsList variant="segmented" size="sm" fit>` and drop every className on
   the list and the triggers. That is the same call the Ideas / Community / Mine
   strip makes, which is why that one reads well.
2. Replace the empty state with the dashed-border language already used on the
   ideas pane: `rounded-2xl border border-dashed p-8 text-center`, no shadow,
   neutral text, the default Button variant. Copy: say what the tab holds and
   offer the one action. The dead `/projects/generate` link goes; the sheet
   opens in place, as it does on Explore.
3. One `space-y-5` on the column, `px-page` instead of `px-6`, `py-10` gone
   (the shell supplies the page padding), and every `text-gray-*` becomes
   `text-neutral-*`.
4. The `text-4xl md:text-5xl` h1 goes: inside Explore the page header is
   already drawn above it, so the client renders no title of its own.

**Edge cases.**
- Both clients render embedded (inside Explore) and standalone. The embedded
  path must not draw a second header; the standalone path is only reached by
  the old redirect URLs.
- The tab strip drives a filter, not a panel - there is no `TabsContent` - so
  `segmented` is also the honest affordance.
- Counts in the labels (`All Projects (12)`) make the triggers wide; `fit` must
  not push the row into a wrap at 1280px with the AI rail docked.

**Done when.** The Mine tab strip is the same object as the tabs in the page
header, drawn by props alone; the empty state is the dashed panel with a
working action; and the gaps down the page come from one `space-y` value.

## PJ-10 The filter dropdowns open instead of crashing
- [ ] Status: built (2026-09-23). `scripts/practice-checks/projects-render.tsx` 17/17: three comboboxes, each labelled, each with its label in the server HTML, and a source guard that fails if `asChild` ever appears on a menu item again (comments stripped first, since the note explaining the trap quotes the broken markup). Needs a browser to confirm the menus open and filter.

**Why.** Clicking "Stack" takes the whole page to the error boundary ("This page
didn't load"). `FilterMenu` renders `<DropdownMenuCheckboxItem asChild><Link/></DropdownMenuCheckboxItem>`,
and the wrapper in `packages/ui` always renders TWO children - the check
indicator span and `children` - so Radix's `asChild` hits `React.Children.only`
and throws during render. Niraj: "it should have been the select for the
dropdown as well please, and check these issues as well for the later filters".
Difficulty and Category are the same component, so all three are broken.

**Files.**
- `apps/main/app/(main)/projects/explore/_components/ideas-pane.tsx`
- `apps/main/scripts/practice-checks/projects-render.tsx` (a case for it)

**Steps.**
1. Replace `FilterMenu` with the shared `Select` (`@repo/ui/components/ui/select`):
   trigger showing the label or the chosen value, one item per option plus an
   "Any" item.
2. A select is not a link, so navigation moves to `router.push(withParam(...))`
   in `onValueChange`. The URL stays the source of truth - this is the one place
   the `<Link>` convention cannot apply, and the comment says why.
3. Keep the "Any x" reset item and the active styling on the trigger.
4. Add a render check that all three filters render their options, so a
   `Children.only` regression fails the check rather than the page.

**Edge cases.**
- `asChild` on any Radix item that draws its own indicator is the general trap,
  not just here - grep for `DropdownMenuCheckboxItem asChild` and
  `DropdownMenuRadioItem asChild` across the repo while fixing this.
- Radix Select renders through a portal, so it is absent from server-rendered
  HTML: the render check asserts the trigger and the options list, not the open
  menu.
- The value must survive a reload from the URL, including a value with a hyphen
  (`arrays-and-hashing`).

**Done when.** Stack, Difficulty and Category each open a select, choosing one
filters the grid and puts the choice in the URL, "Any" clears it, and the error
boundary never appears.

## PJ-11 Ten curated projects that are real
- [x] Status: done (2026-09-23). `pnpm db:seed --only=project-blueprints` reports **10 projects, 40 sprints, 200 tasks, 10 ideas linked, 30 removed**, and the database agrees: 10 ideas, all 10 linked, 40 sprints, 200 tasks, no project left empty. `getIdeas` returns 10 cards, every one with a slug, its sprint and task counts, its hours and its outcomes. Typecheck clean in `apps/main` and `packages/db`; `projects-render` 30/30; `projects-money` 26/26.

**What the real data exposed.** The Ideas tab sorted by `asc(difficulty)` on a TEXT column, and alphabetically that is EASY, HARD, MEDIUM - so the hard projects sat second. Invisible across 30 near-identical rows, obvious the moment ten curated ones went in. It orders by an explicit CASE now.

**Every blueprint file** is exactly 4 sprints of 5 tasks, pure ASCII (so no dashes, smart quotes or emoji), with falsifiable criteria and hints that point rather than solve. Two hints came back referencing THIS repo (the neon-http transaction rule, and a weight change being likely "in this codebase"); a learner's project is not this codebase, so both were generalised.

**Revised after looking at what was already there (2026-09-23).** Six platform-seeded projects already existed in `packages/db/src/seed/data.ts` - good descriptions, key outcomes, hours, recruiter signal - and **all six had zero sprints and zero tasks**. They were empty shells, linked to nothing. Niraj: write the sprints and tasks for those six, add four more, keep the ten and delete the rest.

**The ten.** `realtime-collaboration-board`, `job-board-with-matching`, `observability-mini-stack`, `personal-finance-tracker`, `markdown-notes-with-search`, `offline-first-delivery-app` (the six that existed), plus `habit-tracker-weekly-review`, `url-shortener-with-analytics`, `expense-splitter` and `rate-limiter-service` (new). Three EASY, three MEDIUM, four HARD.

**How it is wired.**
- `seed/blueprints/<slug>.ts` - one file per project, 4 sprints of 5 tasks, against the `SeedSprint`/`SeedTask` types in `blueprints/types.ts`.
- `seedProjectBlueprints()` writes them after the project rows exist. It REPLACES rather than upserts, and it refuses to touch a project somebody has started: replacing the sprints under a user's feet would orphan their task statuses and reset the progress that gates their quiz and mock.
- `seedProjectIdeas()` now sets `blueprint_project_id` and `has_blueprint_generated` on each idea, which is what makes the Explore card say "Build this" and link to the project. Then it deletes every other platform-curated idea.
- `pnpm db:seed --only=project-blueprints` does the three steps on their own.

**Why.** "Build this" opens the generation sheet, which charges credits to
regenerate something the catalogue already describes. Niraj: seed the data
"for some of the projects and only keep those whose data is there properly so
that when I click on this then take me to the project details page, and then
there I can confirm for the credits before starting".

**Decisions (Niraj, 2026-09-23).**
- **Ten flagship projects, hand-authored**, and the catalogue is trimmed to
  those ten. Every card on the page leads to a real project.
- **Starting is free.** Credits are spent later, inside the project, on the
  quiz, the mock interview and generating further sprints and tasks. The
  confirm step states exactly that before you start.
- **The whole outline is visible before you start**, every sprint and task
  title listed and inert.
- **Depth: 4 sprints of 5 tasks each**, every task with a description, success
  criteria and hints. Roughly what the generator produces, written rather than
  sampled.

**Files.**
- `packages/db/src/seed/project-ideas.ts` - trimmed to the ten, with hours and
  outcomes (PJ-8)
- `packages/db/src/seed/project-blueprints.ts` - NEW: the ten projects with
  their sprints and tasks
- `packages/db/src/seed/index.ts` - a `--only=project-blueprints` entry
- `apps/main/actions/(main)/projects/explore.action.ts` - return the slug
- `apps/main/app/(main)/projects/explore/_components/ideas-pane.tsx` - the card
  links to the project instead of opening the sheet
- `apps/main/app/(main)/projects/[slug]/_components/project-details-client.tsx`
  - the start confirm and the pre-start outline

**Steps.**
1. Write the ten blueprints: for each, 3 to 5 sprints, 4 to 6 tasks per sprint,
   every task with a title, a description, success criteria and hints. Hand
   written, because the point is that these ten are good.
2. Seed a platform user to own them (`created_by` is NOT NULL and references
   `user`), mark the rows `isPlatformSeeded`, `visibility: PUBLIC`, and set
   `project_idea.blueprint_project_id` and `has_blueprint_generated` on the
   matching idea - those columns already exist for exactly this.
3. The seeder is idempotent on slug, like the ideas seeder: re-running updates
   rather than duplicating, and never touches a project a user has started.
4. Delete the twenty ideas without a blueprint from the seed file, and remove
   the rows whose `blueprint_project_id` is null when re-seeding.
5. The card's primary action becomes a `<Link>` to `/projects/<slug>`. The
   generation sheet stays on the page header's "New project", which is what it
   is for.
6. On the project page, a project you have not started shows the outline in
   full, greyed and unclickable, and one "Start building" button. The confirm
   names the sprints, the tasks and the hours, says starting is free, and says
   the quiz costs 25 and a mock interview 30 when you reach them.

**Edge cases.**
- `startProject` is creator-only and these are owned by the platform user, so
  the path for everybody else is `enrollInProject`, which charges 13 credits
  today. That contradicts "free": enrolling in a platform-seeded project must
  cost 0, and the price has to come from the server, not the two hardcoded 13s
  in the client.
- The same person pressing Start twice must end with one progress row.
- A project already started skips the confirm and shows the live board.
- Seeding runs against the dev database only, behind the existing guard.
- Ten projects with sprints and tasks is a few hundred rows: the seeder batches
  rather than inserting in a loop of single statements.

**Done when.** `pnpm db:seed --only=project-blueprints` fills ten projects with
sprints and tasks; the Ideas tab shows exactly those ten; pressing "Build this"
opens the project page; the page lists every sprint and task before you start;
Start asks once, costs nothing, and lands on a board with the tasks in it.

## PJ-12 The pages inside a project hold together
- [ ] Status: steps 1-8 built (2026-09-23), 9-11 still open. Typecheck clean, `check-nav` 36/36, `check-destinations` 17/17, `projects-render` 30/30, `projects-money` 25/25 three times.

**What the money check caught.** Racing three sprint inserts failed on the third run after passing twice: PJ-12's retry tested `String(error)`, and Drizzle wraps the driver error in a `DrizzleQueryError` whose message is "Failed query: insert into ..." - the `23505` and the words "duplicate key" are on the CAUSE. The retry was silently giving up on the one error it exists to handle. It walks the cause chain now.

**Still open here:** step 9 (the layout drift across the five routes), step 10 (three skeletons that do not match their page) and step 11 (the dead files, which need Niraj's word).

**Why.** "Make sure that the later pages inside the project details should be
smooth as well, like no UI and layout related issues". A read of the five
routes under `[slug]` found four things that are broken rather than untidy, and
a long tail of layout drift. The broken ones come first; the drift is the rest
of the list and is bounded to these five routes.

**Files.** `apps/main/app/(main)/projects/[slug]/**`, `apps/main/components/projects/**`.

**Steps, in order.**
1. **Public projects are unreachable when signed out.** `getProjectBySlug` calls
   a helper that throws for an anonymous visitor, so every shared link shows
   "Project Not Found". Read the session without throwing and apply the
   visibility gate to the result.
2. **A dead link in Quick Actions.** "Mock AI" points at `/projects/<slug>/mock`;
   the route is `aimock`. It 404s every time.
3. **An empty card.** A private project viewed by a non-creator who has not
   started falls through to `null` inside the action card, drawing an empty
   white box with no text and no button.
4. **The gates disagree by one.** The sprints board disables the quiz at
   `<= 50` and the mock at `<= 75`; the pages and the detail page allow
   `>= 50` and `>= 75`. At exactly 50 or 75 one screen says locked and the other
   says open. One helper, used by all three.
5. **The sprint rail is `hidden md:flex`,** so on a phone the board has no sprint
   list, no generate button and nothing selected - a dead "Select a Sprint"
   screen. It needs a way in below `md`.
6. **Ticking a task reloads the page.** `handleTaskUpdate` is
   `window.location.reload()` in two files. Revalidate instead.
7. **Auth redirects go to three different URLs** across these routes:
   `/auth/login`, `/auth/signin` and `/login`. At most one exists.
8. **The tasks route has no access check at all**, while the sprints route has
   one. Same check, or the route goes (it is reachable from two places and
   duplicates the sprints board's list).
9. **Layout drift.** Five routes, five hand-rolled headers, four "Back to
   project" pills and no two page paddings alike. Adopt `PageHeader` and
   `px-page`, drop `min-h-screen` + gradient roots and `max-w-4xl` inside the
   shell, and take the pink and red decoration out (quiz CTA, progress banner,
   resource type chips, "Common Mistakes").
10. **Three of the five `loading.tsx` do not match their page** - the detail
    skeleton draws 8 tab pills for a 3-tab page, the sprints skeleton draws a
    card grid for a 3-pane board. A skeleton that does not match is worse than
    none.
11. **Dead code to propose for deletion** (not deleted without Niraj's word):
    `[slug]/not-found.tsx` (unreachable, `page.tsx` short-circuits),
    `[slug]/_components/index.ts` (barrel nobody imports),
    `[slug]/_components/team-members-display.tsx` (only the barrel),
    the default export of `components/projects/task-list-progress.tsx`,
    and the unused share-dialog state and imports on the detail page.

**Edge cases.**
- The sprints board nests a `h-dvh` three-pane layout inside the shell's
  ScrollArea, giving five columns with the AI rail docked. Whatever else
  changes, that page must not scroll twice.
- `isEnrolled = true` is hardcoded on the sprints board, which makes two
  permission checks dead. Fixing it will lock people out who are currently
  getting through - that is the point, but it needs the enrol path from PJ-11
  working first.
- A started project with zero sprints renders an empty flowchart and an empty
  milestone rail; both need an empty state pointing at sprint generation.

**Done when.** A signed-out visitor can open a public project; every action on
the detail page goes somewhere real; the quiz and mock gates agree at exactly
50 and 75 percent; the board is usable on a phone; ticking a task does not
reload the page; and the five routes share one header, one padding and a
skeleton that matches.

## PJ-13 Work through the deep sweep
- [ ] Status: the security and money findings are fixed (2026-09-23); the rest is listed in `sweep-2026-09-23-module.md` with the reason each one is still open.

**Why.** Niraj asked for a scan of the module end to end before manual testing. Three passes found about 120 things. The ones that had to be fixed before anybody touches it are done; the remainder are real but each needs its own change, and several need a decision.

**Order for the rest.** Money in the edge features (task details, standups) first, because they take credits and give nothing back on failure. Then the races. Then the six inline model calls, which is a worker migration and wants its own task. Then the duplication and the cosmetics, most of which belong to `plan/ui-pass`.

**Done when.** `sweep-2026-09-23-module.md` has nothing left under "Still open".

## PJ-14 The six inline model calls move to the worker
- [x] Status: resolved 2026-09-24 by replacement, not by moving. The final quiz and mock now run on the WS-12/13 worker jobs (WS-14), and `task-details.action.ts`, `projectassessments.action.ts`, `projectv2-mock.action.ts` and `projectv2-quiz.action.ts` have NO remaining callers (grep 2026-09-24), so none of the six inline calls is reachable. Niraj approved deleting them (2026-09-24); deleted, with the two checks in `scripts/practice-checks/projects-money.ts` that exercised them. `tsc` clean.

**Why.** CLAUDE.md: anything that calls an LLM runs in `apps/worker` as a Durable Object plus Alarm, never in a server action, because a Worker request has a hard budget and a 60-second completion is killed long after the user has been charged. Six calls in this module are still inline.

**The six.**
| Where | What | Rough latency |
|---|---|---|
| `projectassessments.action.ts` | task quiz questions | 5-15s |
| `projectassessments.action.ts` | code challenge instructions | 5-15s |
| `projectassessments.action.ts` | code review | **unbounded** - the prompt embeds a user-supplied code blob |
| `task-details.action.ts` | sub-tasks, errors, related tasks | 10-25s, and it times itself |
| `projectv2-mock.action.ts` | the mock knowledge base | 10-30s, `max_tokens: 2000` |
| `projectv2-mock.action.ts` | interview feedback | 10-20s, and it runs after a voice-provider round trip in the same request |

The code review is the one that will fail first, because its input size is whatever the user pasted.

**Steps.** Five job types (the two assessment generators can share one), each with the five edits `apps/worker/README.md` lists - including the fifth, the entry-point export. Dispatch with `startBackgroundJob(type, input, { cost })`, follow with `useBackgroundJob`. Credits move to holds at dispatch, so the debits inside these actions go.

**Edge cases.**
- The assessment file charges NOTHING today. Moving it to a job means deciding a price, which is a decision for `overview.md`, not a constant.
- `task-details` and both mock calls debit before the model runs. On the hold path that inverts: reserve, run, settle or refund.
- The screens need a pending state that survives a reload, which is what `useBackgroundJob` gives them.
- A worker deploy, before the app deploy, as in PJ-7.

**Done when.** No `openai.chat.completions.create` remains under `actions/(main)/projects/`, and each of the six screens shows progress it can resume after a refresh.

## PJ-15 The 2026-09-23 browser pass, second round
- [ ] Status: items 1, 2, 5, 6 and the back affordance are done; item 3 (the project page's own UI) is next.

**Why.** Niraj went through the seeded catalogue and the project page. Six findings.

**Done.**
1. **Enrolling now LANDS somewhere.** "Start Building" closed the dialog and called `router.refresh()`, while the copy above it said "Redirecting you to the project" - the one thing it promised was the one thing it did not do. `projectSlug` was declared in the dialog's props and never destructured, so there was nothing to navigate to. It goes to the sprint board now, from the button and from the auto-advance, and the timer is cleared on unmount.
2. **One card for the catalogue.** `components/projects/catalogue-card.tsx`. The Community tab drew a different, weaker card: a tag cloud on top, the title buried under it, the author in a footer. Both tabs draw the same card now, and it takes an author line - name first, username second, "ShipItHQ" only if neither. The meta and the button share one row at the bottom.
3. **The card's text is readable.** The secondary ink was `neutral-400`, which on the near-black card measures about 4:1 - under AA for body text and hard work at 11px. `neutral-300` clears 7:1 and still reads as secondary.
4. **The toast is glass, and the green is gone.** A translucent surface with a blur behind it, and success is carried by the tick glyph rather than by emerald. Error keeps its red, because that is the one state where colour is doing work rather than decoration. Also fixed two classNames that each set two conflicting dark colours, where the later one silently won.
5. **The back pill is a quiet link**, the page frame uses `px-page`, the `min-h-screen` gradient is gone, and the header actions sit in the flow instead of `absolute`, where they overlapped the pill at narrow widths.

**Item 3, the project page - done 2026-09-23.**
- The tab strip is `segmented size="sm" fit`. It was the default card variant at full width, which stretched three labels across the page and re-drew the border, background and shadow the component already owns.
- **"Pages (0)" is gone.** The tab only renders when the project has pages; it used to open an empty grid with no empty state.
- **Every seeded project has a Setup Guide.** The tab reads `projects_v2.setup_guide` and all ten had none, so all ten said "No Setup Guide Available". It is DERIVED from the project's own `stacks` in the seeder rather than hand-written ten times, so it cannot drift from the stack the project declares: prerequisites, env vars, the commands to get it running, and how you know it worked.
- **The hero gap.** The action card stretches to the hero's height instead of leaving a column of empty page beside the stats, and the hero-to-tabs gap went from `mb-8` plus `mt-6` to `mb-6` plus `mt-4`.
- **Key Outcomes spans the row** and is hidden when there are none: it used to sit half-width with nothing beside it.
- **The balance was printed twice** in the enrolment card, three lines apart. Also two "gradients" whose stops were identical, and `shadow-xl` on a card that needs no lift.
- **The generate sheet states the price once.** A "Total cost" panel sat at the foot of the form and the pinned footer repeated it two inches below; the reassurance moved to the footer, beside the button that does the charging.

**What the re-seed proved.** It skipped `personal-finance-tracker` - "somebody has started it" - which is the guard working: you enrolled in that one while testing, and replacing its sprints would have orphaned your task statuses. Nine projects were rewritten, that one kept what it had, and the totals are still 40 sprints and 200 tasks.

**Previously still to do - item 3, the project page itself.**
- The tab strip is the default card variant at full width; it should be `segmented size="sm" fit`, like everywhere else.
- The Resources and Errors sheets use rows of filter CHIPS where a Select belongs (eleven type chips wrapping onto three lines).
- The forms inside those sheets should ask for `rounded-xl` like the generate sheet does.
- The overview body is a 2/3 + 1/3 grid whose skeleton draws 8 tab pills and a 3-column body, so it reflows on load.
- "Pages (0)" renders an empty grid with no empty state; Key Outcomes renders a titled card with an empty list when there are none.

**Done when.** The project page reads like Explore: one header, one padding, the shared tabs, selects instead of chip rows, and a skeleton that matches.

## PJ-16 The sprint board and the rest of the browser pass
- [ ] Status: items 1-9 done in code (2026-09-23); the one browser pass that verifies them is left.

**Decisions (Niraj, 2026-09-23).**
- **The input radius lives in the base components: `rounded-lg`.** Reverses UI-8's "square, each call site opts in", which put the decision in hundreds of places and left half of them looking different from the other half. One value, one file, every app. The call-site `rounded-xl` lines I had added are removed, since `rounded-xl` would now fight the base.
- **The sprint board's detail tabs become icon-only with tooltips**, and the task list gets room to breathe rather than clipping its titles.

**Done.**
- `Input`, `Textarea` and `SelectTrigger` are `rounded-lg` in `packages/ui`. That covers the generate sprint sheet, the Add Task dialog, the resource form and every other field in all five apps at once.
- **The difficulty badge is legible in dark mode.** It set `text-neutral-800` with no dark variant, so on the board's near-black card the BEGINNER label was dark grey on black. Both maps also had three identical arms, so they only looked like they varied.

- **"Enroll Now" changes after enrolling (2026-09-23).** Not caching, as first assumed: the schema names the relation `userProgress`, while `ProjectV2` and every reader use `project.progress`, so the page had never seen an enrolment. `getProjectBySlug` and `getUserProjects` rename it on the way out. The same miss meant the sprint board never loaded saved task ticks (a reload showed every task undone) and My Projects' In Progress / Completed counts were always 0; both are fixed by the same change. Verified against the dev DB: the old read gives `undefined` for the personal-finance-tracker enrolment, the new one gives `IN_PROGRESS` with 20 task statuses. Still to see in the browser.
- **Loaders no longer pulse in step (2026-09-23).** The skeletons already staggered; the culprit was `InlineLoader`, whose dot-matrix clock starts at mount, so loaders mounted together stayed in lockstep. `useCyclePhase` and `DotmSquare18` take a `delay`, and `InlineLoader` passes one: explicit if given, otherwise the next of six 0.18s steps in mount order, so a group reads as a wave. Fixed in `packages/ui`, so every app gets it. `tsc` clean in `packages/ui` and `apps/main`; still to see in the browser.
- **Resources and Errors filter on hover-opening dropdowns (2026-09-23).** `components/projects/hover-select.tsx`, used inside `ResourcesList` and `ErrorsTab`, so the project page's sheets and the sprint board's tabs both get it. Resources' eleven wrapping type chips became one dropdown with counts (the PJ-15 "selects, not chips" item); Errors' three `Select`s moved onto it. Built on a non-modal `DropdownMenu`, not `Select`: Radix Select sets `pointer-events: none` on the page while open, so a hover-opened one flickers shut. Hover is mouse-only; touch and keyboard open it normally, and clicking a menu hover already opened does not close it. `tsc` clean; still to try in the browser.
- **Task titles wrap instead of clipping (2026-09-23).** The column was already a fixed `lg:w-[400px]`; the width that grew was Radix's `display: table` wrapper inside the list's `ScrollArea`, which sized itself to the longest title, so `truncate` never engaged and the text was cut off at the column edge. The list passes `reflow` (the shared `ScrollArea` already had it for this), titles wrap to two lines with the full title on hover, and the badge row wraps. `tsc` clean; still to see in the browser.
- **The detail pane's tabs are icon-only with tooltips (2026-09-23)**, per the decision above: `segmented size="sm" fit`, one `DETAIL_TABS` list, the label as tooltip and `aria-label`. `tsc` clean; still to see in the browser.
- **The board's skeleton draws the board (2026-09-23)**, item 8, found during item 5. `sprints/loading.tsx` drew a header, a tab row and a grid of cards; it now draws the sprint rail (md+), the 56px header, the task list (400px on lg, stacked above the pane below it) and the detail pane with five icon tabs. Serves PJ-12's "a skeleton that matches" for this route. `tsc` clean; still to see in the browser.
- **The Setup Guide is one numbered path (2026-09-23)**, item 6. Four full-width cards became four steps on a connecting rail: Before you start (a two-column checklist), Environment (compact rows, only when there are variables), Install and run (one terminal block, a `$` line per command, per-line and copy-all buttons always visible), Check it works. Also fixed two legibility bugs: the commands were `text-neutral-800` on `bg-neutral-900`, and the copy buttons were `opacity-0` until hover, unreachable on touch. The terminal is dark in both themes, so its ink is constant. Checked against the seeded data (four prerequisites, three commands, two checks, no env vars). `tsc` clean; still to see in the browser.
- **The generate sprint sheet and Add Task dialog follow the generate sheet (2026-09-23)**, item 7. The sprint sheet has the icon header, a `reflow` body, a pinned footer with one action per step, and the same progress view as the project sheet, using the job's real progress. It now says it is free and that nothing is added until you review it. "Regenerate", which only went back to the description, is now "Edit description". Three identical difficulty colours are gone, and generating is Ctrl/Cmd+Enter rather than bare Enter in a multi-line field. The Add Task dialog has the same header, difficulty as three picker cards instead of a Select, optional fields marked, and a footer bar. Add is disabled until there is a title (it used to be live and silently do nothing). `tsc` clean; still to see in the browser.
- **Generate Sprint and Add Task are creator-only on the board (2026-09-23)**, item 9, found during item 7. Niraj's call: hide them rather than open personal sprints. The rail's Generate Sprint button showed to everyone while `startSprintGeneration` refuses all but the creator, so an enrolled user got an error toast; `addTaskToSprint` has the same rule. The rail button, the header's Add Task and the empty sprint's Add Task now render for the creator only, and an enrolled user's empty sprint says the creator has not added tasks yet. `tsc` clean; still to see in the browser.

**Still open.**
- One browser pass over items 1-9, as creator and as an enrolled user.


## PJ-17 The 2026-09-23 browser pass, third round
- [ ] Status: all ten steps built 2026-09-23, `tsc` clean; awaiting Niraj's browser pass. The flowchart component and `@xyflow/react` are deleted; no schema change was needed for it (it had no storage).

**Why.** Niraj's pass over the board and the project page (habit-tracker-weekly-review). The board wastes words and a whole header row, the URL forgets where you are, the project page carries a flowchart nobody needs and a milestone bar that says nothing true, and the setup guide's checkboxes do nothing.

**Files.** `sprints/_components/sprints-page-client.tsx`, `sprints/loading.tsx`, `[slug]/_components/project-details-client.tsx`, `project-assistant-buttons.tsx`, `setup-guide-tab.tsx`, `enrollment-dialog.tsx`, `components/projects/blueprintflowchart.tsx` (delete), `apps/main/package.json` (`@xyflow/react`, if nothing else uses it).

**Steps.**
1. **Rail says less.** Drop the "Sprints / N sprints available" block; the back link becomes a compact row. Sprint rows: number, title, "1w · 5 tasks". Mock rows: one line, "Mock interview", no "Sprints 1-1".
2. **Task rows say less.** Title plus one small meta line; the difficulty chip and the emoji "Quiz" chip go (every seeded task is Beginner, so the chip carried nothing).
3. **The header row goes.** Final Quiz and Final Mock move into the tab row, right-aligned, icon plus short label; below `md` the Sprints button moves into that row too.
4. **The URL holds the state.** `?sprint=`, `?task=`, `?tab=`, `?mock=`, written with `router.replace` (no scroll, no history spam) and read on load, so a refresh or a shared link lands on the same sprint, task and tab.
5. **Status buttons are legible.** The selected "To Do" pill was dark ink on a dark fill.
6. **The Blueprint section and its component go.** It has no storage (the flowchart is drawn from tasks in the browser), so there is no schema change for it. `tasksWithStatus` goes with it; `blueprintOverview` (the Overview card text) stays. Enrolment copy that promises a "blueprint" is rewritten.
7. **Milestones are the sprints.** One step per sprint with its own done/total, then the quiz and mock markers only if the project has an assessment, using `gates.ts`.
8. **Sprints sits at the top**, beside Resources and Errors, for anyone who can open the board.
9. **Setup guide checks tick.** The verification items and prerequisites become toggles, remembered per viewer in `localStorage` (a convenience, wrapped in try/catch).
10. `sprints/loading.tsx` follows the new board (no header row).

**Edge cases.** A URL naming a sprint that is locked or a task not in that sprint falls back to the first unlocked sprint. A `?mock=` for a sprint whose mock is locked is ignored. Removing the header must not strand the Add Task dialog (creator only); it moves into the task list's column header.

**Done when.** The board has no header row; a refresh on a selected task in sprint 2 with the Errors tab open comes back to exactly that; the project page has no Blueprint section and `grep -rn BlueprintFlowchart apps/main` is empty; the milestone row shows one step per sprint; a ticked setup check survives a reload.

## PJ-18 Public is a snapshot, enrolling is a copy
- [ ] Status: built 2026-09-23, `tsc` clean in main, worker and db; migrations 0022 (columns, FK, index, backfill of the 10 public projects) and 0023 (one copy per user, unique) applied to dev. Awaiting a browser pass: enrol in a curated project not yet started, confirm the copy's board, generate a sprint on it. The worker change (`published_at` stamped after the inserts) needs a worker release before the app release. Decisions in `overview.md`, "Public is a snapshot; enrolling is a copy".

**Why.** Enrolment wrote a progress row against the creator's own sprints, so every enrolee shared one set of rows: anything the owner added appeared for everyone, and an enrolee could add nothing of their own (PJ-16 item 9 hid the buttons for that reason). Niraj: a public project is the state at the moment it was published, and each enrolee works on their own copy they can extend.

**Files.** `packages/db/src/schema/projects.ts` (+ migration), `packages/db/src/seed/index.ts`, `actions/(main)/projects/project.action.ts` (`getProjectBySlug`, `enrollInProject`, new `publishProject`), `enrollment-dialog.tsx`, `project-details-client.tsx`, `sprints-page-client.tsx`, `types/project.ts`.

**Steps.**
1. Schema: `projects_v2.published_at timestamp null`, `projects_v2.forked_from_id uuid null -> projects_v2.id on delete set null`, index on `forked_from_id`. Migration backfills `published_at = created_at` for PUBLIC rows. Generate, report, migrate.
2. Everywhere a project is made public (worker generation, seed) sets `published_at`. The seed sets it AFTER re-inserting blueprints, or the curated sprints would all post-date it.
3. `getProjectBySlug`: a non-owner sees sprints and tasks with `created_at <= published_at` only.
4. `enrollInProject` forks: in one transaction, debit, insert the copy (PRIVATE, owned by the enrolee, `forked_from_id`, a unique slug), copy the snapshot's sprints, tasks, task details, quiz with questions and knowledge base, write the progress row and task statuses, bump the original's `total_started`. Returns the copy's slug; the dialog lands on the copy's board.
5. "Already enrolled" means "already has a copy of this": the original's page sends them to it.
6. `publishProject(projectId)`: owner only, not a copy, PRIVATE to PUBLIC, `published_at = now()`. A "Make public" control on the owner's page, with the one-way warning.
7. On a copy, the board's creator-only actions (Generate Sprint, Add Task) are available, because the enrolee IS the owner. The page shows "Your copy of <original>".

**Edge cases.**
- Legacy enrolments (progress rows on someone else's project, two in dev) keep working read-only; they are not migrated silently.
- The slug for a copy must be unique and stable: `<original>-<6 chars>`.
- A copy of a curated project is still free, as today.
- Two quick clicks must not make two copies: the "already has a copy" check runs inside the transaction.
- Quiz attempts, standups, resources and errors are per project, so they follow the copy with no change.

**Done when.** Enrolling in a public project creates a private copy owned by the enrolee and lands on its board; a sprint the owner adds after publishing does not appear on the public page or in a new copy; the enrolee can generate a sprint on their copy; a private project can be made public and then shows up in the catalogue.

## PJ-19 Explore: one Browse tab instead of Ideas and Community
- [x] Status: done 2026-09-24. Tabs are Browse and Mine; `getBrowse` lists every public project plus approved ideas with no project, filtered and sorted on the server from the URL (`made`, `mode`, `technology`, `difficulty`, `category`, `q`, `sort`); facets come from the real catalogue; cards say "by ShipItHQ" or the learner, and count build sprints only. Verified in the browser: default shows 10 (All 10 / ShipItHQ 10 / Community 0); `?tab=ideas` lands on Browse, `?tab=community` and `/projects/allprojects` on the community empty state, `/projects/ideas` on Browse; search "postgres" (ShipItHQ) finds 5; a Hard filter writes `difficulty=ADVANCED` and survives a reload; problem-first + most-started leads with the most started; the sidebar's Explore and Community entries point at Browse and Browse filtered. Render check 35/35. Found on the way and fixed: every Explore load had a hydration error from the header's "New project" (a server-built trigger passed into the client sheet's asChild slot) - now built client-side in `new-project-button.tsx`. `allprojects/_components/AllProjectsClient.tsx` had no users left; deleted with Niraj's approval (2026-09-24). The `/projects/allprojects` redirect stays. Also approved and done: `sonner` uninstalled from packages/ui and apps/admin (the toasts are `components/ui/toast.tsx` behind the `sonner.tsx` adapter).

**Why.** Ideas and Community showed the SAME ten projects (every approved idea links to a curated project, and every public project is curated until a learner publishes one), so the two tabs differed only in how you browsed, not what. Niraj: "this is getting into confusion".

**Files.** `app/(main)/projects/explore/page.tsx`, `_components/explore-shell.tsx`, `_components/ideas-pane.tsx` (becomes the Browse pane), `actions/(main)/projects/explore.action.ts` (`getBrowse` replaces `getIdeas`), `lib/navigation.ts` (sidebar), the links in `ProjectsHubClient.tsx`, `MyProjectsClient.tsx`, `project-picks.tsx`, `error.tsx`, the `ideas` and `allprojects` redirect pages, `scripts/practice-checks/projects-render.tsx`.

**Steps.**
1. Tabs: **Browse** and **Mine**. Old links keep working: `tab=ideas` -> Browse, `tab=community` -> Browse with `made=community`.
2. Browse lists every public project (`catalogueWhere`), server-rendered, all state in the URL: `made` (all / shipithq / community), `mode` (by stack / problem first), `technology`, `difficulty`, `category`, `q` (search), `sort` (popular / recent). Facets come from what is actually public, not a hardcoded list.
3. Approved ideas with no project yet still show, as "Generate this", when `made` is not community.
4. The card says who made it: ShipItHQ, or the learner. Sprint and task counts leave out Setup.
5. The sidebar's "Community" entry becomes Explore filtered to community; "Explore" opens Browse.

**Edge cases.** Community empty today: its empty state says how a project gets listed (Make public). A learner's COPY is private and never listed. Search is server-side, so it filters the whole catalogue, not one page.

**Done when.** `/projects/explore` shows Browse with all 10 projects; `?made=community` shows the empty state; `?tab=ideas` and `?tab=community` land on Browse (the second filtered); filters, search and sort change the URL and survive a reload; the sidebar has no separate Community tab page; `tsc` clean.
