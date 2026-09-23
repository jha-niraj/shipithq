"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Speaking into the mentor composer (plan/practice-workspace, PW-5).
//
// The browser records, and every couple of seconds posts the clip SO FAR to
// /api/practice/voice/transcribe, which calls Sarvam. The transcript that comes
// back replaces the box's contents, so words arrive in bursts of about two
// seconds and the person presses Send themselves.
//
// Why not Sarvam's WebSocket, which would be word by word: it cannot be opened
// from the browser without handing it the API key, and relaying it needs a
// long-lived connection in the worker. Niraj chose this shape (2026-09-22).

/** How often the clip so far is sent for transcription. */
const INTERVAL_MS = 2000
/** A recording longer than this is almost certainly a forgotten mic. */
const MAX_SECONDS = 120

export type DictationStatus = "idle" | "starting" | "listening" | "transcribing"

export function useDictation({ onText }: { onText: (text: string) => void }) {
    const [status, setStatus] = useState<DictationStatus>("idle")
    const [error, setError] = useState<string | null>(null)
    const [unavailable, setUnavailable] = useState(false)

    const recorderRef = useRef<MediaRecorder | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stopAtRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // The latest request wins: a slow one must not overwrite newer words.
    const seqRef = useRef(0)
    const onTextRef = useRef(onText)
    onTextRef.current = onText

    const send = useCallback(async (final: boolean) => {
        const chunks = chunksRef.current
        if (chunks.length === 0) return
        const type = chunks[0]?.type || "audio/webm"
        const clip = new Blob(chunks, { type })
        const mine = ++seqRef.current
        const form = new FormData()
        form.append("audio", clip, `speech.${type.includes("mp4") ? "mp4" : "webm"}`)
        try {
            const res = await fetch("/api/practice/voice/transcribe", { method: "POST", body: form })
            const data = (await res.json()) as { text?: string; error?: string; unavailable?: boolean }
            if (!res.ok) {
                if (data.unavailable) setUnavailable(true)
                // A failed interim call is not worth interrupting someone mid-sentence;
                // only the last one reports.
                if (final || data.unavailable) setError(data.error ?? "Could not hear that.")
                return
            }
            if (mine !== seqRef.current) return
            if (data.text) onTextRef.current(data.text)
        } catch {
            if (final) setError("Could not reach the transcriber.")
        }
    }, [])

    const cleanup = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        if (stopAtRef.current) { clearTimeout(stopAtRef.current); stopAtRef.current = null }
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
    }, [])

    const stop = useCallback(async () => {
        const recorder = recorderRef.current
        if (!recorder) return
        setStatus("transcribing")
        await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve()
            try { recorder.stop() } catch { resolve() }
        })
        cleanup()
        await send(true)
        setStatus("idle")
        chunksRef.current = []
    }, [cleanup, send])

    const start = useCallback(async () => {
        setError(null)
        setStatus("starting")
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            })
            streamRef.current = stream
            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder
            chunksRef.current = []
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            // A timeslice, so a chunk exists to send before the recording ends.
            recorder.start(INTERVAL_MS / 2)
            setStatus("listening")
            timerRef.current = setInterval(() => { void send(false) }, INTERVAL_MS)
            stopAtRef.current = setTimeout(() => { void stop() }, MAX_SECONDS * 1000)
        } catch {
            cleanup()
            setStatus("idle")
            setError("The microphone is blocked. You can still type.")
        }
    }, [cleanup, send, stop])

    const toggle = useCallback(() => {
        if (status === "listening") void stop()
        else if (status === "idle") void start()
    }, [status, start, stop])

    // The mic must not outlive the panel.
    useEffect(() => () => cleanup(), [cleanup])

    return { status, error, unavailable, start, stop, toggle, isListening: status === "listening" }
}
