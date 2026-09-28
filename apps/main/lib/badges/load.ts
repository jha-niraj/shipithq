import "server-only"
import { desc, eq } from "drizzle-orm"
import { db, userBadges } from "@repo/db"
import { BADGE_BY_KEY, BADGE_MODULES, badgeStates, type BadgeModule } from "@repo/db/badges"
import { INCIDENT_BADGES } from "@/content/incidents/badges"
import { loadIncidentStats } from "@/lib/incidents/stats"

/**
 * Every badge for one user, platform and Incidents together (plan/badges BDG-4 to BDG-6),
 * in one shape the views draw with `BadgeCard`. `glyph` is a name: platform glyphs from
 * `components/badges/glyphs`, Incidents' prefixed `incidents:`.
 */

export interface BadgeView {
    key: string
    module: BadgeModule
    title: string
    description: string
    glyph: string
    earned: boolean
    earnedAt: string | null
    progress: { value: number; max: number; label: string } | null
}

export async function loadBadges(userId: string): Promise<BadgeView[]> {
    const [platform, incidents] = await Promise.all([badgeStates(db, userId), loadIncidentStats(userId)])
    const views: BadgeView[] = platform.map((b) => ({
        key: b.key, module: b.module, title: b.title, description: b.description, glyph: b.glyph,
        earned: b.earned, earnedAt: b.earnedAt,
        progress: b.earned ? null : { value: b.value, max: b.max, label: `${b.value.toLocaleString("en")} of ${b.max.toLocaleString("en")}${b.unit ? ` ${b.unit}` : ""}` },
    }))
    for (const b of INCIDENT_BADGES) {
        const earned = incidents.badges.includes(b.key)
        views.push({
            key: `incidents:${b.key}`, module: "incidents", title: b.title, description: b.description, glyph: `incidents:${b.key}`,
            earned, earnedAt: incidents.badgeDates[b.key] ?? null,
            progress: !earned && b.progress ? b.progress(incidents.facts) : null,
        })
    }
    return views
}

/** Earned newest first, then locked closest to earning first. */
export function byStanding(a: BadgeView, b: BadgeView): number {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    if (a.earned) return (b.earnedAt ?? "").localeCompare(a.earnedAt ?? "")
    const pa = a.progress ? a.progress.value / Math.max(1, a.progress.max) : 0
    const pb = b.progress ? b.progress.value / Math.max(1, b.progress.max) : 0
    return pb - pa
}

export { BADGE_MODULES }

/**
 * Earned badges only, newest first (the public profile, BDG-6): read from `user_badge`
 * with no measuring, so a stranger's visit costs one query and shows nothing locked.
 */
export async function loadEarnedBadges(userId: string): Promise<BadgeView[]> {
    const rows = await db.select({ key: userBadges.badgeKey, at: userBadges.earnedAt }).from(userBadges)
        .where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt))
    const out: BadgeView[] = []
    for (const r of rows) {
        if (r.key.startsWith("incidents:")) {
            const b = INCIDENT_BADGES.find((x) => `incidents:${x.key}` === r.key)
            if (b) out.push({ key: r.key, module: "incidents", title: b.title, description: b.description, glyph: r.key, earned: true, earnedAt: r.at.toISOString(), progress: null })
            continue
        }
        const b = BADGE_BY_KEY.get(r.key)
        if (b) out.push({ key: b.key, module: b.module, title: b.title, description: b.description, glyph: b.glyph, earned: true, earnedAt: r.at.toISOString(), progress: null })
    }
    return out
}
