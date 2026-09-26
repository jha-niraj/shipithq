"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CircleAlert, ExternalLink, FileText, Mail, Pause, Play, ShieldCheck, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    answerReferral, confirmReferrerCode, openReferralResume, setReferrerPaused, startReferrerVerification, withdrawReferral,
    type InboxRequest, type MyReferralRequest, type ReferrerState,
} from "@/actions/(main)/referrer"

/*
 * Referrals (plan/competition/skillmeet CMP-4e): the requests a student sent, and,
 * for an employee, verifying with their company email and answering requests.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
const MY_STATUS: Record<MyReferralRequest["status"], string> = {
    OPEN: "Waiting for an answer", ACCEPTED: "Referred", DECLINED: "Not taken up", EXPIRED: "Closed without an answer", WITHDRAWN: "Withdrawn",
}

export function ReferralsView({ tab, mine, state, inbox }: { tab: "mine" | "referring"; mine: MyReferralRequest[]; state: ReferrerState | null; inbox: InboxRequest[] }) {
    const tabs = [["mine", "Your requests", "/jobs/referrals"], ["referring", "Referring", "/jobs/referrals?tab=referring"]] as const
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader title="Referrals" subtitle="Ask a verified employee to refer you, or refer students for your own company." />
            <nav aria-label="Referrals" className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
                {tabs.map(([v, label, href]) => (
                    <Link key={v} href={href} aria-current={tab === v ? "page" : undefined}
                        className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === v ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-600 dark:text-neutral-300")}>
                        {label}
                    </Link>
                ))}
            </nav>
            {tab === "mine" ? <MyRequests rows={mine} /> : <Referring state={state} inbox={inbox} />}
        </div>
    )
}

function MyRequests({ rows }: { rows: MyReferralRequest[] }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    if (!rows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
                <p className="font-medium text-neutral-900 dark:text-white">No requests yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">On a job whose company has a verified employee on ShipItHQ, you&apos;ll see &quot;Ask for a referral&quot;. One a day, free.</p>
                <Button asChild size="sm" className="mt-4"><Link href="/jobs/browse">Browse jobs</Link></Button>
            </div>
        )
    }
    const withdraw = async (id: string) => {
        setBusy(id)
        const r = await withdrawReferral(id)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        router.refresh()
    }
    return (
        <ul className="space-y-2.5">
            {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-900 dark:text-white"><Link href={r.href} className="hover:underline">{r.jobTitle}</Link> <span className="font-normal text-neutral-500 dark:text-neutral-400">· {r.companyName}</span></p>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                            Asked {day(r.createdAt)} · {MY_STATUS[r.status]}{r.status === "ACCEPTED" && r.referrerFirstName ? ` by ${r.referrerFirstName}` : ""}
                        </p>
                        {r.status === "ACCEPTED" && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">They have your email and resume. A referral puts you in front of the team; it isn&apos;t a promise of an interview.</p>}
                    </div>
                    {r.status === "OPEN" && (
                        <Button size="sm" variant="ghost" className="shrink-0 gap-1.5" disabled={busy !== null} onClick={() => void withdraw(r.id)}>
                            {busy === r.id ? <InlineLoader size="sm" /> : <X className="h-3.5 w-3.5" />} Withdraw
                        </Button>
                    )}
                </li>
            ))}
        </ul>
    )
}

function Referring({ state, inbox }: { state: ReferrerState | null; inbox: InboxRequest[] }) {
    const offer = state?.offer
    if (!offer || offer.expired) return <Verify state={state} expired={Boolean(offer?.expired)} />
    return (
        <div className="space-y-5">
            <OfferBar offer={offer} />
            {inbox.length === 0
                ? <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">No requests yet. When a student asks for a referral at {offer.companyName}, it lands here.</p>
                : <ul className="space-y-3">{inbox.map((r) => <InboxCard key={r.id} request={r} />)}</ul>}
        </div>
    )
}

function OfferBar({ offer }: { offer: NonNullable<ReferrerState["offer"]> }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const paused = offer.status === "PAUSED"
    const toggle = async () => {
        setBusy(true)
        const r = await setReferrerPaused(!paused)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        router.refresh()
    }
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
            <div>
                <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-white"><ShieldCheck className="h-4 w-4" /> Verified at {offer.companyName}</p>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                    {offer.workEmail} · {paused ? "paused: no new requests" : "taking requests"} · verify again by {day(offer.expiresAt)}
                </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" disabled={busy} onClick={() => void toggle()}>
                {busy ? <InlineLoader size="sm" /> : paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} {paused ? "Take requests" : "Pause"}
            </Button>
        </div>
    )
}

function Verify({ state, expired }: { state: ReferrerState | null; expired: boolean }) {
    const router = useRouter()
    const [email, setEmail] = useState(state?.pending?.email ?? "")
    const [code, setCode] = useState("")
    const [sentTo, setSentTo] = useState<string | null>(state?.pending?.companyName ?? null)
    const [busy, setBusy] = useState(false)
    const send = async () => {
        setBusy(true)
        const r = await startReferrerVerification(email)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setSentTo(r.data.companyName)
    }
    const confirm = async () => {
        setBusy(true)
        const r = await confirmReferrerCode(code)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success(`You can now refer students for ${r.data.companyName}.`)
        router.refresh()
    }
    return (
        <div className="max-w-xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div>
                <p className="font-medium text-neutral-900 dark:text-white">{expired ? "Verify again to keep referring" : "Refer students for your company"}</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {expired
                        ? "It's been six months since you verified. Confirm you still work there with a new code."
                        : "Prove you work there with a code sent to your company email. Requests come to you a few at a time; you accept or decline each. Free, and you can pause any time."}
                </p>
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!busy && email.includes("@")) void send() }}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="sm:flex-1" />
                <Button type="submit" variant={sentTo ? "outline" : "default"} disabled={busy || !email.includes("@")} className="gap-1.5">
                    {busy && !sentTo ? <InlineLoader size="sm" /> : <Mail className="h-4 w-4" />} {sentTo ? "Send a new code" : "Send a code"}
                </Button>
            </form>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Personal and temporary addresses can&apos;t verify. Your company must be on ShipItHQ.</p>
            {sentTo && (
                <form className="flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row dark:border-neutral-800" onSubmit={(e) => { e.preventDefault(); if (!busy && code.trim().length === 6) void confirm() }}>
                    <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className="font-mono tracking-[0.3em] sm:w-44" aria-label={`The code sent for ${sentTo}`} />
                    <Button type="submit" disabled={busy || code.length !== 6} className="gap-1.5">{busy && <InlineLoader size="sm" />} Confirm</Button>
                </form>
            )}
        </div>
    )
}

function InboxCard({ request: r }: { request: InboxRequest }) {
    const router = useRouter()
    const [busy, setBusy] = useState<"accept" | "decline" | "resume" | null>(null)
    const [email, setEmail] = useState<string | null>(r.studentEmail)
    const open = r.status === "OPEN"
    const answer = async (accept: boolean) => {
        setBusy(accept ? "accept" : "decline")
        const res = await answerReferral(r.id, accept)
        setBusy(null)
        if (!res.success) { toast.error(res.error); return }
        if (accept && res.data.studentEmail) setEmail(res.data.studentEmail)
        toast.success(accept ? "Accepted. The student knows you'll refer them." : "Declined. The student was told kindly, without your name.")
        router.refresh()
    }
    const resume = async () => {
        setBusy("resume")
        const res = await openReferralResume(r.id)
        setBusy(null)
        if (!res.success) { toast.error(res.error); return }
        window.open(res.data.url, "_blank", "noopener,noreferrer")
    }
    return (
        <li className={cn("space-y-3 rounded-2xl border bg-white p-4 dark:bg-neutral-900", open ? "border-neutral-900 dark:border-white" : "border-neutral-200 dark:border-neutral-800")}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="font-medium text-neutral-900 dark:text-white">{r.studentName} <span className="font-normal text-neutral-500 dark:text-neutral-400">for <Link href={r.jobHref} className="hover:underline">{r.jobTitle}</Link></span></p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{open ? `Asked ${day(r.createdAt)} · closes ${day(r.expiresAt)}` : MY_STATUS[r.status]}</p>
            </div>
            <p className="whitespace-pre-line rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{r.note}</p>
            {r.attachment.rounds.length > 0 && (
                <div>
                    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">Rounds on ShipItHQ</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                        {r.attachment.rounds.map((x) => (
                            <li key={x.title} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs", x.cleared ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white" : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300")}>
                                {x.cleared && <Check className="h-3 w-3" />}{x.title}: {x.best ?? "-"} / pass {x.passMark}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {r.attachment.projects.length > 0 && (
                <div>
                    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">Approved projects</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                        {r.attachment.projects.map((p) => (
                            <li key={p.title} className="flex flex-wrap items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                {p.title}
                                {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-neutral-500 underline underline-offset-2">code <ExternalLink className="h-3 w-3" /></a>}
                                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-neutral-500 underline underline-offset-2">live <ExternalLink className="h-3 w-3" /></a>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {email && <p className="flex items-center gap-1.5 text-sm text-neutral-800 dark:text-neutral-200"><Mail className="h-4 w-4" /> <a href={`mailto:${email}`} className="underline underline-offset-2">{email}</a></p>}
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {r.attachment.resume && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy !== null} onClick={() => void resume()}>
                        {busy === "resume" ? <InlineLoader size="sm" /> : <FileText className="h-3.5 w-3.5" />} Open resume
                    </Button>
                )}
                {open && (
                    <>
                        <Button size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void answer(true)}>{busy === "accept" ? <InlineLoader size="sm" /> : <Check className="h-3.5 w-3.5" />} Accept and refer</Button>
                        <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy !== null} onClick={() => void answer(false)}>{busy === "decline" ? <InlineLoader size="sm" /> : <X className="h-3.5 w-3.5" />} Decline</Button>
                    </>
                )}
                {!open && !email && r.status !== "ACCEPTED" && <span className="inline-flex items-center gap-1 text-xs text-neutral-500"><CircleAlert className="h-3.5 w-3.5" /> {MY_STATUS[r.status]}</span>}
            </div>
        </li>
    )
}
