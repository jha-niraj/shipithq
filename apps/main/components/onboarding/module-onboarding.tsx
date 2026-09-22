"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { OnboardingProfile, OnboardingTurn } from "@repo/db"
import { AdaptiveFlow } from "@repo/ui/components/adaptive-flow"
import toast from "@repo/ui/components/ui/sonner"
import { answerOnboardingTurn, reopenOnboardingTurn } from "@/actions/(main)/onboarding/module-onboarding.action"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"
import type { OnboardingRunView } from "@/types/onboarding"
import { fetchNextQuestion } from "./next-question"
import { OnboardingRail, OnboardingRailCompact } from "./onboarding-rail"
import { OnboardingSummaryCard } from "./onboarding-summary-card"
import { OpenAnswerInput } from "./open-answer-input"

/**
 * Runs one onboarding from its first unanswered question to the summary.
 *
 * Owns the run's turns on the client, mirrors every change to the server
 * before asking for the next question, and never keeps anything only in the
 * browser: a reload re-mounts with the server's copy and lands on the same
 * unanswered question.
 */
export function ModuleOnboarding({ moduleKey, run }: { moduleKey: OnboardingModuleKey; run: OnboardingRunView }) {
    const router = useRouter()
    const mod = onboardingModule(moduleKey)

    const [turns, setTurns] = useState<OnboardingTurn[]>(run.turns)
    const [pending, setPending] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<OnboardingProfile | null>(run.profile)
    const [continuing, setContinuing] = useState(false)
    // The answer a reopened question had, preselected when it is shown again.
    const [preselect, setPreselect] = useState<{ index: number; values: string[] } | null>(null)
    // React strict mode mounts twice in dev; one request per mount is enough.
    const requested = useRef(false)

    const current = turns[turns.length - 1]
    const currentIsOpen = Boolean(current && !current.answer)
    const answeredCount = turns.filter((t) => t.answer).length
    const questionNumber = answeredCount + 1

    const loadNext = useCallback(async () => {
        setError(null)
        setPending(true)
        try {
            const res = await fetchNextQuestion(run.id)
            if (res.done) {
                setProfile(res.profile)
            } else {
                setTurns((prev) => {
                    const last = prev[prev.length - 1]
                    // Resume returns the same pending turn we already hold.
                    if (last && last.index === res.turn.index) return [...prev.slice(0, -1), res.turn]
                    return [...prev.slice(0, res.turn.index), res.turn]
                })
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "The next question did not come through. Try again.")
        } finally {
            setPending(false)
        }
    }, [run.id])

    useEffect(() => {
        if (requested.current) return
        requested.current = true
        if (profile) {
            setPending(false)
            return
        }
        if (currentIsOpen) {
            setPending(false)
            return
        }
        void loadNext()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleAnswer = useCallback(async (values: string[], viaVoice: boolean) => {
        if (!current || current.answer) return
        // Optimistic: the rail row appears and the slot goes to skeleton at once.
        const optimistic: OnboardingTurn = {
            ...current,
            answer: { values, viaVoice },
            answeredAt: new Date().toISOString(),
        }
        setTurns((prev) => [...prev.slice(0, -1), optimistic])
        setPreselect(null)
        setPending(true)
        setError(null)

        const saved = await answerOnboardingTurn(run.id, current.index, values, viaVoice)
        if (!saved.success) {
            // Roll the optimistic answer back and show why.
            setTurns((prev) => [...prev.slice(0, -1), current])
            setPending(false)
            setError(saved.error)
            return
        }
        setTurns(saved.run.turns)
        await loadNext()
    }, [current, loadNext, run.id])

    const handleReopen = useCallback(async (index: number) => {
        const target = turns[index]
        if (!target?.answer) return
        const dropped = turns.length - index - 1
        const ok = window.confirm(
            dropped > 0
                ? `Changing this discards the ${dropped} question${dropped === 1 ? "" : "s"} after it. They will be asked again based on your new answer.`
                : "Change this answer?",
        )
        if (!ok) return

        setPending(true)
        setError(null)
        const res = await reopenOnboardingTurn(run.id, index)
        setPending(false)
        if (!res.success) {
            toast.error(res.error)
            return
        }
        setPreselect({ index, values: target.answer.values })
        setTurns(res.run.turns)
    }, [run.id, turns])

    const handleContinue = () => {
        setContinuing(true)
        // Leave `?resume=1` behind if it is there, and re-run the server page so
        // its gate check sees the completed run and renders the dashboard.
        router.replace(mod.gatePath)
        router.refresh()
    }

    const flowTurn = current && !current.answer ? { index: current.index, question: current.question } : null
    const initialValues = preselect && flowTurn && preselect.index === flowTurn.index ? preselect.values : undefined

    return (
        <AdaptiveFlow
            rail={
                <OnboardingRail
                    moduleKey={moduleKey}
                    turns={turns}
                    questionNumber={questionNumber}
                    finished={Boolean(profile)}
                    onReopen={handleReopen}
                />
            }
            railCompact={
                <OnboardingRailCompact
                    moduleKey={moduleKey}
                    answeredCount={answeredCount}
                    questionNumber={questionNumber}
                    finished={Boolean(profile)}
                />
            }
            turn={flowTurn}
            pending={pending}
            error={error}
            initialValues={initialValues}
            onAnswer={handleAnswer}
            onRetry={loadNext}
            renderOpenInput={(props) => <OpenAnswerInput {...props} />}
            questionNumber={questionNumber}
            slot={
                profile ? (
                    <OnboardingSummaryCard
                        profile={profile}
                        moduleLabel={mod.label}
                        onContinue={handleContinue}
                        continuing={continuing}
                    />
                ) : undefined
            }
        />
    )
}
