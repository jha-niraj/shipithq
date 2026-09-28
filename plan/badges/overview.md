# Badges - overview

## What this module is

One set of badges for the whole platform. Each is earned once, from what a learner has
done, and kept. The rules read the activity ledger (plan/progress) and, where it needs
more, the module's own tables. So every module can award badges without code of its own.
They are drawn with the shared glowing badge card (`BadgeCard`, plan/ui-pass UI-20):
monochrome, and only earned badges glow.

## Definition of done

1. **One table.** Every earned badge is a `user_badge` row (user, badge key, earned at,
   seen at), unique per user and key. Incidents badges live there too, under
   `incidents:<key>`, with their original dates.
2. **One catalogue.** Every badge has a key, module, title, one-sentence rule, glyph and,
   where it has one, a progress measure ("7 of 10 solved"). Platform badges are in
   `@repo/db/badges`; Incidents' come from its own content (their rules need the case
   list) and use the same table and card.
3. **Earned when it happens.** Recording an activity (`recordActivity`) checks the badges
   that event can move, in the app and in the worker. Badges whose inputs no event records
   (an idea of yours shipped) are checked when a badges view loads.
4. **Past work counts.** A preview-first script awards everything already earned, with the
   date it was earned where the ledger knows it.
5. **You see it.** A toast on the next page after a badge is earned ("Badge earned: First
   solve"), once, and an Inbox note linking to /badges. No email.
6. **Everywhere it belongs.** A /badges page: every badge by module, earned first, locked
   with progress. A Badges section on Home: the latest earned and the closest to earning.
   The public profile shows earned badges. A progress report lists the badges earned in
   its period. The Incidents tab reads the same table.

## The first set (Niraj, 2026-09-28: all four groups)

| Module | Badge | Rule |
|---|---|---|
| Practice | First solve | 1 problem solved |
| Practice | Ten down | 10 solved |
| Practice | Fifty down | 50 solved |
| Practice | Went hard | a Hard problem solved |
| Projects | First task | 1 task done |
| Projects | Finisher | a project with every task done |
| Projects | Shipped | a project submitted |
| Mock interviews | On the record | a mock interview scored |
| Mock interviews | Strong answer | a mock scored 80 or more |
| Pathfinder | Goal set | a goal started |
| Pathfinder | Verified | a goal verified |
| Jobs | First round | a company round scored |
| Jobs | In their inbox | results sent to a company |
| Streaks | Week straight | a 7-day streak |
| Streaks | Month straight | a 30-day streak |
| Streaks | Fifty days | 50 active days |
| Streaks | All-rounder | something done in 5 different modules |
| AI tools | Resume ready | a resume made |
| AI tools | Dear hiring manager | a cover letter written |
| KnowMe | Out there | KnowMe profile live |
| Ideas | Idea person | an idea posted |
| Ideas | It shipped | an idea of yours shipped |

## Out of scope

- Tiers, points or ranks for badges; leaderboards.
- Badges that can be lost.
- Colour: the palette stays monochrome (Niraj, 2026-09-28).

## Decisions (Niraj, 2026-09-28)

- Badge base: a generic glowing card plus a badge card on top, in packages/ui; monochrome
  glow; locked badges flat and dashed with progress, no glow.
- A platform badge system in this pass, with the four groups above; shown on Home, a
  /badges page, the public profile and in progress reports; a toast and an Inbox note on
  earning; Incidents badges join the one table.
- The old `incident_badge` table stays until Niraj approves dropping it (BDG-1 copies it
  and stops writing it).
