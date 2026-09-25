/**
 * Motion shared by the app shell's two side panels. Ported from gurukulhq's `lib/motion.ts`; shared by apps/main and apps/hiring (plan/hiring-app HA-1).
 *
 * The sidebar and the AI panel both slide in from an edge; one spring for both means two
 * panels a person opens seconds apart move the same way and cannot drift apart.
 */
export const PANEL_SPRING = { type: "spring", stiffness: 300, damping: 34 } as const

/** Far enough off-screen that the sidebar's shadow is not visible at the edge. */
export const OFFSCREEN_LEFT = "-110%"

/**
 * The sidebar slides on every hover of the left edge, which is a lot of motion over a day,
 * and `prefers-reduced-motion` is an accessibility setting. The panel still MOVES (it is the
 * same element in two places), it just arrives at once. `duration: 0` rather than skipping
 * the animation, so it still ends up where the state says.
 */
export function panelTransition(reduced: boolean | null) {
    return reduced ? { duration: 0 } : PANEL_SPRING
}
