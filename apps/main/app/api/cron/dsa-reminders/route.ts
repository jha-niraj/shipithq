// app/api/cron/dsa-reminders/route.ts
//
// Spaced-repetition reminder cron route.
//
// NOTE: This route is designed for a `userDSATrackingEntries` model that tracks
// spaced-repetition state (nextDueAt, status) per user+problem. That model is
// not yet present in the Drizzle schema. Until it is added, the route falls back
// to querying `practiceUserSession` for DSA problems that are IN_PROGRESS and
// have not been updated in the past 24 hours - a reasonable proxy.
//
// Once the `userDSATrackingEntries` model is added to the schema and migrated,
// swap the query block labelled "FALLBACK" for the block labelled "PRIMARY".
//
// Trigger this route via a cron job (e.g. Vercel Cron or an external scheduler)
// with the Authorization header set to: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { db, practiceUserSession, notifications, notifyEach } from '@repo/db'
import { eq, and, lte, gte } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────────────────────────
// Auth guard
// ─────────────────────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return false
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    return authHeader === `Bearer ${secret}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Start of today in UTC (midnight). */
function todayUTCStart(): Date {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cron/dsa-reminders
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    // 1. Verify cron secret
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()
        const todayStart = todayUTCStart()

        // ── PRIMARY (uncomment once userDSATrackingEntries is in schema) ──────
        //
        // const dueEntries = await db.query.userDSATrackingEntries.findMany({
        //     where: and(
        //         lte(userDSATrackingEntries.nextDueAt, now),
        //         ne(userDSATrackingEntries.status, 'COMPLETED'),
        //     ),
        //     with: {
        //         problem: { columns: { title: true, slug: true } },
        //     },
        // })
        //
        // ── FALLBACK: use practiceUserSession (DSA module, IN_PROGRESS) ───────
        //
        // Find DSA sessions that are IN_PROGRESS and were last updated > 24 h ago.
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const dueEntries = await db.query.practiceUserSession.findMany({
            where: and(
                eq(practiceUserSession.module, 'DSA'),
                eq(practiceUserSession.status, 'IN_PROGRESS'),
                lte(practiceUserSession.updatedAt, twentyFourHoursAgo),
            ),
            with: {
                problem: { columns: { title: true, slug: true } },
            },
            columns: {
                id: true,
                userId: true,
                problemId: true,
                updatedAt: true,
            },
        })

        if (!dueEntries.length) {
            return NextResponse.json({ success: true, processed: 0 })
        }

        // 2. Fetch notifications already created today to avoid duplicates.
        const existingToday = await db.query.notifications.findMany({
            where: and(
                gte(notifications.createdAt, todayStart),
                eq(notifications.platform, 'MAIN'),
            ),
            columns: { userId: true, actionUrl: true, title: true },
        })

        // Build a set of "userId::actionUrl" already notified today (dsa-reminder ones)
        const alreadyNotified = new Set<string>(
            existingToday
                .filter(n => n.title?.startsWith('Time to review'))
                .map(n => `${n.userId}::${n.actionUrl ?? ''}`)
        )

        // 3. Create notifications for each due entry that hasn't been notified yet.
        const toCreate: Parameters<typeof notifyEach>[0] = []

        for (const entry of dueEntries) {
            const actionUrl = `/practice/dsa/${entry.problem.slug}`
            const key = `${entry.userId}::${actionUrl}`

            if (alreadyNotified.has(key)) continue

            toCreate.push({
                userId: entry.userId,
                input: {
                    platform: 'MAIN',
                    kind: 'PRACTICE_REMINDER',
                    title: `Time to review: ${entry.problem.title}`,
                    body: `Your spaced-repetition schedule says it's time to revisit "${entry.problem.title}". Keep your streak going!`,
                    context: { label: 'Practice', href: '/practice' },
                    href: actionUrl,
                },
            })

            // Mark as seen within this batch to avoid duplicates inside the loop
            alreadyNotified.add(key)
        }

        if (!toCreate.length) {
            return NextResponse.json({ success: true, processed: 0 })
        }

        // 4. Bulk-insert notifications
        await notifyEach(toCreate)

        return NextResponse.json({ success: true, processed: toCreate.length })
    } catch (err: unknown) {
        console.error('[cron/dsa-reminders] error:', err)
        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : 'Internal server error',
            },
            { status: 500 }
        )
    }
}
