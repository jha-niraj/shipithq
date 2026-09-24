"use client"

import {
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import { Check, Info, OctagonX, TriangleAlert, X } from "lucide-react"

import { InlineLoader } from "./inline-loader"
import { cn } from "../../lib/utils"

/*
 * ShipItHQ's toasts: one pill per message, stacked into a deck, fanned out
 * while you point at them, swiped away with a flick. Adapted on 2026-09-24
 * from a component Niraj brought in; the stack, the timing clock and the
 * morphing are its design, the rest is ours:
 *
 * - motion from `framer-motion` (installed; `motion/react` is the same library
 *   under its new package name);
 * - state glyphs are lucide icons, and "pending" is our InlineLoader - no
 *   spinner (CLAUDE.md), and no dependency on a status badge or a "smoky
 *   dissolve" effect that do not exist here;
 * - monochrome: only an error is coloured (rose), as in the sonner surface this
 *   replaces. Warning and info carry their meaning in the glyph, because the
 *   palette rules out amber and blue;
 * - the same glass surface the old toasts had, legible in both themes;
 * - a close button (on hover or keyboard focus), since a swipe is not
 *   something a keyboard or a screen reader can do;
 * - an optional description line, and messages that wrap to two lines
 *   instead of being cut off - server errors are often long;
 * - errors are announced assertively (role="alert"), the rest politely.
 *
 * The public API is sonner's (`toast.success(...)` etc.), re-exported from
 * `./sonner` so every existing call site keeps working; this file is the
 * engine behind it.
 */

/** Fired for every toast shown or updated; the sound layer listens for it. */
export const TOAST_EVENT = "shipithq:toast"
const EVENT = TOAST_EVENT
const DISMISS = "shipithq:toast-dismiss"

/** How long a toast stays, by what it says. Errors stay long enough to read. */
const LIFETIME = { plain: 3200, success: 3200, info: 4000, warning: 6000, error: 6000 } as const
const ACTION_LIFETIME = 6000
const DESCRIPTION_EXTRA = 1500

const GAP = 8
const PEEK = 10
const SHRINK = 0.03
const DEPTH = 3
const FADE = 0.15
const REACH = 10
const UNCAPPED = 10000
const SWIPE = 44
const FLICK = 380
const MORPH = { type: "spring", duration: 0.3, bounce: 0 } as const
const EXIT = { type: "spring", duration: 0.2, bounce: 0 } as const

export const LINE_HEIGHT = 40

export type ToastSide = "top" | "bottom"
export type ToastAlign = "left" | "center" | "right"
export type ToastPosition = `${ToastSide}-${ToastAlign}`
export const toastPositions = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
] as const satisfies readonly ToastPosition[]

const ALIGN: Record<ToastAlign, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
}

export type ToastTone = "success" | "error" | "warning" | "info"
export type ToastState = "pending" | ToastTone
export type ToastAction = { label: string; run: () => void }
export type ToastInput = {
    id?: string
    message: string
    description?: string
    state?: ToastState
    action?: ToastAction
    /** Milliseconds; defaults by state. */
    lifetime?: number
}
export type Note = ToastInput & { id: string }
export type ToastClock = { waits: Map<string, number>; since: number | null }
export type StackSlot = { y: number; scale: number; opacity: number }
export type StackCard = { id: string; render: (behind: boolean) => ReactNode }

let nextId = 0

/** Show (or, with an existing id, update) a toast. Returns its id. */
export function showToast(input: ToastInput): string {
    const id = input.id ?? `toast-${++nextId}`
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...input, id } }))
    }
    return id
}

/** Dismiss one toast, or every toast when no id is given. */
export function dismissToast(id?: string) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DISMISS, { detail: id ?? null }))
}

export function upsertToast(notes: readonly Note[], note: Note): Note[] {
    const index = notes.findIndex((item) => item.id === note.id)
    return index === -1 ? [note, ...notes] : notes.map((item, at) => (at === index ? note : item))
}

export function dismissDelay(note: Pick<ToastInput, "state" | "action" | "lifetime" | "description">): number | null {
    if (note.state === "pending") return null
    if (note.lifetime !== undefined) return note.lifetime
    const base = note.action ? ACTION_LIFETIME : LIFETIME[note.state ?? "plain"]
    return base + (note.description ? DESCRIPTION_EXTRA : 0)
}

export function tick(clock: ToastClock, at: number) {
    if (clock.since === null) return
    const spent = at - clock.since
    clock.since = at
    for (const [id, left] of clock.waits) clock.waits.set(id, left - spent)
}

export function pileSlot(index: number): StackSlot {
    const depth = Math.min(index, DEPTH - 1)
    return { y: depth * PEEK, scale: 1 - depth * SHRINK, opacity: index < DEPTH ? 1 - depth * FADE : 0 }
}

export function fanSlot(index: number, heights: readonly number[]): StackSlot {
    let y = 0
    for (let at = 0; at < index; at++) y += (heights[at] ?? LINE_HEIGHT) + GAP
    return { y, scale: 1, opacity: 1 }
}

function ToastGlyph({ state }: { state: ToastState }) {
    switch (state) {
        case "pending":
            return <InlineLoader size="sm" label="Working" />
        case "success":
            return <Check className="size-4 text-neutral-900 dark:text-white" strokeWidth={2.5} aria-hidden />
        case "error":
            return <OctagonX className="size-4 text-rose-600 dark:text-rose-400" aria-hidden />
        case "warning":
            return <TriangleAlert className="size-4 text-neutral-900 dark:text-neutral-100" aria-hidden />
        case "info":
            return <Info className="size-4 text-neutral-500 dark:text-neutral-400" aria-hidden />
        default: {
            const exhaustive: never = state
            return exhaustive
        }
    }
}

const GLYPH_POP = {
    initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.25, filter: "blur(4px)", transition: EXIT },
} as const

const TEXT_SLIDE = {
    initial: { opacity: 0, x: -6 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -6, transition: EXIT },
} as const

/* The text, growing from nothing so a state change morphs rather than jumps. */
function ToastText({ message, description }: { message: string; description?: string }) {
    return (
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            exit={{ width: 0 }}
            transition={MORPH}
            className="flex items-center overflow-hidden"
        >
            <motion.div {...TEXT_SLIDE} transition={MORPH} className="w-max max-w-[min(26rem,calc(100vw-7rem))] shrink-0 py-0.5">
                <p className="line-clamp-2 break-words text-[13.5px] font-medium leading-5 text-neutral-900 dark:text-neutral-50" title={message}>
                    {message}
                </p>
                {description ? (
                    <p className="line-clamp-3 break-words text-[13px] leading-5 text-neutral-600 dark:text-neutral-300">{description}</p>
                ) : null}
            </motion.div>
        </motion.div>
    )
}

const glyphKey = (state: ToastState) => (state === "pending" || state === "success" ? "badge" : state)

function ToastPill({ note, onAction, onDismiss, behind }: { note: Note; onAction: () => void; onDismiss: () => void; behind: boolean }) {
    const { state, message, description, action } = note
    const tall = !!description || message.length > 60
    return (
        <motion.div
            role={state === "error" ? "alert" : "status"}
            style={{ borderRadius: tall ? 18 : 9999 }}
            drag={!behind}
            dragSnapToOrigin
            dragElastic={0.6}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 520, bounceDamping: 42 }}
            onDragEnd={(_, info) => {
                const far = Math.hypot(info.offset.x, info.offset.y) > SWIPE
                const fast = Math.hypot(info.velocity.x, info.velocity.y) > FLICK
                if (far || fast) onDismiss()
            }}
            className={cn(
                "group/toast relative flex max-w-[min(34rem,calc(100vw-2rem))] overflow-hidden text-sm",
                // The glass surface the sonner toasts had: legible over anything.
                "border border-neutral-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/80",
                "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.75)]",
                behind ? "pointer-events-none" : "pointer-events-auto cursor-grab active:cursor-grabbing",
                action ? "py-1.5 pr-1.5" : "py-2 pr-9",
                state ? "pl-3" : "pl-4",
            )}
        >
            <motion.div animate={{ opacity: behind ? 0 : 1 }} transition={MORPH} className="flex items-center">
                <div className={cn("flex gap-2.5", tall ? "items-start" : "items-center")}>
                    <AnimatePresence initial={false} mode="popLayout">
                        {state ? (
                            <motion.span key={glyphKey(state)} {...GLYPH_POP} transition={MORPH} className={cn("flex size-4 shrink-0 items-center justify-center", tall && "mt-1")}>
                                <ToastGlyph state={state} />
                            </motion.span>
                        ) : null}
                    </AnimatePresence>
                    <div className="flex items-center">
                        <AnimatePresence initial={false}>
                            <ToastText key={`${message}\n${description ?? ""}`} message={message} description={description} />
                        </AnimatePresence>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {action ? (
                        <motion.div
                            key="action"
                            initial={{ width: 0 }}
                            animate={{ width: "auto", height: "auto" }}
                            exit={{ width: 0 }}
                            transition={MORPH}
                            className="flex items-center overflow-hidden"
                        >
                            <div className="w-max pl-5">
                                <button
                                    type="button"
                                    onClick={onAction}
                                    className="h-7 cursor-pointer rounded-full bg-neutral-900 px-3 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                >
                                    {action.label}
                                </button>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.div>

            {!action && !behind ? (
                <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={onDismiss}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={cn(
                        "absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-full text-neutral-500 opacity-0 transition hover:bg-neutral-900/5 hover:text-neutral-900 focus-visible:opacity-100 group-hover/toast:opacity-100 dark:hover:bg-white/10 dark:hover:text-white",
                        tall ? "top-2" : "top-1/2 -translate-y-1/2",
                    )}
                >
                    <X className="size-3.5" />
                </button>
            ) : null}
        </motion.div>
    )
}

function sameBoxes(first: Record<string, { width: number; height: number }>, second: Record<string, { width: number; height: number }>) {
    const ids = Object.keys(second)
    return ids.length === Object.keys(first).length && ids.every((id) => first[id]?.width === second[id]?.width && first[id]?.height === second[id]?.height)
}

function ToastStack({ cards, onOpen, position }: { cards: StackCard[]; onOpen: (open: boolean) => void; position: ToastPosition }) {
    const [pointing, setPointing] = useState(false)
    const [focused, setFocused] = useState(false)
    const [holding, setHolding] = useState(false)
    const [boxes, setBoxes] = useState<Record<string, { width: number; height: number }>>({})
    const measured = useRef(new Map<string, HTMLElement>())
    const root = useRef<HTMLDivElement>(null)

    const open = pointing || focused || holding
    const piled = cards.length > 1 && !open

    useEffect(() => onOpen(open), [onOpen, open])

    useEffect(() => {
        if (!holding) return
        const release = () => setHolding(false)
        const check = (event: PointerEvent) => {
            if (event.buttons === 0) release()
        }
        window.addEventListener("pointerup", release)
        window.addEventListener("pointercancel", release)
        window.addEventListener("pointermove", check)
        return () => {
            window.removeEventListener("pointerup", release)
            window.removeEventListener("pointercancel", release)
            window.removeEventListener("pointermove", check)
        }
    }, [holding])

    const at = useRef<{ x: number; y: number } | null>(null)
    const overCards = useCallback(
        () =>
            at.current !== null &&
            [...measured.current.values()].some((element) => {
                const box = element.getBoundingClientRect()
                return at.current!.x >= box.left - REACH && at.current!.x <= box.right + REACH && at.current!.y >= box.top - REACH && at.current!.y <= box.bottom + REACH
            }),
        [],
    )

    useEffect(() => {
        const onMove = (event: PointerEvent) => {
            at.current = { x: event.clientX, y: event.clientY }
            setPointing(overCards())
        }
        const onLeave = () => {
            at.current = null
            setPointing(false)
        }
        window.addEventListener("pointermove", onMove)
        document.documentElement.addEventListener("pointerleave", onLeave)
        return () => {
            window.removeEventListener("pointermove", onMove)
            document.documentElement.removeEventListener("pointerleave", onLeave)
        }
    }, [overCards])

    useEffect(() => {
        if (!pointing) return
        let frame = requestAnimationFrame(function check() {
            if (!overCards()) {
                setPointing(false)
                return
            }
            frame = requestAnimationFrame(check)
        })
        return () => cancelAnimationFrame(frame)
    }, [pointing, overCards])

    useEffect(() => {
        if (!focused) return
        let frame = requestAnimationFrame(function check() {
            if (!root.current?.contains(document.activeElement)) {
                setFocused(false)
                return
            }
            frame = requestAnimationFrame(check)
        })
        return () => cancelAnimationFrame(frame)
    }, [focused])

    useLayoutEffect(() => {
        const next: Record<string, { width: number; height: number }> = {}
        for (const card of cards) {
            const element = measured.current.get(card.id)
            if (!element) continue
            const capped = element.style.maxWidth
            element.style.maxWidth = ""
            next[card.id] = { width: element.offsetWidth, height: element.offsetHeight }
            element.style.maxWidth = capped
        }
        setBoxes((current) => (sameBoxes(current, next) ? current : next))
    }, [cards])

    const heights = cards.map((card) => boxes[card.id]?.height ?? LINE_HEIGHT)
    const deckWidth = cards[0] ? boxes[cards[0].id]?.width : undefined
    const [side, align] = position.split("-") as [ToastSide, ToastAlign]
    const fall = side === "top" ? 1 : -1

    return (
        <motion.div
            ref={root}
            aria-live="polite"
            aria-label="Notifications"
            onPointerDown={() => setHolding(true)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
            }}
            className={cn("pointer-events-none fixed inset-x-0 z-[100]", side === "top" ? "top-4" : "bottom-4")}
        >
            <AnimatePresence initial={false}>
                {cards.map((card, index) => {
                    const slot = piled ? pileSlot(index) : fanSlot(index, heights)
                    const y = slot.y * fall
                    const from = (slot.y - 8) * fall
                    return (
                        <motion.div
                            key={card.id}
                            style={{ transformOrigin: `${side} ${align}`, zIndex: cards.length - index }}
                            initial={{ opacity: 0, y: from, scale: slot.scale * 0.98 }}
                            animate={{ opacity: slot.opacity, y, scale: slot.scale }}
                            exit={{ opacity: 0, y: from, scale: slot.scale * 0.96, filter: "blur(4px)", transition: EXIT }}
                            transition={MORPH}
                            className={cn("absolute inset-x-0 flex px-4", side === "top" ? "top-0" : "bottom-0", ALIGN[align])}
                            aria-hidden={slot.opacity === 0 || undefined}
                        >
                            <motion.div
                                ref={(element: HTMLDivElement | null) => {
                                    if (element) measured.current.set(card.id, element)
                                    else measured.current.delete(card.id)
                                }}
                                className="relative"
                                initial={false}
                                animate={{ maxWidth: (piled && index > 0 ? deckWidth : boxes[card.id]?.width) ?? UNCAPPED }}
                                transition={MORPH}
                            >
                                {card.render(piled && index > 0)}
                            </motion.div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </motion.div>
    )
}

/** Mount once per app (the `Toaster` in `./sonner` does). */
export function Toasts({ position = "top-right" }: { position?: ToastPosition }) {
    const [notes, setNotes] = useState<Note[]>([])
    const [reading, setReading] = useState(false)
    const clock = useRef<ToastClock>({ waits: new Map(), since: null })
    const issued = useRef<string | null>(null)

    useEffect(() => {
        clock.current.since = performance.now()
        const onToast = (event: Event) => {
            const note = (event as CustomEvent<Note>).detail
            issued.current = note.id
            setNotes((current) => upsertToast(current, note))
            tick(clock.current, performance.now())
            const delay = dismissDelay(note)
            if (delay === null) clock.current.waits.delete(note.id)
            else clock.current.waits.set(note.id, delay)
        }
        const onDismiss = (event: Event) => {
            const id = (event as CustomEvent<string | null>).detail
            if (id === null) {
                clock.current.waits.clear()
                setNotes([])
                return
            }
            clock.current.waits.delete(id)
            setNotes((current) => current.filter((note) => note.id !== id))
        }
        window.addEventListener(EVENT, onToast)
        window.addEventListener(DISMISS, onDismiss)
        return () => {
            window.removeEventListener(EVENT, onToast)
            window.removeEventListener(DISMISS, onDismiss)
        }
    }, [])

    // While the deck is open (pointed at, focused, held) the clocks stop.
    useEffect(() => {
        tick(clock.current, performance.now())
        clock.current.since = reading ? null : performance.now()
    }, [reading])

    useEffect(() => {
        if (reading) return
        tick(clock.current, performance.now())
        const waits = [...clock.current.waits.values()]
        if (waits.length === 0) return
        const timer = window.setTimeout(() => {
            tick(clock.current, performance.now())
            const expired = new Set<string>()
            for (const [id, left] of clock.current.waits) if (left <= 0) expired.add(id)
            for (const id of expired) clock.current.waits.delete(id)
            setNotes((current) => current.filter((note) => !expired.has(note.id)))
        }, Math.max(0, Math.min(...waits)))
        return () => window.clearTimeout(timer)
    }, [notes, reading])

    return (
        <MotionConfig reducedMotion="user">
            <ToastStack
                position={position}
                onOpen={setReading}
                cards={notes.map((note) => {
                    const drop = () => {
                        clock.current.waits.delete(note.id)
                        setNotes((current) => current.filter((item) => item.id !== note.id))
                    }
                    const act = () => {
                        issued.current = null
                        note.action?.run()
                        if (issued.current !== note.id) drop()
                    }
                    return { id: note.id, render: (behind) => <ToastPill note={note} onAction={act} onDismiss={drop} behind={behind} /> }
                })}
            />
        </MotionConfig>
    )
}
