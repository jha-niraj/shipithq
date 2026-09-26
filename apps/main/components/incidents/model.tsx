"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@repo/ui/lib/utils"
import { DIAGRAMS } from "./diagrams/worker-limits"
import { Inline, Reveal, Sources, useCase } from "./primitives"
import { useProgress } from "./case-progress"

/**
 * Part two, the model (plan/incidents INC-3). At xl the steps scroll on the left
 * while the diagram stays sticky on the right and lights whatever the step in the
 * middle of the viewport is about (the same observer as the landing's sticky
 * sections). Below xl each step carries its own small diagram, since nothing can
 * stay pinned beside the text.
 *
 * Native scrolling only: nothing is pinned against the reader's scroll.
 */
export function Model() {
    const c = useCase()
    const { dispatch } = useProgress()
    const [active, setActive] = useState(0)
    const steps = useRef<Array<HTMLDivElement | null>>([])
    const Diagram = DIAGRAMS[c.model.diagram]
    const last = c.model.steps.length - 1

    useEffect(() => {
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue
                const i = Number((e.target as HTMLElement).dataset.index)
                setActive(i)
                if (i === last) dispatch({ type: "modelSeen" })
            }
        }, { rootMargin: "-45% 0px -45% 0px" })
        steps.current.forEach((el) => el && io.observe(el))
        return () => io.disconnect()
    }, [dispatch, last])

    const focus = c.model.steps[active]?.focus ?? "overview"

    return (
        <div>
            <Reveal className="max-w-[44rem]">
                <p className="text-[17px] leading-8 text-neutral-800 dark:text-neutral-200"><Inline text={c.model.intro} /></p>
            </Reveal>
            <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-12">
                <div className="space-y-8 xl:space-y-0">
                    {c.model.steps.map((s, i) => (
                        <div
                            key={s.id}
                            ref={(el) => { steps.current[i] = el }}
                            data-index={i}
                            className={cn(
                                "transition-opacity duration-500 xl:flex xl:min-h-[58vh] xl:flex-col xl:justify-center",
                                i === active ? "xl:opacity-100" : "xl:opacity-35",
                            )}
                        >
                            {Diagram && (
                                <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 xl:hidden dark:border-neutral-800 dark:bg-neutral-950">
                                    <Diagram focus={s.focus} />
                                </div>
                            )}
                            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                                {String(i + 1).padStart(2, "0")} / {String(c.model.steps.length).padStart(2, "0")}
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{s.title}</h3>
                            <p className="mt-3 text-[16px] leading-7 text-neutral-700 dark:text-neutral-300"><Inline text={s.body} /></p>
                            <Sources refs={s.sources} className="mt-4" />
                        </div>
                    ))}
                </div>
                {Diagram && (
                    <div className="hidden xl:block">
                        <div className="sticky top-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] dark:border-neutral-800 dark:bg-neutral-950">
                            <Diagram focus={focus} />
                            <div className="mt-4 flex gap-1.5" aria-hidden>
                                {c.model.steps.map((s, i) => (
                                    <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800")} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
