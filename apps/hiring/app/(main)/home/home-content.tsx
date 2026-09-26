"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CircleAlert, Plus } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { cn } from "@repo/ui/lib/utils"
import type { HomeData, HomeRole } from "@/lib/home"

/*
 * Home (plan/hiring-app HA-15): the roles table, the funnel for the role picked
 * in it, and what needs attention. No headline numbers or trend chart: each
 * part answers "what should I do next".
 */

const TYPE: Record<string, string> = { APTITUDE: "Aptitude", DSA: "Coding", SYSTEM_DESIGN: "System design", VOICE_BEHAVIOURAL: "Behavioural", VOICE_CULTURE: "Culture" }
const STATUS: Record<string, string> = { ACTIVE: "Live", DRAFT: "Draft", PAUSED: "Paused", FILLED: "Filled", HIDDEN: "Hidden by ShipItHQ" }
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-")

export default function HomeContent({ data, canCreateJob, canSeeCandidates }: { data: HomeData; canCreateJob: boolean; canSeeCandidates: boolean }) {
    const [picked, setPicked] = useState<string | null>(data.roles.find((r) => r.rounds.length)?.id ?? data.roles[0]?.id ?? null)
    const role = data.roles.find((r) => r.id === picked) ?? null

    if (!data.roles.length) {
        return (
            <div className="page-frame space-y-6 px-page py-6">
                <PageHeader title="Home" />
                <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                    <p className="font-medium text-neutral-900 dark:text-white">Create your first role</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">A role comes with its rounds. Candidates take them on ShipItHQ, and the ones who clear them send you their results.</p>
                    {canCreateJob
                        ? <Button asChild size="sm" className="mt-4 gap-1.5"><Link href="/jobs/new"><Plus className="h-4 w-4" /> Create a role</Link></Button>
                        : <p className="mt-3 text-xs text-neutral-500">Ask someone who manages jobs to create one.</p>}
                </div>
                <Attention items={data.attention} />
            </div>
        )
    }

    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader title="Home" actions={canCreateJob ? <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href="/jobs/new"><Plus className="h-4 w-4" /> New role</Link></Button> : null} />

            <Attention items={data.attention} />

            <section aria-label="Roles" className="space-y-2">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Roles</h2>
                <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                            <tr>
                                <th className="px-4 py-2.5 font-medium">Role</th>
                                <th className="px-4 py-2.5 font-medium">Pipeline</th>
                                {canSeeCandidates && <th className="px-4 py-2.5 text-right font-medium">To review</th>}
                                <th className="px-4 py-2.5 font-medium">Pass rate per round</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {data.roles.map((r) => (
                                <tr key={r.id} onClick={() => setPicked(r.id)} aria-selected={r.id === picked}
                                    className={cn("cursor-pointer", r.id === picked ? "bg-neutral-50 dark:bg-neutral-800/60" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40")}>
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => setPicked(r.id)} className="text-left font-medium text-neutral-900 dark:text-white">{r.title}</button>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{STATUS[r.status] ?? r.status}</p>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{r.pipeline ? `${r.pipeline.name} · ${r.rounds.length} rounds` : <span className="text-neutral-500">No rounds yet</span>}</td>
                                    {canSeeCandidates && (
                                        <td className="px-4 py-3 text-right">
                                            {r.waiting ? <Link href={`/applications/${r.slug}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-neutral-900 underline-offset-2 hover:underline dark:text-white">{r.waiting}</Link> : <span className="text-neutral-500">0</span>}
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
            </section>

            {role && <Funnel role={role} />}
        </div>
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
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">This role has no rounds yet, so there&apos;s nothing to count.</p>
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
                <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Everyone taking this role&apos;s rounds, including students who haven&apos;t sent you results. Counts only; you never see who.</p>
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
