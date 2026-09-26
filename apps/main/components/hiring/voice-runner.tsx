"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@repo/ui/components/ui/sonner"
import { declineVoiceRound, submitAttempt, type RunnerAttempt } from "@/actions/hiring/run.action"
import { LiveInterview } from "@/components/voice/live-interview"
import { RunnerShell, useRoundClock } from "./runner-shell"

/*
 * A behavioural or culture round (plan/voice VO-11): the live interview, spoken
 * or typed as the round allows, on the round's clock. Handing in marks the
 * attempt SUBMITTED; the Scoring view then follows the scoring job.
 */

export function VoiceRunner({ attempt }: { attempt: RunnerAttempt }) {
    const router = useRouter()
    const voice = attempt.voice!
    const [ending, setEnding] = useState(false)
    const remaining = useRoundClock(attempt, () => setEnding(true))

    const handIn = useCallback(async () => {
        const r = await submitAttempt(attempt.id, { responses: {} })
        if (!r.success) { toast.error(r.error); return }
        router.refresh()
    }, [attempt.id, router])

    const exit = async () => {
        // Before consent nothing was recorded: close it and refund now.
        if (!voice.consented) await declineVoiceRound(attempt.id)
        router.push(attempt.backHref)
    }

    return (
        <RunnerShell attempt={attempt} remaining={remaining} onExit={() => void exit()}>
            <LiveInterview
                voiceRef={{ kind: "round", id: attempt.id }}
                title={attempt.roundTitle}
                allows={voice.allows}
                initial={{ mode: voice.mode, consented: voice.consented, turns: voice.turns }}
                ending={ending}
                onHandIn={handIn}
            />
        </RunnerShell>
    )
}
