"use client"

import Link from "next/link"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { CheckCircle2, Clock, Inbox, Send, Trophy, XCircle } from "lucide-react"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@repo/ui/components/ui/chart"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import type { AnalyticsData } from "@/lib/analytics"

/*
 * Analytics (plan/hiring-app HA-21): the range picker, the headline numbers,
 * results and decisions per week, students practising per week, then per role,
 * outcomes and the team. Monochrome lines; every week in the range is drawn,
 * zeros included, so a line is to scale.
 */

const TYPE: Record<string, string> = { APTITUDE: "Aptitude", DSA: "Coding", SYSTEM_DESIGN: "System design", VOICE_BEHAVIOURAL: "Behavioural", VOICE_CULTURE: "Culture" }
const OUTCOME: Record<string, string> = { INTERVIEWING: "Interviewing", OFFER: "Offer", HIRED: "Hired", NOT_SELECTED: "Not selected" }
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-")
const shortWeek = (w: string) => new Date(`${w}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

// Greys that hold contrast on both surfaces: the strongest line flips with the theme.
const resultsConfig = {
    received: { label: "Received", theme: { light: "#171717", dark: "#fafafa" } },
    invited: { label: "Invited", theme: { light: "#525252", dark: "#a3a3a3" } },
    declined: { label: "Declined", theme: { light: "#a3a3a3", dark: "#525252" } },
} satisfies ChartConfig
const practiceConfig = { practising: { label: "Students practising", theme: { light: "#262626", dark: "#e5e5e5" } } } satisfies ChartConfig

export function AnalyticsContent({ data }: { data: AnalyticsData }) {
    const t = data.totals
    const empty = data.series.every((w) => !w.received && !w.practising && !w.invited && !w.declined)
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader
                title="Analytics"
                subtitle={`Results, decisions and rounds over the last ${data.weeks} weeks.`}
                tabs={
                    <nav aria-label="Range" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                        {([4, 12, 26] as const).map((w) => (
                            <Link key={w} href={`/analytics?weeks=${w}`} aria-current={data.weeks === w ? "page" : undefined}
                                className={cn("rounded-md px-3 py-1 text-sm font-medium", data.weeks === w ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                                {w} weeks
                            </Link>
                        ))}
                    </nav>
                }
            />

            <StatBand
                cols={6}
                items={[
                    { icon: Inbox, label: "Results received", value: t.received.toLocaleString("en-IN") },
                    { icon: Clock, label: "Waiting", value: t.waiting.toLocaleString("en-IN"), hint: "no decision yet" },
                    { icon: Send, label: "Invited", value: t.invited.toLocaleString("en-IN"), hint: t.received ? `${pct(t.invited, t.received)} of results` : undefined },
                    { icon: XCircle, label: "Declined", value: t.declined.toLocaleString("en-IN") },
                    { icon: CheckCircle2, label: "Days to decide", value: t.medianDaysToDecide === null ? "-" : t.medianDaysToDecide < 1 ? "< 1" : t.medianDaysToDecide.toFixed(1), hint: "median" },
                    { icon: Trophy, label: "Hired", value: t.hired.toLocaleString("en-IN") },
                ]}
            />

            {empty && (
                <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                    Nothing in this range yet. The lines fill in as students take your rounds and send you their results.
                </p>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Results and decisions per week" subtitle="Results received, and the invites and declines made that week">
                    <ChartContainer config={resultsConfig} className="h-64 w-full">
                        <LineChart data={data.series} margin={{ left: 0, right: 12, top: 8 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="week" tickFormatter={shortWeek} tickLine={false} axisLine={false} minTickGap={24} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Week of ${shortWeek(String(v))}`} />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="invited" stroke="var(--color-invited)" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                            <Line type="monotone" dataKey="declined" stroke="var(--color-declined)" strokeWidth={2} dot={false} strokeDasharray="2 3" />
                        </LineChart>
                    </ChartContainer>
                </ChartCard>
                <ChartCard title="Students practising per week" subtitle="Everyone taking your rounds, whether or not they sent you results. Counts only.">
                    <ChartContainer config={practiceConfig} className="h-64 w-full">
                        <LineChart data={data.series} margin={{ left: 0, right: 12, top: 8 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="week" tickFormatter={shortWeek} tickLine={false} axisLine={false} minTickGap={24} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Week of ${shortWeek(String(v))}`} />} />
                            <Line type="monotone" dataKey="practising" stroke="var(--color-practising)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </ChartCard>
            </div>

            <section aria-label="By role" className="space-y-2">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">By role</h2>
                <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                            <tr>
                                <th className="px-4 py-2.5 font-medium">Role</th>
                                <th className="px-4 py-2.5 text-right font-medium">Results</th>
                                <th className="px-4 py-2.5 text-right font-medium">Invite rate</th>
                                <th className="px-4 py-2.5 font-medium">Rounds: started, passed (pass rate, all time)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {data.roles.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-neutral-500">No published roles yet.</td></tr>}
                            {data.roles.map((r) => (
                                <tr key={r.id}>
                                    <td className="px-4 py-3">
                                        <Link href={`/applications/${r.slug}`} className="font-medium text-neutral-900 hover:underline dark:text-white">{r.title}</Link>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-neutral-900 dark:text-white">{r.received}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-neutral-900 dark:text-white">{pct(r.invited, r.invited + r.declined)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {r.rounds.map((x) => (
                                                <span key={x.number} title={`${x.title}: ${x.practising} started, ${x.scored} scored, ${x.passed} reached ${x.passMark}`} className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                                                    {TYPE[x.type] ?? x.title} <span className="tabular-nums">{x.practising}, {x.passed}</span> <span className="font-medium text-neutral-900 dark:text-white">({pct(x.passed, x.scored)})</span>
                                                </span>
                                            ))}
                                            {!r.rounds.length && <span className="text-xs text-neutral-500">No rounds</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section aria-label="Outcomes after an invite" className="space-y-2">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Outcomes after an invite</h2>
                    <table className="w-full rounded-2xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <thead className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            <tr><th className="px-4 py-2.5 font-medium">Outcome</th><th className="px-4 py-2.5 text-right font-medium">Your team says</th><th className="px-4 py-2.5 text-right font-medium">Candidates say</th></tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {data.outcomes.map((o) => (
                                <tr key={o.outcome}><td className="px-4 py-2.5 text-neutral-800 dark:text-neutral-200">{OUTCOME[o.outcome]}</td><td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-white">{o.company}</td><td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-white">{o.candidate}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <section aria-label="Decisions by teammate" className="space-y-2">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Decisions by teammate</h2>
                    {data.members.length === 0 ? (
                        <p className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">No decisions in this range.</p>
                    ) : (
                        <table className="w-full rounded-2xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                <tr><th className="px-4 py-2.5 font-medium">Teammate</th><th className="px-4 py-2.5 text-right font-medium">Invited</th><th className="px-4 py-2.5 text-right font-medium">Declined</th></tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {data.members.map((m, i) => (
                                    <tr key={i}><td className="px-4 py-2.5 text-neutral-800 dark:text-neutral-200">{m.name}</td><td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-white">{m.invited}</td><td className="px-4 py-2.5 text-right tabular-nums text-neutral-900 dark:text-white">{m.declined}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </div>
    )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section aria-label={title} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            {children}
        </section>
    )
}
