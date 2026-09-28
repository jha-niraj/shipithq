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
