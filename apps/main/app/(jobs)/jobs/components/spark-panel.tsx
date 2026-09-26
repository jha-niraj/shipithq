"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import {
    ArrowUpRight, Briefcase, Building2, CalendarDays, Check, ChevronDown, ChevronUp,
    FileText, ListOrdered, Play, RotateCcw, Sparkles, Bookmark, X,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"
import type { FeedJobResult } from "@/actions/jobs"

/*
 * One job, as a panel on the page (plan/jobs JB-18). Laid out like a request
 * inspector:
 * - a header
 * - a stat strip of three cells divided by rules
 * - sections of an uppercase label row over a banded value row
 * - a footer with the counter, the arrows and the two decisions
 * It replaced the swipe card: the whole job is readable, and moving on is a
 * key press, not a throw.
 */

const LOCATION_TYPE: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" }
const EMPLOYMENT_TYPE: Record<string, string> = {
    FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance",
}
const ROUND_TYPE: Record<string, string> = {
    PHONE_SCREEN: "Screen", TECHNICAL_CODING: "Coding", SYSTEM_DESIGN: "System design", BEHAVIORAL: "Behavioural",
    TAKE_HOME: "Take-home", PANEL: "Panel", HIRING_MANAGER: "Hiring manager", CULTURE_FIT: "Culture", HR_FINAL: "HR",
    CUSTOM: "Round", APTITUDE: "Aptitude", DSA: "DSA", VOICE_BEHAVIOURAL: "Behavioural", VOICE_CULTURE: "Culture",
}

function formatSalary(job: FeedJobResult): string | null {
    const { salaryMin: min, salaryMax: max, salaryCurrency, salaryDisclosed } = job
    if (!salaryDisclosed || (!min && !max)) return null
    const f = new Intl.NumberFormat("en-IN", { style: "currency", currency: salaryCurrency || "INR", maximumFractionDigits: 0 })
    if (min && max) return `${f.format(min)} - ${f.format(max)}`
    return min ? `From ${f.format(min)}` : `Up to ${f.format(max!)}`
}

function formatExperience(min: number | null, max: number | null): string | null {
    if (min === null && max === null) return null
    if (min !== null && max !== null) return min === max ? `${min} years` : `${min}-${max} years`
    return min !== null ? `${min}+ years` : `Up to ${max} years`
}

const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

interface SparkPanelProps {
    job: FeedJobResult
    /** 1-based position, and how many there are in all. */
    position: number
    total: number
    canPrev: boolean
    canNext: boolean
    onPrev: () => void
    onNext: () => void
    onSave: () => void
    onSkip: () => void
    onUndo: (() => void) | null
    busy?: boolean
}

export function SparkPanel({ job, position, total, canPrev, canNext, onPrev, onNext, onSave, onSkip, onUndo, busy }: SparkPanelProps) {
    const salary = formatSalary(job)
    const experience = formatExperience(job.experienceMin, job.experienceMax)
    const strong = job.matchScore >= 70
    const process = job.interviewProcess

    return (
        <section
            aria-label={`${job.title} at ${job.company.name}, ${position} of ${total}`}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        >
            {/* Header */}
            <header className="flex items-start gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-neutral-800">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                    {job.company.logoUrl
                        ? <Image src={job.company.logoUrl} alt="" fill sizes="44px" className="object-cover" />
                        : <Building2 className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug text-neutral-900 sm:text-lg dark:text-white">
                        {job.title}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                        {job.company.name}
                        {job.company.industry && <> · {job.company.industry}</>}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {job.isSaved && (
                        <span className="hidden items-center gap-1 text-xs font-medium text-neutral-600 sm:inline-flex dark:text-neutral-300">
                            <Bookmark className="h-3.5 w-3.5 fill-current" /> Saved
                        </span>
                    )}
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg">
                        <Link href={`/jobs/${job.slug}`}>
                            Open <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                {/* Stat strip: three cells, ruled apart; stacked on phones. */}
                <div className="grid grid-cols-1 divide-y divide-neutral-200 border-b border-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-neutral-800 dark:border-neutral-800">
                    <StatCell>
                        <span className={cn("font-mono text-sm font-medium uppercase tracking-wide", strong ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white")}>
                            {job.matchScore}% match
                        </span>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {job.matchScore >= 90 ? "for you" : strong ? "good fit" : "to explore"}
                        </span>
                    </StatCell>
                    <StatCell>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">Salary</span>
                        <span className="min-w-0 truncate text-sm font-medium tabular-nums text-neutral-900 dark:text-white">{salary ?? "-"}</span>
                    </StatCell>
                    <StatCell>
                        <CalendarDays className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {job.publishedAt ? formatDate(job.publishedAt) : "-"}
                        </span>
                    </StatCell>
                </div>

                <Section icon={Briefcase} label="Role">
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                        <Field label="Type" value={EMPLOYMENT_TYPE[job.employmentType] ?? job.employmentType} />
                        <Field label="Work mode" value={LOCATION_TYPE[job.locationType] ?? job.locationType} />
                        <Field label="Location" value={job.location ?? "-"} />
                        <Field label="Experience" value={experience ?? "-"} />
                    </dl>
                </Section>

                {(job.matchedSkills.length > 0 || job.missingSkills.length > 0 || job.skillsRequired.length > 0) && (
                    <Section icon={Check} label="Skills">
                        <div className="space-y-3">
                            {job.matchedSkills.length > 0 ? (
                                <SkillRow label="You have" skills={job.matchedSkills} tone="have" />
                            ) : (
                                <SkillRow label="Needs" skills={job.skillsRequired} tone="plain" />
                            )}
                            {job.missingSkills.length > 0 && <SkillRow label="Missing" skills={job.missingSkills} tone="missing" />}
                        </div>
                    </Section>
                )}

                {process && process.rounds.length > 0 && (
                    <Section icon={ListOrdered} label="Process">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
                            <p className="shrink-0 font-mono text-sm text-neutral-900 dark:text-white">
                                {process.rounds.length} {process.rounds.length === 1 ? "round" : "rounds"}
                                {process.estimatedDurationWeeks ? ` · ~${process.estimatedDurationWeeks} weeks` : ""}
                            </p>
                            <ol className="flex flex-wrap gap-1.5">
                                {[...process.rounds].sort((a, b) => a.roundNumber - b.roundNumber).map((r) => (
                                    <li key={r.id} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                                        <span className="font-mono text-neutral-400 dark:text-neutral-500">{r.roundNumber}</span>
                                        {ROUND_TYPE[r.roundType] ?? r.title}
                                    </li>
                                ))}
                            </ol>
                            <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg lg:ml-auto">
                                <Link href={`/jobs/${job.slug}/rounds`}><Play className="h-3.5 w-3.5" /> Take the rounds</Link>
                            </Button>
                        </div>
                    </Section>
                )}

                {job.description && (
                    <Section icon={FileText} label="About the role">
                        <p className="line-clamp-6 whitespace-pre-line break-words text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                            {job.description}
                        </p>
                        <Link href={`/jobs/${job.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                            Read the full posting <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </Section>
                )}
            </div>

            {/* Footer: the decisions either side, the counter and arrows between. */}
            <footer className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-neutral-800">
                <div className="order-2 grid grid-cols-2 gap-2 sm:order-1 sm:flex">
                    <Button variant="outline" className="h-9 gap-1.5 rounded-lg" onClick={onSkip} disabled={busy}>
                        <X className="h-4 w-4" /> Not for me
                    </Button>
                    <Button className="h-9 gap-1.5 rounded-lg sm:hidden" onClick={onSave} disabled={busy}>
                        <Bookmark className="h-4 w-4" /> Save
                    </Button>
                </div>

                <div className="order-1 flex items-center justify-center gap-2 sm:order-2">
                    {onUndo && (
                        <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-lg text-neutral-600 dark:text-neutral-300" onClick={onUndo} disabled={busy}>
                            <RotateCcw className="h-3.5 w-3.5" /> Undo
                        </Button>
                    )}
                    <span className="min-w-14 text-center text-sm tabular-nums text-neutral-500 dark:text-neutral-400" aria-live="polite">
                        {position} / {total}
                    </span>
                    <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg" onClick={onNext} disabled={!canNext} aria-label="Next job">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg" onClick={onPrev} disabled={!canPrev} aria-label="Previous job">
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                </div>

                <div className="order-3 hidden sm:flex">
                    <Button className="h-9 gap-1.5 rounded-lg" onClick={onSave} disabled={busy}>
                        <Bookmark className="h-4 w-4" /> Save
                    </Button>
                </div>
            </footer>
        </section>
    )
}

function StatCell({ children }: { children: ReactNode }) {
    return <div className="flex min-w-0 items-center gap-2 px-1 py-4 sm:px-5 sm:first:pl-1">{children}</div>
}

function Section({ icon: Icon, label, children }: { icon: typeof Sparkles; label: string; children: ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 px-1 pt-5 pb-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <div className="border-y border-neutral-200 bg-neutral-50 px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                {children}
            </div>
        </div>
    )
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd className="min-w-0 break-words font-mono text-sm text-neutral-900 dark:text-white">{value}</dd>
        </div>
    )
}

function SkillRow({ label, skills, tone }: { label: string; skills: string[]; tone: "have" | "missing" | "plain" }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-24 shrink-0 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</span>
            <ul className="flex min-w-0 flex-wrap gap-1.5">
                {skills.slice(0, 12).map((s) => (
                    <li
                        key={s}
                        className={cn(
                            "max-w-full truncate rounded-md border px-2 py-0.5 font-mono text-xs",
                            tone === "have" && "border-neutral-300 bg-white text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white",
                            tone === "plain" && "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
                            tone === "missing" && "border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400",
                        )}
                    >
                        {s}
                    </li>
                ))}
                {skills.length > 12 && <li className="px-1 text-xs text-neutral-500 dark:text-neutral-400">+{skills.length - 12}</li>}
            </ul>
        </div>
    )
}
