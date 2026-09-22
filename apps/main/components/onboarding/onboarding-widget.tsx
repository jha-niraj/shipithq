"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, RotateCcw } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { OnboardingRunView } from "@/types/onboarding"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"
import { LEVEL_LABELS, LevelMeter } from "./level-meter"

const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

function Group({ title, items }: { title: string; items: string[] }) {
    if (items.length === 0) return null
    return (
        <div>
            <div className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>{title}</div>
            <ul className="mt-1.5 space-y-1">
                {items.map((s, i) => (
                    <li key={i} className={cn("text-sm leading-relaxed", INK)}>{s}</li>
                ))}
            </ul>
        </div>
    )
}

/**
 * The completed profile as it sits on the dashboard: level, three lines, a
 * collapsed "what you told us", and Retake. Retake is a link to `?resume=1`;
 * the page starts the new version and shows the flow, and this widget keeps
 * showing the last completed version until that one finishes (MO-6).
 */
export function OnboardingWidget({
    moduleKey,
    completed,
    inProgress,
}: {
    moduleKey: OnboardingModuleKey
    completed: OnboardingRunView
    inProgress: OnboardingRunView | null
}) {
    const [open, setOpen] = useState(false)
    const mod = onboardingModule(moduleKey)
    const profile = completed.profile
    const resumeHref = `${mod.gatePath}?resume=1`

    return (
        <section
            aria-label={`Your ${mod.label} profile`}
            className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>Where you stand</div>
                    {profile ? (
                        <>
                            <div className="mt-2 flex items-center gap-3">
                                <span className={cn("rounded-full border border-neutral-900 px-2.5 py-0.5 text-xs font-semibold dark:border-neutral-100", INK)}>
                                    {LEVEL_LABELS[profile.level]}
                                </span>
                                <LevelMeter level={profile.level} />
                            </div>
                            <ul className="mt-3 space-y-1.5">
                                {profile.summary.map((line, i) => (
                                    <li key={i} className={cn("text-sm leading-relaxed", INK)}>{line}</li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className={cn("mt-2 text-sm", INK)}>We could not summarise this run. Retake it to get a fresh read.</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {inProgress ? (
                        <Link href={resumeHref} className={cn("inline-flex h-9 items-center rounded-xl border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800", INK)}>
                            Resume retake
                        </Link>
                    ) : (
                        <Link href={resumeHref} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800", INK)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retake
                        </Link>
                    )}
                </div>
            </div>

            {profile && (
                <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className={cn("flex cursor-pointer items-center gap-1.5 text-xs font-medium", INK_DIM, "hover:text-neutral-900 dark:hover:text-neutral-100")}
                    >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                        What you told us
                    </button>
                    {open && (
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <Group title="Facts" items={profile.facts} />
                            <Group title="Strengths" items={profile.strengths} />
                            <Group title="Gaps" items={profile.gaps} />
                            <Group title="Goals" items={profile.goals} />
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
