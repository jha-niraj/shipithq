/**
 * The public one-pager at `/profile/<username>` (plan/profile PRF-12).
 *
 * Modelled on Niraj's own portfolio (nirajjha.vercel.app/portfolio): one readable
 * column, a hero with the person and their links, then a document of sections under
 * one hairline header style - About, Experience as a timeline, Projects, Skills by
 * category, Education, Certifications, Contact. Monochrome, no decoration.
 *
 * A server component: a recruiter's phone and a link-preview bot both get the whole
 * page in the first response. The interactive bits are in `interactive.tsx`.
 * Sections with nothing in them are left out, not shown empty.
 */

import Link from "next/link"
import {
    ArrowUpRight, Briefcase, Code2, FileText, FolderGit2, Globe, Mail, MapPin, Users,
} from "lucide-react"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import type { PublicProfile } from "@/lib/profile/read"
import {
    SKILL_CATEGORIES, normalizeProjectMediaType, normalizeProjectStatus,
    projectLinkLabel, projectStatusLabel, projectTypeLabel, skillCategoryLabel,
} from "@/lib/profile/labels"
import { CopyLinkButton, FallbackImage, FollowButton } from "./interactive"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const month = (d: Date | null) => (d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "")
/** "Jan 2024 - Present", a plain hyphen. */
const period = (start: Date, end: Date | null, current?: boolean) =>
    `${month(start)} - ${current || !end ? "Present" : month(end)}`

/** First letters of the words that start with a letter or digit: "ShipItHQ [beta]" -> "S", not "S[". */
const initials = (name: string) =>
    name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")

export interface OnePagerProps {
    p: PublicProfile
    isOwn: boolean
    signedIn: boolean
    isFollowing: boolean
    /** Canonical, from `lib/urls.ts`. */
    shareUrl: string
}

export function OnePager({ p, isOwn, signedIn, isFollowing, shareUrl }: OnePagerProps) {
    const name = p.name || p.username
    const socials = [
        p.githubUrl && { label: "GitHub", href: p.githubUrl },
        p.linkedinUrl && { label: "LinkedIn", href: p.linkedinUrl },
        p.twitterUrl && { label: "X", href: p.twitterUrl },
        ...p.socialLinks
            .filter((l) => !/github|linkedin|twitter|^x$/i.test(l.platform))
            .map((l) => ({ label: l.label || l.platform, href: l.url })),
    ].filter(Boolean) as { label: string; href: string }[]

    const skillGroups = groupSkills(p.skills)
    const hasContact = !!(p.email || p.website || socials.length)

    return (
        <main className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
            {/* ── Hero ── */}
            <section className="flex flex-col-reverse gap-8 pb-12 pt-10 sm:flex-row sm:items-start sm:justify-between sm:pt-16">
                <div className="min-w-0 flex-1">
                    {p.openToWork && (
                        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                            </span>
                            Open to work
                        </span>
                    )}
                    <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">{name}</h1>
                    {p.headline && (
                        <p className="mt-3 max-w-xl text-lg leading-snug text-neutral-600 dark:text-neutral-300">{p.headline}</p>
                    )}
                    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="font-mono">@{p.username}</span>
                        {p.location && (
                            <>
                                <span className="text-neutral-300 dark:text-neutral-700">/</span>
                                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.location}</span>
                            </>
                        )}
                        {(p.occupation || p.company || p.university) && (
                            <>
                                <span className="text-neutral-300 dark:text-neutral-700">/</span>
                                <span>{p.occupation || p.company ? [p.occupation, p.company].filter(Boolean).join(" at ") : p.university}</span>
                            </>
                        )}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        {p.email && (
                            <Pill href={`mailto:${p.email}`} solid icon={<Mail className="size-3.5" />}>Get in touch</Pill>
                        )}
                        {p.resumeShareSlug && (
                            <Pill href={`/r/${encodeURIComponent(p.resumeShareSlug)}`} icon={<FileText className="size-3.5" />}>Resume</Pill>
                        )}
                        {p.website && <Pill href={p.website} external icon={<Globe className="size-3.5" />}>{host(p.website)}</Pill>}
                        {socials.map((s) => <Pill key={s.href} href={s.href} external>{s.label}</Pill>)}
                        {!isOwn && (
                            <FollowButton userId={p.id} username={p.username} signedIn={signedIn} initialFollowing={isFollowing} />
                        )}
                        <CopyLinkButton url={shareUrl} />
                    </div>
                </div>

                <Portrait name={name} image={p.image} />
            </section>

            <StatBand
                size="sm"
                cols={4}
                items={[
                    { icon: FolderGit2, label: "Projects", value: p.projects.length ? String(p.projects.length) : "0" },
                    {
                        icon: Briefcase,
                        label: "Experience",
                        // `-` is "no data", not zero (STAT-BAND.md): no roles is not "0 years".
                        value: p.yearsExperience === null ? "-" : p.yearsExperience < 1 ? "< 1" : String(p.yearsExperience),
                        hint: p.yearsExperience !== null ? (p.yearsExperience === 1 ? "year" : "years") : undefined,
                    },
                    { icon: Code2, label: "Skills", value: String(p.skills.length) },
                    { icon: Users, label: "Followers", value: String(p.stats.followers) },
                ]}
            />

            {p.bio && (
                <Section title="About">
                    <p className="max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">{p.bio}</p>
                </Section>
            )}

            {p.experiences.length > 0 && (
                <Section title="Experience" count={p.experiences.length}>
                    <ol>
                        {p.experiences.map((e, i) => (
                            <TimelineItem
                                key={e.id}
                                last={i === p.experiences.length - 1}
                                title={e.companyName}
                                href={e.companyWebsite}
                                meta={[e.roleTitle, period(e.startDate, e.endDate, e.isCurrentlyWorking)]}
                                body={e.description}
                                bullets={e.bulletPoints}
                            />
                        ))}
                    </ol>
                </Section>
            )}

            {p.projects.length > 0 && (
                <Section title="Projects" count={p.projects.length}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {p.projects.map((x) => <ProjectCard key={x.id} x={x} />)}
                    </div>
                </Section>
            )}

            {skillGroups.length > 0 && (
                <Section title="Skills" count={p.skills.length}>
                    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                        {skillGroups.map(([cat, list]) => (
                            <div key={cat}>
                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">{skillCategoryLabel(cat)}</h3>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {list.map((s) => (
                                        <span key={s.id} className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[13px] text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {p.educations.length > 0 && (
                <Section title="Education" count={p.educations.length}>
                    <ol>
                        {p.educations.map((e, i) => (
                            <TimelineItem
                                key={e.id}
                                last={i === p.educations.length - 1}
                                title={e.institution}
                                meta={[e.degree, period(e.startDate, e.endDate)]}
                                bullets={e.bulletPoints}
                            />
                        ))}
                    </ol>
                </Section>
            )}

            {p.certifications.length > 0 && (
                <Section title="Certifications" count={p.certifications.length}>
                    <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {p.certifications.map((c) => (
                            <li key={c.id} className="flex items-baseline justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    {c.url ? (
                                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-white">
                                            {c.name}
                                            <ArrowUpRight className="size-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                        </a>
                                    ) : <p className="text-sm font-medium text-neutral-900 dark:text-white">{c.name}</p>}
                                    {c.issuer && <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{c.issuer}</p>}
                                </div>
                                {c.issuedDate && <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{month(c.issuedDate)}</span>}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {hasContact && (
                <section className="mt-16 rounded-xl border border-neutral-200 p-6 sm:p-8 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Working on something interesting?</h2>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                        {p.email
                            ? `Email is the quickest way to reach ${name.split(" ")[0]}.`
                            : `Reach ${name.split(" ")[0]} through any of these.`}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        {p.email && <Pill href={`mailto:${p.email}`} solid icon={<Mail className="size-3.5" />}>{p.email}</Pill>}
                        {p.website && <Pill href={p.website} external>{host(p.website)}</Pill>}
                        {socials.map((s) => <Pill key={s.href} href={s.href} external>{s.label}</Pill>)}
                    </div>
                </section>
            )}

            {isOwn && !p.bio && !p.experiences.length && !p.projects.length && (
                <p className="mt-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Your page is mostly empty.{" "}
                    <Link href="/profile" className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">Fill in your profile</Link>{" "}
                    and it appears here.
                </p>
            )}
        </main>
    )
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function groupSkills(skills: PublicProfile["skills"]) {
    const order = new Map<string, number>(SKILL_CATEGORIES.map((c, i) => [c, i]))
    const groups = new Map<string, PublicProfile["skills"]>()
    for (const s of skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s])
    return [...groups.entries()].sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
}

/** The one section header: a hairline and a small tracked label, as the portfolio draws it. */
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
    return (
        <section className="mt-14 scroll-mt-20">
            <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">{title}</h2>
                {count !== undefined && count > 1 && <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{count}</span>}
            </div>
            {children}
        </section>
    )
}

function Pill({ href, children, solid, external, icon }: {
    href: string
    children: React.ReactNode
    solid?: boolean
    external?: boolean
    icon?: React.ReactNode
}) {
    const cls = cn(
        "group inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
        solid
            ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            : "border border-neutral-200 text-neutral-800 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600",
    )
    const inner = (
        <>
            {icon}
            <span className="truncate">{children}</span>
            {external && <ArrowUpRight className="size-3.5 shrink-0 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
        </>
    )
    return external
        ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        : <a href={href} className={cls}>{inner}</a>
}

/**
 * Square portrait with an offset outline behind it, like a print register mark.
 * Initials on a neutral plate when there is no photo. The plate's ink is fixed per
 * theme with its surface, so it is legible either way.
 */
function Portrait({ name, image }: { name: string; image: string | null }) {
    return (
        <div className="relative w-28 shrink-0 self-start sm:w-40">
            <span aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border border-neutral-300 dark:border-neutral-700" />
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="text-3xl font-semibold text-neutral-600 sm:text-4xl dark:text-neutral-300">{initials(name)}</span>
                {image && (
                    // A dead image URL (old hotlinked defaults) falls back to the initials under it.
                    <FallbackImage src={image} alt={name} className="absolute inset-0 size-full object-cover" />
                )}
            </div>
        </div>
    )
}

function TimelineItem({ title, href, meta, body, bullets, last }: {
    title: string
    href?: string | null
    meta: (string | null | undefined)[]
    body?: string | null
    bullets?: string[]
    last: boolean
}) {
    const parts = meta.filter(Boolean) as string[]
    return (
        <li className="flex gap-4">
            <div className="flex flex-col items-center pt-1.5">
                <span className="size-2 shrink-0 rounded-full border border-neutral-900 bg-white dark:border-white dark:bg-black" />
                {!last && <span aria-hidden className="mt-1 w-px flex-1 bg-gradient-to-b from-neutral-300 to-transparent dark:from-neutral-700" />}
            </div>
            <div className={cn("min-w-0 flex-1", !last && "pb-8")}>
                {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 font-semibold text-neutral-900 dark:text-white">
                        {title}
                        <ArrowUpRight className="size-3.5 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                ) : <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>}
                {parts.length > 0 && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                        {parts.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-2">
                                {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">·</span>}
                                <span className={i === parts.length - 1 ? "tabular-nums" : undefined}>{m}</span>
                            </span>
                        ))}
                    </p>
                )}
                {body && <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">{body}</p>}
                {bullets && bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {bullets.map((b, i) => (
                            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                                <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                                {b}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </li>
    )
}

function ProjectCard({ x }: { x: PublicProfile["projects"][number] }) {
    const cover = x.media[0] ?? (x.thumbnailUrl ? { mediaUrl: x.thumbnailUrl, mediaType: "IMAGE", caption: null, id: "thumb" } : null)
    const isVideo = cover && normalizeProjectMediaType(cover.mediaType) === "VIDEO"
    const status = normalizeProjectStatus(x.status)
    const primary = x.links[0]
    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
            <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="text-2xl font-semibold text-neutral-400 dark:text-neutral-600">{initials(x.projectName)}</span>
                {cover && (isVideo ? (
                    <video src={cover.mediaUrl} muted loop playsInline autoPlay className="absolute inset-0 size-full object-cover" aria-label={cover.caption ?? x.projectName} />
                ) : (
                    <FallbackImage src={cover.mediaUrl} alt={cover.caption ?? x.projectName} loading="lazy"
                        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                ))}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                    {primary ? (
                        <a href={primary.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-neutral-900 dark:text-white">
                            {x.projectName}
                            <ArrowUpRight className="size-3.5 opacity-50" />
                        </a>
                    ) : <h3 className="font-semibold text-neutral-900 dark:text-white">{x.projectName}</h3>}
                    <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">{period(x.startDate, x.endDate)}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {projectTypeLabel(x.projectType)}
                    {status && status !== "COMPLETED" && <> · {projectStatusLabel(status)}</>}
                </p>
                {x.description && <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{x.description}</p>}
                {x.bulletPoints.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {x.bulletPoints.slice(0, 3).map((b, i) => (
                            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                                {b}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-auto pt-4">
                    {x.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {x.technologies.map((t) => (
                                <span key={t} className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{t}</span>
                            ))}
                        </div>
                    )}
                    {x.links.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {x.links.map((l) => (
                                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex h-7 items-center gap-1 rounded-full bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                                    {l.description || projectLinkLabel(l.linkType)}
                                    <ArrowUpRight className="size-3" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </article>
    )
}
