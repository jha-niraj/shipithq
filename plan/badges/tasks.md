# Badges - tasks

Derived from `overview.md`. Needs plan/progress (the ledger) and plan/ui-pass UI-20 (the card).

| ID | Task | Serves | Status |
|---|---|---|---|
| BDG-1 | `user_badge`, and Incidents moved onto it | 1 | done (2026-09-28) |
| BDG-2 | The catalogue, the rules, awarding from `recordActivity` | 2, 3 | done (2026-09-28) |
| BDG-3 | Award past work | 4 | done (2026-09-28) |
| BDG-4 | Glyphs and the /badges page | 6 | built (2026-09-28) |
| BDG-5 | Badges on Home | 6 | built (2026-09-28) |
| BDG-6 | Badges on the public profile | 6 | done (2026-09-28) |
| BDG-7 | Badges in progress reports | 6 | built (2026-09-28) |
| BDG-8 | The toast and the Inbox note | 5 | built (2026-09-28) |
| BDG-9 | Drop `incident_badge` after the production copy | 1 | not started (approved, waits on prod) |

## BDG-1 - `user_badge`, and Incidents moved onto it

**Files** `packages/db/src/schema/progress.ts`, a migration,
`packages/db/src/scripts/badges-from-incidents.ts`, `apps/main/lib/incidents/{record,stats}.ts`.
**Steps** Table `user_badge` (`user_id`, `badge_key`, `earned_at`, `seen_at`; unique user +
key). The script copies `incident_badge` rows as `incidents:<key>` with their dates
(preview, `--apply`, preview again). Incidents awards and reads `user_badge`.
**Edge cases** A badge in both tables keeps the older date. `incident_badge` is left in
place, unwritten; dropping it is a separate, approved task.
**Done when** the script's second preview is empty and the Incidents tab shows the same
earned badges and dates as before.

## BDG-2 - The catalogue, the rules, awarding from `recordActivity`

**Files** `packages/db/src/badges.ts` (new, `@repo/db/badges`), `packages/db/src/activity.ts`.
**Steps** `BADGES`: key, module, title, rule text, glyph, `triggers` (the activity types
that can move it), and a measure `(ex, userId) => { value, max }`. `awardBadges(ex, userId,
{ type? })` measures the badges that type can move (all, without a type), inserts the ones
reached (`on conflict do nothing`), writes an Inbox note per new one, and returns them.
`recordActivity` calls it after a new entry. `badgeProgress(ex, userId)` gives every badge's
state for the views.
**Edge cases** Awarding never throws into `recordActivity`. The earned date is now for live
awards; the backfill passes the date the threshold was crossed where it can.
**Done when** a script on a throwaway user records 1 then 10 practice solves and gets First
solve, then Ten down, each once, with one Inbox note each.

## BDG-3 - Award past work

**Files** `packages/db/src/scripts/badges-backfill.ts`. **Steps** Preview per user what would
be awarded; `--apply` awards, dated from the ledger (the entry that crossed the threshold),
without Inbox notes (old news), marked seen. **Done when** preview, apply, preview shows 0.

## BDG-4 - Glyphs and the /badges page

**Files** `apps/main/components/badges/glyphs.tsx`, `app/(main)/badges/{page,loading}.tsx`.
**Steps** One glyph per badge (strokes around 0,0 like Incidents'). The page: a StatBand
(earned, of total, latest), then a section per module (Incidents included) with a
`BadgeGrid`: earned first, then locked by closeness. **Done when** every badge shows with
the right state for Niraj's account, at 1440px and 390px.

## BDG-5 - Badges on Home

**Files** `home/_components/badges-section.tsx`, `home/page.tsx`, the Home skeleton.
**Steps** Below the module sections: the four latest earned and the four closest to earning,
and "All badges". **Done when** it shows for Niraj's account and an empty account sees the
four closest.

## BDG-6 - Badges on the public profile

**Files** `lib/profile/read.ts`, the profile page. **Steps** Earned badges only (a stranger
sees no locked ones), newest first, capped at 12 with a count. Respects the profile's
visibility (private shows nothing). **Done when** a public profile with badges shows them and
a private one does not.

## BDG-7 - Badges in progress reports

**Files** `packages/db/src/progress/report.ts`, `components/progress/report-view.tsx`,
`packages/email/src/progress.ts`. **Steps** The snapshot gains `badges` (earned in the
period); the page shows them in a `BadgeGrid`; the email lists them. Older snapshots
without the field render as before. **Done when** a report for a period with a badge shows
it on the page and in the email preview.

## BDG-8 - The toast and the Inbox note

**Files** `components/badges/badge-toaster.tsx` (in the main shell), a server action.
**Steps** On load and on each navigation, the shell asks for unseen badges; each shows a
toast once, then is marked seen. The Inbox note is written by `awardBadges` (BDG-2), kind
`GENERAL`, linking to /badges. **Done when** earning a badge in one action shows its toast on
the next page, once, and the Inbox has one note.


## Outcomes (2026-09-28)

- **BDG-1** Migration 0075 (`user_badge`) applied on dev. Incidents awards into it as
  `incidents:<key>`, marked seen (the case page toasts it), with an Inbox note; the tab
  reads it. `pnpm script badges-from-incidents` copies old rows (none on dev).
  `incident_badge` is no longer written; dropping it waits for approval.
- **BDG-2** `packages/db/src/badges.ts`: 22 badges, measured from each module's own tables.
  `recordActivity` awards the ones its event can move. Checked on a throwaway user: events
  in 5 modules gave All-rounder on the fifth, once, with one Inbox note, unseen for the toast.
- **BDG-3** `pnpm script badges-backfill`: applied on dev, 7 badges for 3 accounts, then
  nothing left; dated by the ledger entry that reached them, marked seen, no Inbox notes.
- **BDG-4** `/badges`: a StatBand (earned, latest, closest), then a section per module.
  22 glyphs in `components/badges/glyphs.tsx`. Needs a signed-in look (Niraj).
- **BDG-5** Home: Badges below the module sections (latest four, then the closest).
- **BDG-6** The public profile shows earned badges (at most 12, and a count). On a dev
  server `/profile/nirajjha` rendered Niraj's 5, lit.
- **BDG-7** Report snapshots gain `badges` (older ones render as before); the page shows
  them as cards and the email lists them. An Incidents badge's title in the email is a
  readable form of its key (its real title lives in the app's content).
- **BDG-8** `BadgeToaster` in the main shell: on arrival and each navigation, unseen
  badges toast once with "See badges"; `takeUnseenBadges` marks them seen.


## BDG-9 - Drop `incident_badge` after the production copy

**Status:** not started. Approved by Niraj (2026-09-28): drop it once production's rows are copied.
**Why** Nothing writes or reads it since BDG-1; it only holds rows not yet copied.
**Steps** 1. Run `pnpm script badges-from-incidents --apply` against production and confirm the
second preview is empty. 2. Remove `incidentBadges` from `packages/db/src/schema/incidents.ts`,
generate the drop migration, report its SQL, apply.
**Edge cases** Do not generate the drop before step 1 has run on production: dev has no rows,
so it would look safe here and lose production's earned dates.
**Done when** the migration is applied everywhere and `grep -rn incidentBadges apps packages` finds none.
