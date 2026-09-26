"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, CircleAlert, Workflow } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { assignJobPipeline, type JobPipeline, type PipelineChoice } from "@/actions/jobs/job-pipeline.action"
import { ROUND_TYPE_LABEL, type V1RoundType } from "@/types/pipeline"

/*
 * A job's pipeline in the job form (plan/hiring-rounds HR-12, decided by Niraj
 * 2026-09-25). A new job picks a template (the closest ShipItHQ one until the
 * company picks); saving gives the job its own copy. An existing job shows its
 * copy's rounds, "Edit rounds for this job", and can be moved to another
 * template, which makes a fresh copy.
 */

type Round = { title: string; roundType: string; gateMode: string; passMark: number }

/** The closest ShipItHQ template for a job title: intern, full stack, or backend. */
export function suggestTemplate(title: string, choices: PipelineChoice[]): string {
    const platform = choices.filter((c) => c.byShipItHQ)
    const t = title.toLowerCase()
    const byName = (needle: RegExp) => platform.find((c) => needle.test(c.name.toLowerCase()))?.id
    if (/\bintern(ship)?\b/.test(t)) return byName(/intern/) ?? platform[0]?.id ?? ""
    if (/full[\s-]?stack/.test(t)) return byName(/full[\s-]?stack/) ?? platform[0]?.id ?? ""
    return byName(/backend/) ?? platform[0]?.id ?? ""
}

function RoundList({ rounds }: { rounds: Round[] }) {
    return (
        <ol className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {rounds.map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-4 font-mono text-xs text-neutral-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-neutral-900 dark:text-white">{r.title}</span>
                        <span className="block text-xs text-neutral-500 dark:text-neutral-400">{ROUND_TYPE_LABEL[r.roundType as V1RoundType] ?? `Legacy: ${r.roundType.toLowerCase().replace(/_/g, " ")}`}</span>
                    </span>
                    <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px]", r.gateMode === "HARD" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}>
                        {r.gateMode === "HARD" ? "HARD" : "ADV"} {r.passMark}
                    </span>
                </li>
            ))}
        </ol>
    )
}

function ChoiceSelect({ choices, value, onChange, placeholder }: { choices: PipelineChoice[]; value: string; onChange: (id: string) => void; placeholder: string }) {
    const yours = choices.filter((c) => !c.byShipItHQ)
    const ours = choices.filter((c) => c.byShipItHQ)
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="h-11"><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
                {yours.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Your pipelines</SelectLabel>
                        {yours.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.rounds.length} rounds)</SelectItem>)}
                    </SelectGroup>
                )}
                {ours.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>By ShipItHQ</SelectLabel>
                        {ours.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.rounds.length} rounds)</SelectItem>)}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    )
}

/** New job: pick the template it starts from. */
export function NewJobPipeline({ choices, value, onChange }: { choices: PipelineChoice[]; value: string; onChange: (id: string) => void }) {
    const picked = choices.find((c) => c.id === value)
    return (
        <div className="space-y-3">
            <ChoiceSelect choices={choices} value={value} onChange={onChange} placeholder="Pick the rounds candidates take" />
            {picked ? (
                <>
                    <RoundList rounds={picked.rounds} />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        The job gets its own copy of {picked.name}{picked.byShipItHQ ? " (by ShipItHQ)" : ""}. After saving, you can change its rounds for this job alone.
                    </p>
                </>
            ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    A draft can be saved without one; publishing needs a pipeline, because candidates take its rounds instead of applying.{" "}
                    <Link href="/interview-config" className="underline underline-offset-2">Manage pipelines</Link>
                </p>
            )}
        </div>
    )
}

/** Existing job: its own copy, editing it, and moving to another template. */
export function ExistingJobPipeline({ jobId, jobSlug, jobStatus, pipeline, choices }: {
    jobId: string
    jobSlug: string
    jobStatus: string
    pipeline: JobPipeline | null
    choices: PipelineChoice[]
}) {
    const router = useRouter()
    const [replaceWith, setReplaceWith] = useState("")
    const [busy, setBusy] = useState(false)

    const replace = async () => {
        if (!replaceWith) return
        setBusy(true)
        const r = await assignJobPipeline(jobId, replaceWith)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Pipeline changed")
        setReplaceWith("")
        router.refresh()
    }

    return (
        <div className="space-y-4">
            {pipeline ? (
                <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                            This job&apos;s own copy{pipeline.sourceName ? <> of <span className="font-medium text-neutral-900 dark:text-white">{pipeline.sourceName}</span></> : null}
                        </p>
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href={`/jobs/${jobSlug}/pipeline`}>Edit rounds for this job <ArrowRight className="h-3.5 w-3.5" /></Link>
                        </Button>
                    </div>
                    <RoundList rounds={pipeline.rounds} />
                    {pipeline.problems.length > 0 && (
                        <p className="flex items-start gap-1.5 text-sm text-rose-700 dark:text-rose-400">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Not ready to publish: {pipeline.problems[0]}
                        </p>
                    )}
                </>
            ) : (
                <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"><Workflow className="h-4 w-4" /> This job has no pipeline yet.</p>
            )}

            <div className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">{pipeline ? "Start again from another pipeline" : "Pick a pipeline"}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex-1"><ChoiceSelect choices={choices} value={replaceWith} onChange={setReplaceWith} placeholder="Pick a pipeline" /></div>
                    <Button onClick={() => void replace()} disabled={!replaceWith || busy} className="h-11 gap-1.5">
                        {busy && <InlineLoader size="sm" />} {pipeline ? "Replace" : "Use this pipeline"}
                    </Button>
                </div>
                {pipeline && (
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Replacing discards this job&apos;s edits to its rounds.
                        {jobStatus === "ACTIVE" && pipeline.runs > 0 ? ` ${pipeline.runs} ${pipeline.runs === 1 ? "candidate is" : "candidates are"} already in progress; they keep the rounds they started with.` : ""}
                    </p>
                )}
            </div>
        </div>
    )
}
