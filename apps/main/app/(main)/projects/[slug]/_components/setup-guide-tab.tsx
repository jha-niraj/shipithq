'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Settings } from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SetupGuideData {
    prerequisites?: string[]
    environmentVariables?: Array<{
        name: string
        purpose: string
        required: boolean
        exampleValue: string
    }>
    installationSteps?: string[]
    verificationSteps?: string[]
}

interface SetupGuideTabProps {
    setupGuide: SetupGuideData | null
    /** Keys this viewer's ticks in localStorage; the project id. */
    storageKey?: string
}

// ============================================================================
// Ticks, remembered per viewer (PJ-17 step 9)
// ============================================================================

/*
 * The boxes were drawn as plain spans, so clicking one did nothing (Niraj,
 * 2026-09-23). They toggle now and are kept in localStorage: a per-viewer
 * convenience, not progress - nothing else reads them - so browser storage is
 * the right home. Every access is guarded, because storage can be missing or
 * throw (private windows, blocked site data), and the list must still work.
 */
function useTicks(storageKey?: string) {
    const key = storageKey ? `setup-guide:${storageKey}` : null
    const [ticks, setTicks] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!key) return
        try {
            const raw = window.localStorage.getItem(key)
            if (raw) setTicks(JSON.parse(raw) as Record<string, boolean>)
        } catch { /* unreadable storage: start empty */ }
    }, [key])

    const toggle = (id: string) => setTicks((prev) => {
        const next = { ...prev, [id]: !prev[id] }
        if (key) {
            try { window.localStorage.setItem(key, JSON.stringify(next)) } catch { /* not persisted */ }
        }
        return next
    })
    return { ticks, toggle }
}

function TickItem({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <li>
            <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={onToggle}
                className="group flex w-full items-start gap-2.5 rounded-md py-0.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
                <span className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    checked
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-neutral-400 group-hover:border-neutral-600 dark:border-neutral-600 dark:group-hover:border-neutral-400'
                )}>
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={cn('min-w-0', checked ? 'text-neutral-500 line-through dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300')}>
                    {children}
                </span>
            </button>
        </li>
    )
}

// ============================================================================
// Copy with a short-lived tick
// ============================================================================

function useCopy() {
    const [copied, setCopied] = useState<string | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(key)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => setCopied(null), 1600)
        } catch {
            // Refused outside a secure context or when the page lacks focus.
            toast.error('Could not copy - select the text instead')
        }
    }
    return { copied, copy }
}

function CopyButton({ copied, onClick, label, className }: { copied: boolean; onClick: () => void; label: string; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={copied ? 'Copied' : label}
            className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                className
            )}
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    )
}

function CopyAllButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy all'}
        </button>
    )
}

// ============================================================================
// One numbered step on the path
// ============================================================================

function Step({ n, title, hint, action, last, children }: {
    n: number
    title: string
    hint?: React.ReactNode
    action?: React.ReactNode
    last?: boolean
    children: React.ReactNode
}) {
    return (
        <li className="relative flex gap-4">
            {/* The rail joins the numbers, so four blocks read as one sequence. */}
            {!last && <span aria-hidden className="absolute left-[13px] top-8 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800" />}
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-semibold tabular-nums text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
                {n}
            </span>
            <div className={cn('min-w-0 flex-1', !last && 'pb-8')}>
                <div className="flex min-h-7 items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
                    {action}
                </div>
                {hint && <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{hint}</p>}
                <div className="mt-3">{children}</div>
            </div>
        </li>
    )
}

// ============================================================================
// Setup Guide Tab
// ============================================================================

/*
 * One numbered path, not four cards (plan/projects PJ-16 item 6).
 *
 * It was four full-width cards, each with a large header, an intro sentence and
 * generous padding, around content that is usually four short lines, three
 * commands and two checks - most of the tab was air. It also had two legibility
 * bugs: the commands were `text-neutral-800` on a `bg-neutral-900` block (dark
 * grey on near-black in light mode), and each copy button was `opacity-0` until
 * hover, so on a phone it could not be found at all.
 *
 * The terminal is dark in BOTH themes, so its ink is constant too (CLAUDE.md:
 * a surface that does not change with the theme gets ink that does not either).
 */
export function SetupGuideTab({ setupGuide, storageKey }: SetupGuideTabProps) {
    const { copied, copy } = useCopy()
    const { ticks, toggle } = useTicks(storageKey)

    const prerequisites = setupGuide?.prerequisites ?? []
    const envVars = setupGuide?.environmentVariables ?? []
    const commands = setupGuide?.installationSteps ?? []
    const checks = setupGuide?.verificationSteps ?? []

    if (!setupGuide || prerequisites.length + envVars.length + commands.length + checks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Settings className="mb-4 h-10 w-10 text-neutral-500 dark:text-neutral-400" />
                <h3 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    No setup guide yet
                </h3>
                <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">
                    The project creator has not written one. The first sprint&apos;s tasks start from an empty repository.
                </p>
            </div>
        )
    }

    const steps: { key: string; render: (n: number, last: boolean) => React.ReactNode }[] = []

    if (prerequisites.length > 0) steps.push({
        key: 'prereq',
        render: (n, last) => (
            <Step key="prereq" n={n} last={last} title="Before you start" hint="Have these installed.">
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {prerequisites.map((item, i) => (
                        <TickItem key={i} checked={!!ticks[`pre:${i}`]} onToggle={() => toggle(`pre:${i}`)}>{item}</TickItem>
                    ))}
                </ul>
            </Step>
        ),
    })

    if (envVars.length > 0) steps.push({
        key: 'env',
        render: (n, last) => (
            <Step
                key="env" n={n} last={last}
                title="Environment"
                hint={<>Put these in <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">.env.local</code>.</>}
                action={
                    <CopyAllButton
                        copied={copied === 'env:all'}
                        onClick={() => copy('env:all', envVars.map((e) => `${e.name}=${e.exampleValue}`).join('\n'))}
                    />
                }
            >
                <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {envVars.map((env) => (
                        <div key={env.name} className="flex items-start gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <code className="break-all font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">{env.name}</code>
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                        {env.required ? 'Required' : 'Optional'}
                                    </span>
                                </div>
                                {env.purpose && <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{env.purpose}</p>}
                                {env.exampleValue && (
                                    <code className="mt-1 block break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">{env.exampleValue}</code>
                                )}
                            </div>
                            <CopyButton
                                copied={copied === `env:${env.name}`}
                                onClick={() => copy(`env:${env.name}`, `${env.name}=${env.exampleValue}`)}
                                label={`Copy ${env.name}`}
                                className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            />
                        </div>
                    ))}
                </div>
            </Step>
        ),
    })

    if (commands.length > 0) steps.push({
        key: 'install',
        render: (n, last) => (
            <Step
                key="install" n={n} last={last}
                title="Install and run"
                hint="Run these in order from an empty folder."
                action={commands.length > 1
                    ? <CopyAllButton copied={copied === 'cmd:all'} onClick={() => copy('cmd:all', commands.join('\n'))} />
                    : undefined}
            >
                <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 py-1.5">
                    {commands.map((cmd, i) => (
                        <div key={i} className="group flex items-center gap-3 px-3 py-1 hover:bg-white/5">
                            <span aria-hidden className="select-none font-mono text-sm text-neutral-500">$</span>
                            <code className="min-w-0 flex-1 break-all font-mono text-sm text-neutral-100">{cmd}</code>
                            <CopyButton
                                copied={copied === `cmd:${i}`}
                                onClick={() => copy(`cmd:${i}`, cmd)}
                                label="Copy command"
                                className="text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
                            />
                        </div>
                    ))}
                </div>
            </Step>
        ),
    })

    if (checks.length > 0) steps.push({
        key: 'verify',
        render: (n, last) => (
            <Step key="verify" n={n} last={last} title="Check it works" hint="You are set up when all of these hold.">
                <ul className="space-y-2">
                    {checks.map((item, i) => (
                        <TickItem key={i} checked={!!ticks[`ok:${i}`]} onToggle={() => toggle(`ok:${i}`)}>{item}</TickItem>
                    ))}
                </ul>
            </Step>
        ),
    })

    return (
        <ol className="max-w-3xl">
            {steps.map((s, i) => s.render(i + 1, i === steps.length - 1))}
        </ol>
    )
}
