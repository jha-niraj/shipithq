"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, MicOff, PhoneOff, RotateCcw, SendHorizontal } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import type { VoiceMode, VoiceTurn } from "@repo/db"
import { beginInterview, reportInteraction, reportTurns, type LiveVoiceConfig } from "@/actions/voice/session.action"
import { answerTypedInterview, openTypedInterview } from "@/actions/voice/typed.action"
import type { VoiceRef } from "@/lib/voice/session"
import { ConsentCard } from "./consent-card"
import { TranscriptPane } from "@repo/ui/components/hiring/transcript-pane"

/*
 * A live interview, spoken or typed (plan/voice VO-7), for mocks and hiring
 * voice rounds alike. Spoken: the Sarvam browser SDK talks to our interviewer
 * agent, the key added by /api/voice/sarvam; the student can talk over the
 * interviewer and it stops to listen. Typed: the same brief as a chat, one
 * inline turn at a time. The parent owns the clock and what "hand in" means.
 */

type Phase = "consent" | "voice" | "typed"
const SAVE_TURNS_MS = 3000
const MAX_ANSWER = 4000

export function LiveInterview({ voiceRef, title, allows, initial, ending, onHandIn }: {
    voiceRef: VoiceRef
    title: string
    allows: { voice: boolean; typed: boolean }
    initial: { mode: VoiceMode | null; consented: boolean; turns: VoiceTurn[] }
    /** Set by the parent when time is up: the call is ended and handed in. */
    ending: boolean
    onHandIn: () => Promise<void>
}) {
    const [phase, setPhase] = useState<Phase>(initial.consented && initial.mode ? (initial.mode === "VOICE" ? "voice" : "typed") : "consent")
    const [busy, setBusy] = useState<VoiceMode | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [voice, setVoice] = useState<LiveVoiceConfig | null>(null)

    const start = async (mode: VoiceMode) => {
        setBusy(mode)
        setError(null)
        const r = await beginInterview(voiceRef, mode)
        setBusy(null)
        if (!r.success) { setError(r.error); return }
        setVoice(r.data.voice)
        setPhase(mode === "VOICE" ? "voice" : "typed")
    }

    // A reload into a spoken interview needs its settings again.
    useEffect(() => {
        if (phase !== "voice" || voice) return
        void beginInterview(voiceRef, "VOICE").then((r) => {
            if (r.success) setVoice(r.data.voice)
            else setError(r.error)
        })
    }, [phase, voice, voiceRef])

    if (phase === "consent") return <ConsentCard title={title} allows={allows} busy={busy} error={error} onStart={(m) => void start(m)} />
    if (phase === "typed") return <TypedInterview voiceRef={voiceRef} initialTurns={initial.mode === "TYPED" ? initial.turns : []} ending={ending} onHandIn={onHandIn} />
    if (!voice) {
        return (
            <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
                {error ? (
                    <>
                        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
                        {allows.typed && <Button variant="outline" onClick={() => void start("TYPED")}>Type instead</Button>}
                    </>
                ) : <InlineLoader size="md" />}
            </div>
        )
    }
    return (
        <VoiceInterview
            voiceRef={voiceRef}
            config={voice}
            initialTurns={initial.mode === "VOICE" ? initial.turns : []}
            ending={ending}
            onHandIn={onHandIn}
            onTypeInstead={allows.typed ? () => void start("TYPED") : null}
        />
    )
}

// ── Spoken ───────────────────────────────────────────────────────────────────

type AgentLike = { stop(): Promise<void>; mute(): void; unmute(): void; getInteractionId(): string | undefined }
type CallState = "idle" | "connecting" | "connected" | "listening" | "speaking" | "error"

const MIC_ERRORS: Record<string, string> = {
    NotAllowedError: "Microphone access was blocked. Allow it in the browser's address bar and try again.",
    NotFoundError: "No microphone was found. Plug one in and try again.",
    NotReadableError: "The microphone is in use by another app. Close it and try again.",
}

/** Add a transcript message: a growing utterance replaces itself, a new one is added. */
function addTurn(turns: VoiceTurn[], role: VoiceTurn["role"], text: string): VoiceTurn[] {
    const clean = text.trim()
    if (!clean) return turns
    const last = turns.at(-1)
    if (last && last.role === role && clean.startsWith(last.text)) return [...turns.slice(0, -1), { ...last, text: clean }]
    return [...turns, { role, text: clean, at: new Date().toISOString() }]
}

function VoiceInterview({ voiceRef, config, initialTurns, ending, onHandIn, onTypeInstead }: {
    voiceRef: VoiceRef
    config: LiveVoiceConfig
    initialTurns: VoiceTurn[]
    ending: boolean
    onHandIn: () => Promise<void>
    onTypeInstead: (() => void) | null
}) {
    const [state, setState] = useState<CallState>("idle")
    const [turns, setTurns] = useState<VoiceTurn[]>(initialTurns)
    const [level, setLevel] = useState(0)
    const [muted, setMuted] = useState(false)
    const [problem, setProblem] = useState<string | null>(null)
    const [connectedOnce, setConnectedOnce] = useState(false)
    const [confirmEnd, setConfirmEnd] = useState(false)
    const [handingIn, setHandingIn] = useState(false)
    const agent = useRef<AgentLike | null>(null)
    const stopping = useRef(false)
    const handedIn = useRef(false)
    const turnsRef = useRef(turns)
    useEffect(() => { turnsRef.current = turns }, [turns])

    // Save the transcript for display after a reload (scoring reads Sarvam's copy).
    useEffect(() => {
        if (!turns.length) return
        const t = window.setTimeout(() => void reportTurns(voiceRef, turns), SAVE_TURNS_MS)
        return () => window.clearTimeout(t)
    }, [turns, voiceRef])

    const handIn = useCallback(async () => {
        if (handedIn.current) return
        handedIn.current = true
        setHandingIn(true)
        stopping.current = true
        await agent.current?.stop().catch(() => undefined)
        agent.current = null
        await reportTurns(voiceRef, turnsRef.current)
        await onHandIn()
    }, [onHandIn, voiceRef])

    const connect = useCallback(async () => {
        setProblem(null)
        setState("connecting")
        stopping.current = false
        try {
            const { ConversationAgent, BrowserAudioInterface, InteractionType } = await import("sarvam-conv-ai-sdk/browser")
            const a = new ConversationAgent({
                apiKey: "",
                baseUrl: "/api/voice/sarvam/",
                customHeaders: { "X-Voice-Session": `${voiceRef.kind}:${voiceRef.id}` },
                config: {
                    ...config.ids,
                    user_identifier: config.userIdentifier,
                    user_identifier_type: "custom",
                    interaction_type: InteractionType.CALL,
                    input_sample_rate: 16000,
                    output_sample_rate: 16000,
                    agent_variables: config.variables,
                },
                audioInterface: new BrowserAudioInterface(16000),
                stateCallback: (s) => setState(s as CallState),
                audioLevelCallback: (l) => { if (l.direction === "output") setLevel(l.rms) },
                transcriptCallback: async (m) => setTurns((t) => addTurn(t, m.role === "user" ? "candidate" : "interviewer", m.content)),
                eventCallback: async (ev) => {
                    const e = ev as { type?: string; interaction_id?: string }
                    if (e.type === "server.event.interaction_connected" && e.interaction_id) {
                        setConnectedOnce(true)
                        void reportInteraction(voiceRef, e.interaction_id)
                    }
                    // The interviewer closed the interview: hand it in.
                    if (e.type === "server.event.interaction_end" && !stopping.current) void handIn()
                },
            })
            agent.current = a
            await a.start()
        } catch (e: unknown) {
            const name = e instanceof Error ? e.name : ""
            setProblem(MIC_ERRORS[name] ?? (e instanceof Error && /429/.test(e.message) ? "This interview has reconnected too many times. End it to hand in what you said." : "Couldn't connect to the interviewer. Try again."))
            setState("error")
            agent.current = null
        }
    }, [config, voiceRef, handIn])

    // Stop the call on unmount, always.
    useEffect(() => () => { stopping.current = true; void agent.current?.stop().catch(() => undefined) }, [])
    // Time up: end and hand in.
    useEffect(() => { if (ending) void handIn() }, [ending, handIn])

    const toggleMute = () => {
        if (!agent.current) return
        if (muted) agent.current.unmute(); else agent.current.mute()
        setMuted(!muted)
    }

    const speaking = state === "speaking"
    const label = handingIn ? "Handing in" : state === "connecting" ? "Connecting" : speaking ? "Interviewer is speaking" : state === "listening" ? (muted ? "Muted" : "Listening") : state === "connected" ? "Connected" : state === "error" ? "Not connected" : "Ready"

    return (
        <div className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="flex flex-col items-center justify-center gap-6 px-4 py-10">
                <div className="relative flex h-40 w-40 items-center justify-center">
                    <span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-neutral-900/10 transition-transform duration-100 dark:bg-white/10"
                        style={{ transform: `scale(${speaking ? 1 + Math.min(0.35, level * 2.5) : 1})` }}
                    />
                    <span className={cn("relative flex h-28 w-28 items-center justify-center rounded-full border-2", speaking ? "border-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700")}>
                        {state === "connecting" || handingIn ? <InlineLoader size="md" /> : muted ? <MicOff className="h-8 w-8 text-neutral-500" /> : <Mic className="h-8 w-8 text-neutral-900 dark:text-white" />}
                    </span>
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white" aria-live="polite">{label}</p>

                {state === "idle" && !handingIn && (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Button onClick={() => void connect()} className="gap-2"><Mic className="h-4 w-4" /> {connectedOnce || turns.length ? "Reconnect" : "Start the interview"}</Button>
                        <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">Your browser will ask for the microphone. Headphones help the interviewer hear only you.</p>
                    </div>
                )}
                {state === "error" && !handingIn && (
                    <div className="flex max-w-sm flex-col items-center gap-2 text-center">
                        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{problem}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void connect()} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Try again</Button>
                            {onTypeInstead && !connectedOnce && turns.length === 0 && <Button variant="ghost" onClick={onTypeInstead}>Type instead</Button>}
                        </div>
                    </div>
                )}
                {["connected", "listening", "speaking"].includes(state) && !handingIn && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={toggleMute} className="gap-1.5" aria-pressed={muted}>
                            {muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} {muted ? "Unmute" : "Mute"}
                        </Button>
                        {confirmEnd ? (
                            <>
                                <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Keep going</Button>
                                <Button onClick={() => void handIn()} className="gap-1.5"><PhoneOff className="h-4 w-4" /> End and hand in</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setConfirmEnd(true)} className="gap-1.5"><PhoneOff className="h-4 w-4" /> End</Button>
                        )}
                    </div>
                )}
                {(state === "idle" || state === "error") && (connectedOnce || turns.length > 0) && !handingIn && (
                    <Button variant="ghost" onClick={() => void handIn()}>End and hand in</Button>
                )}
            </section>
            <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-neutral-50 lg:max-h-[calc(100dvh-3.5rem)] lg:border-l lg:border-t-0 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="border-b border-neutral-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800">Transcript</p>
                <TranscriptPane turns={turns} className="min-h-0 flex-1 p-4" />
            </aside>
        </div>
    )
}

// ── Typed ────────────────────────────────────────────────────────────────────

function TypedInterview({ voiceRef, initialTurns, ending, onHandIn }: {
    voiceRef: VoiceRef
    initialTurns: VoiceTurn[]
    ending: boolean
    onHandIn: () => Promise<void>
}) {
    const [turns, setTurns] = useState<VoiceTurn[]>(initialTurns)
    const [draft, setDraft] = useState("")
    const [waiting, setWaiting] = useState(initialTurns.length === 0)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(initialTurns.at(-1)?.done === true)
    const handedIn = useRef(false)

    const handIn = useCallback(async () => {
        if (handedIn.current) return
        handedIn.current = true
        await onHandIn()
    }, [onHandIn])

    // The interviewer's opening, once.
    useEffect(() => {
        if (initialTurns.length) return
        void openTypedInterview(voiceRef).then((r) => {
            setWaiting(false)
            if (r.success) setTurns(r.data.turns)
            else setError(r.error)
        })
    }, [initialTurns.length, voiceRef])

    useEffect(() => { if (done) void handIn() }, [done, handIn])
    useEffect(() => { if (ending) void handIn() }, [ending, handIn])

    const send = async () => {
        const text = draft.trim()
        if (!text || waiting) return
        setWaiting(true)
        setError(null)
        setDraft("")
        setTurns((t) => [...t, { role: "candidate", text }])
        const r = await answerTypedInterview(voiceRef, text)
        setWaiting(false)
        if (!r.success) {
            // Put the answer back so it can be sent again.
            setTurns((t) => t.slice(0, -1))
            setDraft(text)
            setError(r.error)
            return
        }
        setTurns(r.data.turns)
        if (r.data.done) setDone(true)
    }

    return (
        <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col px-4">
            <TranscriptPane turns={turns} className="min-h-0 flex-1 py-6" empty="The interviewer is getting ready." />
            <div className="sticky bottom-0 border-t border-neutral-200 bg-neutral-50 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                {error && <p role="alert" className="mb-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
                {done ? (
                    <p className="flex items-center justify-center gap-2 py-2 text-sm text-neutral-600 dark:text-neutral-300"><InlineLoader size="sm" /> Interview complete. Handing in.</p>
                ) : (
                    <div className="flex items-end gap-2">
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, MAX_ANSWER))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send() } }}
                            placeholder={waiting ? "The interviewer is writing" : "Your answer. Enter to send, Shift+Enter for a new line."}
                            disabled={waiting && turns.length === 0}
                            rows={3}
                            className="min-h-[4.5rem] resize-none text-sm"
                            aria-label="Your answer"
                        />
                        <Button onClick={() => void send()} disabled={waiting || !draft.trim()} aria-label="Send" className="shrink-0">
                            {waiting ? <InlineLoader size="sm" /> : <SendHorizontal className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
