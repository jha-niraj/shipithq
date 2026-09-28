"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronRight, CircleAlert, Clock, Layers, Plus, Sparkles, Workflow } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { TabsNav } from "@repo/ui/components/ui/tabs"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { createPipeline, draftPipelineWithAI } from "@/actions/pipelines/pipeline-builder.action"
import { ROUND_TYPE_LABEL, type PipelineSummary, type TemplateSummary, type V1RoundType } from "@/types/pipeline"

/*
 * Interview pipelines (plan/hiring-rounds HR-10, plan/hiring-ui HU-7): tabs for
 * the company's own pipelines, ShipItHQ's templates and the jobs students
 * imported, and three ways to make one - drafted by AI from a role, empty, or
 * copied from a template. Each opens in the builder.
 */

type Panel = "new" | "ai" | null
export type PipelinesTab = "yours" | "templates" | "imported"

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`)

export function PipelinesList({ tab, pipelines, templates, canManage, aiDraftsLeft, loadError, imported, importedCount }: {
    tab: PipelinesTab
    pipelines: PipelineSummary[]
    templates: TemplateSummary[]
    canManage: boolean
    aiDraftsLeft: number
    loadError: string | null
    imported: React.ReactNode
    importedCount: number
}) {
    const router = useRouter()
    const [panel, setPanel] = useState<Panel>(null)
    const [name, setName] = useState("")
    const [role, setRole] = useState("")
    const [details, setDetails] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const open = (id: string) => startTransition(() => router.push(`/pipelines/${id}`))

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
                title="Pipelines"
                subtitle="The rounds a candidate takes for a job, with a pass mark for each. Every job uses one."
                // Tabs on the right of the header row (CLAUDE.md, Niraj 2026-09-29): the shared TabsNav.
                tabs={
                    <TabsNav
                        aria-label="Pipelines"
                        items={([
                            { key: "yours", label: "Your pipelines", count: pipelines.length },
                            { key: "templates", label: "ShipItHQ templates", count: templates.length },
                            ...(importedCount > 0 ? [{ key: "imported", label: "Imported by students", count: importedCount }] : []),
                        ] as { key: PipelinesTab; label: string; count: number }[]).map((t) => ({
                            href: t.key === "yours" ? "/pipelines" : `/pipelines?tab=${t.key}`,
                            active: tab === t.key,
                            label: <>{t.label}<span className="ml-1.5 text-xs tabular-nums opacity-60">{t.count}</span></>,
                        }))}
                    />
                }
                actions={canManage ? (
                    // One control in two halves: the AI draft first (the quicker start), then an empty pipeline.
                    <div className="inline-flex overflow-hidden rounded-lg border border-neutral-900 dark:border-white" role="group" aria-label="Make a pipeline">
                        <button type="button" aria-pressed={panel === "ai"} onClick={() => setPanel(panel === "ai" ? null : "ai")}
                            className={cn("inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-medium", panel === "ai" ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900" : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200")}>
                            <Sparkles className="h-4 w-4" /> Draft with AI
                        </button>
                        <button type="button" aria-pressed={panel === "new"} onClick={() => setPanel(panel === "new" ? null : "new")}
                            className={cn("inline-flex h-9 items-center gap-1.5 border-l border-neutral-900 px-3.5 text-sm font-medium dark:border-white", panel === "new" ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white" : "bg-white text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-900")}>
                            <Plus className="h-4 w-4" /> Blank pipeline
                        </button>
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

            {tab === "yours" && <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-900 dark:border-neutral-800 dark:text-white">Your pipelines</div>
                {loadError ? (
                    <p className="px-5 py-8 text-sm text-rose-700 dark:text-rose-400">{loadError}</p>
                ) : pipelines.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                        No pipelines yet. <Link href="/pipelines?tab=templates" className="font-medium text-neutral-900 underline underline-offset-2 dark:text-white">Start from a ShipItHQ template</Link>, draft one with AI, or build one from scratch.
                    </p>
                ) : (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {pipelines.map((p) => (
                            <li key={p.id}>
                                <Link href={`/pipelines/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
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
            </section>}

            {tab === "templates" && (
                <section className="space-y-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Built by ShipItHQ for common roles. Using one makes a copy that&apos;s yours to change; the template stays as it is.</p>
                    {templates.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-8 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">No templates yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {templates.map((t) => {
                                const total = t.rounds.reduce((n, r) => n + (r.durationMinutes ?? 0), 0)
                                return (
                                    <article key={t.id} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold text-neutral-900 dark:text-white">{t.name}</h3>
                                            <span className="shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">ShipItHQ</span>
                                        </div>
                                        {t.description && <p className="mt-1.5 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{t.description}</p>}
                                        <p className="mt-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                                            <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.rounds.length} {t.rounds.length === 1 ? "round" : "rounds"}</span>
                                            {total > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> about {minutes(total)}</span>}
                                        </p>
                                        <ol className="mt-3 flex flex-1 flex-wrap content-start items-center gap-1.5">
                                            {t.rounds.map((r, i) => (
                                                <li key={i} className="inline-flex items-center gap-1.5">
                                                    {i > 0 && <ChevronRight className="h-3 w-3 text-neutral-300 dark:text-neutral-600" aria-hidden />}
                                                    <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                                                        {ROUND_TYPE_LABEL[r.roundType as V1RoundType] ?? r.title}
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                        {canManage && (
                                            <Button
                                                className="mt-5 w-full gap-1.5"
                                                disabled={busy !== null}
                                                onClick={() => void create(`tpl-${t.id}`, () => createPipeline({ name: t.name, fromTemplateId: t.id }))}
                                            >
                                                {busy === `tpl-${t.id}` ? <InlineLoader size="sm" /> : null} Use this template {busy !== `tpl-${t.id}` && <ArrowRight className="h-4 w-4" />}
                                            </Button>
                                        )}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            )}

            {tab === "imported" && imported}
        </div>
    )
}
