"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { modelFor } from "@repo/ai"

/**
 * Transcribe audio using OpenAI Whisper.
 * Returns raw transcription text - no polishing or reformatting.
 * Used for cover letter Q&A voice input.
 */
export async function whisperTranscribe(
    audioBase64: string,
    mimeType: string = "audio/webm"
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        if (!process.env.OPENAI_API_KEY) {
            return { success: false, error: "OpenAI API key not configured" }
        }

        const audioBuffer = Buffer.from(audioBase64, "base64")
        const blob = new Blob([audioBuffer], { type: mimeType })

        const formData = new FormData()
        formData.append("file", blob, "audio.webm")
        formData.append("model", modelFor("transcription"))

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: formData,
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Whisper API error ${res.status}: ${err}`)
        }

        const data = await res.json() as { text?: string }
        if (!data.text?.trim()) return { success: false, error: "No transcription returned" }

        return { success: true, text: data.text.trim() }
    } catch (err) {
        console.error("[whisperTranscribe]", err)
        return {
            success: false,
            error: err instanceof Error ? err.message : "Transcription failed",
        }
    }
}
