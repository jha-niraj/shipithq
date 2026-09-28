"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@repo/ui/components/ui/button"
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { setStudentOutcome, withdrawSend } from "@/actions/hiring/send.action"

/*
 * The two things a student does to a send after it goes (HR-17, HR-19): take it
 * back before the company decides, and record what happened after an invite.
 * Shared by a job's rounds page and My rounds (HR-22).
 */

export const OUTCOMES: Record<string, string> = { INTERVIEWING: "Interviewing", OFFER: "Offer", HIRED: "Hired", NOT_SELECTED: "Not selected" }

/** Withdraw, confirmed in a dialog first. */
export function WithdrawButton({ sendId }: { sendId: string }) {
    const router = useRouter()
    const [confirm, setConfirm] = useState(false)
    const withdraw = async () => {
        const r = await withdrawSend(sendId)
        if (!r.success) { toast.error(r.error); throw new Error(r.error) }
        toast.success("Withdrawn. The company no longer sees it.")
        router.refresh()
    }
    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>Withdraw</Button>
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title="Withdraw your results?"
                description="The company stops seeing your results for this role straight away and is told you withdrew. This cannot be undone."
                confirmLabel="Withdraw"
                cancelLabel="Keep it"
                tone="danger"
                onConfirm={withdraw}
            />
        </>
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
