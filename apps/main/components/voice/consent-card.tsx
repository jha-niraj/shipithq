"use client"

import { useId, useState } from "react"
import { Keyboard, Mic } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import type { VoiceMode } from "@repo/db"
import { TYPED_CONSENT_TEXT, VOICE_CONSENT_TEXT } from "@/lib/voice/consent"

/*
 * Before anything is recorded (plan/voice DoD 6): what happens to the answers,
 * one tick, and the choice to speak or type where the interview allows both.
 */

export function ConsentCard({ title, allows, busy, error, onStart }: {
    title: string
    allows: { voice: boolean; typed: boolean }
    busy: VoiceMode | null
    error: string | null
    onStart: (mode: VoiceMode) => void
}) {
    const id = useId()
    const [agreed, setAgreed] = useState(false)
    const text = allows.voice ? VOICE_CONSENT_TEXT : TYPED_CONSENT_TEXT
    return (
        <div className="mx-auto w-full max-w-lg px-4 py-12">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Before you start</p>
                <h1 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h1>
                <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                    {allows.voice && <li>An AI interviewer asks one question at a time. Speak naturally; you can interrupt it, and it will stop and listen.</li>}
                    {allows.typed && <li>{allows.voice ? "Prefer to write? Type your answers instead: same questions, same assessment." : "You answer in writing, one question at a time."}</li>}
                    <li>The timer runs on our server. Leaving the page doesn&apos;t stop it.</li>
                </ul>
                <label htmlFor={id} className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                    <Checkbox id={id} checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                    <span>{text}</span>
                </label>
                {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                    {allows.voice && (
                        <Button disabled={!agreed || busy !== null} onClick={() => onStart("VOICE")} className="gap-2">
                            {busy === "VOICE" ? <InlineLoader size="sm" /> : <Mic className="h-4 w-4" />} Start speaking
                        </Button>
                    )}
                    {allows.typed && (
                        <Button variant={allows.voice ? "outline" : "default"} disabled={!agreed || busy !== null} onClick={() => onStart("TYPED")} className="gap-2">
                            {busy === "TYPED" ? <InlineLoader size="sm" /> : <Keyboard className="h-4 w-4" />} {allows.voice ? "Type instead" : "Start"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
