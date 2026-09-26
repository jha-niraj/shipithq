"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, CircleAlert, Layers, Plus, Sparkles, Workflow } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { createPipeline, draftPipelineWithAI } from "@/actions/interview-config/pipeline-builder.action"
import { ROUND_TYPE_LABEL, type PipelineSummary, type TemplateSummary, type V1RoundType } from "@/types/pipeline"

/*
 * Interview pipelines (plan/hiring-rounds HR-10): the company's pipelines, and
 * three ways to make one - empty, drafted by AI from a role, or copied from one
 * of ShipItHQ's templates. Each opens in the builder.
 */

type Panel = "new" | "ai" | null

export function PipelinesList({ pipelines, templates, canManage, aiDraftsLeft, loadError }: {
    pipelines: PipelineSummary[]
    templates: TemplateSummary[]
    canManage: boolean
    aiDraftsLeft: number
    loadError: string | null
}) {
    const router = useRouter()
    const [panel, setPanel] = useState<Panel>(null)
    const [name, setName] = useState("")
    const [role, setRole] = useState("")
    const [details, setDetails] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const open = (id: string) => startTransition(() => router.push(`/interview-config/${id}`))

    const create = async (key: string, fn: () => Promise<{ success: true; data: { id: string } } | { success: false; error: string }>) => {
        setBusy(key)
        setError(null)
        const r = await fn()
        if (!r.success) { setError(r.error); setBusy(null); return }
        open(r.data.id)
    }

    const jobsUsing = pipelines.reduce((n, p) => n + p.jobsUsing, 0)
    const legacy = pipelines.reduce((n, p) => n + p.legacyCount, 0)

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Interview pipelines"
                subtitle="The rounds a candidate takes for a role, with a pass mark for each. Every job uses one."
                actions={canManage ? (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPanel(panel === "ai" ? null : "ai")}>
                            <Sparkles className="h-4 w-4" /> Draft with AI
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => setPanel(panel === "new" ? null : "new")}>
                            <Plus className="h-4 w-4" /> New pipeline
                        </Button>
                    </div>
                ) : undefined}
            />

            <StatBand
                cols={3}
                items={[
                    { icon: Workflow, label: "Pipelines", value: pipelines.length },
                    { icon: Layers, label: "Jobs using one", value: jobsUsing },
                    { icon: CircleAlert, label: "Legacy rounds to update", value: legacy, tone: legacy ? "rose" : "neutral" },
                ]}
            />

            {panel === "new" && (
                <form
                    onSubmit={(e) => { e.preventDefault(); void create("new", () => createPipeline({ name })) }}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                    <label htmlFor="pl-name" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">Name the pipeline</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Backend engineer (1-3 years)" maxLength={80} autoFocus />
                        <Button type="submit" disabled={busy !== null || !name.trim()} className="gap-1.5">
                            {busy === "new" && <InlineLoader size="sm" />} Create and open
                        </Button>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">It starts empty; add rounds in the builder.</p>
                </form>
            )}

            {panel === "ai" && (
                <form
                    onSubmit={(e) => { e.preventDefault(); void create("ai", () => draftPipelineWithAI({ role, details })) }}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="ai-role" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">The role</label>
                            <Input id="ai-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend intern, React" maxLength={80} autoFocus />
                        </div>
                        <div>
                            <label htmlFor="ai-details" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
                                What matters for it <span className="font-normal text-neutral-500">(optional)</span>
                            </label>
                            <Textarea id="ai-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000}
                                placeholder="The stack, the level, what the first 3 months look like, what you screen out." />
                        </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            The AI suggests rounds, pass marks and time limits; you edit them before any job uses it. {aiDraftsLeft} {aiDraftsLeft === 1 ? "draft" : "drafts"} left today.
                        </p>
                        <Button type="submit" disabled={busy !== null || role.trim().length < 2 || aiDraftsLeft <= 0} className="gap-1.5">
                            {busy === "ai" && <InlineLoader size="sm" />} {busy === "ai" ? "Drafting" : "Draft pipeline"}
                        </Button>
                    </div>
                </form>
            )}

            {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900 dark:border-neutral-800 dark:text-white">Your pipelines</div>
                {loadError ? (
                    <p className="px-5 py-8 text-sm text-rose-700 dark:text-rose-400">{loadError}</p>
                ) : pipelines.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                        No pipelines yet. Start from one of ShipItHQ&apos;s below, draft one with AI, or build one from scratch.
                    </p>
                ) : (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {pipelines.map((p) => (
                            <li key={p.id}>
                                <Link href={`/interview-config/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-neutral-900 dark:text-white">{p.name}</p>
                                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                                            {p.roundCount} {p.roundCount === 1 ? "round" : "rounds"} · {p.gatedCount} gated · {p.jobsUsing} {p.jobsUsing === 1 ? "job" : "jobs"}
                                            {p.legacyCount > 0 && <span className="text-rose-700 dark:text-rose-400"> · {p.legacyCount} legacy to update</span>}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {templates.length > 0 && (
                <section>
                    <div className="mb-3">
                        <h2 className="text-sm font-medium text-neutral-900 dark:text-white">Start from a ShipItHQ template</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">A copy is yours to change; the template stays as it is.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {templates.map((t) => (
                            <div key={t.id} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <p className="font-medium text-neutral-900 dark:text-white">{t.name}</p>
                                {t.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{t.description}</p>}
                                <ol className="mt-3 flex-1 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                                    {t.rounds.map((r, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="w-4 shrink-0 font-mono text-xs leading-5 text-neutral-400">{i + 1}</span>
                                            <span className="truncate">{ROUND_TYPE_LABEL[r.roundType as V1RoundType] ?? r.title}</span>
                                        </li>
                                    ))}
                                </ol>
                                {canManage && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn("mt-4 gap-1.5")}
                                        disabled={busy !== null}
                                        onClick={() => void create(`tpl-${t.id}`, () => createPipeline({ name: t.name, fromTemplateId: t.id }))}
                                    >
                                        {busy === `tpl-${t.id}` && <InlineLoader size="sm" />} Use this template
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
