"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2, Printer, Trash2, ArrowRight } from "lucide-react"
import { Switch } from "@repo/ui/components/ui/switch"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import { deleteRun, setRunShared } from "@/actions/(main)/incidents/run.action"
import { adoptIncidentPath } from "@/actions/(main)/pathfinder/explore.action"
import { incidentReportShareUrl } from "@/lib/urls"

/** The owner's controls on a report (INC-39, INC-44): share, copy, print, delete. */
export function ReportActions({ runId, slug, initialToken }: { runId: string; slug: string; initialToken: string | null }) {
    const router = useRouter()
    const [token, setToken] = useState(initialToken)
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)
    const [confirm, setConfirm] = useState(false)

    const share = async (on: boolean) => {
        setBusy(true)
        const r = await setRunShared(runId, on)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        setToken(r.data.token)
        toast.success(on ? "Anyone with the link can read this report." : "The link no longer works.")
    }
    const copy = async () => {
        if (!token) return
        try { await navigator.clipboard.writeText(incidentReportShareUrl(token)); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { toast.error("Could not copy the link.") }
    }
    const remove = async () => {
        setBusy(true)
        const r = await deleteRun(runId)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Run and report deleted")
        router.push(`/incidents/${r.data.slug}`)
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
                Share link <Switch checked={!!token} disabled={busy} onCheckedChange={(v) => void share(v)} aria-label="Share this report" />
            </label>
            {token && (
                <button type="button" onClick={() => void copy()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200">
                    {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied ? "Copied" : "Copy link"}
                </button>
            )}
            <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200">
                <Printer className="size-3.5" /> Print
            </button>
            <button type="button" onClick={() => setConfirm(true)} aria-label="Delete this run" className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:border-red-300 hover:text-red-600 dark:border-neutral-800">
                <Trash2 className="size-3.5" />
            </button>
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this run and its report?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The report, your recorded answers and questions, the transcripts of this run&apos;s talks and the share link all go. XP you already earned stays. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); void remove() }} className="bg-red-600 text-white hover:bg-red-700">
                            {busy && <InlineLoader size="sm" />} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

/** Next steps without the path adopted: one click to get it (INC-43). */
export function AdoptForReport({ slug }: { slug: string }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const adopt = async () => {
        setBusy(true)
        const r = await adoptIncidentPath(slug)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success("The path is in your Pathfinder goals")
        router.refresh()
    }
    return (
        <button type="button" onClick={() => void adopt()} disabled={busy}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 print:hidden dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            {busy ? <InlineLoader size="sm" /> : <ArrowRight className="size-4" />} Adopt the learning path to follow these
        </button>
    )
}
