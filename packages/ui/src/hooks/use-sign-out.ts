"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
// The enum's VALUE: `router.prefetch(href)` with no kind is a FULL render in Next 15. AUTO = the shell,
// which for a static sign-in page is the whole page.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { markNavPending } from "../components/app-link"

/** Each app's `worker.ts` answers this before Next (and `app/api/sign-out/route.ts` in `next dev`). */
const SIGN_OUT_PATH = "/api/sign-out"

export interface UseSignOutOptions {
    /** The app's bare sign-in page (`/signin`, admin `/`). Never with a return-to: signing out is leaving. */
    signInPath: string
    /** The app's TanStack QueryClient, emptied after the request so Back cannot redraw the last person's data. */
    queryClient?: { clear: () => void } | null
    /** Anything else this app must drop once the session is gone (analytics identity...). Never throws out. */
    onSignedOut?: () => void | Promise<void>
}

export interface SignOutOptions {
    /** This control's own clean-up, run after the request and before the move (an offline replica wipe). */
    onSignedOut?: () => void | Promise<void>
}

/** Spread on the sign-out control so the sign-in page is in the router cache before the click. */
export interface SignOutPrefetchProps {
    onPointerEnter: () => void
    onFocus: () => void
    onTouchStart: () => void
}

export interface SignOutHandle {
    /** Signs out and moves to the sign-in page. Resolves false only when the request never reached the server. */
    signOut: (opts?: SignOutOptions) => Promise<boolean>
    /** True from the click until the page moves (it is not reset on success - the control is leaving). */
    pending: boolean
    prefetchProps: SignOutPrefetchProps
}

async function runQuietly(fn: (() => void | Promise<void>) | undefined, what: string): Promise<void> {
    if (!fn) return
    try {
        await fn()
    } catch (error) {
        console.error(`[sign-out] ${what} failed (signed out anyway):`, error)
    }
}

/**
 * THE sign-out (fast-sign-in.md section 4; plan/repo/speed/round-3-map.md 1.2), used by every sign-out
 * control in main, admin and shishya-main.
 *
 * 1. The sign-in page is prefetched (AUTO) on mount and again on hover, focus and touch - the
 *    middleware lets that background fetch through while still signed in (`Sec-Fetch-Dest`).
 * 2. On click: one `POST /api/sign-out`, answered by worker.ts before Next (cookies expired, 204;
 *    better-auth's real sign-out runs behind the reply). ANY response counts as signed out - a 401
 *    means the session already ended elsewhere. Only a network failure keeps the person here.
 * 3. Then `queryClient.clear()`, the app's and the control's clean-up, `router.push(signInPath)` and
 *    `router.refresh()` (drops every cached page and prefetch of the person who left). No floor, no
 *    goodbye screen, no document load.
 */
export function useSignOut({ signInPath, queryClient, onSignedOut }: UseSignOutOptions): SignOutHandle {
    const router = useRouter()
    const pathname = usePathname()
    const [pending, setPending] = React.useState(false)
    const busy = React.useRef(false)

    const prefetch = React.useCallback(() => {
        if (pathname === signInPath) return
        router.prefetch(signInPath, { kind: PrefetchKind.AUTO })
    }, [router, pathname, signInPath])

    React.useEffect(() => {
        prefetch()
    }, [prefetch])

    const signOut = React.useCallback(
        async (opts?: SignOutOptions): Promise<boolean> => {
            if (busy.current) return false
            busy.current = true
            setPending(true)
            try {
                await fetch(SIGN_OUT_PATH, {
                    method: "POST",
                    credentials: "same-origin",
                    cache: "no-store",
                    headers: { "content-type": "application/json" },
                    body: "{}",
                })
            } catch {
                busy.current = false
                setPending(false)
                return false
            }
            queryClient?.clear()
            await runQuietly(onSignedOut, "the app clean-up")
            await runQuietly(opts?.onSignedOut, "the control clean-up")
            markNavPending(signInPath)
            router.push(signInPath)
            router.refresh()
            return true
        },
        [queryClient, onSignedOut, router, signInPath],
    )

    const prefetchProps = React.useMemo<SignOutPrefetchProps>(
        () => ({ onPointerEnter: prefetch, onFocus: prefetch, onTouchStart: prefetch }),
        [prefetch],
    )

    return { signOut, pending, prefetchProps }
}
