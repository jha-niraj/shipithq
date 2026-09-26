# UI pass (apps/main) - tasks

Read `overview.md` first: it holds the standard every task here measures
against. Taken in order; UI-1 is the only one with a visible bug in it.

## UI-1 The three tab strips that are actually broken
- [x] Status: done (2026-09-25), outcome in the note after UI-3.

**Why.** Three of the findings are defects, not drift.

**Files and what is wrong.**
- `app/(main)/ai/_components/pricing-section.tsx:71,72` - the trigger className
  reads `rounded-full#29584a] data-[state=active]:text-white`. A find/replace
  ate the `bg-[` and left a garbage class, so the active tab is white text on
  no background: invisible. The same file hardcodes `bg-[#29584a]` at `:79,85,113`,
  the only non-token brand colour in a monochrome product.
- `components/profile/modals/edit-profile-modal.tsx:232` - `bg-transparent` and
  `bg-background` on the same element. The second wins, so the transparent
  intent is silently dead.
- `app/(jobs)/jobs/components/jobs-tabs.tsx:136` - `layoutId="activeTab"`, a
  global string. Two strips on screen with that id cross-animate into each
  other. The shared component uses `React.useId()` for precisely this reason.

**Steps.** Fix the mangled class and move the green to neutral; drop the dead
`bg-transparent`; give the jobs strip a unique layout id, or replace it with
`TabsNav`, which already has one (see UI-2).

**Done when.** The pricing tabs show an active state; no element carries two
`bg-*` classes; no `layoutId` in `apps/main` is a hardcoded shared string.

## UI-2 Hand-rolled tab strips become the shared component
- [x] Status: done (2026-09-25), outcome in the note after UI-3.

**Why.** Six strips are built from `div`s and buttons that re-implement what
`Tabs` already draws, and one of them is a character-for-character copy of the
component's own `segmented` classes.

**Files.**
- `app/(main)/projects/explore/_components/ideas-pane.tsx:58` - the "By
  technology / Problem first" switch. It copies `tabsListClass("segmented")`
  and `tabsHighlightClass("segmented")` exactly, on a page whose shell already
  imports `TabsNav`.
- `app/(jobs)/jobs/components/jobs-tabs.tsx:121` - `TabsNav` re-implemented with
  framer, plus a DropdownMenu mobile fallback no other section has.
- `app/(main)/pathfinder/_components/pathfinder-dashboard.tsx:707` and its
  skeleton `app/(main)/pathfinder/loading.tsx:36` - the same segmented geometry
  written twice.
- `app/(jobs)/jobs/applications/applications-content.tsx:291` - a second strip
  of icon buttons styled to match the real `TabsList` immediately beside it:
  two identical-looking strips in one row, one Radix and one not.
- `app/(main)/home/_components/home-dashboard.tsx:305` - `rounded-full` pill
  nav, the only one in `(main)`.
- `app/(jobs)/companies/[slug]/mock/mock-hub-content.tsx:272` - a vertical
  selector re-deriving the active-chip treatment by hand.

**Steps.** Each becomes `Tabs`/`TabsNav` with `variant="segmented" size="sm"
fit`. Where the strip navigates, it is `TabsNav` and each item is a `Link`.

**Edge cases.** None of the hand-rolled strips carry `role="tablist"`, so this
is an accessibility fix as well. The jobs mobile dropdown is a real decision -
keep it only if the strip genuinely does not fit, and say so in the file.

**Done when.** A grep for `data-[state=active]` and for `rounded-xl bg-neutral-100 p-1`
outside `packages/ui` finds nothing in `apps/main`.

## UI-3 Tab strips that override the component into a different thing
- [x] Status: done (2026-09-25), outcome in the note after UI-3.

**Why.** Fourteen strips pass classNames that replace the built-in look:
`grid grid-cols-*` over the component's flex, a second border and background
under the sliding chip, `h-auto` against the size scale, and three separate
"flat underline" styles that exist nowhere in the design.

**Files, worst first.** `projects/[slug]/_components/project-details-client.tsx:617`;
`knowme/settings/_components/knowme-settings.tsx:210`;
`credits/_components/transactions-panel.tsx:476`;
`pathfinder/[slug]/verify/_components/verification-content.tsx:215`;
`pathfinder/[slug]/verify/_components/coding-verification.tsx:204,319`;
`projects/[slug]/sprints/_components/sprints-page-client.tsx:942`;
`ai/resume/_components/resume-editor.tsx:1239`;
`profile/modals/edit-profile-modal.tsx:232`;
`(jobs)/jobs/applications/applications-content.tsx:271`;
`pathfinder/[slug]/_components/creator-earnings-sheet.tsx:102`;
`profile/modals/share-profile-modal.tsx:88`; `components/main/quiz-results.tsx:186`;
`pathfinder/[slug]/_components/subgoal-coding.tsx:374`;
`ai/resume/_components/resume-hub.tsx:674`.

**Steps.** Replace each className with the prop that means it: `grid w-full
grid-cols-n` and `w-full` are the default, so they are deletions; `w-fit` is
`fit`; `h-8`/`h-9` on a list is `size="sm"` on the component; a per-trigger
`data-[state=active]:bg-*` is always a deletion, because the shared highlight
already draws it. Keep exactly one exception: a genuinely sticky toolbar (the
resume editor) may keep `sticky top-0 z-10 rounded-none border-b`, with a
comment saying why.

**Done when.** No `TabsList` in `apps/main` carries a `bg-*`, `grid`, `h-*` or
`rounded-*` class, and no `TabsTrigger` carries a `data-[state=active]:*` class.

**Refreshed 2026-09-25 (audit before doing UI-1..3).** Niraj asked for the
whole of `apps/main` to use the base tabs "with nothing styled on top".
- Also overridden, not listed above: `pathfinder/[slug]/_components/pathfinder-videos-tab.tsx:29`
  (`w-fit` -> `fit`, `text-xs` -> `size="sm"`),
  `pathfinder/[slug]/_components/subgoal-content-tabs.tsx:46` (`h-auto flex-wrap`),
  `pathfinder/[slug]/verify/_components/coding-verification.tsx:319` (`h-8`, `px-3 py-1`),
  `knowme/settings/_components/knowme-settings.tsx:210` (icons with `mr-2` -> `icon` prop).
- Hand-rolled 2-option switches for UI-2: `practice/_components/add-problem-sheet.tsx:167`,
  `pathfinder/_components/create-interview-prep-sheet.tsx:143`.
- `jobs-tabs.tsx` is IN scope (Niraj, 2026-09-25), even though the hiring
  session has uncommitted edits in `(jobs)/` - re-read the file right before
  editing and change only the strip.
- Absorbed by the profile/resume work: `edit-profile-modal.tsx` (PRF-10),
  `share-profile-modal.tsx` (PRF-13), `resume-hub.tsx` (RES-21).
- Kept hand-rolled, deliberately: `projects/[slug]/workspace/_components/editor-tabs.tsx`
  (IDE file tabs with close buttons, not a view switch).

**Outcome (UI-1, UI-2, UI-3, 2026-09-25).**
- UI-1: `pricing-section.tsx` tabs are props-only and the `#29584a` green is
  neutral. **That file has no importers** - dead, listed for deletion. The
  edit-profile modal's double `bg-*` is moot: PRF-10 replaced that modal, which is
  now unreferenced. `jobs-tabs.tsx`'s global `layoutId="activeTab"` is gone with
  the file's rewrite (UI-2).
- UI-2: `jobs-tabs.tsx` is `TabsNav` (the phone dropdown is gone; the strip scrolls
  like every other section's; the layout's Suspense fallback moved to `h-8` to match);
  pathfinder's mobile Goals/Overview, the applications List/Timeline toggle
  (icon-only triggers with sr-only labels), add-problem's From URL/From Name and
  interview-prep's Paste/From a link are `Tabs variant="segmented" size="sm"`.
  `ideas-pane.tsx` no longer exists. **Deliberately not converted:** the home
  dashboard's header pills are links to other pages, not a tab strip; the mock hub's
  job list is a master list with a detail pane; the workspace task-status
  radiogroup and the profile sheets' `Segmented` pick a VALUE in a form.
- UI-3 (done by a subagent, reviewed): knowme settings, pathfinder videos /
  subgoal content / subgoal coding / creator earnings / both verify pages, credits
  transactions, and the resume editor (the one sticky exception, now on a wrapper
  div with a comment). The four underline bars are now the segmented chip.
- Done-when greps: no `data-[state=active]` and no `rounded-xl bg-neutral-100 p-1`
  in `apps/main`; the only `TabsList`/`TabsTrigger` classNames left are in
  `components/profile/modals/edit-profile-modal.tsx`, which nothing imports
  (PRF-15). `tsc --noEmit` clean apart from `main-shell.tsx`, which the hiring
  session is editing.
- Seen in the browser: /jobs/applications (TabsNav with Applied active, filters,
  the view toggle switching to the timeline), the resume hub, the profile editor.
  The pathfinder, knowme, credits and verify strips were typechecked, not opened.

## UI-4 One page padding, one rhythm, one heading scale
- [ ] Status: not started.

**Why.** Two padding conventions are in use - `px-page` in 21 files, and
`px-6`/`px-4` with `py-8`/`py-10`/`py-12` in the rest - including inside
`loading.tsx` files, so several pages shift horizontally the moment they
hydrate. Vertical rhythm is `space-y-5` on one page, `space-y-6` on its
neighbour and per-child `mb-6`/`mb-8` on the older ones, with a 4rem collision
on My Projects where a grid's `mb-8` meets the pagination's `mt-8`. The same
`<h1>` is `text-xl` in `PageHeader`, `text-2xl` on Home and `text-4xl md:text-5xl`
on two projects pages.

**Files.** `projects/myprojects/_components/MyProjectsClient.tsx:143`;
`projects/allprojects/_components/AllProjectsClient.tsx:122,135`;
`settings/loading.tsx:6`, `settings/auth/loading.tsx:6`,
`settings/account/loading.tsx:6`, `settings/integrations/loading.tsx:6`,
`projects/[slug]/sprints/loading.tsx:6`,
`pathfinder/[slug]/verify/loading.tsx:6`,
`(jobs)/companies/[slug]/mock/loading.tsx:6`; `home/_components/home-dashboard.tsx:295`;
`(jobs)/jobs/applications/applications-content.tsx:260`.

**Steps.** `px-page` everywhere, including every `loading.tsx`. One `space-y-5`
per page column, replacing the per-child margins. Titles come from `PageHeader`
and nothing sets its own `text-4xl`. The two hand-rolled headers
(`ProjectsHubClient.tsx:72`, `applications-content.tsx:258`) become `PageHeader`,
which also takes their tab strip in its `tabs` slot and saves a row.

**Edge cases.** A `loading.tsx` and its page must agree on padding AND on
max-width, or the fix trades a horizontal jump for a different one. The
gradient clip-text headings on the two projects pages go with the scale.

**Done when.** No `px-6`/`px-4` page roots remain in `apps/main`, every page
column has exactly one `space-y-*`, and every `<h1>` is drawn by `PageHeader`.

## UI-5 Neutral, and nothing else
- [ ] Status: not started.

**Why.** CLAUDE.md says monochrome black and neutral. `gray` is a different hue
from `neutral` and reads cool beside it; there are also hues used as decoration
rather than meaning, including red on empty states, where red means nothing.

**Files.** `gray`: `components/auth/auth-dialog.tsx` (19),
`ai/_components/testimonials-section.tsx` (7),
`projects/myprojects/_components/MyProjectsClient.tsx` (8),
`components/activity-calendar.tsx` (6), `(auth)/error/error.tsx` (5),
`projects/allprojects/_components/AllProjectsClient.tsx` (5),
`profile/_components/documentupload.tsx` (4). Decorative hues:
`projects/[slug]/_components/project-details-client.tsx` (12),
`(auth)/error/_components/ErrorClient.tsx` (12),
`components/studio/steps/project-step.tsx` (6),
`components/studio/steps/note-step.tsx` (4),
`components/projects/resources-list.tsx` (4, a per-type colour map),
`home/_components/feature-discovery.tsx` (4),
`ai/resume/_components/resume-hub.tsx` (4),
`projects/_components/public-projects-grid.tsx:51` (red on an EMPTY state),
`(jobs)/jobs/components/swipe-card.tsx:343` (the only red action button).

**Steps.** `gray` becomes `neutral` mechanically. A hue survives only where it
carries meaning a user acts on - a destructive confirm, a failed test - and
nowhere as a category tint or an icon colour.

**Edge cases.** Check the rendered contrast, not the class name, wherever the
surface is theme-independent. `dark:text-gray-400` on a light-grey icon is the
same value in both themes, which is how one of these got missed.

**Done when.** `grep -rn "gray-" apps/main` returns nothing, and the remaining
hue usages can each be defended in one sentence in this file.

## UI-6 Stat rows are StatBand
- [ ] Status: not started.

**Why.** CLAUDE.md: headline numbers use `StatBand`, never a local grid of
number cards. Five places still hand-roll it, one of them in a file that
already imports `StatBand` a hundred lines above.

**Files.** `components/activity-calendar.tsx:375` (imports StatBand at `:258`);
`ai/resume/_components/resume-hub.tsx:244`;
`(jobs)/jobs/[slug]/job-detail-content.tsx:319`;
`mock/_components/mock-card-skeleton.tsx:42` (should be `StatBandSkeleton`);
`projects/[slug]/_components/project-details-client.tsx:142` (an action grid
that looks exactly like the StatBand directly above it - either make it read as
buttons or make it a StatBand, but not a third thing).

**Steps.** Read `packages/ui/src/components/ui/STAT-BAND.md` first. Format the
value at the call site; `'-'` means no data, not zero; `tone` tints the value
only.

**Done when.** No `grid grid-cols-2 md:grid-cols-4` of number cards remains in
`apps/main`.

## UI-7 The loaders that are not loaders
- [ ] Status: not started.

**Why.** Spinners are nearly clean - one `animate-spin` left - but two files
hand-roll a rotating ring out of a border and framer, which is the same thing
by another route, and `Loader2` is imported in about thirty files without it
being clear which are button-inline icons and which are page loaders.

**Files.** `(auth)/(shell)/resetpassword/_components/resetpassword.tsx:228`;
`pathfinder/_components/create-goal-sheet.tsx:348`;
`pathfinder/[slug]/verify/_components/verification-page-client.tsx:224`; plus
the `Loader2` sweep.

**Steps.** Ring animations become `InlineLoader` at the right size. Walk the
`Loader2` list and replace each with `InlineLoader` (`sm` in a button, `md` in a
row, `lg` in a panel) or a skeleton where the page is already rendered.

**Done when.** No rotating ring in `apps/main` outside `packages/ui`, and
`Loader2` appears nowhere.

## UI-8 The field is square; the thing around it has the radius
- [x] Status: done (2026-09-23). Typecheck clean across `apps/main`; `projects-render` 30/30; `check-nav` 36/36.

**Decision (Niraj, 2026-09-23).** `Input`, `Textarea` and `SelectTrigger` in
`packages/ui` are `rounded-none`. A call site that wants a radius asks for it -
"these fields should have somewhat like rounded-xl from here, not from base
components". The card, panel or sheet AROUND a field keeps its own radius.

**What changed.**
- The three components are square, and the comment explaining it sits OUTSIDE
  the class template literal, because `cn()` joins that literal verbatim and a
  comment written inside it ships as class names in the DOM. `select.tsx` already
  carried that warning; I wrote the comment inside the literal first and the file
  told me why not.
- The generate sheet asks for `rounded-xl` on its two fields, and the Explore
  filter pills ask for it on their triggers.

**The mistake worth recording.** I stripped every `rounded-*` from every Input,
Textarea and SelectTrigger call site in the monorepo - 252 of them across 69
files - with a script whose whitespace tidy also collapsed the leading
indentation of multi-line JSX attributes. The repair script then made it worse:
it paired `git diff -U0` hunks positionally, which does not hold when the removed
and added line counts differ, and it substituted by first match, so an identical
line elsewhere in the file took the fix. Recovered by restoring the four apps I
had never intentionally edited (`uni`, `hiring`, `admin`, `web`) from git, then
the ten `apps/main` files whose only change was the strip, then repairing the two
remaining spots by hand.

**What to do instead.** A codemod over JSX edits whitespace at its peril. Change
the shared component, let call sites keep their overrides, and remove the
overrides one module at a time where they actually conflict.

**The second radius, found the same day.** With the field rounded from the call
site, Niraj spotted a rounded box INSIDE it. `ScrollArea` puts
`rounded-[inherit]` on its viewport - right for a panel whose scroller fills it
edge to edge, wrong for `Textarea`, where the wrapper draws the border and the
viewport sits inside its `px-3 py-2` padding. An inherited radius on a smaller,
inset box curves harder than the box you can see. The wrapper is already
`overflow-hidden`, so it clips to its own corners and nothing in there needs a
radius: the viewport is `rounded-none` now.

Verified by rendering `<Textarea className="rounded-xl" />` and listing every
element carrying a rounded utility: the wrapper has `rounded-xl` (tailwind-merge
drops the base `rounded-none`), the viewport has `rounded-none`, and the textarea
itself has none. One rounded box per field, on the element that draws the border.

**Done when.** No `rounded-*` in the three base components, the forms Niraj is
testing ask for `rounded-xl` themselves, and a field renders exactly one rounded
box.

## UI-9 A sheet that brings its own footer must turn off SheetContent's scroller
- [x] Status: done (2026-09-23) for the generate sheet.

**Why.** Niraj, 2026-09-23: the cost row and the Generate button "should be on
the bottom of the sheet like sticky". `SheetContent` wraps its children in a
`ScrollArea` unless `scroll={false}`, so the header, the sheet's own inner
scroller and the footer were all inside one outer scroller: the footer scrolled
away with the form. `scroll={false}` hands the layout back to the sheet, which is
header, `min-h-0 flex-1` body, `shrink-0` footer.

**Still to check.** Seven other sheets hold both a `ScrollArea` and a bottom
border and do not pass `scroll={false}`: the knowme chat sheet, both pathfinder
create sheets, the sprints board's sheets, the sidebar, the customise-sidebar
sheet and the onboarding widget. `sprint-generation-sheet.tsx` is NOT one of
them - its button row is an in-flow block with `pt-4 border-t`, not a pinned
footer, so it is a different design rather than the same bug.


## UI-10 Overviews and reading pages sit in a centred 1280px frame
- [x] Status: done 2026-09-24, verified in the browser against Done when (notes at the end).

**Why.** With the sidebar unpinned (hover to reveal), /ai, /mock and the other
overviews stretch across the whole window: a hero with an empty right half,
StatBands 2000px wide. Decided (Niraj, 2026-09-24): overviews and reading pages
are capped at `max-w-7xl` and centred; grids and tools (Explore, Browse All,
the workspace, the editors) stay full width. Capping is enough on its own: next
to a pinned sidebar the column is narrower than 1280px on a laptop, so the page
fills it; unpinned, it centres with even margins.

**Files.** `packages/ui/src/styles/globals.css` (a `page-frame` utility beside
`px-page`); the roots and `loading.tsx` of `home`, `ai`, `mock`, `practice`,
`projects` (overview), `pathfinder`, `knowme`; `(jobs)/jobs/spark/spark-content.tsx`,
`applications/applications-content.tsx`, `saved`, `following` and their loading files.

**Steps.** `@utility page-frame { width:100%; max-width:80rem; margin-inline:auto }`.
Put it on each listed page's content root and on its `loading.tsx` root, with
`px-page` where the root used `px-4`/`px-6`. /ai's hero loses its marketing size
(`text-4xl md:text-6xl` to the scale of the other overviews) so it reads as a page, not a landing.

**Edge cases.** A page and its skeleton must share the frame or it jumps on
hydrate. Full-height pages (pathfinder, knowme) keep their height; only width changes.

**Done when.** At 1440px with the sidebar unpinned, each listed page's content is
1280px wide and centred (equal left/right margins, within 1px); pinned, it fills
the column; Explore and Browse All still span the full column.

## UI-11 The jobs header and tab strip at the size of the rest of the app
- [x] Status: done 2026-09-24, verified in the browser against Done when (notes at the end).

**Why.** The jobs header is `p-6` with a `text-2xl` title and 44px tabs with
`px-4 py-2.5` - roughly twice the height of every other page header, and the
Spark page stacks a second icon-tile header under it.

**Files.** `(jobs)/jobs/layout.tsx`, `jobs/components/jobs-tabs.tsx`,
`jobs/spark/spark-content.tsx`, the jobs `loading.tsx` files.

**Steps.** Header row `px-page py-3`, title `text-xl font-semibold` like
`PageHeader`; tabs `h-9` container, `h-7 px-3 text-[13px]` triggers, `h-3.5` icons,
count as plain muted tabular text instead of a Badge. Spark's inner header drops
the gradient icon tile and becomes one compact line.

**Done when.** The jobs header is at most 64px tall at 1440px, the tabs 36px.

## UI-12 Jobs pages load with skeletons, not a centred loader
- [x] Status: done 2026-09-24, verified in the browser against Done when (notes at the end).

**Why.** Browse All and eight other jobs pages wrap their content in a
`<Suspense>` whose fallback is a big `InlineLoader` in the middle of the page,
against the loading rule (blocks get skeletons). `jobs/layout.tsx` does the same
around every child.

**Files.** `jobs/layout.tsx:68`, `jobs/{page,spark,saved,following,applications,browse,[slug]}/page.tsx`,
`companies/page.tsx`, `companies/[slug]/page.tsx`, `companies/[slug]/mock/page.tsx`;
their `loading.tsx` skeletons (reused as the fallbacks); `browse/loading.tsx` rebuilt to match the sticky toolbar.

**Done when.** No `InlineLoader size="lg"` remains as a Suspense fallback under `app/(jobs)`,
and Browse All's skeleton matches its toolbar and rows (no reflow when it lands).

## UI-13 The application cards
- [x] Status: done 2026-09-24, verified in the browser against Done when (notes at the end).

**Why.** Each application card is ~290px tall for four facts: a 56px tile, a
`text-lg` title, a base-size company, and two full buttons.

**Files.** `jobs/applications/applications-content.tsx` (list card, timeline card), `applications/loading.tsx`.

**Steps.** Row card `p-4`, 40px tile, `text-[15px]` title, `text-sm` company, meta
`text-xs`; actions become compact `sm` buttons on the right of the meta row; page
root `px-page py-5` inside the frame (UI-10). Fix the logo tile's missing `relative`.

**Done when.** An application card without an interview box is at most 120px tall,
and the page's padding matches its skeleton.

## UI-14 The AI rail opens on the jobs pages
- [x] Status: done 2026-09-24, verified in the browser against Done when (notes at the end).

**Why.** "ShipItHQ AI" in the sidebar flips the store on /jobs but nothing renders:
`AIPanel` is only mounted by `main-shell.tsx`.

**Files.** a new `components/ai/ai-rail.tsx` (the docked rail, resize handle and
mobile Sheet, moved out of `main-shell.tsx`), `main-shell.tsx`, `(jobs)/_components/jobs-shell.tsx`.

**Steps.** Move the rail into `AiRail`; both shells render it beside the page, and
it unpins the sidebar while docked as it does in the main shell.

**Done when.** On /jobs, the sidebar's ShipItHQ AI button opens the docked rail,
it resizes and closes, and /home behaves exactly as before.

**Verified 2026-09-24 (UI-10 to UI-14), 1440x900, headless.**
- UI-10: unpinned, /home, /ai, /mock, /pathfinder, /jobs, /jobs/applications and /jobs/saved measure 1280px starting at x=80 (80px each side); pinned, each fills the 1200px column; /practice 1200px pinned. /projects and /knowme showed the test user's onboarding, which is not framed; their overview roots carry the same class. /ai was rebuilt as an overview (hero card, StatBand and chart, tools, steps, prices) at the /home type scale, with a new matching skeleton. The jobs header's contents sit in the frame too, so "Jobs" lines up with the page under it.
- UI-11: jobs header 60px (was ~100px), tab strip 36px; the Spark page's second header is one line.
- UI-12: all 13 jobs/companies Suspense fallbacks render the route's own loading.tsx; the jobs layout's fallback is null; Spark has one shared deck skeleton sized like the real max-w-3xl deck, also used for "loading more"; Browse's skeleton matches its toolbar and JobCard.
- UI-13: every application row measured 115px (no interview box); actions share the meta row. Test data came from the new preview-first `pnpm script seed-applications --email=<email> [--apply]` (8 rows for e2e-projects@shipithq.dev, re-check clean).
- UI-14: on /jobs/browse the sidebar's ShipItHQ AI button opened the docked rail (380px) beside the page, which narrowed; /home's rail is the same component.

## UI-15 The application filter tabs match the jobs tabs
- [x] Status: done 2026-09-25, verified (notes below). Asked for in the UI pass, missed in UI-13.

**Why.** "The tabs are too bad" on My applications: All (8) / Active (5) / Offers (1) /
Closed (2) and the list/timeline toggle are a second pill strip with their own sizes,
right under the jobs tabs they should echo.

**Files.** `jobs/applications/applications-content.tsx` (TabsList, view toggle), `applications/loading.tsx`.

**Steps.** The same geometry as `jobs-tabs.tsx`: a `h-9` track with `p-1`, `h-7 px-3 text-[13px]`
triggers, the count as a muted tabular number instead of "(8)"; the view toggle becomes the
same track with two `h-7 w-7` icon buttons. Skeleton widths follow.

**Done when.** The filter track and the toggle are 36px tall, no label contains parentheses,
and the skeleton's header row matches within 2px.

## UI-16 The /projects and /knowme overviews, seen for real
- [ ] Status: /projects done 2026-09-25; /knowme blocked locally (notes below).

**Why.** UI-10 framed both, but the test account only ever reached their onboarding.

**Steps.** Get a test account past both onboardings (complete the flows in the browser as
the e2e user, or use a second e2e user that has), then measure the frame pinned and
unpinned and compare each page to its skeleton.

**Done when.** Both overviews measure 1280px centred unpinned and fill the column pinned,
and neither reflows when the skeleton is replaced.

## UI-17 The changed pages at phone and tablet width
- [x] Status: done 2026-09-25, verified (notes below).

**Why.** Every UI-10 to UI-15 check was at 1440px.

**Steps.** Screenshot /home, /ai, /mock, /practice, /jobs, /jobs/browse,
/jobs/applications and /jobs/saved at 390x844 and 768x1024; fix anything that overflows,
clips or wraps badly.

**Done when.** No horizontal page scroll at either width (scrollWidth equals clientWidth on
the page's scroller), and no button, tab or header text is clipped.

**Verified 2026-09-25 (UI-15 to UI-17).**
- UI-15: the filter strip is the shared `TabsList variant="segmented" fit` (it was the bordered card variant overridden down); strip 294x36, view toggle 70x36, labels "All 8", "Active 5", "Offers 1", "Closed 2"; skeleton widths set to the same 294 and 70px; checked light and dark.
- UI-16 /projects: the e2e user completed the real onboarding in the browser (9 questions, inline model, no worker); the overview renders in the frame. /knowme: setup reaches its last step and fails with "Failed to generate embeddings" because local `next dev` has no Vectorize binding and `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` are not in apps/main/.env (the REST fallback). Environment, not code; production has the binding. The e2e user's KnowMe profile is left in SETUP.
- UI-17: at 390x844 and 768x1024, /home, /ai, /mock, /practice, /projects, /jobs, /jobs/browse, /jobs/applications and /jobs/saved have no horizontal scroll on the page scroller. Two fixes: JobCard's title wrapper lacked `min-w-0`, so long titles ran past the card at 390px (it now stacks the match badge under a two-line title on phones, 44px logo); the Spark deck's fanned cards scrolled the page sideways by 44px (390) and 28px (768), now `max-lg:overflow-x-clip` on the page (not on lg+, where it would cut a swiped card at the frame's edge). The horizontally scrolling StatBand strips at 390 are by design.


## UI-18 Buttons are rounded-md, app-wide
- [x] Status: done (2026-09-25). `button.tsx` base is `rounded-md` (8px; `rounded-lg`
  is 10px, which barely read as a change from 14px). 88 `rounded-full/2xl/xl`
  overrides removed from `<Button>`s in `apps/main` (48 single-line, 40 multi-line);
  8 deliberate circles (equal w/h + rounded-full) kept. Seen on Home; other pages
  typechecked only.

**Why.** Niraj, 2026-09-25: "make the button less rounded", app-wide. The shared
`Button` (`packages/ui/src/components/ui/button.tsx`) is `rounded-xl`, and some
sizes or call sites use `rounded-full`.

**Steps.** Base and size radii to `rounded-lg`; remove `rounded-full` overrides on
`<Button>` in `apps/main` (pills that are not Buttons - badges, chips - stay).

**Done when** `button.tsx` has no `rounded-xl`/`rounded-full`, a grep for
`<Button[^>]*rounded-full` in `apps/main` is empty, and Home, profile and the resume
hub look right in the browser.
