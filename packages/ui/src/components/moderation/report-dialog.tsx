"use client"

import { useState, type ReactNode } from "react"
import { Flag } from "lucide-react"
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportTargetKind } from "@repo/db/report-reasons"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { InlineLoader } from "../ui/inline-loader"
import { Textarea } from "../ui/textarea"
import { toast } from "../ui/sonner"
import { cn } from "../../lib/utils"

/*
 * Reporting something (plan/hiring-rounds HR-24): a reason from the short list
 * for that kind of target, and an optional note. Both apps use it; each passes
 * its own server action. The other party is never told who reported.
 */

const WHAT: Record<ReportTargetKind, string> = { COMPANY: "this company", JOB: "this job", MESSAGE: "this message", STUDENT: "this candidate" }

export function ReportDialog({ kind, onSubmit, trigger, name }: {
    kind: ReportTargetKind
    /** Resolves to an error message, or null when filed. */
    onSubmit: (reason: string, details: string) => Promise<string | null>
    /** Defaults to a small "Report" button. */
    trigger?: ReactNode
    /** What's being reported, for the title ("Report Acme"). */
    name?: string
}) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState("")
    const [details, setDetails] = useState("")
    const [busy, setBusy] = useState(false)
    const submit = async () => {
        if (!reason) return
        setBusy(true)
        const error = await onSubmit(reason, details)
        setBusy(false)
        if (error) { toast.error(error); return }
        toast.success("Thanks. ShipItHQ will review it, and you'll hear back in your Inbox.")
        setOpen(false)
        setReason("")
        setDetails("")
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? <Button variant="ghost" size="sm" className="gap-1.5 text-neutral-600 dark:text-neutral-400"><Flag className="h-4 w-4" /> Report</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Report {name ?? WHAT[kind]}</DialogTitle>
                    <DialogDescription>ShipItHQ reviews every report. {kind === "STUDENT" ? "The candidate" : "They"} won&apos;t be told who reported.</DialogDescription>
                </DialogHeader>
                <fieldset className="space-y-1.5">
                    <legend className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">What&apos;s wrong?</legend>
                    {REPORT_REASONS[kind].map((r) => (
                        <label key={r.value} className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                            reason === r.value ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900" : "border-neutral-200 dark:border-neutral-800",
                        )}>
                            <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-neutral-900 dark:accent-white" />
                            <span className="text-neutral-800 dark:text-neutral-200">{r.label}</span>
                        </label>
                    ))}
                </fieldset>
                <div className="space-y-1.5">
                    <label htmlFor="report-details" className="text-sm font-medium text-neutral-900 dark:text-white">Anything we should know? <span className="font-normal text-neutral-500">(optional)</span></label>
                    <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value.slice(0, REPORT_DETAILS_MAX))} rows={3} className="text-sm" />
                    <p className="text-right text-xs text-neutral-500">{details.length}/{REPORT_DETAILS_MAX}</p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
                    <Button onClick={() => void submit()} disabled={!reason || busy} className="gap-1.5">{busy && <InlineLoader size="sm" />} Send report</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
