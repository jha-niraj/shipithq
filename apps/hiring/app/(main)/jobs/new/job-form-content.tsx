"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Plus, Save, Send, Sparkles, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { NumberTextInput } from "@repo/ui/components/ui/number-text-input"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { StickyActionBar } from "@repo/ui/components/ui/sticky-action-bar"
import { Switch } from "@repo/ui/components/ui/switch"
import { TagInput } from "@repo/ui/components/ui/tag-input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import toast from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import type { OptionKind } from "@repo/db/option-builtins"
import { createJob, updateJob } from "@/actions/jobs"
import { getPipelineChoices, type JobPipeline, type PipelineChoice } from "@/actions/jobs/job-pipeline.action"
import { draftPipelineWithAI } from "@/actions/pipelines/pipeline-builder.action"
import { createJobSchema } from "@/types/job-schema"
import type { CustomQuestion, EmploymentType, JobLocationType } from "@/types"
import { ExistingJobPipeline, NewJobPipeline, suggestTemplate } from "./pipeline-section"

/*
 * Create or edit a job (plan/hiring-ui HU-5, Niraj 2026-09-27): five steps, the
 * pipeline first, a sticky bar with the actions on every step, and as little
 * typing as possible: predictable values are selects with "Other" (new values join
 * the shared dataset when saved), numbers are validated text, skills and benefits
 * are keyboard tag inputs. The step lives in the URL, so a refresh stays on it.
 */

/** A saved job, for the form in edit mode (the /jobs/[slug]/edit page). */
export interface EditableJob {
    id: string
    slug: string
    status: string
    title: string
    description: string
    department: string | null
    location: string | null
    locationType: JobLocationType
    employmentType: EmploymentType
    experienceMin: number | null
    experienceMax: number | null
    salaryMin: number | null
    salaryMax: number | null
    salaryCurrency: string
    salaryDisclosed: boolean
    skillsRequired: string[]
    skillsPreferred: string[]
    requirements: string[]
    responsibilities: string[]
    benefits: string[]
    hasAssignment: boolean
    assignmentDetails: { title?: string; description?: string } | null
    assignmentDeadlineDays: number | null
    customQuestions: CustomQuestion[]
}

export type JobFormOptions = Record<Extract<OptionKind, "job_title" | "department" | "location" | "skill" | "benefit">, string[]>

interface JobFormContentProps {
    pipelineChoices: PipelineChoice[]
    options: JobFormOptions
    job?: EditableJob
    jobPipeline?: JobPipeline | null
}

interface FormState {
    title: string
    description: string
    department: string
    location: string
    locationType: JobLocationType
    employmentType: EmploymentType
    experienceMin: number | null
    experienceMax: number | null
    salaryMin: number | null
    salaryMax: number | null
    salaryCurrency: string
    salaryDisclosed: boolean
    skillsRequired: string[]
    skillsPreferred: string[]
    requirements: string[]
    responsibilities: string[]
    benefits: string[]
    interviewProcessId: string
}

const STEPS = [
    { key: "pipeline", title: "Pipeline", hint: "The rounds candidates take" },
    { key: "job", title: "The job", hint: "Title, team and what it is" },
    { key: "place", title: "Location and pay", hint: "Where, how and how much" },
    { key: "details", title: "Skills and details", hint: "What it needs and offers" },
    { key: "review", title: "Review", hint: "Check it, then publish" },
] as const
type StepKey = (typeof STEPS)[number]["key"]

const LOCATION_TYPES: { value: JobLocationType; label: string }[] = [
    { value: "REMOTE", label: "Remote" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "ONSITE", label: "On-site" },
]

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
    { value: "FULL_TIME", label: "Full-time" },
    { value: "PART_TIME", label: "Part-time" },
    { value: "CONTRACT", label: "Contract" },
    { value: "INTERNSHIP", label: "Internship" },
    { value: "FREELANCE", label: "Freelance" },
]

/** Experience as a choice; "Custom" opens two year fields. */
const EXPERIENCE = [
    { label: "Fresher (0-1 years)", min: 0, max: 1 },
    { label: "Junior (1-3 years)", min: 1, max: 3 },
    { label: "Mid-level (3-5 years)", min: 3, max: 5 },
    { label: "Senior (5-8 years)", min: 5, max: 8 },
    { label: "Lead (8-12 years)", min: 8, max: 12 },
    { label: "Principal (12+ years)", min: 12, max: 20 },
]

const CURRENCIES = [
    { value: "INR", label: "₹ INR" },
    { value: "USD", label: "$ USD" },
    { value: "EUR", label: "€ EUR" },
    { value: "GBP", label: "£ GBP" },
]

/** Sentences, one per line item: requirements and responsibilities. */
function LineList({ label, placeholder, items, onChange }: { label: string; placeholder: string; items: string[]; onChange: (v: string[]) => void }) {
    const [value, setValue] = useState("")
    const add = () => {
        const v = value.replace(/\s+/g, " ").trim().slice(0, 300)
        if (v && !items.includes(v)) onChange([...items, v])
        setValue("")
    }
    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <div className="flex gap-2">
                <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={300}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
                <Button type="button" variant="outline" size="icon" onClick={add} aria-label={`Add to ${label}`}><Plus className="h-4 w-4" /></Button>
            </div>
            {items.length > 0 && (
                <ul className="space-y-1.5">
                    {items.map((item, i) => (
                        <li key={item} className="flex items-start gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                            <span className="mt-0.5 font-mono text-xs text-neutral-400">{i + 1}</span>
                            <span className="flex-1">{item}</span>
                            <button type="button" onClick={() => onChange(items.filter((x) => x !== item))} aria-label="Remove" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><X className="h-3.5 w-3.5" /></button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
            {children}
            {error ? <p className="text-xs text-neutral-900 dark:text-white" role="alert">{error}</p> : hint ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
        </div>
    )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-5">
                <h2 className="font-semibold text-neutral-900 dark:text-white">{title}</h2>
                {hint && <p className="text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    )
}

export default function JobFormContent({ pipelineChoices, options, job, jobPipeline }: JobFormContentProps) {
    const router = useRouter()
    const pathname = usePathname()
    const search = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [choices, setChoices] = useState(pipelineChoices)
    const [pipelineTouched, setPipelineTouched] = useState(false)

    const stepIndex = Math.max(0, STEPS.findIndex((s) => s.key === (search.get("step") as StepKey)))
    const step = STEPS[stepIndex]!
    const goTo = (i: number) => {
        const params = new URLSearchParams(search.toString())
        params.set("step", STEPS[i]!.key)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        document.querySelector("[data-app-page]")?.scrollTo?.({ top: 0 })
    }

    const [f, setF] = useState<FormState>(() => job ? {
        title: job.title, description: job.description, department: job.department ?? "", location: job.location ?? "",
        locationType: job.locationType, employmentType: job.employmentType,
        experienceMin: job.experienceMin, experienceMax: job.experienceMax,
        salaryMin: job.salaryMin, salaryMax: job.salaryMax, salaryCurrency: job.salaryCurrency || "INR", salaryDisclosed: job.salaryDisclosed,
        skillsRequired: job.skillsRequired, skillsPreferred: job.skillsPreferred, requirements: job.requirements,
        responsibilities: job.responsibilities, benefits: job.benefits, interviewProcessId: "",
    } : {
        title: "", description: "", department: "", location: "", locationType: "REMOTE", employmentType: "FULL_TIME",
        experienceMin: null, experienceMax: null, salaryMin: null, salaryMax: null, salaryCurrency: "INR", salaryDisclosed: true,
        skillsRequired: [], skillsPreferred: [], requirements: [], responsibilities: [], benefits: [],
        interviewProcessId: choices.find((c) => !c.byShipItHQ)?.id ?? suggestTemplate("", choices),
    })
    // Leaving with unsaved changes asks first (a refresh or closing the tab; links inside
    // the app are the sticky bar's own Back and the header link).
    const [saved, setSaved] = useState(() => JSON.stringify(f))
    const dirty = JSON.stringify(f) !== saved
    useEffect(() => {
        if (!dirty) return
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [dirty])

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
        setF((p) => ({ ...p, [k]: v }))
        if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }))
    }

    // Until the company picks a pipeline, it follows the title's closest ShipItHQ template.
    useEffect(() => {
        if (job || pipelineTouched || !f.title) return
        const own = choices.some((c) => !c.byShipItHQ && c.id === f.interviewProcessId)
        if (own) return
        const next = suggestTemplate(f.title, choices)
        if (next && next !== f.interviewProcessId) setF((p) => ({ ...p, interviewProcessId: next }))
    }, [f.title, f.interviewProcessId, job, pipelineTouched, choices])

    const experiencePreset = EXPERIENCE.find((e) => e.min === f.experienceMin && e.max === f.experienceMax)?.label
        ?? (f.experienceMin === null && f.experienceMax === null ? "" : "Custom")

    /** What blocks leaving each step. Publishing checks every step. */
    const stepErrors = (key: StepKey): Record<string, string> => {
        const e: Record<string, string> = {}
        if (key === "pipeline" && !job && !f.interviewProcessId) e.interviewProcessId = "Pick the rounds candidates take, or draft them with AI."
        if (key === "job") {
            if (f.title.trim().length < 3) e.title = "Give the job a title (3 characters or more)."
            if (f.description.trim().length < 50) e.description = `Describe the job in at least 50 characters (${f.description.trim().length} so far).`
        }
        if (key === "place") {
            if (f.experienceMin !== null && f.experienceMax !== null && f.experienceMin > f.experienceMax) e.experienceMax = "The maximum is below the minimum."
            if (f.salaryMin !== null && f.salaryMax !== null && f.salaryMin > f.salaryMax) e.salaryMax = "The maximum is below the minimum."
            if (f.locationType !== "REMOTE" && !f.location.trim()) e.location = "Where is the office? Pick a city or type your own."
        }
        if (key === "details" && f.skillsRequired.length === 0) e.skillsRequired = "Add at least one required skill."
        return e
    }
    const next = () => {
        const e = stepErrors(step.key)
        if (Object.keys(e).length) { setErrors(e); toast.error(Object.values(e)[0]!); return }
        goTo(Math.min(stepIndex + 1, STEPS.length - 1))
    }

    const payload = () => ({
        title: f.title.trim(), description: f.description.trim(), department: f.department.trim() || undefined,
        locationType: f.locationType, employmentType: f.employmentType,
        location: f.locationType === "REMOTE" ? (f.location.trim() || undefined) : f.location.trim() || undefined,
        experienceMin: f.experienceMin ?? undefined, experienceMax: f.experienceMax ?? undefined,
        salaryMin: f.salaryMin ?? undefined, salaryMax: f.salaryMax ?? undefined,
        salaryCurrency: f.salaryCurrency, salaryDisclosed: f.salaryDisclosed,
        skillsRequired: f.skillsRequired, skillsPreferred: f.skillsPreferred,
        requirements: f.requirements, responsibilities: f.responsibilities, benefits: f.benefits,
    })

    const submit = (status?: "DRAFT" | "ACTIVE") => {
        if (status === "ACTIVE") {
            // Every step must pass to publish; the first failing one opens.
            for (const [i, s] of STEPS.entries()) {
                const e = stepErrors(s.key)
                if (Object.keys(e).length) { setErrors(e); goTo(i); toast.error(Object.values(e)[0]!); return }
            }
            const parsed = createJobSchema.safeParse({ ...payload(), location: payload().location ?? null, interviewProcessId: f.interviewProcessId || null })
            if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Check the job's details"); return }
        } else if (f.title.trim().length < 3) {
            setErrors({ title: "A draft needs a title." }); goTo(1); toast.error("A draft needs a title."); return
        }
        startTransition(async () => {
            if (job) {
                const r = await updateJob(job.id, { ...payload(), ...(status === "ACTIVE" ? { status } : {}) })
                if (!r.success) { toast.error(r.error || "Could not save the job"); return }
                toast.success(status === "ACTIVE" ? "Job published" : "Changes saved")
                setSaved(JSON.stringify(f))
                router.refresh()
                return
            }
            const r = await createJob({
                ...payload(),
                // A draft may be saved before its description is long enough; publishing needs it.
                description: f.description.trim() || "To be written.",
                interviewProcessId: f.interviewProcessId || undefined,
                status: status ?? "DRAFT",
            })
            if (!r.success) { toast.error(r.error || "Could not create the job"); return }
            toast.success(status === "ACTIVE" ? "Job published" : "Saved as a draft")
            setSaved(JSON.stringify(f))
            router.push("/jobs")
        })
    }

    const live = job?.status === "ACTIVE"
    const last = stepIndex === STEPS.length - 1

    return (
        <div className="page-frame px-page pt-6">
            <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Jobs
            </Link>
            <div className="mt-3">
                <PageHeader
                    title={job ? job.title : "New job"}
                    subtitle={job ? (live ? "Live: changes show to candidates once saved." : "Draft: not visible to candidates yet.") : "Five short steps. Save a draft at any point."}
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
                {/* The steps: a column on desktop, a row on phones. */}
                <nav aria-label="Steps" className="lg:sticky lg:top-4 lg:self-start">
                    <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
                        {STEPS.map((s, i) => {
                            const done = i < stepIndex
                            const current = i === stepIndex
                            return (
                                <li key={s.key} className="shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => (i <= stepIndex ? goTo(i) : next())}
                                        aria-current={current ? "step" : undefined}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                                            current ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                                        )}
                                    >
                                        <span className={cn(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                            done || current ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 text-neutral-500 dark:border-neutral-700",
                                        )}>
                                            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-neutral-900 dark:text-white">{s.title}</span>
                                            <span className="hidden text-xs text-neutral-500 lg:block dark:text-neutral-400">{s.hint}</span>
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ol>
                </nav>

                <div className="min-w-0 space-y-5 pb-4">
                    {step.key === "pipeline" && (
                        <Card title="The rounds candidates take" hint="Every candidate takes the same rounds, in order, with a pass mark for each. The job gets its own copy you can change later.">
                            {job ? (
                                <ExistingJobPipeline jobId={job.id} jobSlug={job.slug} jobStatus={job.status} pipeline={jobPipeline ?? null} choices={choices} />
                            ) : (
                                <>
                                    <NewJobPipeline choices={choices} value={f.interviewProcessId} onChange={(id) => { setPipelineTouched(true); set("interviewProcessId", id) }} />
                                    {errors.interviewProcessId && <p className="text-xs text-neutral-900 dark:text-white">{errors.interviewProcessId}</p>}
                                    <DraftPipeline onDrafted={async (id) => {
                                        const fresh = await getPipelineChoices()
                                        if (fresh.success) setChoices(fresh.data)
                                        setPipelineTouched(true)
                                        set("interviewProcessId", id)
                                    }} />
                                </>
                            )}
                        </Card>
                    )}

                    {step.key === "job" && (
                        <Card title="The job" hint="What candidates see first.">
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="Job title" error={errors.title} hint="Pick one or type your own.">
                                    <OptionSelect value={f.title} onChange={(v) => set("title", v)} options={options.job_title} placeholder="e.g. Backend Engineer" aria-invalid={Boolean(errors.title)} />
                                </Field>
                                <Field label="Team" hint="Optional.">
                                    <OptionSelect value={f.department} onChange={(v) => set("department", v)} options={options.department} placeholder="e.g. Engineering" />
                                </Field>
                                <Field label="Employment type">
                                    <Select value={f.employmentType} onValueChange={(v) => set("employmentType", v as EmploymentType)}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>
                            </div>
                            <Field label="What the job is" error={errors.description} hint={`${f.description.trim().length} characters; at least 50 to publish.`}>
                                <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={7} maxLength={8000}
                                    placeholder="What the person will build, the team they'll join, and what makes it worth doing." aria-invalid={Boolean(errors.description)} />
                            </Field>
                        </Card>
                    )}

                    {step.key === "place" && (
                        <>
                            <Card title="Where">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field label="Work type">
                                        <div role="radiogroup" className="grid grid-cols-3 gap-2">
                                            {LOCATION_TYPES.map((t) => (
                                                <button key={t.value} type="button" role="radio" aria-checked={f.locationType === t.value} onClick={() => set("locationType", t.value)}
                                                    className={cn("h-10 rounded-md border text-sm", f.locationType === t.value ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800")}>
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label={f.locationType === "REMOTE" ? "Location (optional)" : "Location"} error={errors.location}>
                                        <OptionSelect value={f.location} onChange={(v) => set("location", v)} options={options.location} placeholder="Pick a city" aria-invalid={Boolean(errors.location)} />
                                    </Field>
                                </div>
                            </Card>
                            <Card title="Experience">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field label="Level">
                                        <Select value={experiencePreset || undefined} onValueChange={(v) => {
                                            const p = EXPERIENCE.find((e) => e.label === v)
                                            if (p) { set("experienceMin", p.min); set("experienceMax", p.max) } else { set("experienceMin", f.experienceMin ?? 0); set("experienceMax", f.experienceMax ?? 2) }
                                        }}>
                                            <SelectTrigger className="h-10"><SelectValue placeholder="Any experience" /></SelectTrigger>
                                            <SelectContent>
                                                {EXPERIENCE.map((e) => <SelectItem key={e.label} value={e.label}>{e.label}</SelectItem>)}
                                                <SelectItem value="Custom">Custom range</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    {experiencePreset === "Custom" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="From"><NumberTextInput value={f.experienceMin} onChange={(v) => set("experienceMin", v)} min={0} max={50} suffix="years" aria-label="Minimum years" /></Field>
                                            <Field label="To" error={errors.experienceMax}><NumberTextInput value={f.experienceMax} onChange={(v) => set("experienceMax", v)} min={0} max={50} suffix="years" aria-label="Maximum years" /></Field>
                                        </div>
                                    )}
                                </div>
                            </Card>
                            <Card title="Pay" hint="Per year. Candidates see it only when you show it.">
                                <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                                    <Field label="Currency">
                                        <Select value={f.salaryCurrency} onValueChange={(v) => set("salaryCurrency", v)}>
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label="From"><NumberTextInput value={f.salaryMin} onChange={(v) => set("salaryMin", v)} min={0} max={1_000_000_000} grouped placeholder="e.g. 8,00,000" aria-label="Minimum pay" /></Field>
                                    <Field label="To" error={errors.salaryMax}><NumberTextInput value={f.salaryMax} onChange={(v) => set("salaryMax", v)} min={0} max={1_000_000_000} grouped placeholder="e.g. 15,00,000" aria-label="Maximum pay" /></Field>
                                </div>
                                <label className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                                    <Switch checked={f.salaryDisclosed} onCheckedChange={(v) => set("salaryDisclosed", v)} /> Show the pay to candidates
                                </label>
                            </Card>
                        </>
                    )}

                    {step.key === "details" && (
                        <>
                            <Card title="Skills" hint="Arrows to move, Enter to add, Backspace to remove the last one.">
                                <Field label="Required" error={errors.skillsRequired}>
                                    <TagInput values={f.skillsRequired} onChange={(v) => set("skillsRequired", v)} suggestions={options.skill} placeholder="e.g. TypeScript" />
                                </Field>
                                <Field label="Nice to have">
                                    <TagInput values={f.skillsPreferred} onChange={(v) => set("skillsPreferred", v)} suggestions={options.skill.filter((s) => !f.skillsRequired.includes(s))} placeholder="e.g. Kubernetes" />
                                </Field>
                            </Card>
                            <Card title="Details">
                                <LineList label="Requirements" placeholder="One requirement, then Enter" items={f.requirements} onChange={(v) => set("requirements", v)} />
                                <LineList label="Responsibilities" placeholder="One responsibility, then Enter" items={f.responsibilities} onChange={(v) => set("responsibilities", v)} />
                                <Field label="Benefits">
                                    <TagInput values={f.benefits} onChange={(v) => set("benefits", v)} suggestions={options.benefit} placeholder="e.g. Health insurance" />
                                </Field>
                            </Card>
                        </>
                    )}

                    {step.key === "review" && <Review f={f} choices={choices} jobPipeline={jobPipeline ?? null} editing={Boolean(job)} onEdit={goTo} />}
                </div>
            </div>

            <StickyActionBar>
                <Button type="button" variant="ghost" onClick={() => goTo(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0 || isPending} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">Step {stepIndex + 1} of {STEPS.length}: {step.title}</span>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => submit(job ? undefined : "DRAFT")} disabled={isPending} className="gap-1.5">
                        {isPending ? <InlineLoader size="sm" /> : <Save className="h-4 w-4" />} {job ? "Save changes" : "Save draft"}
                    </Button>
                    {last ? (
                        !live && <Button type="button" onClick={() => submit("ACTIVE")} disabled={isPending} className="gap-1.5"><Send className="h-4 w-4" /> Publish</Button>
                    ) : (
                        <Button type="button" onClick={next} disabled={isPending} className="gap-1.5">Next <ArrowRight className="h-4 w-4" /></Button>
                    )}
                </div>
            </StickyActionBar>
        </div>
    )
}

/** Draft a pipeline with the company AI without leaving the job (the same action as on Pipelines). */
function DraftPipeline({ onDrafted }: { onDrafted: (id: string) => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [role, setRole] = useState("")
    const [details, setDetails] = useState("")
    const [busy, setBusy] = useState(false)
    const draft = async () => {
        setBusy(true)
        const r = await draftPipelineWithAI({ role, details })
        if (!r.success) { setBusy(false); toast.error(r.error); return }
        await onDrafted(r.data.id)
        setBusy(false)
        setOpen(false)
        toast.success("Drafted. It's selected; review its rounds on Pipelines any time.")
    }
    if (!open) {
        return (
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">None fit?</span>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Sparkles className="h-4 w-4" /> Draft one with AI</Button>
                <Button asChild type="button" variant="ghost" size="sm"><Link href="/pipelines">Build one on Pipelines</Link></Button>
            </div>
        )
    }
    return (
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <Field label="The role" hint="Like &quot;Backend engineer (1-3 years)&quot;.">
                <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Backend engineer (1-3 years)" />
            </Field>
            <Field label="Anything it should know (optional)">
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000} placeholder="The stack, what the team builds, what matters most." />
            </Field>
            <div className="flex gap-2">
                <Button type="button" size="sm" className="gap-1.5" disabled={busy || role.trim().length < 2} onClick={() => void draft()}>{busy ? <InlineLoader size="sm" /> : <Sparkles className="h-4 w-4" />} Draft the rounds</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
        </div>
    )
}

function Review({ f, choices, jobPipeline, editing, onEdit }: { f: FormState; choices: PipelineChoice[]; jobPipeline: JobPipeline | null; editing: boolean; onEdit: (i: number) => void }) {
    const pipe = editing ? jobPipeline : choices.find((c) => c.id === f.interviewProcessId)
    const money = (n: number | null) => (n === null ? null : n.toLocaleString("en-IN"))
    const pay = f.salaryMin !== null || f.salaryMax !== null ? `${f.salaryCurrency} ${[money(f.salaryMin), money(f.salaryMax)].filter(Boolean).join(" to ")}${f.salaryDisclosed ? "" : " (hidden)"}` : "Not given"
    const rows = useMemo(() => [
        { step: 0, label: "Pipeline", value: pipe ? `${pipe.name}, ${pipe.rounds.length} rounds` : "None picked" },
        { step: 1, label: "Title", value: f.title || "Missing" },
        { step: 1, label: "Team", value: f.department || "Not set" },
        { step: 1, label: "Employment", value: EMPLOYMENT_TYPES.find((t) => t.value === f.employmentType)?.label ?? f.employmentType },
        { step: 2, label: "Work type", value: `${LOCATION_TYPES.find((t) => t.value === f.locationType)?.label}${f.location ? `, ${f.location}` : ""}` },
        { step: 2, label: "Experience", value: f.experienceMin === null && f.experienceMax === null ? "Any" : `${f.experienceMin ?? 0} to ${f.experienceMax ?? "any"} years` },
        { step: 2, label: "Pay", value: pay },
        { step: 3, label: "Skills", value: f.skillsRequired.length ? f.skillsRequired.join(", ") : "Missing" },
        { step: 3, label: "Benefits", value: f.benefits.length ? f.benefits.join(", ") : "None listed" },
    ], [f, pipe, pay])
    return (
        <Card title="Review" hint="Candidates see this. Change anything by opening its step.">
            <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-start gap-4 py-2.5">
                        <dt className="w-28 shrink-0 text-sm text-neutral-500 dark:text-neutral-400">{r.label}</dt>
                        <dd className="min-w-0 flex-1 text-sm text-neutral-900 dark:text-white">{r.value}</dd>
                        <button type="button" onClick={() => onEdit(r.step)} className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">Edit</button>
                    </div>
                ))}
            </dl>
            {f.description && <p className="whitespace-pre-line rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{f.description}</p>}
        </Card>
    )
}
