"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db,
    users,
    creditTransactions,
    creditTransfers,
    withTransaction
} from "@repo/db"
import { and, eq, sql, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import cuid from "cuid"

export async function fetchXpAndCredit() {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            throw new Error('User not authenticated')
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: {
                currentXp: true,
                totalXp: true,
                credits: true,
                currentLevel: true,
            },
        })

        if (!user) {
            throw new Error('User not found')
        }

        return {
            xp: user.currentXp,
            currentXp: user.currentXp,
            totalXp: user.totalXp,
            credits: user.credits,
            currentLevel: user.currentLevel,
        }
    } catch (error) {
        console.error('Error fetching XP and credits:', error)
        return null
    }
}

export async function convertXpToCredits(xpToConvert: number) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            throw new Error('User not authenticated')
        }

        if (xpToConvert <= 0) {
            throw new Error('XP amount must be positive')
        }

        const result = await withTransaction(async (tx) => {
            const user = await tx.query.users.findFirst({
                where: eq(users.id, session.user.id),
                columns: { currentXp: true, credits: true, totalXp: true },
            })

            if (!user) {
                throw new Error('User not found')
            }

            if (user.currentXp < xpToConvert) {
                throw new Error('Insufficient current XP')
            }

            const creditsToAdd = Math.floor(xpToConvert / 100)

            if (creditsToAdd === 0) {
                throw new Error('Need at least 100 XP to convert to credits')
            }

            const [updatedUser] = await tx.update(users)
                .set({
                    currentXp: sql`${users.currentXp} - ${xpToConvert}`,
                    credits: sql`${users.credits} + ${creditsToAdd}`,
                })
                .where(eq(users.id, session.user.id))
                .returning()

            await tx.insert(creditTransactions).values({
                userId: session.user.id,
                amount: creditsToAdd,
                type: 'BONUS',
                currency: 'INR',
                description: `Converted ${xpToConvert} XP to ${creditsToAdd} credits`,
            })

            if (!updatedUser) throw new Error("Failed to update user")
            return {
                newXp: updatedUser.currentXp,
                newCredits: updatedUser.credits,
                creditsGained: creditsToAdd,
                totalXp: user.totalXp,
            }
        })

        return result
    } catch (error) {
        console.error('Error converting XP to credits:', error)
        throw error
    }
}

export async function transferCredits(senderId: string, receiverId: string, amount: number) {
    if (senderId === receiverId) throw new Error("Cannot transfer credits to yourself")
    console.log("Amount: " + amount)

    const sender = await db.query.users.findFirst({ where: eq(users.id, senderId) })
    const receiver = await db.query.users.findFirst({ where: eq(users.id, receiverId) })

    if (!sender || !receiver) throw new Error("Sender or receiver not found")
    if (sender.credits < amount) throw new Error("Insufficient credits")

    const result = await withTransaction(async (tx) => {
        // Guarded in SQL, not by the balance read above. This is the one debit in
        // the product where losing the race does more than overdraw an account:
        // two concurrent transfers from the same sender both pass a read-then-write
        // check, both debit the sender and both credit a receiver, so the sender
        // goes negative AND credits that never existed enter circulation. Zero rows
        // updated means someone else got there first; throwing rolls the transfer
        // back before any receiver is credited.
        const debited = await tx.update(users)
            .set({
                credits: sql`${users.credits} - ${amount}`,
                creditsShared: sql`${users.creditsShared} + ${amount}`,
            })
            .where(and(eq(users.id, senderId), sql`${users.credits} >= ${amount}`))
            .returning({ credits: users.credits })

        if (debited.length === 0) throw new Error("Insufficient credits")

        await tx.update(users)
            .set({ credits: sql`${users.credits} + ${amount}` })
            .where(eq(users.id, receiverId))

        await tx.insert(creditTransfers).values({
            senderId,
            receiverId,
            amount,
            transferReference: cuid(),
        })
    })

    revalidatePath("/credits")
    return result
}

export async function getTransferHistory(userId: string) {
    const [sent, received] = await Promise.all([
        db.query.creditTransfers.findMany({
            where: eq(creditTransfers.senderId, userId),
            with: { receiver: { columns: { username: true, name: true } } },
            orderBy: desc(creditTransfers.createdAt),
        }),
        db.query.creditTransfers.findMany({
            where: eq(creditTransfers.receiverId, userId),
            with: { sender: { columns: { username: true, name: true } } },
            orderBy: desc(creditTransfers.createdAt),
        }),
    ])

    const history = [
        ...sent.map(transfer => ({
            type: "sent",
            amount: transfer.amount,
            recipientName: transfer.receiver ? (transfer.receiver.name || transfer.receiver.username) : "Deleted user",
            createdAt: transfer.createdAt,
        })),
        ...received.map(transfer => ({
            type: "received",
            amount: transfer.amount,
            senderName: transfer.sender ? (transfer.sender.name || transfer.sender.username) : "Deleted user",
            createdAt: transfer.createdAt,
        })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return history
}
