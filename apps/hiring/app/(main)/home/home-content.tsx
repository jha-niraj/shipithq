"use client"

import { useState } from "react"
import Link from "next/link"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Activity, ArrowRight, Briefcase, Check, CircleAlert, Inbox, ListChecks, Plus, Send, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar"
import { Button } from "@repo/ui/components/ui/button"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@repo/ui/components/ui/chart"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import type { HomeData, HomeRole } from "@/lib/home"

/*
 * Home (plan/hiring-app HA-15, plan/hiring-ui HU-6): "New job" at the top, the
 * headline numbers, the setup checklist until the company is ready, what needs
 * attention, twelve weeks of results and practice, the jobs table with the funnel
 * for the one picked, and the pipelines and team beside them. A new company's Home
 * is full from the first visit: every section has its zero state, and the chart
 * draws its axes with zeros.
 */

const TYPE: Record<string, string> = { APTITUDE: "Aptitude", DSA: "Coding", SYSTEM_DESIGN: "System design", VOICE_BEHAVIOURAL: "Behavioural", VOICE_CULTURE: "Culture" }
const STATUS: Record<string, string> = { ACTIVE: "Live", DRAFT: "Draft", PAUSED: "Paused", FILLED: "Filled", HIDDEN: "Hidden by ShipItHQ" }
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-")
const shortWeek = (w: string) => new Date(`${w}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
const num = (n: number) => n.toLocaleString("en-IN")

// The same greys as Analytics: the strongest line flips with the theme.
const chartConfig = {
    received: { label: "Results received", theme: { light: "#171717", dark: "#fafafa" } },
    practising: { label: "Students practising", theme: { light: "#8a8a8a", dark: "#8a8a8a" } },
} satisfies ChartConfig

function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section aria-label={title} className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    )
}

const cardClass = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"

export default function HomeContent({ data, canCreateJob, canSeeCandidates }: { data: HomeData; canCreateJob: boolean; canSeeCandidates: boolean }) {
    const [picked, setPicked] = useState<string | null>(data.roles.find((r) => r.rounds.length)?.id ?? data.roles[0]?.id ?? null)
    const role = data.roles.find((r) => r.id === picked) ?? null
    const t = data.totals

    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader
                title="Home"
                subtitle="Your jobs, the candidates taking their rounds, and what to do next."
                actions={canCreateJob ? <Button asChild size="sm" className="gap-1.5"><Link href="/jobs/new"><Plus className="h-4 w-4" /> New job</Link></Button> : null}
            />

            <StatBand
                cols={4}
                items={[
                    { icon: Briefcase, label: "Live jobs", value: num(t.live), hint: data.roles.length > t.live ? `of ${num(data.roles.length)}` : undefined, href: "/jobs" },
                    canSeeCandidates
                        ? { icon: Inbox, label: "To review", value: num(t.waiting), hint: "results with no decision", href: "/results" }
                        : { icon: Inbox, label: "To review", value: "-", hint: "needs candidate access" },
                    { icon: Activity, label: "Practising", value: num(t.practising), hint: "started a first round" },
                    { icon: Send, label: "Results received", value: t.received === null ? "-" : num(t.received), hint: "last 12 weeks" },
                ]}
            />

            <Setup steps={data.setup} />
            <Attention items={data.attention} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 space-y-6">
                    {data.series && (
                        <Section title="Results and practice per week" action={<Link href="/analytics" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Analytics</Link>}>
                            <div className={cn(cardClass, "p-4")}>
                                <ChartContainer config={chartConfig} className="h-56 w-full">
                                    <LineChart data={data.series} margin={{ left: 0, right: 12, top: 8 }}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis dataKey="week" tickFormatter={shortWeek} tickLine={false} axisLine={false} minTickGap={24} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} domain={[0, (max: number) => Math.max(4, max)]} />
                                        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Week of ${shortWeek(String(v))}`} />} />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="practising" stroke="var(--color-practising)" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                                    </LineChart>
                                </ChartContainer>
                                {data.series.every((w) => !w.received && !w.practising) && (
                                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Nothing yet. The lines fill in as students take your rounds and send you their results.</p>
                                )}
                            </div>
                        </Section>
                    )}

                    {data.roles.length ? (
                        <>
                            <Jobs roles={data.roles} picked={picked} onPick={setPicked} canSeeCandidates={canSeeCandidates} />
                            {role && <Funnel role={role} />}
                        </>
                    ) : (
                        <Section title="Jobs">
                            <div className={cn(cardClass, "flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between")}>
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white">No jobs yet</p>
                                    <p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">A job comes with its rounds. Candidates take them on ShipItHQ, and the ones who clear them send you their results.</p>
                                </div>
                                {canCreateJob
                                    ? <Button asChild size="sm" className="shrink-0 gap-1.5"><Link href="/jobs/new"><Plus className="h-4 w-4" /> Post a job</Link></Button>
                                    : <p className="text-xs text-neutral-500">Ask someone who manages jobs to post one.</p>}
                            </div>
                        </Section>
                    )}
                </div>

                <div className="min-w-0 space-y-6">
                    <Pipelines items={data.pipelines} />
                    <Team members={data.team} />
                </div>
            </div>
        </div>
    )
}

/** Until every step is done: what's left to get the company hiring, in order. */
function Setup({ steps }: { steps: HomeData["setup"] }) {
    const done = steps.filter((s) => s.done).length
    if (done === steps.length) return null
    const nextKey = steps.find((s) => !s.done)?.key
    return (
        <Section title="Get set up" action={<span className="text-xs text-neutral-500 dark:text-neutral-400">{done} of {steps.length} done</span>}>
            <div className={cardClass}>
                <div className="h-1 overflow-hidden rounded-t-2xl bg-neutral-100 dark:bg-neutral-800" aria-hidden>
                    <div className="h-full bg-neutral-900 dark:bg-white" style={{ width: `${(done / steps.length) * 100}%` }} />
                </div>
                <ol className="grid divide-y divide-neutral-100 md:grid-cols-5 md:divide-x md:divide-y-0 dark:divide-neutral-800">
                    {steps.map((s, i) => (
                        <li key={s.key}>
                            <Link href={s.href} className={cn("flex h-full gap-3 p-4 hover:bg-neutral-50 md:flex-col dark:hover:bg-neutral-800/40", s.key === nextKey && "bg-neutral-50 dark:bg-neutral-800/40")}>
                                <span className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                    s.done ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 text-neutral-500 dark:border-neutral-700",
                                )}>
                                    {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                </span>
                                <span className="min-w-0">
                                    <span className={cn("block text-sm font-medium", s.done ? "text-neutral-500 line-through dark:text-neutral-400" : "text-neutral-900 dark:text-white")}>{s.title}</span>
                                    {!s.done && <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{s.detail}</span>}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            </div>
        </Section>
    )
}

function Jobs({ roles, picked, onPick, canSeeCandidates }: { roles: HomeRole[]; picked: string | null; onPick: (id: string) => void; canSeeCandidates: boolean }) {
    return (
        <Section title="Jobs" action={<Link href="/jobs" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">All jobs</Link>}>
            <div className={cn(cardClass, "overflow-x-auto")}>
                <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">Job</th>
                            <th className="px-4 py-2.5 font-medium">Pipeline</th>
                            {canSeeCandidates && <th className="px-4 py-2.5 text-right font-medium">To review</th>}
                            <th className="px-4 py-2.5 font-medium">Pass rate per round</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {roles.map((r) => (
                            <tr key={r.id} onClick={() => onPick(r.id)} aria-selected={r.id === picked}
                                className={cn("cursor-pointer", r.id === picked ? "bg-neutral-50 dark:bg-neutral-800/60" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40")}>
                                <td className="px-4 py-3">
                                    <button type="button" onClick={() => onPick(r.id)} className="text-left font-medium text-neutral-900 dark:text-white">{r.title}</button>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{STATUS[r.status] ?? r.status}</p>
                                </td>
                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{r.pipeline ? `${r.pipeline.name} · ${r.rounds.length} rounds` : <span className="text-neutral-500">No rounds yet</span>}</td>
                                {canSeeCandidates && (
                                    <td className="px-4 py-3 text-right">
                                        {r.waiting ? <Link href={`/results/${r.slug}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-white">{r.waiting}</Link> : <span className="text-neutral-500">0</span>}
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        {r.rounds.map((x) => (
                                            <span key={x.id} title={`${x.title}: ${x.passed} of ${x.scored} scored reached ${x.passMark}`} className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                                                {TYPE[x.type] ?? x.title} <span className="font-medium text-neutral-900 dark:text-white">{pct(x.passed, x.scored)}</span>
                                            </span>
                                        ))}
                                        {!r.rounds.length && <span className="text-xs text-neutral-500">-</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Section>
    )
}

function Pipelines({ items }: { items: HomeData["pipelines"] }) {
    const own = items.some((p) => !p.byShipItHQ)
    return (
        <Section title="Pipelines" action={<Link href="/pipelines" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">All pipelines</Link>}>
            <div className={cardClass}>
                {!own && <p className="border-b border-neutral-100 px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">You have none of your own yet. Start from one of ShipItHQ&apos;s:</p>}
                {items.length ? (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {items.map((p) => (
                            <li key={p.id}>
                                <Link href={p.byShipItHQ ? "/pipelines" : `/pipelines/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                                    <ListChecks className="h-4 w-4 shrink-0 text-neutral-500" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{p.name}</span>
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{p.rounds} {p.rounds === 1 ? "round" : "rounds"}{p.byShipItHQ ? " · ShipItHQ template" : ""}</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-4 py-6 text-sm text-neutral-600 dark:text-neutral-400">No pipelines yet.</p>
                )}
            </div>
        </Section>
    )
}

function Team({ members }: { members: HomeData["team"] }) {
    return (
        <Section title="Team" action={<Link href="/team" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Manage</Link>}>
            <div className={cardClass}>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {members.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                            <Avatar className="h-8 w-8">
                                {m.image && <AvatarImage src={m.image} alt="" />}
                                <AvatarFallback className="text-xs">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-neutral-900 dark:text-white">{m.name}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{m.pending ? "Invited" : m.role ?? "Member"}</span>
                            </span>
                        </li>
                    ))}
                </ul>
                {members.length <= 1 && (
                    <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                        <Button asChild size="sm" variant="outline" className="w-full gap-1.5"><Link href="/team"><Users className="h-4 w-4" /> Invite your team</Link></Button>
                    </div>
                )}
            </div>
        </Section>
    )
}

function Attention({ items }: { items: HomeData["attention"] }) {
    if (!items.length) return null
    return (
        <section aria-label="Needs attention" className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Needs attention</h2>
            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                {items.map((i) => (
                    <li key={i.key}>
                        <Link href={i.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                            <CircleAlert className="h-4 w-4 shrink-0 text-neutral-500" />
                            <span className="min-w-0 flex-1 text-neutral-800 dark:text-neutral-200">{i.text}</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}

/** Per round: how many students started it and how many reached its pass mark. Counts, never names. */
function Funnel({ role }: { role: HomeRole }) {
    const max = Math.max(1, ...role.rounds.map((r) => r.practising))
    return (
        <section aria-label={`Funnel for ${role.title}`} className="space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Funnel: {role.title}</h2>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                {!role.rounds.length ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">This job has no rounds yet, so there&apos;s nothing to count.</p>
                ) : (
                    <ol className="space-y-3">
                        {role.rounds.map((r) => (
                            <li key={r.id} className="grid grid-cols-1 gap-1 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                                <p className="text-sm text-neutral-800 dark:text-neutral-200"><span className="text-neutral-500">{r.number}.</span> {r.title}</p>
                                <div className="space-y-1">
                                    <Bar value={r.practising} max={max} label={`${r.practising} started`} tone="light" />
                                    <Bar value={r.passed} max={max} label={`${r.passed} passed (${pct(r.passed, r.scored)} of ${r.scored} scored)`} tone="dark" />
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Everyone taking this job&apos;s rounds, including students who haven&apos;t sent you results. Counts only; you never see who.</p>
            </div>
        </section>
    )
}

function Bar({ value, max, label, tone }: { value: number; max: number; label: string; tone: "light" | "dark" }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden>
                <div className={cn("h-full rounded-full", tone === "dark" ? "bg-neutral-900 dark:bg-white" : "bg-neutral-400 dark:bg-neutral-500")} style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="w-48 shrink-0 text-xs text-neutral-700 dark:text-neutral-300">{label}</span>
        </div>
    )
}
