"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileText, RotateCcw } from "lucide-react"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { awaitBackgroundJob } from "@/hooks/use-background-job"
import { followRunReport, requestRunReport, retryRunReport, type ReportStatus } from "@/actions/(main)/incidents/run.action"
import { useRun } from "./run-context"

/**
 * "Your report" on the last steps (plan/incidents INC-37): asks for the report once the
 * closing talk is handed in, follows the job, and links to the page when it lands.
 * `trigger` bumps when a closing talk finishes, so the report starts without a click.
 */
export function ReportCard({ slug, trigger = 0 }: { slug: string; trigger?: number }) {
    const { mode, state } = useRun()
    const [status, setStatus] = useState<ReportStatus | null>(null)
    const [busy, setBusy] = useState(false)
    const following = useRef<string | null>(null)

    const follow = useCallback(async (s: ReportStatus) => {
        setStatus(s)
        if (s.state !== "reporting" || following.current === s.jobId) return
        following.current = s.jobId
        await awaitBackgroundJob(s.jobId)
        const r = await followRunReport(s.runId)
        following.current = null
        if (r.success) {
            setStatus(r.data)
            if (r.data.state === "reported") toast.success("Your report is ready")
        }
    }, [])

    const request = useCallback(async () => {
        setBusy(true)
        const r = await requestRunReport(slug)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        void follow(r.data)
    }, [slug, follow])

    // On open and whenever a closing talk is handed in.
    useEffect(() => { if (mode === "recording" || state?.past.some((p) => p.status === "REPORTING")) void request() }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps

    const retry = async (runId: string) => {
        setBusy(true)
        const r = await retryRunReport(runId)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        void follow(r.data)
    }

    const latestReported = state?.past.find((p) => p.status === "REPORTED")
    if (mode !== "recording" && !status && !latestReported) return null

    return (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white"><FileText className="size-4" aria-hidden /> Your report</p>
            <div className="mt-2 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                {status?.state === "reporting" && (
                    <div className="flex items-center gap-2"><InlineLoader size="sm" /> Writing your review. It takes about a minute, and it keeps going if you leave.</div>
                )}
                {status?.state === "reported" && (
                    <Link href={`/incidents/${slug}/report/${status.runId}`} className="inline-flex items-center gap-1.5 font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                        Read your report <ArrowRight className="size-4" aria-hidden />
                    </Link>
                )}
                {status?.state === "failed" && (
                    <div className="flex flex-wrap items-center gap-3">
                        <span>{status.error}</span>
                        <button type="button" onClick={() => void retry(status.runId)} disabled={busy} className="inline-flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                            {busy ? <InlineLoader size="sm" /> : <RotateCcw className="size-4" aria-hidden />} Try again
                        </button>
                    </div>
                )}
                {status?.state === "capped" && <p>{status.error}</p>}
                {status?.state === "not_ready" && <p>{status.reason}</p>}
                {!status && mode === "recording" && (
                    <button type="button" onClick={() => void request()} disabled={busy} className="inline-flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                        {busy && <InlineLoader size="sm" />} Check for my report
                    </button>
                )}
                {!status && mode !== "recording" && latestReported && (
                    <Link href={`/incidents/${slug}/report/${latestReported.id}`} className="inline-flex items-center gap-1.5 font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                        Read your last report <ArrowRight className="size-4" aria-hidden />
                    </Link>
                )}
            </div>
        </div>
    )
}

const STATUS_LABEL: Record<string, string> = { REPORTED: "Report ready", REPORTING: "Writing the report", FAILED: "Report didn't finish", ENDED: "Ended, no report" }
const SHORT: Record<string, string> = { STRONG: "strong", SOLID: "solid", DEVELOPING: "developing", NOT_SHOWN: "not shown" }

/** "Your runs" in the sidebar (INC-40): every past run, and a way to start a new one. */
export function RunsList({ slug }: { slug: string }) {
    const { state, mode, restart, start, busy } = useRun()
    const past = state?.past ?? []
    if (!past.length && mode !== "recording") return null
    return (
        <div className="mx-3 mt-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="flex items-center gap-2 px-1 text-[12px] font-semibold text-neutral-900 dark:text-white">
                <FileText className="size-4" aria-hidden /> Your runs
            </p>
            {past.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {past.map((p) => {
                        const date = new Date(p.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        const bands = p.bands ? Object.entries(p.bands.reduce<Record<string, number>>((a, b) => ({ ...a, [b.band]: (a[b.band] ?? 0) + 1 }), {}))
                            .map(([b, n]) => `${n} ${SHORT[b] ?? b}`).join(", ") : null
                        const body = (
                            <>
                                <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{date} · {STATUS_LABEL[p.status] ?? p.status}</span>
                                {bands && <span className="block truncate font-mono text-[10.5px] text-neutral-500 dark:text-neutral-400">{bands}</span>}
                            </>
                        )
                        return (
                            <li key={p.id}>
                                {p.status === "REPORTED"
                                    ? <Link href={`/incidents/${slug}/report/${p.id}`} className="block rounded-lg px-1.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">{body}</Link>
                                    : <div className="px-1.5 py-1.5">{body}</div>}
                            </li>
                        )
                    })}
                </ul>
            )}
            <button type="button" disabled={busy} onClick={() => (mode === "recording" ? void restart() : start())}
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 text-[12.5px] font-medium text-neutral-800 hover:border-neutral-400 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200">
                {busy ? <InlineLoader size="sm" /> : <RotateCcw className="size-3.5" aria-hidden />} {mode === "recording" ? "Start a new run" : "Start a recorded run"}
            </button>
            {mode === "recording" && <p className="mt-1.5 px-1 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">A new run starts blank; this one ends without a report.</p>}
        </div>
    )
}
