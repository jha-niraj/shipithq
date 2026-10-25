"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { clearNavPending, useNavPending } from "./app-link"
import { cn } from "../lib/utils"

/**
 * A 2px bar at the top edge that starts the instant a link is clicked and finishes when the address
 * changes (navigation-speed playbook section 7). No network cost and no Next internals - Next 15 has
 * no router events - just the pending store `AppLink` writes. Mount ONCE per app shell.
 *
 * It creeps towards 85% on a long ease-out (a slow connection never sees it stall at an end), snaps
 * to 100% and fades when the new page commits. Under reduced motion it simply appears and goes.
 */
export function NavProgress({ className }: { className?: string }) {
    // useSearchParams needs a Suspense boundary of its own or it opts the whole tree out of
    // static rendering.
    return (
        <React.Suspense fallback={null}>
            <Bar className={className} />
        </React.Suspense>
    )
}

type Phase = "idle" | "start" | "run" | "done"

function Bar({ className }: { className?: string }) {
    const pending = useNavPending()
    const pathname = usePathname()
    const search = useSearchParams()?.toString() ?? ""
    const [phase, setPhase] = React.useState<Phase>("idle")
    const where = `${pathname}?${search}`
    const lastWhere = React.useRef(where)

    // A click: jump to 0 for one frame, then start the creep.
    React.useEffect(() => {
        if (!pending) return
        setPhase("start")
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("run")))
        return () => cancelAnimationFrame(raf)
    }, [pending])

    // The address changed: the new page has committed (or its skeleton has). Finish and clear.
    React.useEffect(() => {
        if (where === lastWhere.current) return
        lastWhere.current = where
        clearNavPending()
        setPhase((p) => (p === "idle" ? p : "done"))
    }, [where])

    // The 20s safety in the store cleared it without an address change (a failed navigation).
    React.useEffect(() => {
        if (!pending && (phase === "start" || phase === "run")) setPhase("done")
    }, [pending, phase])

    React.useEffect(() => {
        if (phase !== "done") return
        const t = setTimeout(() => setPhase("idle"), 300)
        return () => clearTimeout(t)
    }, [phase])

    return (
        <div
            aria-hidden
            className={cn("pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]", className)}
        >
            <div
                className={cn(
                    "h-full bg-gradient-to-r from-[#a87f1f] to-[#c9a961] motion-reduce:transition-none",
                    phase === "idle" && "w-0 opacity-0",
                    phase === "start" && "w-0 opacity-100",
                    phase === "run" && "w-[85%] opacity-100 transition-[width] duration-[8000ms] ease-[cubic-bezier(0.1,0.7,0.2,1)]",
                    phase === "done" && "w-full opacity-0 transition-[width,opacity] duration-300 ease-out",
                )}
            />
        </div>
    )
}
