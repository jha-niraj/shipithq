'use client'

import { Check, FlaskConical, X } from 'lucide-react'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { cn } from '@repo/ui/lib/utils'
import type { TestRun } from './runtime'

/*
 * The Tests panel (WS-5): the last "Check task" run for the task in hand.
 * A summary line, then each test with its failure message - the message is the
 * lesson, so it is shown, not hidden behind an expander.
 */
export function TestsPanel({ testPath, checking, run, runsInBrowser }: {
    testPath: string | null
    checking: boolean
    run: TestRun | null
    runsInBrowser: boolean
}) {
    if (!testPath) {
        return <Note>This task has no tests. Mark it done from the Task tab when it meets the list there.</Note>
    }
    if (!runsInBrowser) {
        return <Note>This project does not run in the browser, so its tests cannot run here yet.</Note>
    }
    if (checking) {
        return (
            <div className="flex items-center gap-2 p-4 text-xs text-neutral-600 dark:text-neutral-400">
                <InlineLoader size="sm" /> Running <span className="font-mono">{testPath.slice(1)}</span>
            </div>
        )
    }
    if (!run || run.path !== testPath) {
        return <Note>Press <span className="font-medium text-neutral-800 dark:text-neutral-200">Check task</span> in the Task tab to run <span className="font-mono">{testPath.slice(1)}</span> against your code.</Note>
    }

    const passed = run.tests.filter((t) => t.status === 'pass').length
    const allGreen = !run.fileError && run.tests.length > 0 && passed === run.tests.length

    return (
        <div className="text-xs">
            <div className={cn(
                'flex items-center gap-2 border-b px-4 py-2 font-medium',
                allGreen
                    ? 'border-neutral-200 text-neutral-900 dark:border-neutral-800 dark:text-white'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
            )}>
                {allGreen ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {run.fileError
                    ? 'The test file did not run'
                    : allGreen ? `All ${passed} tests pass` : `${passed} of ${run.tests.length} tests pass`}
                <span className="ml-auto font-mono font-normal text-neutral-500 dark:text-neutral-400">{run.path.slice(1)}</span>
            </div>
            {run.fileError && (
                <pre className="whitespace-pre-wrap break-words px-4 py-2 font-mono text-red-700 dark:text-red-300">{run.fileError}</pre>
            )}
            <ul>
                {run.tests.map((t, i) => (
                    <li key={i} className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-900">
                        <div className="flex items-start gap-2">
                            {t.status === 'pass'
                                ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-900 dark:text-white" />
                                : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />}
                            <span className={cn(t.status === 'pass' ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-900 dark:text-white')}>{t.name}</span>
                        </div>
                        {t.error && <p className="ml-5 mt-1 font-mono text-[11px] text-red-700 dark:text-red-300">{t.error}</p>}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Note({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-2 p-4 text-xs text-neutral-500 dark:text-neutral-400">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{children}</span>
        </p>
    )
}
