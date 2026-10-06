"use client"

import { ArrowRight, BookOpen, Check, HelpCircle, Mic } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { useGate } from "../sign-in-gate"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useCase } from "../primitives"
import { useRun } from "./run-context"
import { CreditCard } from "../credit"

/**
 * "Start this case" (plan/incidents INC-34): what a recorded run keeps and why, before
 * anything is kept. Reading and practice work either way; the report and the voice
 * need the run.
 */
const KEPT = [
    "Your check and quiz answers",
    "The questions you ask the lead, with its answers",
    "Your talks, as transcripts",
]

export type StartContent = { summary: string; minutes: number; chapters: number; checks: number; talks: number }

/**
 * The case's front page (Niraj, 2026-09-28: "there is no starting page"): the first step for
 * everyone. What the case is, what you'll do, what a recorded run keeps, and Start. Signed
 * out, Start opens the sign-in dialog and comes back here; "Just read" goes on without a run.
 * `variant="prompt"` is the short form shown when something needs a run (asking, a talk).
 */
export function StartScreen({ variant = "prompt", content, onDone }: { variant?: "step" | "prompt"; content?: StartContent; onDone?: () => void }) {
    const c = useCase()
    const { start, justRead, busy, state, mode } = useRun()
    const { signedIn } = useGate()
    const retake = (state?.past.length ?? 0) > 0
    const recording = mode === "recording"

    const begin = () => { start(); if (signedIn) onDone?.() }
    const read = () => { justRead(); onDone?.() }

    return (
        <div className={cn("flex flex-col", variant === "prompt" ? "mx-auto max-w-xl py-6" : "")}>
            {variant === "step" && content ? (
                <>
                    <p className="text-[17px] leading-8 text-neutral-600 dark:text-neutral-400">{content.summary}</p>
                    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "About", value: `${content.minutes} min` },
                            { label: "Chapters", value: content.chapters },
                            { label: "Checks", value: content.checks },
                            { label: "Talks with the lead", value: content.talks },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                                <dt className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{s.label}</dt>
                                <dd className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">{s.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                            { icon: BookOpen, title: "Listen or read", body: "Each chapter is read to you, and the diagram lights up as it goes." },
                            { icon: HelpCircle, title: "Check yourself", body: "Short checks after each chapter, and a final call at the end." },
                            { icon: Mic, title: "Talk it through", body: "Explain it to the incident lead out loud, and ask anything as you go." },
                        ].map((f) => (
                            <div key={f.title} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                                <f.icon className="size-4 text-neutral-700 dark:text-neutral-300" aria-hidden />
                                <p className="mt-2 text-[14.5px] font-semibold text-neutral-900 dark:text-white">{f.title}</p>
                                <p className="mt-1 text-[13px] leading-5 text-neutral-600 dark:text-neutral-400">{f.body}</p>
                            </div>
                        ))}
                    </div>
                    <CreditCard credit={c.credit} className="mt-6" />
                </>
            ) : (
                <>
                    <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{retake ? "A new run" : "Before you go on"}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{c.title}</h2>
                    <p className="mt-3 text-[15px] leading-7 text-neutral-600 dark:text-neutral-300">
                        Talking with the lead is part of a recorded run. At the end you get a one-page review of how you reasoned.
                    </p>
                </>
            )}

            {recording ? (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-900 p-4 dark:border-white">
                    <span className="size-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
                    <p className="min-w-0 flex-1 text-[14px] text-neutral-800 dark:text-neutral-200">You're recording this run. Your answers, questions and talks go into your review.</p>
                    {onDone && (
                        <button type="button" onClick={onDone} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                            Go to chapter 1 <ArrowRight className="size-4" aria-hidden />
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Start a recorded run, and we keep, for your review:</p>
                        <ul className="mt-3 space-y-2">
                            {KEPT.map((k) => (
                                <li key={k} className="flex items-start gap-2 text-[14px] text-neutral-700 dark:text-neutral-300">
                                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {k}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-[12.5px] leading-5 text-neutral-500 dark:text-neutral-400">
                            Only you see it unless you share it, and you can delete the run and its review at any time. The mic is only used in a recorded run.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button type="button" onClick={begin} disabled={busy}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                            {busy ? <InlineLoader size="sm" /> : <Mic className="size-4" aria-hidden />} {signedIn ? "Start the case" : "Sign in to start"}
                        </button>
                        <button type="button" onClick={read} disabled={busy}
                            className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">
                            Just read, no review
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

/** The header's recording state: a dot while recording, or a way to start. */
export function RunBadge() {
    const { mode, start, stop, busy } = useRun()
    if (mode === "recording") {
        return (
            <button type="button" onClick={() => void stop()} disabled={busy} title="Stop recording (no report for this run)"
                className="inline-flex h-8 items-center gap-2 rounded-full border border-neutral-200 px-3 font-mono text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300">
                <span className="size-2 animate-pulse rounded-full bg-rose-500" aria-hidden /> <span className="hidden sm:inline">Recording</span>
            </button>
        )
    }
    return (
        <button type="button" onClick={start} disabled={busy}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-neutral-200 px-3 font-mono text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300">
            {busy ? <InlineLoader size="sm" /> : <Mic className="size-3.5" aria-hidden />} <span className="hidden sm:inline">Start recording</span>
        </button>
    )
}
