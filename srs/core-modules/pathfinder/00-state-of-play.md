# Pathfinder — state of play

> **Current state lives in `plan/pathfinder/` (2026-09-27).** This file predates the
> Pathfinder sweep (PF-0 to PF-14). Out of date here: the goal page is now a tabbed
> workspace (Today, Plan, Notes, Verify) and `/verify` redirects into it; Explore is
> addressed by goal id; goals are private by default and copies are free (no pricing,
> no earnings); "Generate content" runs in the `subgoal_generation` worker; mock and
> project verification read real sessions and projects. Read `plan/pathfinder/overview.md` first.

Findings from a scan on 2026-08-02. Evidence from the code, with references.

## Size

**6,568 lines** across 5 routes. Smaller than `projects` and, on this scan, in
worse shape where it counts.

| route | purpose |
|---|---|
| `/pathfinder` | the dashboard — two-panel workspace |
| `/pathfinder/[slug]` | a single goal |
| `/pathfinder/[slug]/verify` | verification flow (quiz + coding + mock + project) |
| `/pathfinder/explore` | browse public goals |
| `/pathfinder/explore/[slug]` | a public goal, forkable |

## Server actions — 3,720 lines across 11 files

| file | lines | LLM calls inline |
|---|---|---|
| `subgoals.action.ts` | 808 | **4** |
| `goals.action.ts` | 714 | **2** |
| `verification.action.ts` | 657 | **4** |
| `explore.action.ts` | 401 | — |
| `resources.action.ts` | 303 | **1** |
| `studio-link.action.ts` | 265 | **1** |
| `groups.action.ts` | 253 | — |
| `creator.action.ts` | 132 | — |
| `usage.action.ts` | 116 | — |
| `practice-mock.action.ts` | 72 | — |
| `index.ts` | 6 | — |

**12 inline LLM calls across 5 files — more than `projects` has in twice the
code.** None of them touch a worker.

## Why this module matters

Highest state-accumulation of anything in the product. `pathfinderGoals` carries
`progressPercent`, `completedSubGoals`, `totalQuizAnswered`, `totalCodingSolved`,
`streakDays`, `lastActivityAt`. A goal three weeks in is something a user cannot
get anywhere else and will not abandon casually. That is the return-visit
mechanic the whole "tools, not notes" thesis rests on.

It is also the genuinely differentiated feature. "AI-verified learning goals with
real project submission" does not exist elsewhere.

## Confirmed defects

### Verification charges credits, then runs four AI calls, with no failure refund

**The most serious finding in either module.**

`verification.action.ts:132` `generateVerificationContent(goalId)`:

1. Loads the goal with 14 daily sessions and their sub-goals (`:139`).
2. Checks the user has `PATHFINDER_CREDITS.verificationFee` (`:160`).
3. **Debits the credits** and writes a `creditTransactions` row (`:172`).
4. *Then* runs the AI generation.

If any part of the generation fails, the user has paid the verification fee and
received nothing. There is a refund in this file at `:621` — but it is a
**score-based performance refund** (`Pathfinder Verification Refund: N% score`),
not a failure refund. Different thing entirely.

Four LLM calls on one request path is also the single most likely timeout in the
product.

### Verification never touches the worker

`grep -n "worker\|Worker\|backgroundJob" verification.action.ts` → **nothing**.

The whole flow is inline, while `projects` has a proven Durable Object + Alarm
pipeline sitting next to it, unused by this module.

### `any` in database query callbacks

`verification.action.ts:142-148`:

```ts
orderBy: (ds: any, { desc }: any) => [desc(ds.date)],
…
orderBy: (sg: any, { asc }: any) => [asc(sg.order)],
```

These are Drizzle's typed query builders — the `any` throws away exactly the
column-name checking that would catch a typo'd field at compile time.

### An unfinished reward path

`verification.action.ts:655`:

```ts
// TODO: Award XP, achievements, etc.
```

Sitting at the end of the verification-completion path. Verification is the
module's payoff moment, and the reward half of it is a comment. The schema
already has `currentXp`, `totalXp`, `currentLevel` on `users`.

### No error boundaries

No `error.tsx` or `not-found.tsx` anywhere under `app/(main)/pathfinder`. Same
consequence as in `projects`: a throw takes out the whole app shell.

### No `maxDuration` anywhere

12 inline LLM calls, all under the platform default.

## What is in good shape

**The two-panel dashboard is properly responsive.**
`_components/pathfinder-dashboard.tsx` — `h-screen` column layout, a 400px (xl:
440px) goals rail beside a flexible overview panel, with a real `mobileTab`
state (`:440`) swapping between goals and overview below `lg` rather than
squeezing both. The skeleton at `pathfinder/loading.tsx` was hand-matched to this
shape.

**The data model is well thought out.** `pathfinderGoals` → `pathfinderSubGoals`
→ `pathfinderDailySessions`, plus `pathfinderGroups` for organisation and a
`forkedFromId` for the explore/fork flow. Denormalised counters are consistent.

## Open questions for Niraj

1. `practice-mock.action.ts` (72 lines) bridges pathfinder into the `practice`
   module. If `practice` is parked, what happens to goals that depend on it?
2. `studio-link.action.ts` (265 lines, 1 LLM call) links goals to "studio". Is
   studio in scope for the narrowed product?
3. Verification has four sections — quiz, coding, mock interview, project
   submission. The mock section overlaps both `projectv2-mock` and the standalone
   `mock` module. That is **three** implementations of mock interviewing.
4. `explore.action.ts` supports paid goals (`creditPrice`, and a credit-add at
   `:349`). Is a paid-goal marketplace in scope now, or later?
