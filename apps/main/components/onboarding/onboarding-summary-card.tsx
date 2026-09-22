"use client"

import { ArrowRight } from "lucide-react"
import type { OnboardingProfile } from "@repo/db"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from "@repo/ui/lib/utils"
import { LEVEL_LABELS, LevelMeter } from "./level-meter"

const INK = "text-neutral-900 dark:text-neutral-50"
const INK_DIM = "text-neutral-600 dark:text-neutral-400"

/** Shown in the question slot when the run finishes: the level and three lines, then Continue. */
export function OnboardingSummaryCard({
    profile,
    moduleLabel,
    onContinue,
    continuing,
}: {
    profile: OnboardingProfile
    moduleLabel: string
    onContinue: () => void
    continuing: boolean
}) {
    return (
        <div>
            <span className={cn("text-xs font-semibold uppercase tracking-wider", INK_DIM)}>Where you stand</span>
            <div className="mt-3 flex items-center gap-3">
                <span className={cn("rounded-full border border-neutral-900 px-3 py-1 text-sm font-semibold dark:border-neutral-100", INK)}>
                    {LEVEL_LABELS[profile.level]}
                </span>
                <LevelMeter level={profile.level} />
            </div>
            {/* Model output about the user: rendered as text, never as markdown. */}
            <ul className="mt-5 space-y-2.5">
                {profile.summary.map((line, i) => (
                    <li key={i} className={cn("flex items-start gap-3 text-base leading-relaxed", INK)}>
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
            <p className={cn("mt-5 text-sm", INK_DIM)}>
                This stays on your {moduleLabel.toLowerCase()} dashboard. You can retake it any time.
            </p>
            <Button type="button" onClick={onContinue} disabled={continuing} className="mt-6 h-11 rounded-xl px-6">
                {continuing ? <InlineLoader size="sm" className="mr-2" /> : null}
                Open the dashboard
                {!continuing && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
        </div>
    )
}
