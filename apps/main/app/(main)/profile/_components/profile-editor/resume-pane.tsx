"use client"

/**
 * The profile editor's Resume pane (plan/profile PRF-17).
 *
 * Niraj, 2026-09-25: upload as many resumes as wanted; tabs for the ones uploaded
 * and the ones built on the platform; cards with a small animated SVG on top and
 * the details below, not a row between two long rules; Upload opens a dialog with
 * an optional name; no Replace (uploading another is the replace). One uploaded
 * file is PRIMARY - the one AI features read - and the newest upload takes it
 * unless the user picks another.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Eye, FileText, MoreHorizontal, Star, Trash2, Upload } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@repo/ui/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import toast from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import {
    deleteResumeFile, getResumeFileUrl, listResumeFiles, setPrimaryResumeFile, uploadResume,
    type ResumeFileSummary,
} from "@/actions/(main)/user/resume.action"
import { getResumeDrafts } from "@/actions/(main)/ai/resume-draft.action"
import { validateResumeFile } from "@/lib/resume-extractor.client"
import { ORIGIN_LABEL, originOf } from "@/lib/resume/origin"
import { PaneHeader } from "./parts"

type Draft = { id: string; name: string; templateSlug: string; isDefault: boolean; isPublic: boolean; importedFrom: string | null; tailoredFor: string | null; updatedAt: Date }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const day = (d: Date | string) => { const x = new Date(d); return `${MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}` }
const kb = (n: number | null) => (n == null ? null : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const kind = (m: string | null, name: string) => (m?.includes("pdf") || /\.pdf$/i.test(name) ? "PDF" : m?.includes("word") || /\.docx?$/i.test(name) ? "DOCX" : "File")

export function ResumePane({ onChanged }: { onChanged: () => void }) {
    const [files, setFiles] = React.useState<ResumeFileSummary[] | null>(null)
    const [drafts, setDrafts] = React.useState<Draft[] | null>(null)
    const [uploadOpen, setUploadOpen] = React.useState(false)
    const [tab, setTab] = React.useState("uploaded")

    const load = React.useCallback(async () => {
        const [f, d] = await Promise.all([listResumeFiles(), getResumeDrafts()])
        setFiles(f)
        setDrafts((d.success ? d.drafts : []) as Draft[])
    }, [])
    React.useEffect(() => { void load() }, [load])

    const changed = async () => {
        await load()
        onChanged()
    }

    return (
        <>
            <PaneHeader
                title="Resume"
                action={
                    <>
                        <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
                            <Link href="/ai/resume">Resume Builder <ArrowUpRight className="size-3.5" /></Link>
                        </Button>
                        <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => setUploadOpen(true)}>
                            <Upload className="size-3.5" /> Upload
                        </Button>
                    </>
                }
            />
            <div className="px-6 py-6">
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList variant="segmented" size="sm" fit>
                        <TabsTrigger value="uploaded">Uploaded{files ? ` ${files.length}` : ""}</TabsTrigger>
                        <TabsTrigger value="platform">Created on ShipItHQ{drafts ? ` ${drafts.length}` : ""}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="uploaded" className="mt-5">
                        {files === null ? <CardsSkeleton /> : files.length === 0 ? (
                            <EmptyCard
                                title="No resume uploaded"
                                body="Upload a PDF or DOCX. The primary one is what ShipItHQ AI reads, and we can turn it into an editable resume."
                                action={<Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-1.5 size-3.5" /> Upload a resume</Button>}
                            />
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {files.map((f) => <FileCard key={f.id} file={f} onChanged={changed} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="platform" className="mt-5">
                        {drafts === null ? <CardsSkeleton /> : drafts.length === 0 ? (
                            <EmptyCard
                                title="Nothing built here yet"
                                body="Resumes you make in the Resume Builder, from your profile, an upload or an AI import, show up here."
                                action={<Button asChild size="sm"><Link href="/ai/resume">Open the Resume Builder</Link></Button>}
                            />
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {drafts.map((d) => <DraftCard key={d.id} draft={d} />)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={async () => { setTab("uploaded"); await changed() }} />
        </>
    )
}

// ── Cards ────────────────────────────────────────────────────────────────────

/**
 * The card art: a page whose lines draw in, in a staggered loop, with a small mark in
 * the corner - an arrow rising for an upload, a twinkle for one built here. Same
 * `sh-art-*` vocabulary as the animated icons; decorative, so reduced motion stops it.
 */
function ResumeArt({ variant }: { variant: "file" | "built" }) {
    const line = (y: number, w: number, delay: number) => (
        <path d={`M44 ${y}h${w}`} className="sh-art-draw" style={{ ["--sh-draw-len" as string]: w, animationDelay: `${delay}s` } as React.CSSProperties} />
    )
    return (
        <div className="flex h-28 items-center justify-center border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
            <svg viewBox="0 0 140 90" className="h-24 w-auto" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M36 10h48l14 14v56a3 3 0 0 1-3 3H36a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" strokeWidth={1.5} className="fill-white dark:fill-neutral-950" />
                <path d="M84 10v14h14" strokeWidth={1.5} opacity={0.5} />
                <g strokeWidth={2}>
                    {line(30, 28, 0)}
                    {line(40, 42, 0.2)}
                    {line(48, 36, 0.4)}
                    {line(56, 40, 0.6)}
                    {line(64, 24, 0.8)}
                </g>
                {variant === "file" ? (
                    <g className="sh-art-rise" strokeWidth={1.75}>
                        <circle cx="104" cy="68" r="11" className="fill-neutral-900 dark:fill-white" stroke="none" />
                        <path d="M104 74v-11m-4.5 4.5L104 63l4.5 4.5" className="stroke-white dark:stroke-neutral-900" />
                    </g>
                ) : (
                    <g strokeWidth={1.5}>
                        <path d="M106 58l2.2 5.8L114 66l-5.8 2.2L106 74l-2.2-5.8L98 66l5.8-2.2Z" className="sh-art-twinkle fill-current" />
                        <circle cx="116" cy="54" r="1.6" className="sh-art-twinkle fill-current" stroke="none" style={{ animationDelay: "0.6s" }} />
                    </g>
                )}
            </svg>
        </div>
    )
}

function FileCard({ file, onChanged }: { file: ResumeFileSummary; onChanged: () => Promise<void> }) {
    const [busy, setBusy] = React.useState(false)
    const [confirm, setConfirm] = React.useState(false)

    const view = async () => {
        const res = await getResumeFileUrl(file.id)
        if (res?.url) window.open(res.url, "_blank", "noopener")
        else toast.error("Could not open this file")
    }
    const makePrimary = async () => {
        setBusy(true)
        try {
            const res = await setPrimaryResumeFile(file.id)
            if (!res.success) return void toast.error(res.error)
            toast.success(`"${file.name}" is now the resume ShipItHQ AI reads`)
            await onChanged()
        } finally {
            setBusy(false)
        }
    }
    const remove = async () => {
        setBusy(true)
        try {
            const res = await deleteResumeFile(file.id)
            if (!res.success) return void toast.error(res.error)
            toast.success("Resume deleted")
            await onChanged()
        } finally {
            setBusy(false)
        }
    }

    const meta = [kind(file.mimeType, file.name), kb(file.sizeBytes), `Uploaded ${day(file.createdAt)}`].filter(Boolean).join(" · ")
    return (
        <div className={cn("group flex flex-col overflow-hidden rounded-xl border bg-white transition-colors dark:bg-neutral-950", file.isPrimary ? "border-neutral-400 dark:border-neutral-600" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600")}>
            <ResumeArt variant="file" />
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-2">
                    <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold text-neutral-900 dark:text-white">{file.name}</p>
                    {busy && <InlineLoader size="sm" />}
                    <CardMenu label={file.name}>
                        {file.hasFile && <DropdownMenuItem className="cursor-pointer" onSelect={view}><Eye className="mr-2 size-3.5" /> View file</DropdownMenuItem>}
                        {!file.isPrimary && <DropdownMenuItem className="cursor-pointer" onSelect={makePrimary}><Star className="mr-2 size-3.5" /> Make primary</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400" onSelect={() => setConfirm(true)}>
                            <Trash2 className="mr-2 size-3.5" /> Delete
                        </DropdownMenuItem>
                    </CardMenu>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{meta}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {file.isPrimary && <Tag solid><Star className="size-2.5 fill-current" /> Primary</Tag>}
                    {!file.hasFile && <Tag>Text only</Tag>}
                    {!file.hasText && <Tag>No text found</Tag>}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-4">
                    {file.hasFile ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={view}><Eye className="mr-1.5 size-3.5" /> View</Button>
                    ) : (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">The file was not stored; its text was.</p>
                    )}
                    {!file.isPrimary && <Button size="sm" variant="ghost" className="h-8" disabled={busy} onClick={makePrimary}>Make primary</Button>}
                </div>
                {file.isPrimary && !file.hasText && (
                    <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                        This looks like a scanned PDF: ShipItHQ AI can read nothing from it. Upload a text-based export to use AI features.
                    </p>
                )}
            </div>
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{file.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {file.isPrimary
                                ? "This is your primary resume. Your newest other upload becomes primary. Editable resumes already built from it stay. This cannot be undone."
                                : "The file and its text are removed. Editable resumes already built from it stay. This cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function DraftCard({ draft }: { draft: Draft }) {
    const { origin } = originOf(draft)
    return (
        <Link
            href={`/ai/resume/draft/${draft.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
        >
            <ResumeArt variant="built" />
            <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-sm font-semibold text-neutral-900 dark:text-white">{draft.name}</p>
                <p className="mt-1 text-xs capitalize text-neutral-500 dark:text-neutral-400">
                    {draft.templateSlug.replace(/-/g, " ")} · Edited {day(draft.updatedAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {draft.isDefault && <Tag solid><Star className="size-2.5 fill-current" /> Default</Tag>}
                    <Tag>{ORIGIN_LABEL[origin]}</Tag>
                    {draft.isPublic && <Tag>Public</Tag>}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white">
                    Open in the Resume Builder <ArrowUpRight className="size-3.5" />
                </span>
            </div>
        </Link>
    )
}

function CardMenu({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Actions for ${label}`} className="-mr-1 -mt-1 size-7 text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">{children}</DropdownMenuContent>
        </DropdownMenu>
    )
}

function Tag({ children, solid }: { children: React.ReactNode; solid?: boolean }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            solid ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400",
        )}>
            {children}
        </span>
    )
}

function EmptyCard({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700">
            <FileText className="size-5 text-neutral-400" />
            <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{body}</p>
            <div className="mt-4">{action}</div>
        </div>
    )
}

function CardsSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <ShimmerStyles />
            {[0, 1].map((i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <Shimmer className="h-28 w-full rounded-none" delay={i * 0.05} />
                    <div className="space-y-2 p-4">
                        <Shimmer className="h-4 w-3/4" delay={i * 0.05 + 0.03} />
                        <Shimmer className="h-3 w-1/2" delay={i * 0.05 + 0.06} />
                        <Shimmer className="mt-4 h-8 w-20" delay={i * 0.05 + 0.09} />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Upload dialog ────────────────────────────────────────────────────────────

function UploadDialog({ open, onOpenChange, onUploaded }: {
    open: boolean
    onOpenChange: (o: boolean) => void
    onUploaded: () => Promise<void>
}) {
    const [file, setFile] = React.useState<File | null>(null)
    const [name, setName] = React.useState("")
    const [build, setBuild] = React.useState(true)
    const [busy, setBusy] = React.useState(false)
    const [dragging, setDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        if (open) { setFile(null); setName(""); setBuild(true) }
    }, [open])

    const pick = (f: File | undefined) => {
        if (!f) return
        const check = validateResumeFile(f)
        if (!check.valid) return void toast.error(check.error ?? "Unsupported file")
        setFile(f)
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || busy) return
        setBusy(true)
        try {
            const res = await uploadResume(file, undefined, { name: name.trim() || undefined, buildDraft: build })
            if (!res.success) return void toast.error(res.message ?? "Could not upload that file")
            const hasText = "hasText" in res ? res.hasText : !!res.structureJobId
            if (!hasText) toast.warning("Uploaded, but we could not read any text from it (a scanned PDF?), so AI features cannot use it.")
            else if (build && res.structureJobId) toast.success("Uploaded. We are building an editable copy in the Resume Builder.")
            else if (build) toast.warning("Uploaded, but the editable copy could not be started. You can build one from the Resume Builder.")
            else toast.success("Resume uploaded")
            onOpenChange(false)
            await onUploaded()
        } catch (error: unknown) {
            console.error("Upload failed:", error)
            toast.error("Could not upload that file")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Upload a resume</DialogTitle>
                        <DialogDescription>PDF or DOCX, up to 5MB. It becomes your primary resume, the one ShipItHQ AI reads.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-5 space-y-4">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}
                            className={cn(
                                "flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
                                dragging || file ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900" : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700",
                            )}
                        >
                            <Upload className="size-5 text-neutral-500" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">{file ? file.name : "Choose a file or drop it here"}</span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{file ? kb(file.size) : "PDF or DOCX"}</span>
                        </button>
                        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = "" }} />
                        <div className="space-y-1.5">
                            <label htmlFor="resume-name" className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                                Name <span className="font-normal text-neutral-500">(optional)</span>
                            </label>
                            <Input id="resume-name" maxLength={120} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "Backend roles, 2026"} value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-neutral-700 dark:text-neutral-300">
                            <Checkbox checked={build} onCheckedChange={(c) => setBuild(c === true)} className="mt-0.5" />
                            <span>
                                Also make an editable copy in the Resume Builder
                                <span className="block text-xs text-neutral-500 dark:text-neutral-400">AI reads the file into sections you can edit. Free.</span>
                            </span>
                        </label>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!file || busy} className="min-w-24">
                            {busy ? <span className="inline-flex items-center gap-2"><InlineLoader size="sm" /> Uploading</span> : "Upload"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
