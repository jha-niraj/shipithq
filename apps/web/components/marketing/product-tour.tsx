"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { Eyebrow, MONO, TONE, isDark, type Tone } from "./primitives"
import { CardArt, CardArtStyles, type ArtKind } from "./card-art"

/**
 * The product tour as a vertical sticky scroll (plan/web/revamp REV-114; Niraj,
 * 2026-09-26: "update this horizontal scrolling to the vertical scrolling").
 *
 * The cards scroll past on the LEFT; the title, the tab list and a progress bar stay
 * sticky on the RIGHT. "Built for your stage" on the student page is the mirror image
 * (sticky on the left), so the two read as two different sections, and the landing
 * keeps other sections between them.
 *
 * The card crossing the middle of the viewport lights its tab; a tab scrolls its card
 * to the centre. Below lg the sticky column becomes a plain header above the cards.
 */

export interface TourTab {
    id: string
    label: string
    art: ArtKind
    tone: Tone
    title: string
    points: string[]
    href: string
    cta: string
}

function Card({ tab, dim }: { tab: TourTab; dim: boolean }) {
    const t = TONE[tab.tone]
    const dark = isDark(tab.tone)
    return (
        <article
            className={cn(
                "overflow-hidden rounded-3xl p-8 transition-[opacity,transform] duration-500 md:p-10",
                t.surface, t.ink, tab.tone === "white" && "border border-neutral-200",
                dim ? "lg:scale-[0.98] lg:opacity-55" : "opacity-100",
            )}
        >
            <div className="flex h-64 items-center justify-center md:h-72">
                <CardArt kind={tab.art} dark={dark} className="max-h-full max-w-md" />
            </div>
            <p className={cn(MONO, "mt-6 text-[11px] uppercase tracking-[0.18em]", t.muted)}>{tab.label}</p>
            <h3 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">{tab.title}</h3>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
                {tab.points.map((p) => (
                    <li key={p} className={cn("flex gap-2.5 rounded-xl p-3 text-[14px] leading-5", dark ? "bg-white/5" : "bg-white/50")}>
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <span className={dark ? "text-neutral-200" : "text-neutral-800"}>{p}</span>
                    </li>
                ))}
            </ul>
            <Link href={tab.href} className={cn("mt-7 inline-flex items-center gap-2 border-b pb-0.5 text-sm font-medium", dark ? "border-white/40" : "border-neutral-900/30")}>
                {tab.cta} <ArrowRight className="size-4" aria-hidden />
            </Link>
        </article>
    )
}

export function ProductTour({ eyebrow, title, tabs }: { eyebrow: string; title: string; tabs: TourTab[] }) {
    const [active, setActive] = useState(0)
    const cards = useRef<Array<HTMLDivElement | null>>([])

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
                }
            },
            { rootMargin: "-45% 0px -45% 0px" },
        )
        cards.current.forEach((el) => el && io.observe(el))
        return () => io.disconnect()
    }, [])

    const goTo = (i: number) => cards.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })

    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <CardArtStyles />
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
                {/* The sticky column, on the right at lg (first in the DOM for reading order). */}
                <div className="lg:order-2 lg:sticky lg:top-24 lg:self-start">
                    <Eyebrow>{eyebrow}</Eyebrow>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">{title}</h2>
                    <div role="tablist" aria-label={title} aria-orientation="vertical" className="mt-8 flex gap-2 overflow-x-auto lg:flex-col">
                        {tabs.map((x, i) => (
                            <button
                                key={x.id}
                                role="tab"
                                type="button"
                                aria-selected={i === active}
                                onClick={() => goTo(i)}
                                className={cn(
                                    "flex min-w-[10rem] cursor-pointer items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-colors duration-300",
                                    i === active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300",
                                )}
                            >
                                <span>
                                    <span className={cn(MONO, "block text-[10px] uppercase tracking-[0.14em]", i === active ? "text-neutral-400" : "text-neutral-500")}>{String(i + 1).padStart(2, "0")}</span>
                                    <span className="mt-0.5 block text-[16px] font-semibold tracking-tight">{x.label}</span>
                                </span>
                                <ArrowRight className={cn("size-4 transition-transform duration-300", i === active ? "translate-x-0" : "-translate-x-1 opacity-0")} aria-hidden />
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 hidden h-1 overflow-hidden rounded-full bg-neutral-200 lg:block">
                        <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-500" style={{ width: `${((active + 1) / tabs.length) * 100}%` }} />
                    </div>
                </div>

                {/* The cards, scrolling past on the left. */}
                <div className="space-y-6 lg:order-1">
                    {tabs.map((tab, i) => (
                        <div key={tab.id} ref={(el) => { cards.current[i] = el }} data-index={i} role="tabpanel" aria-label={tab.label}>
                            <Card tab={tab} dim={i !== active} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
