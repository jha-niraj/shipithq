/**
 * The Incidents badges' glyphs (plan/incidents INC-12). The medal, the card and the glow
 * are the shared base in packages/ui (`BadgeCard`, plan/ui-pass UI-20); a module brings
 * only its glyphs: strokes around (0, 0) in the medal's 120 box.
 */

export type BadgeGlyph = "siren" | "target" | "eye" | "flame" | "topic"

export const INCIDENT_GLYPHS: Record<BadgeGlyph, React.ReactElement> = {
    siren: <path d="M-10 6 v-6 a10 10 0 0 1 20 0 v6 z M-14 10 h28 M0 -18 v-4 M-14 -12 l-3 -3 M14 -12 l3 -3" />,
    target: <><circle r={12} /><circle r={6} /><path d="M0 0 l14 -14 M9 -14 h5 v5" /></>,
    eye: <><path d="M-15 0 c8 -12 22 -12 30 0 c-8 12 -22 12 -30 0 z" /><circle r={4.5} /></>,
    flame: <path d="M0 -15 c7 7 11 12 11 18 a11 11 0 0 1 -22 0 c0 -5 3 -8 6 -11 c0 4 2 6 5 6 c0 -5 -2 -9 0 -13 z" />,
    topic: <><rect x={-12} y={-12} width={24} height={24} rx={5} /><path d="M-6 0 l4 4 l8 -8" /></>,
}

export function glyphFor(key: string): BadgeGlyph {
    return key === "first-case" ? "siren" : key === "called-it" ? "target" : key === "sharp-eye" ? "eye" : key === "on-call" ? "flame" : "topic"
}
