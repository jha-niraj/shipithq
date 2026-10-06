"use client"

import { createContext, useContext, useState } from "react"

/*
 * The moment a chapter is looking at (plan/incidents INC-65, INC-66): the timeline sets it
 * when an event is tapped, the dashboard when it is scrubbed, and both show it. A chapter
 * wraps its blocks in one provider; a diagram outside one keeps its own.
 */

type Scrub = { at: number | null; setAt: (at: number | null) => void }

const ScrubContext = createContext<Scrub | null>(null)

export function ScrubProvider({ children }: { children: React.ReactNode }) {
    const [at, setAt] = useState<number | null>(null)
    return <ScrubContext.Provider value={{ at, setAt }}>{children}</ScrubContext.Provider>
}

export function useScrub(): Scrub {
    const shared = useContext(ScrubContext)
    const [at, setAt] = useState<number | null>(null)
    return shared ?? { at, setAt }
}

/** T+0, T+45 s, T+14 min, T+3 h, T+2 d: time since the incident started. */
export function formatRel(ms: number): string {
    // Before the incident (a warning, a deploy): T-15 min.
    if (ms < 0) return formatRel(-ms).replace("T+", "T-")
    const s = Math.round(ms / 1000)
    if (s === 0) return "T+0"
    if (s < 60) return `T+${s} s`
    if (s < 600 && s % 60) return `T+${Math.floor(s / 60)} min ${s % 60} s`
    const m = Math.round(s / 60)
    if (m < 60) return `T+${m} min`
    const h = Math.round(m / 6) / 10
    if (h < 48) return `T+${h} h`
    return `T+${Math.round(h / 24)} d`
}

/** A duration: 45 s, 14 min, 3 h, 2 d. */
export function formatSpan(ms: number): string {
    return formatRel(ms).replace("T+", "")
}
