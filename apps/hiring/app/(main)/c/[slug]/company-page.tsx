"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    BadgeCheck, Briefcase, Building2, Calendar, Camera, ExternalLink, Globe, ImagePlus, MapPin, Pencil, Trash2, Users,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { NumberTextInput } from "@repo/ui/components/ui/number-text-input"
import { OptionSelect } from "@repo/ui/components/ui/option-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@repo/ui/components/ui/sheet"
import { TagInput } from "@repo/ui/components/ui/tag-input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import type { OptionKind } from "@repo/db/option-builtins"
import { removeMediaFromGallery, updateCompanyCover, updateCompanyProfile, uploadCompanyImage } from "@/actions/company"
import type { CompanyPageData, CompanyTab } from "@/lib/company-page"
import { publicJobUrl } from "@/lib/urls"

/*
 * The company page (plan/hiring-ui HU-11, Niraj 2026-09-28: "like LinkedIn"): a wide
 * cover, the logo overlapping it, the name, tagline and facts, then tabs below the
 * header. Editors change the cover and logo in place and the details in a sheet;
 * everything else is read-only. Tabs are links (?tab=), so each one is shareable.
 */

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"]
const LOCATION_TYPE: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" }
const EMPLOYMENT: Record<string, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship", FREELANCE: "Freelance" }
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

type Options = Record<OptionKind, string[]> | null

export function CompanyPage({ data, tab, options }: { data: CompanyPageData; tab: CompanyTab; options: Options }) {
    const [editing, setEditing] = useState(false)
    const facts = [
        data.industry,
        data.companySize ? `${data.companySize} people` : null,
        data.headquarters,
    ].filter(Boolean) as string[]
    const tabs: { key: CompanyTab; label: string; count?: number }[] = [
        { key: "about", label: "About" },
        { key: "jobs", label: "Jobs", count: data.jobs.length },
        { key: "people", label: "People", count: data.people.length },
        { key: "life", label: "Life", count: data.life.length },
    ]

    return (
        <div className="page-frame px-page py-6">
            <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <Cover data={data} />
                <div className="relative px-5 pb-0 sm:px-8">
                    <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-16">
                        <Logo data={data} />
                        <div className="flex flex-wrap justify-end gap-2 pb-1">
                            {data.website && (
                                <Button asChild variant="outline" size="sm" className="gap-1.5">
                                    <a href={data.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> {host(data.website)}</a>
                                </Button>
                            )}
                            {data.canEdit && (
                                <Button size="sm" className="gap-1.5" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit details</Button>
                            )}
                        </div>
                    </div>
                    <div className="mt-3">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                            {data.name}
                            {data.verified && <BadgeCheck className="h-5 w-5 text-neutral-900 dark:text-white" aria-label="Verified by ShipItHQ" />}
                        </h1>
                        {data.tagline
                            ? <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{data.tagline}</p>
                            : data.canEdit && <button type="button" onClick={() => setEditing(true)} className="mt-0.5 text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">Add a one-line tagline</button>}
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                            {facts.map((f, i) => <span key={f} className="inline-flex items-center gap-2">{i > 0 && <span aria-hidden>·</span>}{f}</span>)}
                            {data.jobs.length > 0 && <span className="inline-flex items-center gap-2">{facts.length > 0 && <span aria-hidden>·</span>}{data.jobs.length} open {data.jobs.length === 1 ? "job" : "jobs"}</span>}
                        </p>
                    </div>

                    {/* The tabs, below the header as on LinkedIn */}
                    <nav aria-label="Company" className="mt-5 flex gap-1 overflow-x-auto">
                        {tabs.map((t) => (
                            <Link
                                key={t.key}
                                href={t.key === "about" ? `/c/${data.slug}` : `/c/${data.slug}?tab=${t.key}`}
                                scroll={false}
                                aria-current={tab === t.key ? "page" : undefined}
                                className={cn(
                                    "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                                    tab === t.key ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                                )}
                            >
                                {t.label}
                                {t.count !== undefined && <span className="rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{t.count}</span>}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            <div className="mt-6">
                {tab === "about" && <About data={data} onEdit={() => setEditing(true)} />}
                {tab === "jobs" && <Jobs data={data} />}
                {tab === "people" && <People people={data.people} isOwn={data.isOwn} />}
                {tab === "life" && <Life data={data} />}
            </div>

            {data.canEdit && options && <EditSheet open={editing} onOpenChange={setEditing} data={data} options={options} />}
        </div>
    )
}

/** Pick an image, upload it, refresh the page. */
function useUpload(kind: "cover" | "logo" | "life") {
    const router = useRouter()
    const input = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const pick = () => input.current?.click()
    const field = (
        <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (!file) return
                if (file.size > 5 * 1024 * 1024) { toast.error("Images up to 5 MB"); return }
                setBusy(true)
                const fd = new FormData()
                fd.set("kind", kind)
                fd.set("file", file)
                const r = await uploadCompanyImage(fd)
                setBusy(false)
                if (!r.success) { toast.error(r.error); return }
                toast.success(kind === "cover" ? "Cover updated" : kind === "logo" ? "Logo updated" : "Photo added")
                router.refresh()
            }}
        />
    )
    return { pick, busy, field }
}

function Cover({ data }: { data: CompanyPageData }) {
    const router = useRouter()
    const upload = useUpload("cover")
    const [, startTransition] = useTransition()
    return (
        <div className="group relative h-40 bg-neutral-100 sm:h-56 dark:bg-neutral-800">
            {data.coverUrl ? (
                <img src={data.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                // No cover: a quiet band with the name, never a coloured gradient.
                <div className="flex h-full items-center justify-end overflow-hidden px-8">
                    <span className="select-none whitespace-nowrap text-5xl font-semibold tracking-tight text-neutral-200 sm:text-7xl dark:text-neutral-700">{data.name}</span>
                </div>
            )}
            {data.canEdit && (
                <div className="absolute right-3 top-3 flex gap-2">
                    {upload.field}
                    <Button size="sm" variant="outline" className="gap-1.5 border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-200 dark:bg-white dark:text-neutral-900" onClick={upload.pick} disabled={upload.busy}>
                        {upload.busy ? <InlineLoader size="sm" /> : <Camera className="h-4 w-4" />} {data.coverUrl ? "Change cover" : "Add a cover"}
                    </Button>
                    {data.coverUrl && (
                        <Button size="icon" variant="outline" aria-label="Remove the cover" className="h-8 w-8 border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-200 dark:bg-white dark:text-neutral-900"
                            onClick={async () => { const r = await updateCompanyCover(null); if (!r.success) toast.error(r.error ?? "Could not remove the cover"); else startTransition(() => router.refresh()) }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

function Logo({ data }: { data: CompanyPageData }) {
    const upload = useUpload("logo")
    return (
        <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm sm:h-32 sm:w-32 dark:border-neutral-900 dark:bg-neutral-800">
                {data.logoUrl
                    ? <img src={data.logoUrl} alt={`${data.name} logo`} className="h-full w-full object-contain" />
                    : <span className="text-2xl font-semibold text-neutral-500 sm:text-3xl dark:text-neutral-300">{initials(data.name)}</span>}
            </div>
            {data.canEdit && (
                <>
                    {upload.field}
                    <button type="button" onClick={upload.pick} disabled={upload.busy} aria-label={data.logoUrl ? "Change the logo" : "Add a logo"}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                        {upload.busy ? <InlineLoader size="sm" /> : <Camera className="h-4 w-4" />}
                    </button>
                </>
            )}
        </div>
    )
}

function Card({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
    return (
        <section className={cn("rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-neutral-900 dark:text-white">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    )
}

function Chips({ items }: { items: string[] }) {
    return (
        <ul className="flex flex-wrap gap-1.5">
            {items.map((t) => <li key={t} className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">{t}</li>)}
        </ul>
    )
}

function About({ data, onEdit }: { data: CompanyPageData; onEdit: () => void }) {
    const links = Object.entries(data.socialLinks).filter((e): e is [string, string] => typeof e[1] === "string" && /^https?:\/\//.test(e[1]))
    const LINK_LABEL: Record<string, string> = { linkedin: "LinkedIn", twitter: "X", github: "GitHub", productHunt: "Product Hunt", website: "Website" }
    const empty = !data.description && !data.culture && !data.techStack.length && !data.benefits.length
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-6">
                <Card title="Overview">
                    {data.description
                        ? <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{data.description}</p>
                        : <p className="text-sm text-neutral-500 dark:text-neutral-400">No description yet.{data.canEdit && <> <button type="button" onClick={onEdit} className="underline underline-offset-2">Write one</button>; candidates read it first.</>}</p>}
                </Card>
                {data.culture && (
                    <Card title="How we work">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{data.culture}</p>
                    </Card>
                )}
                {data.techStack.length > 0 && <Card title="Tech stack"><Chips items={data.techStack} /></Card>}
                {data.benefits.length > 0 && <Card title="Benefits"><Chips items={data.benefits} /></Card>}
                {empty && data.canEdit && (
                    <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                        Add how you work, your tech stack and benefits from <button type="button" onClick={onEdit} className="font-medium text-neutral-900 underline underline-offset-2 dark:text-white">Edit details</button>.
                    </p>
                )}
            </div>
            <div className="min-w-0 space-y-6">
                <Card title="Details">
                    <dl className="space-y-3 text-sm">
                        {[
                            { icon: Globe, label: "Website", value: data.website ? <a href={data.website} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{host(data.website)}</a> : null },
                            { icon: Building2, label: "Industry", value: data.industry },
                            { icon: Users, label: "Company size", value: data.companySize ? `${data.companySize} people` : null },
                            { icon: MapPin, label: "Headquarters", value: data.headquarters },
                            { icon: Calendar, label: "Founded", value: data.foundedYear ? String(data.foundedYear) : null },
                        ].map((row) => (
                            <div key={row.label} className="flex items-start gap-3">
                                <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                                <div className="min-w-0">
                                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">{row.label}</dt>
                                    <dd className="truncate text-neutral-900 dark:text-white">{row.value || "-"}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>
                </Card>
                {links.length > 0 && (
                    <Card title="Elsewhere">
                        <ul className="space-y-2">
                            {links.map(([k, url]) => (
                                <li key={k}>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-neutral-800 hover:text-neutral-950 hover:underline dark:text-neutral-200 dark:hover:text-white">
                                        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" /> {LINK_LABEL[k] ?? k}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
        </div>
    )
}

function Jobs({ data }: { data: CompanyPageData }) {
    if (!data.jobs.length) {
        return (
            <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-10 text-center dark:border-neutral-700">
                <p className="font-medium text-neutral-900 dark:text-white">No open jobs right now</p>
                {data.isOwn && <Button asChild size="sm" className="mt-3"><Link href="/jobs/new">Post a job</Link></Button>}
            </div>
        )
    }
    return (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {data.jobs.map((j) => (
                <li key={j.id}>
                    <a href={publicJobUrl(j.slug)} target="_blank" rel="noopener noreferrer"
                        className="flex h-full items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><Briefcase className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium text-neutral-900 dark:text-white">{j.title}</span>
                            <span className="mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400">
                                {[j.department, LOCATION_TYPE[j.locationType], j.location, EMPLOYMENT[j.employmentType]].filter(Boolean).join(" · ")}
                            </span>
                        </span>
                        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                    </a>
                </li>
            ))}
        </ul>
    )
}

function People({ people, isOwn }: { people: CompanyPageData["people"]; isOwn: boolean }) {
    if (!people.length) {
        return <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">Nobody here has chosen to show on People yet.</p>
    }
    return (
        <div className="space-y-3">
            {isOwn && <p className="text-sm text-neutral-500 dark:text-neutral-400">Other companies see the people marked visible; each person chooses in their profile.</p>}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {people.map((p) => (
                    <li key={p.id} className="flex flex-col items-center rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
                        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-lg font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : initials(p.name)}
                        </span>
                        <span className="mt-3 font-medium text-neutral-900 dark:text-white">{p.name}</span>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{p.title}</span>
                        {(p.linkedinUrl || p.portfolioUrl) && (
                            <span className="mt-3 flex gap-3 text-xs">
                                {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white">LinkedIn</a>}
                                {p.portfolioUrl && <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white">Portfolio</a>}
                            </span>
                        )}
                        {isOwn && p.hidden && <span className="mt-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Only your team sees them</span>}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Life({ data }: { data: CompanyPageData }) {
    const router = useRouter()
    const upload = useUpload("life")
    const [removing, setRemoving] = useState<string | null>(null)
    const remove = async (id: string) => {
        setRemoving(id)
        const r = await removeMediaFromGallery(id)
        setRemoving(null)
        if (!r.success) { toast.error(r.error ?? "Could not remove the photo"); return }
        router.refresh()
    }
    return (
        <div className="space-y-4">
            {data.canEdit && (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">The team, the office, offsites: what working here looks like. Up to 24 photos.</p>
                    {upload.field}
                    <Button size="sm" className="shrink-0 gap-1.5" onClick={upload.pick} disabled={upload.busy || data.life.length >= 24}>
                        {upload.busy ? <InlineLoader size="sm" /> : <ImagePlus className="h-4 w-4" />} Add a photo
                    </Button>
                </div>
            )}
            {data.life.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">No photos yet.</p>
            ) : (
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                    {data.life.map((m) => (
                        <li key={m.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                            <img src={m.url} alt={m.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                            {data.canEdit && (
                                <button type="button" onClick={() => void remove(m.id)} disabled={removing === m.id} aria-label="Remove this photo"
                                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-900 opacity-0 shadow-sm transition-opacity focus:opacity-100 group-hover:opacity-100">
                                    {removing === m.id ? <InlineLoader size="sm" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function EditSheet({ open, onOpenChange, data, options }: { open: boolean; onOpenChange: (o: boolean) => void; data: CompanyPageData; options: NonNullable<Options> }) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [f, setF] = useState(() => ({
        name: data.name,
        tagline: data.tagline ?? "",
        description: data.description ?? "",
        website: data.website ?? "",
        industry: data.industry ?? "",
        companySize: data.companySize ?? "",
        foundedYear: data.foundedYear,
        headquarters: data.headquarters ?? "",
        culture: data.culture ?? "",
        techStack: data.techStack,
        benefits: data.benefits,
        linkedin: data.socialLinks.linkedin ?? "",
        twitter: data.socialLinks.twitter ?? "",
        github: data.socialLinks.github ?? "",
    }))
    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
    const year = new Date().getFullYear()
    const badUrl = (v: string) => v.trim() !== "" && !/^https?:\/\/\S+\.\S+/.test(v.trim())

    const save = async () => {
        if (f.name.trim().length < 2) { toast.error("The company needs a name"); return }
        if ([f.website, f.linkedin, f.twitter, f.github].some(badUrl)) { toast.error("Links start with https://"); return }
        setSaving(true)
        const r = await updateCompanyProfile({
            name: f.name.trim(),
            tagline: f.tagline,
            description: f.description.trim(),
            website: f.website.trim(),
            industry: f.industry.trim(),
            companySize: f.companySize,
            foundedYear: f.foundedYear ?? undefined,
            headquarters: f.headquarters.trim(),
            culture: f.culture.trim(),
            techStack: f.techStack,
            benefits: f.benefits,
            socialLinks: {
                ...data.socialLinks,
                linkedin: f.linkedin.trim() || undefined,
                twitter: f.twitter.trim() || undefined,
                github: f.github.trim() || undefined,
            },
        })
        setSaving(false)
        if (!r.success) { toast.error(r.error ?? "Could not save"); return }
        toast.success("Company page updated")
        onOpenChange(false)
        router.refresh()
    }

    const field = (label: string, node: React.ReactNode, hint?: string) => (
        <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
            {node}
            {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
        </div>
    )

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
                <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                    <SheetTitle>Edit the company page</SheetTitle>
                    <SheetDescription>Candidates see all of this.</SheetDescription>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {field("Name", <Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />)}
                    {field("Tagline", <Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} placeholder="What you do, in one line" />, `${f.tagline.length}/120`)}
                    {field("About", <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={6} maxLength={4000} placeholder="What the company does, who for, and what's next." />)}
                    <div className="grid gap-5 sm:grid-cols-2">
                        {field("Industry", <OptionSelect value={f.industry} onChange={(v) => set("industry", v)} options={options.industry} placeholder="Pick an industry" />)}
                        {field("Company size", (
                            <Select value={f.companySize || undefined} onValueChange={(v) => set("companySize", v)}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="How many people" /></SelectTrigger>
                                <SelectContent>{[...new Set([...SIZES, ...(f.companySize ? [f.companySize] : [])])].map((s) => <SelectItem key={s} value={s}>{s} people</SelectItem>)}</SelectContent>
                            </Select>
                        ))}
                        {field("Headquarters", <OptionSelect value={f.headquarters} onChange={(v) => set("headquarters", v)} options={options.city} placeholder="Pick a city" />)}
                        {field("Founded", <NumberTextInput value={f.foundedYear} onChange={(v) => set("foundedYear", v)} min={1800} max={year} placeholder={String(year)} aria-label="Founded year" />)}
                    </div>
                    {field("Website", <Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" aria-invalid={badUrl(f.website)} />)}
                    {field("How we work", <Textarea value={f.culture} onChange={(e) => set("culture", e.target.value)} rows={4} maxLength={2000} placeholder="How the team works, what it values." />)}
                    {field("Tech stack", <TagInput values={f.techStack} onChange={(v) => set("techStack", v)} suggestions={options.tech} placeholder="e.g. TypeScript" />)}
                    {field("Benefits", <TagInput values={f.benefits} onChange={(v) => set("benefits", v)} suggestions={options.benefit} placeholder="e.g. Health insurance" />)}
                    <div className="grid gap-5 sm:grid-cols-3">
                        {field("LinkedIn", <Input value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://" aria-invalid={badUrl(f.linkedin)} />)}
                        {field("X", <Input value={f.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://" aria-invalid={badUrl(f.twitter)} />)}
                        {field("GitHub", <Input value={f.github} onChange={(e) => set("github", e.target.value)} placeholder="https://" aria-invalid={badUrl(f.github)} />)}
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-neutral-200 px-6 py-3 dark:border-neutral-800">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={() => void save()} disabled={saving} className="gap-1.5">{saving && <InlineLoader size="sm" />} Save</Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
