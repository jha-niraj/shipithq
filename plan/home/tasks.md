# Home - tasks

Derived from `overview.md`.

| ID | Task | Serves | Status |
|---|---|---|---|
| HOME-1 | No blank frame between skeleton and content | 1 | done (2026-09-25) |
| HOME-2 | Action-first layout | 2, 3, 4 | done (2026-09-25) |
| HOME-3 | (see ui-pass UI-19: the contribution graph on Home) | 2 | done (2026-09-28) |
| HOME-4 | The activity graph's tooltip and day sheet, sample days | 2 | built (2026-09-28) |
| HOME-5 | The AI panel opens by default again | 9 | built (2026-09-28) |
| HOME-6 | Module summaries: one loader per module, shared with reports | 5, 7 | done (2026-09-28) |
| HOME-7 | The XP headline chart and the range switch | 6 | built (2026-09-28) |
| HOME-8 | Nine module sections, each chart plus list | 5, 6, 7, 8 | built (2026-09-28) |
| HOME-9 | No dead links: study spaces open through Pathfinder | 8 | built (2026-09-28) |

## HOME-1 - No blank frame between skeleton and content

**Status:** done (2026-09-25)

**Why.** Niraj, 2026-09-25: the skeleton shows, then "a snap and gap and then whole
screen gets blank for say 1 sec", then content. Cause: every block in
`home/_components/home-dashboard.tsx` is a framer `motion.div` with
`initial={{ opacity: 0 }}` and delays up to 0.38s. The server HTML carries
`opacity: 0` inline, so the content that replaces the skeleton is invisible until
hydration and the animation have run. The snap: `loading.tsx` wraps the skeleton in
`px-page pt-6 pb-10` while the page does not, so the layout moves when it swaps.

**Files** `home/_components/home-dashboard.tsx`, `home/loading.tsx`,
`home/_components/skeletons.tsx`, `packages/ui/src/styles/globals.css` (a
`fade-up` keyframe utility if none exists).

**Done when** a throttled (Slow 4G, 4x CPU) reload shows skeleton, then content, with
no frame where neither is visible (checked by recording), and the skeleton's first
block sits at the same y as the content's.

**Outcome.** Every framer `initial={{ opacity: 0 }}` on Home is gone (dashboard and
the activity calendar grid); entrance motion is `animate-in fade-in-0` from
`tw-animate-css` with inline `animationDelay`, which plays on first paint without
JS. `loading.tsx` and `HomeDashboardSkeleton` now use the page's exact wrapper and
blocks. **Verified** by reading the served HTML: inline `opacity:0` dropped to 2, both
from the shell's full-screen loader, none from Home content. The throttled recording
in "Done when" was not made (Niraj will check by eye).

## HOME-2 - Action-first layout

**Status:** done (2026-09-25)

Per `overview.md` 2-4. **Files** `home/page.tsx`, `home/_components/*`,
`actions/(main)/home/home.action.ts` (the "in progress" item: the most recently
touched project task or pathfinder goal). Reuse `StatBand`, `ActivityCalendar`.
**Done when** the layout matches overview 2 at 1440px and 390px, the resume card
opens the right workspace or goal, a new account sees the start card, and HOME-1
still holds.

**Outcome.** `home-dashboard.tsx` is a server component now: header with Practice /
New project, StatBand (Total XP falls back to `currentXp`, matching the profile), a
Pick-up card (in-progress projects, then active goals, then study spaces; up to
three; a Start card when there are none), four module cards with inline-SVG
sparklines (Recharts removed from Home), then the activity calendar on the same
card surface. `ContinueLearning` and the activity-mix / recent-activity blocks left
the page. Screenshot at 1568px matched overview 2. Not checked at 390px in a
browser (Niraj is testing).

## HOME-4 - The activity graph's tooltip and day sheet, and sample days

**Status:** built (2026-09-28); waiting on Niraj's look in the browser.

**Why** (Niraj, 2026-09-28): the graph showed no per-day tooltip; "add the tooltip and
let's keep the sheet if they want proper things ... let them click on that and mention
this there"; "Add some activity on some day so that I can see the ui of the sheet";
"improve the ui/layout of the sheet".

**Files** `home/_components/activity-calendar.tsx`, `activity-day-sheet.tsx`,
`actions/(main)/home/home.action.ts` (`getActivitiesByDate`),
`packages/ui/src/components/contribution-graph.tsx`,
`packages/db/src/schema/activities.ts`, `drizzle/0073_daily_activity_date_per_user.sql`,
`packages/db/src/scripts/home-activity-sample.ts`.

**Steps, as done**
1. Tooltip: one tooltip for the graph, placed over the hovered or focused day: the date,
   XP and activity count, then "Click to see the full day". (A Radix Tooltip per day
   never opened on an SVG `<g>`.) The graph's own `<title>` (a browser tooltip over the
   whole graph) became an `aria-label`; the edge fade is off by default.
2. The sheet: the date as the title, a 3-figure StatBand (XP, activities, time), then a
   timeline, oldest first, each row with its kind (Practice, Project, Mock interview...),
   time and XP. Skeleton shaped like it; empty and failed states; a practice link on an
   empty today.
3. Dates: the day travels as the graph's own `yyyy-mm-dd`. The sheet used to send
   `toISOString()` of local midnight, which in India is the day before, and the action
   re-parsed it the same way.
4. **Bug found:** `daily_activity.date` was unique on its own, so only one user in the app
   could record any given day; everyone else's insert that day failed. Migration 0073
   drops that constraint; `(user_id, date)` stays unique.
5. `pnpm script home-activity-sample`: about fifty sample days (every level, and the last
   six in a row) for Niraj's two accounts; `--remove` takes them out again.

**Done when** hovering a day shows the tooltip with the hint, clicking opens the sheet for
that same day, a sample day shows the band and timeline, and an empty day shows the empty
state, in both themes (Niraj). `tsc` clean in apps/main (done 2026-09-28).


## HOME-5 - The AI panel opens by default again

**Status:** built (2026-09-28); Niraj to confirm after a sign-out and sign-in.

**Why.** Niraj, 2026-09-28: the AI chat "is not opening when I logged in". The store
remembers `closedByUser`, and every `close()` set it, including closes the code made on
the person's behalf: the sidebar's signed-out guard (it fires on sign-out and on public
pages like /incidents), and leaving an incident case. One of those and the rail never
opened by default again.

**Files** `packages/ui/src/components/ai-chat/store.tsx`,
`apps/main/components/navigation/sidebar.tsx`,
`apps/main/components/incidents/player/case-player.tsx`.

**Steps, as done.** A `hide()` action closes without recording a choice; the two
automatic closes use it. Store version 4 clears the stored flag once, so browsers that
were caught by it open the rail again. The person's own close (the X, the sidebar
button, the Sheet) still uses `close()` and is remembered.

**Edge cases** Below 1024px the rail never opens by itself (it is a Sheet there). The
hiring and admin apps share the store factory, so their flag is cleared once too.

**Done when** signing out with the rail open, then signing in at desktop width, shows the
rail open; closing it with its X and reloading keeps it closed.

## HOME-6 - Module summaries: one loader per module, shared with reports

**Status:** not started. **Blocks** HOME-7, HOME-8, and plan/progress PRG-7.

**Why.** Each Home section and each progress report needs the same facts per module:
counts for the header, a daily series for the chart, and the latest items. Written twice
they drift; written once in `@repo/db` both the app and the worker (reports) use them.

**Files** `packages/db/src/progress/modules.ts` (new; exported as `@repo/db/progress`),
`packages/db/package.json` (the export line only).

**Steps**
1. `type Range = { from: Date; to: Date }` and `summarize<Module>(db, userId, range)`
   for: projects, practice, mock, pathfinder, incidents, jobs, aiTools, knowme, ideas.
   Each returns `{ numbers: {label, value}[], series: {date, [key]: number}[], items:
   {title, detail, href, when, score?, status?}[], total }`, series zero-filled per UTC
   day (the chart buckets weeks for 1 year).
2. Chart lines per module:

   | Module | Chart lines | List |
   |---|---|---|
   | Projects | tasks completed | projects, active first, with progress |
   | Practice | problems solved; average best score | latest sessions, difficulty, score |
   | Mock interviews | overall score per session; sessions | sessions with score, to results |
   | Pathfinder | steps completed; quiz score | goals with progress and notes count |
   | Incidents | XP earned; checks answered | cases, done or in progress; reports |
   | Jobs and rounds | round scores; rounds submitted | runs in progress, results sent |
   | AI tools | resumes and cover letters made | latest documents |
   | KnowMe | profile views; questions asked | status and latest questions |
   | Ideas | ideas posted; votes cast | my ideas with status |

3. `xpSeries(db, userId, range)`: XP per day from `xp_transaction` plus practice's
   solved problems (25/50/100 by difficulty, which bypass the ledger) and incidents.

**Edge cases** Mock score is `ai_analysis->>'overallScore'`, not `user_rating`. Hiring
attempts have no user id (join `hiring_run`). Referral requests use `student_id`.
Pathfinder sub-goals have no user id (join the goal). Studio links go through the goal
(HOME-9). No `db.transaction`.

**Done when** a script (`pnpm script home-modules --email=...`) prints every module's
numbers, series length and first items for Niraj's account without error, and the
numbers match a hand count on two modules.

## HOME-7 - The XP headline chart and the range switch

**Status:** not started. **Needs** HOME-6.

**Why.** Niraj, 2026-09-28: "we need to add more line charts". The headline chart shows
the whole picture before the modules.

**Files** `home/page.tsx`, `home/_components/xp-chart.tsx` (new, client),
`home/_components/range-switch.tsx` (new).

**Steps** A segmented switch (30 days, 90 days, 1 year) made of `<Link>`s to
`?range=30d|90d|1y`; default 90d; anything else reads as 90d. The chart: `LineChart`
with XP per day (per week at 1 year) and the previous period as a lighter line, a
tooltip, and the total and change against the previous period above it (StatBand
rules: the value never truncates, `'-'` means no data).

**Edge cases** All zero draws flat with "No XP in this period yet". The switch sits
above the charts it controls, not in the page header.

**Done when** switching range changes the URL and every chart, a reload keeps it, and a
new account sees a flat line with the message.

## HOME-8 - Nine module sections, each chart plus list

**Status:** not started. **Needs** HOME-6, HOME-7.

**Why.** Niraj, 2026-09-28: "each section for the things and modules like projects,
practice showing all the things the user have done and a button to take there".

**Files** `home/page.tsx`, `home/_components/module-section.tsx` (new),
`home/_components/sections.tsx` (new: one async server component per module),
`home/_components/skeletons.tsx`, `home/loading.tsx`.

**Steps** Below the activity graph, in order: Projects, Practice, Mock interviews,
Pathfinder, Incidents, Jobs and rounds, AI tools, KnowMe, Ideas. Each: header (icon,
title, the module's numbers inline, "Open <module>" button); body two columns from `lg`
(chart 3/5, list 2/5), stacked below; the list shows 5 items, each a link, and "See all
N" to the module's list page. Each section in its own `Suspense` with a skeleton of the
same shape; `loading.tsx` shows the same.

**Edge cases** Empty module: a flat chart, one line on how to start, the Open button.
A title too long for the list truncates with the full text in `title`. KnowMe without a
profile: "Set up KnowMe" instead of numbers.

**Done when** all nine sections render for Niraj's account at 1440px and 390px with no
horizontal scroll, every item link opens its page, and a new account sees nine honest
empty sections.

## HOME-9 - No dead links: study spaces open through Pathfinder

**Status:** not started.

**Why.** Home links study spaces to `/studio/<slug>`, which has no page (a 404). Study
spaces are a Pathfinder goal's notes.

**Files** `home/page.tsx` (pick-up items), `home/_components/continue-learning.tsx`,
`actions/(main)/home/home.action.ts`.

**Steps** Link a study space to its goal's notes (`/pathfinder/<goal slug>?tab=notes`)
through `pathfinder_sub_goal.studio_id`; a space with no goal is left out of pick-up.

**Done when** no `/studio/` href is left in apps/main (`grep -rn '"/studio' apps/main`
finds none) and a pick-up study space opens its goal's Notes tab.


## Outcomes (2026-09-28)

- **HOME-6** `packages/db/src/progress/modules.ts`: nine summaries plus XP. A script run for
  both of Niraj's accounts at 90 days and 1 year gave every module's numbers, series (90
  daily points, 53 weekly) and items without error. Two chart choices changed from the
  table above: a score line and a count line on one chart would share one axis, so the
  mock chart is score only (points where a session was scored), and Incidents is checks
  answered plus XP.
- **HOME-7, HOME-8** `home/_components/progress-sections.tsx`,
  `components/progress/{module-section,trend-chart}.tsx`: "Your progress" below the
  activity graph, the range switch (`?range=30d|1y`, default 90 days), XP over time with
  the period before dashed, then nine sections, each in its own Suspense with a matching
  skeleton; `loading.tsx` shows the same. The components render on the shared report page
  (checked on a dev server); Home itself needs a signed-in check (Niraj).
- **HOME-9** The pick-up study space opens its goal's Notes tab at that step. The
  unused `home/_components/continue-learning.tsx`, which held the last `/studio/` link,
  was deleted (approved by Niraj, 2026-09-28).

## HOME-10 - GitHub contributions on Home

**Status:** built (2026-09-28); not seen yet. On dev no account has GitHub connected, and
`GITHUB_NIRAJ_JHA_TOKEN` in `apps/main/.env` gets 401 Bad credentials from GitHub (the
existing GitHub integration fails the same way). With a failed call the card says so in
one line. **Why** (Niraj, 2026-09-28): the installed
`github-contributions` graph, for users who connected GitHub in Settings > Integrations.
**Files** `home/_components/github-activity.tsx`, `lib/github/*` (the existing integration),
`home/page.tsx`.
**Steps** Under the ShipItHQ activity card, only when GitHub is connected: the last year of
the user's GitHub contributions in the same monochrome graph, cached for a day, with a link
to their GitHub. Not connected: nothing (no nag). A failed fetch: the card says so, briefly.
**Done when** a connected account sees its GitHub year and an unconnected one sees nothing.
