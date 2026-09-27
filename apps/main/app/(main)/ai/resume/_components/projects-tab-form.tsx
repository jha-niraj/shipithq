"use client"

import { useState, useEffect } from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Plus, Trash2, CalendarIcon, Link2, Image
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@repo/ui/components/ui/calendar"
import {
    Popover, PopoverContent, PopoverTrigger
} from "@repo/ui/components/ui/popover"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import toast from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { TagInput } from "@repo/ui/components/ui/tag-input"

type ProjectLink = { id?: string; linkType: string; url: string; description?: string | null }
type ProjectMedia = { id?: string; mediaUrl: string; mediaType: string; caption?: string | null }

type Project = {
    id: string
    projectName: string
    projectType: string
    description?: string | null
    bulletPoints?: string[]
    status: string
    visibility: string
    technologies: string[]
    startDate: Date
    endDate?: Date | null
    projectLinks?: ProjectLink[]
    projectMedia?: ProjectMedia[]
}

const PROJECT_TYPES = ["PROFESSIONAL", "PERSONAL", "OPEN_SOURCE", "ACADEMIC"]
const STATUSES = ["IN_PROGRESS", "COMPLETED", "ARCHIVED"]
const VISIBILITIES = ["PUBLIC", "PRIVATE"]

const LINK_TYPES = ["GITHUB", "GITLAB", "BITBUCKET", "DEMO", "DOCUMENTATION", "LIVE SITE", "DOWNLOAD", "BLOG POST"]
const MEDIA_TYPES = ["Image", "Video"]

const TECH_OPTIONS = [
    "HTML", "HTML5", "CSS", "CSS3", "Sass", "Less", "JavaScript", "TypeScript", "jQuery", "Redux",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "NestJS",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "Drizzle",
    "TailwindCSS", "Bootstrap", "Material UI", "Chakra UI",
    "Python", "Java", "Go", "Rust", "C++", "C#",
    "Docker", "Kubernetes", "AWS", "GCP", "Vercel", "Netlify",
]

export function ProjectsTabForm({
    projects,
    onAdd,
    onUpdate,
    onDelete,
    onAddSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
}: {
    projects: Project[]
    onAdd: (data: {
        projectName: string
        projectType: string
        status: string
        visibility: string
        technologies: string[]
        startDate: Date
        endDate?: Date
        description?: string
        bulletPoints?: string[]
    }) => Promise<{ success: boolean; message?: string; data?: unknown }>
    onUpdate: (id: string, data: Partial<{
        projectName: string
        projectType: string
        status: string
        visibility: string
        technologies: string[]
        startDate: Date
        endDate: Date
        description: string
        bulletPoints: string[]
        links: ProjectLink[]
        media: ProjectMedia[]
    }>) => Promise<{ success: boolean; message?: string }>
    onDelete: (id: string) => Promise<{ success: boolean; message?: string }>
    onAddSuccess?: (proj: Project) => void
    onUpdateSuccess?: (proj: Project) => void
    onDeleteSuccess?: (id: string) => void
}) {
    const [localProjects, setLocalProjects] = useState(projects)

    useEffect(() => {
        setLocalProjects(projects)
    }, [projects])

    const handleAdd = async () => {
        const tempId = `temp-proj-${Date.now()}`
        const tempProj: Project = {
            id: tempId,
            projectName: "New Project",
            projectType: PROJECT_TYPES[0] ?? "PERSONAL",
            status: STATUSES[0] ?? "IN_PROGRESS",
            visibility: VISIBILITIES[0] ?? "PUBLIC",
            technologies: [],
            startDate: new Date(),
        }
        setLocalProjects((prev) => [...prev, tempProj])
        const res = await onAdd({
            projectName: tempProj.projectName,
            projectType: tempProj.projectType,
            status: tempProj.status,
            visibility: tempProj.visibility,
            technologies: tempProj.technologies,
            startDate: tempProj.startDate,
        })
        if (res.success && res.data && typeof res.data === "object" && "id" in res.data) {
            const raw = res.data as { id: string; projectName: string; projectType: string; status: string; visibility: string; technologies: string[]; startDate: Date; endDate?: Date | null; bulletPoints?: string[]; projectLinks?: { linkType: string; url: string; description?: string | null }[]; projectMedia?: { mediaUrl: string; mediaType: string; caption?: string | null }[] }
            const realProj: Project = {
                id: raw.id,
                projectName: raw.projectName,
                projectType: raw.projectType,
                status: raw.status,
                visibility: raw.visibility,
                technologies: raw.technologies ?? [],
                startDate: new Date(raw.startDate),
                endDate: raw.endDate ? new Date(raw.endDate) : undefined,
                bulletPoints: raw.bulletPoints,
                projectLinks: raw.projectLinks?.map((l) => ({ linkType: l.linkType, url: l.url, description: l.description ?? null })),
                projectMedia: raw.projectMedia?.map((m) => ({ mediaUrl: m.mediaUrl, mediaType: m.mediaType, caption: m.caption ?? null })),
            }
            setLocalProjects((prev) => prev.map((p) => (p.id === tempId ? realProj : p)))
            onAddSuccess?.(realProj)
        } else if (!res.success) {
            setLocalProjects((prev) => prev.filter((p) => p.id !== tempId))
            toast.error(res.message || "Failed to add")
        }
    }

    const handleDelete = async (id: string) => {
        if (id.startsWith("temp-")) {
            setLocalProjects((prev) => prev.filter((p) => p.id !== id))
            return
        }
        const res = await onDelete(id)
        if (res.success) {
            setLocalProjects((prev) => prev.filter((p) => p.id !== id))
            onDeleteSuccess?.(id)
        } else {
            toast.error(res.message || "Failed to remove")
        }
    }

    const descStr = (p: Project) =>
        p.bulletPoints?.length ? p.bulletPoints.join("\n") : p.description || ""

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Projects & Portfolio</h3>
                <Button onClick={handleAdd} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Add Project
                </Button>
            </div>

            {
                localProjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
                        No projects yet. Click &quot;Add Project&quot; to add one.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {
                            localProjects.map((proj) => (
                                <ProjectCard
                                    key={proj.id}
                                    project={proj}
                                    descStr={descStr}
                                    onUpdate={onUpdate}
                                    onDelete={() => handleDelete(proj.id)}
                                    onUpdateSuccess={onUpdateSuccess}
                                />
                            ))
                        }
                    </div>
                )
            }
        </div>
    )
}

function ProjectCard({
    project,
    descStr,
    onUpdate,
    onDelete,
    onUpdateSuccess,
}: {
    project: Project
    descStr: (p: Project) => string
    onUpdate: (id: string, data: Parameters<typeof ProjectsTabForm>[0]["onUpdate"] extends (id: string, data: infer D) => unknown ? D : never) => Promise<{ success: boolean; message?: string; data?: unknown }>
    onDelete: () => void
    onUpdateSuccess?: (proj: Project) => void
}) {
    const [saving, setSaving] = useState(false)
    const [startDateOpen, setStartDateOpen] = useState(false)
    const [endDateOpen, setEndDateOpen] = useState(false)
    const [local, setLocal] = useState({
        projectName: project.projectName,
        projectType: project.projectType,
        status: project.status,
        visibility: project.visibility,
        description: descStr(project),
        technologies: [...(project.technologies || [])],
        startDate: project.startDate,
        endDate: project.endDate,
        links: [...(project.projectLinks || []).map((l: { linkType: string; url: string; description?: string | null }) => ({ linkType: l.linkType, url: l.url, description: l.description ?? null }))],
        media: [...(project.projectMedia || []).map((m: { mediaUrl: string; mediaType: string; caption?: string | null }) => ({ mediaUrl: m.mediaUrl, mediaType: m.mediaType, caption: m.caption ?? null }))],
    })

    const handleSave = async () => {
        if (project.id.startsWith("temp-")) return
        setSaving(true)
        const lines = local.description.split("\n").filter(Boolean)
        const res = await onUpdate(project.id, {
            projectName: local.projectName,
            projectType: local.projectType,
            status: local.status,
            visibility: local.visibility,
            bulletPoints: lines,
            technologies: local.technologies,
            startDate: new Date(local.startDate),
            endDate: local.endDate ? new Date(local.endDate) : undefined,
            links: local.links.filter((l) => l.url.trim()),
            media: local.media.filter((m) => m.mediaUrl.trim()),
        } as Parameters<typeof onUpdate>[1])
        setSaving(false)
        if (res.success && res.data && typeof res.data === "object" && "id" in res.data) {
            const raw = res.data as { id: string; projectName: string; projectType: string; status: string; visibility: string; technologies: string[]; startDate: Date; endDate?: Date | null; bulletPoints?: string[]; projectLinks?: { linkType: string; url: string; description?: string | null }[]; projectMedia?: { mediaUrl: string; mediaType: string; caption?: string | null }[] }
            const realProj: Project = {
                id: raw.id,
                projectName: raw.projectName,
                projectType: raw.projectType,
                status: raw.status,
                visibility: raw.visibility,
                technologies: raw.technologies ?? [],
                startDate: new Date(raw.startDate),
                endDate: raw.endDate ? new Date(raw.endDate) : undefined,
                bulletPoints: raw.bulletPoints,
                projectLinks: raw.projectLinks?.map((l) => ({ linkType: l.linkType, url: l.url, description: l.description ?? null })),
                projectMedia: raw.projectMedia?.map((m) => ({ mediaUrl: m.mediaUrl, mediaType: m.mediaType, caption: m.caption ?? null })),
            }
            onUpdateSuccess?.(realProj)
        } else if (!res.success) {
            toast.error(res.message || "Failed to save")
        }
    }

    return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <Label>Project Name</Label>
                    <Input
                        value={local.projectName}
                        onChange={(e) =>
                            setLocal((p) => ({ ...p, projectName: e.target.value }))
                        }
                        placeholder="Project name"
                    />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="text-destructive shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex flex-row gap-4 flex-wrap items-end">
                <div className="min-w-[120px]">
                    <Label>Project Type</Label>
                    <Select
                        value={local.projectType}
                        onValueChange={(v) =>
                            setLocal((p) => ({ ...p, projectType: v }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                PROJECT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                </div>
                <div className="min-w-[120px]">
                    <Label>Status</Label>
                    <Select
                        value={local.status}
                        onValueChange={(v) =>
                            setLocal((p) => ({ ...p, status: v }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                </div>
                <div className="min-w-[100px]">
                    <Label>Visibility</Label>
                    <Select
                        value={local.visibility}
                        onValueChange={(v) =>
                            setLocal((p) => ({ ...p, visibility: v }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                VISIBILITIES.map((v) => (
                                    <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label>Description</Label>
                <Textarea
                    value={local.description}
                    onChange={(e) =>
                        setLocal((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="One point per line..."
                    rows={4}
                    maxLength={5000}
                    className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    {local.description.length}/5000 characters
                </p>
            </div>
            <div>
                <Label>Technologies used</Label>
                {/* The shared keyboard tag input (plan/ui-forms UF-6); custom values stay as typed. */}
                <TagInput className="mt-1" values={local.technologies} onChange={(v) => setLocal((p) => ({ ...p, technologies: v }))} suggestions={TECH_OPTIONS} placeholder="e.g. React, then Enter" />
            </div>
            <div>
                <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Project Links
                </Label>
                <div className="space-y-3 mt-2">
                    {
                        local.links.map((link, i) => (
                            <div key={i} className="flex gap-2 items-start flex-wrap">
                                <Select
                                    value={link.linkType}
                                    onValueChange={(v) =>
                                        setLocal((p) => ({
                                            ...p,
                                            links: p.links.map((l, j) => (j === i ? { ...l, linkType: v } : l)),
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            LINK_TYPES.map((lt) => (
                                                <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="flex-1 min-w-[180px]"
                                    placeholder="https://..."
                                    value={link.url}
                                    onChange={(e) =>
                                        setLocal((p) => ({
                                            ...p,
                                            links: p.links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)),
                                        }))
                                    }
                                />
                                <Input
                                    className="w-[180px]"
                                    placeholder="Description (optional)"
                                    value={link.description || ""}
                                    onChange={(e) =>
                                        setLocal((p) => ({
                                            ...p,
                                            links: p.links.map((l, j) => (j === i ? { ...l, description: e.target.value } : l)),
                                        }))
                                    }
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive shrink-0"
                                    onClick={() =>
                                        setLocal((p) => ({ ...p, links: p.links.filter((_, j) => j !== i) }))
                                    }
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    }
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLocal((p) => ({ ...p, links: [...p.links, { linkType: "GITHUB", url: "", description: null }] }))}>
                        <Plus className="w-4 h-4" />
                        Add Link
                    </Button>
                </div>
            </div>
            <div>
                <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Project Media
                </Label>
                <div className="space-y-3 mt-2">
                    {
                        local.media.map((med, i) => (
                            <div key={i} className="flex gap-2 items-start flex-wrap p-3 rounded-lg border bg-muted/30">
                                <Select
                                    value={med.mediaType}
                                    onValueChange={(v) =>
                                        setLocal((p) => ({
                                            ...p,
                                            media: p.media.map((m, j) => (j === i ? { ...m, mediaType: v } : m)),
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="Media type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            MEDIA_TYPES.map((mt) => (
                                                <SelectItem key={mt} value={mt}>{mt}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="flex-1 min-w-[200px]"
                                    placeholder="https://image-url.com/..."
                                    value={med.mediaUrl}
                                    onChange={(e) =>
                                        setLocal((p) => ({
                                            ...p,
                                            media: p.media.map((m, j) => (j === i ? { ...m, mediaUrl: e.target.value } : m)),
                                        }))
                                    }
                                />
                                <Input
                                    className="w-[180px]"
                                    placeholder="Description (optional)"
                                    value={med.caption || ""}
                                    onChange={(e) =>
                                        setLocal((p) => ({
                                            ...p,
                                            media: p.media.map((m, j) => (j === i ? { ...m, caption: e.target.value } : m)),
                                        }))
                                    }
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive shrink-0"
                                    onClick={() =>
                                        setLocal((p) => ({ ...p, media: p.media.filter((_, j) => j !== i) }))
                                    }
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    }
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLocal((p) => ({ ...p, media: [...p.media, { mediaUrl: "", mediaType: "Image", caption: null }] }))}>
                        <Plus className="w-4 h-4" />
                        Add Media
                    </Button>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
                <div>
                    <Label>Start Date</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[200px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(new Date(local.startDate), "MMMM d, yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={new Date(local.startDate)}
                                onSelect={(d) =>
                                    d && setLocal((p) => ({ ...p, startDate: d }))
                                }
                                onDayClick={() => setStartDateOpen(false)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label>End Date (optional)</Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[200px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {
                                    local.endDate
                                        ? format(new Date(local.endDate), "MMMM d, yyyy")
                                        : "Select"
                                }
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={
                                    local.endDate
                                        ? new Date(local.endDate)
                                        : undefined
                                }
                                onSelect={(d) =>
                                    setLocal((p) => ({ ...p, endDate: d ?? undefined }))
                                }
                                onDayClick={() => setEndDateOpen(false)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
                {
                    saving ? (
                        <InlineLoader size="sm" />
                    ) : (
                        "Save Changes"
                    )
                }
            </Button>
        </div>
    )
}