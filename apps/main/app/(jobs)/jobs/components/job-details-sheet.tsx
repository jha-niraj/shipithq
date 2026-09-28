"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    ArrowUpRight, BarChart3, Bookmark, BookmarkCheck, Building2, Check, CircleDashed, Gauge, Globe, Lightbulb, MapPin, Play, Users,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { CompanyMark } from "@repo/ui/components/ui/company-mark"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    getJobBySlug, getShouldApplyScore, getSkillGapForJob,
    type FeedJobResult, type ShouldApplyScore, type SkillGapAnalysis,
} from "@/actions/jobs"
import { employmentTypeLabels, formatExperience, formatSalary, locationTypeLabels } from "./job-card"

/*
 * A job's details (plan/jobs-polish JP-25): a right sheet at half width on a laptop, full
 * width on a phone. Everything a student needs to decide: the fit (match, competition,
 * applicants, and why), the skills they have and need, the role itself, the rounds, and the
 * company. Open the job, practise its rounds or save it from a footer pinned to the bottom.
 * Replaces the small SkillGapModal dialog.
 */

type JobResult = Awaited<ReturnType<typeof getJobBySlug>>
type JobFull = NonNullable<Extract<JobResult, { data: unknown }>["data"]>

const VERDICT: Record<ShouldApplyScore["recommendation"], string> = {
    HIGHLY_RECOMMENDED: "A strong fit",
    RECOMMENDED: "A good fit",
    CONSIDER: "Worth a look",
    NOT_RECOMMENDED: "A stretch for now",
}

const ROUND_LABEL: Record<string, string> = {
    APTITUDE: "Aptitude", DSA: "Coding", SYSTEM_DESIGN: "System design", BEHAVIOURAL: "Behavioural", BEHAVIORAL: "Behavioural",
    TECHNICAL: "Technical", HR: "HR", CULTURE: "Culture", TAKE_HOME: "Take-home", ONLINE_ASSESSMENT: "Online assessment",
}

export function JobDetailsSheet({ job, open, onClose, onSave }: {
    job: FeedJobResult | null
    open: boolean
    onClose: () => void
    /** Save or unsave; the parent owns the list the card lives in. */
    onSave?: (jobId: string) => void
}) {
    const [full, setFull] = useState<JobFull | null>(null)
    const [gap, setGap] = useState<SkillGapAnalysis | null>(null)
    const [fit, setFit] = useState<ShouldApplyScore | null>(null)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)

    const jobId = job?.id
    const slug = job?.slug
    useEffect(() => {
        if (!open || !jobId || !slug) return
        let live = true
        setLoading(true); setFailed(false); setFull(null); setGap(null); setFit(null)
        Promise.all([getJobBySlug(slug), getSkillGapForJob(jobId), getShouldApplyScore(jobId)])
            .then(([j, g, f]) => {
                if (!live) return
                if (j.success && j.data) setFull(j.data)
                else setFailed(true)
                if (g.success && g.data) setGap(g.data)
                if (f.success && f.data) setFit(f.data)
            })
            .catch((error: unknown) => {
                console.error("job details:", error instanceof Error ? error.message : error)
                if (live) setFailed(true)
            })
            .finally(() => { if (live) setLoading(false) })
        return () => { live = false }
    }, [open, jobId, slug])

    const meta = job ? [
        job.location || locationTypeLabels[job.locationType],
        employmentTypeLabels[job.employmentType],
        formatExperience(job.experienceMin, job.experienceMax),
        job.salaryDisclosed ? formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) : null,
    ].filter(Boolean).join(" · ") : ""

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
            <SheetContent scroll={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-none lg:w-1/2">
                {job && (
                    <>
                        <SheetHeader className="shrink-0 space-y-0 border-b border-neutral-200 px-6 pb-5 pt-6 text-left dark:border-neutral-800">
                            <div className="flex items-start gap-4 pr-8">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                                    {job.company.logoUrl
                                        ? <Image src={job.company.logoUrl} alt="" fill className="object-cover" />
                                        : <CompanyMark seed={job.company.id} name={job.company.name} fill size={48} className="rounded-none border-0" />}
                                </div>
                                <div className="min-w-0">
                                    <SheetTitle className="text-xl leading-tight">{job.title}</SheetTitle>
                                    <SheetDescription className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                        {full?.company?.slug
                                            ? <Link href={`/companies/${full.company.slug}`} className="hover:underline">{job.company.name}</Link>
                                            : job.company.name}
                                    </SheetDescription>
                                    <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">{meta}</span>
                                    </p>
                                    {(job.hasApplied || job.isSaved) && (
                                        <p className="mt-2 flex gap-3 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                            {job.hasApplied && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Applied</span>}
                                            {job.isSaved && <span className="inline-flex items-center gap-1"><BookmarkCheck className="h-3.5 w-3.5" /> Saved</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </SheetHeader>

                        <ScrollArea className="min-h-0 flex-1" reflow>
                            <div className="space-y-8 px-6 py-6">
                                {loading ? <DetailsSkeleton /> : failed && !full ? (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Couldn&apos;t load this job&apos;s details. Close and open it again.</p>
                                ) : (
                                    <>
                                        {fit && (
                                            <Section title="Should you apply?" aside={<span className="text-sm font-medium text-neutral-900 dark:text-white">{VERDICT[fit.recommendation]}</span>}>
                                                <StatBand
                                                    cols={3}
                                                    size="sm"
                                                    items={[
                                                        { icon: Gauge, label: "Your match", value: `${fit.score}%`, hint: "from your skills" },
                                                        { icon: BarChart3, label: "Competition", value: fit.competition.level.charAt(0) + fit.competition.level.slice(1).toLowerCase() },
                                                        { icon: Users, label: "Applicants", value: String(fit.competition.applicantsCount) },
                                                    ]}
                                                />
                                                {fit.reasons.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                                                        {fit.reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />{r}</li>)}
                                                    </ul>
                                                )}
                                            </Section>
                                        )}

                                        {gap && (
                                            <Section title="Skills">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">You have ({gap.matchedSkills.length})</p>
                                                        {gap.matchedSkills.length ? <Chips items={gap.matchedSkills} icon={<Check className="h-3 w-3" />} /> : <p className="text-sm text-neutral-600 dark:text-neutral-400">None of the listed skills yet.</p>}
                                                    </div>
                                                    <div>
                                                        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">You need ({gap.missingRequired.length + gap.missingPreferred.length})</p>
                                                        {gap.missingRequired.length + gap.missingPreferred.length
                                                            ? <Chips items={[...gap.missingRequired, ...gap.missingPreferred]} icon={<CircleDashed className="h-3 w-3" />} />
                                                            : <p className="text-sm text-neutral-600 dark:text-neutral-400">You have every listed skill.</p>}
                                                    </div>
                                                </div>
                                                {gap.learningRecommendations.length > 0 && (
                                                    <div className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                                                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white"><Lightbulb className="h-4 w-4" /> Build these to reach {gap.potentialMatchAfterLearning}%</p>
                                                        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
                                                            {gap.learningRecommendations.map((rec) => (
                                                                <li key={rec.projectId}>
                                                                    <Link href={`/projects/${rec.projectSlug}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                                                                        <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">{rec.projectTitle} <span className="text-neutral-500">· {rec.skill}</span></span>
                                                                        <span className="shrink-0 text-xs text-neutral-500">{rec.estimatedHours}h</span>
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </Section>
                                        )}

                                        {full?.description && (
                                            <Section title="About the role">
                                                <p className="whitespace-pre-line text-sm leading-6 text-neutral-700 dark:text-neutral-300">{full.description}</p>
                                            </Section>
                                        )}
                                        {!!full?.responsibilities.length && <Section title="What you'd do"><Bullets items={full.responsibilities} /></Section>}
                                        {!!full?.requirements.length && <Section title="What they ask for"><Bullets items={full.requirements} /></Section>}
                                        {!!full?.benefits.length && <Section title="Benefits"><Bullets items={full.benefits} /></Section>}

                                        <Section title="Interview rounds">
                                            {full?.interviewProcess?.rounds.length ? (
                                                <ol className="space-y-2">
                                                    {full.interviewProcess.rounds.map((r) => (
                                                        <li key={r.id} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">{r.roundNumber}</span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">{r.title}</p>
                                                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                                                    {[ROUND_LABEL[r.roundType] ?? r.roundType, r.durationMinutes ? `${r.durationMinutes} min` : null, r.hasMockInterview ? "mock interview" : null].filter(Boolean).join(" · ")}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p className="text-sm text-neutral-600 dark:text-neutral-400">The company hasn&apos;t shared its rounds yet.</p>
                                            )}
                                        </Section>

                                        {full?.company && (
                                            <Section title="The company">
                                                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                                                    {full.company.industry && <Fact icon={<Building2 className="h-3.5 w-3.5" />} label="Industry" value={full.company.industry} />}
                                                    {full.company.companySize && <Fact icon={<Users className="h-3.5 w-3.5" />} label="Size" value={`${full.company.companySize} people`} />}
                                                    {full.company.headquarters && <Fact icon={<MapPin className="h-3.5 w-3.5" />} label="Based in" value={full.company.headquarters} />}
                                                    {full.company.website && <Fact icon={<Globe className="h-3.5 w-3.5" />} label="Website" value={<a href={full.company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{full.company.website.replace(/^https?:\/\//, "")}</a>} />}
                                                </dl>
                                                {full.company.description && <p className="mt-3 line-clamp-4 text-sm text-neutral-700 dark:text-neutral-300">{full.company.description}</p>}
                                            </Section>
                                        )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                            <Button asChild><Link href={`/jobs/${job.slug}`}>Open the job <ArrowUpRight /></Link></Button>
                            {(full?.interviewProcess ?? job.interviewProcess) && (
                                <Button asChild variant="outline"><Link href={`/jobs/${job.slug}/rounds`}><Play /> Practise the rounds</Link></Button>
                            )}
                            {onSave && (
                                <Button variant="ghost" onClick={() => onSave(job.id)} aria-pressed={job.isSaved}>
                                    {job.isSaved ? <BookmarkCheck /> : <Bookmark />} {job.isSaved ? "Saved" : "Save"}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h3>
                {aside}
            </div>
            {children}
        </section>
    )
}

function Chips({ items, icon }: { items: string[]; icon: React.ReactNode }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">{icon}{s}</span>
            ))}
        </div>
    )
}

function Bullets({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
            {items.map((it, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-current" />{it}</li>)}
        </ul>
    )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <span className="text-neutral-500">{icon}</span>
            <dt className="sr-only">{label}</dt>
            <dd className="min-w-0 truncate">{value}</dd>
        </div>
    )
}

function DetailsSkeleton() {
    return (
        <div className="space-y-8" aria-busy="true">
            <ShimmerStyles />
            <div className="space-y-3"><Shimmer className="h-4 w-36" /><div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-16 rounded-xl" delay={i * 0.04} />)}</div><Shimmer className="h-3.5 w-3/4" /><Shimmer className="h-3.5 w-2/3" /></div>
            <div className="space-y-3"><Shimmer className="h-4 w-16" /><div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-5 w-16 rounded-md" delay={i * 0.03} />)}</div></div>
            <div className="space-y-2"><Shimmer className="h-4 w-28" />{["w-full", "w-11/12", "w-full", "w-4/5", "w-2/3"].map((w, i) => <Shimmer key={i} className={`h-3.5 ${w}`} delay={i * 0.03} />)}</div>
            <div className="space-y-2"><Shimmer className="h-4 w-32" />{[0, 1, 2].map((i) => <Shimmer key={i} className="h-14 w-full rounded-xl" delay={i * 0.04} />)}</div>
        </div>
    )
}
