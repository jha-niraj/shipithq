"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { useTheme } from "@repo/ui/components/themeprovider"
import { cn } from "@repo/ui/lib/utils"
import { saveAttempt, submitAttempt, type RunnerAttempt } from "@/actions/hiring/run.action"
import { RunnerShell, useRoundClock } from "./runner-shell"

/*
 * The system design round (plan/hiring-rounds HR-16): the brief and the rubric
 * it's scored against on the left, a diagram and a written answer on the right.
 * Saved as it changes; scored by AI against the rubric when handed in.
 */

const ExcalidrawCanvas = dynamic(
    () => import("@/app/(main)/practice/_components/workspace/excalidraw-canvas").then((m) => ({ default: m.ExcalidrawCanvas })),
    { ssr: false, loading: () => <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900" /> },
)

const SAVE_DEBOUNCE_MS = 2000

export function DesignRunner({ attempt }: { attempt: RunnerAttempt }) {
    const router = useRouter()
    const { resolvedTheme } = useTheme()
    const saved = attempt.responses as { answer?: string; diagram?: { elements?: unknown[] } }
    const [answer, setAnswer] = useState(saved.answer ?? "")
    const diagram = useRef<{ elements: unknown[] }>({ elements: saved.diagram?.elements ?? [] })
    const [tab, setTab] = useState<"diagram" | "answer">("diagram")
    const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const [confirm, setConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const pending = useRef({ pastes: 0, tabLeaves: 0 })

    const takeIntegrity = () => {
        const d = { ...pending.current }
        pending.current = { pastes: 0, tabLeaves: 0 }
        return d
    }

    const answerRef = useRef(answer)
    useEffect(() => { answerRef.current = answer }, [answer])
    const responses = () => ({ answer: answerRef.current, diagram: { elements: diagram.current.elements } })
    const timer = useRef<number | null>(null)
    const queueSave = useCallback(() => {
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(async () => {
            setSaving("saving")
            const r = await saveAttempt(attempt.id, { responses: responses(), integrity: takeIntegrity() })
            setSaving(r.success ? "saved" : "error")
        }, SAVE_DEBOUNCE_MS)
    }, [attempt.id])

    const submit = useCallback(async () => {
        if (submitting) return
        setSubmitting(true)
        if (timer.current) window.clearTimeout(timer.current)
        const r = await submitAttempt(attempt.id, { responses: responses(), integrity: takeIntegrity() })
        if (!r.success) { setSubmitting(false); toast.error(r.error); return }
        router.refresh()
    }, [attempt.id, submitting, router])

    const remaining = useRoundClock(attempt, () => void submit())

    useEffect(() => {
        const onVis = () => { if (document.visibilityState === "hidden") pending.current.tabLeaves++ }
        document.addEventListener("visibilitychange", onVis)
        return () => document.removeEventListener("visibilitychange", onVis)
    }, [])

    const exit = async () => {
        if (timer.current) window.clearTimeout(timer.current)
        await saveAttempt(attempt.id, { responses: responses(), integrity: takeIntegrity() })
        router.push(attempt.backHref)
    }

    if (submitting) {
        return (
            <RunnerShell attempt={attempt} remaining={null} onExit={null}>
                <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
                    <InlineLoader size="md" />
                    <p className="font-medium text-neutral-900 dark:text-white">Scoring your design against the rubric</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Usually under 25 seconds. If it can&apos;t be scored, your credits come back.</p>
                </div>
            </RunnerShell>
        )
    }

    const design = attempt.design
    return (
        <RunnerShell attempt={attempt} remaining={remaining} onExit={() => void exit()}>
            <div className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)]">
                <aside className="overflow-y-auto border-b border-neutral-200 bg-white p-5 lg:max-h-[calc(100dvh-3.5rem)] lg:border-b-0 lg:border-r dark:border-neutral-800 dark:bg-neutral-950">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">The brief</p>
                    <h1 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{design?.title ?? "System design"}</h1>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{design?.prompt}</p>
                    {design && (
                        <>
                            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-neutral-500">How it&apos;s scored (AI-assessed)</p>
                            <ul className="mt-2 space-y-2">
                                {design.rubric.map((c) => (
                                    <li key={c.criterion} className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
                                        <p className="flex justify-between gap-2 text-sm font-medium text-neutral-900 dark:text-white"><span>{c.criterion}</span><span className="font-mono text-xs text-neutral-500">{c.weight}%</span></p>
                                        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{c.lookFor}</p>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </aside>

                <section className="flex min-w-0 flex-col">
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950">
                        <div role="tablist" aria-label="Your answer" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
                            {(["diagram", "answer"] as const).map((t) => (
                                <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                                    className={cn("rounded-md px-3 py-1 text-sm font-medium", tab === t ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                                    {t === "diagram" ? "Diagram" : "Written answer"}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400" aria-live="polite">
                                {saving === "saving" ? "Saving" : saving === "saved" ? "Saved" : saving === "error" ? "Not saved" : ""}
                            </span>
                            {confirm ? (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Keep going</Button>
                                    <Button size="sm" onClick={() => void submit()}>Submit for scoring</Button>
                                </>
                            ) : (
                                <Button size="sm" onClick={() => setConfirm(true)}>Submit</Button>
                            )}
                        </div>
                    </div>
                    <div className={cn("relative min-h-[28rem] flex-1", tab !== "diagram" && "hidden")}>
                        <div className="absolute inset-0">
                            <ExcalidrawCanvas
                                initialData={saved.diagram}
                                darkMode={resolvedTheme === "dark"}
                                onChange={(d) => { diagram.current = { elements: d.elements }; queueSave() }}
                            />
                        </div>
                    </div>
                    <div className={cn("flex-1 p-4", tab !== "answer" && "hidden")}>
                        <Textarea
                            value={answer}
                            onChange={(e) => { setAnswer(e.target.value); queueSave() }}
                            onPaste={() => { pending.current.pastes++ }}
                            placeholder="Walk through your design: requirements and scale, the API and data model, how it works end to end, how it scales, and the trade-offs you chose."
                            className="h-full min-h-[24rem] resize-none text-sm leading-relaxed"
                            maxLength={12000}
                            aria-label="Written answer"
                        />
                    </div>
                </section>
            </div>
        </RunnerShell>
    )
}

/** What was handed in, read-only, under the rubric result. */
export function DesignSubmission({ attempt }: { attempt: RunnerAttempt }) {
    const { resolvedTheme } = useTheme()
    const saved = attempt.responses as { answer?: string; diagram?: { elements?: unknown[] } }
    const hasDiagram = (saved.diagram?.elements ?? []).some((e) => !(e as { isDeleted?: boolean }).isDeleted)
    return (
        <section aria-label="Your submission" className="mt-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Your submission</p>
            {hasDiagram ? (
                <div className="relative h-[26rem] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div className="absolute inset-0">
                        <ExcalidrawCanvas initialData={saved.diagram} darkMode={resolvedTheme === "dark"} viewOnly />
                    </div>
                </div>
            ) : (
                <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">No diagram.</p>
            )}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">{saved.answer?.trim() || "No written answer."}</p>
            </div>
        </section>
    )
}
