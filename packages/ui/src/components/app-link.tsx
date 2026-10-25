"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
// The enum's VALUE is needed: in Next 15 without the segment cache, `router.prefetch(href)` with
// no kind defaults to FULL (a whole server render, data included). AUTO is the shell: the layouts
// the browser lacks plus the route's loading.tsx.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"

/**
 * THE link (navigation-speed playbook section 5; plan/repo/speed/fast-sign-in-and-navigation.md).
 * `next/link` is imported nowhere else in the staff, admin and student apps - a lint rule enforces it.
 *
 *   prefetchOn="intent" (the only mode) - every link, the sidebars' included. Next's viewport
 *     prefetch is OFF; a SHELL prefetch fires once the pointer has moved inside the link for 100ms
 *     (pointermove, not mouseenter, which fires on whatever slides under a resting pointer after a
 *     click), at once on touchstart and focus, and never twice.
 *
 * The sidebars do not prefetch "on sight" any more (round-3-map.md 2.1): every visible row asked for
 * its shell in the same instant and landed on fresh Worker isolates. They hand their rail to
 * `useStaggeredPrefetch` (./use-staggered-prefetch), which asks one at a time from idle; the only
 * FULL prefetch anywhere is the workspace home, first in that queue (playbook section 5.2).
 *
 * Every plain in-app click is reported to the pending store below, which drives `NavProgress` and
 * lets a sidebar pulse the item it is waiting on.
 */
export type AppLinkProps = Omit<React.ComponentProps<typeof Link>, "prefetch"> & {
    prefetchOn?: "intent"
}

const INTENT_DELAY_MS = 100

/**
 * What this tab has prefetched, and how: "auto" (the shell) or "full" (data included). Shared with
 * `useStaggeredPrefetch` so the sidebar queue skips a page a hover already fetched. A hover still
 * prefetches whatever the queue did (Next dedupes it), so a shell that went stale is fetched again.
 */
const prefetchedThisSession = new Map<string, "auto" | "full">()

export function recordPrefetch(url: string, kind: "auto" | "full"): void {
    if (prefetchedThisSession.get(url) === "full") return
    prefetchedThisSession.set(url, kind)
}

export function prefetchedKind(url: string): "auto" | "full" | undefined {
    return prefetchedThisSession.get(url)
}

function hrefToString(href: AppLinkProps["href"]): string {
    if (typeof href === "string") return href
    const path = href.pathname ?? ""
    const query = href.query && typeof href.query === "object"
        ? new URLSearchParams(
            Object.entries(href.query).flatMap(([k, v]) =>
                Array.isArray(v) ? v.map((x) => [k, String(x)]) : v === undefined || v === null ? [] : [[k, String(v)]],
            ),
        ).toString()
        : typeof href.query === "string" ? href.query : ""
    const search = href.search ?? (query ? `?${query}` : "")
    return `${path}${search}${href.hash ? (href.hash.startsWith("#") ? href.hash : `#${href.hash}`) : ""}`
}

function isExternal(url: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//")
}

export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
    { prefetchOn = "intent", href, onClick, onPointerMove, onPointerLeave, onTouchStart, onFocus, target, ...rest },
    ref,
) {
    const router = useRouter()
    const url = hrefToString(href)
    const external = isExternal(url)
    const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const prefetched = React.useRef(false)

    const cancel = () => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
    }
    React.useEffect(() => cancel, [])
    React.useEffect(() => {
        prefetched.current = false
    }, [url])

    const prefetchShell = () => {
        cancel()
        if (prefetched.current || external || prefetchOn !== "intent" || url.startsWith("#")) return
        // A link to THIS page with other params is a tab or filter that writes the address in place
        // (navigation-speed playbook section 4, case a): its route is already on screen.
        if (samePath(url)) return
        prefetched.current = true
        router.prefetch(url, { kind: PrefetchKind.AUTO })
        recordPrefetch(url, "auto")
    }

    return (
        <Link
            ref={ref}
            href={href}
            target={target}
            // Next's viewport prefetch is off: intent (above) or the sidebar queue fetches the shell.
            prefetch={false}
            onPointerMove={(e) => {
                onPointerMove?.(e)
                if (prefetchOn === "intent" && !prefetched.current && !timer.current) {
                    timer.current = setTimeout(prefetchShell, INTENT_DELAY_MS)
                }
            }}
            onPointerLeave={(e) => {
                onPointerLeave?.(e)
                cancel()
            }}
            onTouchStart={(e) => {
                onTouchStart?.(e)
                if (prefetchOn === "intent") prefetchShell()
            }}
            onFocus={(e) => {
                onFocus?.(e)
                if (prefetchOn === "intent") prefetchShell()
            }}
            onClick={(e) => {
                cancel()
                onClick?.(e)
                if (
                    e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
                    external || (target && target !== "_self") || url.startsWith("#")
                ) return
                markNavPending(url)
            }}
            {...rest}
        />
    )
})

// ─────────────────────────────────────────────────────────────────────────────
// The pending-navigation store (playbook section 7: acknowledge the click the instant it lands).
// A module store, not context: any link anywhere can report, the bar and the sidebar read it.
// It clears when NavProgress sees the address change, or after 20s whatever happens.
// ─────────────────────────────────────────────────────────────────────────────

type Pending = { href: string; at: number } | null
let pending: Pending = null
let safety: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function samePlace(href: string): boolean {
    if (typeof window === "undefined") return false
    try {
        const next = new URL(href, window.location.href)
        return next.pathname + next.search === window.location.pathname + window.location.search
    } catch {
        return false
    }
}

function samePath(href: string): boolean {
    if (typeof window === "undefined") return false
    try {
        return new URL(href, window.location.href).pathname === window.location.pathname
    } catch {
        return false
    }
}

/** Report a navigation that has started. `router.push` callers may call this themselves. */
export function markNavPending(href: string): void {
    if (samePlace(href)) return
    pending = { href, at: Date.now() }
    if (safety) clearTimeout(safety)
    safety = setTimeout(clearNavPending, 20_000)
    emit()
}

export function clearNavPending(): void {
    if (!pending) return
    pending = null
    if (safety) clearTimeout(safety)
    safety = null
    emit()
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** The navigation in flight, or null. A sidebar compares `href` with an item's to pulse it. */
export function useNavPending(): Pending {
    return React.useSyncExternalStore(subscribe, () => pending, () => null)
}
