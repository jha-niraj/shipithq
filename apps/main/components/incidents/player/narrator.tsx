"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react"
import toast from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import { useDictation } from "@/hooks/useDictation"
import { askLead, narrationFor } from "@/actions/(main)/incidents/narration.action"
import { useGate } from "../sign-in-gate"

/**
 * The incident lead's voice (plan/incidents INC-21, INC-30, INC-31): the ElevenLabs orb;
 * Listen, pause, speed; auto-play when a chapter opens (a remembered switch); a live
 * caption of the paragraph being read; and "Ask the lead", a question asked out loud and
 * answered from the case, spoken back. The orb is three.js, so it loads only in the
 * browser, and moves by state (talking, thinking, listening) rather than the audio signal.
 */

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), {
    ssr: false,
    loading: () => <span className="block size-full rounded-full bg-neutral-200 dark:bg-neutral-800" />,
})

const ORB_COLORS: [string, string] = ["#d4d4d4", "#737373"]
const SPEEDS = [1, 1.25, 1.5] as const
const AUTOPLAY_KEY = "incidents:autoplay"
const SPEED_KEY = "incidents:speed"

function readPref<T>(key: string, fallback: T, parse: (v: string) => T): T {
    try { const v = localStorage.getItem(key); return v === null ? fallback : parse(v) } catch { return fallback }
}
function writePref(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* private window */ } }

export function Narrator({ slug, chapterId, paragraphs, stepTitle, onParagraph, onAvailable }: {
    slug: string
    chapterId: string
    /** The narrated paragraphs, for the caption. */
    paragraphs: string[]
    stepTitle: string
    /** The paragraph being read, or null when stopped. */
    onParagraph: (index: number | null) => void
    /** False when the voice is unavailable, so the page shows the full transcript. */
    onAvailable: (ok: boolean) => void
}) {
    const { gate } = useGate()
    const audio = useRef<HTMLAudioElement | null>(null)
    const urls = useRef<Record<number, string>>({})
    const [index, setIndex] = useState<number | null>(null)
    const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "done" | "unavailable">("idle")
    const [autoplay, setAutoplay] = useState(true)
    const [speed, setSpeed] = useState<number>(1)
    const [answer, setAnswer] = useState<string | null>(null)
    const [asking, setAsking] = useState(false)
    const count = paragraphs.length

    useEffect(() => {
        setAutoplay(readPref(AUTOPLAY_KEY, true, (v) => v === "1"))
        setSpeed(readPref(SPEED_KEY, 1, (v) => (SPEEDS as readonly number[]).includes(Number(v)) ? Number(v) : 1))
    }, [])

    const urlFor = useCallback(async (i: number) => {
        if (urls.current[i]) return urls.current[i]!
        const r = await narrationFor(slug, chapterId, i)
        if (!r.success) {
            if (r.unavailable) { setState("unavailable"); onAvailable(false) }
            return null
        }
        urls.current[i] = r.url
        return r.url
    }, [slug, chapterId, onAvailable])

    const playUrl = useCallback(async (url: string, onEnded: () => void) => {
        const a = audio.current ?? new Audio()
        audio.current = a
        a.src = url
        a.playbackRate = speed
        a.onended = onEnded
        await a.play()
    }, [speed])

    const playAt = useCallback(async (i: number) => {
        setAnswer(null)
        if (i >= count) { setState("done"); setIndex(null); onParagraph(null); return }
        setState("loading")
        const url = await urlFor(i)
        if (!url) { setState((s) => (s === "unavailable" ? s : "idle")); return }
        setIndex(i)
        onParagraph(i)
        try {
            await playUrl(url, () => void playAt(i + 1))
            setState("playing")
            void urlFor(i + 1)
        } catch {
            // The browser blocked playback without a click: wait for Listen.
            setState("idle")
        }
    }, [count, onParagraph, urlFor, playUrl])

    // Auto-play when the chapter opens, if the reader wants it.
    useEffect(() => {
        if (!autoplay || count === 0) return
        const t = window.setTimeout(() => void playAt(0), 350)
        return () => window.clearTimeout(t)
        // Only on opening the chapter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId, autoplay])

    // Leaving the step stops the voice.
    useEffect(() => () => { audio.current?.pause(); onParagraph(null) }, [onParagraph])
    useEffect(() => { if (audio.current) audio.current.playbackRate = speed }, [speed])

    const toggle = () => {
        const a = audio.current
        if (state === "playing" && a) { a.pause(); setState("paused"); return }
        if (state === "paused" && a) { void a.play().then(() => setState("playing")); return }
        void playAt(state === "done" ? 0 : index ?? 0)
    }

    const pending = useRef("")
    const dictation = useDictation({
        onText: (text) => { pending.current = text },
    })

    const ask = () => gate(async () => {
        if (dictation.isListening) {
            dictation.stop()
            // The last clip is transcribed after stopping; give it a moment.
            window.setTimeout(async () => {
                const q = pending.current.trim()
                pending.current = ""
                if (!q) { toast.error("I didn't catch a question. Try again."); return }
                setAsking(true)
                audio.current?.pause()
                const r = await askLead(slug, stepTitle, q)
                setAsking(false)
                if (!r.success) { toast.error(r.error); return }
                setAnswer(r.answer)
                if (r.audio) {
                    setState("playing")
                    try { await playUrl(r.audio, () => setState("idle")) } catch { setState("idle") }
                }
            }, 900)
            return
        }
        audio.current?.pause()
        setState((s) => (s === "playing" ? "paused" : s))
        dictation.start()
    }, `step-${chapterId}`)

    if (count === 0 || state === "unavailable") return null
    const listening = dictation.isListening
    const caption = answer ?? (index !== null ? paragraphs[index] : null)

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex flex-wrap items-center gap-3">
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-full">
                    <Orb colors={ORB_COLORS} agentState={listening ? "listening" : asking || state === "loading" ? "thinking" : state === "playing" ? "talking" : null} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-neutral-900 dark:text-white">The incident lead</p>
                    <p className="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                        {listening ? "Listening. Tap again when you're done." : asking ? "Thinking..." : answer ? "Answering your question" : state === "playing" || state === "paused" ? `Reading ${(index ?? 0) + 1} of ${count}` : state === "done" ? "Finished. Hear it again any time." : state === "loading" ? "Getting ready..." : "Listen to this chapter"}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { const next = !autoplay; setAutoplay(next); writePref(AUTOPLAY_KEY, next ? "1" : "0") }} aria-pressed={autoplay} title="Start reading when a chapter opens"
                        className={cn("h-8 rounded-full border px-2.5 font-mono text-[11px] transition-colors", autoplay ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white" : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400")}>
                        Auto
                    </button>
                    <button type="button" onClick={() => { const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!; setSpeed(next); writePref(SPEED_KEY, String(next)) }} title="Playback speed"
                        className="h-8 w-12 rounded-full border border-neutral-200 font-mono text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300">
                        {speed}x
                    </button>
                    <button type="button" onClick={ask} disabled={asking} aria-pressed={listening} title="Ask the lead a question, out loud"
                        className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors disabled:opacity-50", listening ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "border-neutral-200 text-neutral-800 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200")}>
                        {listening ? <Square className="size-3.5" aria-hidden /> : asking ? <InlineLoader size="sm" /> : <Mic className="size-4" aria-hidden />}
                        {listening ? "Done" : "Ask"}
                    </button>
                    <button type="button" onClick={toggle} aria-label={state === "playing" ? "Pause" : "Listen"}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                        {state === "loading" ? <InlineLoader size="sm" /> : state === "playing" ? <Pause className="size-4" aria-hidden /> : state === "done" ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                        {state === "playing" ? "Pause" : state === "paused" ? "Resume" : state === "done" ? "Again" : "Listen"}
                    </button>
                </div>
            </div>
            <AnimatePresence initial={false} mode="wait">
                {caption && (
                    <motion.p key={caption.slice(0, 40)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                        className="mt-3 border-t border-neutral-200 pt-3 text-[15px] leading-7 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                        {caption}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}
