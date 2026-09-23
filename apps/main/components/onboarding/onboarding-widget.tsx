"use client"

import { useState } from "react"
import Link from "next/link"
import { ListChecks, RotateCcw, Sparkles, Target, TriangleAlert } from "lucide-react"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@repo/ui/components/ui/sheet"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { cn } from "@repo/ui/lib/utils"
import type { OnboardingRunView } from "@/types/onboarding"
import { onboardingModule, type OnboardingModuleKey, onboardingHref } from "@/lib/onboarding/modules"
import { LEVEL_LABELS, LevelMeter } from "./level-meter"

const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

/**
 * One group of what the onboarding recorded, inside the sheet.
 *
 * Short entries are BADGES and long ones are rows (Niraj, 2026-09-22: the text
 * "doesn't look scattered"). Strengths, gaps and goals are two or three words
 * each, so as badges they read as a set at a glance; facts are sentences, and
 * eleven sentences wrapped into a two-column grid is what looked scattered.
 */
function Group({
    title,
    items,
    icon: Icon,
    as,
}: {
    title: string
    items: string[]
    icon: typeof Sparkles
    as: "badges" | "rows"
}) {
    if (items.length === 0) return null
    return (
        <section>
            <h3 className={cn("flex items-center gap-2 text-sm font-semibold", INK)}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {title}
                <span className={cn("font-normal", INK_DIM)}>({items.length})</span>
            </h3>
            {as === "badges" ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((s, i) => (
                        <li
                            key={i}
                            className={cn(
                                "rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800",
                                INK,
                            )}
                        >
                            {s}
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="mt-2 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                    {items.map((s, i) => (
                        <li key={i} className={cn("px-3 py-2 text-sm leading-relaxed", INK)}>{s}</li>
                    ))}
                </ul>
            )}
        </section>
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
    // Straight to the flow: `?onboarding=1` is what the page will carry anyway (MO-10).
    const resumeHref = onboardingHref(moduleKey, { retake: true })

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
                    {/* A sheet, not an expander. Opened in place it pushed the memory below it
                        off the screen and laid eleven sentences across two columns, which is
                        what read as scattered. */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline", INK_DIM, "hover:text-neutral-900 dark:hover:text-neutral-100")}
                            >
                                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                                What you told us
                                <span className="tabular-nums">
                                    ({profile.facts.length + profile.strengths.length + profile.gaps.length + profile.goals.length})
                                </span>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
                            <SheetHeader className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                                <SheetTitle className={INK}>What you told us</SheetTitle>
                                <SheetDescription className={INK_DIM}>
                                    Your answers from the {mod.label.toLowerCase()} onboarding, as the mentor reads them. Retake it to change any of this.
                                </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="h-[calc(100dvh-5.5rem)]" reflow>
                                <div className="space-y-6 px-5 py-5">
                                    <Group title="Strengths" items={profile.strengths} icon={Sparkles} as="badges" />
                                    <Group title="Gaps" items={profile.gaps} icon={TriangleAlert} as="badges" />
                                    <Group title="Goals" items={profile.goals} icon={Target} as="badges" />
                                    <Group title="Facts" items={profile.facts} icon={ListChecks} as="rows" />
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </div>
            )}
        </section>
    )
}
