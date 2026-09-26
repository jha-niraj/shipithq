"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, CircleAlert, Clock, Eye, MessageSquare, Play, Send } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { cn } from "@repo/ui/lib/utils"
import { OUTCOMES, OutcomeSelect, WithdrawButton } from "@/components/hiring/send-controls"
import type { MyRounds, MyRun, MySend, NextStep } from "@/lib/hiring/my-rounds"
import type { MyReport } from "@/actions/(main)/companies/reports.action"
import { ReportInterviewButton } from "@/components/interview-reports/report-sheet"
import { REPORT_OUTCOME_LABEL, type ReportOutcome } from "@/lib/interview-reports/types"

/*
 * My rounds (plan/hiring-rounds HR-22): stacked sections, an empty one hidden.
 * In progress, Sent, Invited, Declined and withdrawn, then Practice.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })

/** "5h 12m", "3m", or null once it has passed. */
function left(iso: string, now: number): string | null {
    const ms = new Date(iso).getTime() - now
    if (ms <= 0) return null
    const m = Math.ceil(ms / 60_000)
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60
    return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`
}

/** A clock that ticks once a minute, for cool-down countdowns. */
function useMinuteClock() {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(t)
    }, [])
    return now
}

export function MyRoundsView({ data, reports }: { data: MyRounds; reports: MyReport[] }) {
    const now = useMinuteClock()
    const total = data.inProgress.length + data.sent.length + data.invited.length + data.closed.length + data.practice.length
    return (
        <div className="page-frame space-y-8 px-page py-6">
            <PageHeader
                title="My rounds"
                subtitle="Rounds you're taking, results you've sent, and what companies said."
                actions={<ReportInterviewButton label="Report a real interview" />}
            />

            {total === 0 && (
                <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                    <p className="font-medium text-neutral-900 dark:text-white">No rounds yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">Open a role and take its rounds. When you clear them, you choose whether to send your results to the company.</p>
                    <Button asChild size="sm" className="mt-4"><Link href="/jobs/browse">Browse roles</Link></Button>
                </div>
            )}

            <Section title="In progress" items={data.inProgress} render={(r) => <RunRow key={r.runId} run={r} now={now} />} />
            <Section title="Sent" items={data.sent} render={(s) => <SentRow key={s.sendId} send={s} />} />
            <Section title="Invited" items={data.invited} render={(s) => <InvitedRow key={s.sendId} send={s} />} />
            <Section title="Declined and withdrawn" items={data.closed} render={(s) => <ClosedRow key={s.sendId} send={s} />} />
            <Section title="Practice" note="ShipItHQ's rounds from company pages and jobs you imported. Practice results stay with you." items={data.practice} render={(r) => <RunRow key={r.runId} run={r} now={now} />} />
            <Section title="Your interview reports" note="Only totals from reports are ever shown to others, never your report." items={reports} render={(r) => <ReportRow key={r.id} report={r} />} />
        </div>
    )
}

function Section<T>({ title, note, items, render }: { title: string; note?: string; items: T[]; render: (item: T) => React.ReactNode }) {
    if (!items.length) return null
    return (
        <section className="space-y-3" aria-label={title}>
            <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title} <span className="font-normal text-neutral-500 dark:text-neutral-400">({items.length})</span></h2>
                {note && <p className="text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
            </div>
            <ul className="space-y-2.5">{items.map(render)}</ul>
        </section>
    )
}

function Row({ title, sub, pill, children, footer }: { title: React.ReactNode; sub: React.ReactNode; pill?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <li className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{sub}</p>
                    {pill && <div className="mt-2">{pill}</div>}
                </div>
                {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
            </div>
            {footer}
        </li>
    )
}

function Pill({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
            strong ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300")}>
            {children}
        </span>
    )
}

function stepLine(next: NextStep, now: number): string {
    switch (next.kind) {
        case "start": return `Round ${next.round.number}, ${next.round.title}: ready to start`
        case "continue": return `Round ${next.round.number}, ${next.round.title}: in progress`
        case "coming_soon": return `Round ${next.round.number}, ${next.round.title}: opens soon`
        case "cooling": {
            const t = left(next.availableAt, now)
            return t ? `Round ${next.round.number}, ${next.round.title}: try again in ${t}` : `Round ${next.round.number}, ${next.round.title}: ready to try again`
        }
        case "send": return "Every round cleared: ready to send"
        case "done": return next.message
    }
}

function RunRow({ run, now }: { run: MyRun; now: number }) {
    const next = run.next
    const cta = next.kind === "send"
        ? <Button asChild size="sm" className="gap-1.5"><Link href={`${run.href}/send`}><Send className="h-4 w-4" /> Send results</Link></Button>
        : next.kind === "continue"
            ? <Button asChild size="sm" className="gap-1.5"><Link href={run.href}><Play className="h-4 w-4" /> Continue</Link></Button>
            : next.kind === "start" || (next.kind === "cooling" && !left(next.availableAt, now))
                ? <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href={run.href}><Play className="h-4 w-4" /> Start round {next.round.number}</Link></Button>
                : <Button asChild size="sm" variant="ghost" className="gap-1.5"><Link href={run.href}>Open <ArrowRight className="h-4 w-4" /></Link></Button>
    return (
        <Row
            title={<>{run.title} <span className="font-normal text-neutral-500 dark:text-neutral-400">· {run.companyName}</span></>}
            sub={<>{run.roundsCleared} of {run.roundsTotal} cleared · {stepLine(next, now)}</>}
            pill={run.practiceOnly && run.kind === "job" ? <Pill>{run.practiceOnly}</Pill> : next.kind === "cooling" && left(next.availableAt, now) ? <Pill><Clock className="h-3 w-3" /> Cool-down</Pill> : null}
        >
            {cta}
        </Row>
    )
}

function jobTitle(s: MySend) {
    return <Link href={`/jobs/${s.jobSlug}/rounds`} className="hover:underline">{s.jobTitle} <span className="font-normal text-neutral-500 dark:text-neutral-400">· {s.companyName}</span></Link>
}

function SentRow({ send }: { send: MySend }) {
    return (
        <Row
            title={jobTitle(send)}
            sub={`Sent ${day(send.sentAt)}`}
            pill={send.status === "VIEWED" ? <Pill><Eye className="h-3 w-3" /> Viewed by the team</Pill> : <Pill>Not viewed yet</Pill>}
        >
            <WithdrawButton sendId={send.sendId} />
        </Row>
    )
}

function InvitedRow({ send }: { send: MySend }) {
    return (
        <Row
            title={jobTitle(send)}
            sub={`Invited ${send.decidedAt ? day(send.decidedAt) : ""}${send.contact ? ` · your contact: ${send.contact.name}, ${send.contact.email}` : ""}`}
            pill={<Pill strong><Check className="h-3 w-3" /> Invited</Pill>}
            footer={
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
                    <OutcomeSelect sendId={send.sendId} initial={send.studentOutcome} companyName={send.companyName} />
                    <span className="text-neutral-500 dark:text-neutral-400">{send.companyName} says: {send.companyOutcome ? OUTCOMES[send.companyOutcome] : "nothing yet"}</span>
                </div>
            }
        >
            <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={send.inboxId ? `/inbox?open=${send.inboxId}` : "/inbox"}><MessageSquare className="h-4 w-4" /> Open the conversation</Link>
            </Button>
        </Row>
    )
}

function ClosedRow({ send }: { send: MySend }) {
    const declined = send.status === "DECLINED"
    return (
        <Row
            title={jobTitle(send)}
            sub={declined
                ? `Sent ${day(send.sentAt)} · declined ${send.decidedAt ? day(send.decidedAt) : ""}`
                : `Sent ${day(send.sentAt)} · you withdrew it ${send.withdrawnAt ? day(send.withdrawnAt) : ""}`}
            pill={<Pill>{declined ? "Declined" : "Withdrawn"}</Pill>}
            footer={declined && send.feedback
                ? <p className="mt-3 whitespace-pre-line rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{send.feedback}</p>
                : null}
        >
            <Button asChild size="sm" variant="ghost" className="gap-1.5"><Link href={`/jobs/${send.jobSlug}/rounds`}>{declined ? "Retake to send again" : "Open the rounds"} <ArrowRight className="h-4 w-4" /></Link></Button>
        </Row>
    )
}

const REPORT_STATUS: Record<MyReport["status"], string> = { PENDING: "In review", APPROVED: "Approved", REJECTED: "Not published" }
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })

/** One of the student's own interview reports (CMP-1) and where it stands. */
function ReportRow({ report: r }: { report: MyReport }) {
    return (
        <Row
            title={<>{r.role} <span className="font-normal text-neutral-500 dark:text-neutral-400">· {r.companyName}</span></>}
            sub={`${monthLabel(r.month)} · ${r.rounds} ${r.rounds === 1 ? "round" : "rounds"} · ${REPORT_OUTCOME_LABEL[r.outcome as ReportOutcome] ?? r.outcome}`}
            pill={<Pill strong={r.status === "APPROVED"}>{REPORT_STATUS[r.status]}{r.status === "APPROVED" && r.creditsRewarded > 0 ? ` · +${r.creditsRewarded} credits` : ""}</Pill>}
            footer={r.status === "REJECTED" && r.rejectReason ? <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {r.rejectReason}</p> : undefined}
        />
    )
}
