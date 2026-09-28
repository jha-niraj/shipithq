/**
 * The platform badges' glyphs (plan/badges BDG-4): strokes around (0, 0) in the medal's
 * 120 box, about 30 across, drawn by `BadgeMedal` (packages/ui). One per `glyph` name in
 * `@repo/db/badges`; an unknown name falls back to a star.
 */

export const BADGE_GLYPHS: Record<string, React.ReactElement> = {
    code: <path d="M-6 -10 l-9 10 l9 10 M6 -10 l9 10 l-9 10 M3 -14 l-6 28" />,
    stack: <path d="M-14 -6 l14 -8 l14 8 l-14 8 z M-14 2 l14 8 l14 -8 M-14 10 l14 8 l14 -8" />,
    mountain: <path d="M-16 12 l11 -20 l6 10 l4 -6 l11 16 z M-8 -2 l3 2 l3 -2" />,
    bolt: <path d="M3 -16 l-12 18 h9 l-3 14 l12 -18 h-9 z" />,
    check: <><circle r={14} /><path d="M-7 0 l5 5 l9 -10" /></>,
    flag: <path d="M-10 16 v-32 M-10 -14 h18 l-4 6 l4 6 h-18" />,
    rocket: <path d="M0 -16 c7 5 8 14 5 22 h-10 c-3 -8 -2 -17 5 -22 z M-5 6 l-6 6 l2 -9 M5 6 l6 6 l-2 -9 M-2 10 l2 6 l2 -6 M0 -4 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />,
    mic: <path d="M-5 -14 h10 v14 a5 5 0 0 1 -10 0 z M-10 -2 a10 10 0 0 0 20 0 M0 8 v8 M-6 16 h12" />,
    star: <path d="M0 -15 l4.5 9.5 l10.5 1.5 l-7.5 7.5 l1.8 10.5 l-9.3 -5 l-9.3 5 l1.8 -10.5 l-7.5 -7.5 l10.5 -1.5 z" />,
    target: <><circle r={13} /><circle r={7} /><circle r={1.5} /></>,
    shield: <path d="M0 -16 l13 5 v8 c0 9 -6 15 -13 19 c-7 -4 -13 -10 -13 -19 v-8 z M-6 0 l4 4 l8 -8" />,
    briefcase: <path d="M-15 -6 h30 v18 h-30 z M-6 -6 v-5 h12 v5 M-15 2 h30" />,
    send: <path d="M-15 -2 l30 -12 l-10 28 l-6 -10 z M-1 4 l16 -18" />,
    flame: <path d="M0 -15 c7 7 11 12 11 18 a11 11 0 0 1 -22 0 c0 -5 3 -8 6 -11 c0 4 2 6 5 6 c0 -5 -2 -9 0 -13 z" />,
    calendar: <path d="M-14 -10 h28 v24 h-28 z M-14 -3 h28 M-7 -15 v8 M7 -15 v8 M-7 4 h4 M3 4 h4 M-7 9 h4" />,
    grid: <path d="M-13 -13 h8 v8 h-8 z M5 -13 h8 v8 h-8 z M-13 5 h8 v8 h-8 z M5 5 h8 v8 h-8 z M-4 -9 h8 M-4 9 h8 M-9 -4 v8 M9 -4 v8" />,
    compass: <><circle r={14} /><path d="M6 -6 l-3 9 l-9 3 l3 -9 z" /></>,
    file: <path d="M-10 -15 h13 l8 8 v22 h-21 z M3 -15 v8 h8 M-5 1 h11 M-5 7 h11" />,
    letter: <path d="M-15 -10 h30 v20 h-30 z M-15 -10 l15 11 l15 -11" />,
    user: <><circle cy={-6} r={6} /><path d="M-13 14 a13 11 0 0 1 26 0" /></>,
    bulb: <path d="M-6 8 c0 -5 -8 -7 -8 -16 a14 14 0 0 1 28 0 c0 9 -8 11 -8 16 z M-5 12 h10 M-3 16 h6" />,
    gift: <path d="M-14 -4 h28 v7 h-28 z M-12 3 v13 h24 v-13 M0 -4 v20 M0 -4 c-4 -10 -12 -8 -9 -2 c1 2 5 2 9 2 c4 0 8 0 9 -2 c3 -6 -5 -8 -9 2" />,
}

export function badgeGlyph(name: string): React.ReactElement {
    return BADGE_GLYPHS[name] ?? BADGE_GLYPHS.star!
}
