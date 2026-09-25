"use server"

import { requirePermission } from "@/lib/permissions"

const ELEVENLABS_API = "https://api.elevenlabs.io/v1"

export interface TranscriptionResult {
    success: boolean
    text?: string
    error?: string
    words?: Array<{ text: string; start: number; end: number }>
    language?: string
    confidence?: number
}

export interface TranscriptionOptions {
    languageCode?: string
    tagAudioEvents?: boolean
    diarize?: boolean
}

export async function transcribeAudio(
    audioBase64: string,
    mimeType: string = "audio/webm",
    options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
    try {
        const auth = await requirePermission()
        if (!auth.ok) return { success: false, error: auth.error }

        if (!process.env.ELEVENLABS_API_KEY) {
            return { success: false, error: "ElevenLabs API key not configured" }
        }

        const audioBuffer = Buffer.from(audioBase64, "base64")
        const audioBlob = new Blob([audioBuffer], { type: mimeType })

        const formData = new FormData()
        formData.append("file", audioBlob, "audio.webm")
        formData.append("model_id", "scribe_v1")
        formData.append("language_code", options.languageCode || "eng")
        if (options.tagAudioEvents !== undefined) formData.append("tag_audio_events", String(options.tagAudioEvents))
        if (options.diarize !== undefined) formData.append("diarize", String(options.diarize))

        const response = await fetch(`${ELEVENLABS_API}/speech-to-text`, {
            method: "POST",
            headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
            body: formData,
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`ElevenLabs API error ${response.status}: ${err}`)
        }

        const transcription = await response.json() as { text?: string; language_code?: string }

        if (transcription?.text) {
            return {
                success: true,
                text: transcription.text,
                language: transcription.language_code || options.languageCode || "eng",
            }
        }

        return { success: false, error: "Unexpected response format from ElevenLabs" }
    } catch (error) {
        console.error("Speech to text error:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to transcribe audio",
        }
    }
}

export async function batchTranscribeAudio(
    audioFiles: Array<{ base64: string; mimeType: string }>,
    options: TranscriptionOptions = {}
): Promise<TranscriptionResult[]> {
    const auth = await requirePermission()
    if (!auth.ok) return audioFiles.map(() => ({ success: false, error: auth.error }))
    return Promise.all(audioFiles.map(f => transcribeAudio(f.base64, f.mimeType, options)))
}

export async function checkSpeechToTextAvailability(): Promise<{ available: boolean; message?: string }> {
    const auth = await requirePermission()
    if (!auth.ok) return { available: false, message: auth.error }
    if (!process.env.ELEVENLABS_API_KEY) {
        return { available: false, message: "Speech to text service is not configured" }
    }
    return { available: true }
}
