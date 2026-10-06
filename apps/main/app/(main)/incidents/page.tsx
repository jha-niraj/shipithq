import type { Metadata } from "next"
import { CreditLine } from "@/components/incidents/credit"
import Link from "next/link"
import { headers } from "next/headers"
import { ArrowRight, Award, Check, Flame, FolderCheck, PenLine, Siren, Sparkles } from "lucide-react"
import { getSession } from "@repo/auth"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { INCIDENT_TOPICS, INCIDENT_UPCOMING, topicLabel, type IncidentTopicId } from "@/content/incidents"
import { INCIDENT_BADGES } from "@/content/incidents/badges"
import { CaseArt } from "@/components/incidents/case-art"
import { ExportArt } from "@/components/incidents/export-art"
import { TopicScene, TopicSceneStyles } from "@/components/incidents/topic-scene"
import { BadgeCard, BadgeGrid, BadgeMedalStyles } from "@repo/ui/components/badge-card"
import { INCIDENT_GLYPHS, glyphFor } from "@/components/incidents/badge-medal"
import { IndexTabs, TopicTabs } from "@/components/incidents/index-tabs"
import { listLiveCases, type CaseSummary } from "@/lib/incidents/catalog"
import { loadIncidentStats, type IncidentStats } from "@/lib/incidents/stats"
import { incidentUrl } from "@/lib/urls"

/**
 * The Incidents index (plan/incidents INC-8, INC-12): the header with Cases and Badges
 * tabs on its right and the reader's record under it; Cases holds the newest case and
 * the topic tabs (each with its cases and the ones being written), Badges the medals.
 * Cases come from the database (INC-11).
 */

const DESCRIPTION = "Real production failures, taken apart. Predict what happens, run the simulator, learn the fix. No codebase needed."

export const metadata: Metadata = {
    title: "Incidents",
    description: DESCRIPTION,
    alternates: { canonical: incidentUrl() },
    openGraph: { title: "Incidents", description: DESCRIPTION, url: incidentUrl() },
}

/** Case scenes by slug; a case without one gets its topic's scene. */
const CASE_SCENES: Record<string, () => React.ReactNode> = {
    "the-demo-that-died-at-30-seconds": () => <CaseArt className="w-full" />,
    "the-export-that-finished-after-it-failed": () => <ExportArt className="w-full" />,
}


export default async function IncidentsIndexPage({ searchParams }: { searchParams: Promise<{ tab?: string; topic?: string }> }) {
    const sp = await searchParams
    const session = await getSession(await headers())
    const userId = session?.user?.id
    const [cases, stats] = await Promise.all([listLiveCases(), userId ? loadIncidentStats(userId) : Promise.resolve(null)])
    const featured = cases[cases.length - 1]

    const topics = INCIDENT_TOPICS.map((t) => ({
        id: t.id, label: t.label,
        count: cases.filter((c) => c.topics.includes(t.id)).length,
    }))
    const initialTopic = topics.some((t) => t.id === sp.topic) ? sp.topic! : (featured?.topic ?? topics[0]!.id)
    const earned = stats?.badges.length ?? 0

    const header = (
        <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <Siren className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">Incidents</h1>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Real production failures you can play. Free to read.</p>
            </div>
        </div>
    )

    const casesPanel = (
        <div className="mt-6">
            <Record stats={stats} total={cases.length} />
            {featured && <Featured c={featured} stats={stats} />}
            <section aria-labelledby="topics" className="mt-12">
                {/* No heading (Niraj, 2026-09-28): the tabs name themselves. */}
                <h2 id="topics" className="sr-only">Topics</h2>
                <TopicTabs
                    topics={topics}
                    initial={initialTopic}
                    panels={Object.fromEntries(INCIDENT_TOPICS.map((t) => [t.id, <TopicPanel key={t.id} topic={t.id} blurb={t.blurb} cases={cases.filter((c) => c.topics.includes(t.id))} stats={stats} />]))}
                />
            </section>
        </div>
    )

    const badgesPanel = (
        <section aria-label="Badges" className="mt-6">
            <BadgeMedalStyles />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {stats ? `${earned} of ${INCIDENT_BADGES.length} earned.` : "Sign in to earn badges as you play."} Each is earned once, and kept.
            </p>
            {/* The shared badge base (plan/ui-pass UI-20): earned ones glow where the pointer is. */}
            <BadgeGrid className="mt-6">
                {INCIDENT_BADGES.map((b) => {
                    const on = stats?.badges.includes(b.key) ?? false
                    return (
                        <BadgeCard
                            key={b.key}
                            id={`incident-${b.key}`}
                            glyph={INCIDENT_GLYPHS[glyphFor(b.key)]}
                            title={b.title}
                            description={b.description}
                            earned={on}
                            earnedAt={stats?.badgeDates[b.key] ?? null}
                            progress={!on && stats && b.progress ? b.progress(stats.facts) : null}
                        />
                    )
                })}
            </BadgeGrid>
        </section>
    )

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <TopicSceneStyles />
            <IndexTabs header={header} cases={casesPanel} badges={badgesPanel} initial={sp.tab === "badges" ? "badges" : "cases"} badgeCount={stats ? `${earned}/${INCIDENT_BADGES.length}` : `${INCIDENT_BADGES.length}`} />
        </div>
    )
}

function Record({ stats, total }: { stats: IncidentStats | null; total: number }) {
    const none = stats === null
    return (
        <StatBand
            size="sm"
            cols={4}
            items={[
                { icon: Sparkles, label: "XP here", value: none ? "-" : stats.xp.toLocaleString("en-IN"), hint: none ? "sign in" : undefined, href: none ? "/signin?callbackUrl=%2Fincidents" : undefined },
                { icon: FolderCheck, label: "Cases", value: none ? "-" : String(stats.completed), hint: `of ${total}` },
                { icon: Flame, label: "Streak", value: none ? "-" : `${stats.streak}d` },
                { icon: Award, label: "Badges", value: none ? "-" : String(stats.badges.length), hint: `of ${INCIDENT_BADGES.length}` },
            ]}
        />
    )
}

function Featured({ c, stats }: { c: CaseSummary; stats: IncidentStats | null }) {
    const st = stats?.cases[c.slug]
    return (
        <Link href={`/incidents/${c.slug}`} className="group mt-6 grid overflow-hidden rounded-3xl bg-neutral-950 text-white ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5 lg:grid-cols-2">
            <div className="flex flex-col p-6 sm:p-8">
                <p className="font-mono text-[11px] text-neutral-400">Latest case · {topicLabel(c.topic)} · {c.minutes} min</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{c.title}</h2>
                <p className="mt-3 max-w-md text-[15px] leading-7 text-neutral-300">{c.summary}</p>
                <CreditLine credit={c.credit} dark className="mt-3" />
                <p className="mt-4 font-mono text-[11px] text-neutral-400">{c.steps} steps · {c.quizzes} checks · narrated, with live talks</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-medium">
                    <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-neutral-950 transition-colors group-hover:bg-neutral-200">
                        {st?.complete ? "Play it again" : st && st.answered > 0 ? `Carry on · ${st.answered} of ${st.total}` : "Start the case"}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    {st?.complete && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-mono text-[11px] text-white"><Check className="size-3" aria-hidden /> Complete</span>}
                </span>
            </div>
            <div className="flex items-center border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                {CASE_SCENES[c.slug]?.() ?? <TopicScene topic={c.topic} className="mx-auto max-h-40 text-white" />}
            </div>
        </Link>
    )
}

function TopicPanel({ topic, blurb, cases, stats }: { topic: IncidentTopicId; blurb: string; cases: CaseSummary[]; stats: IncidentStats | null }) {
    const upcoming = INCIDENT_UPCOMING.filter((u) => u.topic === topic)
    const ready = stats?.readiness[topic] ?? null
    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14.5px] text-neutral-600 dark:text-neutral-400">{blurb}</p>
                {cases.length > 0 && (
                    <div className="flex w-full items-center gap-3 sm:w-64">
                        <span className="font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">Readiness</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${ready ?? 0}%` }} /></div>
                        <span className="w-9 text-right font-mono text-[12px] tabular-nums text-neutral-700 dark:text-neutral-300">{ready === null ? "-" : `${ready}%`}</span>
                    </div>
                )}
            </div>
            <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cases.map((c) => {
                    const st = stats?.cases[c.slug]
                    const Scene = CASE_SCENES[c.slug]
                    return (
                        <li key={c.slug}>
                            <Link href={`/incidents/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.25)] dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
                                <div className="flex h-40 items-center justify-center bg-neutral-950 p-4 text-white">
                                    {Scene ? Scene() : <TopicScene topic={c.topic} className="max-h-32" />}
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{c.minutes} min · {c.steps} steps</span>
                                        {st && st.answered > 0 && (
                                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px]", st.complete ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")}>
                                                {st.complete ? <><Check className="size-3" aria-hidden /> Complete</> : `${st.answered} of ${st.total}`}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-[16px] font-semibold leading-snug text-neutral-900 dark:text-white">{c.title}</p>
                                    <p className="mt-1.5 flex-1 text-[13.5px] leading-6 text-neutral-600 dark:text-neutral-400">{c.summary}</p>
                                    <CreditLine credit={c.credit} className="mt-3" />
                                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">
                                        {st?.complete ? "Play again" : st && st.answered > 0 ? "Carry on" : "Start the case"}
                                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                                    </span>
                                </div>
                            </Link>
                        </li>
                    )
                })}
                {upcoming.map((u) => (
                    <li key={u.title} className="flex flex-col overflow-hidden rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
                        <div className="flex h-40 items-center justify-center bg-neutral-50 p-4 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-600">
                            <TopicScene topic={u.topic} className="max-h-32" />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10.5px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><PenLine className="size-3" aria-hidden /> Being written</span>
                            <p className="mt-2 text-[16px] font-semibold leading-snug text-neutral-700 dark:text-neutral-300">{u.title}</p>
                            <p className="mt-1.5 text-[13.5px] leading-6 text-neutral-500 dark:text-neutral-400">{u.summary}</p>
                        </div>
                    </li>
                ))}
                {cases.length === 0 && upcoming.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-neutral-200 px-5 py-10 text-center text-sm text-neutral-500 md:col-span-2 xl:col-span-3 dark:border-neutral-800 dark:text-neutral-400">
                        No case yet. The next one is written when it happens in production.
                    </li>
                )}
            </ul>
        </div>
    )
}
