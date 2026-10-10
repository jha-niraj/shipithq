import { and, eq, sql } from 'drizzle-orm'
import { withTransaction, pathfinderGoals, pathfinderVerifications, users, creditTransactions } from '@repo/db'

/**
 * Mark a verification passed and pay its refund, exactly once.
 *
 * The flip only lands when `passed` is still false, and the goal update and the
 * refund ride in the same transaction. Two submits that both read `passed =
 * false` race here; the row lock makes the second one re-check, find it true and
 * get nothing back, so it returns false and pays nothing (plan/pathfinder PF-15).
 *
 * Returns true only for the call that flipped it; the caller awards XP on true.
 */
export async function settleVerification(input: {
    verificationId: string
    goalId: string
    userId: string | null
    overallScore: number
    refundCredits: number
    refundDescription: string
}): Promise<boolean> {
    const { verificationId, goalId, userId, overallScore, refundCredits, refundDescription } = input
    return withTransaction(async (tx) => {
        const [row] = await tx.update(pathfinderVerifications)
            .set({ passed: true, overallScore, completedAt: new Date() })
            .where(and(eq(pathfinderVerifications.id, verificationId), eq(pathfinderVerifications.passed, false)))
            .returning({ id: pathfinderVerifications.id })
        if (!row) return false

        await tx.update(pathfinderGoals)
            .set({ status: 'COMPLETED', completedAt: new Date(), progressPercent: 100 })
            .where(eq(pathfinderGoals.id, goalId))

        if (refundCredits > 0 && userId) {
            await tx.update(users)
                .set({ credits: sql`${users.credits} + ${refundCredits}` })
                .where(eq(users.id, userId))
            await tx.insert(creditTransactions).values({
                userId,
                amount: refundCredits,
                type: 'REWARD',
                description: refundDescription,
                currency: 'INR',
            })
        }
        return true
    })
}
