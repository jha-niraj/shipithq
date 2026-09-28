# Progress - tasks

Derived from `overview.md`. Build in this order.

| ID | Task | Serves | Status |
|---|---|---|---|
| PRG-1 | Tables: dedupe key, report preferences, reports | 1, 6, 8, 10 | done (2026-09-28) |
| PRG-2 | `recordActivity`, the event catalogue, the streak; `trackActivity` goes | 1, 2, 3, 5 | done (2026-09-28) |
| PRG-3 | Record every event in apps/main | 1 | built (2026-09-28) |
| PRG-4 | Record the worker's events (mock scoring, round judging) | 1 | built (2026-09-28) |
| PRG-5 | Backfill past work | 4 | done (2026-09-28) |
| PRG-6 | Home reads the real streak | 5 | built (2026-09-28) |
| PRG-7 | The report snapshot builder | 8 | done (2026-09-28) |
| PRG-8 | The report page, private and shared | 9, 10 | built (2026-09-28) |
| PRG-9 | Settings > Reports | 6 | built (2026-09-28) |
| PRG-10 | The scheduled job, the email, unsubscribe | 7, 9, 11 | built (2026-09-28) |

## PRG-1 - Tables: dedupe key, report preferences, reports

**Why.** Overview 1 (one entry per event), 6 (the setting), 8 (a stored snapshot), 10
(a share token).

**Files** `packages/db/src/schema/activities.ts`, `packages/db/src/schema/progress.ts`
(new), `packages/db/src/schema/index.ts`, a generated migration.

**Steps**
1. `activity_entry.dedupe_key text` + unique index `(user_id, dedupe_key)`. Nullable, so
   existing rows (the sample days) stay valid; every new entry sets it.
2. `report_frequency` enum: WEEKLY, HALF_MONTHLY, MONTHLY, OFF.
3. `report_preference`: `user_id` (pk, fk cascade), `frequency` (default WEEKLY),
   `unsubscribe_token` (unique), `updated_at`. No row means WEEKLY: a row is written
   the first time the user saves or a report is sent.
4. `progress_report`: `id`, `user_id` (fk cascade), `frequency`, `period_start`,
   `period_end` (date, inclusive), `data` jsonb (the snapshot, versioned `v: 1`),
   `share_token` (unique, nullable), `emailed_at`, `viewed_at`, `created_at`; unique
   `(user_id, frequency, period_start)` so a re-run of the job never makes a second.

**Done when** `pnpm script migrations` previews exactly these statements, applied on dev.

## PRG-2 - `recordActivity`, the event catalogue, the streak

**Why.** Overview 1, 2, 3, 5.

**Files** `packages/db/src/activity.ts` (new, exported as `@repo/db/activity`),
`apps/main/actions/(main)/user/activity.action.ts`.

**Steps**
1. `recordActivity(db, userId, { type, title, description?, xp?, minutes?, key, meta? })`:
   inserts the entry under the user's UTC day with `on conflict (user_id, dedupe_key) do
   nothing`; only when a row was inserted, upserts the day's totals and the streak. Never
   touches `users.current_xp`. Never throws into the caller: a failure is logged and
   returns `false`, because recording must not break the thing being recorded.
2. The catalogue: one constant per event with its type, and the key format, e.g.
   `practice:solved:<sessionId>`, `project:task:<taskStatusId>`, `mock:scored:<sessionId>`,
   `incident:check:<slug>:<itemId>`. The enum gains the types it lacks (see PRG-3).
3. Streak: today counted once; yesterday active makes it +1, else 1; `longest` is the max.
4. `trackActivity` is deleted (nothing calls it, and as a server action any browser
   could add itself XP). The read functions in that file stay.

**Edge cases** Two events in the same millisecond on a new day: the day upsert uses
`on conflict (user_id, date)`. A backfilled entry dated in the past must not move the
streak's "last activity" backwards.

**Done when** calling it twice with the same key leaves one entry and one day total;
a script check prints the streak moving 1, 2, then 1 after a gap.

## PRG-3 - Record every event in apps/main

**Why.** Overview 1: "every meaningful action" (Niraj, 2026-09-28), incidents included.

**Steps** one `recordActivity(db, userId, ...)` per site, after the write that marks the
thing done succeeds, keyed by `activityKey`. Sites (all under `apps/main/`; `(m)` =
`actions/(main)`), from the write-site map (2026-09-28):

| Event | Site | Hook on | Key |
|---|---|---|---|
| Practice solved (guided) | `(m)/practice/practice.action.ts` `applyGuidedCompletion` | `if (updated)` | session id |
| Practice solved (assess >= 80) | same file, `persistAssessment` | first COMPLETED | session id (a fail then pass must not re-record) |
| Project task done | `(m)/projects/project.action.ts` `updateTaskStatus` | set COMPLETED | task status id (toggling repeats) |
| Project completed | same, all tasks done | progress COMPLETED | progress id |
| Project submitted | same, `submitProject` | after insert | progress id |
| Project quiz | same, `completeQuiz` | after update | attempt id |
| Sprint or final quiz | `(m)/projects/sprint-quiz.action.ts` `submitSprintQuizAttempt` | after insert | attempt id |
| Sprint or final mock | `(m)/projects/sprint-mock.action.ts` `finish()` | `if (ended.length)` | session id |
| Mock interview scored | `lib/voice/score.ts` `progressVoiceMock` | `if (closed)` | session id |
| Goal started | `(m)/pathfinder/goals.action.ts` `createPathfinderGoal`, `interview-prep.action.ts`, `lib/pathfinder/copy.ts` | after insert | goal id |
| Step done | `(m)/pathfinder/subgoals.action.ts` `updateSubGoalStatus` | `!wasCompleted && isNowCompleted` | sub-goal id |
| Coding passed | same, `submitSubGoalCoding` | `evaluation.passed` | sub-goal id |
| Verification quiz | `(m)/pathfinder/verification.action.ts` `submitVerificationQuiz` | after insert | attempt id |
| Goal completed | same, `checkVerificationCompletion` | passed | goal id |
| Incident check, prediction | `lib/incidents/record.ts` `recordProgressFor` | `inserted` | slug + item id |
| Incident perfect round | same | `insertOnce` | slug + item id |
| Incident case completed | same | `if (id)` | slug |
| Incident report | `lib/incidents/report.ts` `awardReportXp` | first time | run id |
| Incident mock | `(m)/incidents/mock.action.ts` `finishIncidentMock` | completed | session id |
| Round scored | `lib/hiring/runs.ts` `closeAttempt` | `closed` | attempt id |
| Results sent | `actions/hiring/send.action.ts` `sendResults` | `inserted[0]` | send id |
| Referral requested | `(m)/referrer/index.ts` `requestReferral` | `row` | request id |
| Job saved | `actions/jobs/browse.ts` `toggleSaveJob`, `saveJob`; `actions/jobs/tabs.ts` `recordSwipeAction` | saved (not unsaved) | job id |
| Resume created | `(m)/ai/resume-draft.action.ts` create/duplicate; `(m)/ai/resume-primary.action.ts` | after insert | draft id |
| KnowMe live | `(m)/knowme/profile.action.ts` `activateKnowMeProfile` | first activation | profile id |
| Idea posted | `(m)/ideas/ideas.action.ts` `postIdea` | after insert | idea id |
| Idea voted | same, `toggleIdeaVote` | `inserted.length` | idea id |

Not events: a project mock (nothing writes one), the Pathfinder daily session (a counter
row, no completion), sign-up (no after-create hook; its 250 XP is text only).

**Edge cases** A re-submit that improves a score is not a new event (same key). A
server action that can fail after the write records nothing when the write rolled back.

**Done when** doing each event once on dev writes exactly one entry (a script lists the
last entries per type), and doing it twice still one.

**Outcome (2026-09-28).** Every site in the table records once, after its write, with
`db` (never `tx`) and a `// The activity ledger (plan/progress PRG-3).` comment. `xp` is
the XP the site already paid, 0 where it pays none; no XP was added or moved.

- Practice solved: `(m)/practice/practice.action.ts` `applyGuidedCompletion` (`if (updated)`)
  and `persistAssessment` (first COMPLETED), both through `recordPracticeSolved`;
  `updateModuleProgress` now returns the problem it credited (title, difficulty, XP).
- Project task done, project completed: `(m)/projects/project.action.ts` `updateTaskStatus`
  (move to COMPLETED; the insert now returns its status id; completed only when the
  progress was not already COMPLETED).
- Project submitted: same file, `submitProject`. Project quiz: same file, `completeQuiz`
  (first completion of the attempt).
- Sprint or final quiz: `(m)/projects/sprint-quiz.action.ts` `submitSprintQuizAttempt`.
- Sprint or final mock: `(m)/projects/sprint-mock.action.ts` `finish` (`if (ended.length)`).
- Mock interview scored: `lib/voice/score.ts` `progressVoiceMock` (`if (closed)`).
- Goal started: `(m)/pathfinder/goals.action.ts` `createPathfinderGoal`,
  `(m)/pathfinder/interview-prep.action.ts` `createInterviewPrepGoal`,
  `lib/pathfinder/copy.ts` `copyGoalFor` (after the transaction).
- Step done, coding passed: `(m)/pathfinder/subgoals.action.ts` `updateSubGoalStatus`
  (`!wasCompleted && isNowCompleted`), `submitSubGoalCoding` (`evaluation.passed`).
- Verification quiz, goal completed: `(m)/pathfinder/verification.action.ts`
  `submitVerificationQuiz` (insert now returns its id), `checkVerificationCompletion`
  (xp = the verification award).
- Incident check or prediction, perfect round, case completed: `lib/incidents/record.ts`
  `recordProgressFor` (first answer, right or wrong; xp = what that call awarded).
- Incident report: `lib/incidents/report.ts` `awardReportXp`, which now takes the run id
  from `app/(main)/incidents/[slug]/report/[runId]/page.tsx`. First report per case only,
  as the XP is. PRG-4's worker entry uses the same key, so the two never double up.
- Incident mock: `(m)/incidents/mock.action.ts` `finishIncidentMock` (the feedback path;
  a talk with nothing said is not recorded).
- Round scored: `lib/hiring/runs.ts` `closeAttempt` (`closed` and scored; a refunded,
  not-scored round records nothing).
- Results sent: `actions/hiring/send.action.ts` `sendResults` (`inserted[0]`).
- Referral requested: `(m)/referrer/index.ts` `requestReferral` (`row`).
- Job saved: `actions/jobs/browse.ts` `toggleSaveJob` (save branch), `saveJob`;
  `actions/jobs/tabs.ts` `recordSwipeAction` (right or save), all through
  `lib/jobs/record-saved.ts` `recordJobSaved`.
- Resume created: `(m)/ai/resume-draft.action.ts` `createResumeDraft` (covers
  `createDraftFromProfile`), `duplicateResumeDraft`; `(m)/ai/resume-primary.action.ts`
  `createTailoredResume` (the base resume it materialises, and the tailored draft), all
  through `lib/resume/record-created.ts` `recordResumeCreated`.
- KnowMe live: `(m)/knowme/profile.action.ts` `activateKnowMeProfile` (status was not ACTIVE).
- Idea posted, idea voted: `(m)/ideas/ideas.action.ts` `postIdea`, `toggleIdeaVote`
  (`result.voted`, after the transaction).

Skipped: none. `tsc --noEmit` in apps/main is clean. Checked by a throwaway script on a
temp user (dev DB, deleted after): every prediction and round of a case answered twice,
the report opened twice, a practice assessment at 60, 90, 95, a shared goal copied twice
and a job saved twice wrote 10 entries, one per event, 0 duplicate keys. The session-bound
actions (tasks, quizzes, mocks, sends, referrals, ideas, KnowMe) were typechecked, not run.

## PRG-4 - Record the worker's events

**Why.** Some completions finish in `apps/worker` (mock analysis, round judging), where
there is no session.

**Steps** `recordActivity(db, userId, ...)` at the terminal write, with `db` from
`createDb(env.DATABASE_URL)`:

| Event | Site (apps/worker/src/jobs) | Key |
|---|---|---|
| Incident report ready | `incident-report.ts` `run` (runId; slug and title by lookup) | run id |
| Job imported and ready | `job-import.ts` `readyStep` (owner is `imported_job.owner_id`) | import id |
| Resume imported | `resume-structure.ts`, `resume-import.ts` (after the insert) | draft id |
| Cover letter generated | `cover-letter.ts` (after the content write) | letter id |

**Done when** a scored mock on dev writes its entry once, even if the job retries.

## PRG-5 - Backfill past work

**Why.** Overview 4.

**Files** `packages/db/src/scripts/activity-backfill.ts` (new).

**Steps** Preview per user and type how many entries it would write; `--apply` writes
them with the same keys PRG-3 uses and the original timestamps, then plans again (zero
left). Recomputes each touched user's streak from their days.

**Done when** preview, apply, preview shows 0, and Niraj's graph shows his real history.

## PRG-6 - Home reads the real streak

**Why.** Overview 5. **Files** `actions/(main)/home/home.action.ts`,
`home/_components/activity-calendar.tsx`. **Steps** The header streak and the StatBand
read `user_stats`; the graph's own streak count stays as the fallback when no row.
**Done when** both show the same number for Niraj's account.

## PRG-7 - The report snapshot builder

**Why.** Overview 8. **Needs** plan/home HOME-6.

**Files** `packages/db/src/progress/report.ts` (new).

**Steps** `buildReport(db, userId, period)` returns the snapshot: totals, previous
period and change, per module (the HOME-6 summaries for the period), top wins (the
three highest scores or biggest completions, by a fixed rule), daily series, streak,
next up (in-progress items). `periodFor(frequency, today)` gives the fixed calendar
periods (overview 7). Returns `null` when the period has no activity.

**Done when** `pnpm script progress-report --email=... --frequency=weekly` prints the
snapshot for last week without writing, and `--apply` stores it once.

## PRG-8 - The report page, private and shared

**Files** `app/(main)/reports/[id]/page.tsx`, `app/(public)/reports/s/[token]/page.tsx`,
`components/reports/report-view.tsx`, a share action. **Steps** The page: the period and
headline StatBand, the XP chart, a section per module that had activity (chart and
items), wins, next up; `loading.tsx` shaped the same. Owner only; the share switch sets
or clears `share_token`. **Done when** the owner opens it, another account gets 404,
the share link opens signed out, and switching share off breaks it.

## PRG-9 - Settings > Reports

**Files** `app/(main)/settings/reports/page.tsx`, the settings nav, an action.
**Steps** Frequency (Weekly, Every two weeks, Monthly, Off) with when the next one goes
out, and the list of past reports. **Done when** a change persists and the next date
shown matches overview 7.

## PRG-10 - The scheduled job, the email, unsubscribe

**Files** `apps/worker/src/jobs/progress-reports.ts` (+ the five edits in
`apps/worker/README.md`), `apps/worker/src/index.ts` (cron), `packages/email/src/
progress.ts`, `app/api/reports/unsubscribe/route.ts`.

**Steps** The daily cron starts the job when a period ends that day (Monday, 1st, 16th).
The job pages through users due for that frequency, builds, stores (unique key makes a
retry safe), emails, sets `emailed_at`. Unsubscribe sets OFF from the token, no sign-in.

**Edge cases** The worker needs `RESEND_API_KEY` and the app URL in its secrets
(`.env.production.example`). A failed email leaves `emailed_at` null and is retried by
the next run for that period.

**Done when** running the job by hand on dev for Niraj's account stores one report,
sends one email with a working link, and a second run sends nothing.


## Outcomes (2026-09-28)

- **PRG-1** Migration 0074 applied on dev: 22 activity types, `activity_entry.dedupe_key`
  (unique per user), `report_preference`, `progress_report`.
- **PRG-2** `packages/db/src/activity.ts`: `recordActivity`, `activityKey`,
  `recomputeStreak`, `setActivityXp`. Checked on a throwaway user: a duplicate key writes
  nothing, the streak went 2 then 3, recompute agreed. `trackActivity` is deleted.
- **PRG-4** Worker: incident report ready (`incident-report.ts`), job imported
  (`job-import.ts` ready step), resume imported (`resume-structure.ts`,
  `resume-import.ts`), cover letter (`cover-letter.ts`). The incident report's 30 XP is
  paid when the owner opens it, so `awardReportXp` fills it into the worker's entry
  (`setActivityXp`) instead of writing a second one. Typechecked; not run in the worker.
- **PRG-5** `pnpm script activity-backfill`: applied on dev, 40 entries for 3 accounts,
  then nothing left. Its keys match live recording (incident rounds use item `round`).
- **PRG-6** `user_stats` is written on every recorded day, and Home already reads it.
- **PRG-7** `packages/db/src/progress/{report,calendar,send}.ts`. `pnpm script
  progress-report --email=jhaniraj45@gmail.com` built last week (Sep 21 to 27): 455 XP,
  5 active days, 3 modules, 3 wins; `--apply` stored it once, a second run wrote nothing.
- **PRG-8** `/reports/<id>` (owner; signed out it redirects to sign-in) and
  `/reports/s/<token>` in `(public)`, outside the app shell. On a dev server the shared page
  rendered every section (200); the share switch sets and clears the token.
- **PRG-9** Settings > Reports: the four choices, the next send day, past reports.
- **PRG-10** The daily cron starts the `ProgressReports` Durable Object (binding and tag
  v20) on a send day; it works in batches of 20 users per alarm, with one retry pass for
  failed emails. Email: `@repo/email/progress` with List-Unsubscribe. Unsubscribe is a
  confirm page (`/unsubscribe/reports`) plus a POST route: both paths turned a throwaway
  user's reports off on a dev server. `pnpm script progress-reports-run --day=...`
  previews or stores a send day without email. `/api/reports/email-preview?id=` shows the
  owner the email. **Not yet run:** a real send (needs the worker deployed with
  `RESEND_API_KEY` and `RESEND_FROM_MAIL`, now in `.env.production.example`).

## PRG-11 - Sign-up as an event, and the feedback form's XP paid once

**Status:** built (2026-09-28); typechecked in auth and main, not exercised (needs a real sign-up and a signed-in feedback submit). **Why** (Niraj, 2026-09-28): sign-up had no ledger
event (better-auth has only a `before` hook), and the old feedback form paid 25 XP on
every submission with no limit.
**Files** `packages/auth/src/auth.ts` (a `user.create.after` hook),
`apps/main/actions/(main)/user/feedback.action.ts`.
**Steps** The after-create hook records SIGNUP (key `signup:<userId>`). The feedback form
pays its 25 XP at most once per user per UTC day, and records the submission.
**Done when** a new account has one SIGNUP entry, and two feedback submissions on one day
pay 25 XP once.
