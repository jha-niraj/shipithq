# Pathfinder — blockers

> **Current state lives in `plan/pathfinder/` (2026-09-27).** This file predates the
> Pathfinder sweep (PF-0 to PF-14). Out of date here: the goal page is now a tabbed
> workspace (Today, Plan, Notes, Verify) and `/verify` redirects into it; Explore is
> addressed by goal id; goals are private by default and copies are free (no pricing,
> no earnings); "Generate content" runs in the `subgoal_generation` worker; mock and
> project verification read real sessions and projects. Read `plan/pathfinder/overview.md` first.

`PF-B1` and `PF-B2` are the two most serious findings in either module. They are
the same code path, and fixing them together is cheaper than fixing them apart.

---

## PF-B1 — Verification debits credits before generating, with no failure refund

**Severity: highest — users pay the verification fee and can receive nothing.**

`verification.action.ts:132` `generateVerificationContent()`:

```
:160   check credits >= PATHFINDER_CREDITS.verificationFee
:172   DEBIT credits + write creditTransactions row
       ↓
       … then four LLM calls, any of which can fail or time out
```

There is a refund at `:621`, but read it: it is keyed on `weightedScore` and
described as `Pathfinder Verification Refund: N% score`. That is a
**performance** rebate for doing well. There is no refund for the generation
failing.

Worse than the equivalent in `projects` (`PRJ-B1`), because there is one debit in
front of *four* chances to fail.

### Do

1. Move the debit **after** successful generation, or use the credit-hold helper
   (`SHARED-3`): reserve → run → settle-or-release.
2. Refund on LLM error, timeout, schema-validation failure, and terminal job
   failure.
3. Keep the performance refund at `:621` — it is a separate, intentional
   mechanic. Do not conflate them; they need distinct
   `creditTransactions.description` values or the ledger becomes unreadable.
4. Make the failure refund idempotent, keyed on job id — once `PF-W1` lands, an
   alarm can re-fire after a DO eviction.
5. Add a test with a forced LLM failure asserting the balance is unchanged
   end-to-end.

**Blocked by:** `SHARED-3`. **Do with `PF-B2`** — same function.

---

## PF-B2 — Verification runs four LLM calls on the request path

**Severity: highest — the most likely timeout in the product.**

`verification.action.ts` makes four inline LLM calls and never touches a worker.
On Cloudflare Workers via OpenNext this will be killed under load, and because of
`PF-B1` the user is already charged when it is.

The proven fix is sitting one directory away, unused by this module:
`apps/worker/src/jobs/project-generation.ts`.

### Do

See `PF-W1` in `02-worker-migration.md` for the full migration.

Immediate mitigation while that is built:

1. Wrap each call in an `AbortController` with an explicit budget so it fails
   predictably rather than being killed.
2. Treat the abort as a refundable failure (`PF-B1`).
3. Log which of the four calls aborts most — that determines whether the
   migration fans out or stays sequential.

---

## PF-B3 — No error boundaries

Same as `PRJ-B2`. No `error.tsx` or `not-found.tsx` under `app/(main)/pathfinder`.

Sharper here because `/pathfinder` is a `h-screen` two-panel workspace: an error
does not just replace a card, it drops the user out of a full-screen surface with
no way back to their goal.

### Do

1. `error.tsx` at `app/(main)/pathfinder/`.
2. A tighter one at `[slug]/` so a goal-level failure keeps the goals rail and
   only replaces the detail panel.
3. `not-found.tsx` at `[slug]/` and `explore/[slug]/` — a stale or unshared goal
   slug is a normal thing to hit, especially with `forkedFromId` in play.
4. Both must respect the `h-screen` shell and `--page-h`, or the error state will
   overflow the page card by 16px.

---

## PF-B4 — The reward path is a TODO

`verification.action.ts:655`:

```ts
// TODO: Award XP, achievements, etc.
```

Verification is the module's payoff. A user completes a multi-week goal, passes
four verification sections, and receives no XP and no achievement — the code that
would grant it was never written.

The schema is ready: `users.currentXp`, `users.totalXp`, `users.currentLevel`,
plus an achievements schema.

### Do

1. Decide the XP formula — flat per verification, or weighted by the same
   `weightedScore` the performance refund already computes at `:621`. That value
   is right there; reuse it rather than inventing a second scoring notion.
2. Award XP and any achievement inside the **same** atomic write as the
   verification-complete update. Use `withTransaction` — `db.transaction()`
   throws on the neon-http driver.
3. Make it idempotent — re-running verification completion must not grant twice.
4. Surface it in the UI. XP granted silently is XP that did not happen.

---

## PF-B5 — `any` in Drizzle query callbacks

`verification.action.ts:142-148`:

```ts
orderBy: (ds: any, { desc }: any) => [desc(ds.date)],
orderBy: (sg: any, { asc }: any) => [asc(sg.order)],
```

Drizzle's relational query builder gives fully typed callbacks. Casting to `any`
discards column-name checking — `ds.dateCreated` would compile and fail at
runtime.

### Do

Remove the annotations entirely and let inference work. If it does not infer, the
relation is misconfigured and *that* is the bug worth finding. Sweep both modules
for the same pattern.
