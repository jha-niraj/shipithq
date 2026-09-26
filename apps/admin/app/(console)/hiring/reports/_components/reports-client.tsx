"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpRight, Ban, Check, EyeOff, Eye, ListChecks, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@/lib/utils"
import { resolveReport, setCompanySuspended, setJobHidden, type ReportRow } from "@/actions/hiring/reports.action"

/*
 * The report queue (plan/hiring-rounds HR-24). Each card shows what was
 * reported, why, and by whom (admins see the reporter; the reported party never
 * does), with the actions that fit: hide the job, suspend the company, review
 * the student's attempts, then close the report as actioned or dismissed.
 */

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? ""
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

export function ReportsClient({ tab, rows, open, error }: { tab: "OPEN" | "CLOSED"; rows: ReportRow[]; open: number; error: string | null }) {
    return (
        <div className="w-full p-6 lg:p-8">
            <div className="mb-6">
                <Link href="/hiring" className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ArrowLeft className="h-4 w-4" /> Back to Hiring Platform
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Reports</h1>
                <p className="text-neutral-500 dark:text-neutral-400">Reports on companies, jobs, messages and students. The reported party never learns who reported.</p>
            </div>

            <nav aria-label="Report status" className="mb-6 inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                {([["OPEN", `Open (${open})`, "/hiring/reports"], ["CLOSED", "Closed", "/hiring/reports?tab=closed"]] as const).map(([v, label, href]) => (
                    <Link key={v} href={href} aria-current={tab === v ? "page" : undefined}
                        className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === v ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                        {label}
                    </Link>
                ))}
            </nav>

            {error && <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">{error}</p>}
            {rows.length === 0 ? (
                <p className="rounded-xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {tab === "OPEN" ? "No open reports." : "No closed reports yet."}
                </p>
            ) : (
                <div className="space-y-4">{rows.map((r) => <ReportCard key={r.id} report={r} />)}</div>
            )}
        </div>
    )
}

function ReportCard({ report: r }: { report: ReportRow }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [note, setNote] = useState("")
    const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, done: string) => {
        setBusy(key)
        const res = await fn()
        setBusy(null)
        if (!res.success) { toast.error(res.error ?? "Try again"); return }
        toast.success(done)
        router.refresh()
    }
    const isOpen = r.status === "OPEN"
    const t = r.target
    return (
        <article className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">{r.kindLabel}</span>
                <p className="font-semibold text-neutral-900 dark:text-white">{r.reasonLabel}</p>
                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">{when(r.createdAt)}</span>
            </div>

            {r.excerpt && (
                <blockquote className="mt-3 whitespace-pre-line rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{r.excerpt}</blockquote>
            )}
            {r.details && <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300"><span className="text-neutral-500 dark:text-neutral-400">Reporter&apos;s note:</span> {r.details}</p>}

            <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
                <dt className="text-neutral-500 dark:text-neutral-400">Reported by</dt>
                <dd className="min-w-0 text-neutral-900 dark:text-white">
                    {r.reporter.side === "company" ? `${r.reporter.name ?? "A member"} at ${r.reporter.companyName ?? "a company"}` : (r.reporter.name ?? "A student")}
                    {r.reporter.email && <span className="ml-1 font-mono text-xs text-neutral-500">{r.reporter.email}</span>}
                </dd>
                {t.company && (
                    <>
                        <dt className="text-neutral-500 dark:text-neutral-400">Company</dt>
                        <dd className="min-w-0 text-neutral-900 dark:text-white">
                            {t.company.name} {t.company.suspended && <span className="ml-1 text-xs font-medium">(suspended)</span>}
                            {MAIN_URL && <a href={`${MAIN_URL}/companies/${t.company.slug}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-xs text-neutral-500 hover:underline">page <ArrowUpRight className="h-3 w-3" /></a>}
                        </dd>
                    </>
                )}
                {t.job && (
                    <>
                        <dt className="text-neutral-500 dark:text-neutral-400">Job</dt>
                        <dd className="min-w-0 text-neutral-900 dark:text-white">
                            {t.job.title} {t.job.hidden && <span className="ml-1 text-xs font-medium">(hidden)</span>}
                            {MAIN_URL && !t.job.hidden && <a href={`${MAIN_URL}/jobs/${t.job.slug}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-xs text-neutral-500 hover:underline">page <ArrowUpRight className="h-3 w-3" /></a>}
                        </dd>
                    </>
                )}
                {t.student && (
                    <>
                        <dt className="text-neutral-500 dark:text-neutral-400">Student</dt>
                        <dd className="min-w-0 text-neutral-900 dark:text-white">{t.student.name ?? "Student"} <span className="font-mono text-xs text-neutral-500">{t.student.email}</span></dd>
                    </>
                )}
                {!isOpen && (
                    <>
                        <dt className="text-neutral-500 dark:text-neutral-400">Closed</dt>
                        <dd className="min-w-0 text-neutral-900 dark:text-white">{r.status === "ACTIONED" ? "Action taken" : "Dismissed"}{r.resolvedAt ? `, ${when(r.resolvedAt)}` : ""}{r.resolutionNote ? `. ${r.resolutionNote}` : ""}</dd>
                    </>
                )}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                {t.job && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy !== null}
                        onClick={() => void run("job", () => setJobHidden(t.job!.id, !t.job!.hidden, note), t.job!.hidden ? "Job shown again" : "Job hidden from students")}>
                        {busy === "job" ? <InlineLoader size="sm" /> : t.job.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {t.job.hidden ? "Show the job" : "Hide the job"}
                    </Button>
                )}
                {t.company && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy !== null}
                        onClick={() => void run("company", () => setCompanySuspended(t.company!.id, !t.company!.suspended, note), t.company!.suspended ? "Suspension lifted" : "Company suspended")}>
                        {busy === "company" ? <InlineLoader size="sm" /> : <Ban className="h-4 w-4" />} {t.company.suspended ? "Lift suspension" : "Suspend the company"}
                    </Button>
                )}
                {t.student && (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link href={`/hiring/students/${t.student.id}`}><ListChecks className="h-4 w-4" /> Review attempts</Link>
                    </Button>
                )}
                {isOpen && (
                    <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} placeholder="Note (kept here, not sent)" className="h-8 w-full text-sm sm:w-64" aria-label="Note" />
                        <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy !== null}
                            onClick={() => void run("dismiss", () => resolveReport(r.id, "DISMISSED", note), "Dismissed. The reporter was told.")}>
                            {busy === "dismiss" ? <InlineLoader size="sm" /> : <X className="h-4 w-4" />} Dismiss
                        </Button>
                        <Button size="sm" className="gap-1.5" disabled={busy !== null}
                            onClick={() => void run("action", () => resolveReport(r.id, "ACTIONED", note), "Closed as actioned. The reporter was told.")}>
                            {busy === "action" ? <InlineLoader size="sm" /> : <Check className="h-4 w-4" />} Close: action taken
                        </Button>
                    </div>
                )}
            </div>
        </article>
    )
}
