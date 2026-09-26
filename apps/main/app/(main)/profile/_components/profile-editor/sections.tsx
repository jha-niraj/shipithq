"use client"

/**
 * The panes of the profile editor, one per section (plan/profile PRF-11). Each is
 * presentation plus the delete call for its own rows; opening sheets and refreshing
 * belong to `ProfileClient`.
 */

import * as React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import type { getOwnProfile } from "@/actions/(main)/user/profile.action"
import {
    deletePortfolioProject, deleteUserEducation, deleteWorkExperience,
} from "@/actions/(main)/user/profile.action"
import { setMyProfileLinks } from "@/actions/(main)/user/profile-links.action"
import { githubUsernameFrom } from "@/lib/profile-links"
import {
    normalizeProjectVisibility, projectStatusLabel, projectTypeLabel, skillCategoryLabel, skillLevelLabel,
    SKILL_CATEGORIES,
} from "@/lib/profile/labels"
import {
    AddButton, Detail, EmptyPane, PaneBody, PaneHeader, Row, Rows, Tag, formatRange,
} from "./parts"

export type OwnProfile = NonNullable<Awaited<ReturnType<typeof getOwnProfile>>["user"]>

export const SECTIONS = [
    { id: "identity", label: "Identity" },
    { id: "experience", label: "Experience" },
    { id: "education", label: "Education" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "links", label: "Links" },
    { id: "resume", label: "Resume" },
    { id: "career", label: "Career goals" },
] as const
export type SectionId = (typeof SECTIONS)[number]["id"]

/** What each section counts, and whether it is "done" for the completion tick. */
export function sectionStatus(p: OwnProfile): Record<SectionId, { count?: number; done: boolean }> {
    const links = [p.githubUrl, p.linkedinUrl, p.twitterUrl].filter(Boolean).length
    return {
        identity: { done: !!(p.name && (p.userProfile?.tagline || p.occupation) && p.bio && p.image) },
        experience: { count: p.experiences.length, done: p.experiences.length > 0 },
        education: { count: p.educations.length, done: p.educations.length > 0 },
        projects: { count: p.portfolioProjects.length, done: p.portfolioProjects.length > 0 },
        skills: { count: p.skills.length, done: p.skills.length >= 3 },
        links: { count: links, done: links > 0 },
        resume: { done: !!p.hasResume },
        career: { done: (p.careerGoals?.length ?? 0) > 0 },
    }
}

// ── Identity ─────────────────────────────────────────────────────────────────

export function IdentityPane({ p, onEdit }: { p: OwnProfile; onEdit: () => void }) {
    return (
        <>
            <PaneHeader title="Identity" action={<Button type="button" size="sm" variant="outline" className="h-7 cursor-pointer px-2.5 text-xs" onClick={onEdit}>Edit</Button>} />
            <PaneBody>
                <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    <Detail label="Name" value={p.name} />
                    <Detail label="Headline" value={p.userProfile?.tagline} />
                    <Detail label="About" value={p.bio ? <span className="whitespace-pre-line leading-relaxed">{p.bio}</span> : null} />
                    <Detail label="Title" value={[p.occupation, p.company].filter(Boolean).join(" at ")} />
                    <Detail label="University" value={p.university} />
                    <Detail label="Location" value={p.location} />
                    <Detail label="Website" value={p.website ? <a href={p.website} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{p.website.replace(/^https?:\/\//, "")}</a> : null} />
                    <Detail label="Open to work" value={p.openToWork ? "Yes, shown on your profile" : "No"} />
                    <Detail label="Visibility" value={visibilityLabel(p)} />
                </dl>
            </PaneBody>
        </>
    )
}

function visibilityLabel(p: OwnProfile) {
    const v = p.isPublicProfile === false ? "PRIVATE" : p.userProfile?.visibility ?? "PUBLIC"
    return v === "PRIVATE" ? "Only you" : v === "FOLLOWERS" ? "Followers only" : "Anyone with the link"
}

// ── Experience ───────────────────────────────────────────────────────────────

export function ExperiencePane({ p, onAdd, onEdit, onChanged }: {
    p: OwnProfile
    onAdd: () => void
    onEdit: (e: OwnProfile["experiences"][number]) => void
    onChanged: () => void
}) {
    const remove = async (id: string) => {
        const res = await deleteWorkExperience(id)
        if (!res.success) { toast.error(res.message || "Could not delete this role"); return }
        toast.success("Role deleted")
        onChanged()
    }
    return (
        <>
            <PaneHeader title="Experience" count={p.experiences.length} action={<AddButton onClick={onAdd}>Add role</AddButton>} />
            {p.experiences.length === 0 ? (
                <EmptyPane title="No roles yet" body="Jobs and internships, most recent first. They lead your public profile." action={<Button size="sm" className="cursor-pointer" onClick={onAdd}>Add a role</Button>} />
            ) : (
                <PaneBody>
                    <Rows>
                        {p.experiences.map((e) => (
                            <Row
                                key={e.id}
                                title={e.roleTitle}
                                subtitle={e.companyName}
                                meta={formatRange(e.startDate, e.endDate, e.isCurrentlyWorking)}
                                detail={e.bulletPoints?.length ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{e.bulletPoints.length} highlight{e.bulletPoints.length === 1 ? "" : "s"}</p> : null}
                                onEdit={() => onEdit(e)}
                                onDelete={() => remove(e.id)}
                                deleteWhat="this role"
                            />
                        ))}
                    </Rows>
                </PaneBody>
            )}
        </>
    )
}

// ── Education ────────────────────────────────────────────────────────────────

export function EducationPane({ p, onAdd, onEdit, onChanged }: {
    p: OwnProfile
    onAdd: () => void
    onEdit: (e: OwnProfile["educations"][number]) => void
    onChanged: () => void
}) {
    const remove = async (id: string) => {
        const res = await deleteUserEducation(id)
        if (!res.success) { toast.error(res.message || "Could not delete this school"); return }
        toast.success("Education deleted")
        onChanged()
    }
    return (
        <>
            <PaneHeader title="Education" count={p.educations.length} action={<AddButton onClick={onAdd}>Add school</AddButton>} />
            {p.educations.length === 0 ? (
                <EmptyPane title="No education yet" body="Degrees, diplomas and bootcamps." action={<Button size="sm" className="cursor-pointer" onClick={onAdd}>Add education</Button>} />
            ) : (
                <PaneBody>
                    <Rows>
                        {p.educations.map((e) => (
                            <Row
                                key={e.id}
                                title={e.institution}
                                subtitle={e.degree}
                                meta={formatRange(e.startDate, e.endDate)}
                                onEdit={() => onEdit(e)}
                                onDelete={() => remove(e.id)}
                                deleteWhat="this school"
                            />
                        ))}
                    </Rows>
                </PaneBody>
            )}
        </>
    )
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function ProjectsPane({ p, onAdd, onEdit, onChanged }: {
    p: OwnProfile
    onAdd: () => void
    onEdit: (x: OwnProfile["portfolioProjects"][number]) => void
    onChanged: () => void
}) {
    const remove = async (id: string) => {
        const res = await deletePortfolioProject(id)
        if (!res.success) { toast.error(res.message || "Could not delete this project"); return }
        toast.success("Project deleted")
        onChanged()
    }
    return (
        <>
            <PaneHeader title="Projects" count={p.portfolioProjects.length} action={<AddButton onClick={onAdd}>Add project</AddButton>} />
            {p.portfolioProjects.length === 0 ? (
                <EmptyPane title="No projects yet" body="What you have built, with links a recruiter can open." action={<Button size="sm" className="cursor-pointer" onClick={onAdd}>Add a project</Button>} />
            ) : (
                <PaneBody>
                    <Rows>
                        {p.portfolioProjects.map((x) => (
                            <Row
                                key={x.id}
                                title={x.projectName}
                                subtitle={[projectTypeLabel(x.projectType), x.technologies?.slice(0, 4).join(", ")].filter(Boolean).join("  /  ")}
                                meta={formatRange(x.startDate, x.endDate)}
                                badges={
                                    <>
                                        <Tag>{projectStatusLabel(x.status)}</Tag>
                                        {normalizeProjectVisibility(x.visibility) === "PRIVATE" && <Tag>Private</Tag>}
                                    </>
                                }
                                onEdit={() => onEdit(x)}
                                onDelete={() => remove(x.id)}
                                deleteWhat="this project"
                            />
                        ))}
                    </Rows>
                </PaneBody>
            )}
        </>
    )
}

// ── Skills ───────────────────────────────────────────────────────────────────

export function SkillsPane({ p, onManage }: { p: OwnProfile; onManage: () => void }) {
    const order = new Map<string, number>(SKILL_CATEGORIES.map((c, i) => [c, i]))
    const groups = new Map<string, OwnProfile["skills"]>()
    for (const s of p.skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s])
    const sorted = [...groups.entries()].sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
    return (
        <>
            <PaneHeader title="Skills" count={p.skills.length} action={<Button type="button" size="sm" variant="outline" className="h-7 cursor-pointer px-2.5 text-xs" onClick={onManage}>Manage</Button>} />
            {p.skills.length === 0 ? (
                <EmptyPane title="No skills yet" body="The languages, frameworks and tools you use. Three or more reads as a real stack." action={<Button size="sm" className="cursor-pointer" onClick={onManage}>Add skills</Button>} />
            ) : (
                <PaneBody className="space-y-6">
                    {sorted.map(([cat, list]) => (
                        <section key={cat}>
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{skillCategoryLabel(cat)}</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {list.map((s) => (
                                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                                        {s.name}
                                        <span className="text-neutral-400">{skillLevelLabel(s.level)}</span>
                                    </span>
                                ))}
                            </div>
                        </section>
                    ))}
                </PaneBody>
            )}
        </>
    )
}

// ── Links ────────────────────────────────────────────────────────────────────

export function LinksPane({ p, onChanged }: { p: OwnProfile; onChanged: () => void }) {
    const initial = React.useMemo(() => ({
        github: githubUsernameFrom(p.githubUrl),
        linkedin: p.linkedinUrl ?? "",
        twitter: (p.twitterUrl ?? "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/\/$/, ""),
    }), [p.githubUrl, p.linkedinUrl, p.twitterUrl])
    const [form, setForm] = React.useState(initial)
    const [busy, setBusy] = React.useState(false)
    React.useEffect(() => setForm(initial), [initial])
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setBusy(true)
        try {
            const res = await setMyProfileLinks({ githubUrl: form.github, linkedinUrl: form.linkedin, twitterUrl: form.twitter })
            if (!res.success) { toast.error(res.error); return }
            toast.success("Links saved")
            onChanged()
        } catch (error: unknown) {
            console.error("Saving links failed:", error)
            toast.error("Could not save your links")
        } finally {
            setBusy(false)
        }
    }

    const field = (id: keyof typeof form, label: string, prefix: string, placeholder: string) => (
        <div className="grid items-center gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <label htmlFor={`link-${id}`} className="text-[13px] text-neutral-500 dark:text-neutral-400">{label}</label>
            {/* One control: the prefix and the field share the border, the field draws no box of its own. */}
            <div className="flex min-w-0 items-center overflow-hidden rounded-md border border-neutral-200 bg-white focus-within:ring-2 focus-within:ring-ring/40 dark:border-neutral-800 dark:bg-black">
                {prefix && (
                    // An add-on cell with its own divider, so the fixed part and what you
                    // type read as two things with space between them (Niraj, 2026-09-25).
                    <span className="flex shrink-0 select-none items-center self-stretch border-r border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                        {prefix}
                    </span>
                )}
                <Input
                    id={`link-${id}`}
                    value={form[id]}
                    onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
                    placeholder={placeholder}
                    className="min-w-0 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
                />
            </div>
        </div>
    )

    return (
        <>
            <PaneHeader title="Links" />
            <PaneBody>
                <form onSubmit={save} className="space-y-4">
                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                        Shown as buttons on your public profile. The AI resume import reads them too. Leave a field empty to remove it.
                    </p>
                    {field("github", "GitHub", "github.com/", "username")}
                    {field("linkedin", "LinkedIn", "", "https://linkedin.com/in/you")}
                    {field("twitter", "X", "x.com/", "handle")}
                    <div className="flex justify-end gap-2 pt-2">
                        {dirty && <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => setForm(initial)} disabled={busy}>Reset</Button>}
                        <Button type="submit" size="sm" className="min-w-20 cursor-pointer" disabled={!dirty || busy}>
                            {busy ? <InlineLoader size="sm" /> : "Save links"}
                        </Button>
                    </div>
                </form>
            </PaneBody>
        </>
    )
}

// ── Career goals ─────────────────────────────────────────────────────────────

export function CareerPane({ p, onEdit }: { p: OwnProfile; onEdit: () => void }) {
    return (
        <>
            <PaneHeader title="Career goals" action={<Button type="button" size="sm" variant="outline" className="h-7 cursor-pointer px-2.5 text-xs" onClick={onEdit}>Edit</Button>} />
            <PaneBody>
                <p className="mb-3 text-[13px] text-neutral-500 dark:text-neutral-400">Private. Used to match you with jobs; never shown on your public profile.</p>
                <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    <Detail label="Role" value={p.careerGoals?.[0]} />
                    <Detail label="Experience" value={p.workExperience} />
                    <Detail label="Expected salary" value={p.expectedSalary ? `${p.expectedSalary} LPA` : null} />
                    <Detail label="Notice period" value={p.noticePeriod} />
                    <Detail label="Target companies" value={p.targetCompanies?.length ? p.targetCompanies.join(", ") : null} />
                </dl>
            </PaneBody>
        </>
    )
}
