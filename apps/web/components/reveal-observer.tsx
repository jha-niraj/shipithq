"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * The one piece of JavaScript behind every scroll reveal on the marketing site.
 *
 * Mounted once in the root layout. It watches for anything carrying `sh-reveal` and
 * adds `sh-in` as it enters the viewport; the transition itself is CSS, in
 * `@repo/ui/styles/globals.css`.
 *
 * ── Why a class and one observer, rather than a component each ──
 *
 * The previous `<Reveal>` was a framer-motion client component, so a page with fifty
 * revealed blocks paid for fifty client components, fifty effects and the motion
 * runtime. Marking elements with a class keeps the cost FLAT: fifty blocks, one
 * observer, one client component - and `<Reveal>` itself becomes a server component
 * whose children stay in the initial HTML for crawlers.
 *
 * That matters on a marketing site specifically, where the Lighthouse score is
 * decided by main-thread JavaScript rather than by bytes. See
 * `plan/web/polish/06-performance.md`.
 *
 * ── Three ways an element can arrive, all covered ──
 *
 *  1. In the initial HTML - picked up by the scan on mount.
 *  2. On a client-side navigation - `usePathname` changes, the effect re-runs and
 *     rescans. Without this, every page after the first renders its blocks at the
 *     stylesheet's starting opacity and only the failsafe saves them.
 *  3. Mounted later by a `<LazyMount>` or a `dynamic()` section - caught by the
 *     MutationObserver, batched into one rAF so a burst of inserted nodes costs a
 *     single scan.
 *
 * Elements unobserve themselves once fired, so the watched set shrinks as the reader
 * scrolls rather than growing with the page.
 *
 * ── Never before React has hydrated the element ──
 *
 * This observer mounts in the root layout, so it runs as soon as the layout hydrates; a
 * page behind its `loading.tsx` boundary hydrates later. Adding `sh-in` to an element
 * React has not hydrated yet is a hydration mismatch (React 19 reports added attributes
 * too, so a data attribute would not dodge it): every public page logged one (found
 * 2026-10-07, plan/web/story ST-11). So an element is revealed only once React has
 * attached its fiber to the node; one that intersects earlier waits a frame and retries.
 * If JavaScript never gets that far, the CSS failsafe at 3s still reveals everything.
 */
const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"))

export function RevealObserver() {
    const pathname = usePathname()

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") {
            // No IntersectionObserver at all. Reveal everything immediately rather
            // than leaving the page at the stylesheet's starting opacity until the
            // failsafe is due.
            document.querySelectorAll(".sh-reveal").forEach((el) => el.classList.add("sh-in"))
            return
        }

        // Seen on screen, but React has not hydrated them yet: retried each frame.
        const waiting = new Set<Element>()
        let retry = 0
        const reveal = (el: Element) => {
            if (!hydrated(el)) {
                waiting.add(el)
                if (!retry) retry = requestAnimationFrame(flush)
                return
            }
            waiting.delete(el)
            el.classList.add("sh-in")
            observer.unobserve(el)
        }
        const flush = () => {
            retry = 0
            waiting.forEach(reveal)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) if (entry.isIntersecting) reveal(entry.target)
            },
            // Fires slightly before the element is fully on screen, so the motion has
            // resolved by the time the reader's eye reaches it rather than starting
            // under their nose.
            { rootMargin: "0px 0px -60px 0px", threshold: 0.01 },
        )

        // `:not(.sh-in)` so a rescan never re-observes something that already fired.
        const scan = () => {
            document.querySelectorAll(".sh-reveal:not(.sh-in)").forEach((el) => observer.observe(el))
        }

        scan()

        let queued = 0
        const mutations = new MutationObserver(() => {
            if (queued) return
            queued = requestAnimationFrame(() => {
                queued = 0
                scan()
            })
        })
        mutations.observe(document.body, { childList: true, subtree: true })

        return () => {
            if (queued) cancelAnimationFrame(queued)
            if (retry) cancelAnimationFrame(retry)
            mutations.disconnect()
            observer.disconnect()
        }
    }, [pathname])

    return null
}

export default RevealObserver
