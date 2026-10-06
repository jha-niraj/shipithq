"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { useNearestStep } from "./use-nearest-step"

/**
 * A scroll story (plan/web/story ST-3; the Story Playbook, sections 3 and 4). A column of
 * short steps that really scroll beside ONE sticky panel whose contents change as each step
 * reaches the middle of the screen. The panel is mounted once; `panel(active)` decides what
 * is inside it, so things that persist can glide and new things draw in.
 *
 * Inactive steps dim by colour, never by opacity: neutral-500 measures 4.6:1 on the site's
 * neutral-50 and 4.7:1 on white, so dimmed text still passes. On phones the panel sits sticky
 * at the top and the steps scroll beneath it. Each step has an id for deep links.
 */

export type StoryStep = {
    /** Stable, for `#id` links. */
    id: string
    title: ReactNode
    body?: ReactNode
    /** Who it happens to, or when: a short mono line above the title. */
    tag?: ReactNode
}

export function ScrollStory({ steps, panel, side = "right", className }: {
    steps: StoryStep[]
    panel: (active: number) => ReactNode
    /** Which side the drawing sits on, at md and up. */
    side?: "left" | "right"
    className?: string
}) {
    const { refs, active } = useNearestStep(steps.length)
    return (
        // minmax(0,1fr): an implicit column grows to its widest child, and a wide panel once
        // pushed the step text off a phone screen (the playbook's fix).
        <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-6 md:gap-12", side === "right" ? "md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : "md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]", className)}>
            <div className={cn("order-2", side === "right" ? "md:order-1" : "md:order-2")}>
                {steps.map((s, i) => {
                    const on = i === active
                    return (
                        <div
                            key={s.id}
                            id={s.id}
                            ref={(el) => { refs.current[i] = el }}
                            data-active={on}
                            className="flex min-h-[44vh] scroll-mt-28 items-center py-8 md:min-h-[62vh]"
                        >
                            <div className="max-w-md">
                                <p className={cn(MONO, "text-[12px] tabular-nums tracking-[0.12em] transition-colors duration-300 motion-reduce:transition-none", on ? "text-neutral-900" : "text-neutral-500")}>
                                    {String(i + 1).padStart(2, "0")}{s.tag ? <span> · {s.tag}</span> : null}
                                </p>
                                <h3 className={cn("mt-3 text-balance font-display text-2xl font-semibold leading-tight tracking-tight transition-colors duration-300 motion-reduce:transition-none md:text-[1.75rem]", on ? "text-neutral-900" : "text-neutral-500")}>
                                    {s.title}
                                </h3>
                                {s.body && (
                                    <div className={cn("mt-3 text-[16px] leading-7 transition-colors duration-300 motion-reduce:transition-none", on ? "text-neutral-700" : "text-neutral-500")}>
                                        {s.body}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className={cn("order-1", side === "right" ? "md:order-2" : "md:order-1")}>
                {/* Under the sticky navbar on phones; centred-ish on larger screens. */}
                <div className="sticky top-16 z-10 bg-neutral-50/95 pb-2 pt-2 backdrop-blur md:top-[14vh] md:bg-transparent md:p-0 md:backdrop-blur-none">
                    {panel(active)}
                </div>
            </div>
        </div>
    )
}

/** The frame a story's drawing sits in, and its one-line takeaway (the rubric's rule 4). */
export function StoryPanel({ children, takeaway, label, className }: { children: ReactNode; takeaway?: ReactNode; label?: string; className?: string }) {
    return (
        <figure className={cn("overflow-hidden rounded-2xl border border-neutral-200 bg-white", className)} aria-label={label}>
            <div className="p-4 sm:p-6">{children}</div>
            {takeaway && (
                <figcaption className="border-t border-neutral-200 px-4 py-3 text-[14px] font-medium leading-6 text-neutral-900 sm:px-6">
                    {takeaway}
                </figcaption>
            )}
        </figure>
    )
}
