# Progress - overview

## What this module is

The record of what a learner has done on ShipItHQ, and the reports built from it. Every
meaningful completion in every module (a solved problem, a finished task, a scored mock,
an incident check, a cleared round...) lands once in one activity ledger. Home's activity
graph, its day sheet and the streak read that ledger, and a scheduled progress report
(weekly by default) turns a period of it into a page and an email. No AI anywhere in this
module: every number and sentence is computed from stored rows.

## Definition of done

1. **One ledger, written by the app.** Each event in the catalogue (`tasks.md` PRG-2)
   writes exactly one `activity_entry` when it happens, under that user's day. Doing the
   same thing twice (a retry, a re-submit, a double click) does not write a second entry:
   every entry has a `dedupe_key`, unique per user.
2. **The ledger never moves XP.** XP is still awarded where it is awarded today
   (`addXpToUser`, practice's own update, incidents' ledger). The entry copies the amount
   for display only, so no event is ever paid twice.
3. **Nothing on the client can write it.** Recording is a server-only function called by
   server code; the old `trackActivity` server action (callable from any browser, and it
   added XP) is gone.
4. **Past work is in it.** A preview-first backfill script writes entries for everything
   done before this shipped, with the same dedupe keys, so a re-run and live recording
   never double up.
5. **The streak is real.** `user_stats.current_streak` / `longest_streak` /
   `last_activity_date` are updated on every recorded day, and Home reads them.
6. **Reports are on by default, weekly.** Settings > Reports offers Weekly, Every two
   weeks, Monthly or Off, and lists every past report. An email's unsubscribe link turns
   them off without signing in.
7. **Reports go out on a fixed calendar.** Weekly on Monday for Mon to Sun; every two
   weeks on the 1st (for the 16th to month end) and the 16th (for the 1st to 15th); monthly
   on the 1st for the previous month. A period with no activity sends nothing and stores
   nothing.
8. **A report is a stored snapshot.** Its numbers do not change later: totals (XP, active
   days, activities, time), the change against the previous period, a per-module section
   (what was done, best scores), the daily series behind its charts, the streak, and a
   "next up" list of what is in progress. Rendering reads the snapshot, not live tables.
9. **Email plus page.** The email (the @repo/email shell) carries the headline numbers,
   the top three wins and one button; the button opens `/reports/<id>`, the full page with
   charts and every item.
10. **Private, share optional.** `/reports/<id>` opens for its owner only. A "Share link"
    switch makes `/reports/s/<token>` public; switching it off kills the link.
11. **Long work runs in the worker.** The daily cron starts one `progress-reports` job
    (a Durable Object) that pages through due users; the cron itself does no report work.

## Out of scope

- Any AI-written text in reports (Niraj, 2026-09-28: "for now no ai into this").
- Push or in-app notifications for a new report (the email and Settings list cover it).
- Per-user time zones: days are UTC days, as the ledger always stored them. Revisit when
  users have a time zone setting.
- Leaderboards or comparing users.

## Decisions (Niraj, 2026-09-28)

- **Record going forward, properly**, on every meaningful action, incidents' quizzes and
  mocks included; plus reports with stored data and new tables as needed.
- **Delivery:** email with the headline and a link to a full report page.
- **Default:** weekly and on; unsubscribe in every email; empty periods send nothing.
- **Schedule:** fixed calendar (point 7).
- **Privacy:** private, with an optional share link.
- **Ledger does not move XP** (point 2): recording and paying are separate, so wiring a
  new event can never double-pay. (Claude's call, following from the XP already being
  awarded at those sites.)
