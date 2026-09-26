"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CircleAlert, Sparkles } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    getGeneration, listDraftQuestions, reviewDraftQuestion, startAptitudeGeneration,
    type DraftQuestion, type GenerationStatus,
} from "@/actions/interview-config/aptitude-ai.action"

/*
 * "Generate with AI" and the review of what it wrote (plan/hiring-rounds
 * HR-11). The company says what to write about and how many (within the range
 * in @repo/pricing); a worker job writes and double-checks them; each draft is
 * then approved (optionally edited), or rejected. Approved questions become
 * pickable in the pool list at once.
 */

const POLL_MS = 3000

export function AptitudeAiPanel({ onChanged, onClose }: { onChanged: () => Promise<void>; onClose: () => void }) {
    const [drafts, setDrafts] = useState<DraftQuestion[] | null>(null)
    const [left, setLeft] = useState<number | null>(null)
    const [limits, setLimits] = useState<{ min: number; max: number }>({ min: 5, max: 30 })
    const [topics, setTopics] = useState("")
    const [countValue, setCountValue] = useState(10)
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM")
    const [section, setSection] = useState<"" | "QUANT" | "LOGICAL" | "VERBAL">("")
    const [jobId, setJobId] = useState<string | null>(null)
    const [status, setStatus] = useState<GenerationStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [starting, setStarting] = useState(false)
    const timer = useRef<number | null>(null)

    const loadDrafts = useCallback(async () => {
        const r = await listDraftQuestions()
        if (!r.success) { setError(r.error); return }
        setDrafts(r.data.drafts)
        setLeft(r.data.generationsLeft)
        setLimits(r.data.limits)
    }, [])

    useEffect(() => { void loadDrafts() }, [loadDrafts])

    // Poll the running generation until it ends.
    useEffect(() => {
        if (!jobId) return
        const tick = async () => {
            const r = await getGeneration(jobId)
            if (!r.success) { setError(r.error); setJobId(null); return }
            setStatus(r.data)
            if (r.data.status === "completed" || r.data.status === "failed") {
                setJobId(null)
                if (r.data.status === "completed") {
                    toast.success(`${r.data.created ?? 0} questions ready to review`, {
                        description: r.data.rejected ? `${r.data.rejected} didn't pass the checks and were dropped.` : undefined,
                    })
                    await loadDrafts()
                    await onChanged()
                }
                return
            }
            timer.current = window.setTimeout(tick, POLL_MS)
        }
        timer.current = window.setTimeout(tick, 1000)
        return () => { if (timer.current) window.clearTimeout(timer.current) }
    }, [jobId, loadDrafts, onChanged])

    const start = async () => {
        setStarting(true)
        setError(null)
        setStatus(null)
        const r = await startAptitudeGeneration({ topics, count: countValue, difficulty, section: section || null })
        setStarting(false)
        if (!r.success) { setError(r.error); return }
        setLeft((n) => (n === null ? n : Math.max(0, n - 1)))
        setJobId(r.data.jobId)
    }

    const running = jobId !== null
    const countOk = Number.isInteger(countValue) && countValue >= limits.min && countValue <= limits.max

    return (
        <div className="max-h-[60%] overflow-y-auto border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white"><Sparkles className="h-4 w-4" /> Your own questions, written by AI</p>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </div>

            <div className="grid gap-3">
                <Textarea value={topics} onChange={(e) => setTopics(e.target.value)} rows={2} maxLength={1500} disabled={running} aria-label="Topics"
                    placeholder="What to ask about, e.g. UPI fees and settlement cycles, reading a sales dashboard." />
                <div className="grid gap-2 sm:grid-cols-3">
                    <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        How many ({limits.min} to {limits.max})
                        <Input type="number" min={limits.min} max={limits.max} value={Number.isNaN(countValue) ? "" : countValue}
                            onChange={(e) => setCountValue(e.target.value === "" ? Number.NaN : Number(e.target.value))} disabled={running} className="mt-1" />
                    </label>
                    <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        Difficulty
                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} disabled={running}
                            className="mt-1 block h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                            <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                        </select>
                    </label>
                    <label className="text-xs text-neutral-600 dark:text-neutral-400">
                        Section
                        <select value={section} onChange={(e) => setSection(e.target.value as typeof section)} disabled={running}
                            className="mt-1 block h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                            <option value="">A mix</option><option value="QUANT">Quant</option><option value="LOGICAL">Logical</option><option value="VERBAL">Verbal</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Each question is solved twice, and kept only if both agree; you still approve every one. {left !== null && `${left} ${left === 1 ? "generation" : "generations"} left today.`}
                    </p>
                    <Button size="sm" className="gap-1.5" onClick={() => void start()} disabled={running || starting || !countOk || left === 0}>
                        {(running || starting) && <InlineLoader size="sm" />} {running ? "Writing" : "Generate"}
                    </Button>
                </div>
                {running && status && (
                    <div aria-live="polite">
                        <div className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                            <div className="h-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${Math.max(5, status.progress)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{status.phase ?? "Queued"}</p>
                    </div>
                )}
                {status?.status === "failed" && (
                    <p role="alert" className="flex items-start gap-1.5 text-sm text-rose-700 dark:text-rose-400"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {status.error ?? "The generation failed."}</p>
                )}
                {error && <p role="alert" className="flex items-start gap-1.5 text-sm text-rose-700 dark:text-rose-400"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
            </div>

            {drafts && drafts.length > 0 && (
                <div className="mt-5 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">To review ({drafts.length})</p>
                    {drafts.map((d) => (
                        <DraftCard
                            key={d.id}
                            draft={d}
                            onDone={async () => { setDrafts((ds) => ds?.filter((x) => x.id !== d.id) ?? null); await onChanged() }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function DraftCard({ draft, onDone }: { draft: DraftQuestion; onDone: () => Promise<void> }) {
    const [prompt, setPrompt] = useState(draft.prompt)
    const [options, setOptions] = useState(draft.options)
    const [correct, setCorrect] = useState(draft.correctIndex)
    const [explanation, setExplanation] = useState(draft.explanation)
    const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
    const [error, setError] = useState<string | null>(null)

    const act = async (action: "approve" | "reject") => {
        setBusy(action)
        setError(null)
        const r = action === "reject"
            ? await reviewDraftQuestion(draft.id, { action })
            : await reviewDraftQuestion(draft.id, { action, prompt, options, correctIndex: correct, explanation })
        setBusy(null)
        if (!r.success) { setError(r.error); return }
        await onDone()
    }

    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                {draft.section.charAt(0) + draft.section.slice(1).toLowerCase()} · {draft.topic.replace(/-/g, " ")} · {draft.difficulty.toLowerCase()}
            </p>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} maxLength={2000} aria-label="Question" />
            <div role="radiogroup" aria-label="Options: pick the correct one" className="mt-2 grid gap-1.5">
                {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={correct === i}
                            aria-label={`Option ${"ABCD"[i]} is correct`}
                            onClick={() => setCorrect(i)}
                            className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                                correct === i ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500" : "border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300",
                            )}
                        >
                            {"ABCD"[i]}
                        </button>
                        <Input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} maxLength={300} aria-label={`Option ${"ABCD"[i]}`} className="h-8" />
                    </div>
                ))}
            </div>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} maxLength={1000} aria-label="Explanation" className="mt-2" placeholder="Why the answer is right" />
            {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => void act("reject")} disabled={busy !== null} className="gap-1.5">
                    {busy === "reject" && <InlineLoader size="sm" />} Reject
                </Button>
                <Button size="sm" onClick={() => void act("approve")} disabled={busy !== null} className="gap-1.5">
                    {busy === "approve" && <InlineLoader size="sm" />} Approve
                </Button>
            </div>
        </div>
    )
}
