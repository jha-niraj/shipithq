import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"

/**
 * The coming-soon marker (plan/web/story ST-2; Niraj, 2026-10-06: "mark them coming soon").
 * A claim the product does not support today keeps its sentence and carries this marker:
 * what is not built, and what happens instead today. Never delete the sentence silently,
 * never leave it bare. Every use is listed in plan/web/story/tasks.md.
 *
 * Server-rendered, no JavaScript: the tooltip opens on hover and on keyboard focus.
 */

export type SoonFacts = {
    /** What is not built yet, in plain words. */
    what: string
    /** What happens instead today. */
    today: string
}

/** The small label. Sand fill with dark ink, so it reads on every tone (web's pastels only). */
export function SoonLabel({ className }: { className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-full bg-[#EFD9A0] px-2 py-0.5 align-middle font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-900", className)}>
            Soon
        </span>
    )
}

/** Inline, inside running text: a dotted underline, the label, and a tooltip with the facts. */
export function Soon({ what, today, children }: SoonFacts & { children: ReactNode }) {
    return (
        <span className="group relative inline">
            <span
                tabIndex={0}
                className="cursor-help rounded-sm underline decoration-neutral-500 decoration-dotted decoration-[1.5px] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
                {children}
            </span>{" "}
            <SoonLabel />
            <span
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[80vw] rounded-lg bg-neutral-900 p-3 text-left text-[13px] font-normal normal-case leading-5 tracking-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 motion-reduce:transition-none"
            >
                Coming soon to ShipItHQ: {what}. Today, {today}.
            </span>
        </span>
    )
}

/** Written out in full, for cards (themselves links) and feature pages. */
export function SoonNote({ what, today, dark = false, className }: SoonFacts & { dark?: boolean; className?: string }) {
    return (
        <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] leading-5", dark ? "text-neutral-200" : "text-neutral-700", className)}>
            <SoonLabel />
            <span>
                Not built yet: {what}. Today, {today}.
            </span>
        </p>
    )
}
