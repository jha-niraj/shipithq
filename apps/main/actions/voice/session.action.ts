"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import type { VoiceMode, VoiceTurn } from "@repo/db"
import { isAgentConfigured, publicAgentIds } from "@repo/sarvamai/agents"
import { TYPED_CONSENT_TEXT, VOICE_CONSENT_TEXT } from "@/lib/voice/consent"
import { interviewBrief, loadVoiceSession, recordConsent, saveTurns, setInteraction, type VoiceRef } from "@/lib/voice/session"

/*
 * The live interview's server half (plan/voice VO-7): consent, the settings the
 * browser SDK needs, and the turns and call id it reports back. The browser's
 * turns are display only; scoring reads Sarvam's copy (VO-9).
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }

export interface LiveVoiceConfig {
    ids: { org_id: string; workspace_id: string; app_id: string }
    userIdentifier: string
    variables: Record<string, string>
}

function validRef(ref: VoiceRef): ref is VoiceRef {
    return Boolean(ref) && (ref.kind === "mock" || ref.kind === "round" || ref.kind === "standup" || ref.kind === "incident") && typeof ref.id === "string" && /^[a-z0-9-]{10,40}$/.test(ref.id)
}

async function owned(ref: VoiceRef) {
    if (!validRef(ref)) return null
    const session = await getSession(await headers())
    const uid = session?.user?.id
    if (!uid) return null
    return loadVoiceSession(uid, ref)
}

async function liveConfig(ref: VoiceRef, uid: string): Promise<LiveVoiceConfig | null> {
    const s = await loadVoiceSession(uid, ref)
    const ids = publicAgentIds()
    const brief = s ? await interviewBrief(s) : null
    return s && ids && brief ? { ids, userIdentifier: `${ref.kind}-${ref.id}`, variables: brief.variables } : null
}

/**
 * Consent, and the mode chosen. For VOICE, returns what the SDK needs to call
 * the interviewer. Voice being unavailable here is said plainly, so the page can
 * offer typing instead.
 */
export async function beginInterview(ref: VoiceRef, mode: VoiceMode): Promise<Result<{ voice: LiveVoiceConfig | null }>> {
    try {
        const s = await owned(ref)
        if (!s) return { success: false, error: "That interview doesn't exist." }
        if (!s.live) return { success: false, error: "This interview has ended." }
        if (mode === "VOICE" && !isAgentConfigured()) return { success: false, error: "Voice isn't available right now. You can type your answers instead.", code: "VOICE_UNAVAILABLE" }
        // Consent is given once, and a reload keeps the mode. Switching is allowed
        // only before anything happened: a denied microphone can still move to typing.
        const started = Boolean(s.interactionId) || s.turns.length > 0
        if (s.consentedAt && s.mode !== mode && started) {
            return { success: false, error: `You chose to ${s.mode === "VOICE" ? "speak" : "type"} for this interview.`, code: "MODE_LOCKED" }
        }
        if (!s.consentedAt || s.mode !== mode) {
            const ok = await recordConsent(s, { text: mode === "VOICE" ? VOICE_CONSENT_TEXT : TYPED_CONSENT_TEXT, mode })
            if (!ok) return { success: false, error: mode === "VOICE" ? "This interview can't be spoken." : "This interview can't be typed." }
        }
        if (mode === "TYPED") return { success: true, data: { voice: null } }
        const config = await liveConfig(ref, s.userId)
        return config ? { success: true, data: { voice: config } } : { success: false, error: "Voice isn't available right now. You can type your answers instead.", code: "VOICE_UNAVAILABLE" }
    } catch (error: unknown) {
        console.error("beginInterview:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't start the interview. Try again." }
    }
}

/** The Sarvam call id, as soon as the call connects. */
export async function reportInteraction(ref: VoiceRef, interactionId: string): Promise<Result<null>> {
    try {
        const s = await owned(ref)
        if (!s || !s.live || s.mode !== "VOICE") return { success: false, error: "This interview has ended." }
        if (typeof interactionId !== "string" || !interactionId.trim()) return { success: false, error: "No call id." }
        await setInteraction(s, interactionId.trim())
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("reportInteraction:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't save the call." }
    }
}

/** The live transcript so far, for display after a reload. Voice only: typed turns are written by the server. */
export async function reportTurns(ref: VoiceRef, turns: VoiceTurn[]): Promise<Result<null>> {
    try {
        const s = await owned(ref)
        if (!s || !s.live || s.mode !== "VOICE") return { success: false, error: "This interview has ended." }
        await saveTurns(s, turns)
        return { success: true, data: null }
    } catch (error: unknown) {
        console.error("reportTurns:", error instanceof Error ? error.message : error)
        return { success: false, error: "Couldn't save the transcript." }
    }
}
