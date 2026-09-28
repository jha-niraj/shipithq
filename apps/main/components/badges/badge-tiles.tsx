import { BadgeCard, BadgeGrid, BadgeMedalStyles } from "@repo/ui/components/badge-card"
import type { BadgeView } from "@/lib/badges/load"
import { INCIDENT_GLYPHS, glyphFor } from "@/components/incidents/badge-medal"
import { badgeGlyph } from "./glyphs"

/** Badges as glowing cards (plan/badges): the one way the app draws a set of them. */

export function glyphOf(b: Pick<BadgeView, "glyph">) {
    return b.glyph.startsWith("incidents:") ? INCIDENT_GLYPHS[glyphFor(b.glyph.slice("incidents:".length))] : badgeGlyph(b.glyph)
}

export function BadgeTiles({ badges, eyebrow, showProgress = true, className }: {
    badges: BadgeView[]
    /** Show each badge's module above its title (mixed sets). */
    eyebrow?: (b: BadgeView) => string
    /** Off for strangers (the public profile shows earned badges only). */
    showProgress?: boolean
    className?: string
}) {
    return (
        <>
            <BadgeMedalStyles />
            <BadgeGrid className={className}>
                {badges.map((b) => (
                    <BadgeCard
                        key={b.key}
                        id={b.key.replace(/[^a-z0-9-]/gi, "-")}
                        glyph={glyphOf(b)}
                        title={b.title}
                        description={b.description}
                        earned={b.earned}
                        earnedAt={b.earnedAt}
                        progress={showProgress ? b.progress : null}
                        eyebrow={eyebrow?.(b)}
                    />
                ))}
            </BadgeGrid>
        </>
    )
}
