"use server"

import { db, notifications } from "@repo/db"
import { eq, and, count, desc } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"

/*
 * The hiring app's notifications: rows written for the HIRING platform only.
 * It used to read MAIN too, which put a student's DSA reminders in a
 * recruiter's bell (plan/hiring-app HA-2).
 */

async function currentUserId(): Promise<string | null> {
    const session = await getSession(headers())
    return session?.user?.id ?? null
}

export async function getNotifications(limit = 50) {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false as const, error: "Unauthorized" }

        const mine = and(eq(notifications.userId, userId), eq(notifications.platform, "HIRING"))
        const [list, unread] = await Promise.all([
            db.query.notifications.findMany({ where: mine, orderBy: [desc(notifications.createdAt)], limit }),
            db.select({ count: count() }).from(notifications).where(and(mine, eq(notifications.read, false))),
        ])
        return { success: true as const, notifications: list, unreadCount: unread[0]?.count ?? 0 }
    } catch (error: unknown) {
        console.error("Error fetching notifications:", error instanceof Error ? error.message : error)
        return { success: false as const, error: "Failed to fetch notifications" }
    }
}

export async function markNotificationAsRead(id: string) {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false as const, error: "Unauthorized" }
        await db.update(notifications).set({ read: true })
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        return { success: true as const }
    } catch (error: unknown) {
        console.error("Error marking a notification read:", error instanceof Error ? error.message : error)
        return { success: false as const, error: "Failed to mark as read" }
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const userId = await currentUserId()
        if (!userId) return { success: false as const, error: "Unauthorized" }
        await db.update(notifications).set({ read: true })
            .where(and(eq(notifications.userId, userId), eq(notifications.platform, "HIRING"), eq(notifications.read, false)))
        return { success: true as const }
    } catch (error: unknown) {
        console.error("Error marking notifications read:", error instanceof Error ? error.message : error)
        return { success: false as const, error: "Failed to mark all as read" }
    }
}
