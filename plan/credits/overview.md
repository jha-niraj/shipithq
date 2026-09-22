# Credits - overview

## What this module is

Credits are the single currency for everything on ShipItHQ that costs real money
to run. A user arrives with a balance, spends it on AI work, and buys more when
it runs out. Every AI feature in the product - project generation, quizzes, mock
interviews, resumes, cover letters - draws from the same wallet.

The module owns three things: **where credits come from** (the welcome grant,
purchases, refunds, rewards), **what things cost** (one price list), and **how a
charge is made safely** (reserve, then settle or refund).

## Definition of done

Each line is either true or false about the shipped product. No line is a
direction ("improve X"); every line is checkable.

1. **A new user receives exactly 100 credits, once.** Whether they signed up with
   email, Google, or a magic link, and no matter how many times the post-signup
   path runs. Never 0, never 200.

2. **Every credit a user holds has a ledger row explaining where it came from.**
   `SELECT sum(amount) FROM credit_transaction WHERE user_id = X` reconciles with
   `user.credits` for every user. Today the ledger is empty and the balance is a
   number nobody can account for.

3. **Every priced operation reads its price from one table.** `lib/credits/pricing.ts`
   is the only place a number lives. No cost constant is declared anywhere else.

4. **Every charge is reserve -> settle-or-refund.** No feature debits credits and
   hopes. If the work fails, the user gets the credits back and a ledger row says
   why. If the work never dispatched, likewise.

5. **Charging twice for one action is impossible**, including when a Durable
   Object alarm re-fires after eviction. Idempotency is enforced by the database,
   not by convention.

6. **The user is told the price before they spend it**, and told their balance and
   the shortfall when they cannot afford it, with a route to buy more.

7. **Resume and cover letter AI operations are priced and charged** (see the table
   below), and parsing a resume the user uploaded is free.

8. **A failed operation costs nothing.** Verified by forcing a failure and
   observing the balance return to what it was, plus a refund row in the ledger.

9. **A signed-out visitor can reach the pricing page and nothing else.**
   `/purchase` is public so someone can see what things cost before signing up.
   Every other in-app route sends them to `/signin` with a `callbackUrl` that
   brings them back. Added 2026-08-28 - see CR-10 for what was actually true
   before this line existed.

10. **There is one page that answers "where did my credits go".** `/credits`
    shows the balance, every purchase with its invoice, and the full ledger. A
    user should never have to reconstruct their spending from a toast.

## Decisions

Decided by Niraj on 2026-08-20 unless noted.

### The welcome grant is 100 credits

Enough to genuinely try the product: roughly 6 cover letters, or 5 JD-tailored
resumes, or 3 quizzes.

**The grant is explicit, not a column default.** `user.credits` previously
defaulted to `100` at the database level, which is why the wallet had a balance
and the ledger had zero rows - nothing ever recorded the grant. The column
default drops to `0` and `finalizeSignup` becomes the one place a new user is
credited, paired with its ledger row in the same transaction.

The window this opens: between better-auth creating the row and `finalizeSignup`
running, a user has 0 credits. That window is the onboarding screen, where
nothing is spendable, and it closes on the first authenticated request.

### Price list

| Operation | Credits | Where |
|---|---:|---|
| Cover letter - full generation | 15 | `cover-letter.action.ts:generateAndSaveCoverLetter` |
| Cover letter - tailored questions | 5 | `cover-letter.action.ts:generateCoverLetterQuestions` |
| Resume - tailor for a job description | 20 | `resume-draft.action.ts:tailorResumeForJD` |
| Resume - ATS score against a JD | 5 | `resume-draft.action.ts:scoreResumeAgainstJD` |
| Resume - import from LinkedIn/GitHub | 20 | `resume-import.action.ts:importProfileAndCreateDraft`, `importAndCreateDraft` |
| Resume - parse an uploaded PDF/DOCX | **0** | `resume_structure` worker job |

Already in the product, moving into the same table unchanged:

| Operation | Credits |
|---|---:|
| Project quiz | 25 |
| Project mock interview | 30 |
| Practice set | 5 |
| Exam set | 10 |
| Module onboarding (adaptive questions before a sub-module dashboard) | **0** |

**Why parsing an uploaded resume is free.** It runs automatically behind an
upload the user never asked for - at onboarding they have already moved into the
app before it finishes. Charging for a background action nobody requested is the
kind of thing that generates support tickets. It is also what makes every paid
operation above work at all: without a structured resume, tailoring and cover
letters have nothing to read.

**Bullet polish was priced at 3 and then removed.** `resume-ai.action.ts` was
deleted as `CLN-4` on 2026-08-20: its only UI was `experience-tab-form.tsx`,
which `RES-8` had already removed, so the feature was unreachable before it was
ever charged. If it comes back, it comes back with a price.

**Creating, editing, duplicating and exporting a resume are free.** They are not
AI operations. Only work that calls a model or a paid third-party API is priced.

## Out of scope

- **Purchasing credits.** The `/purchase` flow and Razorpay integration already
  exist and are not touched here.
- **Referral credits.** `processReferral` writes an activity row and grants no
  credits today. That is a real gap, tracked as `CR-9`, but it is a separate
  decision about referral economics.
- **Subscriptions or plans.** Credits are consumable only.
- **Refunding a user who is merely unhappy with the output.** Refunds here mean
  the work technically failed. Discretionary refunds are an admin action.
- **Per-user rate limiting.** Credits are the limit.
