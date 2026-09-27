import * as React from "react"
import { cn } from "../../lib/utils"

/*
 * Actions that stay in reach on a long page (plan/hiring-ui HU-3): stuck to the bottom
 * of the page's scroll area, full width of the page column, above the content.
 */
export function StickyActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "sticky bottom-0 z-20 bleed-page mt-6 border-t border-neutral-200 bg-white/95 px-page py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80",
            "dark:border-neutral-800 dark:bg-neutral-950/95 dark:supports-[backdrop-filter]:bg-neutral-950/80",
            className,
        )}>
            <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>
        </div>
    )
}

/**
 * The side column of a list/detail page (HU-3): sticks below the top of the scroll area
 * on lg+ and scrolls on its own when taller than the screen.
 */
export function StickyAside({ children, className, as: As = "aside" }: { children: React.ReactNode; className?: string; as?: "aside" | "div" | "nav" }) {
    return (
        <As className={cn("lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto", className)}>
            {children}
        </As>
    )
}
