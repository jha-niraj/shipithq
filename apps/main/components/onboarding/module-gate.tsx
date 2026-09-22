"use client"

import { ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { onboardingModule, type OnboardingModuleKey } from "@/lib/onboarding/modules"

/**
 * What a user sees on a sub-module page before they have completed its
 * onboarding: why we ask, how long it takes, one button. The dashboard is not
 * reachable around it; the server page decides which of the two to render.
 */
export function ModuleGate({
    moduleKey,
    resumable,
    starting,
    onStart,
    backHref,
}: {
    moduleKey: OnboardingModuleKey
    /** A run is in progress: the button reads Resume and no answers are lost. */
    resumable: boolean
    starting: boolean
    onStart: () => void
    /** When a completed profile already exists (a retake), a way back to the dashboard. */
    backHref?: string
}) {
    const mod = onboardingModule(moduleKey)
    return (
        <div className="flex h-full min-h-0 items-center justify-center px-4 py-10 sm:px-8">
            <div className="w-full max-w-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    Before you start
                </span>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
                    Tell us where you are with {mod.label.toLowerCase()}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{mod.purpose}</p>
                <ul className="mt-5 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <li className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>About {mod.estimateMinutes} minutes. Six to ten questions, one at a time, each one shaped by your last answer.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Mostly pick-an-option. Your answers are saved as you go, so you can leave and come back.</span>
                    </li>
                </ul>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={onStart} disabled={starting} className="h-11 rounded-xl px-6 text-sm">
                        {starting ? (
                            <>
                                <InlineLoader size="sm" className="mr-2" />
                                {resumable ? "Resuming" : "Starting"}
                            </>
                        ) : resumable ? (
                            "Resume where you left off"
                        ) : (
                            "Start"
                        )}
                    </Button>
                    {backHref && (
                        <Link href={backHref} className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline dark:text-neutral-300">
                            Back to the dashboard
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
