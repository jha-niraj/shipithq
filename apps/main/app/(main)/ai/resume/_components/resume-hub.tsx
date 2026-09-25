'use client'
import Link from "next/link";
import { useRouter } from 'next/navigation'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import { ORIGINS, ORIGIN_LABEL, originOf, type ImportSource, type Origin } from '@/lib/resume/origin'
import type { ProfileLinks } from '@/lib/profile-links'
import { ImportSheet } from './import-sheet'

import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@repo/ui/components/ui/sheet'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
    Plus, FileText, Upload, Globe, Github, Linkedin, Twitter,
    Download, Copy, Trash2, ExternalLink, Sparkles,
    Lock, CheckCircle2, Star, FileUp, Files, MoreHorizontal, Pencil,
} from 'lucide-react'
import { DotmSquare11 } from '@repo/ui/components/ui/dotm-square-11'
import toast from '@repo/ui/components/ui/sonner'
import {
    createDraftFromProfile, createResumeDraft, deleteResumeDraft, updateResumeDraft,
    duplicateResumeDraft, setDefaultResumeDraft
} from '@/actions/(main)/ai/resume-draft.action'
import { uploadResume } from '@/actions/(main)/user/resume.action'
import { validateResumeFile } from '@/lib/resume-extractor.client'
import { emptyResumeDraftContent } from '@/types/resume-draft'
import { cn } from '@repo/ui/lib/utils'
import { TemplatePreview, shapeForSlug } from '@/components/resume/template-preview'
import { resumeShareUrl } from "@/lib/urls"
import { creditErrorMessage } from '@/lib/credits/notify'

interface Draft {
    id: string
    name: string
    templateSlug: string
    isPublic: boolean
    isDefault: boolean
    shareSlug: string
    viewCount: number
    tailoredFor: string | null
    atsScore: number | null
    importedFrom: string | null
    createdAt: Date
    updatedAt: Date
}

interface Template {
    id: string
    slug: string
    name: string
    description: string
    isPlatform: boolean
    isMarketplace: boolean
    marketplacePrice: number
    creditsCost: number
    totalSales: number
    tags: string[]
    createdBy: { name: string | null; username: string | null; image: string | null } | null
    config: unknown
}

interface Props {
    drafts: Draft[]
    templates: Template[]
    /** The user's saved links, prefilling the import sheet on first paint. */
    links: ProfileLinks
    /** `?origin=` on arrival. */
    initialOrigin?: Origin
    /** `?import=1`: open the import sheet (what `/ai/resume/import` redirects to). */
    openImport?: boolean
}

const TEMPLATE_COLORS: Record<string, string> = {
    'clean-minimal': 'from-neutral-900/10 to-neutral-900/10 border-neutral-200 dark:border-neutral-800',
    'developer-pro': 'from-neutral-900/10 to-neutral-900/10 border-neutral-200 dark:border-neutral-800',
    'executive-classic': 'from-neutral-900/10 to-neutral-900/10 border-neutral-200 dark:border-neutral-800',
    'ats-optimizer': 'from-neutral-900/10 to-neutral-900/10 border-neutral-200 dark:border-neutral-800',
    'modern-creative': 'from-rose-500/10 to-pink-500/10 border-rose-200 dark:border-rose-800',
}

function formatDate(d: Date) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── New Resume Sheet ────────────────────────────────────────────────────────
function NewResumeSheet({ templates, open, onClose, onOpenImport }: {
    templates: Template[]
    open: boolean
    onClose: () => void
    /** "Import" is its own sheet now (RES-23): choosing it hands over to that sheet. */
    onOpenImport: () => void
}) {
    const router = useRouter()
    // 'import' is not a state here: its tile opens the import sheet (RES-23).
    const [source, setSource] = useState<'profile' | 'upload' | 'blank'>('profile')
    const [name, setName] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('clean-minimal')
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)

    const platformTemplates = templates.filter(t => t.isPlatform)

    const handleCreate = async () => {
        if (!name.trim()) return toast.error('Please enter a resume name')
        setLoading(true)
        try {
            let result: { success: boolean; error?: string; draft?: { id: string }; missingFields?: string[] } | null = null

            if (source === 'upload') {
                if (!uploadFile) {
                    setLoading(false)
                    return toast.error('Choose a PDF or DOCX file first')
                }
                // The file goes to the profile, its text is extracted with unpdf,
                // and a worker turns that text into the draft. That parse takes
                // longer than a request, so there is no draft id to redirect to
                // here - the resume appears in the list when the job lands.
                const upload = await uploadResume(uploadFile, undefined, { draftName: name })
                if (!upload.success) {
                    setLoading(false)
                    return toast.error(upload.message ?? 'Could not read that file')
                }
                if (!upload.structureJobId) {
                    setLoading(false)
                    return toast.error(
                        'We saved the file but could not read any text from it. If it is a scanned PDF, upload a text-based export instead.',
                    )
                }
                toast.success('Resume uploaded. We are reading it now - it will appear here in a minute.')
                onClose()
                router.refresh()
                return
            }

            if (source === 'blank') {
                // Actually blank. This used to call createDraftFromProfile, so
                // "Start from scratch" handed back a resume already full of
                // profile data with no way to tell it had ignored the choice.
                result = await createResumeDraft({
                    name,
                    templateSlug: selectedTemplate,
                    content: emptyResumeDraftContent(),
                })
            } else {
                result = await createDraftFromProfile(name, selectedTemplate)
            }
            if (!result.success) return toast.error(creditErrorMessage(result, 'Failed to create resume'))

            // ONE toast, not one per field.
            //
            // This was `missingFields.forEach(toast.warning)`, and `missingFields` is six
            // checks - work experience, projects, skills, education, name, job title. An
            // empty profile therefore fired five warning toasts and then a success toast on
            // top of them, which is how a routine "your profile is empty" turned into a
            // stack of red that reads as five separate failures. Nothing had failed: the
            // resume was created every time.
            toast.success(
                source === 'blank' ? 'Blank resume created!' : 'Resume created from your profile!',
                result.missingFields?.length
                    ? {
                        description:
                            `Nothing on your profile for ${listOf(result.missingFields)}, so ` +
                            `${result.missingFields.length === 1 ? 'that section is' : 'those sections are'} empty. ` +
                            `Fill them in here or on your profile.`,
                    }
                    : undefined,
            )
            onClose()
            router.push(`/ai/resume/draft/${result.draft?.id}`)
        } catch {
            toast.error('Failed to create resume')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent scroll={false} side="right" className="w-full sm:max-w-lg flex flex-col p-0">
                {/* Header, scrolling body, pinned footer (plan/resume RES-20, UI-9). The body
                    was `flex-1` with no `min-h-0` and no scroller, so with five templates
                    it grew past the sheet, the sheet clipped it, and the Create button
                    was pushed out of reach with nothing to scroll. */}
                <SheetHeader className="shrink-0 p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <SheetTitle className="text-xl">Create New Resume</SheetTitle>
                    <SheetDescription>Name your resume and choose how to populate it.</SheetDescription>
                </SheetHeader>

                <ScrollArea className="min-h-0 flex-1" reflow>
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <DotmSquare11 size={48} dotSize={6} speed={1.4} />
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {source === 'upload' ? 'Uploading and reading your file…'
                                    : 'Building your resume…'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">This takes ~20 seconds</p>
                        </div>
                    ) : (
                        <>
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Resume Name</Label>
                                <Input
                                    placeholder="e.g. Google SWE Resume, Startup CTO v2"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            {/* Source selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Populate from</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'profile' as const, icon: <FileText className="w-4 h-4" />, label: 'My Profile', desc: 'Use your ShipItHQ data' },
                                        { id: 'upload' as const, icon: <FileUp className="w-4 h-4" />, label: 'Upload', desc: 'PDF or DOCX' },
                                        { id: 'import' as const, icon: <Upload className="w-4 h-4" />, label: 'Import', desc: 'LinkedIn, GitHub, text' },
                                        { id: 'blank' as const, icon: <Plus className="w-4 h-4" />, label: 'Blank', desc: 'Start from scratch' },
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => (s.id === 'import' ? onOpenImport() : setSource(s.id))}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                                                source === s.id
                                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900'
                                                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                                            )}
                                        >
                                            {s.icon}
                                            <span className="text-xs font-semibold">{s.label}</span>
                                            <span className={cn('text-xs', source === s.id ? 'opacity-70' : 'text-neutral-500 dark:text-neutral-400')}>{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Upload an existing resume */}
                            {source === 'upload' && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Your existing resume</Label>
                                    <label
                                        htmlFor="resume-upload-file"
                                        className={cn(
                                            'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed cursor-pointer transition-colors',
                                            uploadFile
                                                ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500',
                                        )}
                                    >
                                        <FileUp className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                                        <span className="text-xs font-medium text-center">
                                            {uploadFile ? uploadFile.name : 'Click to choose a PDF or DOCX'}
                                        </span>
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Max 5MB</span>
                                    </label>
                                    <input
                                        id="resume-upload-file"
                                        type="file"
                                        accept=".pdf,.doc,.docx,application/pdf"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            const check = validateResumeFile(file)
                                            if (!check.valid) {
                                                toast.error(check.error ?? 'Unsupported file')
                                                return
                                            }
                                            setUploadFile(file)
                                        }}
                                    />
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        We read the text out of your file and let AI structure it into sections you can
                                        edit. This runs in the background - the resume shows up here when it is done.
                                    </p>
                                </div>
                            )}

                            {/* Template selection. Hidden for uploads: the worker writes
                                the draft itself and always starts it on clean-minimal,
                                so offering a choice here would be a lie. */}
                            <div className={cn('space-y-2', source === 'upload' && 'hidden')}>
                                <Label className="text-sm font-medium">Choose Template</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {platformTemplates.map(t => {
                                        return (
                                            <button
                                                key={t.slug}
                                                onClick={() => setSelectedTemplate(t.slug)}
                                                className={cn(
                                                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                                    selectedTemplate === t.slug
                                                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                                                )}
                                            >
                                                {/* The same drawn preview as the grid, small. A flat
                                                    coloured square told the user nothing about the
                                                    template it stood for. */}
                                                <div className="flex h-11 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                                                    <TemplatePreview shape={shapeForSlug(t.slug)} className="h-10 w-auto" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{t.name}</p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{t.description}</p>
                                                </div>
                                                {selectedTemplate === t.slug && <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                </ScrollArea>

                {!loading && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
                        <Button variant="ghost" onClick={onClose} className="cursor-pointer">
                            Cancel
                        </Button>
                        <Button
                            className="cursor-pointer"
                            onClick={handleCreate}
                            disabled={!name.trim() || (source === 'upload' && !uploadFile)}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {source === 'upload' ? 'Upload & Read Resume'
                                : 'Create Resume'}
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}

// ─── Resume Card ─────────────────────────────────────────────────────────────
/**
 * One resume (plan/resume RES-21). Niraj, 2026-09-25: "put all the options on the
 * top right button on dropdown ... and make this somewhat bigger".
 *
 * The whole card is the Edit link - editing is what a card is clicked for. Every
 * other action is a LABELLED item in the `...` menu: the row of six unlabelled 28px
 * icon buttons it replaces made you hover each one to learn what it did.
 */
function ResumeCard({ draft, onDelete, onTogglePublic, onDuplicate, onSetDefault }: {
    draft: Draft
    onDelete: (id: string) => void
    onTogglePublic: (id: string, val: boolean) => void
    onDuplicate: (id: string) => void
    onSetDefault: (id: string) => void
}) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const { origin, sources } = originOf(draft)
    const editHref = `/ai/resume/draft/${draft.id}`

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(resumeShareUrl(draft.shareSlug))
            toast.success(draft.isPublic ? 'Share link copied' : 'Link copied. Make the resume public so it opens for others.')
        } catch {
            toast.error('Could not copy the link')
        }
    }

    return (
        <div className="group relative flex min-h-64 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600">
            {/* The card's link, laid over everything; the menu sits above it. */}
            <Link href={editHref} aria-label={`Edit ${draft.name}`} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />

            <div className="flex h-32 items-center justify-center border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
                <TemplatePreview shape={shapeForSlug(draft.templateSlug)} className="h-24 w-auto" />
            </div>

            <div className="absolute right-2 top-2 z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" aria-label={`Actions for ${draft.name}`}
                            className="size-8 cursor-pointer bg-white/90 backdrop-blur dark:bg-neutral-950/90">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={editHref}><Pencil className="mr-2 size-3.5" /> Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => window.open(`/api/resume/pdf/${draft.id}`, '_blank')}>
                            <Download className="mr-2 size-3.5" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" disabled={draft.isDefault} onSelect={() => onSetDefault(draft.id)}>
                            <Star className="mr-2 size-3.5" /> {draft.isDefault ? 'Default resume' : 'Set as default'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => onTogglePublic(draft.id, !draft.isPublic)}>
                            {draft.isPublic ? <><Lock className="mr-2 size-3.5" /> Make private</> : <><Globe className="mr-2 size-3.5" /> Make public</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onSelect={copyLink}>
                            <Copy className="mr-2 size-3.5" /> Copy share link
                        </DropdownMenuItem>
                        {draft.isPublic && (
                            <DropdownMenuItem className="cursor-pointer" onSelect={() => window.open(`/r/${draft.shareSlug}`, '_blank')}>
                                <ExternalLink className="mr-2 size-3.5" /> Open public page
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => onDuplicate(draft.id)}>
                            <Files className="mr-2 size-3.5" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400" onSelect={() => setConfirmDelete(true)}>
                            <Trash2 className="mr-2 size-3.5" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* pointer-events-none so clicks on the text reach the card link beneath. */}
            <div className="pointer-events-none relative flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-sm font-semibold text-neutral-900 dark:text-white">{draft.name}</p>
                {draft.tailoredFor && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">For {draft.tailoredFor}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {draft.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-1.5 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-neutral-900">
                            <Star className="size-2.5 fill-current" /> Default
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                        {sources.map((src) => <SourceIcon key={src} source={src} />)}
                        {ORIGIN_LABEL[origin]}
                    </span>
                    {draft.isPublic && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                            <Globe className="size-2.5" /> Public{draft.viewCount ? ` · ${draft.viewCount} views` : ''}
                        </span>
                    )}
                    {draft.atsScore !== null && (
                        <span className={cn(
                            'rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                            draft.atsScore >= 60 ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                        )}>
                            ATS {draft.atsScore}
                        </span>
                    )}
                </div>
                <p className="mt-auto pt-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="capitalize">{draft.templateSlug.replace(/-/g, ' ')}</span>
                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="tabular-nums">Edited {formatDate(draft.updatedAt)}</span>
                </p>
            </div>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{draft.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {draft.isDefault
                                ? 'This is your default resume. Another one becomes the default. This cannot be undone.'
                                : 'This cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Keep it</AlertDialogCancel>
                        <AlertDialogAction className="cursor-pointer" onClick={() => onDelete(draft.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function SourceIcon({ source }: { source: ImportSource }) {
    const cls = 'size-2.5'
    if (source === 'linkedin') return <Linkedin className={cls} aria-label="LinkedIn" />
    if (source === 'github') return <Github className={cls} aria-label="GitHub" />
    if (source === 'twitter') return <Twitter className={cls} aria-label="X" />
    if (source === 'portfolio') return <Globe className={cls} aria-label="Portfolio" />
    return <FileText className={cls} aria-label="Pasted text" />
}

// ─── Main Hub ────────────────────────────────────────────────────────────────
/** "a, b and c" - so the toast reads as a sentence rather than a dumped array. */
function listOf(items: string[]): string {
    const lower = items.map(f => f.toLowerCase())
    if (lower.length === 1) return lower[0] as string
    return `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`
}

type Filter = 'all' | Origin

export function ResumeHub({ drafts: initialDrafts, templates, links, initialOrigin, openImport }: Props) {
    const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(!!openImport)
    const [filter, setFilter] = useState<Filter>(initialOrigin ?? 'all')
    const [, startTransition] = useTransition()

    // `?import=1` opens the sheet once, then leaves the URL so a reload does not reopen it.
    useEffect(() => {
        if (!openImport) return
        const url = new URL(window.location.href)
        url.searchParams.delete('import')
        window.history.replaceState(null, '', url)
    }, [openImport])

    const counts = useMemo(() => {
        const c: Record<Filter, number> = { all: drafts.length, created: 0, profile: 0, upload: 0, imported: 0, tailored: 0 }
        for (const d of drafts) c[originOf(d).origin]++
        return c
    }, [drafts])

    // A filter emptied by a delete falls back to All rather than showing nothing.
    const activeFilter: Filter = filter !== 'all' && counts[filter] === 0 ? 'all' : filter
    const visible = activeFilter === 'all' ? drafts : drafts.filter(d => originOf(d).origin === activeFilter)

    const chooseFilter = (f: Filter) => {
        setFilter(f)
        const url = new URL(window.location.href)
        if (f === 'all') url.searchParams.delete('origin')
        else url.searchParams.set('origin', f)
        window.history.replaceState(null, '', url)
    }

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const res = await deleteResumeDraft(id)
            if (res && 'success' in res && res.success === false) {
                toast.error('Could not delete the resume')
                return
            }
            setDrafts(d => d.filter(x => x.id !== id))
            toast.success('Resume deleted')
        })
    }

    const handleTogglePublic = (id: string, val: boolean) => {
        startTransition(async () => {
            await updateResumeDraft(id, { isPublic: val })
            setDrafts(d => d.map(x => x.id === id ? { ...x, isPublic: val } : x))
            toast.success(val ? 'Resume is now public' : 'Resume is now private')
        })
    }

    const handleSetDefault = (id: string) => {
        startTransition(async () => {
            const res = await setDefaultResumeDraft(id)
            if (!res.success) {
                toast.error(res.error ?? 'Could not set the default resume')
                return
            }
            setDrafts(d => d.map(x => ({ ...x, isDefault: x.id === id })))
            toast.success('ShipItHQ AI will use this resume from now on')
        })
    }

    const handleDuplicate = (id: string) => {
        startTransition(async () => {
            const res = await duplicateResumeDraft(id)
            if (res.success && res.draft) {
                setDrafts(d => [res.draft as Draft, ...d])
                toast.success('Resume duplicated')
            } else {
                toast.error('Could not duplicate the resume')
            }
        })
    }

    const platformTemplates = templates.filter(t => t.isPlatform)
    const filters: Filter[] = ['all', ...ORIGINS.filter(o => counts[o] > 0)]

    return (
        <div className="mx-auto w-full max-w-6xl pb-16">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Resume Builder</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Build, import and tailor resumes. The default one is what ShipItHQ AI reads.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setImportOpen(true)}>
                        <Sparkles className="mr-1.5 size-3.5" /> Import with AI
                    </Button>
                    <Button size="sm" className="cursor-pointer" onClick={() => setSheetOpen(true)}>
                        <Plus className="mr-1.5 size-3.5" /> New resume
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="resumes">
                <div className="flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                    <TabsList variant="segmented" size="sm" fit>
                        <TabsTrigger value="resumes">My resumes</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>
                    {drafts.length > 0 && (
                        <Tabs value={activeFilter} onValueChange={(v) => chooseFilter(v as Filter)}>
                            <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
                                <TabsList variant="segmented" size="sm" fit aria-label="Filter by origin">
                                    {filters.map(f => (
                                        <TabsTrigger key={f} value={f}>
                                            {f === 'all' ? 'All' : ORIGIN_LABEL[f]}
                                            <span className="ml-1.5 tabular-nums opacity-60">{counts[f]}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        </Tabs>
                    )}
                </div>

                {/* ── My resumes ── */}
                <TabsContent value="resumes" className="mt-6">
                    {drafts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-20 text-center dark:border-neutral-700">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">No resumes yet</p>
                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                                Start from your profile, upload the one you have, or let AI build one from your LinkedIn and GitHub.
                            </p>
                            <div className="mt-4 flex gap-2">
                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setImportOpen(true)}>
                                    <Sparkles className="mr-1.5 size-3.5" /> Import with AI
                                </Button>
                                <Button size="sm" className="cursor-pointer" onClick={() => setSheetOpen(true)}>
                                    <Plus className="mr-1.5 size-3.5" /> New resume
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {visible.map(d => (
                                <ResumeCard
                                    key={d.id}
                                    draft={d}
                                    onDelete={handleDelete}
                                    onTogglePublic={handleTogglePublic}
                                    onDuplicate={handleDuplicate}
                                    onSetDefault={handleSetDefault}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Templates ── */}
                <TabsContent value="templates" className="mt-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {platformTemplates.map(t => (
                            <div key={t.slug} className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                                <div className="flex h-32 items-center justify-center border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
                                    <TemplatePreview shape={shapeForSlug(t.slug)} className="h-24 w-auto" />
                                </div>
                                <div className="flex flex-1 flex-col p-4">
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t.name}</p>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {t.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="mt-auto pt-4">
                                        <Button size="sm" variant="outline" className="w-full cursor-pointer" onClick={() => setSheetOpen(true)}>
                                            Use template
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <NewResumeSheet
                templates={templates}
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onOpenImport={() => { setSheetOpen(false); setImportOpen(true) }}
            />
            {/* Always mounted: the import's state lives in it, so closing the sheet mid-job keeps the job. */}
            <ImportSheet open={importOpen} onOpenChange={setImportOpen} links={links} />
        </div>
    )
}
