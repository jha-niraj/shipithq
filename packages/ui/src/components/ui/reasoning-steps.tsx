'use client'

import { useEffect, useRef, useState } from 'react'
import { BrainIcon, CheckIcon, XIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ScrollArea } from './scroll-area'
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceDescription,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from './trace'

/**
 * The agent's work on one turn, shown as it happens - built on the shadcn/ReUI Trace
 * (plan/repo/ui/reui-components-2026-10-23.md 2.1; history in plan/main/ai-saathi/chat-ui-and-reasoning-steps.md).
 *
 * ## What it shows
 *
 * One folded row per turn ("Working..." while it runs, then "3 steps - 4.2s" or "1 of 3 failed"),
 * opening onto:
 *  - a "Thought for 3s" row, when the model thought on this turn. Its content is the model's OWN
 *    thinking (Claude's summarised thinking, streamed as `reasoning-delta` frames) - collapsed by
 *    default, because it is provenance, not the answer. Simple lookups never think (the server
 *    decides, `shouldThink` in packages/ai), so most turns have no such row.
 *  - one line per tool call, with the app's own words for it, its duration, and "failed" in words on
 *    a failure (Trace's status is colour and motion only, which a colour-blind reader cannot see).
 *
 * ## Why it collapses when the turn ends
 *
 * While a turn runs the steps are the only thing on screen, so they are open. Once the answer
 * arrives they are provenance, and a six-row timeline above every past reply turns a transcript into
 * a log file - so a finished turn folds to one line. It never folds a turn with a failure in it:
 * there the detail is the message. The fold happens on the `active` edge only, so it cannot fight a
 * reader who opened it again.
 */

export type ReasoningStepStatus = 'running' | 'done' | 'error'

export interface ReasoningStep {
    id: string
    /** What to show. Already resolved to human words by the caller. */
    label: string
    /**
     * The raw tool name (`getWhoIsAbsentToday`), shown as a small mono chip beside the label when the
     * list has room. Optional - only the staff chat passes it. Showing WHICH tool answered is the most
     * direct proof that an answer came from the school's records (plan/main/saathi/chat-matches-the-demo.md, S1).
     */
    name?: string
    status: ReasoningStepStatus
    /** Epoch ms. Used only for the duration, which is dropped when either end is missing. */
    startedAt?: number
    endedAt?: number
}

/** The model's thinking on this turn. */
export interface ReasoningThought {
    /** The summarised thinking, as streamed. */
    text: string
    /** Total thinking time across the turn's thinking blocks. */
    ms?: number
    /** True while a thinking block is still streaming. */
    active?: boolean
}

/** `1.4s`, or null when there is no number worth showing (under 300ms reads as clutter). */
function seconds(ms: number | null | undefined): string | null {
    if (ms == null || !Number.isFinite(ms) || ms < 300) return null
    return ms < 10_000 ? `${Math.round(ms / 100) / 10}s` : `${Math.round(ms / 1000)}s`
}

function stepMs(step: ReasoningStep): number | null {
    return step.startedAt && step.endedAt ? step.endedAt - step.startedAt : null
}

/** Wall time of the tool steps (they can overlap, so first start to last end), plus the thinking. */
function turnMs(steps: ReasoningStep[], thought?: ReasoningThought): number | null {
    const starts = steps.map((s) => s.startedAt).filter((n): n is number => typeof n === 'number')
    const ends = steps.map((s) => s.endedAt).filter((n): n is number => typeof n === 'number')
    const span = starts.length && ends.length ? Math.max(...ends) - Math.min(...starts) : 0
    const total = span + (thought?.ms ?? 0)
    return total > 0 ? total : null
}

function StepIcon({ status }: { status: ReasoningStepStatus }) {
    if (status === 'error') return <XIcon className="size-3.5" strokeWidth={2.5} />
    if (status === 'done') return <CheckIcon className="size-3.5" strokeWidth={2.5} />
    // Running: a small amber dot, breathing. Not a spinner - a column of spinners reads as several
    // stuck buttons, and the shimmer on the title already says this line is live.
    return <span className="size-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />
}

/** The "Thought for Ns" row. Collapsed by default; plain small text in a bounded ScrollArea. */
function ThoughtRow({ thought }: { thought: ReasoningThought }) {
    const secs = seconds(thought.ms)
    const title = thought.active ? 'Thinking...' : secs ? `Thought for ${secs}` : 'Thought for a moment'
    return (
        <TraceCollapsible>
            <TraceCollapsibleTrigger>
                <TraceLine status={thought.active ? 'running' : undefined}>
                    <TraceIcon>
                        <BrainIcon className="size-3.5" />
                    </TraceIcon>
                    <TraceTitle>{title}</TraceTitle>
                </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
                <ScrollArea orientation="vertical" viewportClassName="max-h-48">
                    <p className="whitespace-pre-wrap pr-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {thought.text}
                    </p>
                </ScrollArea>
            </TraceCollapsibleContent>
        </TraceCollapsible>
    )
}

function StepLine({ step }: { step: ReasoningStep }) {
    const secs = seconds(stepMs(step))
    const failed = step.status === 'error'
    const description = failed ? (secs ? `failed - ${secs}` : 'failed') : secs
    return (
        <TraceLine status={step.status === 'running' ? 'running' : failed ? 'error' : undefined}>
            <TraceIcon>
                <StepIcon status={step.status} />
            </TraceIcon>
            <TraceTitle className={cn(step.status === 'done' && 'text-neutral-700 dark:text-neutral-300')}>
                {step.label}
            </TraceTitle>
            {step.name && (
                // A container query, not a viewport one: the docked chat panel is narrow on a wide
                // screen, so the chip appears only when the list is at least 24rem wide.
                <code className="hidden shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10.5px] text-neutral-600 @sm:inline dark:bg-neutral-800 dark:text-neutral-400">
                    {step.name}
                </code>
            )}
            {description && <TraceDescription className={cn(failed && 'text-rose-600 dark:text-rose-400')}>{description}</TraceDescription>}
        </TraceLine>
    )
}

export function ReasoningSteps({
    steps,
    thought,
    /** True while the turn is still streaming. Keeps the group open and the header live. */
    active = false,
    className,
}: {
    steps: ReasoningStep[]
    thought?: ReasoningThought | null
    active?: boolean
    className?: string
}) {
    const failed = steps.some((s) => s.status === 'error')
    /*
     * Open while the turn runs, closed when this is history. Steps are hydrated back onto a reloaded
     * conversation, so a long transcript can render twenty of these at once; an always-open default
     * would be a wall of timelines. A turn that FAILED opens either way.
     */
    const [open, setOpen] = useState(() => active || failed)

    const wasActive = useRef(active)
    useEffect(() => {
        if (wasActive.current && !active && !failed) setOpen(false)
        wasActive.current = active
    }, [active, failed])

    const hasThought = Boolean(thought && (thought.text || thought.active))
    if (steps.length === 0 && !hasThought) return null

    // Thinking with no tool step: the thought row IS the turn's trace, no group around it.
    if (steps.length === 0 && thought) {
        return (
            <Trace className={cn('@container text-xs [&_[data-slot=trace-line]]:text-xs', className)}>
                <ThoughtRow thought={thought} />
            </Trace>
        )
    }

    const errors = steps.filter((s) => s.status === 'error').length
    const total = seconds(turnMs(steps, thought ?? undefined))
    const title = active
        ? 'Working...'
        : failed
            ? `${errors} of ${steps.length} failed`
            : `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`

    return (
        <Trace className={cn('@container', className)}>
            <TraceCollapsible open={open} onOpenChange={setOpen}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={active ? 'running' : failed ? 'error' : undefined}>
                        <TraceTitle className="text-xs font-medium">{title}</TraceTitle>
                        {!active && total && <TraceDescription className="text-xs">{total}</TraceDescription>}
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                    <Trace className="gap-1.5 text-xs [&_[data-slot=trace-line]]:text-xs">
                        {thought && hasThought && <ThoughtRow thought={thought} />}
                        {steps.map((step) => (
                            <StepLine key={step.id} step={step} />
                        ))}
                    </Trace>
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    )
}
