# UI pass (apps/main) - tasks

Read `overview.md` first: it holds the standard every task here measures
against. Taken in order; UI-1 is the only one with a visible bug in it.

## UI-1 The three tab strips that are actually broken
- [ ] Status: not started.

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
- [ ] Status: not started.

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
- [ ] Status: not started.

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

