'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { Shimmer } from '@repo/ui/components/skeleton-kit'
import type { VerificationSectionStatus } from '@repo/db'
import CodeEditor from '@/components/main/code-editor'
import { MarkdownRenderer } from '@/components/common/markdown-renderer'
import { CasesPanel } from '@/app/(main)/practice/_components/workspace/cases-panel'
import { LANGUAGE_LABELS } from '@/lib/practice/starters'
import type { PracticeJudgeResult } from '@/types/practice'
import type { DsaProblem } from '@/lib/hiring/dsa'
import {
    getVerificationCoding, runVerificationSamples, submitVerificationCoding,
} from '@/actions/(main)/pathfinder/verification.action'

/*
 * Coding verification (plan/pathfinder PF-17): judged Practice problems in the
 * practice editor. Run checks the sample tests; Submit runs every test, hidden
 * ones included, on the server. The section completes when every problem has
 * passed all its tests.
 */

interface CodingVerificationProps {
    goalId: string
    status: VerificationSectionStatus
}

type Loaded = {
    problems: DsaProblem[]
    solved: string[]
    score: number
    runsLeft: number
    submitsLeft: number
}

export function CodingVerification({ goalId, status }: CodingVerificationProps) {
    const router = useRouter()
    const [data, setData] = useState<Loaded | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [code, setCode] = useState<Record<string, { language: string; code: string }>>({})
    const [active, setActive] = useState(0)
    const [results, setResults] = useState<Record<string, PracticeJudgeResult | null>>({})
    const [busy, setBusy] = useState<'run' | 'submit' | null>(null)
    const [casesCollapsed, setCasesCollapsed] = useState(false)

    useEffect(() => {
        let live = true
        void getVerificationCoding(goalId).then((r) => {
            if (!live) return
            if (!r.success) { setError(r.error); return }
            setData({ problems: r.problems, solved: r.solved, score: r.score, runsLeft: r.runsLeft, submitsLeft: r.submitsLeft })
            setCode(Object.fromEntries(r.problems.map((p) => [p.id, { language: p.languages[0] ?? 'cpp', code: p.starterCode }])))
        })
        return () => { live = false }
    }, [goalId])

    if (status === 'LOCKED') {
        return <Centered>Generate the verification questions first.</Centered>
    }
    if (error) return <Centered>{error}</Centered>
    if (!data) return <CodingSkeleton />
    if (data.problems.length === 0) return <Centered>No coding problems are available for this goal.</Centered>

    const problem = data.problems[active]!
    const mine = code[problem.id]!
    const solved = new Set(data.solved)

    const run = async () => {
        if (busy) return
        setBusy('run')
        setCasesCollapsed(false)
        const r = await runVerificationSamples({ goalId, problemId: problem.id, language: mine.language, code: mine.code })
        setResults((x) => ({ ...x, [problem.id]: r }))
        if (r.status !== 'unavailable' || /time limit/.test(r.message)) setData((d) => d && { ...d, runsLeft: Math.max(0, d.runsLeft - 1) })
        setBusy(null)
    }

    const submit = async () => {
        if (busy) return
        setBusy('submit')
        setCasesCollapsed(false)
        const r = await submitVerificationCoding({ goalId, problemId: problem.id, language: mine.language, code: mine.code })
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        setResults((x) => ({ ...x, [problem.id]: r.result }))
        setData((d) => d && { ...d, solved: r.solved, score: r.score, submitsLeft: Math.max(0, d.submitsLeft - 1) })
        if (r.overallPassed) {
            toast.success('Every problem solved. Coding section complete.')
            router.refresh()
        } else if (r.result.status === 'ok' && r.result.passed) {
            toast.success('Solved. On to the next one.')
        }
    }

    return (
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <aside className="flex min-h-0 flex-col border-b border-neutral-200 lg:border-b-0 lg:border-r dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    {data.problems.length > 1 ? (
                        <Tabs value={String(active)} onValueChange={(v) => setActive(Number(v))}>
                            <TabsList variant="segmented" size="sm" fit aria-label="Problems">
                                {data.problems.map((p, i) => (
                                    <TabsTrigger key={p.id} value={String(i)}>
                                        Problem {i + 1}
                                        {solved.has(p.id) && <span aria-label="solved" className="ml-1.5">✓</span>}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    ) : <span />}
                    <span className="shrink-0 font-mono text-xs text-neutral-500 dark:text-neutral-400">{solved.size} of {data.problems.length} solved · {data.score}%</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{problem.title}</h3>
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
                        Run checks the sample cases. Submit runs every test, hidden ones included. The section passes when every problem passes all its tests.
                    </p>
                </div>
            </aside>

            <section className="flex min-h-[36rem] min-w-0 flex-col lg:min-h-0">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
                    <p className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">{problem.signature ?? LANGUAGE_LABELS[mine.language] ?? mine.language}</p>
                    <Button size="sm" onClick={() => void submit()} disabled={busy !== null || data.submitsLeft === 0 || solved.has(problem.id)}>
                        {busy === 'submit' ? <InlineLoader size="sm" /> : solved.has(problem.id) ? 'Solved' : 'Submit'}
                    </Button>
                </div>
                <div className="min-h-0 flex-1">
                    <CodeEditor
                        key={problem.id}
                        code={mine.code}
                        language={mine.language}
                        height="100%"
                        onChange={(val) => setCode((c) => ({ ...c, [problem.id]: { ...c[problem.id]!, code: val } }))}
                        onLanguageChange={(lang) => setCode((c) => ({ ...c, [problem.id]: { ...c[problem.id]!, language: lang } }))}
                        showLanguageSelector={problem.languages.length > 1}
                        allowedLanguages={problem.languages}
                        showCopyButton={false}
                        showRunButton
                        onRun={() => void run()}
                        isRunning={busy === 'run'}
                        enableExecution={false}
                        showExpandButton={false}
                        className="h-full rounded-none border-0"
                    />
                </div>
                <CasesPanel
                    samples={problem.samples}
                    result={results[problem.id] ?? null}
                    busy={busy}
                    collapsed={casesCollapsed}
                    onToggle={() => setCasesCollapsed((c) => !c)}
                />
                <p className="border-t border-neutral-200 px-4 py-1.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    {data.runsLeft} test runs and {data.submitsLeft} submits left
                </p>
            </section>
        </div>
    )
}

function Centered({ children }: { children: React.ReactNode }) {
    return <div className="flex h-full items-center justify-center p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{children}</div>
}

/** Shaped like the loaded section: the problem on the left, the editor and cases on the right. */
function CodingSkeleton() {
    return (
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-3 border-b border-neutral-200 p-5 lg:border-b-0 lg:border-r dark:border-neutral-800">
                <Shimmer className="h-7 w-56" />
                <Shimmer className="h-6 w-2/3" delay={0.05} />
                <Shimmer className="h-4 w-full" delay={0.1} />
                <Shimmer className="h-4 w-full" delay={0.15} />
                <Shimmer className="h-4 w-4/5" delay={0.2} />
            </div>
            <div className="flex min-h-[36rem] flex-col lg:min-h-0">
                <Shimmer className="m-3 h-6 w-40" />
                <Shimmer className="mx-3 flex-1" delay={0.1} />
                <Shimmer className="m-3 h-24" delay={0.2} />
            </div>
        </div>
    )
}
