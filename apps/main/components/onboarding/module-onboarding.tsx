"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { OnboardingProfile, OnboardingTurn } from "@repo/db"
import { AdaptiveFlow } from "@repo/ui/components/adaptive-flow"
import toast from "@repo/ui/components/ui/sonner"
import { ArrowRight, Pencil } from "lucide-react"
import { answerOnboardingTurn, editOnboardingAnswer } from "@/actions/(main)/onboarding/module-onboarding.action"
import { onboardingModule, PRACTICE_MODULE_OF, type OnboardingModuleKey } from "@/lib/onboarding/modules"
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
    // The answered turn being changed (MO-8). While set, the flow shows that
    // question with its answer preselected; saving writes it in place and comes
    // back to the question the user was on. Nothing after it is discarded.
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
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

    const startEdit = useCallback((index: number) => {
        if (pending || savingEdit || profile) return
        if (!turns[index]?.answer) return
        setError(null)
        setEditingIndex(index)
    }, [pending, savingEdit, profile, turns])

    const stopEdit = useCallback(() => {
        setEditingIndex(null)
        // Back where the user was. If that question never arrived (an error, or the
        // edit began before it loaded), ask for it now.
        const last = turns[turns.length - 1]
        if (!profile && !(last && !last.answer)) void loadNext()
    }, [turns, profile, loadNext])

    const handleEdit = useCallback(async (values: string[], viaVoice: boolean) => {
        const index = editingIndex
        if (index === null) return
        const before = turns[index]
        if (!before?.answer) return
        // Optimistic, and straight back to the current question: the save is
        // small and rarely fails, and waiting on it would make the return feel slow.
        const edited: OnboardingTurn = { ...before, answer: { values, viaVoice }, answeredAt: new Date().toISOString() }
        setTurns((prev) => prev.map((t) => (t.index === index ? edited : t)))
        setEditingIndex(null)
        setSavingEdit(true)
        const res = await editOnboardingAnswer(run.id, index, values, viaVoice)
        setSavingEdit(false)
        if (!res.success) {
            setTurns((prev) => prev.map((t) => (t.index === index ? before : t)))
            toast.error(res.error)
            return
        }
        // Keep the question we are on as the client holds it; take the server's
        // copy of everything else.
        setTurns((prev) => {
            const server = res.run.turns
            const open = prev[prev.length - 1]
            if (open && !open.answer && !server[open.index]) return [...server, open]
            return server
        })
        toast.success(`Answer ${index + 1} updated`)
    }, [editingIndex, turns, run.id])

    const handleContinue = () => {
        setContinuing(true)
        // Start the recommended list now, so the module page usually opens with it
        // ready (PD-15). Fire and forget: the tab asks for one itself if this misses.
        const practiceModule = PRACTICE_MODULE_OF[moduleKey]
        if (practiceModule) {
            void fetch("/api/practice/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module: practiceModule }),
                keepalive: true,
            }).catch(() => undefined)
        }
        // Leave `?resume=1` behind if it is there, and re-run the server page so
        // its gate check sees the completed run and renders the dashboard.
        router.replace(mod.gatePath)
        router.refresh()
    }

    const editingTurn = editingIndex !== null ? turns[editingIndex] : undefined
    const flowTurn = editingTurn
        ? { index: editingTurn.index, question: editingTurn.question }
        : current && !current.answer ? { index: current.index, question: current.question } : null
    const initialValues = editingTurn?.answer?.values
    const shownNumber = editingTurn ? editingTurn.index + 1 : questionNumber

    return (
        <AdaptiveFlow
            rail={
                <OnboardingRail
                    moduleKey={moduleKey}
                    turns={turns}
                    questionNumber={questionNumber}
                    finished={Boolean(profile)}
                    editingIndex={editingIndex}
                    busy={pending || savingEdit}
                    onEdit={startEdit}
                    onReturn={stopEdit}
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
            // An edit shows a question the client already holds; nothing is loading.
            pending={editingTurn ? false : pending}
            error={editingTurn ? null : error}
            initialValues={initialValues}
            onAnswer={editingTurn ? handleEdit : handleAnswer}
            onRetry={loadNext}
            renderOpenInput={(props) => <OpenAnswerInput {...props} />}
            questionNumber={shownNumber}
            notice={
                editingTurn ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <span className="inline-flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-50">
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Editing your answer to question {editingTurn.index + 1}
                        </span>
                        <button
                            type="button"
                            onClick={stopEdit}
                            className="inline-flex cursor-pointer items-center gap-1 font-medium text-neutral-700 underline-offset-4 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-white"
                        >
                            Back to question {questionNumber}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    </div>
                ) : undefined
            }
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
