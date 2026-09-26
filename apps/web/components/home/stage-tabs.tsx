"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { Eyebrow, MONO } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"

/**
 * "Built for your stage" (plan/web/revamp REV-108, REV-112): the stage list on the left
 * stays sticky while the three stage panels scroll past vertically on the right
 * (Niraj, 2026-09-26). The panel in the middle of the viewport lights its tab; a tab
 * scrolls its panel into view. Each panel is a path of three modules, joined by a line,
 * each linking to its feature page. Every step restates content/modules.ts.
 */

type Step = { module: string; title: string; why: string; art: ArtKind; href: string }
type Stage = { id: string; label: string; who: string; headline: string; steps: Step[] }

const STAGES: Stage[] = [
    {
        id: "student",
        label: "Student",
        who: "In college, placements ahead",
        headline: "Get placement-ready before the season starts",
        steps: [
            { module: "Practice", title: "Follow the guided DSA path", why: "76 problems in order, judged on hidden tests.", art: "practice", href: "/features/practice" },
            { module: "Projects", title: "Finish one real project", why: "Four sprints you can talk about for ten minutes.", art: "projects", href: "/features/projects" },
            { module: "Mock", title: "Rehearse out loud", why: "Voice mocks before the real rounds.", art: "mock", href: "/features/mock" },
        ],
    },
    {
        id: "grad",
        label: "New grad",
        who: "Degree done, first job next",
        headline: "Turn a degree into interviews",
        steps: [
            { module: "AI tools", title: "Build a resume that says what you did", why: "Tailor it to each job and check the ATS score.", art: "ai", href: "/features/ai" },
            { module: "Jobs", title: "Apply where you already fit", why: "A match score before you apply, not a rejection after.", art: "jobs", href: "/features/jobs" },
            { module: "Mock", title: "Practise the phone screen", why: "Scores for communication, technical skills and problem solving.", art: "mock", href: "/features/mock" },
        ],
    },
    {
        id: "switcher",
        label: "Career switcher",
        who: "Moving into software",
        headline: "Show proof of work, not a certificate",
        steps: [
            { module: "Projects", title: "Build something from a blueprint", why: "Hand-written briefs, one task at a time.", art: "projects", href: "/features/projects" },
            { module: "Practice", title: "Fill the fundamentals", why: "DSA and system design, in a real container.", art: "practice", href: "/features/practice" },
            { module: "AI tools", title: "Import it all into a resume", why: "From your LinkedIn and GitHub, then tailored.", art: "ai", href: "/features/ai" },
        ],
    },
]

export function StageTabs() {
    const [active, setActive] = useState(0)
    const panels = useRef<Array<HTMLDivElement | null>>([])

    // The panel crossing the middle band of the viewport is the active one.
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
                }
            },
            { rootMargin: "-45% 0px -45% 0px" },
        )
        panels.current.forEach((el) => el && io.observe(el))
        return () => io.disconnect()
    }, [])

    const goTo = (i: number) => {
        panels.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }

    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <CardArtStyles />
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:gap-10">
                    {/* Sticky at lg, title included, so the heading never scrolls away behind
                        the navbar while the panels move (Niraj, 2026-09-26). `top-24` clears
                        the 64px sticky navbar with room to breathe. Below lg it is a plain
                        header and a row of tabs above the panels. */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <Eyebrow>Built for your stage</Eyebrow>
                        <h2 className="mb-8 mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Where should you start?</h2>
                        <div role="tablist" aria-label="Your stage" aria-orientation="vertical" className="flex gap-2 overflow-x-auto lg:flex-col">
                            {STAGES.map((s, i) => (
                                <button
                                    key={s.id}
                                    role="tab"
                                    type="button"
                                    aria-selected={i === active}
                                    onClick={() => goTo(i)}
                                    className={cn(
                                        "min-w-[12rem] cursor-pointer rounded-2xl border p-5 text-left transition-colors duration-300",
                                        i === active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300",
                                    )}
                                >
                                    <span className="block text-lg font-semibold tracking-tight">{s.label}</span>
                                    <span className={cn("mt-1 block text-[13px]", i === active ? "text-neutral-300" : "text-neutral-600")}>{s.who}</span>
                                </button>
                            ))}
                        </div>
                        {/* Progress down the three stages. */}
                        <div className="mt-4 hidden h-1 overflow-hidden rounded-full bg-neutral-200 lg:block">
                            <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-500" style={{ width: `${((active + 1) / STAGES.length) * 100}%` }} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {STAGES.map((stage, si) => (
                            <div
                                key={stage.id}
                                ref={(el) => { panels.current[si] = el }}
                                data-index={si}
                                role="tabpanel"
                                aria-label={stage.label}
                                className={cn(
                                    "rounded-3xl p-6 transition-[opacity,transform] duration-500 md:p-10 lg:min-h-[70vh]",
                                    ["bg-[#F5E6A8]", "bg-[#BFE3D0]", "bg-[#F2C9C4]"][si],
                                    si === active ? "opacity-100" : "lg:scale-[0.98] lg:opacity-60",
                                )}
                            >
                                <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-700")}>{stage.label} · {stage.who}</p>
                                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">{stage.headline}</h3>
                                <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
                                    <span aria-hidden className="absolute left-6 right-6 top-[4.25rem] hidden h-px bg-neutral-900/20 md:block" />
                                    {stage.steps.map((st, i) => (
                                        <li key={st.title} className="relative">
                                            <Link href={st.href} className="group flex h-full flex-col rounded-2xl bg-white p-5 transition-transform duration-300 hover:-translate-y-1">
                                                <span className="flex items-center justify-between">
                                                    <span className={cn(MONO, "flex size-8 items-center justify-center rounded-full bg-neutral-900 text-[12px] text-white")}>{i + 1}</span>
                                                    <span className={cn(MONO, "text-[10px] uppercase tracking-[0.14em] text-neutral-600")}>{st.module}</span>
                                                </span>
                                                <span className="my-4 flex h-24 items-center justify-center"><CardArt kind={st.art} className="max-h-24" /></span>
                                                <span className="text-[16px] font-semibold leading-snug text-neutral-900">{st.title}</span>
                                                <span className="mt-1 flex-1 text-[14px] leading-6 text-neutral-700">{st.why}</span>
                                                <ArrowRight className="mt-4 size-4 text-neutral-900 transition-transform group-hover:translate-x-1" aria-hidden />
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
