"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"
import type { IncidentCase, SourceRef } from "@/content/incidents/types"

/**
 * Shared pieces of an Incidents case page (plan/incidents INC-3): the case context,
 * scroll reveal, inline code, source chips, the XP pop and the playback clock.
 *
 * Motion rules (plan/incidents/overview.md, "UI and layout"): transform and opacity
 * only, 200 to 500 ms, one easing curve, and a readable still end state under
 * reduced motion.
 */

export const EASE = [0.2, 0.7, 0.2, 1] as const

// ── The case ────────────────────────────────────────────────────────────────

const CaseCtx = createContext<IncidentCase | null>(null)
export const CaseProvider = CaseCtx.Provider

export function useCase(): IncidentCase {
    const c = useContext(CaseCtx)
    if (!c) throw new Error("useCase must be used inside CaseProvider")
    return c
}

// ── Styles the components share ────────────────────────────────────────────

export function IncidentStyles() {
    return (
        <style>{`
.inc-reveal{opacity:0;transform:translateY(14px);transition:opacity .5s cubic-bezier(.2,.7,.2,1),transform .5s cubic-bezier(.2,.7,.2,1)}
.inc-reveal[data-shown="true"]{opacity:1;transform:none}
.inc-line{opacity:0;transform:translateX(-6px);transition:opacity .35s cubic-bezier(.2,.7,.2,1),transform .35s cubic-bezier(.2,.7,.2,1)}
[data-shown="true"] .inc-line{opacity:1;transform:none}
@keyframes inc-stripes{from{background-position:0 0}to{background-position:24px 0}}
.inc-running{background-image:repeating-linear-gradient(115deg,rgba(0,0,0,.08) 0 6px,transparent 6px 12px);background-size:24px 100%;animation:inc-stripes .8s linear infinite}
@keyframes inc-cpu-idle{0%,100%{transform:scaleX(.03)}50%{transform:scaleX(.06)}}
@keyframes inc-cpu-stream{0%{transform:scaleX(0)}80%,100%{transform:scaleX(1)}}
@keyframes inc-sweep{0%{stroke-dashoffset:var(--len)}80%,100%{stroke-dashoffset:0}}
@keyframes inc-blink{0%,100%{opacity:1}50%{opacity:.25}}
@media (prefers-reduced-motion: reduce){
  .inc-reveal,.inc-line{opacity:1;transform:none;transition:none}
  .inc-running{animation:none}
  .inc-anim{animation:none!important}
}
`}</style>
    )
}

// ── Scroll reveal ──────────────────────────────────────────────────────────

/** Fades its children in the first time they scroll into view. Never hides them again. */
export function Reveal({ children, className, delay = 0, id }: { children: ReactNode; className?: string; delay?: number; id?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [shown, setShown] = useState(false)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (typeof IntersectionObserver === "undefined") return setShown(true)
        const io = new IntersectionObserver(([e]) => {
            if (e?.isIntersecting) {
                setShown(true)
                io.disconnect()
            }
        }, { rootMargin: "0px 0px -8% 0px" })
        io.observe(el)
        return () => io.disconnect()
    }, [])
    return (
        <div ref={ref} id={id} data-shown={shown} className={cn("inc-reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
            {children}
        </div>
    )
}

// ── Text ────────────────────────────────────────────────────────────────────

/** Case text with `backticks` rendered as inline code. */
export function Inline({ text }: { text: string }) {
    return (
        <>
            {text.split(/(`[^`]+`)/g).map((part, i) =>
                part.length > 1 && part.startsWith("`") && part.endsWith("`") ? (
                    <code key={i} className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.86em] text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                        {part.slice(1, -1)}
                    </code>
                ) : (
                    part
                ),
            )}
        </>
    )
}

/** The sections a claim comes from, as small mono chips; the full title on hover. */
export function Sources({ refs, dark = false, className }: { refs: SourceRef[]; dark?: boolean; className?: string }) {
    const c = useCase()
    if (!refs.length) return null
    return (
        <p className={cn("flex flex-wrap items-center gap-1.5", className)}>
            <span className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", dark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400")}>Source</span>
            {refs.map((r) => (
                <span
                    key={`${r.source}-${r.section}`}
                    title={c.sources[r.source] ? `${c.sources[r.source]!.title} (${c.sources[r.source]!.author}, ${c.sources[r.source]!.date})` : r.source}
                    className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[10.5px]",
                        dark ? "bg-white/10 text-neutral-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
                    )}
                >
                    {r.source} · {r.section}
                </span>
            ))}
        </p>
    )
}

// ── XP ──────────────────────────────────────────────────────────────────────

/** "+10 XP" that rises and fades from where it was earned. */
export function XpPop({ amount, show }: { amount: number; show: boolean }) {
    const reduced = useReducedMotion()
    return (
        <AnimatePresence>
            {show && (
                <motion.span
                    key="xp"
                    aria-live="polite"
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.9 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="inline-flex items-center rounded-full bg-neutral-900 dark:bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-white"
                >
                    +{amount} XP
                </motion.span>
            )}
        </AnimatePresence>
    )
}

// ── Playback ────────────────────────────────────────────────────────────────

/**
 * A clock that runs a timeline from 0 to `duration` in `ms` of real time. Starts at
 * the end, so a run is readable before anyone presses play. Reduced motion jumps
 * straight to the end.
 */
export function usePlayback(duration: number, ms = 6000) {
    const reduced = useReducedMotion()
    const [t, setT] = useState(duration)
    const [playing, setPlaying] = useState(false)
    const raf = useRef<number | null>(null)

    const stop = useCallback(() => {
        if (raf.current !== null) cancelAnimationFrame(raf.current)
        raf.current = null
        setPlaying(false)
    }, [])

    const play = useCallback(() => {
        stop()
        if (reduced) return setT(duration)
        setPlaying(true)
        const start = performance.now()
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / ms)
            setT(p * duration)
            if (p < 1) raf.current = requestAnimationFrame(tick)
            else {
                raf.current = null
                setPlaying(false)
            }
        }
        setT(0)
        raf.current = requestAnimationFrame(tick)
    }, [duration, ms, reduced, stop])

    const seek = useCallback((v: number) => {
        stop()
        setT(Math.max(0, Math.min(duration, v)))
    }, [duration, stop])

    useEffect(() => stop, [stop])
    return { t, playing, play, seek }
}
