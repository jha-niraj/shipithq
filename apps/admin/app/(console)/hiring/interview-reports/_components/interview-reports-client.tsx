"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Combine, Link2, Pencil, Trash2, Undo2, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@/lib/utils"
import {
    approveInterviewReport, editReportQuestion, rejectInterviewReport, removeReportQuestion, setReportGroup, setSameAs, suggestSameAs,
    type InterviewReportRow, type ReportTab, type SameAsSuggestion,
} from "@/actions/hiring/interview-reports.action"

/*
 * Interview reports (plan/competition/skillmeet CMP-1d). The admin sees who
 * filed each one (the public never does), strips personal data or a leaked
 * confidential test from a question, and approves (the author is paid 10
 * credits, 5 a month) or rejects with a reason the author reads.
 */

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? ""
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })
const ROUND: Record<string, string> = {
    ONLINE_ASSESSMENT: "Online assessment", APTITUDE: "Aptitude", DSA: "Coding (DSA)", LLD: "Low-level design", SYSTEM_DESIGN: "System design",
    TAKE_HOME: "Take-home", TECHNICAL: "Technical", BEHAVIOURAL: "Behavioural", HIRING_MANAGER: "Hiring manager", HR: "HR", OTHER: "Other",
}
const FAMILY: Record<string, string> = {
    SOFTWARE: "Software engineer", FRONTEND: "Frontend", BACKEND: "Backend", FULL_STACK: "Full stack", MOBILE: "Mobile", DATA_ML: "Data / ML",
    DEVOPS_SRE: "DevOps / SRE", QA: "QA", PRODUCT: "Product", DESIGN: "Design", OTHER: "Other",
}
const LEVEL: Record<string, string> = { INTERN: "Intern", ENTRY: "Entry", MID: "Mid", SENIOR: "Senior" }
const OUTCOME: Record<string, string> = { OFFER: "offer", REJECTED: "not selected", NO_RESPONSE: "never heard back", WITHDREW: "withdrew", IN_PROCESS: "still in process" }

export function InterviewReportsClient({ tab, rows, pending, error }: { tab: ReportTab; rows: InterviewReportRow[]; pending: number; error: string | null }) {
    const tabs = [["PENDING", `In review (${pending})`, "/hiring/interview-reports"], ["APPROVED", "Approved", "/hiring/interview-reports?tab=approved"], ["REJECTED", "Rejected", "/hiring/interview-reports?tab=rejected"]] as const
    return (
        <div className="w-full p-6 lg:p-8">
            <div className="mb-6">
                <Link href="/hiring" className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ArrowLeft className="h-4 w-4" /> Back to Hiring Platform
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Interview reports</h1>
                <p className="text-neutral-500 dark:text-neutral-400">What students say a company&apos;s real interview was. Approved reports only ever show as totals; the public never sees a report or its author.</p>
            </div>
            <nav aria-label="Report status" className="mb-6 inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                {tabs.map(([v, label, href]) => (
                    <Link key={v} href={href} aria-current={tab === v ? "page" : undefined}
                        className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === v ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                        {label}
                    </Link>
                ))}
            </nav>
            {error && <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">{error}</p>}
            {rows.length === 0 ? (
                <p className="rounded-xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {tab === "PENDING" ? "Nothing to review." : tab === "APPROVED" ? "No approved reports yet." : "No rejected reports."}
                </p>
            ) : (
                <div className="space-y-4">{rows.map((r) => <ReportCard key={r.id} report={r} />)}</div>
            )}
        </div>
    )
}

function ReportCard({ report: r }: { report: InterviewReportRow }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [reason, setReason] = useState("")
    const pending = r.status === "PENDING"
    const act = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, done: string) => {
        setBusy(key)
        const res = await fn()
        setBusy(null)
        if (!res.success) { toast.error(res.error ?? "Something went wrong"); return }
        toast.success(done)
        router.refresh()
    }
    const willPay = r.reporter && r.paidRecently < 5
    return (
        <article className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <header className="space-y-1">
                <p className="font-medium text-neutral-900 dark:text-white">
                    {r.role} at {r.company.slug ? <a href={`${MAIN_URL}/companies/${r.company.slug}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{r.company.name}</a> : r.company.name}
                    {r.company.pending && <span className="text-neutral-500"> (under review)</span>}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {monthLabel(r.month)} · {OUTCOME[r.outcome] ?? r.outcome} · filed {when(r.createdAt)} by {r.reporter ? <Link href={`/hiring/students/${r.reporter.id}`} className="underline underline-offset-2">{r.reporter.name ?? r.reporter.email}</Link> : "a deleted account"}
                    {r.reporter && ` · paid for ${r.paidRecently} of 5 in 30 days`}
                </p>
                <GroupPicker id={r.id} family={r.roleFamily} level={r.level} />
                {r.status === "REJECTED" && r.rejectReason && <p className="text-sm text-neutral-700 dark:text-neutral-300">Rejected: {r.rejectReason}</p>}
                {r.status === "APPROVED" && <p className="text-sm text-neutral-700 dark:text-neutral-300">Approved{r.reviewedAt ? ` ${when(r.reviewedAt)}` : ""} · {r.creditsRewarded} credits paid</p>}
            </header>

            <ol className="space-y-2">
                {r.rounds.map((round) => (
                    <li key={round.position} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {round.position}. {ROUND[round.type] ?? round.type}{round.title ? `: ${round.title}` : ""}{round.minutes ? ` · ${round.minutes} min` : ""}
                        </p>
                        {round.questions.length === 0
                            ? <p className="text-sm text-neutral-500">No questions given.</p>
                            : <ul className="mt-1.5 space-y-1.5">{round.questions.map((q) => <QuestionLine key={q.id} q={q} editable={pending} mergeable={!r.company.pending} />)}</ul>}
                    </li>
                ))}
            </ol>

            {pending && (
                <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center dark:border-neutral-800">
                    <Button size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void act("approve", () => approveInterviewReport(r.id), willPay ? "Approved; 10 credits paid" : "Approved")}>
                        {busy === "approve" ? <InlineLoader size="sm" /> : <Check className="h-3.5 w-3.5" />} Approve{willPay ? " · pay 10" : ""}
                    </Button>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Why not, in a sentence the student reads" className="h-8 sm:max-w-md" />
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy !== null || reason.trim().length < 5} onClick={() => void act("reject", () => rejectInterviewReport(r.id, reason), "Rejected; the student was told why")}>
                        {busy === "reject" ? <InlineLoader size="sm" /> : <X className="h-3.5 w-3.5" />} Reject
                    </Button>
                </div>
            )}
        </article>
    )
}

/** The role group the report counts in (CMP-2): saved as soon as it's changed. */
function GroupPicker({ id, family, level }: { id: string; family: string; level: string }) {
    const router = useRouter()
    const save = async (f: string, l: string) => {
        const r = await setReportGroup(id, f, l)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Group saved")
        router.refresh()
    }
    return (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Counts in
            <Select value={family} onValueChange={(v) => void save(v, level)}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FAMILY).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={level} onValueChange={(v) => void save(family, v)}>
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(LEVEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    )
}

function QuestionLine({ q, editable, mergeable }: { q: { id: string; text: string; link: string | null; sameAs: string | null }; editable: boolean; mergeable: boolean }) {
    const router = useRouter()
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState(q.text)
    const [busy, setBusy] = useState(false)
    const [suggestions, setSuggestions] = useState<SameAsSuggestion[] | null>(null)
    const findSimilar = async () => {
        setBusy(true)
        const r = await suggestSameAs(q.id)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setSuggestions(r.data)
    }
    const save = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
        setBusy(true)
        const r = await fn()
        setBusy(false)
        if (!r.success) { toast.error(r.error ?? "Something went wrong"); return }
        setEditing(false)
        router.refresh()
    }
    return (
        <li className="text-sm text-neutral-800 dark:text-neutral-200">
            {editing ? (
                <div className="flex items-center gap-2">
                    <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} className="h-8" />
                    <Button size="sm" disabled={busy} onClick={() => void save(() => editReportQuestion(q.id, text))}>{busy ? <InlineLoader size="sm" /> : "Save"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setText(q.text) }}>Cancel</Button>
                </div>
            ) : (
                <div className="flex items-start gap-2">
                    <span className="flex-1">
                        {q.text}
                        {q.link && <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-500"><Link2 className="h-3 w-3" />{q.link}</span>}
                        {q.sameAs && <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-500"><Combine className="h-3 w-3" />same as &quot;{q.sameAs}&quot;</span>}
                    </span>
                    {mergeable && !q.link && (
                        q.sameAs
                            ? <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy} onClick={() => void save(() => setSameAs(q.id, null))} aria-label="Undo the merge"><Undo2 className="h-3.5 w-3.5" /></Button>
                            : <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy} onClick={() => void findSimilar()} aria-label="Same as an earlier question"><Combine className="h-3.5 w-3.5" /></Button>
                    )}
                    {editable && (
                        <span className="flex shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} aria-label="Edit question"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy} onClick={() => void save(() => removeReportQuestion(q.id))} aria-label="Remove question"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </span>
                    )}
                </div>
            )}
            {suggestions && (
                <div className="mt-1.5 space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                    {suggestions.length === 0
                        ? <p className="text-xs text-neutral-500">No similar approved question at this company yet.</p>
                        : suggestions.map((s) => (
                            <button key={s.id} type="button" onClick={() => { setSuggestions(null); void save(() => setSameAs(q.id, s.id)) }}
                                className="block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                Same as &quot;{s.text}&quot; <span className="text-xs text-neutral-500">({ROUND[s.roundType] ?? s.roundType}, {s.reports} {s.reports === 1 ? "report" : "reports"})</span>
                            </button>
                        ))}
                    <button type="button" className="px-2 text-xs text-neutral-500 underline underline-offset-2" onClick={() => setSuggestions(null)}>Close</button>
                </div>
            )}
        </li>
    )
}
