"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, CircleDashed, Copy, Lock, Replace, Undo2, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { adoptImport, replaceImport, revertImport } from "@/actions/imported"
import type { CompanyImportedJob, ImportedJobsView } from "@/lib/imported-jobs"
import { ROUND_TYPE_LABEL, type PipelineSummary, type V1RoundType } from "@/types/pipeline"

/*
 * "Imported by students" (plan/job-import JI-9): jobs students pasted from this
 * company's postings, each with the pipeline ShipItHQ built from it. Adopt makes
 * a copy the company owns and edits; Replace uses one of its pipelines; students
 * practise whichever it points at from then on.
 */

const LEVEL: Record<string, string> = { INTERN: "Intern", ENTRY: "Entry level", MID: "Mid level", SENIOR: "Senior", LEAD: "Lead" }
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

export function ImportedJobs({ view, canManage, pipelines }: { view: ImportedJobsView; canManage: boolean; pipelines: Pick<PipelineSummary, "id" | "name">[] }) {
    if (!view.verified) {
        if (view.count === 0) return null
        return (
            <section className="rounded-2xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                <p className="font-medium text-neutral-900 dark:text-white">Students imported {view.count} of your job{view.count === 1 ? "" : "s"}</p>
                <p className="mt-1">They pasted your postings and are practising the rounds ShipItHQ designed from them. Verify your company to see them and adopt, edit or replace those rounds.</p>
            </section>
        )
    }
    if (view.jobs.length === 0) return null
    return (
        <section className="space-y-3" aria-label="Imported by students">
            <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Imported by students <span className="font-normal text-neutral-500 dark:text-neutral-400">({view.jobs.length})</span></h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Jobs students pasted from your postings, with the rounds ShipItHQ designed from each. Adopt one to own and edit it, or replace it with one of your pipelines; students practise your version from then on. Private imports never say who made them.
                </p>
            </div>
            <ul className="space-y-3">{view.jobs.map((j) => <ImportedRow key={j.id} job={j} canManage={canManage} pipelines={pipelines} />)}</ul>
        </section>
    )
}

function ImportedRow({ job: j, canManage, pipelines }: { job: CompanyImportedJob; canManage: boolean; pipelines: Pick<PipelineSummary, "id" | "name">[] }) {
    const router = useRouter()
    const [busy, setBusy] = useState<"adopt" | "replace" | "revert" | null>(null)
    const [choice, setChoice] = useState<string>("")
    const run = async (kind: "adopt" | "replace" | "revert") => {
        setBusy(kind)
        const r = kind === "adopt" ? await adoptImport(j.id) : kind === "replace" ? await replaceImport(j.id, choice) : await revertImport(j.id)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        if (kind === "adopt" && r.data && typeof r.data === "object" && "pipelineId" in r.data) {
            toast.success("Adopted. Students now practise your copy; edit it like any pipeline.")
            router.push(`/interview-config/${r.data.pipelineId}`)
            return
        }
        toast.success(kind === "replace" ? "Students now practise that pipeline." : "Students are back on ShipItHQ's rounds.")
        router.refresh()
    }
    const choices = pipelines.filter((p) => p.id !== j.companyPipeline?.id)
    return (
        <li className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-neutral-900 dark:text-white">
                        {j.title}
                        {j.private && <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-normal text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><Lock className="h-3 w-3" /> Private import</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {[j.level ? LEVEL[j.level] : null, j.location, `imported ${when(j.importedAt)}`].filter(Boolean).join(" · ")}
                        {" · "}<span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {j.practising !== null ? `${j.practising} practising` : "fewer than 10 practising"}</span>
                    </p>
                </div>
                {j.companyPipeline && (
                    <p className="shrink-0 rounded-lg border border-neutral-900 px-2.5 py-1 text-xs text-neutral-900 dark:border-white dark:text-white">
                        Students practise <Link href={`/interview-config/${j.companyPipeline.id}`} className="font-medium underline underline-offset-2">{j.companyPipeline.name}</Link>
                    </p>
                )}
            </div>

            <ol className={cn("mt-3 grid gap-1.5 sm:grid-cols-2", j.companyPipeline && "opacity-60")}>
                {j.rounds.map((r) => (
                    <li key={r.number} className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-950">
                        <span className="font-mono text-xs text-neutral-500">{r.number}</span>
                        <span className="min-w-0">
                            <span className="block text-neutral-900 dark:text-white">{r.title}</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                                {ROUND_TYPE_LABEL[r.type as V1RoundType] ?? r.type} · {r.minutes} min · {r.gateMode === "HARD" ? `pass ${r.passMark} to go on` : `advisory ${r.passMark}`}{r.aiWritten ? " · AI-written, not reviewed" : ""}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
            {j.notPractisable.length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"><CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Also in the posting, not practisable here: {j.notPractisable.join(", ")}</p>
            )}

            {canManage && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    {!j.companyPipeline && (
                        <Button size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void run("adopt")}>
                            {busy === "adopt" ? <InlineLoader size="sm" /> : <Copy className="h-3.5 w-3.5" />} Adopt and edit
                        </Button>
                    )}
                    {choices.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Select value={choice} onValueChange={setChoice}>
                                <SelectTrigger className="h-8 w-56 text-sm"><SelectValue placeholder="Replace with a pipeline" /></SelectTrigger>
                                <SelectContent>{choices.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" className="gap-1.5" disabled={!choice || busy !== null} onClick={() => void run("replace")}>
                                {busy === "replace" ? <InlineLoader size="sm" /> : <Replace className="h-3.5 w-3.5" />} Replace
                            </Button>
                        </div>
                    )}
                    {j.companyPipeline && (
                        <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy !== null} onClick={() => void run("revert")}>
                            {busy === "revert" ? <InlineLoader size="sm" /> : <Undo2 className="h-3.5 w-3.5" />} Back to ShipItHQ&apos;s rounds
                        </Button>
                    )}
                    {j.companyPipeline && (
                        <Button asChild size="sm" variant="ghost" className="gap-1.5"><Link href={`/interview-config/${j.companyPipeline.id}`}>Edit your pipeline <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                    )}
                </div>
            )}
        </li>
    )
}
