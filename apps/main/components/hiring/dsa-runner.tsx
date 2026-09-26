"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@repo/ui/components/ui/button"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import CodeEditor from "@/components/main/code-editor"
import { MarkdownRenderer } from "@/components/common/markdown-renderer"
import { CasesPanel } from "@/app/(main)/practice/_components/workspace/cases-panel"
import { runRoundCode, saveAttempt, submitAttempt, type RunnerAttempt } from "@/actions/hiring/run.action"
import { LANGUAGE_LABELS } from "@/lib/practice/starters"
import type { PracticeJudgeResult } from "@/types/practice"
import { RunnerShell, useRoundClock } from "./runner-shell"

/*
 * The DSA round (plan/hiring-rounds HR-15): the practice editor in exam mode,
 * one tab per drawn problem. Run checks the sample tests; every test runs when
 * the round is handed in. Code is saved as it changes, pastes are counted.
 */

const SAVE_DEBOUNCE_MS = 2000
type Code = Record<string, { language: string; code: string }>

export function DsaRunner({ attempt }: { attempt: RunnerAttempt }) {
    const router = useRouter()
    const problems = attempt.problems
    const [code, setCode] = useState<Code>(() => {
        const saved = (attempt.responses.code ?? {}) as Record<string, { language?: unknown; code?: unknown }>
        return Object.fromEntries(problems.map((p) => {
            const s = saved[p.id]
            const language = typeof s?.language === "string" && p.languages.includes(s.language as never) ? s.language : p.languages[0] ?? "cpp"
            return [p.id, { language, code: typeof s?.code === "string" ? s.code : p.starterCode }]
        }))
    })
    const codeRef = useRef(code)
    useEffect(() => { codeRef.current = code }, [code])

    const [active, setActive] = useState(0)
    const [results, setResults] = useState<Record<string, PracticeJudgeResult | null>>({})
    const [busy, setBusy] = useState(false)
    const [runsLeft, setRunsLeft] = useState(attempt.runsLeft)
    const [casesCollapsed, setCasesCollapsed] = useState(false)
    const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const [confirm, setConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const pending = useRef({ pastes: 0, tabLeaves: 0 })
    const takeIntegrity = () => {
        const d = { ...pending.current }
        pending.current = { pastes: 0, tabLeaves: 0 }
        return d
    }

    const timer = useRef<number | null>(null)
    const queueSave = useCallback(() => {
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(async () => {
            setSaving("saving")
            const r = await saveAttempt(attempt.id, { responses: { code: codeRef.current }, integrity: takeIntegrity() })
            setSaving(r.success ? "saved" : "error")
        }, SAVE_DEBOUNCE_MS)
    }, [attempt.id])

    const submit = useCallback(async () => {
        if (submitting) return
        setSubmitting(true)
        if (timer.current) window.clearTimeout(timer.current)
        const r = await submitAttempt(attempt.id, { responses: { code: codeRef.current }, integrity: takeIntegrity() })
        if (!r.success) { setSubmitting(false); toast.error(r.error); return }
        router.refresh()
    }, [attempt.id, submitting, router])

    const remaining = useRoundClock(attempt, () => void submit())

    useEffect(() => {
        const onVis = () => { if (document.visibilityState === "hidden") pending.current.tabLeaves++ }
        document.addEventListener("visibilitychange", onVis)
        return () => document.removeEventListener("visibilitychange", onVis)
    }, [])

    const problem = problems[active]
    const mine = problem ? code[problem.id] : undefined

    const run = async () => {
        if (!problem || !mine || busy) return
        setBusy(true)
        setCasesCollapsed(false)
        const r = await runRoundCode(attempt.id, { problemId: problem.id, language: mine.language, code: mine.code })
        setResults((x) => ({ ...x, [problem.id]: r }))
        if (!(r.status === "unavailable" && r.message.startsWith("You've used all"))) setRunsLeft((n) => Math.max(0, n - 1))
        setBusy(false)
    }

    const exit = async () => {
        if (timer.current) window.clearTimeout(timer.current)
        await saveAttempt(attempt.id, { responses: { code: codeRef.current }, integrity: takeIntegrity() })
        router.push(attempt.backHref)
    }

    const edited = (id: string) => {
        const p = problems.find((x) => x.id === id)
        return Boolean(p && code[id] && code[id]!.code.replace(/\s+/g, "") !== p.starterCode.replace(/\s+/g, ""))
    }
    const untouched = problems.filter((p) => !edited(p.id)).length

    if (!problem || !mine) {
        return (
            <RunnerShell attempt={attempt} remaining={null} onExit={null}>
                <p className="py-24 text-center text-neutral-600 dark:text-neutral-400">This attempt has no problems.</p>
            </RunnerShell>
        )
    }

    return (
        <RunnerShell attempt={attempt} remaining={submitting ? null : remaining} onExit={submitting ? null : () => void exit()}>
            <div className="grid grid-cols-1 lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <aside className="flex min-h-0 flex-col border-b border-neutral-200 bg-white lg:border-b-0 lg:border-r dark:border-neutral-800 dark:bg-neutral-950">
                    {problems.length > 1 && (
                        <div role="tablist" aria-label="Problems" className="flex gap-1 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                            {problems.map((p, i) => (
                                <button key={p.id} role="tab" type="button" aria-selected={i === active} onClick={() => setActive(i)}
                                    className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium", i === active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800")}>
                                    Problem {i + 1}
                                    {edited(p.id) && <span aria-label="edited" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{problem.title}</h1>
                            <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs capitalize text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">{problem.difficulty.toLowerCase()}</span>
                        </div>
                        <MarkdownRenderer content={problem.description} className="mt-3 text-sm" />
                        {problem.requirements.length > 0 && (
                            <>
                                <p className="mt-5 text-xs font-medium uppercase tracking-wider text-neutral-500">Constraints</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
                                    {problem.requirements.map((r) => <li key={r}>{r}</li>)}
                                </ul>
                            </>
                        )}
                        <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-400">
                            Run checks the sample cases. Every test, hidden ones included, runs when you submit. Your score is the share of tests passed across the problems. Pasting is recorded.
                        </p>
                    </div>
                </aside>

                <section className="flex min-h-[36rem] min-w-0 flex-col lg:min-h-0">
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-950">
                        <p className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{problem.signature ?? LANGUAGE_LABELS[mine.language] ?? mine.language}</p>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400" aria-live="polite">
                                {saving === "saving" ? "Saving" : saving === "saved" ? "Saved" : saving === "error" ? "Not saved" : ""}
                            </span>
                            {confirm ? (
                                <>
                                    <span className="hidden text-xs text-neutral-600 md:inline dark:text-neutral-300">{untouched > 0 ? `${untouched} not started.` : "Hand in all problems?"}</span>
                                    <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={submitting}>Keep going</Button>
                                    <Button size="sm" onClick={() => void submit()} disabled={submitting}>Submit</Button>
                                </>
                            ) : (
                                <Button size="sm" onClick={() => setConfirm(true)}>Submit</Button>
                            )}
                        </div>
                    </div>
                    <div className="min-h-0 flex-1" onPasteCapture={() => { pending.current.pastes++ }}>
                        <CodeEditor
                            key={problem.id}
                            code={mine.code}
                            language={mine.language}
                            height="100%"
                            onChange={(val) => { setCode((c) => ({ ...c, [problem.id]: { ...c[problem.id]!, code: val } })); queueSave() }}
                            onLanguageChange={(lang) => { setCode((c) => ({ ...c, [problem.id]: { ...c[problem.id]!, language: lang } })); queueSave() }}
                            showLanguageSelector={problem.languages.length > 1}
                            allowedLanguages={problem.languages}
                            showCopyButton={false}
                            showRunButton
                            onRun={() => void run()}
                            isRunning={busy}
                            enableExecution={false}
                            showExpandButton={false}
                            className="h-full rounded-none border-0"
                        />
                    </div>
                    <CasesPanel
                        samples={problem.samples}
                        result={results[problem.id] ?? null}
                        busy={busy ? "run" : null}
                        collapsed={casesCollapsed}
                        onToggle={() => setCasesCollapsed((c) => !c)}
                    />
                    <p className="border-t border-neutral-200 bg-white px-4 py-1.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">{runsLeft} test runs left</p>
                </section>
            </div>
        </RunnerShell>
    )
}
