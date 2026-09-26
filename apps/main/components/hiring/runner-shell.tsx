"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"
import type { RunnerAttempt } from "@/actions/hiring/run.action"

/*
 * The frame every round runner shares (plan/hiring-rounds HR-13 layout): a
 * slim top bar with where this is, the round, the server's timer, progress and
 * Exit (asks first; the timer keeps running). And the clock itself.
 */

export function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`
}

/** Time left by the server's clock; calls `onZero` once when it runs out. */
export function useRoundClock(attempt: RunnerAttempt, onZero: () => void): number {
    const offset = useRef(attempt.serverNow - Date.now())
    const [remaining, setRemaining] = useState(() => attempt.endsAt - (Date.now() + offset.current))
    const fired = useRef(false)
    const zero = useRef(onZero)
    zero.current = onZero
    useEffect(() => {
        const t = window.setInterval(() => {
            const left = attempt.endsAt - (Date.now() + offset.current)
            setRemaining(left)
            if (left <= 0 && !fired.current) { fired.current = true; zero.current() }
        }, 250)
        return () => window.clearInterval(t)
    }, [attempt.endsAt])
    return remaining
}

export function RunnerShell({ attempt, remaining, answered, total, onExit, children }: {
    attempt: RunnerAttempt
    remaining: number | null
    answered?: number
    total?: number
    onExit: (() => void) | null
    children: React.ReactNode
}) {
    const [confirmExit, setConfirmExit] = useState(false)
    const low = remaining !== null && remaining <= 60_000
    const showProgress = typeof total === "number" && total > 0
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
                <div className="flex h-14 items-center gap-3 px-4">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{attempt.contextLabel}</p>
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">Round {attempt.roundNumber} of {attempt.roundCount} · {attempt.roundTitle}</p>
                    </div>
                    {remaining !== null && (
                        <span
                            aria-label="Time left"
                            className={cn("rounded-lg px-2.5 py-1 font-mono text-sm tabular-nums", low ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white")}
                        >
                            {formatClock(remaining)}
                        </span>
                    )}
                    {showProgress && <span className="hidden text-sm tabular-nums text-neutral-500 sm:inline dark:text-neutral-400">{answered ?? 0}/{total}</span>}
                    {onExit && (
                        confirmExit ? (
                            <div className="flex items-center gap-1.5">
                                <span className="hidden text-xs text-neutral-600 md:inline dark:text-neutral-300">The timer keeps running.</span>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmExit(false)}>Stay</Button>
                                <Button size="sm" variant="outline" onClick={onExit}>Leave</Button>
                            </div>
                        ) : (
                            <Button size="sm" variant="ghost" className="gap-1" onClick={() => setConfirmExit(true)} aria-label="Exit the round"><X className="h-4 w-4" /> Exit</Button>
                        )
                    )}
                </div>
                {showProgress && (
                    <div className="h-0.5 bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${((answered ?? 0) / (total ?? 1)) * 100}%` }} />
                    </div>
                )}
            </header>
            <main className="flex-1">{children}</main>
        </div>
    )
}
