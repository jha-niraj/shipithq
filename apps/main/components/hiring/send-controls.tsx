"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { setStudentOutcome, withdrawSend } from "@/actions/hiring/send.action"

/*
 * The two things a student does to a send after it goes (HR-17, HR-19): take it
 * back before the company decides, and record what happened after an invite.
 * Shared by a job's rounds page and My rounds (HR-22).
 */

export const OUTCOMES: Record<string, string> = { INTERVIEWING: "Interviewing", OFFER: "Offer", HIRED: "Hired", NOT_SELECTED: "Not selected" }

/** Withdraw, with a Keep it / Withdraw confirm in place. */
export function WithdrawButton({ sendId }: { sendId: string }) {
    const router = useRouter()
    const [confirm, setConfirm] = useState(false)
    const [busy, setBusy] = useState(false)
    const withdraw = async () => {
        setBusy(true)
        const r = await withdrawSend(sendId)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Withdrawn. The company no longer sees it.")
        setConfirm(false)
        router.refresh()
    }
    if (!confirm) return <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>Withdraw</Button>
    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={busy}>Keep it</Button>
            <Button variant="outline" size="sm" onClick={() => void withdraw()} disabled={busy} className="gap-1.5">{busy && <InlineLoader size="sm" />} Withdraw</Button>
        </div>
    )
}

/** "What happened" after an invite; the company sees the student's answer beside its own. */
export function OutcomeSelect({ sendId, initial, companyName }: { sendId: string; initial: string | null; companyName: string }) {
    const [mine, setMine] = useState(initial ?? "")
    const [saving, setSaving] = useState(false)
    const save = async (value: string) => {
        setMine(value)
        setSaving(true)
        const r = await setStudentOutcome(sendId, value as "INTERVIEWING" | "OFFER" | "HIRED" | "NOT_SELECTED")
        setSaving(false)
        if (!r.success) { toast.error(r.error); setMine(initial ?? ""); return }
        toast.success(`Saved. ${companyName} can see it.`)
    }
    return (
        <span className="inline-flex items-center gap-2">
            <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                What happened
                <select value={mine} disabled={saving} onChange={(e) => void save(e.target.value)} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-950">
                    <option value="" disabled>Choose</option>
                    {Object.entries(OUTCOMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </label>
            {saving && <InlineLoader size="sm" />}
        </span>
    )
}
