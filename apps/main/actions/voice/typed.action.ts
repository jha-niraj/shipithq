"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import type { VoiceTurn } from "@repo/db"
import { interviewBrief, loadVoiceSession, saveTurns, type VoiceRef } from "@/lib/voice/session"
import { nextInterviewerTurn } from "@/lib/voice/typed-interviewer"

/*
 * A typed interview, turn by turn (plan/voice VO-8). The saved turns ARE the
 * transcript for a typed interview, so they're only ever written here, on the
 * server, never taken from the browser.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string; code?: string }
export type TypedState = { turns: VoiceTurn[]; done: boolean }

const MAX_ANSWER_CHARS = 4000

async function typedSession(ref: VoiceRef) {
    const session = await getSession(await headers())
    const uid = session?.user?.id
    if (!uid) return { error: "Sign in first." as const }
    const s = await loadVoiceSession(uid, ref)
    if (!s) return { error: "That interview doesn't exist." as const }
    if (!s.live) return { error: "This interview has ended." as const }
    if (s.mode !== "TYPED" || !s.consentedAt) return { error: "Choose to type your answers first." as const }
    return { s }
}

const closed = (turns: VoiceTurn[]) => turns.at(-1)?.done === true

/** The interviewer's opening, once. Calling it again returns what's there. */
export async function openTypedInterview(ref: VoiceRef): Promise<Result<TypedState>> {
    try {
        const r = await typedSession(ref)
        if ("error" in r) return { success: false, error: r.error! }
        if (r.s.turns.length) return { success: true, data: { turns: r.s.turns, done: closed(r.s.turns) } }
        const brief = await interviewBrief(r.s)
        if (!brief) return { success: false, error: "This interview's brief is missing." }
        const first = await nextInterviewerTurn(brief, [])
        const turns: VoiceTurn[] = [{ role: "interviewer", text: first.message, at: new Date().toISOString() }]
        await saveTurns(r.s, turns)
        return { success: true, data: { turns, done: false } }
    } catch (error: unknown) {
        console.error("openTypedInterview:", error instanceof Error ? error.message : error)
        return { success: false, error: "The interviewer didn't answer. Try again." }
    }
}

/**
 * The candidate's answer and the interviewer's next turn. On failure nothing is
 * saved, so the client puts the text back for a resend.
 */
export async function answerTypedInterview(ref: VoiceRef, answer: string): Promise<Result<TypedState>> {
    const text = typeof answer === "string" ? answer.trim() : ""
    if (!text) return { success: false, error: "Write an answer first." }
    if (text.length > MAX_ANSWER_CHARS) return { success: false, error: `Keep an answer under ${MAX_ANSWER_CHARS} characters.` }
    try {
        const r = await typedSession(ref)
        if ("error" in r) return { success: false, error: r.error! }
        const turns = r.s.turns
        // One answer per question: a double submit or a stale tab doesn't add a second.
        if (!turns.length || turns[turns.length - 1]!.role !== "interviewer") return { success: false, error: "Wait for the next question.", code: "OUT_OF_TURN" }
        if (closed(turns)) return { success: true, data: { turns, done: true } }
        const brief = await interviewBrief(r.s)
        if (!brief) return { success: false, error: "This interview's brief is missing." }
        const withAnswer: VoiceTurn[] = [...turns, { role: "candidate", text, at: new Date().toISOString() }]
        const next = await nextInterviewerTurn(brief, withAnswer)
        const reply = { role: "interviewer" as const, text: next.message, at: new Date().toISOString(), ...(next.done ? { done: true } : {}) }
        const all = [...withAnswer, reply]
        await saveTurns(r.s, all)
        return { success: true, data: { turns: all, done: next.done } }
    } catch (error: unknown) {
        console.error("answerTypedInterview:", error instanceof Error ? error.message : error)
        return { success: false, error: "The interviewer didn't answer. Your answer is still in the box: send it again." }
    }
}
