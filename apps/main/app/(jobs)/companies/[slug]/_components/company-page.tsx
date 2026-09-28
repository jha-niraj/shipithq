import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Building2, Check, ClipboardPaste, Clock, ExternalLink, FileText, Globe, Lock, MapPin, Send, Timer, Users } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import { CompanyTrustBadge } from "@/components/companies/trust-badge"
import { ROUND_TYPE_LABEL } from "@/lib/hiring/round-types"
import type { CompanyPage, CompanyTab, Gated, PageRole } from "@/lib/companies/public-page"
import { ReportInterviewButton } from "@/components/interview-reports/report-sheet"
import { REPORT_LEVEL_LABEL, REPORT_ROLE_FAMILY_LABEL, REPORT_ROUND_LABEL, type ReportLevel, type ReportRoleFamily, type ReportRoundType } from "@/lib/interview-reports/types"
import { CompanyActions } from "./company-actions"
import { FollowButton } from "./follow-button"

/*
 * The public company page (plan/hiring-rounds HR-23): the header across the
 * top, then tabs kept in the URL (plan/jobs-polish JP-5): Overview (the
 * profile, with stats and quick facts in a sticky rail), Jobs, Practice and
 * Interviews. The tabs are links, so each is shareable and the back button
 * moves between them. Server-rendered; only Follow and Report are client islands.
 *
 * Not TabsNav from @repo/ui: that draws the segmented chip strip and its links
 * can't opt out of scrolling to the top, and these tabs sit under a header, so
 * they use the underline strip of the hiring app's company page.
 */

const LOCATION: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" }
const EMPLOYMENT: Record<string, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance" }

const LEVEL: Record<string, string> = { INTERN: "Intern", ENTRY: "Entry level", MID: "Mid level", SENIOR: "Senior", LEAD: "Lead" }
const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`)
const gated = <T,>(g: Gated<T>, fmt: (v: T) => string) => (g ? fmt(g.value) : "-")
const days = (d: number) => (d < 1 ? "Under a day" : `${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}`)

const tabHref = (slug: string, tab: CompanyTab) => (tab === "overview" ? `/companies/${slug}` : `/companies/${slug}?tab=${tab}`)

export function CompanyPageView({ data, tab }: { data: CompanyPage; tab: CompanyTab }) {
    const { company: c, sources } = data
    const tabs: { key: CompanyTab; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        // Imported jobs are hidden while suspended, so they don't count then either.
        { key: "jobs", label: "Jobs", count: data.roles.length + (data.suspended ? 0 : data.imported.length) },
        { key: "practice", label: "Practice", count: data.practice.length },
        { key: "interviews", label: "Interviews", count: data.reportCount },
    ]
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                <ArrowLeft className="h-4 w-4" /> Companies
            </Link>

            <div>
                {/* Header: name, logo only if claimed, the label, domain, size, locations, follow. */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                        {c.logoUrl ? <Image src={c.logoUrl} alt="" fill className="object-cover" /> : <Building2 className="h-7 w-7 text-neutral-500 dark:text-neutral-400" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{c.name}</h1>
                            <div className="flex flex-wrap items-center gap-1">
                                {data.signedIn && !data.suspended && <ReportInterviewButton prefill={{ company: { companyId: c.id, companyRequestId: null, name: c.name } }} variant="ghost" />}
                                {data.signedIn && <CompanyActions companyId={c.id} companyName={c.name} blocked={data.blocked} />}
                                <FollowButton companyId={c.id} companySlug={c.slug} initial={data.following} signedIn={data.signedIn} />
                            </div>
                        </div>
                        <CompanyTrustBadge claimStatus={data.claimStatus} verificationStatus={data.verificationStatus} companyName={c.name} />
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                            {(c.domain || c.website) && (
                                <a href={c.website ?? `https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                                    <Globe className="h-4 w-4" /> {c.domain ?? c.website} <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                            {c.size && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {c.size} people<Source href={sources.size} /></span>}
                            {c.headquarters && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {c.headquarters}<Source href={sources.locations} /></span>}
                        </div>
                    </div>
                </header>

                {data.suspended && (
                    <p role="status" className="mt-5 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                        <span className="font-medium">Suspended.</span> ShipItHQ has suspended {c.name} while it looks into a report. Its roles and rounds are paused, and it can&apos;t receive results or send messages.
                    </p>
                )}

                {/* The tabs: links, so the URL carries the tab and the back button walks them. */}
                <nav aria-label={`${c.name} sections`} className="mt-5 flex gap-1 overflow-x-auto border-b border-neutral-200 [scrollbar-width:none] dark:border-neutral-800">
                    {tabs.map((t) => (
                        <Link
                            key={t.key}
                            href={tabHref(c.slug, t.key)}
                            scroll={false}
                            aria-current={tab === t.key ? "page" : undefined}
                            className={cn(
                                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                                tab === t.key ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                            )}
                        >
                            {t.label}
                            {t.count !== undefined && <span className="rounded-full bg-neutral-100 px-1.5 text-xs tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{t.count}</span>}
                        </Link>
                    ))}
                </nav>
            </div>

            {tab === "overview" && <OverviewTab data={data} />}
            {tab === "jobs" && <JobsTab data={data} />}
            {tab === "practice" && <PracticeTab data={data} />}
            {tab === "interviews" && <InterviewsTab data={data} />}
        </div>
    )
}

/** About, Stack, Culture and Benefits, with stats and quick facts in a sticky rail on lg. */
function OverviewTab({ data }: { data: CompanyPage }) {
    const { company: c, sources, stats } = data
    const hasProfile = !!(c.description || c.techStack.length > 0 || c.culture || c.benefits.length > 0)
    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="min-w-0 space-y-8 lg:col-span-2">
                {!hasProfile && (
                    <Empty>
                        {data.trust.kind === "unclaimed"
                            ? `ShipItHQ hasn't gathered a profile for ${c.name} yet, and ${c.name} hasn't joined to write one.`
                            : `${c.name} hasn't written its profile yet.`}{" "}
                        Its <TabLink slug={c.slug} tab="jobs">open roles</TabLink> and <TabLink slug={c.slug} tab="practice">practice rounds</TabLink> are in the other tabs.
                    </Empty>
                )}
                {c.description && <Block title="About" source={sources.description}><p className="whitespace-pre-line">{c.description}</p></Block>}
                {c.techStack.length > 0 && (
                    <Block title="Stack" source={sources.techStack}>
                        <div className="flex flex-wrap gap-1.5">{c.techStack.map((t) => <span key={t} className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">{t}</span>)}</div>
                    </Block>
                )}
                {c.culture && <Block title="Culture" source={sources.culture}><p className="whitespace-pre-line">{c.culture}</p></Block>}
                {c.benefits.length > 0 && (
                    <Block title="Benefits" source={sources.benefits}>
                        <ul className="grid gap-1.5 sm:grid-cols-2">{c.benefits.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {b}</li>)}</ul>
                    </Block>
                )}
            </div>

            {/* Stays in view beside the scrolling page (plan/ui-forms UF-9). */}
            <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
                <section className="space-y-2" aria-label="Stats">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Stats</h2>
                    <StatBand
                        cols={1}
                        size="sm"
                        items={[
                            { icon: Users, label: "Practising", value: gated(stats.practising, (v) => v.toLocaleString("en-IN")), hint: stats.practising ? "students" : "Too few to show" },
                            { icon: Send, label: "Results received", value: gated(stats.sends, (v) => v.toLocaleString("en-IN")), hint: stats.sends ? undefined : "Too few to show" },
                            { icon: Timer, label: "Answers in", value: gated(stats.answersInDays, days), hint: stats.answersInDays ? "median, send to decision" : "Too few to show" },
                            { icon: FileText, label: "Interview reports", value: data.reportCount.toLocaleString("en-IN"), hint: "from students who interviewed here" },
                        ]}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Numbers show only past a minimum, so a small count never points to a person.</p>
                </section>

                {(c.industry || c.size || c.foundedYear || c.headquarters) && (
                    <section className="space-y-2" aria-label="Quick facts">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Quick facts</h2>
                        <dl className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white text-sm dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                            {c.industry && <Fact label="Industry" value={c.industry} source={sources.industry} />}
                            {c.size && <Fact label="Size" value={c.size} source={sources.size} />}
                            {c.foundedYear && <Fact label="Founded" value={String(c.foundedYear)} />}
                            {c.headquarters && <Fact label="Based in" value={c.headquarters} source={sources.locations} />}
                        </dl>
                    </section>
                )}
                {c.linkedIn && (
                    <a href={c.linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:underline dark:text-neutral-300">LinkedIn <ExternalLink className="h-3 w-3" /></a>
                )}
            </aside>
        </div>
    )
}

/** Open roles with their pipelines, then the jobs students imported. */
function JobsTab({ data }: { data: CompanyPage }) {
    const { company: c, trust, roles } = data
    const practiceOnly = trust.canReceiveResults ? null : trust.kind === "unclaimed" ? `Practice only until ${c.name} joins ShipItHQ.` : `Practice only until ${c.name} is verified.`
    return (
        <div className="max-w-4xl space-y-8">
            <section className="space-y-3" aria-label="Open roles">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Open roles <span className="font-normal text-neutral-500 dark:text-neutral-400">({roles.length})</span></h2>
                {roles.length === 0 ? (
                    <Empty>
                        {c.name} has no open roles with rounds right now. Follow to hear when one opens
                        {data.suspended ? "." : <>, or paste one of its postings below to practise it now.</>}
                    </Empty>
                ) : (
                    <ul className="space-y-2.5">{roles.map((r) => <RoleRow key={r.id} role={r} practiceOnly={practiceOnly} />)}</ul>
                )}
            </section>

            {!data.suspended && (
                <section className="space-y-3" aria-label="Jobs students imported">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Jobs students imported {data.imported.length > 0 && <span className="font-normal text-neutral-500 dark:text-neutral-400">({data.imported.length})</span>}</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Pasted from {c.name}&apos;s postings; ShipItHQ designed the rounds from each one. Practice only.</p>
                        </div>
                        <PasteButton name={c.name} />
                    </div>
                    {data.imported.length === 0 ? (
                        <Empty>No one has pasted a {c.name} job yet. Paste a posting you found and ShipItHQ builds its rounds for you to practise.</Empty>
                    ) : (
                        <ul className="space-y-2.5">
                            {data.imported.map((j) => (
                                <li key={j.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">{j.title}{j.private && <Lock className="h-3.5 w-3.5 text-neutral-400" aria-label="Private: only you see it" />}</p>
                                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{[j.level ? LEVEL[j.level] : null, j.location, `${j.rounds} rounds`, j.minutes ? `about ${duration(j.minutes)}` : null].filter(Boolean).join(" · ")}</p>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="shrink-0"><Link href={`/jobs/import/${j.id}`}>Practise</Link></Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    )
}

/** ShipItHQ's generic pipelines, and the way to practise the company's real rounds. */
function PracticeTab({ data }: { data: CompanyPage }) {
    const { company: c, practice, roles } = data
    return (
        <div className="max-w-4xl space-y-8">
            <section className="space-y-3" aria-label="Practice rounds">
                <div>
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Practice rounds by ShipItHQ</h2>
                    {practice.length > 0 && <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.name} hasn&apos;t set up its own rounds. These are ShipItHQ&apos;s pipelines for common roles, not {c.name}&apos;s process. Practice only.</p>}
                </div>
                {practice.length === 0 ? (
                    <Empty>
                        {roles.length > 0
                            ? <>{c.name} runs its own rounds, so ShipItHQ adds none of its own. Practise them from its <TabLink slug={c.slug} tab="jobs">open roles</TabLink>.</>
                            : <>No practice rounds for {c.name} yet.{data.suspended ? "" : " Paste one of its job postings below to practise its real rounds."}</>}
                    </Empty>
                ) : (
                    <ul className="space-y-2.5">
                        {practice.map((p) => (
                            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="min-w-0">
                                    <p className="font-medium text-neutral-900 dark:text-white">{p.name}</p>
                                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{p.rounds.length} rounds · about {duration(p.minutes)} · {p.rounds.map((r) => ROUND_TYPE_LABEL[r.type] ?? r.type).join(", ")}</p>
                                </div>
                                <Button asChild size="sm" variant="outline" className="shrink-0"><Link href={`/companies/${c.slug}/rounds/${p.id}`}>Practise</Link></Button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {!data.suspended && (
                <section aria-label="Paste a job" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="min-w-0">
                        <h2 className="font-medium text-neutral-900 dark:text-white">Paste a job to practise its real rounds</h2>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Found a {c.name} posting? Paste the link or the text and ShipItHQ builds rounds from what it asks for.</p>
                    </div>
                    <PasteButton name={c.name} />
                </section>
            )}
        </div>
    )
}

/** What students report: loops for roles with enough reports, and the way to add one. */
function InterviewsTab({ data }: { data: CompanyPage }) {
    const { company: c, loops } = data
    const canReport = data.signedIn && !data.suspended
    const hasLoops = loops.ready.length > 0 || loops.gathering.length > 0
    return (
        <section className="max-w-4xl space-y-3" aria-label="What students report">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">What students report</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">From interviews students reported at {c.name}, reviewed by ShipItHQ. Shown once a role has 3 reports from the last year; no single report is ever shown.</p>
                </div>
                {canReport && <ReportInterviewButton prefill={{ company: { companyId: c.id, companyRequestId: null, name: c.name } }} className="shrink-0" />}
            </div>
            {!hasLoops && (
                <Empty>
                    {data.reportCount > 0
                        ? `${data.reportCount} ${data.reportCount === 1 ? "report" : "reports"} so far, not yet 3 for any one role in the last year.`
                        : `No student has reported an interview at ${c.name} yet.`}{" "}
                    {data.suspended
                        ? null
                        : data.signedIn
                            ? `Interviewed here? Report it and it counts toward the 3 a role needs.`
                            : <>Interviewed here? <Link href={`/signin?callbackUrl=${encodeURIComponent(`/companies/${c.slug}?tab=interviews`)}`} className="font-medium text-neutral-900 underline underline-offset-2 dark:text-white">Sign in</Link> to report it.</>}
                </Empty>
            )}
            {loops.ready.map((g) => (
                <div key={`${g.roleFamily}-${g.level}`} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{REPORT_ROLE_FAMILY_LABEL[g.roleFamily as ReportRoleFamily] ?? g.roleFamily} · {REPORT_LEVEL_LABEL[g.level as ReportLevel] ?? g.level}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{g.recent} {g.recent === 1 ? "report" : "reports"} in the last year{g.total > g.recent ? `, ${g.total} in all` : ""}</p>
                        </div>
                        {g.practiseHref && <Button asChild size="sm" variant="outline" className="shrink-0"><Link href={g.practiseHref}>Practise a job like this</Link></Button>}
                    </div>
                    {g.order.rounds.length > 0 && (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                            {g.order.rounds.map((r) => REPORT_ROUND_LABEL[r as ReportRoundType] ?? r).join(" > ")}
                            <span className="text-neutral-500 dark:text-neutral-400"> · in {g.order.count} of {g.order.of} reports</span>
                        </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {g.rounds.filter((r) => r.questions.length > 0).map((r) => (
                            <div key={r.type} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
                                <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{REPORT_ROUND_LABEL[r.type as ReportRoundType] ?? r.type}</p>
                                <ul className="mt-1.5 space-y-1">
                                    {r.questions.map((q) => (
                                        <li key={q.text} className="flex items-start justify-between gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                                            <span>{q.text}</span>
                                            <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">reported {q.reported} {q.reported === 1 ? "time" : "times"}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {loops.gathering.length > 0 && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Still gathering: {loops.gathering.map((g) => `${REPORT_ROLE_FAMILY_LABEL[g.roleFamily as ReportRoleFamily] ?? g.roleFamily}, ${REPORT_LEVEL_LABEL[g.level as ReportLevel] ?? g.level} (${g.recent} of 3)`).join("; ")}. Not enough reports yet to show a loop.
                </p>
            )}
        </section>
    )
}

/** An empty tab or section: one honest line with the next step, not an empty box. */
function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">{children}</p>
}

function TabLink({ slug, tab, children }: { slug: string; tab: CompanyTab; children: React.ReactNode }) {
    return <Link href={tabHref(slug, tab)} scroll={false} className="font-medium text-neutral-900 underline underline-offset-2 dark:text-white">{children}</Link>
}

function PasteButton({ name }: { name: string }) {
    return (
        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
            <Link href={`/jobs/import?company=${encodeURIComponent(name)}`}><ClipboardPaste className="h-4 w-4" /> Paste a {name} job</Link>
        </Button>
    )
}

function RoleRow({ role, practiceOnly }: { role: PageRole; practiceOnly: string | null }) {
    const cta = role.mine === "sent" ? "Sent" : role.mine === "started" ? "Continue" : "Start"
    return (
        <li className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <Link href={`/jobs/${role.slug}`} className="font-medium text-neutral-900 hover:underline dark:text-white">{role.title}</Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <span>{LOCATION[role.locationType] ?? role.locationType}{role.location ? `, ${role.location}` : ""}</span>
                        <span aria-hidden>·</span><span>{EMPLOYMENT[role.employmentType] ?? role.employmentType}</span>
                        <span aria-hidden>·</span><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {role.rounds.length} rounds, about {duration(role.minutes)}</span>
                    </p>
                    {practiceOnly && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{practiceOnly}</p>}
                </div>
                <Button asChild size="sm" variant={role.mine === "none" ? "default" : "outline"} className="shrink-0 gap-1.5">
                    <Link href={`/jobs/${role.slug}/rounds`}>{role.mine === "sent" && <Check className="h-4 w-4" />}{cta}{role.mine !== "sent" && <ArrowRight className="h-4 w-4" />}</Link>
                </Button>
            </div>
            {/* The pipeline, with each round's pass rate against its own pass mark. */}
            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {role.rounds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-950">
                        <span className="min-w-0 truncate text-neutral-800 dark:text-neutral-200">
                            <span className="text-neutral-500 dark:text-neutral-400">{r.number}.</span> {ROUND_TYPE_LABEL[r.type] ?? r.title} <span className="text-neutral-500 dark:text-neutral-400">· {duration(r.minutes)}</span>
                        </span>
                        <span className={cn("shrink-0 text-xs", r.passRate ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400")}
                            title={r.passRate ? `${r.passRate.value}% of students reached the pass mark of ${r.passMark}` : "Too few to show"}>
                            {r.passRate ? `${r.passRate.value}% pass` : "-"}
                        </span>
                    </li>
                ))}
            </ol>
        </li>
    )
}

function Block({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2" aria-label={title}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">{title}<Source href={source} /></h2>
            <div className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
        </section>
    )
}

function Fact({ label, value, source }: { label: string; value: string; source?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
            <dd className="flex min-w-0 items-center gap-1 truncate font-medium text-neutral-900 dark:text-white">{value}<Source href={source} /></dd>
        </div>
    )
}

/** On an unclaimed page, the page on the company's own site a field came from. */
function Source({ href }: { href?: string }) {
    if (!href) return null
    return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" title={`Source: ${href}`} className="ml-1 text-xs font-normal text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400">
            source<span className="sr-only">: {href}</span>
        </a>
    )
}
