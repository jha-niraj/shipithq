"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
// The enum's VALUE: `router.prefetch(href)` with no kind is a FULL render in Next 15. The kind is
// always passed explicitly below.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { prefetchedKind, recordPrefetch } from "./app-link"

const GAP_MS = 350
const IDLE_TIMEOUT_MS = 2000
const NO_IDLE_FALLBACK_MS = 600

type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
}
type SaveDataNavigator = Navigator & { connection?: { saveData?: boolean } }

function saveDataOn(): boolean {
    return (navigator as SaveDataNavigator).connection?.saveData === true
}

function isCurrentPage(href: string): boolean {
    try {
        return new URL(href, window.location.href).pathname === window.location.pathname
    } catch {
        return false
    }
}

/**
 * The sidebar's prefetch queue (navigation-speed playbook section 5.2; plan/repo/speed/round-3-map.md 2.1).
 *
 * WHY NOT ON SIGHT: Next fired every visible rail row's prefetch in the same instant, and on Workers
 * simultaneous requests spread across isolates - most landed on fresh ones at 2.3 to 5.5s, and a click
 * soon after could land on one. This asks for them ONE AT A TIME, 350ms apart:
 *
 *   - starts once the page is idle (after the first paint, `requestIdleCallback`, a timeout fallback);
 *   - `home` goes FIRST and in FULL (data included) - the page people return to all day; every other
 *     href is a SHELL (`PrefetchKind.AUTO`: layouts plus loading.tsx), in the order given (rail order);
 *   - skips hrefs this tab already prefetched (here or by a hover, see `recordPrefetch`) and the page
 *     on screen;
 *   - pauses while the tab is hidden and resumes where it stopped; does nothing with Save-Data on;
 *   - stops on unmount, and restarts (skipping what is done) when the list changes.
 *
 * The links themselves stay on intent, so a hover still fetches its shell at once if the queue has
 * not reached it.
 */
export function useStaggeredPrefetch(hrefs: readonly string[], options: { home?: string } = {}): void {
    const router = useRouter()
    const { home } = options
    // One string, so a new array with the same rows does not restart the queue.
    const key = [home ? `F${home}` : "", ...hrefs.filter((h) => h && h !== home && !h.startsWith("#")).map((h) => `A${h}`)]
        .filter(Boolean)
        .join("|")

    React.useEffect(() => {
        if (!key) return
        const queue = Array.from(new Set(key.split("|"))).map((entry) => ({
            full: entry[0] === "F",
            href: entry.slice(1),
        }))
        const win = window as IdleWindow
        let index = 0
        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | null = null
        let idleId: number | null = null
        let frame: number | null = null

        const clearScheduled = () => {
            if (timer) clearTimeout(timer)
            timer = null
            if (idleId !== null) win.cancelIdleCallback?.(idleId)
            idleId = null
            if (frame !== null) cancelAnimationFrame(frame)
            frame = null
        }

        const step = () => {
            timer = null
            if (cancelled || document.visibilityState === "hidden" || saveDataOn()) return
            while (index < queue.length) {
                const item = queue[index]
                index += 1
                if (!item) continue
                const done = prefetchedKind(item.href)
                if (done === "full" || (done === "auto" && !item.full) || isCurrentPage(item.href)) continue
                try {
                    router.prefetch(item.href, { kind: item.full ? PrefetchKind.FULL : PrefetchKind.AUTO })
                    recordPrefetch(item.href, item.full ? "full" : "auto")
                } catch {
                    // A prefetch is a hint; a failure costs the old wait and nothing else.
                }
                if (index < queue.length) timer = setTimeout(step, GAP_MS)
                return
            }
        }

        // After the first paint, then when the browser is idle.
        const start = () => {
            clearScheduled()
            if (cancelled || index >= queue.length) return
            frame = requestAnimationFrame(() => {
                frame = null
                if (win.requestIdleCallback) {
                    idleId = win.requestIdleCallback(() => {
                        idleId = null
                        step()
                    }, { timeout: IDLE_TIMEOUT_MS })
                } else {
                    timer = setTimeout(step, NO_IDLE_FALLBACK_MS)
                }
            })
        }

        const onVisibility = () => {
            if (document.visibilityState === "hidden") clearScheduled()
            else start()
        }

        document.addEventListener("visibilitychange", onVisibility)
        start()
        return () => {
            cancelled = true
            clearScheduled()
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [key, router])
}
