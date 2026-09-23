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

