import { ONBOARDING_LEVELS, type OnboardingLevel } from "@repo/db"
import { cn } from "@repo/ui/lib/utils"

export const LEVEL_LABELS: Record<OnboardingLevel, string> = {
    beginner: "Beginner",
    developing: "Developing",
    intermediate: "Intermediate",
    advanced: "Advanced",
}

/**
 * Four segments, filled up to the level. Monochrome on purpose: levels are told
 * apart by label and fill, never by colour.
 */
export function LevelMeter({ level, className }: { level: OnboardingLevel; className?: string }) {
    const idx = ONBOARDING_LEVELS.indexOf(level)
    return (
        <div className={cn("flex items-center gap-1", className)} aria-label={`Level: ${LEVEL_LABELS[level]}`} role="img">
            {ONBOARDING_LEVELS.map((l, i) => (
                <span
                    key={l}
                    className={cn(
                        "h-1.5 w-6 rounded-full",
                        i <= idx ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-800",
                    )}
                />
            ))}
        </div>
    )
}
