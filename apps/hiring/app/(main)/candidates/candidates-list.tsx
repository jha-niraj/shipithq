"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { cn } from "@repo/ui/lib/utils"
import type { CandidateRow } from "@/lib/sends"

/*
 * Everyone who sent this company results (plan/hiring-app HA-16): one row per
 * person, with every role they sent to. Each role opens that role's review
 * workspace on them.
 */

const STATUS: Record<string, string> = { SENT: "New", VIEWED: "Viewed", INVITED: "Invited", DECLINED: "Declined" }
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })

export function CandidatesList({ candidates }: { candidates: CandidateRow[] }) {
    const [q, setQ] = useState("")
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase()
        return s ? candidates.filter((c) => `${c.name} ${c.headline} ${c.roles.map((r) => r.jobTitle).join(" ")}`.toLowerCase().includes(s)) : candidates
    }, [candidates, q])
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader title="Candidates" subtitle="Everyone who cleared a role's rounds and sent you their results." />
            <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, headline or role" className="pl-9" aria-label="Search candidates" />
            </div>
            {candidates.length === 0 ? (
                <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    No one has sent results yet. Students send them after clearing a role&apos;s rounds.
                </p>
            ) : shown.length === 0 ? (
                <p className="text-sm text-neutral-500">No one matches &ldquo;{q}&rdquo;.</p>
            ) : (
                <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                    {shown.map((c) => (
                        <li key={c.userId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                            <div className="min-w-0 sm:w-64">
                                <p className="truncate font-medium text-neutral-900 dark:text-white">{c.name}</p>
                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{c.headline}</p>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                                {c.roles.map((r) => (
                                    <Link
                                        key={r.sendId}
                                        href={`/applications/${r.jobSlug}?send=${r.sendId}`}
                                        className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:border-neutral-500", r.status === "SENT" ? "border-neutral-900 font-medium text-neutral-900 dark:border-white dark:text-white" : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300")}
                                    >
                                        <span className="max-w-[12rem] truncate">{r.jobTitle}</span>
                                        <span className="tabular-nums">{r.average ?? "-"}</span>
                                        <span className="text-neutral-500">{STATUS[r.status] ?? r.status}</span>
                                    </Link>
                                ))}
                            </div>
                            <p className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{day(c.latestAt)}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
