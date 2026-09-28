"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Check, FileText, Link2, Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { MonthPicker } from "@repo/ui/components/ui/month-picker"
import { NumberTextInput } from "@repo/ui/components/ui/number-text-input"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    searchReportCompanies, searchReportLinks, submitReport,
    type ReportCompanyHit, type ReportLinkHit,
} from "@/actions/(main)/companies/reports.action"
import {
    REPORT_LEVELS, REPORT_LEVEL_LABEL, REPORT_OUTCOMES, REPORT_OUTCOME_LABEL, REPORT_ROLE_FAMILIES, REPORT_ROLE_FAMILY_LABEL,
    REPORT_ROUND_LABEL, REPORT_ROUND_TYPES,
    type ReportLevel, type ReportOutcome, type ReportRoleFamily, type ReportRoundType,
} from "@/lib/interview-reports/types"

/*
 * Report a real interview (plan/competition/skillmeet CMP-1): the company, role,
 * month and outcome, then the rounds in order with the questions asked. One
 * sheet, opened from the company page, a pending company's page, an imported
 * job's page (prefilled) and My rounds (with a company search). An admin reviews
 * it; only aggregates are ever public.
 */

type Company = { companyId: string | null; companyRequestId: string | null; name: string }
type Question = { key: number; text: string; link: ReportLinkHit | null }
type Round = { key: number; type: ReportRoundType | ""; title: string; minutes: string; questions: Question[] }

/** Round types whose questions can be linked to our banks. */
const LINKABLE: Partial<Record<ReportRoundType, "PROBLEM" | "APTITUDE">> = { DSA: "PROBLEM", ONLINE_ASSESSMENT: "PROBLEM", TECHNICAL: "PROBLEM", APTITUDE: "APTITUDE" }

let seq = 0
const next = () => ++seq
const newQuestion = (): Question => ({ key: next(), text: "", link: null })
const newRound = (): Round => ({ key: next(), type: "", title: "", minutes: "", questions: [newQuestion()] })
/** The current LOCAL month as `YYYY-MM` (toISOString would give the UTC month, a day early or late at the edges). */
const thisMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export interface ReportPrefill {
    company?: Company
    importedJobId?: string
    role?: string
    level?: ReportLevel
}

export function ReportInterviewButton({ prefill, label = "Report your interview", variant = "outline", size = "sm", className }: {
    prefill?: ReportPrefill
    label?: string
    variant?: "outline" | "default" | "ghost"
    size?: "sm" | "default"
    className?: string
}) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button variant={variant} size={size} className={cn("gap-1.5", className)} onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" /> {label}
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                {/* Its own column (JP-12): header, steps, a scrolling middle, and Back / Next pinned
                    to the bottom, so a short step doesn't leave the buttons hanging halfway. */}
                <SheetContent scroll={false} className="flex w-full flex-col gap-0 sm:max-w-3xl">
                    <SheetHeader className="shrink-0 pr-8">
                        <SheetTitle>Report your interview</SheetTitle>
                        <SheetDescription>
                            The rounds you took and what they asked. It helps the next student prepare: only totals are ever shown (&quot;reported 4 times&quot;), never your report. Sending it earns 20 XP; an admin reviews it, and an approved report earns 10 credits.
                        </SheetDescription>
                    </SheetHeader>
                    {open && <ReportForm prefill={prefill} onDone={() => setOpen(false)} />}
                </SheetContent>
            </Sheet>
        </>
    )
}

function ReportForm({ prefill, onDone }: { prefill?: ReportPrefill; onDone: () => void }) {
    const [company, setCompany] = useState<Company | null>(prefill?.company ?? null)
    const [role, setRole] = useState(prefill?.role ?? "")
    const [month, setMonth] = useState(thisMonth())
    const [outcome, setOutcome] = useState<ReportOutcome | "">("")
    const [family, setFamily] = useState<ReportRoleFamily | "">("")
    /** With "Other": the kind of role in the student's words (JP-12). */
    const [familyOther, setFamilyOther] = useState("")
    const [level, setLevel] = useState<ReportLevel | "">(prefill?.level ?? "")
    const [rounds, setRounds] = useState<Round[]>([newRound()])
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)
    // Three steps (plan/jobs-polish JP-11): the interview, the rounds, review and send.
    const [step, setStep] = useState<0 | 1 | 2>(0)

    const setRound = (key: number, patch: Partial<Round>) => setRounds((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    const move = (i: number, d: -1 | 1) => setRounds((rs) => {
        const j = i + d
        if (j < 0 || j >= rs.length) return rs
        const copy = [...rs]
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
        return copy
    })
    const interviewDone = Boolean(company && role.trim().length >= 2 && family && (family !== "OTHER" || familyOther.trim().length >= 2) && level && month && outcome)
    // A round of kind "Other" needs its name (JP-12).
    const roundsDone = rounds.length > 0 && rounds.every((r) => r.type && (r.type !== "OTHER" || r.title.trim().length >= 2))
    const ready = interviewDone && roundsDone

    const submit = async () => {
        if (!company || !outcome || !family || !level) return
        setBusy(true)
        const r = await submitReport({
            companyId: company.companyId ?? undefined,
            companyRequestId: company.companyRequestId ?? undefined,
            importedJobId: prefill?.importedJobId,
            role,
            roleFamily: family,
            roleFamilyOther: family === "OTHER" ? familyOther : undefined,
            level,
            month,
            outcome,
            rounds: rounds.map((x) => ({
                type: x.type as ReportRoundType,
                title: x.title,
                minutes: x.minutes ? Number(x.minutes) : null,
                questions: x.questions.filter((q) => q.text.trim()).map((q) => ({
                    text: q.text,
                    practiceProblemId: q.link?.kind === "PROBLEM" ? q.link.id : null,
                    aptitudeQuestionId: q.link?.kind === "APTITUDE" ? q.link.id : null,
                })),
            })),
        })
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setSent(true)
    }

    if (sent) {
        return (
            <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-white"><Check className="h-4 w-4" /> Thanks. Your report is with ShipItHQ.</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">You earned 20 XP for sending it. An admin reviews it, usually within a few days; you&apos;ll hear either way, and an approved report earns 10 credits. Follow it under My rounds.</p>
                <Button size="sm" variant="outline" onClick={onDone}>Done</Button>
            </div>
        )
    }

    return (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (step === 2 && ready && !busy) void submit() }}>
            <ol className="mt-6 grid shrink-0 grid-cols-3 gap-2" aria-label="Steps">
                {["The interview", "The rounds", "Review and send"].map((label, i) => {
                    const reachable = i === 0 || (i === 1 && interviewDone) || (i === 2 && ready)
                    return (
                        <li key={label}>
                            <button
                                type="button"
                                onClick={() => reachable && setStep(i as 0 | 1 | 2)}
                                disabled={!reachable}
                                aria-current={step === i ? "step" : undefined}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed",
                                    step === i ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                        : "border-neutral-200 text-neutral-600 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400",
                                )}
                            >
                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]", step === i ? "border-current" : "border-neutral-300 dark:border-neutral-700")}>
                                    {(i === 0 && interviewDone && step !== 0) || (i === 1 && roundsDone && step === 2) ? <Check className="h-3 w-3" /> : i + 1}
                                </span>
                                <span className="truncate">{label}</span>
                            </button>
                        </li>
                    )
                })}
            </ol>

            {/* The sheet's p-6 pulled back so the scroller and the footer's border run edge to edge. */}
            <ScrollArea className="-mx-6 mt-5 min-h-0 flex-1" reflow>
            <div className="px-6 pb-6">
            {step === 0 && (
                <div className="space-y-5">
            <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Company</p>
                {company ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                        <span className="text-neutral-900 dark:text-white">{company.name}{company.companyRequestId && <span className="text-neutral-500"> (under review)</span>}</span>
                        {!prefill?.company && <Button type="button" variant="ghost" size="sm" onClick={() => setCompany(null)}>Change</Button>}
                    </div>
                ) : (
                    <CompanySearch onPick={setCompany} />
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="rep-role" className="text-sm font-medium text-neutral-900 dark:text-white">Role</label>
                    <Input id="rep-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="e.g. SDE 1, Backend" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">When</p>
                    <MonthPicker aria-label="When" placeholder="Month and year" format="YYYY-MM" max={thisMonth()} clearable={false} value={month} onChange={(v) => setMonth(v ?? thisMonth())} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Kind of role</p>
                    <Select value={family} onValueChange={(v) => setFamily(v as ReportRoleFamily)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>{REPORT_ROLE_FAMILIES.map((f) => <SelectItem key={f} value={f}>{REPORT_ROLE_FAMILY_LABEL[f]}</SelectItem>)}</SelectContent>
                    </Select>
                    {family === "OTHER" && (
                        <Input aria-label="What kind of role?" value={familyOther} onChange={(e) => setFamilyOther(e.target.value)} maxLength={60} placeholder="What kind? e.g. Security, Embedded, Support" autoFocus />
                    )}
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Level</p>
                    <Select value={level} onValueChange={(v) => setLevel(v as ReportLevel)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>{REPORT_LEVELS.map((l) => <SelectItem key={l} value={l}>{REPORT_LEVEL_LABEL[l]}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">How it ended</p>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as ReportOutcome)}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Choose one" /></SelectTrigger>
                    <SelectContent>{REPORT_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{REPORT_OUTCOME_LABEL[o]}</SelectItem>)}</SelectContent>
                </Select>
            </div>

                </div>
            )}

            {step === 1 && (
            <div className="space-y-3">
                <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Rounds, in order</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">What each round was and what they asked. Leave out names, emails and phone numbers; don&apos;t paste a test the company told you to keep confidential.</p>
                </div>
                <ol className="space-y-3">
                    {rounds.map((r, i) => (
                        <li key={r.key} className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-neutral-500">{i + 1}</span>
                                <Select value={r.type} onValueChange={(v) => setRound(r.key, { type: v as ReportRoundType })}>
                                    <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Kind of round" /></SelectTrigger>
                                    <SelectContent>{REPORT_ROUND_TYPES.map((t) => <SelectItem key={t} value={t}>{REPORT_ROUND_LABEL[t]}</SelectItem>)}</SelectContent>
                                </Select>
                                <NumberTextInput className="w-28" inputClassName="h-8" min={1} max={600} value={r.minutes === "" ? null : Number(r.minutes)} onChange={(v) => setRound(r.key, { minutes: v === null ? "" : String(v) })} placeholder="Minutes" suffix="min" aria-label="Minutes" />
                                <span className="ml-auto flex items-center">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === rounds.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={rounds.length === 1} onClick={() => setRounds((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove round"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </span>
                            </div>
                            <Input
                                className="h-8 text-sm"
                                value={r.title}
                                maxLength={80}
                                onChange={(e) => setRound(r.key, { title: e.target.value })}
                                aria-invalid={r.type === "OTHER" && r.title.trim().length < 2 ? true : undefined}
                                placeholder={r.type === "OTHER" ? "What was the round? e.g. Group discussion" : "Title, if it had one (optional)"}
                            />
                            <div className="space-y-2">
                                {r.questions.map((q) => (
                                    <QuestionRow
                                        key={q.key}
                                        question={q}
                                        linkKind={r.type ? LINKABLE[r.type] : undefined}
                                        onChange={(patch) => setRound(r.key, { questions: r.questions.map((x) => (x.key === q.key ? { ...x, ...patch } : x)) })}
                                        onRemove={() => setRound(r.key, { questions: r.questions.filter((x) => x.key !== q.key) })}
                                    />
                                ))}
                                {r.questions.length < 10 && (
                                    <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setRound(r.key, { questions: [...r.questions, newQuestion()] })}>
                                        <Plus className="h-3.5 w-3.5" /> Add a question
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
                {rounds.length < 8 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setRounds((rs) => [...rs, newRound()])}>
                        <Plus className="h-3.5 w-3.5" /> Add a round
                    </Button>
                )}
            </div>

            )}

            {step === 2 && (
                <ReportReview
                    company={company}
                    role={role}
                    month={month}
                    family={family}
                    familyOther={familyOther}
                    level={level}
                    outcome={outcome}
                    rounds={rounds}
                    onEdit={(s) => setStep(s)}
                />
            )}

            </div>
            </ScrollArea>

            <div className="-mx-6 -mb-6 flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep((step - 1) as 0 | 1)}>Back</Button> : <span />}
                {step < 2
                    ? <Button type="button" onClick={() => setStep((step + 1) as 1 | 2)} disabled={step === 0 ? !interviewDone : !roundsDone}>Next</Button>
                    : <Button type="submit" disabled={!ready || busy} className="gap-1.5">{busy && <InlineLoader size="sm" />} Send the report</Button>}
            </div>
        </form>
    )
}

/** Step 3: everything as it will be sent, read-only, with a way back to each part. */
function ReportReview({ company, role, month, family, familyOther, level, outcome, rounds, onEdit }: {
    company: Company | null; role: string; month: string
    family: ReportRoleFamily | ""; familyOther: string; level: ReportLevel | ""; outcome: ReportOutcome | ""
    rounds: Round[]; onEdit: (step: 0 | 1) => void
}) {
    const when = month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "-"
    const facts: [string, string][] = [
        ["Company", company?.name ?? "-"],
        ["Role", role || "-"],
        ["When", when],
        ["Kind of role", family === "OTHER" ? `Other: ${familyOther.trim()}` : family ? REPORT_ROLE_FAMILY_LABEL[family] : "-"],
        ["Level", level ? REPORT_LEVEL_LABEL[level] : "-"],
        ["How it ended", outcome ? REPORT_OUTCOME_LABEL[outcome] : "-"],
    ]
    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">The interview</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(0)}>Edit</Button>
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {facts.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 sm:block">
                            <dt className="text-neutral-500 dark:text-neutral-400">{k}</dt>
                            <dd className="font-medium text-neutral-900 dark:text-white">{v}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{rounds.length} {rounds.length === 1 ? "round" : "rounds"}, in order</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(1)}>Edit</Button>
                </div>
                <ol className="space-y-3">
                    {rounds.map((r, i) => {
                        const qs = r.questions.filter((q) => q.text.trim())
                        return (
                            <li key={r.key} className="text-sm">
                                <p className="font-medium text-neutral-900 dark:text-white">
                                    {i + 1}. {r.type ? REPORT_ROUND_LABEL[r.type] : "-"}{r.title ? `: ${r.title}` : ""}
                                    {r.minutes && <span className="font-normal text-neutral-500"> · {r.minutes} min</span>}
                                </p>
                                {qs.length > 0
                                    ? <ul className="mt-1 list-disc space-y-0.5 pl-9 text-neutral-700 dark:text-neutral-300">{qs.map((q) => <li key={q.key}>{q.text}{q.link && <span className="text-neutral-500"> (linked: {q.link.label})</span>}</li>)}</ul>
                                    : <p className="mt-1 pl-5 text-neutral-500">No questions added.</p>}
                            </li>
                        )
                    })}
                </ol>
            </section>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Only totals are ever shown to others, never your report. Sending earns 20 XP now; an approved report earns 10 credits.</p>
        </div>
    )
}

function QuestionRow({ question: q, linkKind, onChange, onRemove }: { question: Question; linkKind?: "PROBLEM" | "APTITUDE"; onChange: (p: Partial<Question>) => void; onRemove: () => void }) {
    const [linking, setLinking] = useState(false)
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <Input className="h-8 text-sm" value={q.text} maxLength={600} onChange={(e) => onChange({ text: e.target.value })} placeholder="What they asked, in a line" />
                {linkKind && !q.link && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLinking((v) => !v)} aria-label={linkKind === "PROBLEM" ? "Link a coding problem" : "Link an aptitude question"}>
                        <Link2 className="h-3.5 w-3.5" />
                    </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} aria-label="Remove question"><X className="h-3.5 w-3.5" /></Button>
            </div>
            {q.link && (
                <p className="flex items-center gap-1.5 pl-1 text-xs text-neutral-600 dark:text-neutral-400">
                    <Link2 className="h-3 w-3" /> Same as {q.link.label}
                    <button type="button" className="underline underline-offset-2" onClick={() => onChange({ link: null })}>remove</button>
                </p>
            )}
            {linking && linkKind && !q.link && (
                <LinkSearch kind={linkKind} onPick={(link) => { onChange({ link }); setLinking(false) }} />
            )}
        </div>
    )
}

/** Debounced search, shared by the company and link pickers. */
function useSearch<T>(query: string, run: (q: string) => Promise<{ success: true; data: T[] } | { success: false; error: string }>) {
    const [hits, setHits] = useState<T[]>([])
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) { setHits([]); return }
        let live = true
        setLoading(true)
        const t = setTimeout(async () => {
            const r = await run(q)
            if (!live) return
            setLoading(false)
            setHits(r.success ? r.data : [])
        }, 300)
        return () => { live = false; clearTimeout(t) }
        // `run` is a stable server action reference.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])
    return { hits, loading }
}

function LinkSearch({ kind, onPick }: { kind: "PROBLEM" | "APTITUDE"; onPick: (l: ReportLinkHit) => void }) {
    const [q, setQ] = useState("")
    const { hits, loading } = useSearch(q, (x) => searchReportLinks(kind, x))
    return (
        <div className="space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
            <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="h-7 flex-1 bg-transparent text-sm outline-none" placeholder={kind === "PROBLEM" ? "Find the same problem on ShipItHQ" : "Find the same aptitude question"} />
                {loading && <InlineLoader size="sm" />}
            </div>
            {hits.map((h) => (
                <button key={h.id} type="button" onClick={() => onPick(h)} className="block w-full rounded-md px-2 py-1 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">{h.label}</button>
            ))}
        </div>
    )
}

function CompanySearch({ onPick }: { onPick: (c: Company) => void }) {
    const [q, setQ] = useState("")
    const { hits, loading } = useSearch<ReportCompanyHit>(q, searchReportCompanies)
    return (
        <div className="space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
            <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="h-7 flex-1 bg-transparent text-sm outline-none" placeholder="Search for the company" />
                {loading && <InlineLoader size="sm" />}
            </div>
            {hits.map((h) => (
                <button key={h.companyId ?? h.companyRequestId} type="button" onClick={() => onPick(h)} className="block w-full rounded-md px-2 py-1 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                    {h.name}{h.pending && <span className="text-neutral-500"> (under review)</span>}
                </button>
            ))}
            {q.trim().length >= 2 && !loading && hits.length === 0 && (
                <p className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">Not on ShipItHQ yet. <Link href="/companies/request" className="underline underline-offset-2">Ask for it to be added</Link>, then report your interview from its page.</p>
            )}
        </div>
    )
}
