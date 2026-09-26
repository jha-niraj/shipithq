"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { INCIDENT_XP, topicLabel } from "@/content/incidents"
import { CaseArt } from "./case-art"
import { useCase } from "./primitives"
import { useProgress } from "./case-progress"

/**
 * The case's cover (plan/incidents INC-9): breadcrumb, title, the one-line summary and
 * what the case holds, beside the failure in miniature. The same dark card as the
 * index's featured case, so the two read as one thing.
 */
export function CaseCover() {
    const c = useCase()
    const { derived } = useProgress()
    const xp = c.predict.length * INCIDENT_XP.prediction + INCIDENT_XP.perfectRound + INCIDENT_XP.completion
    return (
        <header className="overflow-hidden rounded-3xl bg-neutral-950 text-white ring-1 ring-white/10">
            <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="p-6 sm:p-8">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-neutral-400">
                        <Link href="/incidents" className="hover:text-white">Incidents</Link>
                        <ChevronRight className="size-3.5" aria-hidden />
                        <span>{topicLabel(c.topic)}</span>
                    </nav>
                    <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{c.title}</h1>
                    <p className="mt-3 max-w-lg text-[16px] leading-7 text-neutral-300">{c.summary}</p>
                    <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] text-neutral-400">
                        <div><dt className="sr-only">Length</dt><dd>{c.minutes} min</dd></div>
                        <div><dt className="sr-only">Calls</dt><dd>{c.predict.length} calls to make</dd></div>
                        <div><dt className="sr-only">XP</dt><dd>up to {xp} XP</dd></div>
                        {derived.complete && <div><dt className="sr-only">Status</dt><dd className="text-emerald-300">Complete</dd></div>}
                    </dl>
                </div>
                <div className="flex items-center border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <CaseArt className="w-full" />
                </div>
            </div>
        </header>
    )
}
