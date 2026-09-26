"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, UserCheck } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { requestReferral, type ReferralAvailability } from "@/actions/(main)/referrer"

/*
 * "Ask for a referral" on a job (plan/competition/skillmeet CMP-4e): shown only
 * when the company has a verified referrer with room, or when the student
 * already asked (then where it stands). The request goes to a verified employee,
 * named to the student only if they refer.
 */

const STATUS: Record<string, string> = {
    OPEN: "You asked for a referral. A verified employee has it.",
    ACCEPTED: "You were referred for this job.",
    DECLINED: "Your referral request wasn't taken up.",
    EXPIRED: "Your referral request closed without an answer.",
    WITHDRAWN: "You withdrew your referral request.",
}

export function AskReferral({ target, availability, companyName }: {
    target: { jobSlug: string } | { importedJobId: string }
    availability: ReferralAvailability | null
    companyName: string
}) {
    const [open, setOpen] = useState(false)
    const [note, setNote] = useState("")
    const [shareResume, setShareResume] = useState(Boolean(availability?.hasResume))
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)
    if (!availability) return null

    const existing = sent ? "OPEN" : availability.existing?.status
    if (existing) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <p className="flex items-start gap-2 text-neutral-800 dark:text-neutral-200"><UserCheck className="mt-0.5 h-4 w-4 shrink-0" /> {STATUS[existing] ?? "You asked for a referral."}</p>
                <Link href="/jobs/referrals" className="mt-2 inline-block text-xs text-neutral-500 underline underline-offset-2 dark:text-neutral-400">Your referral requests</Link>
            </div>
        )
    }
    if (!availability.available) return null

    const submit = async () => {
        setBusy(true)
        const r = await requestReferral(target, { note, shareResume })
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setSent(true)
    }

    return (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div>
                <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-white"><UserCheck className="h-4 w-4" /> Ask for a referral</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">A verified {companyName} employee on ShipItHQ can refer you. Free, one a day; you&apos;ll learn their name only if they do.</p>
            </div>
            {!open ? (
                <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Ask for a referral</Button>
            ) : (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!busy && note.trim().length >= 20) void submit() }}>
                    <div className="space-y-1.5">
                        <label htmlFor="ref-note" className="text-sm font-medium text-neutral-900 dark:text-white">Why this role</label>
                        <Textarea id="ref-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[6rem] resize-y text-sm" placeholder="A sentence or two: what you've built or practised that fits it." />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{note.trim().length}/500 · the rounds you cleared here and your approved projects go with it.</p>
                    </div>
                    <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <input type="checkbox" className="mt-0.5" checked={shareResume} disabled={!availability.hasResume} onChange={(e) => setShareResume(e.target.checked)} />
                        <span>{availability.hasResume ? "Share my resume (the employee opens it only from the request)" : "No resume uploaded; add one in your profile to share it"}</span>
                    </label>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={busy || note.trim().length < 20} className="gap-1.5">{busy ? <InlineLoader size="sm" /> : <Check className="h-3.5 w-3.5" />} Send the request</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">A referral puts you in front of the team. It isn&apos;t a promise of an interview.</p>
                </form>
            )}
        </div>
    )
}
