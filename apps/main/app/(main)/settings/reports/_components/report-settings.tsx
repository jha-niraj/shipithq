"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarClock, FileBarChart } from "lucide-react"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { nextSendDay, periodLabel, type ReportFrequency } from "@repo/db/progress-calendar"
import { setReportFrequency } from "@/actions/(main)/progress/reports.action"

type Frequency = ReportFrequency | "OFF"

type Row = { id: string; frequency: string; periodStart: string; periodEnd: string; xp: number; activities: number; createdAt: string; viewed: boolean }

const OPTIONS: { value: Frequency; label: string; detail: string }[] = [
    { value: "WEEKLY", label: "Weekly", detail: "Every Monday, for Monday to Sunday" },
    { value: "HALF_MONTHLY", label: "Every two weeks", detail: "On the 1st and the 16th" },
    { value: "MONTHLY", label: "Monthly", detail: "On the 1st, for the month before" },
    { value: "OFF", label: "Off", detail: "No reports and no emails" },
]

const LABEL: Record<string, string> = { WEEKLY: "Weekly", HALF_MONTHLY: "Every two weeks", MONTHLY: "Monthly" }

function nextFor(f: Frequency): string | null {
    if (f === "OFF") return null
    const t = new Date(); t.setUTCDate(t.getUTCDate() + 1)
    return nextSendDay(f, t).toISOString()
}

/**
 * How often the progress report comes, and every report so far (PRG-9). A period with
 * nothing done sends nothing, so the list can skip a week.
 */
export function ReportSettings({ initialFrequency, initialNext, reports }: { initialFrequency: Frequency; initialNext: string | null; reports: Row[] }) {
    const [frequency, setFrequency] = useState(initialFrequency)
    const [next, setNext] = useState(initialNext)
    const [saving, setSaving] = useState<Frequency | null>(null)

    const choose = async (f: Frequency) => {
        if (f === frequency || saving) return
        setSaving(f)
        const r = await setReportFrequency(f)
        setSaving(null)
        if (!r.success) { toast.error(r.error); return }
        setFrequency(f)
        setNext(nextFor(f))
        toast.success(f === "OFF" ? "Reports are off." : `Reports: ${LABEL[f]!.toLowerCase()}.`)
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950" aria-label="Report frequency">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Progress reports</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    A summary of everything you did: XP, the days you were active, each module&apos;s work and your top wins, with a link to the full report. Only sent for a period where you did something.
                </p>
                <div role="radiogroup" aria-label="How often" className="mt-5 grid gap-2 sm:grid-cols-2">
                    {OPTIONS.map((o) => {
                        const on = frequency === o.value
                        return (
                            <button
                                key={o.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => void choose(o.value)}
                                className={cn(
                                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                                    on ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600",
                                )}
                            >
                                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", on ? "border-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700")}>
                                    {on && <span className="size-2 rounded-full bg-neutral-900 dark:bg-white" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                                        {o.label} {saving === o.value && <InlineLoader size="sm" />}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-neutral-600 dark:text-neutral-400">{o.detail}</span>
                                </span>
                            </button>
                        )
                    })}
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <CalendarClock className="size-3.5" />
                    {next
                        ? `Next one: ${new Date(next).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}, by email, if you do something before then.`
                        : "Reports are off. Past reports stay below."}
                </p>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950" aria-label="Past reports">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Past reports</h2>
                {reports.length === 0 ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                        <FileBarChart className="size-4 shrink-0" />
                        Your first report arrives after a period in which you do something. It will be listed here too.
                    </div>
                ) : (
                    <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
                        {reports.map((r) => (
                            <li key={r.id}>
                                <Link href={`/reports/${r.id}`} className="group flex items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                                            {periodLabel({ from: r.periodStart, to: r.periodEnd })}
                                            {!r.viewed && <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-900">New</span>}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {LABEL[r.frequency] ?? r.frequency} · {r.xp.toLocaleString("en")} XP · {r.activities} {r.activities === 1 ? "thing" : "things"} done
                                        </p>
                                    </div>
                                    <ArrowRight className="size-3.5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
