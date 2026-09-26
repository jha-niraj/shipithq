import { withTransaction, creditTransactions, users } from "@repo/db"
import { and, eq, sql } from "drizzle-orm"
import { SIGNUP_GRANT_CREDITS } from "@repo/pricing"

// ─────────────────────────────────────────────────────────────────────────────
// Credit grants - credits given, not spent.
//
// The counterpart to `hold.ts`, which owns spending. A grant has no hold and
// nothing to settle: it is a one-way increase paired with the ledger row that
// explains it.
//
// This exists because `user.credits` used to default to 100 at the DATABASE
// level. Every user therefore had a balance that no `credit_transaction` row
// accounted for - the ledger was empty for every user in production while
// balances were not. There was no way to tell a granted credit from a purchased
// one, and no way to reconcile the two numbers. The column default is now 0 and
// this is the only thing that grants a new user their opening balance.
//
// The amount lives in `lib/credits/pricing.ts`-adjacent config rather than here;
// see `plan/credits/overview.md` for why it is 100.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The welcome grant for a new account.
 *
 * Decided in `plan/credits/overview.md`: enough to genuinely try the product -
 * roughly 6 cover letters, or 5 JD-tailored resumes, or 3 quizzes. The number lives in
 * `@repo/pricing` so the marketing site quotes the same one.
 */
export { SIGNUP_GRANT_CREDITS }

/**
 * The ledger description that marks a signup grant.
 *
 * Doubles as the idempotency key: the grant is skipped when a row with this
 * exact description already exists for the user. Changing this string would make
 * every existing user eligible for a second grant, so it is a constant rather
 * than an inline literal.
 */
const SIGNUP_GRANT_DESCRIPTION = "Welcome grant: 100 credits to get started"

export type GrantResult =
    | { ok: true; granted: number; alreadyGranted: boolean }
    | { ok: false; error: string }

/**
 * Give a new user their opening credit balance, exactly once.
 *
 * Safe to call repeatedly. `finalizeSignup` reaches this from two directions -
 * the register page right after OTP verification, and onboarding, which is the
 * only pass for users who arrived through Google or a magic link and never
 * touched the register page. Both can also fire within the same second for a
 * fast user.
 *
 * The existence check and the two writes are in ONE transaction for that reason:
 * a read-then-write across separate awaits lets two concurrent calls both see
 * "not granted" and both grant. `withTransaction` rather than `db.transaction`,
 * which throws on the neon-http driver.
 *
 * Callers must treat a failure as non-fatal. A user with 0 credits can be
 * granted later; a user whose signup failed because the grant did cannot.
 */
export async function grantSignupCredits(userId: string): Promise<GrantResult> {
    try {
        return await withTransaction(async (tx) => {
            const [existing] = await tx
                .select({ id: creditTransactions.id })
                .from(creditTransactions)
                .where(
                    and(
                        eq(creditTransactions.userId, userId),
                        eq(creditTransactions.description, SIGNUP_GRANT_DESCRIPTION),
                    ),
                )
                .limit(1)

            if (existing) {
                return { ok: true as const, granted: 0, alreadyGranted: true }
            }

            // Guarded on the user existing, so a deleted account between the
            // session read and here does not create an orphan ledger row.
            const credited = await tx
                .update(users)
                .set({
                    credits: sql`${users.credits} + ${SIGNUP_GRANT_CREDITS}`,
                    // `totalCredits` is the lifetime-received counter the profile
                    // shows. The grant counts toward it; spending does not reduce it.
                    totalCredits: sql`${users.totalCredits} + ${SIGNUP_GRANT_CREDITS}`,
                })
                .where(eq(users.id, userId))
                .returning({ id: users.id })

            if (credited.length === 0) {
                return { ok: false as const, error: "User not found." }
            }

            await tx.insert(creditTransactions).values({
                userId,
                amount: SIGNUP_GRANT_CREDITS,
                type: "BONUS",
                description: SIGNUP_GRANT_DESCRIPTION,
                currency: "INR",
            })

            return { ok: true as const, granted: SIGNUP_GRANT_CREDITS, alreadyGranted: false }
        })
    } catch (error: unknown) {
        console.error("[credits] signup grant failed:", error)
        return { ok: false, error: "Could not grant signup credits." }
    }
}
