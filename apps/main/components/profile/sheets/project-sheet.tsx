"use client"

/**
 * Add or edit a portfolio project (plan/profile PRF-9). Replaces `add-project-sheet.tsx`.
 *
 * What changed, and why:
 * - Status and visibility are segmented controls, not dropdowns: two and three short
 *   options read faster on screen than behind a click. Labels come from
 *   `lib/profile/labels.ts`; nothing here prints a stored value.
 * - Links and media START with one empty row each (Niraj, 2026-09-25). An empty row
 *   shows what the section wants; a bare "+ Add" button made it look optional to the
 *   point of invisible. Removing the last row clears it rather than deleting it, and
 *   empty rows are dropped on save.
 * - The sheet awaits the server and closes only on success. It used to close first
 *   and report failure in a toast, with the form already thrown away.
 * - A custom technology keeps the casing the user typed. It was upper-snake-cased
 *   ("NEXT_JS"), unlike every preset beside it.
 */

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { MonthPicker } from "@repo/ui/components/ui/month-picker"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import toast from "@repo/ui/components/ui/sonner"
import { TechSelect } from "@/app/(main)/ai/resume/_components/projects-tab-form"
import {
    addPortfolioProject, deletePortfolioProject, updatePortfolioProject,
} from "@/actions/(main)/user/profile.action"
import {
    PROJECT_LINK_TYPES, PROJECT_MEDIA_TYPES, PROJECT_STATUSES, PROJECT_TYPES, PROJECT_VISIBILITIES,
    normalizeProjectLinkType, normalizeProjectMediaType, normalizeProjectStatus, normalizeProjectVisibility,
    projectLinkLabel, projectMediaLabel, projectStatusLabel, projectTypeLabel, projectVisibilityLabel,
    type ProjectStatus, type ProjectVisibility,
} from "@/lib/profile/labels"
import {
    Field, FieldGroup, ProfileSheet, Segmented, fromMonthValue, normalizeUrl, toBullets, toMonthValue,
} from "./profile-sheet"

export interface ProjectRow {
    id: string
    projectName: string
    projectType: string
    description?: string | null
    bulletPoints?: string[] | null
    status: string
    visibility: string
    technologies?: string[] | null
    startDate: Date | string
    endDate?: Date | string | null
    links?: { linkType: string; url: string; description?: string | null }[]
    media?: { mediaType: string; mediaUrl: string; caption?: string | null }[]
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    project?: ProjectRow | null
    onSaved: () => void
}

const TECH_OPTIONS = [
    "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C++", "C#",
    "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express", "NestJS", "FastAPI", "Django",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "Drizzle",
    "Tailwind CSS", "HTML", "CSS", "Sass",
    "Docker", "Kubernetes", "AWS", "GCP", "Cloudflare", "Vercel",
]

type LinkRow = { linkType: string; url: string; description: string }
type MediaRow = { mediaType: string; mediaUrl: string; caption: string }

type Form = {
    projectName: string
    projectType: string
    status: ProjectStatus
    visibility: ProjectVisibility
    description: string
    bullets: string
    technologies: string[]
    startDate: string
    endDate: string
    ongoing: boolean
    links: LinkRow[]
    media: MediaRow[]
}

const emptyLink = (): LinkRow => ({ linkType: "GITHUB", url: "", description: "" })
const emptyMedia = (): MediaRow => ({ mediaType: "IMAGE", mediaUrl: "", caption: "" })

function thisMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function emptyForm(): Form {
    return {
        projectName: "", projectType: "PERSONAL", status: "IN_PROGRESS", visibility: "PUBLIC",
        description: "", bullets: "", technologies: [], startDate: thisMonth(), endDate: "", ongoing: true,
        links: [emptyLink()], media: [emptyMedia()],
    }
}

function fromRow(p: ProjectRow): Form {
    const links = (p.links ?? []).map((l) => ({
        linkType: normalizeProjectLinkType(l.linkType) ?? "LIVE_SITE", url: l.url, description: l.description ?? "",
    }))
    const media = (p.media ?? []).map((m) => ({
        mediaType: normalizeProjectMediaType(m.mediaType) ?? "IMAGE", mediaUrl: m.mediaUrl, caption: m.caption ?? "",
    }))
    return {
        projectName: p.projectName,
        projectType: p.projectType || "PERSONAL",
        status: normalizeProjectStatus(p.status) ?? "IN_PROGRESS",
        visibility: normalizeProjectVisibility(p.visibility) ?? "PUBLIC",
        description: p.description ?? "",
        bullets: (p.bulletPoints ?? []).join("\n"),
        technologies: p.technologies ?? [],
        startDate: toMonthValue(p.startDate),
        endDate: toMonthValue(p.endDate),
        ongoing: !p.endDate,
        links: links.length ? links : [emptyLink()],
        media: media.length ? media : [emptyMedia()],
    }
}

export function ProjectSheet({ open, onOpenChange, project, onSaved }: Props) {
    const editing = !!project?.id
    const initial = useMemo(() => (project ? fromRow(project) : emptyForm()), [project])
    const [form, setForm] = useState<Form>(initial)
    const [busy, setBusy] = useState(false)
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (open) {
            setForm(initial)
            setTouched(false)
        }
    }, [open, initial])

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
    const dirty = JSON.stringify(form) !== JSON.stringify(initial)

    const setLink = (i: number, patch: Partial<LinkRow>) =>
        set("links", form.links.map((l, j) => (j === i ? { ...l, ...patch } : l)))
    const removeLink = (i: number) =>
        set("links", form.links.length > 1 ? form.links.filter((_, j) => j !== i) : [emptyLink()])
    const setMedia = (i: number, patch: Partial<MediaRow>) =>
        set("media", form.media.map((m, j) => (j === i ? { ...m, ...patch } : m)))
    const removeMedia = (i: number) =>
        set("media", form.media.length > 1 ? form.media.filter((_, j) => j !== i) : [emptyMedia()])

    const toggleTech = (t: string) =>
        set("technologies", form.technologies.includes(t) ? form.technologies.filter((x) => x !== t) : [...form.technologies, t])
    const addCustomTech = (raw: string) => {
        const t = raw.trim()
        if (!t || form.technologies.some((x) => x.toLowerCase() === t.toLowerCase())) return
        set("technologies", [...form.technologies, t])
    }

    const start = fromMonthValue(form.startDate)
    const end = form.ongoing ? null : fromMonthValue(form.endDate)
    const linkChecks = form.links.map((l) => normalizeUrl(l.url))
    const mediaChecks = form.media.map((m) => normalizeUrl(m.mediaUrl))
    const errors = {
        projectName: !form.projectName.trim() ? "Give the project a name" : null,
        startDate: !start ? "Pick the month you started" : null,
        endDate: start && end && end < start ? "Ends before it starts" : null,
    }
    const valid = !Object.values(errors).some(Boolean)
        && !linkChecks.some((c) => c.error) && !mediaChecks.some((c) => c.error)
    const show = (k: keyof typeof errors) => (touched ? errors[k] : null)

    const submit = async () => {
        setTouched(true)
        if (!valid || !start) return
        setBusy(true)
        const links = form.links
            .map((l, i) => ({ linkType: l.linkType, url: linkChecks[i]?.url ?? "", description: l.description.trim() || null }))
            .filter((l) => l.url)
        const media = form.media
            .map((m, i) => ({ mediaType: m.mediaType, mediaUrl: mediaChecks[i]?.url ?? "", caption: m.caption.trim() || null }))
            .filter((m) => m.mediaUrl)
        const data = {
            projectName: form.projectName.trim(),
            projectType: form.projectType,
            status: form.status,
            visibility: form.visibility,
            description: form.description.trim() || undefined,
            bulletPoints: toBullets(form.bullets),
            technologies: form.technologies,
            startDate: start,
            links,
            media,
        }
        try {
            const res = editing
                ? await updatePortfolioProject(project!.id, { ...data, endDate: end })
                : await addPortfolioProject({ ...data, endDate: end ?? undefined })
            if (!res.success) {
                toast.error(res.message || "Could not save this project")
                return
            }
            toast.success(editing ? "Project updated" : "Project added")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Saving project failed:", error)
            toast.error("Could not save this project")
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!project?.id) return
        setBusy(true)
        try {
            const res = await deletePortfolioProject(project.id)
            if (!res.success) {
                toast.error(res.message || "Could not delete this project")
                return
            }
            toast.success("Project deleted")
            onOpenChange(false)
            onSaved()
        } catch (error: unknown) {
            console.error("Deleting project failed:", error)
            toast.error("Could not delete this project")
        } finally {
            setBusy(false)
        }
    }

    // A custom type the user typed before presets existed stays selectable.
    const typeOptions = (PROJECT_TYPES as readonly string[]).includes(form.projectType)
        ? PROJECT_TYPES
        : [...PROJECT_TYPES, form.projectType]

    return (
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title={editing ? "Edit project" : "Add a project"}
            description="Projects appear on your public profile and fill the projects section of resumes built from it."
            onSubmit={submit}
            submitLabel={editing ? "Save changes" : "Add project"}
            busyLabel={editing ? "Saving" : "Adding"}
            busy={busy}
            dirty={dirty}
            onDelete={editing ? remove : undefined}
            deleteWhat="this project"
        >
            <FieldGroup title="Project">
                <Field label="Name" htmlFor="proj-name" required error={show("projectName")}>
                    <Input id="proj-name" autoFocus placeholder="ShipItHQ" value={form.projectName} onChange={(e) => set("projectName", e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Type">
                        <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                            <SelectTrigger className="w-full cursor-pointer"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {typeOptions.map((t) => <SelectItem key={t} value={t}>{projectTypeLabel(t)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Status" className="sm:col-span-2">
                        <Segmented
                            label="Status"
                            value={form.status}
                            onChange={(v) => set("status", v)}
                            options={PROJECT_STATUSES.map((s) => ({ value: s, label: projectStatusLabel(s) }))}
                        />
                    </Field>
                </div>
                <Field
                    label="Who can see it"
                    hint={form.visibility === "PRIVATE" ? "Only you see it on your profile. It can still go on your resumes." : "Shown on your public profile."}
                >
                    <Segmented
                        label="Visibility"
                        className="sm:w-72"
                        value={form.visibility}
                        onChange={(v) => set("visibility", v)}
                        options={PROJECT_VISIBILITIES.map((v) => ({ value: v, label: projectVisibilityLabel(v) }))}
                    />
                </Field>
            </FieldGroup>

            <FieldGroup title="About it">
                <Field label="Summary" htmlFor="proj-desc" hint="One or two sentences: what it is and who it is for.">
                    <Textarea id="proj-desc" rows={3} className="resize-none" placeholder="A place for developers to learn by shipping real projects." value={form.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <Field label="Highlights" htmlFor="proj-bullets" hint="One per line. What you built and what it achieved.">
                    <Textarea
                        id="proj-bullets"
                        rows={4}
                        className="resize-none"
                        placeholder={"Built the judge on Cloudflare Containers\n2,000 users in the first month"}
                        value={form.bullets}
                        onChange={(e) => set("bullets", e.target.value)}
                    />
                </Field>
                <Field label="Technologies">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {form.technologies.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 py-0.5 pl-2 pr-1 text-xs text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
                                {t}
                                <button
                                    type="button"
                                    aria-label={`Remove ${t}`}
                                    onClick={() => toggleTech(t)}
                                    className="cursor-pointer rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                                >
                                    <X className="size-3" />
                                </button>
                            </span>
                        ))}
                        <TechSelect options={TECH_OPTIONS} selected={form.technologies} onToggle={toggleTech} onAddCustom={addCustomTech} />
                    </div>
                </Field>
            </FieldGroup>

            <FieldGroup title="Dates">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Started" required error={show("startDate")}>
                        <MonthPicker aria-label="Start month" placeholder="Month and year" value={form.startDate} onChange={(v) => set("startDate", v ?? "")} />
                    </Field>
                    <Field label="Finished" error={show("endDate")}>
                        <MonthPicker
                            aria-label="End month"
                            placeholder={form.ongoing ? "Present" : "Month and year"}
                            disabled={form.ongoing}
                            value={form.ongoing ? "" : form.endDate}
                            onChange={(v) => set("endDate", v ?? "")}
                        />
                    </Field>
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                    <Checkbox className="cursor-pointer" checked={form.ongoing} onCheckedChange={(c) => set("ongoing", c === true)} />
                    Still working on it
                </label>
            </FieldGroup>

            <FieldGroup
                title="Links"
                action={
                    <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => set("links", [...form.links, emptyLink()])}>
                        <Plus className="mr-1 size-3.5" /> Add link
                    </Button>
                }
            >
                {form.links.map((l, i) => (
                    <RepeatRow
                        key={i}
                        onRemove={() => removeLink(i)}
                        removeLabel={form.links.length > 1 ? "Remove link" : "Clear link"}
                        error={touched ? linkChecks[i]?.error : null}
                    >
                        <Select value={l.linkType} onValueChange={(v) => setLink(i, { linkType: v })}>
                            <SelectTrigger aria-label="Link type" className="w-full cursor-pointer sm:w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PROJECT_LINK_TYPES.map((t) => <SelectItem key={t} value={t}>{projectLinkLabel(t)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input aria-label="Link URL" inputMode="url" placeholder="github.com/you/project" className="min-w-0 flex-1" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                        <Input aria-label="Link label" placeholder="Label (optional)" className="min-w-0 sm:w-40" value={l.description} onChange={(e) => setLink(i, { description: e.target.value })} />
                    </RepeatRow>
                ))}
            </FieldGroup>

            <FieldGroup
                title="Media"
                action={
                    <Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => set("media", [...form.media, emptyMedia()])}>
                        <Plus className="mr-1 size-3.5" /> Add media
                    </Button>
                }
            >
                <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">A screenshot or a short demo video. The first one is the cover on your profile.</p>
                {form.media.map((m, i) => (
                    <RepeatRow
                        key={i}
                        onRemove={() => removeMedia(i)}
                        removeLabel={form.media.length > 1 ? "Remove media" : "Clear media"}
                        error={touched ? mediaChecks[i]?.error : null}
                    >
                        <Select value={m.mediaType} onValueChange={(v) => setMedia(i, { mediaType: v })}>
                            <SelectTrigger aria-label="Media type" className="w-full cursor-pointer sm:w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PROJECT_MEDIA_TYPES.map((t) => <SelectItem key={t} value={t}>{projectMediaLabel(t)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input aria-label="Media URL" inputMode="url" placeholder="https://..." className="min-w-0 flex-1" value={m.mediaUrl} onChange={(e) => setMedia(i, { mediaUrl: e.target.value })} />
                        <Input aria-label="Caption" placeholder="Caption (optional)" className="min-w-0 sm:w-40" value={m.caption} onChange={(e) => setMedia(i, { caption: e.target.value })} />
                    </RepeatRow>
                ))}
            </FieldGroup>
        </ProfileSheet>
    )
}

/** One repeatable row: controls in a line on sm+, stacked below; a remove button on the right. */
function RepeatRow({
    children, onRemove, removeLabel, error,
}: {
    children: React.ReactNode
    onRemove: () => void
    removeLabel: string
    error?: string | null
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">{children}</div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={removeLabel}
                    title={removeLabel}
                    onClick={onRemove}
                    className="size-9 shrink-0 cursor-pointer text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                    <X className="size-4" />
                </Button>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    )
}
