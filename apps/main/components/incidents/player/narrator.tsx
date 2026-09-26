"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Pause, Play, RotateCcw } from "lucide-react"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import { narrationFor } from "@/actions/(main)/incidents/narration.action"

/**
 * The incident lead reading a chapter aloud (plan/incidents INC-21): the ElevenLabs orb,
 * play and pause, and which paragraph is being read, so the page can highlight it.
 * Paragraphs play in order; the next one's audio is fetched while this one plays. The
 * orb is three.js, so it loads only in the browser, and it is animated by its
 * "talking" state rather than by the audio signal (the R2 signed URL is cross-origin,
 * and analysing it would need CORS headers the bucket does not send).
 */

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), {
    ssr: false,
    loading: () => <span className="block size-full rounded-full bg-neutral-200 dark:bg-neutral-800" />,
})

const ORB_COLORS: [string, string] = ["#d4d4d4", "#737373"]

export function Narrator({ slug, chapterId, count, onParagraph }: {
    slug: string
    chapterId: string
    /** How many narrated paragraphs the chapter has. */
    count: number
    /** The paragraph being read, or null when stopped. */
    onParagraph: (index: number | null) => void
}) {
    const audio = useRef<HTMLAudioElement | null>(null)
    const urls = useRef<Record<number, string>>({})
    const [index, setIndex] = useState<number | null>(null)
    const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "done" | "unavailable">("idle")

    const urlFor = useCallback(async (i: number) => {
        if (urls.current[i]) return urls.current[i]!
        const r = await narrationFor(slug, chapterId, i)
        if (!r.success) {
            if (r.unavailable) setState("unavailable")
            return null
        }
        urls.current[i] = r.url
        return r.url
    }, [slug, chapterId])

    const playAt = useCallback(async (i: number) => {
        if (i >= count) { setState("done"); setIndex(null); onParagraph(null); return }
        setState("loading")
        const url = await urlFor(i)
        if (!url) { setState((s) => (s === "unavailable" ? s : "idle")); return }
        const a = audio.current ?? new Audio()
        audio.current = a
        a.src = url
        a.onended = () => void playAt(i + 1)
        setIndex(i)
        onParagraph(i)
        try {
            await a.play()
            setState("playing")
            void urlFor(i + 1)
        } catch {
            setState("paused")
        }
    }, [count, onParagraph, urlFor])

    // Leaving the step stops the voice.
    useEffect(() => () => { audio.current?.pause(); onParagraph(null) }, [onParagraph])

    const toggle = () => {
        const a = audio.current
        if (state === "playing" && a) { a.pause(); setState("paused"); return }
        if (state === "paused" && a) { void a.play().then(() => setState("playing")); return }
        void playAt(state === "done" ? 0 : index ?? 0)
    }

    if (count === 0 || state === "unavailable") return null

    return (
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3 pr-4 dark:border-neutral-800 dark:bg-neutral-950">
            <span className="relative block size-14 shrink-0 overflow-hidden rounded-full">
                <Orb colors={ORB_COLORS} agentState={state === "playing" ? "talking" : state === "loading" ? "thinking" : null} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-neutral-900 dark:text-white">The incident lead</p>
                <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                    {state === "playing" || state === "paused" ? `Reading ${(index ?? 0) + 1} of ${count}` : state === "done" ? "Finished. Read it again any time." : state === "loading" ? "Getting ready..." : "Listen to this chapter, or read it below."}
                </p>
            </div>
            <button
                type="button"
                onClick={toggle}
                aria-label={state === "playing" ? "Pause" : "Listen"}
                className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors", "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200")}
            >
                {state === "loading" ? <InlineLoader size="sm" /> : state === "playing" ? <Pause className="size-4" aria-hidden /> : state === "done" ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                {state === "playing" ? "Pause" : state === "paused" ? "Resume" : state === "done" ? "Again" : "Listen"}
            </button>
        </div>
    )
}
