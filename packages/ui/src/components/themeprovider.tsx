"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useTheme } from "next-themes"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

/** The click point the reveal circle expands from. */
export type ThemeTransitionOrigin = { x: number; y: number }

type DocumentWithViewTransition = Document & {
    startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

/**
 * Animate a theme change with the View Transitions API: a directional horizontal WIPE of the
 * new theme, chosen by direction - light->dark wipes in LEFT-to-RIGHT, dark->light wipes in
 * RIGHT-to-LEFT. A straight `clip-path: inset()` wipe (rather than a corner-origin circle)
 * keeps the reveal edge vertical and avoids the diagonal circle glitch.
 *
 * `flushSync` makes next-themes apply the html class synchronously inside the transition
 * callback so the "after" snapshot is correct.
 *
 * NO app may set next-themes `disableTransitionOnChange` alongside this. That option appends
 * `*{transition:none!important}` to <head>, swaps the class, forces a reflow, then removes the
 * style on a `setTimeout(..., 1)`. Run inside a View Transition, that removal lands ~1ms into
 * the 0.8s wipe: it restyles the live DOM sitting under the snapshots and hands every element
 * its transitions back mid-sweep, so tearing the pseudo-elements down at 0.8s reveals a DOM
 * that is already part-way through re-transitioning. That was the flicker.
 *
 * The clip is driven by a CSS keyframe (see globals.css), NOT a JS `.animate()` after
 * `transition.ready`. Animating after `ready` left one frame where the new snapshot was shown
 * unclipped before the clip re-applied - the visible "flash then jump" glitch. Binding the
 * keyframe (with `both` fill) means the new snapshot is clipped from its very first frame, so
 * the reveal is clean. The start clip (--vt-clip-from) is set synchronously before the swap.
 *
 * Falls back to an instant, un-animated apply when the API is unsupported or the user prefers
 * reduced motion - never blocks the theme change.
 */
export function startThemeTransition(apply: () => void, origin?: ThemeTransitionOrigin): void {
    const doc = typeof document !== "undefined"
        ? (document as DocumentWithViewTransition)
        : undefined
    const prefersReduced = typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!doc?.startViewTransition || prefersReduced) {
        apply()
        return
    }

    const root = document.documentElement
    if (origin) {
        // Direction is chosen by the theme we are switching TO, not the click point.
        // next-themes (attribute="class") puts `dark` on <html> for the dark theme, so the
        // absence of that class right now means this click is turning dark ON.
        const goingToDark = !root.classList.contains("dark")
        // A horizontal wipe (clip-path inset), not a corner circle - light -> dark wipes in
        // LEFT-to-RIGHT, dark -> light wipes in RIGHT-to-LEFT. The keyframe animates this start
        // clip to inset(0 0 0 0); collapsing the far edge to 100% hides the new snapshot there.
        const clipFrom = goingToDark ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)"
        root.style.setProperty("--vt-clip-from", clipFrom)
    }
    // Drives which CSS animates the pseudo-elements: a directional wipe on a user toggle
    // (origin present), or a plain cross-fade for a programmatic change (no origin).
    root.dataset.themeTransition = origin ? "reveal" : "fade"

    const transition = doc.startViewTransition(() => flushSync(apply))
    transition.finished
        .catch(() => {
            // A superseding transition (rapid re-toggle) rejects - safe to ignore.
        })
        .finally(() => {
            delete root.dataset.themeTransition
            root.style.removeProperty("--vt-clip-from")
        })
}

export { useTheme };