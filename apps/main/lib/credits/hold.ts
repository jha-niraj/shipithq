import { withTransaction, creditHolds, creditTransactions, users } from "@repo/db";
import { and, eq, sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Credit holds - charge, run, then settle or refund.
//
// Every paid flow used to debit credits and *then* call an LLM. When the call
// failed the user had paid and received nothing, with no record that a refund
// was owed. `_refundCredits()` existed in the projects action layer and was
// never once called; pathfinder's verification debited in front of four
// consecutive LLM calls.
//
//   const hold = await reserveCredits({ userId, amount, reason, holdId })
//   if (!hold.ok) return { success: false, error: hold.error, code: hold.code }
//   try {
//       const result = await doTheExpensiveThing()
//       await settleCredits(holdId)          // work landed - keep the charge
//       return { success: true, result }
//   } catch (error: unknown) {
//       await releaseCredits(holdId, toReleaseReason(error))
//       return { success: false, error: "…, your credits were refunded." }
//   }
//
// IDEMPOTENCY is the point of the `credit_hold` table, not bookkeeping. Work
// that runs on a Durable Object can have its alarm re-fire after an eviction, so
// `reserve` and `release` must both be safe to call twice with the same
// `holdId`. The unique constraint on `hold_id` makes a double charge impossible
// at the database level rather than by convention, and `release` is a no-op
// unless the hold is still `held`.
//
// Every balance change is paired with a `credit_transaction` row inside ONE
// transaction, so the ledger can never disagree with the balance. The previous
// code did the debit and the ledger insert as two separate awaits - a process
// death between them left the two permanently out of step.
//
// Note `withTransaction`, not `db.transaction`: the default client is neon-http,
// which has no transaction support and throws at runtime.
// ─────────────────────────────────────────────────────────────────────────────

/** The hold key for a background job. Derived, so the poller does not have to carry it. */
export const jobHoldId = (jobId: string) => `job-${jobId}`

export type HoldFailureCode = "INSUFFICIENT_CREDITS" | "USER_NOT_FOUND" | "HOLD_FAILED";

export type ReserveResult =
    | { ok: true; holdId: string; amount: number; alreadyHeld: boolean }
    | { ok: false; error: string; code: HoldFailureCode; required?: number; available?: number };

interface ReserveInput {
    userId: string;
    amount: number;
    /** Human-readable, mirrored into the ledger description. */
    reason: string;
    /** Idempotency key. Pass the background job id for anything on a worker. */
    holdId: string;
}

/**
 * Debit `amount` and record a hold against it.
 *
 * Returns `alreadyHeld: true` - not an error - if this `holdId` has been
 * reserved before, so a retried dispatch does not charge twice.
 */
export async function reserveCredits(input: ReserveInput): Promise<ReserveResult> {
    const { userId, amount, reason, holdId } = input;

    if (!Number.isInteger(amount) || amount <= 0) {
        return { ok: false, error: "Invalid credit amount.", code: "HOLD_FAILED" };
    }

    try {
        return await withTransaction(async (tx) => {
            const [existing] = await tx
                .select({ status: creditHolds.status, amount: creditHolds.amount })
                .from(creditHolds)
                .where(eq(creditHolds.holdId, holdId))
                .limit(1);

            // Replay of a dispatch we already charged for. Do not charge again.
            if (existing) {
                return { ok: true as const, holdId, amount: existing.amount, alreadyHeld: true };
            }

            const [user] = await tx
                .select({ credits: users.credits })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (!user) {
                return { ok: false as const, error: "User not found.", code: "USER_NOT_FOUND" as const };
            }
            if (user.credits < amount) {
                return {
                    ok: false as const,
                    error: `Insufficient credits. This needs ${amount} credits and you have ${user.credits}.`,
                    code: "INSUFFICIENT_CREDITS" as const,
                    required: amount,
                    available: user.credits,
                };
            }

            // Guarded in SQL rather than trusting the read above: two requests can
            // pass the check concurrently, and only one may win the debit.
            const debited = await tx
                .update(users)
                .set({ credits: sql`${users.credits} - ${amount}` })
                .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
                .returning({ credits: users.credits });

            if (debited.length === 0) {
                return {
                    ok: false as const,
                    error: "Insufficient credits.",
                    code: "INSUFFICIENT_CREDITS" as const,
                    required: amount,
                    available: user.credits,
                };
            }

            await tx.insert(creditHolds).values({ holdId, userId, amount, reason, status: "held" });
            await tx.insert(creditTransactions).values({
                userId,
                amount: -amount,
                type: "SPEND",
                description: reason,
                currency: "INR",
            });

            return { ok: true as const, holdId, amount, alreadyHeld: false };
        });
    } catch (error: unknown) {
        console.error("[credits] reserve failed:", error);
        return { ok: false, error: "Could not reserve credits. Please try again.", code: "HOLD_FAILED" };
    }
}

/**
 * The work succeeded - keep the charge.
 *
 * No balance change; this only closes the hold so a later `release` cannot
 * refund work that was actually delivered.
 */
export async function settleCredits(holdId: string): Promise<{ ok: boolean }> {
    try {
        await withTransaction(async (tx) => {
            await tx
                .update(creditHolds)
                .set({ status: "settled" })
                .where(and(eq(creditHolds.holdId, holdId), eq(creditHolds.status, "held")));
        });
        return { ok: true };
    } catch (error: unknown) {
        // Deliberately non-fatal: the user got what they paid for, and a hold
        // stuck in `held` is a reporting problem, not a money problem.
        console.error("[credits] settle failed:", error);
        return { ok: false };
    }
}

/**
 * The work failed - refund.
 *
 * Scoped to `status = 'held'` so calling it twice, or after a settle, does
 * nothing. That is what makes it safe on a Durable Object alarm that re-fires.
 */
export async function releaseCredits(
    holdId: string,
    releaseReason: string,
): Promise<{ ok: boolean; refunded: number }> {
    try {
        return await withTransaction(async (tx) => {
            // Claim the hold first. If this updates zero rows the hold was already
            // settled or released, and there is nothing owed.
            const claimed = await tx
                .update(creditHolds)
                .set({ status: "released", releaseReason })
                .where(and(eq(creditHolds.holdId, holdId), eq(creditHolds.status, "held")))
                .returning({ userId: creditHolds.userId, amount: creditHolds.amount, reason: creditHolds.reason });

            const hold = claimed[0];
            if (!hold) return { ok: true, refunded: 0 };

            await tx
                .update(users)
                .set({ credits: sql`${users.credits} + ${hold.amount}` })
                .where(eq(users.id, hold.userId));

            // "Refund" in the description on purpose - it must be distinguishable
            // from pathfinder's score-based performance rebate, which is a
            // different mechanic that also credits the user.
            await tx.insert(creditTransactions).values({
                userId: hold.userId,
                amount: hold.amount,
                type: "REWARD",
                description: `Refund (failed): ${hold.reason} - ${releaseReason}`,
                currency: "INR",
            });

            return { ok: true, refunded: hold.amount };
        });
    } catch (error: unknown) {
        console.error("[credits] release failed:", error);
        return { ok: false, refunded: 0 };
    }
}

/** Short, ledger-safe description of why work failed. */
export function toReleaseReason(error: unknown): string {
    if (error instanceof Error) {
        if (error.name === "AbortError" || /timeout|timed out/i.test(error.message)) return "timed out";
        return error.message.slice(0, 120);
    }
    return "unknown error";
}
