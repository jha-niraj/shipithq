import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { ArrowRight, Award, Check, Flame, FolderCheck, Lock, Siren, Sparkles } from "lucide-react"
import { getSession } from "@repo/auth"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { INCIDENTS, INCIDENT_TOPICS, topicLabel } from "@/content/incidents"
import { INCIDENT_BADGES } from "@/content/incidents/badges"
import { INCIDENT_CASES } from "@/content/incidents/cases"
import { CaseArt } from "@/components/incidents/case-art"
import { loadIncidentStats, type IncidentStats } from "@/lib/incidents/stats"
import { incidentUrl } from "@/lib/urls"

/**
 * The Incidents index, inside the app shell (plan/incidents INC-8). One header row:
 * the section on the left, the reader's record on the right (a small StatBand; '-'
 * signed out, which means no data, not zero). Then the newest case as a featured
 * card, the four topics with readiness and their cases, and the badges.
 */

const DESCRIPTION = "Real production failures, taken apart. Predict what happens, run the simulator, learn the fix. No codebase needed."

export const metadata: Metadata = {
    title: "Incidents",
    description: DESCRIPTION,
    alternates: { canonical: incidentUrl() },
    openGraph: { title: "Incidents", description: DESCRIPTION, url: incidentUrl() },
}

export default async function IncidentsIndexPage() {
    const session = await getSession(await headers())
    const userId = session?.user?.id
    const stats = userId ? await loadIncidentStats(userId) : null
    const featured = INCIDENTS[INCIDENTS.length - 1]!
    const fst = stats?.cases[featured.slug]
    const fc = INCIDENT_CASES[featured.slug]

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <Siren className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">Incidents</h1>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Real production failures you can play. Free to read.</p>
                    </div>
                </div>
                <Record stats={stats} />
            </header>

            {/* Featured: the newest case */}
            <Link
                href={`/incidents/${featured.slug}`}
                className="group mt-8 grid overflow-hidden rounded-3xl bg-neutral-950 text-white ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
                <div className="flex flex-col p-6 sm:p-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                        Latest case · {topicLabel(featured.topic)} · {featured.minutes} min
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{featured.title}</h2>
                    <p className="mt-3 max-w-md text-[15px] leading-7 text-neutral-300">{featured.summary}</p>
                    {fc && (
                        <p className="mt-4 font-mono text-[11px] text-neutral-400">
                            {fc.predict.length} calls to make · a simulator · {fc.round.length} failure signatures
                        </p>
                    )}
                    <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium">
                        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-neutral-950 transition-colors group-hover:bg-neutral-200">
                            {fst?.complete ? "Read it again" : fst && fst.answered > 0 ? `Carry on · ${fst.answered} of ${fst.total}` : "Open the case"}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                        {fst?.complete && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] text-emerald-300"><Check className="size-3" aria-hidden /> Complete</span>}
                    </span>
                </div>
                <div className="flex items-center border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <CaseArt className="w-full" />
                </div>
            </Link>

            {/* Topics */}
            <section aria-labelledby="topics" className="mt-12">
                <h2 id="topics" className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Topics</h2>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                    {INCIDENT_TOPICS.map((topic) => {
                        const cases = INCIDENTS.filter((c) => c.topic === topic.id)
                        const ready = stats?.readiness[topic.id] ?? null
                        return (
                            <li key={topic.id} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-white">{topic.label}</h3>
                                        <p className="mt-0.5 text-[13.5px] leading-6 text-neutral-600 dark:text-neutral-400">{topic.blurb}</p>
                                    </div>
                                    <Readiness value={cases.length ? ready : null} />
                                </div>
                                {cases.length ? (
                                    <ul className="mt-4 space-y-2">
                                        {cases.map((c) => {
                                            const st = stats?.cases[c.slug]
                                            return (
                                                <li key={c.slug}>
                                                    <Link href={`/incidents/${c.slug}`} className="group flex items-center gap-3 rounded-xl border border-neutral-200 px-3.5 py-3 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
                                                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", st?.complete ? "bg-emerald-600 text-white" : "border border-neutral-300 dark:border-neutral-700")}>
                                                            {st?.complete && <Check className="size-3.5" aria-hidden />}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[14.5px] font-medium text-neutral-900 dark:text-white">{c.title}</span>
                                                            <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                                                {c.minutes} min{st && st.answered > 0 && !st.complete ? ` · ${st.answered} of ${st.total} answered` : ""}
                                                            </span>
                                                        </span>
                                                        <ArrowRight className="size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900 dark:group-hover:text-white" aria-hidden />
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <p className="mt-4 rounded-xl border border-dashed border-neutral-200 px-3.5 py-3 text-[13.5px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                                        No case yet. The next one is written when it happens in production.
                                    </p>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </section>

            <Badges earned={stats?.badges ?? null} />
        </div>
    )
}

function Record({ stats }: { stats: IncidentStats | null }) {
    const none = stats === null
    return (
        <StatBand
            size="sm"
            cols={4}
            className="xl:w-[40rem]"
            items={[
                { icon: Sparkles, label: "XP here", value: none ? "-" : stats.xp.toLocaleString("en-IN"), hint: none ? "sign in" : undefined, href: none ? "/signin?callbackUrl=%2Fincidents" : undefined },
                { icon: FolderCheck, label: "Cases", value: none ? "-" : String(stats.completed), hint: `of ${INCIDENTS.length}` },
                { icon: Flame, label: "Streak", value: none ? "-" : `${stats.streak}d` },
                { icon: Award, label: "Badges", value: none ? "-" : String(stats.badges.length), hint: `of ${INCIDENT_BADGES.length}` },
            ]}
        />
    )
}

/** Readiness as a small ring: right answers over every question in the topic. */
function Readiness({ value }: { value: number | null }) {
    const r = 16
    const len = 2 * Math.PI * r
    return (
        <div className="flex shrink-0 flex-col items-center gap-1" title="Readiness: right answers over every question in this topic">
            <svg viewBox="0 0 40 40" className="size-11 -rotate-90" aria-hidden>
                <circle cx="20" cy="20" r={r} className="fill-none stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="4" />
                {value !== null && <circle cx="20" cy="20" r={r} className="fill-none stroke-emerald-600" strokeWidth="4" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)} />}
            </svg>
            <span className="font-mono text-[10.5px] tabular-nums text-neutral-600 dark:text-neutral-400">{value === null ? "-" : `${value}%`}</span>
        </div>
    )
}

function Badges({ earned }: { earned: string[] | null }) {
    return (
        <section aria-labelledby="badges" className="mt-12">
            <h2 id="badges" className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Badges</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INCIDENT_BADGES.map((b) => {
                    const on = earned?.includes(b.key) ?? false
                    return (
                        <li key={b.key} className={cn("rounded-2xl border p-4", on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-dashed border-neutral-300 dark:border-neutral-700")}>
                            <span className={cn("flex size-8 items-center justify-center rounded-full", on ? "bg-white/15 dark:bg-neutral-900/10" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800")}>
                                {on ? <Award className="size-4" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                            </span>
                            <p className={cn("mt-3 text-[14px] font-semibold leading-snug", !on && "text-neutral-900 dark:text-white")}>{b.title}</p>
                            <p className={cn("mt-1 text-[12.5px] leading-5", on ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-500 dark:text-neutral-400")}>{b.description}</p>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
