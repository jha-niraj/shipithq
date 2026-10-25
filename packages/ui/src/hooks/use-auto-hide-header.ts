'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A header that slides away when you scroll DOWN and comes back the moment you scroll UP.
 *
 * ## Why direction, and not "is the page scrolled"
 *
 * A navbar that only reacts to scroll POSITION is either always there - eating 60px of every
 * screen - or gone until you return to the very top. Reacting to DIRECTION is what makes it feel
 * like it is getting out of the way: reading downwards hides it, and the smallest flick upwards is
 * read as "I want the nav" and brings it straight back. That flick is the whole interaction, which
 * is why `revealDelta` is deliberately SMALLER than `hideDelta` - the gesture to summon it must be
 * cheaper than the gesture to dismiss it.
 *
 * ## The deltas exist because raw direction is unusable
 *
 * Trackpads, momentum scrolling and a phone's rubber-banding all emit tiny alternating deltas. Act
 * on every sign change and the header flickers continuously while the page settles. Requiring a few
 * pixels of consistent travel before committing removes that entirely, and the numbers are small
 * enough that no deliberate gesture is ever swallowed.
 *
 * ## Four things pin it OPEN, and each one is a bug if missed
 *
 *  - Above `hideAfter`. At the top of a page the header is part of the design, not chrome.
 *  - `hold` - passed true while a dropdown or a mobile sheet is open. Hiding a header whose menu is
 *    open leaves the PANEL floating over the page attached to nothing.
 *  - Pointer inside the header. The pointer resting on the nav while the page scrolls underneath
 *    (a wheel over an open menu, a scroll started elsewhere) must not pull it out from under them.
 *  - Keyboard focus inside the header. Tabbing through the nav can scroll the page, and a header
 *    that hides while it holds focus strands the focus ring off-screen.
 *
 * ## Mechanics
 *
 * Reads are rAF-throttled and the listener is passive, so this never blocks the scroll thread and
 * never lays out more than once a frame. The consumer applies the result as a `transform` - never a
 * height, `top` or `display` change, which would reflow the page behind it every frame.
 */
export type AutoHideOptions = {
    /** Never hide above this scroll position. */
    hideAfter?: number
    /** Downward travel, in px, before hiding commits. */
    hideDelta?: number
    /** Upward travel, in px, before revealing commits. Smaller than `hideDelta` on purpose. */
    revealDelta?: number
    /** Force it open - pass `true` while a menu, dropdown or sheet is open. */
    hold?: boolean
}

export function useAutoHideHeader<T extends HTMLElement>({
    hideAfter = 120,
    hideDelta = 8,
    revealDelta = 6,
    hold = false,
}: AutoHideOptions = {}) {
    const ref = useRef<T>(null)
    const [hidden, setHidden] = useState(false)

    // Pointer and focus live in refs, not state: they are read inside the scroll handler and must
    // not re-subscribe the listener every time they change.
    const pointerInside = useRef(false)
    const focusInside = useRef(false)
    const holdRef = useRef(hold)
    holdRef.current = hold

    // An open menu does not just prevent the NEXT hide - it must reveal immediately, or a header
    // that was already hidden opens its panel somewhere off-screen.
    useEffect(() => { if (hold) setHidden(false) }, [hold])

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const onEnter = () => { pointerInside.current = true }
        const onLeave = () => { pointerInside.current = false }
        const onFocusIn = () => { focusInside.current = true; setHidden(false) }
        const onFocusOut = (e: FocusEvent) => {
            focusInside.current = !!e.relatedTarget && el.contains(e.relatedTarget as Node)
        }
        el.addEventListener('pointerenter', onEnter)
        el.addEventListener('pointerleave', onLeave)
        el.addEventListener('focusin', onFocusIn)
        el.addEventListener('focusout', onFocusOut)
        return () => {
            el.removeEventListener('pointerenter', onEnter)
            el.removeEventListener('pointerleave', onLeave)
            el.removeEventListener('focusin', onFocusIn)
            el.removeEventListener('focusout', onFocusOut)
        }
    }, [])

    useEffect(() => {
        let last = window.scrollY
        let frame = 0

        const measure = () => {
            frame = 0
            const y = window.scrollY
            const dy = y - last

            // Above the fold, or pinned open. Reset `last` too - otherwise the travel accumulated
            // while pinned fires the moment the pin is released.
            if (y <= hideAfter || holdRef.current || pointerInside.current || focusInside.current) {
                setHidden(false)
                last = y
                return
            }

            // Ignore travel below the threshold WITHOUT updating `last`, so slow scrolling still
            // accumulates to a decision instead of being discarded a pixel at a time.
            if (dy > hideDelta) { setHidden(true); last = y }
            else if (dy < -revealDelta) { setHidden(false); last = y }
        }

        const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }

        measure()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', onScroll)
            if (frame) cancelAnimationFrame(frame)
        }
    }, [hideAfter, hideDelta, revealDelta])

    return { ref, hidden }
}
