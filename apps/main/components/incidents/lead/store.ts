"use client"

import { create } from "zustand"
import toast from "@repo/ui/components/ui/sonner"
import { openSignInPrompt } from "@/components/auth/sign-in-prompt"
import { askLead, explainTerm, narrationFor } from "@/actions/(main)/incidents/narration.action"

/**
 * The incident lead (plan/incidents INC-47): one voice for the whole case, shared by the
 * rail (controls and the thread) and the chapter (what is lit). There is exactly one
 * Audio element, here, so nothing can ever speak twice.
 *
 * The player registers the case on open and the chapter on each chapter step; leaving
 * stops the voice. The thread is the run's questions and the lead's answers.
 */

export type LeadTurn = {
    id: string
    who: "you" | "lead"
    text: string
    /** The spoken answer, when there is one. */
    audio?: string | null
    /** A term explanation carries where to learn it properly (opens in a new tab). */
    link?: { href: string; label: string } | null
}

type Chapter = { chapterId: string; stepTitle: string; paragraphs: string[] }
type State = "idle" | "loading" | "playing" | "paused" | "done" | "unavailable"

type LeadStore = {
    caseSlug: string | null
    caseTitle: string
    /** False without a recorded run: asking opens the start screen instead (INC-34). */
    canAsk: boolean
    requireRun: (() => boolean) | null
    chapter: Chapter | null
    index: number | null
    state: State
    /** Playing a thread answer rather than the chapter. */
    answering: string | null
    /** The answer playing: seconds in, and its length (for the bubble's progress). */
    elapsed: number
    duration: number
    speed: number
    autoplay: boolean
    thread: LeadTurn[]
    asking: boolean
    tab: "lead" | "ai"
    /** The reader turned the rail off on cases: it no longer opens by itself (remembered). */
    railOff: boolean
    setRailOff: (off: boolean) => void

    register: (c: { slug: string; title: string; thread: LeadTurn[]; canAsk: boolean; requireRun: () => boolean }) => void
    unregister: () => void
    setChapter: (c: Chapter | null) => void
    playFrom: (i: number) => Promise<void>
    toggle: () => void
    setSpeed: (s: number) => void
    setAutoplay: (on: boolean) => void
    setTab: (t: "lead" | "ai") => void
    ask: (text: string) => Promise<void>
    explain: (termKey: string, term: string) => Promise<void>
    playTurn: (id: string) => void
    stop: () => void
}

let audio: HTMLAudioElement | null = null
const urls = new Map<string, string>()
const pref = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback } catch { return fallback } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private window */ } }

function player(): HTMLAudioElement {
    if (!audio) audio = new Audio()
    return audio
}

export const useLead = create<LeadStore>((set, get) => ({
    caseSlug: null,
    caseTitle: "",
    canAsk: false,
    requireRun: null,
    chapter: null,
    index: null,
    state: "idle",
    answering: null,
    elapsed: 0,
    duration: 0,
    speed: 1,
    autoplay: false,
    thread: [],
    asking: false,
    tab: "lead",
    railOff: false,
    setRailOff: (off) => { set({ railOff: off }); save("incidents:rail-off", off ? "1" : "0") },

    register: ({ slug, title, thread, canAsk, requireRun }) => {
        const same = get().caseSlug === slug
        set({
            caseSlug: slug, caseTitle: title, canAsk, requireRun,
            thread: same && get().thread.length > thread.length ? get().thread : thread,
            speed: Number(pref("incidents:speed", "1")) || 1,
            // Off unless the reader turned it on (Niraj, 2026-09-27).
            autoplay: pref("incidents:autoplay", "0") === "1",
            railOff: pref("incidents:rail-off", "0") === "1",
        })
    },

    unregister: () => {
        get().stop()
        set({ caseSlug: null, chapter: null, index: null, thread: [], requireRun: null })
    },

    setChapter: (c) => {
        const prev = get().chapter
        if (prev?.chapterId === c?.chapterId) return
        get().stop()
        set({ chapter: c, index: null, state: "idle" })
        if (c && c.paragraphs.length && get().autoplay) window.setTimeout(() => { if (get().chapter?.chapterId === c.chapterId) void get().playFrom(0) }, 400)
    },

    playFrom: async (i) => {
        const { chapter, caseSlug } = get()
        if (!chapter || !caseSlug) return
        if (i >= chapter.paragraphs.length) { set({ state: "done", index: null }); return }
        set({ state: "loading", answering: null })
        const key = `${caseSlug}:${chapter.chapterId}:${i}`
        let url = urls.get(key)
        if (!url) {
            const r = await narrationFor(caseSlug, chapter.chapterId, i)
            if (!r.success) { set({ state: r.unavailable ? "unavailable" : "idle" }); if (!r.unavailable) toast.error(r.error); return }
            url = r.url
            urls.set(key, url)
        }
        // The reader may have moved on while this loaded.
        if (get().chapter?.chapterId !== chapter.chapterId) return
        const a = player()
        a.src = url
        a.playbackRate = get().speed
        a.onended = () => void get().playFrom(i + 1)
        set({ index: i })
        try {
            await a.play()
            set({ state: "playing" })
            // Warm the next paragraph while this one plays.
            const next = `${caseSlug}:${chapter.chapterId}:${i + 1}`
            if (i + 1 < chapter.paragraphs.length && !urls.has(next)) void narrationFor(caseSlug, chapter.chapterId, i + 1).then((r) => { if (r.success) urls.set(next, r.url) })
        } catch {
            set({ state: "idle" }) // the browser wanted a click first
        }
    },

    toggle: () => {
        const { state, index } = get()
        const a = audio
        if (state === "playing" && a) { a.pause(); set({ state: "paused" }); return }
        if (state === "paused" && a) { void a.play().then(() => set({ state: "playing" })); return }
        void get().playFrom(state === "done" ? 0 : index ?? 0)
    },

    setSpeed: (s) => { set({ speed: s }); save("incidents:speed", String(s)); if (audio) audio.playbackRate = s },
    setAutoplay: (on) => { set({ autoplay: on }); save("incidents:autoplay", on ? "1" : "0") },
    setTab: (t) => set({ tab: t }),

    ask: async (text) => {
        const { caseSlug, chapter, requireRun } = get()
        const q = text.trim()
        if (!caseSlug || q.length < 3) return
        const mine: LeadTurn = { id: `you-${Date.now()}`, who: "you", text: q }
        set((s) => ({ thread: [...s.thread, mine], asking: true, tab: "lead" }))
        get().stop()
        const r = await askLead(caseSlug, chapter?.stepTitle ?? get().caseTitle, q)
        set({ asking: false })
        if (!r.success) {
            set((s) => ({ thread: s.thread.filter((t) => t.id !== mine.id) }))
            if (r.code === "RUN") requireRun?.()
            else if (r.code === "AUTH") openSignInPrompt({ callback: window.location.pathname, eyebrow: "The incident lead", title: "Sign in to ask the lead", body: "The lead answers your questions out loud and pushes on your reasoning. It needs an account; you come straight back to this chapter." })
            else toast.error(r.error)
            return
        }
        const turn: LeadTurn = { id: `lead-${Date.now()}`, who: "lead", text: r.answer, audio: r.audio }
        set((s) => ({ thread: [...s.thread, turn] }))
        if (r.audio) get().playTurn(turn.id)
    },

    explain: async (termKey, term) => {
        const { caseSlug } = get()
        if (!caseSlug) return
        const mine: LeadTurn = { id: `you-${Date.now()}`, who: "you", text: `What is ${term}?` }
        set((s) => ({ thread: [...s.thread, mine], asking: true, tab: "lead" }))
        get().stop()
        const r = await explainTerm(caseSlug, termKey)
        set({ asking: false })
        if (!r.success) { set((s) => ({ thread: s.thread.filter((t) => t.id !== mine.id) })); toast.error(r.error); return }
        const turn: LeadTurn = { id: `lead-${Date.now()}`, who: "lead", text: r.text, audio: r.audio, link: r.link }
        set((s) => ({ thread: [...s.thread, turn] }))
        if (r.audio) get().playTurn(turn.id)
    },

    playTurn: (id) => {
        const turn = get().thread.find((t) => t.id === id)
        if (!turn?.audio) return
        const a = player()
        a.src = turn.audio
        a.playbackRate = get().speed
        a.onended = () => { a.ontimeupdate = null; set({ state: "idle", answering: null, elapsed: 0 }) }
        a.ontimeupdate = () => set({ elapsed: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : 0 })
        set({ answering: id, index: null, elapsed: 0, duration: 0 })
        void a.play().then(() => set({ state: "playing" })).catch(() => set({ state: "idle", answering: null }))
    },

    stop: () => {
        if (audio) { audio.pause(); audio.onended = null; audio.ontimeupdate = null }
        set({ state: get().state === "unavailable" ? "unavailable" : "idle", index: null, answering: null })
    },
}))
