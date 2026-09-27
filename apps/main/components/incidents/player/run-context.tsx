"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import toast from "@repo/ui/components/ui/sonner"
import { endRun, startRun } from "@/actions/(main)/incidents/run.action"
import type { RunState } from "@/lib/incidents/run"
import { useGate } from "../sign-in-gate"

/**
 * The reader's recording choice for this case (plan/incidents INC-34).
 *
 *   recording  a run is open: answers, asks and talks are kept for the report
 *   reading    "Just read": nothing kept, the mic stays off (remembered per case)
 *   deciding   the start screen is showing
 *
 * Voice is only for a recorded run, so Ask and the talks call `requireRun`, which opens
 * the start screen when there is no run.
 */

type Mode = "recording" | "reading" | "deciding"
type RunCtx = {
    state: RunState | null
    mode: Mode
    busy: boolean
    start: () => void
    justRead: () => void
    /** End the open run and show the start screen again (a retake). */
    restart: () => Promise<void>
    stop: () => Promise<void>
    /** True when a run is open; otherwise opens the start screen and returns false. */
    requireRun: () => boolean
}

const Ctx = createContext<RunCtx | null>(null)
const readKey = (slug: string) => `incidents:just-read:${slug}`

export function RunProvider({ slug, initial, children }: { slug: string; initial: RunState | null; children: ReactNode }) {
    const router = useRouter()
    const { gate, signedIn } = useGate()
    const [state, setState] = useState(initial)
    const [reading, setReading] = useState(true)
    const [asked, setAsked] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => { setState(initial) }, [initial])
    useEffect(() => {
        try { setReading(localStorage.getItem(readKey(slug)) === "1") } catch { setReading(false) }
    }, [slug])

    // The case's first step is its front page (Start), so the choice is offered there. This
    // overlay only appears when something needs a run (asking, a talk) and there is none.
    const mode: Mode = state?.active ? "recording" : asked ? "deciding" : "reading"

    const start = useCallback(() => gate(async () => {
        setBusy(true)
        const r = await startRun(slug)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        try { localStorage.removeItem(readKey(slug)) } catch { /* private window */ }
        setState(r.data)
        setAsked(false)
        // The page re-reads progress so this run starts from its own (empty) answers.
        router.refresh()
    }, "start"), [gate, slug, router])

    const justRead = useCallback(() => {
        try { localStorage.setItem(readKey(slug), "1") } catch { /* private window */ }
        setReading(true)
        setAsked(false)
    }, [slug])

    const stop = useCallback(async () => {
        setBusy(true)
        const r = await endRun(slug)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setState(r.data)
        justRead()
        router.refresh()
    }, [slug, justRead, router])

    const restart = useCallback(async () => {
        setBusy(true)
        const r = await endRun(slug)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setState(r.data)
        setAsked(true)
        router.refresh()
    }, [slug, router])

    const requireRun = useCallback(() => {
        if (state?.active) return true
        if (!signedIn) { gate(() => undefined, "start"); return false }
        setAsked(true)
        return false
    }, [state, signedIn, gate])

    const value = useMemo(() => ({ state, mode, busy, start, justRead, restart, stop, requireRun }), [state, mode, busy, start, justRead, restart, stop, requireRun])
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRun(): RunCtx {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error("useRun must be used inside RunProvider")
    return ctx
}
