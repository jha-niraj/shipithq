# Jobs, scrolling and seed data - tasks

| ID | Task | Serves | Status |
|---|---|---|---|
| JB-1 | ScrollArea in the generate sheet, then sweep the rest | 1 | done (2026-08-29) |
| JB-2 | Jobs is one nav item, not seven | 2 | done (2026-08-29) |
| JB-3 | Jobs header and tabs share a row; unblock the counts | 3 | done (2026-08-29) |
| JB-4 | My Applications: header row, compact tabs | 3 | done (2026-08-29) |
| JB-5 | Seed companies, jobs, projects and applications | 4, 5 | done (2026-08-29) |
| JB-6 | Pathfinder explore panel: resizable, wider | 6 | done (2026-08-29) |
| JB-7 | /mock overview still reads dead | - | done (2026-08-29) |
| JB-8 | One sidebar, two sets of links | 2 | done (2026-08-29) |
| JB-9 | Browse: pinned controls, one row, no card overlap | 3 | done (2026-08-29) |
| JB-10 | Swipe card: bigger, and the buttons animate | - | done (2026-08-29) |
| JB-11 | Job detail: opaque header, wider, sticky column | 3 | done (2026-08-29) |
| JB-12 | The jobs shell never adapted to the shared sidebar | 2 | done (2026-08-29) |
| JB-13 | Browse: pinned count bar; Spark: no modal, bigger, slower | 3 | done (2026-08-29) |
| JB-14 | The browse control bar should not stick | 3 | done (2026-08-29) |
| JB-15 | Swipe card: taller, more information, slower throw | - | done (2026-08-29) |
| JB-16 | Deck: centred, fanned, and slower again | - | done (2026-08-29) |
| JB-17 | Pin the browse toolbar properly, and lift the deck | 3 | done (2026-08-29) |
| JB-18 | Spark becomes a stepped job panel, not a swipe deck | 3 | code done (2026-09-25); browser pass is Niraj's |
| JB-19 | Spark remembers skips for 30 days | 3 | code done (2026-09-25); waiting on migration 0040 |

---

## JB-1 - ScrollArea everywhere on the Y axis

**Status:** done (2026-08-29)

**Files:** 59 occurrences of `overflow-y-auto` / `overflow-auto` across ~40 files.
The reported one is `components/projects/project-generate-sheet.tsx`.

**Edge cases**
- **`overflow-x-auto` stays.** A wide table or code block should keep its width
  and scroll sideways in its own box; that is `orientation="both"`, and sweeping
  it would break `docs/responsiveness.md` section 2.
- **A ScrollArea root must never carry `max-h`.** The Radix viewport is `h-full`,
  which against an auto-height parent resolves to `auto` and CLIPS rather than
  scrolls. Height caps go on `viewportClassName`.
- **`min-h-0 flex-1`, not `h-full`, inside a flex column.** A flex child defaults
  to `min-height: auto` and refuses to shrink below its content, so the composer
  under it gets pushed off screen instead of the list scrolling.
- **`reflow` where a grid is inside.** Radix's content box is `display: table`
  and shrink-to-fits, so a grid keeps its own width and the viewport clips it.
- Some `overflow-auto` are on elements that never scroll (a wrapper with no
  height cap). Those are noise, not scrollers - delete the class rather than
  wrapping them in a ScrollArea that does nothing.

**Done when** `grep -rn "overflow-y-auto\|overflow-auto"` over `app` and
`components` returns nothing, and every converted surface still scrolls.

---

## JB-2 - Jobs is one nav item, not seven

**Status:** done (2026-08-29)

**Why.** `app/(jobs)/layout.tsx` mounts `JobsSidebar`, so entering the module
replaces the sidebar wholesale. The seven children in `lib/navigation.ts` are the
same seven items the jobs sidebar shows, and `app/(jobs)/jobs/layout.tsx` renders
them a third time as tabs.

**Edge case.** The comment above the Jobs entry records that the children were
ADDED deliberately, because "Jobs had SIX real sub-pages and no children at all,
so every one of them was reachable only from inside the module's own page
chrome". That reasoning was right when the jobs shell had no sidebar of its own.
Update the comment rather than silently reversing it, or the next reader
re-adds them.

`pnpm check-nav` counts paths, so the expected total drops from 36.

---

## JB-3 - Jobs header and tabs on one row

**Status:** done (2026-08-29)

**Why.** Two stacked rows spend ~140px before any job is visible, and the tabs
are a filter on one surface rather than five destinations.

**And unblock the counts.** `app/(jobs)/jobs/layout.tsx` awaits
`getJobsTabCounts()` before rendering anything. A layout renders before its
children, so every tab waits on a five-count aggregate for the other four. Wrap
the counts in their own `<Suspense>` and let the page paint first. See the
decision in `overview.md` for why the routes stay.

---

## JB-4 - My Applications: header row, compact tabs

**Why.** The page stacks a back arrow, an icon, a 3xl title, a subtitle, four
stat tiles and a full-width four-tab strip before the first application. With
zero applications that is five rows of chrome over an empty state.

Tabs move up beside the title, small. The stat tiles stay - they are real counts
of the user's own rows - but they stop being four full-width cards.

---

## JB-5 - Seed companies, jobs, projects and applications

**Why.** Every UI judgement so far has been made against zero rows.

**Edge cases**
- **Idempotent.** Re-running must not duplicate. Key on a stable slug and upsert.
- **Never touch real user rows.** Seeded records are marked so they can be
  removed again, and the script refuses to run against a production URL.
- **Jobs belong to companies.** A job with a dangling `companyId` renders "at
  undefined", which is the specific thing being fixed.
- **Public projects need `visibility: 'PUBLIC'`** or the catalogue stays empty -
  that column is what separates the catalogue from a user's own projects
  (PRJ-1).
- Applications are per-user, so they seed against the signed-in developer
  account only, and only on request.

---

## JB-6 - Pathfinder explore panel: resizable, wider

The right-hand topic panel is fixed-width and narrow enough that the description
wraps every three words. Make it a real resizable column with a wider default,
persisted per user.

---

## JB-7 - /mock overview still reads dead

Niraj, on the mock screenshot: *"Not done yet please complete this as well."*

The page is honest - `mock_voice_session` has no rows - but the whole screen is
one dashed box in the middle of a large empty area. It needs the same treatment
the other overviews got: the stat row and the activity chart present even at
zero, so the page has shape.

---

## JB-1 outcome

**The root cause was one class in the primitive.** `sheetVariants` in
`packages/ui/src/components/ui/sheet.tsx` carried `overflow-y-auto` in its BASE
string, so all 37 sheets in the product scrolled natively whether they asked to
or not - and the fifteen call sites that also wrote `overflow-y-auto` themselves
were repeating what they already had. Fixing the base fixed them all at once.

`SheetContent` now takes `scroll`, defaulting to true. Eight sheets that build
their own flex column - pinned header, scrolling middle, pinned footer - pass
`scroll={false}` and keep their own. `DialogContent` got the same prop but
defaults to FALSE, because Dialog's base never had the class: only two call sites
scrolled at all, and flipping the other ~30 from `grid gap-4` to a flex column
would change layouts nobody asked about.

**Two bugs the sweep created and caught**

- **A dropped `ref`.** `practice-workspace.tsx` auto-scrolled its mentor chat via
  `scrollRef.current.scrollTop`. Converting the div moved the ref to the
  ScrollArea ROOT, which does not scroll - the Radix viewport inside it does. It
  failed silently, which is the worst way for it to fail. The effect now queries
  `[data-radix-scroll-area-viewport]`.
- **Five false scrollers.** `app/(main)/practice/*/page.tsx` each had
  `flex-1 overflow-auto` on a BLOCK child of a non-flex parent: `flex-1` did
  nothing and `overflow-auto` never fired without a height cap. They were deleted
  rather than converted - wrapping them in a ScrollArea would have added a third
  nested scroller under the wrapper's `<main>` and the shell's own.

**`overflow-x-auto` was deliberately left alone** - 20 occurrences on tables and
code blocks, which SHOULD keep their width and scroll sideways in their own box.

---

## JB-3 outcome

`/jobs` 842ms, `/jobs/applications` 404ms, `/jobs/browse` 360ms after the change.
The tab counts no longer block the tree.

---

## JB-5 outcome - the seed is written AND run

`packages/db/src/seed/{data,index}.ts`, wired as `pnpm db:seed` from
`packages/db`. Run against the dev database on 2026-08-29:

    companies      6
    company members 6
    jobs          12
    projects       6
    applications   8   (jhaniraj45@gmail.com)

**Five NOT NULL constraints and one enum found this the hard way**, each only
visible by running it:

1. **`job.posted_by_id` is NOT NULL** - a job must be posted by somebody.
2. **And it references `company_member`, not `user`.** That is the right model, a
   job is posted by somebody acting FOR a company, and it means every seeded
   company needs a member row before any of its jobs can exist. Hence the
   `company_member` step nobody planned for.
3. **`projects_v2.created_by` is NOT NULL**, so the owner has to be resolved
   before either jobs or projects, not after.
4. **The `role` enum is title-case** - `Student | Admin | HR | UNI` - while every
   other enum in this schema is SCREAMING_CASE. `"ADMIN"` is rejected outright.
5. **`assistantEcho` / `assistantRaw` are NOT NULL** on projects and normally
   hold the generator's input and reply. Seeded rows record
   `{ source: "seed" }` rather than pretending to be model output.

**The production guard fired on the first run**, which is the behaviour it was
written for: `DATABASE_URL` points at a Neon host with no `dev`/`staging` in the
name, and the check fails CLOSED. Overridden deliberately with
`SEED_I_KNOW_WHAT_I_AM_DOING=1` because Niraj asked for this database to be
seeded.

Re-running updates rather than duplicating (every row keyed on a slug,
`onConflictDoUpdate`; applications check-then-update, since there is no unique
constraint on `(jobId, userId)` to conflict against). `--clear` removes exactly
these rows and never truncates a table.

---

## JB-4 outcome, and the icon bug behind it

**The invisible icon was a colour in a DATA ARRAY.** `jobs-tabs.tsx` gave every
tab `color: "text-neutral-900"` with no `dark:` pair, applied to the icon ONLY
when active. In dark mode the active tab's icon became near-black on a
`neutral-800` pill and vanished, while its label stayed white - the label
inherits the link's colour, which IS paired. That is the screenshot exactly:
"Saved" readable, its bookmark gone.

Same defect as the pathfinder stat tiles, and it survives contrast sweeps for the
same reason: a sweep greps `className=`, and this colour was never in one. The
field is deleted; the icon inherits from the link, which already handles active,
inactive, light and dark.

**Two more found while fixing the header**

- **`TabsTrigger` forced `flex-1`**, which is why the four status tabs stretched
  across the full width no matter what the call site asked for. `cn` uses
  `twMerge`, so `flex-none` at the call site wins - the primitive's default is
  left alone for the strips that do want to stretch.
- **The UI primitives used `gray-`, not `neutral-`**, against a palette
  `CLAUDE.md` says is monochrome neutral. 41 occurrences across 8 files - tabs,
  sheet, select, input, textarea, accordion, dropdown-menu, empty-state - all
  swapped on the same numeric scale.

**The two header buttons were never broken.** They swap the list for a dated
timeline. With zero applications both views rendered the same empty state, so
there was nothing to tell them apart, and neither carried a label. They now have
`aria-label`, `title` and `aria-pressed` - and eight applications to show.

Verified on the rendered page: `My applications 8 total · All (8) · Active (5) ·
Offers (1) · Closed (2)`, with all six seeded companies present.

---

## JB-6 outcome - the panel, and what the data actually said

**Resizable.** The topic panel was a fixed `max-w-[360px]` aside, which wrapped a
real description every three or four words and gave the reader no way to change
it. It is now a `react-resizable-panels` split: 34% by default (roughly 460px on
a 1512px screen with the app sidebar collapsed), draggable between 24% and 55%,
with a 1px handle carrying a 9px transparent hit area either side - a 1px drag
target is not a target.

**v4's API is not v3's.** `orientation` rather than `direction`, sizes as
percentage STRINGS (`"34%"`), and no `order` prop. The practice workspace already
uses the v4 shape; the compiler caught the mismatch on the first pass.

**On "create the data properly": there was nothing to fix.** Checked against the
database rather than assumed - **36 of 37 sub-goals already have a description**.
The one that does not is "Testing", a topic added by hand rather than generated,
and it is the topic in the screenshot. The panel was reporting the truth about
that specific row.

"No lesson content to preview" is likewise correct and not a gap: explanations,
quizzes and coding challenges are generated when a goal is ADDED, so a goal being
previewed has an outline and nothing else. The panel already says exactly that.

---

## JB-7 outcome

The zero case now keeps the page's shape: the four stat tiles, the 30-day chart
with a real axis, and the invitation as one panel among them rather than a single
dashed box floating in an empty screen.

`getMyMockStats` returns an EMPTY `trend` array when there are no sessions, and
an empty array draws no axis at all - so the zero branch generates its own
30-day run of zeros. A chart that draws its own shape with nothing in it is
honest; a blank panel is not.

---

## JB-8 - One sidebar, two sets of links

**Status:** done (2026-08-29)

Niraj: *"the sidebar ui is totally different from the main sidebar ... the
content only needs to change not the full side."*

`components/common/jobssidebar.tsx` was a **319-line reimplementation** of the
app sidebar - its own brand block, collapse control, theme toggle and user
footer, all of which looked subtly unlike the real one, because a copy always
does. Deleted.

`components/common/mainsidebar.tsx` now takes an optional `primary`, and
`app/(jobs)/layout.tsx` passes `jobsNavigation` from `lib/navigation.ts`. Same
sidebar, different links. `Back to ShipItHQ` is first and deliberate: entering
jobs replaces the whole nav, so without it the way out is the browser's back
button.

---

## JB-9 - Browse, and the hover bug I should have caught

**Status:** done (2026-08-29)

**The hover bug.** `hover:text-neutral-700 dark:hover:text-neutral-600` on a
`dark:text-neutral-400` base - so in dark mode hovering a tab made it TWO STEPS
DARKER than at rest. Hovering hid the label instead of lifting it. It was in
`jobs-tabs.tsx`, a file I had edited an hour earlier, and Niraj found it by
moving his mouse.

The same inversion was in **9 files, 11 places** - jobs tabs, applications,
pathfinder goals card, all-projects, purchase, practice module content, add
problem sheet, sign-in, project card. All now `dark:hover:text-white`. In dark
mode hover goes toward white; there is no case where it goes darker.

**The controls are pinned.** The heading, count, search and mode toggle left the
screen at the third job. They are now a `sticky` bar under the shell's own
header, and on one row from `lg` rather than three stacked ones.

Sticky rather than a nested ScrollArea, deliberately: the page already sits
inside the jobs shell's scroller, so a second one would give the reader two
scrollbars over one list.

**The applied banner overlapped the card.** `absolute bottom-0` across the bottom
of `job-card.tsx`, painting over the card's own last row - "Interview process not
disclosed" and the applicant count sat underneath it. In flow now, with negative
margins to reach the card's edges.

Two more found in the same file: the chevron's hover was a no-op in light and
darker in dark, and the match bar was `from-neutral-900 to-neutral-900` - a
gradient between one colour and itself - which was also invisible in dark mode,
where `neutral-900` IS the card.

---

## JB-10 - The swipe animation existed; the buttons never used it

**Status:** done (2026-08-29)

Dragging a card already flew it off screen. The X and heart BUTTONS called
`onSwipeLeft` / `onSwipeRight` directly, which removed the job from the array -
so the card blinked out of existence with no animation at all. Only the drag path
ever set `exitX`.

Both now go through one `fling(direction)`: set the exit, animate out over 240ms
with a tilt, and tell the parent AFTER the transition so the stack re-renders with
the card already gone.

Release also commits on VELOCITY as well as distance, which is what makes a flick
feel like a flick - a fast short swipe commits, a slow short one springs back.

Card widened from `max-w-lg` (512px) to `max-w-2xl`.

---

## JB-11 - The job detail page

**Status:** done (2026-08-29)

**The header was a filter, not a surface.** `bg-white/80` with `backdrop-blur-xl`
is right over a photograph and wrong over text: at 80% the content scrolling
underneath stayed legible through it, so the header read as a smear with two
overlapping paragraphs in it. Opaque now - and the same fix applied to the jobs
shell header and the company detail header, which had it too.

**The sticky panel overlapped the card below it.** `sticky top-24` was on the
apply panel ALONE, so "About the Company" kept scrolling while the panel stayed
and the two drew over each other. The COLUMN sticks now.

`self-start` is load-bearing: a grid item stretches to the row height by default,
and a full-height box has nothing to stick within - the sticky would silently do
nothing.

Width `max-w-6xl` -> `max-w-[90rem]`.

---

## JB-12 - The jobs shell never adapted to the shared sidebar

**Status:** done (2026-08-29)

The sidebar overlapped the job list. Not a new bug - an old number that stopped
being true.

`app/(jobs)/layout.tsx` offset its content by `lg:ml-[70px]` collapsed and
`lg:ml-[240px]` open. Those were measured against `jobssidebar.tsx`. JB-8 deleted
that component and swapped in the shared `AppSidebar`, which is **wider**: 106px
collapsed, 17rem (272px) open. So the shell reserved 36px and 32px too little and
the sidebar painted straight over the first column of cards.

The offsets now match `app/(main)/layout.tsx` exactly, with a note in both saying
that a change to the sidebar's width has to change both shells. Swapping a
component is not finished until the things that were sized against it are
re-measured.

---

## JB-13 - The bottom bar, and the swipe deck

**Status:** done (2026-08-29)

**The count and Load More were at the end of the list**, so on a full page you
scrolled past every job to find out how many there were or to ask for more. They
are now one bar pinned to the bottom.

`sticky bottom-0`, not `position: fixed`. Fixed anchors to the VIEWPORT, so the
bar would slide under the sidebar and past the page card's rounded edge; sticky
stays inside the column and keeps its width. It is the last child of the
scrolling content, so it pins while the list moves behind it.

**The "Great Choice!" dialog is gone.** It fired on every right swipe - swipe,
dialog, dismiss, swipe, dialog - which stops the one gesture the screen exists
for. A toast says the same thing without taking the pointer away, and the Undo
button beside the stack was already the real recovery path.

**The card was still too small and the throw too fast.** First pass took it from
`max-w-lg` (512px) to `max-w-2xl` (672px), which was not enough on a screen the
card IS. Now `max-w-3xl` (768px), 680px tall.

The exit went from 240ms to **450ms** with a softer curve. At a quarter second it
read as the card vanishing rather than being thrown; a swipe needs long enough to
register as a direction and a decision. The spring the uncommitted card rides
back on was softened to match, so a released-but-not-committed drag is visible
too.

---

## JB-14 - Two stacked sticky bars is one too many

**Status:** done (2026-08-29)

I over-applied JB-9. The ask was that the heading stay visible; I made the whole
control bar `sticky top-[85px]`, parked under the jobs shell's OWN sticky header.
Two sticky bars stacked, with a job card scrolling through the gap between them -
which reads as broken rather than as pinned.

The shell header carries the tabs and is the one that genuinely has to stay. This
bar belongs to the list and scrolls with it. The pinned bar at the BOTTOM
(JB-13) stays, because a count and a Load More are controls you reach for at any
scroll position; a title is not.

---

## JB-15 - The swipe card

**Status:** done (2026-08-29)

**More information, and it was all already there.** `FeedJobResult` carries
`description`, `company.industry`, `hasAssignment` and `publishedAt`, and the
card rendered none of them - so a deck whose entire purpose is choosing between
jobs showed a title, a company and four metadata chips. Not enough to decide on.
The description is clamped to four lines (this is a card, and "View details" is
right beside it), with industry, an assignment flag and a posted date on their
own row.

Height 680px -> 780px to carry it.

**Slower, for the third time.** 0.24s -> 0.45s -> **0.7s**. The first two both
read as fast because a swipe deck's whole feedback loop is watching the card
leave: the throw IS the animation, not a transition between two states. The
handoff to the parent moved with it, so the card is fully gone before the stack
re-renders.

---

## JB-16 - The deck: centred, fanned, slower again

**Status:** done (2026-08-29)

**Centred.** The container was `h-[780px]` - a guessed pixel height taller than
the card's own content, so the deck sat at the top of a large dead band. It is
now `h-[calc(100dvh-14rem)]` with a `min-h`, and centres what it holds.

Two things had to change together for that to work: the wrapper became a flex
centring box, and `SwipeCard` lost its `absolute`. An absolutely positioned child
is out of flow, so a parent's `items-center` has nothing to act on - the card
would have stayed pinned to the top however the container was styled.

**Fanned.** The offset was `scale()` and `translateY()` only, so the cards behind
sat directly under the top one and read as a drop shadow rather than a pile. Each
card back in the stack now steps sideways and tilts, alternating direction: the
second leans left, the third right.

`animate` rather than a static `style`, so when the top card leaves the ones
behind slide UP into their new positions instead of snapping - the deck advancing
is itself an animation.

**Slower, fourth time.** 0.24 -> 0.45 -> 0.7 -> **0.95s**, with a gentler curve.
Each earlier value was chosen by thinking about it rather than watching it. The
lesson worth keeping: in a swipe deck the throw IS the interaction's feedback,
not a transition between two states, so it has to last long enough to follow with
your eye.

---

## JB-17 - Pin the toolbar properly, and stop guessing the offset

**Status:** done (2026-08-29)

I got this wrong twice in opposite directions, and both failures had the same
root: **the offset was a number I typed.**

First it was `sticky top-[89px]`, then `top-[85px]` - the toolbar parked flush
under the header with no gap, so the two read as one tall stuck block. Then I
removed the sticky entirely and it scrolled away with the list. Niraj asked for
the same thing both times: *stay put, and have room around it.*

There is no correct constant. The header is `p-4` / `lg:p-6` with a title that
changes size at `lg`, so its height is two different numbers, and neither was in
the class. And a wrong value here fails QUIETLY - the bar sits a few pixels off
and reads as "stacked to the top without space".

**The header measures itself now.** `JobsHeaderOffset` publishes its real height
as `--jobs-header-h` via a `ResizeObserver` - not a one-off read, because the
height changes at the breakpoint and when the subtitle wraps.

**A zero measurement is never published**, and that guard is the important part.
`ResizeObserver` fires on first observe, and an element not yet laid out - a
background tab, a hydration frame, a parent still `display: none` - measures 0.
Publishing `0px` would pin the toolbar to the very top of the scroller, which is
exactly the bug this file exists to prevent, and it would beat the sensible
`96px` fallback in the consuming class. Keeping the old value is always better
than publishing a measurement taken of nothing.

The bar is also a floating toolbar now - inset, rounded, its own border - rather
than a full-bleed strip welded to the one above. The gap is what stops it reading
as stacked.

**The deck sits high of centre.** `items-center` alone read as too low: there is
a header above it and only a thin "N jobs remaining" line below, so the true
centre of the remaining box is not the optical one. `pb-16` weights the box and
lifts the deck.

---

## JB-18 - Spark becomes a stepped job panel, not a swipe deck

**Status:** code done 2026-09-25, and `tsc` passes; the browser pass is Niraj's.
- `spark-panel.tsx` is new, and `spark-content.tsx` is now the stepper.
- `spark-skeleton.tsx` matches the panel block for block.
- The match uses StatBand's emerald (`emerald-700` / `emerald-400`), because
  `emerald-600` on white is under 4.5:1.
- Undoing a Save also removes the save if Spark made it; a job saved before
  stays saved.
- Found while building: a left swipe (now "Not for me") has never been stored
  (`recordSwipeAction` writes nothing for "left"). A skipped job therefore
  comes back on the next visit. That is a follow-up for Niraj to decide, not
  part of this task.

**Asked:** Asked by Niraj 2026-09-25, with a screenshot of
Firecrawl's "Request Details" panel as the reference.

**Why.** The swipe deck shows a card, which hides most of the job, and a
throw is the only way to move on. Niraj wants one job at a time as a plain
panel on the page: sections of labelled, banded rows, and a footer that says
"4 / 20" with up and down arrows. No dialog, and no Tinder mechanics.

**Decisions (Niraj, 2026-09-25):**
- Spark stays as the one-job-at-a-time view. HR-20 now removes the swipe deck,
  not Spark.
- Each step shows the full job in banded rows:
  - **header:** logo, title, company and industry, then Save and Open
  - **stat strip:** match, salary and posted date
  - **Role:** type, work mode, location, experience
  - **Skills:** the ones you have, and the ones missing
  - **Process:** round count, length, and the rounds themselves
  - **About the role:** the description, clamped
- Up and down (or J and K) move between jobs and record nothing.
  - **Save** (S, or the right arrow key) records interest, as a right swipe
    did, then moves on.
  - **Not for me** (X, or the left arrow key) records a skip, as a left swipe
    did, then moves on.
  - Undo (U) brings the last decided job back.

**Files.**
- `app/(jobs)/jobs/spark/spark-content.tsx`: the stepper, its state and keys.
- `app/(jobs)/jobs/components/spark-panel.tsx`: new, the panel for one job.
- `app/(jobs)/jobs/components/spark-skeleton.tsx`: rewritten to match the
  panel.
- The swipe deck files are proposed for deletion below, not assumed.

**Steps.**
1. Build the panel as one bordered surface with square inner bands, in the
   reference's structure:
   - a header row
   - a 3-cell stat strip divided by vertical rules
   - for each section, an uppercase label row with an icon, then a banded
     value row
   - a footer with the counter and the arrow buttons
   Everything stays in the neutral palette. The match uses the StatBand tones:
   emerald at 70 and above, neutral otherwise.
2. The stepper holds an index into the loaded jobs.
   - Browsing moves the index.
   - Deciding records the action (`recordSwipeAction`) and removes the job
     from the list; the index stays, so the next job slides in.
   - Near the end, the next page loads (`getSparkJobs`), as today.
3. Keys work only when focus is not in a field, and never with a modifier
   held, so Cmd+Left still works.
4. A small hint under the footer lists the keys, on lg+ only.
5. A short motion when the step changes (opacity and 8px), and none under
   `prefers-reduced-motion`.
6. The empty state and the "loading more" skeleton keep today's behaviour.

**Edge cases.**
- **Signed out:** browsing works. Save and Not for me show the existing
  "Sign in" toast and record nothing.
- **Salary not disclosed:** the salary cell shows '-', not "0".
- **No interview process:** the Process section is left out rather than shown
  empty.
- **No missing skills:** the Missing row is left out.
- **The last job decided:** the index clamps to the new last item. With none
  left, the empty state shows.
- **Phones (390px):** the stat strip stacks into rows, the footer keeps its
  counter and arrows on one line, and there is no sideways scroll.
- **A very long URL, title or skill list** wraps or truncates inside its band
  and never widens the panel (the reference's URL row overflows; ours must
  not).

**Deletion (approved by Niraj 2026-09-25, done):** `components/swipe-card.tsx`
(`SwipeStack`, `SwipeCard`) was deleted after checking that nothing imported
it.

**Done when.**
- `/jobs/spark` shows one job as the panel, with no dialog and no deck.
- Up and down (and J and K) step with "n / total" updating.
- Save and Not for me record, and the job leaves the list.
- Undo brings it back.
- The skeleton matches the panel.
- `tsc` is clean.
- The browser pass is Niraj's.

---

## JB-19 - Spark remembers skips for 30 days

**Status:** code done 2026-09-25, and `tsc` passes. Waiting on migration 0040
(`job_skip`), which Niraj applies. The reload checks in "Done when" are his.
- The Spark tab's count also subtracts recent skips.
- Spark now loads each job's real interview process: `interviewProcess` was
  hard-coded to `null`, so the panel's Process section could never show.

**Decision (Niraj, 2026-09-25):** "Not for me" hides a job from Spark for 30
days. After that it can come back. Browse and search still list it. The 30 is
this decision; the constant in `actions/jobs/tabs.ts` names this task.

**Why.** A left swipe never wrote anything (`recordSwipeAction` stored only
"right"), so every skipped job came back on the next visit, and "Not for me"
meant "not right now".

**Files.**
- `packages/db/src/schema/jobs.ts`: `job_skip` (`userId`, `jobId`,
  `skippedAt`), unique per (user, job) so a re-skip moves the date. Also a
  `jobs.interviewProcess` relation, so Spark can load a job's rounds.
- One migration (0040), previewed first.
- `apps/main/actions/jobs/tabs.ts`:
  - "left" upserts a skip
  - `undoSkip(jobId)` deletes it
  - `getSparkJobs` leaves out jobs skipped in the last 30 days, loads the real
    interview process, and takes an explicit `offset`
- `app/(jobs)/jobs/spark/spark-content.tsx`: Undo of a skip calls `undoSkip`,
  and "load more" passes offset = jobs fetched minus jobs skipped.

**Why the offset.** Once skips are stored, each one removes a row from the
server's list. A fixed `page * limit` offset would then jump over as many
unseen jobs as were skipped.

**Edge cases.**
- Saving a job that has an old skip clears the skip.
- Signed out: nothing is stored (the "Sign in" toast, as today).
- A job skipped 31 days ago is back in Spark.
- A failed write shows the error toast; the job stays out of the list for this
  visit.

**Done when.**
- A skipped job does not come back after a reload.
- Undo brings it back, and it survives a reload.
- A skip older than 30 days (set by hand in the dev DB) returns.
- Loading more after 5 skips shows no gap: no unseen job is jumped over.
- `tsc` is clean.

