# Jobs polish - tasks

| ID | Task | Serves | Status |
|---|---|---|---|
| JP-1 | Shell headers line up (jobs header and Harbor) | 1 | built (2026-09-28); jobs header measured at 56px in Chrome, Harbor side not measured |
| JP-2 | `ConfirmDialog`, and every inline confirm and `confirm()` moved to it | 7 | built (2026-09-28) |
| JP-3 | Date, month, date-time and time pickers; the native inputs replaced | 11 | built (2026-09-28) |
| JP-4 | Practise any job: stepper left, one-line link box | 2 | built (2026-09-28); seen in Chrome |
| JP-5 | Company page tabs in the URL | 3 | built (2026-09-28) |
| JP-6 | Rounds lists in two columns | 4 | built (2026-09-28) |
| JP-7 | Cool-down countdown, "Try now" paid, free retake after | 5 | built (2026-09-28) |
| JP-8 | Aptitude screen: options two per row, navigator right, dialogs | 6, 7 | built (2026-09-28) |
| JP-9 | Results: sticky summary left, questions right | 8 | built (2026-09-28) |
| JP-10 | Answer visibility per round (company side) | 9 | built (2026-09-28); migration 0076 applied on dev |
| JP-11 | Report your interview: three steps, wider, 20 XP | 10 | built (2026-09-28) |
| JP-12 | Report sheet: "Other" with a text box, Next pinned to the bottom, spacing | 12 | done 2026-09-29 (Chrome: Other box, pinned footer; migration 0078 applied on dev; a sent report not tried) |
| JP-13 | Jobs header tabs scroll sideways instead of clipping | 13 | done 2026-09-29 (TabsNav on a horizontal ScrollArea; typecheck) |
| JP-14 | Cards with a side action reflow by their own width (apps/main sweep) | 14 | done 2026-09-29 (rounds card checked in Chrome at phone width; sweep list in Outcomes) |
| JP-15 | `CompanyMark`: 16 animated marks for companies without a logo, used everywhere | 15 | done 2026-09-29 (Chrome: companies page) |
| JP-16 | Company cards: one shape, one meta line, a pinned footer | 16 | done 2026-09-29 (Chrome: companies page) |
| JP-18 | Company page: the details column left, the tabs at the top of the right | 18 | done 2026-09-29 (Chrome: Overview and Practice; TabsNav gained a per-tab `scroll`) |
| JP-19 | `PageHeader`: tabs shrink and scroll beside the title | 19 | done 2026-09-29 (typecheck; seen via the sweep) |
| JP-20 | Sweep main and hiring: tabs in the header row, the shared tabs, no restyling | 19 | done 2026-09-29 (Chrome: Referrals, Explore projects, company page; the rest by typecheck) |
| JP-17 | The 404 page: an animated scene, centred, with the right way back | 17 | done 2026-09-29 (Chrome, dark theme, signed in; signed-out button by code) |

## JP-1 - Shell headers line up
**Files** `apps/main/app/(jobs)/jobs/layout.tsx`, `packages/ui/src/components/ai-chat/ai-chat-panel.tsx`.
**Steps** One height for both: the chat panel header `h-14` (as the incident lead's already
is) and the jobs header row `lg:h-14`. **Done when** at 1440px both bottom borders sit at the
same y (measured in the browser).

## JP-2 - ConfirmDialog everywhere
**Files** `packages/ui/src/components/ui/confirm-dialog.tsx` (new, on AlertDialog); inline
sites: `components/hiring/{round-runner,dsa-runner,design-runner,runner-shell,send-controls}.tsx`,
`components/voice/live-interview.tsx`, `projects/[slug]/_components/project-details-client.tsx`,
`apps/hiring/.../pipeline-builder.tsx`; `confirm()` sites: knowme-settings, integrations-content,
studio-container, resources-list, pipeline-builder (unsaved), hiring team-content, jobs-content.
**Steps** `ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, tone, busy, onConfirm })`;
each site opens it instead of swapping buttons. **Edge cases** The timed round's auto-submit at
zero must not wait on a dialog; a dialog open when time runs out closes. **Done when** a grep finds
no `confirm(` call and no inline Keep going / Submit rows.

## JP-3 - Pickers
**Files** `packages/ui/src/components/ui/{date-picker,month-picker,time-picker,date-time-picker}.tsx`;
uses: `components/interview-reports/report-sheet.tsx` (month), `projects/[slug]/_components/daily-standup-{sheet,tab}.tsx`
(time), `apps/uni/components/assignments/teacher-{assessment-create,project-generate,mock-create}-sheet.tsx` (date-time).
**Steps** Replace the demo `DatePicker` with a real one (value, onChange, min/max, placeholder);
`MonthPicker` gains `min`/`max` and a `format` of `YYYY-MM` or `YYYY-MM-01`; `TimePicker` is a
Select of 15-minute slots; `DateTimePicker` combines both. **Done when** a grep finds no
`type="date|month|time|datetime-local|week"` in apps.
**Status** built (2026-09-28). **Outcome** `DatePicker` (value/onChange `YYYY-MM-DD`, min/max,
clearable, dropdown caption, local-parts parsing), `TimePicker` (Select of `step`-minute slots
labelled "9:30 am", optional min/max, an off-grid stored value kept as its own row),
`DateTimePicker` (`YYYY-MM-DDTHH:mm` like datetime-local; min as a date or date-time; a time
picked first is held until a day arrives, a day picked first takes `defaultTime`) and
`MonthPicker` with `min`/`max` and `format` (default `YYYY-MM-01`, existing callers unchanged).
Replaced: the report sheet's "When" (MonthPicker `YYYY-MM`, max the current local month, and
`thisMonth()` now local), both stand-up times, and the three uni deadlines (min today, default
time 23:59). Grep over apps finds no native date or time input; tsc clean for main and uni
(packages/ui only the pre-existing ../pricing errors). Not yet checked in the browser.

## JP-4 - Practise any job
**Files** `app/(jobs)/jobs/import/page.tsx`, `components/job-import/import-form.tsx`.
**Steps** Left: a vertical stepper (step 1 current). Right: the form. A one-line `Input` for the
link; "Paste the text instead" swaps to a text area (and back); pasting text into the link box
switches to text automatically. **Done when** a link and a pasted posting both submit as before.

## JP-5 - Company page tabs
**Files** `app/(jobs)/companies/[slug]/{page.tsx,_components/company-page.tsx}`, its `loading.tsx`.
**Steps** `?tab=overview|jobs|practice|interviews` (default overview), `<Link>` tabs with counts,
`scroll={false}`; header and follow/report actions above the tabs. **Done when** each tab opens
by URL and the back button moves between tabs.
**Status** built (2026-09-28). **Outcome** `?tab=` is parsed server-side by `companyTab()` in
`lib/companies/public-page.ts` (unknown or repeated values fall back to overview). Underline `<Link>`
tabs with `scroll={false}` and counts on Jobs (roles + imported), Practice (ShipItHQ pipelines) and
Interviews (approved reports), the hiring app's style (not TabsNav: chip strip, no scroll opt-out).
Overview keeps the profile with Stats / Quick facts / LinkedIn in the sticky rail; each empty tab
shows one line with its next step. `loading.tsx` matches header, tab bar and Overview. tsc clean;
not yet checked in the browser (back button between tabs still to confirm).

## JP-6 - Rounds lists in two columns
**Files** `components/hiring/rounds-overview.tsx`, the three pages. **Steps** Left (sticky): the
job or company, its note (practice only / by ShipItHQ), progress (N of M cleared) and the next
step; right: the rounds. **Done when** all three pages show it and it stacks below lg.

## JP-7 - Cool-down: countdown, "Try now", free after
**Files** `lib/hiring/round-state.ts`, `actions/hiring/run.action.ts` (`startRound`),
`components/hiring/rounds-overview.tsx`. **Steps** A cooling-down round shows a live countdown and
"Try now · N credits" (starts at the round's price, skipping the wait). A retake started after the
cool-down is free. The first attempt and a "Try now" pay the price. **Edge cases** The price is
decided on the server from the state, never from the client; a refunded (not scored) attempt keeps
starting free of cool-down as today. **Done when** on dev: a failed attempt shows the countdown,
"Try now" holds the price, and after the cool-down "Retake · free" holds nothing.

## JP-8 - Aptitude screen
**Files** `components/hiring/round-runner.tsx`, `runner-shell.tsx`. **Steps** Options in a 2-column
grid (1 on phones); a sticky right column: grid of question numbers, answered / left, Submit. The
prompt: lines kept; lines starting "I.", "II.", "1.", "a)" etc. become an indented list. Submit and
Exit through `ConfirmDialog`. **Done when** a round can be answered and submitted from the right
column, with the dialog.

## JP-9 - Results
**Files** `components/hiring/round-runner.tsx` (`Result`). **Steps** Left sticky: score, pass mark,
cleared or not, right / wrong / unanswered, time taken, back to the rounds, retake info. Right:
the questions in a ScrollArea. **Done when** a scored aptitude attempt shows it.

## JP-10 - Answer visibility per round
**Files** `packages/db/src/schema/jobmock.ts` (+ migration), `apps/hiring/.../pipeline-builder.tsx`,
`apps/hiring/types/pipeline.ts`, `apps/hiring/actions/pipelines/pipeline-builder.action.ts`,
`apps/main/actions/hiring/run.action.ts` (`getRunnerAttempt`), `Result`. **Steps**
`interview_round.review_mode` enum `SCORE` | `RIGHT_WRONG` | `FULL`, default `FULL`; a select in
the round editor; the runner's result payload drops correct answers and explanations unless FULL,
and right/wrong unless RIGHT_WRONG or FULL. **Done when** a round set to Score only returns no
answers from the server (checked in the payload), and the builder saves the setting.

## JP-11 - Report your interview
**Files** `components/interview-reports/report-sheet.tsx`, `actions/(main)/companies/reports.action.ts`,
the activity enum (+ migration). **Steps** Sheet `sm:max-w-3xl`; step 1 the interview (company,
role, when, kind, level, outcome), step 2 the rounds, step 3 review (read-only summary, edit links
back); `MonthPicker`. On submit: 20 XP (`addXpToUser`) and an `INTERVIEW_REPORTED` ledger entry,
once per report (key `interview-report:<id>`). **Done when** a report submits from step 3 and the
account gains 20 XP once.


## Outcomes (2026-09-28)

- **JP-1** The chat panel header is `h-14` (56px, border inside); the jobs header row is
  `lg:h-[55px]` plus its wrapper's 1px border, so both borders sit at 56px. The jobs side
  measured 56px in Chrome; the extension disconnected before the Harbor side was measured.
- **JP-2** `ConfirmDialog` in packages/ui. Replaced: the aptitude, DSA and design submits, the
  runner's Exit, withdraw a send, end a voice interview, make a project public, the pipeline
  builder's delete and leave-unsaved, and every browser `confirm()` (KnowMe delete, GitHub
  disconnect, studio delete, resource delete, hiring team remove, hiring job delete). A timer
  reaching zero closes an open submit dialog and hands in.
- **JP-6, JP-7** `rounds-overview.tsx`: two columns (sticky job, progress and notes on the left;
  rounds on the right). `attemptPrice` in `lib/hiring/round-state.ts`: first attempt pays, a
  retake after the cool-down is free, "Try now" pays (dialog first). The price is decided in
  `startRound` from the state. Live countdown; the page refreshes when it ends.
- **JP-8** Options two per row; sticky right column with the question grid, answered / left
  and Submit; `PromptText` lays out labels ("Conclusions:") and numbered lines ("I.", "II.")
  as a list (tested on the real prompts, including an analogy with " : ").
- **JP-9** Results: sticky score, verdict, right / wrong / unanswered and time taken on the
  left; every question on the right in a ScrollArea, with all four options marked.
- **JP-10** `interview_round.review_mode` (SCORE, RIGHT_WRONG, FULL; default FULL) with a
  select in the hiring builder ("After scoring, show"). `getRunnerAttempt` strips the
  breakdown, correct answers and explanations on the server by the setting.
- **JP-11** The report sheet is `sm:max-w-3xl` in three steps with a read-only review;
  submitting pays 20 XP (`addXpToUser`) and records `INTERVIEW_REPORTED` keyed by the report.
All typecheck clean (main, hiring, uni, worker, ui, db). Not yet seen in a browser: the
rounds list, the runner and results, the builder setting, the report sheet, the company tabs.


## Round 2 (Niraj, 2026-09-28)

### JP-12 - Report sheet: Other, pinned footer, spacing
**Why** A student whose kind of role or round isn't listed had no way to say so; Next hung
halfway down a short step; the stepper sat against the description.
**Files** `components/interview-reports/report-sheet.tsx`, `lib/interview-reports/types.ts`,
`actions/(main)/companies/reports.action.ts`, `packages/db/src/schema/interview-reports.ts`,
migration 0078 (`interview_report.role_family_other text`).
**Steps** Kind of role: "Other" (already the enum's OTHER) opens "What kind of role?", stored in
`role_family_other`. Round kind: "Other" makes the round's title required ("What was the
round?"), stored in the existing `title`. Level and How it ended stay fixed lists (a ladder
and a fixed set of endings: an extra free answer can't be counted). The sheet becomes a
flex column (`scroll={false}`): header, the stepper with space above, a scrolling middle,
and Back / Next in a footer pinned to the bottom with a full-width top border.
**Edge cases** Switching away from Other clears nothing the student typed until they send;
the review shows "Other: <text>". Admin views show the text.
**Done when** a report with a role of kind Other and a round of kind Other sends on dev and
the row holds both texts; Next sits at the sheet's bottom on the short first step.

### JP-13 - Jobs header tabs scroll
**Why** With the sidebar and Harbor open, the tabs ("Practise any job") were cut off.
**Files** `app/(jobs)/jobs/components/jobs-tabs.tsx`.
**Steps** The tab strip sits in a horizontal ScrollArea that takes the space left beside the
title; the active tab is scrolled into view.
**Done when** with the sidebar pinned and Harbor open, every tab is reachable by scrolling.

### JP-14 - Cards with a side action reflow by their own width
**Why** A button beside a card's text squeezes the text into a narrow column when the card is
narrow (sidebar and Harbor open), whatever the screen width.
**Files** `components/hiring/rounds-overview.tsx` first, then every apps/main card with a
side action found by the sweep (listed in Outcomes).
**Steps** The card is a container (`@container`); below its own width threshold the action
moves under the text at the bottom of the card, full width on the smallest.
**Done when** the rounds page with sidebar and Harbor open shows each round's text at full
card width with the action at the bottom, checked in Chrome, and the swept cards are listed.

### JP-15 - CompanyMark
**Why** Every company without a logo showed the same building icon, so the companies page
read as a wall of identical tiles (Niraj, 2026-09-28).
**Decisions** 16 monochrome animated SVG marks; a company always gets the same one, picked by
a hash of its id (stable across visits); a slow loop while on screen, faster on hover, none
under `prefers-reduced-motion`; the uploaded logo (when `companyTrust(...).showLogo`) replaces it.
Used everywhere a company logo shows: the companies list, company pages, job cards, rounds
pages, and the hiring app's company header.
**Files** `packages/ui/src/components/ui/company-mark.tsx` (+ a `COMPANY-MARK.md` note), the
call sites found by grep for the building-icon fallback.
**Edge cases** No id (a company request): hash the name. Sizes from 24px (lists) to 96px (page
header): marks scale by viewBox, stroke widths stay readable. Light and dark: `currentColor` on
a neutral tile, legible in both.
**Done when** the companies page shows varied marks, the same company shows the same mark on
its page and in job cards, and reduced motion stops them (checked in Chrome).

### JP-16 - Company cards
**Why** Cards differed in height, the meta wrapped ("2 / jobs", "201- / 500"), and the
"Transparent Interview Process" row with its icon looked stuck on.
**Files** `app/(jobs)/companies/companies-content.tsx` (one `CompanyCard` for featured and all).
**Steps** Mark, name with a small verified tick, industry under it; one meta line (location,
jobs, size) that truncates as a whole; a footer pinned to the bottom with a hairline: "Open
process" tag left (when transparent), "Practise" right. Every card in a row the same height.
**Done when** at the screenshot's width no meta text wraps and the cards line up.

### JP-17 - The 404 page
**Why** `app/not-found.tsx` was a white page with a GIF hot-linked from dribbble.com: wrong in
dark mode, a third-party request on every miss, and off-brand (Niraj, 2026-09-28).
**Files** `app/not-found.tsx`, `components/common/lost-at-sea.tsx`.
**Steps** Centred: an SVG scene (a boat adrift on layered moving waves at night, a lighthouse
beam sweeping the water, a blinking buoy, twinkling stars), a large "404", one line, and the way
back: signed in, "Go to your home" (/home); signed out, "Sign in" (/signin) and "ShipItHQ home".
Pure SVG + CSS keyframes, `currentColor`, no network requests; no motion under
`prefers-reduced-motion`.
**Done when** /does-not-exist shows the scene in both themes, signed in and out, with the
matching button, checked in Chrome.

## Outcomes, round 2 (2026-09-29)
- **JP-14 sweep** (container queries, action under the text when the card is narrow):
  `rounds-overview.tsx` (round card @2xl, send banners @xl), `my-rounds.tsx` Row,
  `company-page.tsx` (import rows, pipeline rows, paste band, loop header, RoleRow),
  `referrals-view.tsx`, `job-card.tsx` (@lg), `job-detail-content.tsx` rounds band,
  `module-section.tsx` header, `integrations-content.tsx` (@lg), `home-dashboard.tsx` "Start
  here", `project-details-client.tsx` "Next up". Page-width headers and rows with only a short
  link or pill were left as they are.
- **JP-15** `packages/ui/src/components/ui/company-mark.tsx` (16 marks, FNV-1a of the id) used on
  the companies list, company page, job cards, job detail, skill-gap modal, spark panel, and the
  hiring app's company page and profile chip. Order is load-bearing (COMPANY-MARK.md).

## Round 3 (Niraj, 2026-09-29)
Rule added to CLAUDE.md (Conventions): tabs on the right of the header row, title left, actions
after the tabs; the shared tabs in the `segmented` look, never restyled.

### JP-18 - Company page layout
**Why** The header, a full-width underline tab row, then the content: three bands before any
content, and the tabs weren't the product's tabs.
**Files** `app/(jobs)/companies/[slug]/_components/company-page.tsx`, its `loading.tsx`.
**Steps** Two columns on `lg`: left (about 20rem, sticky) the mark, name, verified, the one-line
trust note, website / size / location, Follow and the other actions, then Stats and Quick facts
(moved out of Overview). Right, from the top: `TabsNav` (Overview, Jobs, Practice, Interviews,
with counts) and the tab's content below. Below `lg`, the details stack first and the tabs follow.
**Done when** in Chrome the tabs are the first thing in the right column, each tab's content
fills it, and the skeleton matches.

### JP-19 - PageHeader tabs
**Files** `packages/ui/src/components/ui/page-header.tsx`.
**Steps** The tab slot shrinks (`min-w-0`) and its `TabsNav` scrolls; the actions never shrink;
the title keeps at least a readable width and truncates.
**Done when** a header with six tabs and a button at 900px wide keeps one row with the tabs
scrolling.

### JP-20 - The sweep
**Files** every apps/main and apps/hiring screen with tabs (about 30).
**Steps** Tabs in a separate row under a title move into `PageHeader`'s `tabs` slot (or the top
of the right column, per the rule). Underline or hand-built tabs become `TabsNav` / `Tabs`.
`className` overrides on `TabsList` / `TabsTrigger` / `TabsNav` that restyle them are removed
(layout-only classes on the wrapper may stay). Tabs inside a dialog, sheet or card stay where
they are but use the shared component.
**Done when** grep finds no underline tab rows or restyled triggers in main and hiring, and the
changed screens are listed in Outcomes.

## Outcomes, round 3 (2026-09-29)
- Shared: `TabsNav` items take `scroll` (false keeps the position); `TabsList` defaults to
  `segmented` (was `card`; no caller passed `card`), and a `fit` list scrolls sideways in a
  horizontal ScrollArea; `PageHeader`'s tab slot shrinks, its actions don't.
- apps/main: company page (JP-18, actions right of the tabs), Referrals, Explore projects
  (mine), resume hub, KnowMe settings, credits transactions, explore browse pane, incidents
  index tabs, DSA and design runners, Home range switch.
- apps/hiring: pipelines list, company page (`scroll: false`), profile, billing, jobs list/grid.
- Left: incidents `TopicTabs` (fits what fits, the rest under "More"; the shared tabs have no
  overflow mode yet: a new task if wanted), the workspace's closable editor tabs, and radio
  groups and list filters that aren't tabs.
