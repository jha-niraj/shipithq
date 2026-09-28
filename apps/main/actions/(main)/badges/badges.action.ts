"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { db } from "@repo/db"
import { BADGE_BY_KEY, markBadgesSeen, unseenBadges } from "@repo/db/badges"

/**
 * Badges earned since the last look, for the shell's toast (plan/badges BDG-8), marked
 * seen as they are handed over so each toasts once. Signed out: none.
 */
export async function takeUnseenBadges(): Promise<{ key: string; title: string; description: string }[]> {
    const session = await getSession(await headers())
    const uid = session?.user?.id
    if (!uid) return []
    const rows = await unseenBadges(db, uid)
    if (!rows.length) return []
    await markBadgesSeen(db, uid, rows.map((r) => r.key))
    return rows.flatMap((r) => {
        const b = BADGE_BY_KEY.get(r.key)
        return b ? [{ key: b.key, title: b.title, description: b.description }] : []
    })
}
