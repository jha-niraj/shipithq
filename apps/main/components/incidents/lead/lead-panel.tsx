"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowUp, ChevronDown, ExternalLink, Mic, Pause, Play, Power, Square, X } from "lucide-react"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { useDictation } from "@/hooks/useDictation"
import { useAIPanelStore } from "@/app/store/aiPanelStore"
import { useSession } from "@repo/auth/client"
import { openSignInPrompt } from "@/components/auth/sign-in-prompt"
import { useLead, type LeadTurn } from "./store"

/**
 * The incident lead in the right rail (plan/incidents INC-48): a conversation about the
 * part of the case on screen. Type or speak; the lead answers out loud, and each answer
 * plays right in the thread, with its transcript one tap away. Listening to the chapter
 * stays in the page's bottom bar. No uploads, no second chat.
 *
 * The header is h-14 to line up with the player's header across the page.
 */

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), {
    ssr: false,
    loading: () => <span className="block size-full rounded-full bg-neutral-200 dark:bg-neutral-800" />,
})
const ORB_COLORS: [string, string] = ["#d4d4d4", "#737373"]

export function LeadPanel() {
    const lead = useLead()
    const close = useAIPanelStore((s) => s.close)
    // Asking needs an account (INC-52); signed out, the composer is a sign-in card.
    const { data: session, isPending } = useSession()
    const signedOut = !isPending && !session?.user
    const [draft, setDraft] = useState("")
    const pending = useRef("")
    const dictation = useDictation({ onText: (t) => { pending.current = t; setDraft(t) }, endpoint: "/api/incidents/transcribe" })
    const transcribing = dictation.status === "transcribing"

    // Say what went wrong instead of leaving the mic looking dead.
    useEffect(() => { if (dictation.error) toast.error(dictation.error) }, [dictation.error])
    const bottom = useRef<HTMLDivElement>(null)

    useEffect(() => { bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" }) }, [lead.thread.length, lead.asking])

    const speaking = lead.state === "playing" && !!lead.answering
    const orbState = dictation.isListening ? "listening" : lead.asking || transcribing ? "thinking" : speaking ? "talking" : null

    const send = async () => {
        // Sending while the mic is still on stops it first (it stayed red before), and
        // takes the final transcription rather than the words so far.
        if (dictation.isListening) await dictation.stop()
        const q = (pending.current || draft).trim()
        if (!q) return
        setDraft("")
        pending.current = ""
        void lead.ask(q)
    }

    // The box grows with what is in it; past about six lines the ScrollArea around it
    // scrolls (the styled one, not the browser's own bar).
    const box = useRef<HTMLTextAreaElement>(null)
    useLayoutEffect(() => {
        const el = box.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
    }, [draft])
    const mic = async () => {
        if (transcribing) return
        if (dictation.isListening) {
            // Wait for the last clip to be transcribed, then send what was heard.
            await dictation.stop()
            const q = pending.current.trim()
            pending.current = ""
            if (q) { setDraft(""); void lead.ask(q) }
            else toast.error("I didn't catch that. Try again, or type it.")
            return
        }
        lead.stop()
        pending.current = ""
        void dictation.start()
    }
    const turnOff = () => {
        lead.setRailOff(true)
        close()
        toast.success("The lead won't open by itself. \"Ask the lead\" at the top brings it back.")
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white dark:bg-neutral-950">
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-3 dark:border-neutral-800">
                <span className="relative block size-8 shrink-0 overflow-hidden rounded-full"><Orb colors={ORB_COLORS} agentState={orbState} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight text-neutral-900 dark:text-white">The incident lead</p>
                    <p className="truncate font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">
                        {dictation.isListening ? "Listening. Tap stop to send." : transcribing ? "Transcribing..." : lead.asking ? "Thinking..." : speaking ? "Answering you" : `On: ${lead.chapter?.stepTitle ?? lead.caseTitle}`}
                    </p>
                </div>
                <button type="button" onClick={turnOff} title="Turn off: stop opening by itself on cases"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white">
                    <Power className="size-3.5" aria-hidden /> Turn off
                </button>
                <button type="button" onClick={close} aria-label="Close for now" title="Close for now"
                    className="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white">
                    <X className="size-4" />
                </button>
            </div>

            <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                <div className="space-y-3 p-3">
                    {lead.thread.length === 0 && !lead.asking && (
                        <p className="px-1 py-8 text-center text-[13px] leading-6 text-neutral-500 dark:text-neutral-400">
                            {signedOut
                                ? "Sign in and you can ask about this part of the case, or tell me your reasoning and I'll push on it. I answer out loud."
                                : "Ask about this part of the case, or tell me your reasoning and I'll push on it. Type, or tap the mic. I answer out loud."}
                        </p>
                    )}
                    {lead.thread.map((t) => t.who === "you"
                        ? <p key={t.id} className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-2xl bg-neutral-900 px-3 py-2 text-[14px] leading-6 text-white dark:bg-white dark:text-neutral-900">{t.text}</p>
                        : <Reply key={t.id} turn={t} />)}
                    {transcribing && <div className="ml-auto flex w-fit items-center gap-2 rounded-2xl bg-neutral-900/80 px-3 py-2 text-[13px] text-white dark:bg-white/80 dark:text-neutral-900"><InlineLoader size="sm" /> Transcribing...</div>}
                    {lead.asking && (
                        <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
                            <InlineLoader size="sm" /> The lead is thinking...
                        </div>
                    )}
                    <div ref={bottom} />
                </div>
            </ScrollArea>

            {signedOut ? (
                <div className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
                        <p className="text-[13px] font-medium text-neutral-900 dark:text-white">Sign in to ask the lead</p>
                        <p className="mt-0.5 text-[12px] leading-5 text-neutral-600 dark:text-neutral-400">Reading and listening stay free. Asking is for accounts, up to 20 questions a day.</p>
                        <button type="button"
                            onClick={() => openSignInPrompt({ callback: window.location.pathname, eyebrow: "The incident lead", title: "Sign in to ask the lead", body: "The lead answers your questions out loud and pushes on your reasoning. You come straight back to this chapter." })}
                            className="mt-2.5 inline-flex h-8 items-center rounded-lg bg-neutral-900 px-3 text-[12px] font-medium text-white dark:bg-white dark:text-neutral-900">
                            Sign in
                        </button>
                    </div>
                </div>
            ) : (
            <form onSubmit={(e) => { e.preventDefault(); void send() }} className="flex shrink-0 items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                <ScrollArea className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950" viewportClassName="max-h-[168px]">
                    <textarea ref={box} value={draft} onChange={(e) => { pending.current = ""; setDraft(e.target.value) }} rows={1} placeholder="Ask, or explain your thinking..."
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send() } }}
                        className="block min-h-10 w-full resize-none overflow-hidden bg-transparent px-3 py-2 text-[14px] leading-6 outline-none" />
                </ScrollArea>
                <button type="button" onClick={() => void mic()} disabled={transcribing || dictation.status === "starting"} aria-pressed={dictation.isListening} aria-label={dictation.isListening ? "Stop and send" : "Ask by voice"}
                    className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", dictation.isListening ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300")}>
                    {transcribing || dictation.status === "starting" ? <InlineLoader size="sm" /> : dictation.isListening ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
                <button type="submit" disabled={!draft.trim() || lead.asking || transcribing} aria-label="Send"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
                    <ArrowUp className="size-4" />
                </button>
            </form>
            )}
        </div>
    )
}

/**
 * One answer from the lead (Niraj, 2026-09-28: "make sure this is great"): it plays as soon
 * as it arrives; a waveform fills as it plays, with the time; the words fold under
 * "Transcript" until wanted. Without audio, the words show straight away.
 */
function Reply({ turn }: { turn: LeadTurn }) {
    const playTurn = useLead((s) => s.playTurn)
    const stop = useLead((s) => s.stop)
    const active = useLead((s) => s.answering === turn.id)
    const playing = useLead((s) => s.answering === turn.id && s.state === "playing")
    const elapsed = useLead((s) => (s.answering === turn.id ? s.elapsed : 0))
    const duration = useLead((s) => (s.answering === turn.id ? s.duration : 0))
    const [open, setOpen] = useState(!turn.audio)
    const progress = active && duration > 0 ? Math.min(1, elapsed / duration) : 0
    return (
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="mb-2 font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">The incident lead</p>
            {turn.audio && (
                <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => (playing ? stop() : playTurn(turn.id))} aria-label={playing ? "Pause the answer" : "Play the answer"}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform hover:scale-105 dark:bg-white dark:text-neutral-900">
                        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
                    </button>
                    <Wave progress={progress} active={playing} />
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                        {active && duration > 0 ? `${clock(elapsed)} / ${clock(duration)}` : "Answer"}
                    </span>
                </div>
            )}
            {turn.audio && (
                <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    {open ? "Hide transcript" : "Transcript"} <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                </button>
            )}
            {open && <p className={cn("whitespace-pre-wrap text-[14.5px] leading-7 text-neutral-800 dark:text-neutral-200", turn.audio && "mt-1.5 border-t border-neutral-200 pt-2 dark:border-neutral-800")}>{turn.text}</p>}
            {turn.link && (
                <a href={turn.link.href} target="_blank" rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-medium text-neutral-800 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200">
                    {turn.link.label} <ExternalLink className="size-3" />
                </a>
            )}
        </div>
    )
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/** A waveform that fills from the left as the answer plays; the unplayed part moves while it plays. */
function Wave({ progress, active }: { progress: number; active: boolean }) {
    const bars = [6, 10, 14, 8, 12, 16, 9, 13, 7, 11, 15, 8, 10, 6, 12, 9, 14, 7, 11, 8]
    return (
        <span className="flex h-6 min-w-0 flex-1 items-center gap-[2px]" aria-hidden>
            {bars.map((h, i) => {
                const played = (i + 0.5) / bars.length <= progress
                return (
                    <span key={i} className={cn("w-[3px] shrink-0 rounded-full transition-colors",
                        played ? "bg-neutral-900 dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700",
                        active && !played && "motion-safe:animate-[incident-eq_0.9s_ease-in-out_infinite]")}
                        style={{ height: h, animationDelay: `${(i % 5) * 0.12}s` }} />
                )
            })}
            <style>{`@keyframes incident-eq { 0%, 100% { transform: scaleY(0.5) } 50% { transform: scaleY(1) } }`}</style>
        </span>
    )
}
