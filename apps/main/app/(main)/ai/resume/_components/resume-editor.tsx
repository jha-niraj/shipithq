'use client'
import Link from "next/link";

import { useState, useCallback, useTransition, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Badge } from '@repo/ui/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@repo/ui/components/ui/select'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Download, Eye, Lock, Wand2,
    Plus, Trash2, Save, ExternalLink, BarChart3, RefreshCw,
    Mail, Phone, MapPin, Github, Linkedin, Globe, Link2, GripVertical, X
} from 'lucide-react'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { MonthPicker } from '@repo/ui/components/ui/month-picker'
import { saveMyProfileLinks } from '@/actions/(main)/user/profile-links.action'
import { syncResumeDraftToProfile } from '@/actions/(main)/ai/resume-to-profile.action'
import { DotmSquare11 } from '@repo/ui/components/ui/dotm-square-11'
import toast from '@repo/ui/components/ui/sonner'
import { updateResumeDraft, scoreResumeAgainstJD } from '@/actions/(main)/ai/resume-draft.action'
import { createTailoredResume } from '@/actions/(main)/ai/resume-primary.action'
import { awaitBackgroundJob } from '@/hooks/use-background-job'
import { syncProfileToResumeDraft } from '@/actions/(main)/ai/resume-profile-sync.action'
import { extractJobDescription } from '@/actions/(main)/ai/cover-letter.action'
import { creditErrorMessage, priceSuffix } from '@/lib/credits/notify'
import {
    ResumeDraftContent, ResumeHeader, ResumeExperienceEntry,
    ResumeProjectEntry, ResumeEducationEntry, ResumeSkillGroup,
    PLATFORM_TEMPLATES
} from '@/types/resume-draft'
import { cn } from '@repo/ui/lib/utils'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

function nanoid() { return Math.random().toString(36).slice(2, 10) }

interface Props {
    draft: { id: string; name: string; templateSlug: string; isPublic: boolean; shareSlug: string; atsScore: number | null }
    content: ResumeDraftContent
    templates: Array<{ slug: string; name: string; isPlatform: boolean; config: unknown }>
}

/** "2 roles, 1 project" - only the parts that actually got written. */
function summarise(w: { experience: number; projects: number; education: number; skills: number }): string {
    const parts = [
        w.experience && `${w.experience} role${w.experience === 1 ? '' : 's'}`,
        w.projects && `${w.projects} project${w.projects === 1 ? '' : 's'}`,
        w.education && `${w.education} education entr${w.education === 1 ? 'y' : 'ies'}`,
        w.skills && `${w.skills} skill${w.skills === 1 ? '' : 's'}`,
    ].filter(Boolean) as string[]
    if (parts.length === 1) return parts[0] as string
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

// ─── Links: what to SHOW for a URL ───────────────────────────────────────────
/**
 * A resume shows a handle, not a URL.
 *
 * The header was printing `https://github.com/jha-niraj` and
 * `https://linkedin.com/in/nirajjha31` as plain grey text. Two full URLs wrapped onto a
 * second line, took more room than the name, and could not be clicked - so they were long,
 * ugly AND useless. What a reader wants is the icon and `jha-niraj`.
 *
 * Deliberately not `new URL()`: people type `github.com/x`, `@x` and bare handles, and a
 * constructor that throws on all three would take the preview down with it.
 */
function handleFor(url: string | undefined | null, kind: 'github' | 'linkedin' | 'site'): string {
    const raw = (url ?? '').trim()
    if (!raw) return ''
    const bare = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
    if (kind === 'github') return bare.replace(/^github\.com\//i, '').replace(/^@/, '').split('/')[0] || bare
    if (kind === 'linkedin') return bare.replace(/^([a-z]+\.)?linkedin\.com\/(in|company)\//i, '').split('/')[0] || bare
    // A site shows its host: "nirajjha.vercel.com", not the whole path.
    return bare.split('/')[0] || bare
}

/** Anything the user typed becomes something an anchor can actually navigate to. */
function hrefFor(url: string | undefined | null): string {
    const raw = (url ?? '').trim()
    if (!raw) return ''
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

// ─── A comma-separated list, typed as text ───────────────────────────────────
/**
 * An `<Input>` for a `string[]` that you can actually type a comma into.
 *
 * ── The bug this exists to fix ──
 *
 * Both list fields were written the obvious way: show `items.join(', ')`, and on every
 * keystroke re-parse the whole field with `.split(',').map(trim).filter(Boolean)`. That
 * round trip is lossy, and it eats exactly the characters you need to add a second entry:
 *
 *     type "ReactJS,"  ->  split gives ["ReactJS", ""]
 *                      ->  filter(Boolean) drops the empty tail  ->  ["ReactJS"]
 *                      ->  re-render shows "ReactJS"
 *
 * The comma is deleted between the keypress and the paint, so it never appears. Same for
 * the space after it, which `trim()` removes. The field was not "hard to add skills to" -
 * a second skill could not be entered at all, by any sequence of keystrokes.
 *
 * ── The fix ──
 *
 * The field owns the TEXT and the array is derived from it, rather than the other way
 * round. A half-typed "ReactJS, " is a perfectly good intermediate state; it just happens
 * to parse to the same list as "ReactJS", which is why the re-sync below compares parsed
 * forms. Blur normalises the spacing, so nobody is left looking at "React,,  Node".
 */
const parseList = (text: string) => text.split(',').map(s => s.trim()).filter(Boolean)
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

function CommaListInput({ value, onChange, placeholder, className }: {
    value: string[]
    onChange: (v: string[]) => void
    placeholder: string
    className?: string
}) {
    const [text, setText] = useState(() => value.join(', '))

    // Re-sync only when the prop describes a list this field did not just type - a profile
    // sync landing, an AI rewrite, a draft loading. Comparing PARSED forms is what keeps a
    // trailing comma alive: "ReactJS, " and ["ReactJS"] agree, so the text is left alone.
    useEffect(() => {
        setText(t => (sameList(parseList(t), value) ? t : value.join(', ')))
    }, [value])

    return (
        <Input
            className={className}
            placeholder={placeholder}
            value={text}
            onChange={e => { setText(e.target.value); onChange(parseList(e.target.value)) }}
            onBlur={() => setText(parseList(text).join(', '))}
        />
    )
}

// ─── Bullets, entered as bullets ─────────────────────────────────────────────
/**
 * One row per bullet.
 *
 * ── What this replaces ──
 *
 * A single `<Textarea>` labelled "Bullet points (one per line)", with the array joined on
 * `\n` and split back on every keystroke. Two things went wrong with that, both visible in
 * the screenshots:
 *
 *   1. Nothing enforces the "one per line" the label asks for. Paste a paragraph and you get
 *      ONE bullet 400 characters long, which the preview then renders as a single six-line
 *      `•` - the one shape a resume must never have.
 *   2. There is no affordance. The user cannot see where a bullet begins or ends, cannot
 *      reorder, and cannot delete one without selecting exactly the right run of text.
 *
 * A list of inputs makes the data structure visible. You can see you have four bullets
 * because there are four rows.
 *
 * ── Empty rows ──
 *
 * The row is kept in state while it is empty, so the field does not vanish under the cursor
 * the moment it is cleared - that is the same mistake the comma bug made. Empties are
 * stripped on the way OUT (`onCommit`), not on the way in.
 */
function BulletsEditor({ value, onChange, placeholder }: {
    value: string[]
    onChange: (v: string[]) => void
    placeholder?: string
}) {
    // Always render at least one row, so an entry with no bullets still offers somewhere
    // to type rather than just an "Add" button.
    const rows = value.length ? value : ['']

    const setRow = (i: number, text: string) => onChange(rows.map((r, idx) => (idx === i ? text : r)))
    const addRow = () => onChange([...rows, ''])
    const removeRow = (i: number) => {
        const next = rows.filter((_, idx) => idx !== i)
        onChange(next.length ? next : [''])
    }
    const move = (i: number, by: number) => {
        const j = i + by
        if (j < 0 || j >= rows.length) return
        const next = [...rows]
        const [moved] = next.splice(i, 1)
        next.splice(j, 0, moved as string)
        onChange(next)
    }

    return (
        <div className="space-y-1.5">
            {rows.map((b, i) => (
                <div key={i} className="group flex items-start gap-1.5">
                    <span className="mt-2 shrink-0 text-neutral-600 dark:text-neutral-500" aria-hidden>&bull;</span>
                    <Textarea
                        // Auto-grows, so a long bullet is fully visible instead of being a
                        // one-line box you scroll inside.
                        className="min-h-[2.25rem] flex-1 px-2 py-1.5 text-xs"
                        value={b}
                        rows={1}
                        onChange={e => setRow(i, e.target.value)}
                        onKeyDown={e => {
                            // Enter makes the NEXT bullet. That is what the old textarea's
                            // "one per line" was trying to say, made real.
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                addRow()
                            }
                        }}
                        placeholder={placeholder}
                    />
                    <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <Button
                            variant="ghost" size="sm" type="button"
                            className="h-4 w-6 cursor-pointer p-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            aria-label="Move bullet up" disabled={i === 0} onClick={() => move(i, -1)}
                        >
                            <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                        <Button
                            variant="ghost" size="sm" type="button"
                            className="h-4 w-6 cursor-pointer p-0 text-neutral-600 dark:text-neutral-400 hover:text-red-500"
                            aria-label="Remove bullet" onClick={() => removeRow(i)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ))}
            <Button
                variant="ghost" size="sm" type="button"
                className="h-6 cursor-pointer px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                onClick={addRow}
            >
                <Plus className="mr-1 h-3 w-3" />Add bullet
            </Button>
        </div>
    )
}

// ─── Section: Header ──────────────────────────────────────────────────────────
function HeaderSection({ header, onChange }: { header: ResumeHeader; onChange: (h: ResumeHeader) => void }) {
    const field = (k: keyof ResumeHeader, label: string, placeholder?: string) => (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</Label>
            <Input
                value={(header[k] as string) ?? ''}
                onChange={e => onChange({ ...header, [k]: e.target.value })}
                placeholder={placeholder}
                className="h-8 text-sm"
            />
        </div>
    )
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                {field('name', 'Full Name', 'John Doe')}
                {field('title', 'Job Title', 'Software Engineer')}
                {field('email', 'Email', 'john@example.com')}
                {field('phone', 'Phone', '+1 555 000 0000')}
                {field('location', 'Location', 'San Francisco, CA')}
                {field('website', 'Website', 'https://johndoe.dev')}
                {field('github', 'GitHub', 'github.com/johndoe')}
                {field('linkedin', 'LinkedIn', 'linkedin.com/in/johndoe')}
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Professional Summary</Label>
                <Textarea
                    value={header.summary ?? ''}
                    onChange={e => onChange({ ...header, summary: e.target.value })}
                    placeholder="A brief summary of your background and goals…"
                    // A floor, not a cage: the field grows with the text and the wrapper's
                    // ScrollArea takes over past `max-h`. 5rem showed three lines of a
                    // summary that is routinely six.
                    className="min-h-[9rem] max-h-72 text-sm"
                />
            </div>
        </div>
    )
}

// ─── Section: Experience ─────────────────────────────────────────────────────
function ExperienceSection({ items, onChange }: { items: ResumeExperienceEntry[]; onChange: (v: ResumeExperienceEntry[]) => void }) {
    const update = (id: string, patch: Partial<ResumeExperienceEntry>) =>
        onChange(items.map(x => x.id === id ? { ...x, ...patch } : x))
    const remove = (id: string) => onChange(items.filter(x => x.id !== id))
    const add = () => onChange([...items, { id: nanoid(), company: '', role: '', startDate: '', endDate: '', current: false, bullets: [''] }])

    return (
        <div className="space-y-4">
            {items.map((e, idx) => (
                <div key={e.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Position {idx + 1}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-600 dark:text-neutral-400 hover:text-red-500" onClick={() => remove(e.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input className="h-8 text-sm" placeholder="Company" value={e.company} onChange={ev => update(e.id, { company: ev.target.value })} />
                        <Input className="h-8 text-sm" placeholder="Job Title" value={e.role} onChange={ev => update(e.id, { role: ev.target.value })} />
                        {/* The company's own site. It renders as a link on the company name
                            in the preview, so a reader can check who this employer is. */}
                        <Input className="h-8 col-span-2 text-sm" placeholder="Company website (optional)" value={e.companyUrl ?? ''} onChange={ev => update(e.id, { companyUrl: ev.target.value })} />
                        <MonthPicker
                            className="h-8 text-sm"
                            aria-label="Start month"
                            placeholder="Start month"
                            value={e.startDate}
                            onChange={v => update(e.id, { startDate: v ?? '' })}
                        />
                        <div className="flex items-center gap-2">
                            {!e.current && (
                                <MonthPicker
                                    className="h-8 min-w-0 flex-1 text-sm"
                                    aria-label="End month"
                                    placeholder="End month"
                                    value={e.endDate}
                                    onChange={v => update(e.id, { endDate: v })}
                                />
                            )}
                            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                                <Checkbox
                                    className="cursor-pointer"
                                    checked={e.current}
                                    onCheckedChange={c => update(e.id, { current: c === true, endDate: c === true ? undefined : e.endDate })}
                                />
                                Current
                            </label>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Bullet points</Label>
                        <BulletsEditor
                            value={e.bullets}
                            onChange={bullets => update(e.id, { bullets })}
                            placeholder="Led migration of legacy API to GraphQL, reducing payload size by 60%"
                        />
                    </div>
                </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={add}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Position</Button>
        </div>
    )
}

// ─── Section: Projects ───────────────────────────────────────────────────────
function ProjectsSection({ items, onChange }: { items: ResumeProjectEntry[]; onChange: (v: ResumeProjectEntry[]) => void }) {
    const update = (id: string, patch: Partial<ResumeProjectEntry>) =>
        onChange(items.map(x => x.id === id ? { ...x, ...patch } : x))
    const remove = (id: string) => onChange(items.filter(x => x.id !== id))
    const add = () => onChange([...items, { id: nanoid(), name: '', description: '', technologies: [], github: '', liveUrl: '', bullets: [''] }])

    return (
        <div className="space-y-4">
            {items.map((p, idx) => (
                <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Project {idx + 1}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-600 dark:text-neutral-400 hover:text-red-500" onClick={() => remove(p.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input className="h-8 text-sm" placeholder="Project Name" value={p.name} onChange={e => update(p.id, { name: e.target.value })} />
                        <Input className="h-8 text-sm" placeholder="GitHub URL" value={p.github ?? ''} onChange={e => update(p.id, { github: e.target.value })} />
                        <Input className="h-8 text-sm col-span-2" placeholder="Live URL" value={p.liveUrl ?? ''} onChange={e => update(p.id, { liveUrl: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Technologies</Label>
                        <CommaListInput
                            className="h-8 text-sm"
                            placeholder="Technologies (comma-separated)"
                            value={p.technologies}
                            onChange={technologies => update(p.id, { technologies })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-500 dark:text-neutral-400">Bullet points</Label>
                        <BulletsEditor
                            value={p.bullets}
                            onChange={bullets => update(p.id, { bullets })}
                            placeholder="Built with React and Node.js, 500+ daily active users"
                        />
                    </div>
                </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={add}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Project</Button>
        </div>
    )
}

// ─── Section: Education ──────────────────────────────────────────────────────
function EducationSection({ items, onChange }: { items: ResumeEducationEntry[]; onChange: (v: ResumeEducationEntry[]) => void }) {
    const update = (id: string, patch: Partial<ResumeEducationEntry>) =>
        onChange(items.map(x => x.id === id ? { ...x, ...patch } : x))
    const remove = (id: string) => onChange(items.filter(x => x.id !== id))
    const add = () => onChange([...items, { id: nanoid(), institution: '', degree: '', startDate: '', endDate: '', bullets: [] }])

    return (
        <div className="space-y-4">
            {items.map((e, idx) => (
                <div key={e.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Education {idx + 1}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-600 dark:text-neutral-400 hover:text-red-500" onClick={() => remove(e.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input className="h-8 text-sm col-span-2" placeholder="Institution" value={e.institution} onChange={ev => update(e.id, { institution: ev.target.value })} />
                        <Input className="h-8 text-sm" placeholder="Degree" value={e.degree ?? ''} onChange={ev => update(e.id, { degree: ev.target.value })} />
                        <Input className="h-8 text-sm" placeholder="Field of Study" value={e.field ?? ''} onChange={ev => update(e.id, { field: ev.target.value })} />
                        <MonthPicker
                            className="h-8 text-sm"
                            aria-label="Start month"
                            placeholder="Start month"
                            value={e.startDate}
                            onChange={v => update(e.id, { startDate: v ?? '' })}
                        />
                        <MonthPicker
                            className="h-8 text-sm"
                            aria-label="End month"
                            placeholder="End month"
                            value={e.endDate}
                            onChange={v => update(e.id, { endDate: v })}
                        />
                    </div>
                </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={add}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Education</Button>
        </div>
    )
}

// ─── Section: Skills ─────────────────────────────────────────────────────────
function SkillsSection({ items, onChange }: { items: ResumeSkillGroup[]; onChange: (v: ResumeSkillGroup[]) => void }) {
    const update = (i: number, patch: Partial<ResumeSkillGroup>) =>
        onChange(items.map((x, idx) => idx === i ? { ...x, ...patch } : x))
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
    const add = () => onChange([...items, { category: '', items: [] }])

    return (
        <div className="space-y-3">
            {items.map((g, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Input className="h-7 min-w-0 flex-1 text-xs" placeholder="Category (e.g. Languages, Frameworks)" value={g.category} onChange={e => update(i, { category: e.target.value })} />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neutral-600 dark:text-neutral-400 hover:text-red-500" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <CommaListInput
                        className="h-7 text-xs"
                        placeholder="Skills (comma-separated)"
                        value={g.items}
                        onChange={items => update(i, { items })}
                    />
                </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={add}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Skill Group</Button>
        </div>
    )
}

// ─── AI Tools panel ───────────────────────────────────────────────────────────
/**
 * A docked column, not a Sheet.
 *
 * ── Why it moved ──
 *
 * As a Sheet it was an OVERLAY: it darkened the editor and covered the resume, so the one
 * thing you need while tailoring - seeing what the resume currently says - was hidden
 * behind the panel doing the tailoring. It also capped at `sm:max-w-md`, which is why the
 * "Tailor This Resume (20 credits)" button was clipped at its own edge.
 *
 * The AI rail in `app/(main)/_components/main-shell.tsx` already established the pattern and the reasoning:
 * "a real column, not an overlay. The page narrows to make room for it, so nothing the user
 * was reading gets covered." This is the same thing one level down - it narrows the editor
 * row instead of the page.
 *
 * The preview handles the narrowing on its own: `PreviewPane` measures its width with a
 * ResizeObserver and rescales, so the page stays whole as this slides in.
 */
function AIToolsPanel({ draftId, open, onClose, onContentUpdated }: {
    draftId: string; open: boolean; onClose: () => void
    onContentUpdated: (content: ResumeDraftContent) => void
}) {
    const router = useRouter()
    const [jd, setJd] = useState('')
    const [jobUrl, setJobUrl] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [company, setCompany] = useState('')
    const [phase, setPhase] = useState('')
    const [loading, setLoading] = useState<'score' | 'tailor' | 'fetch' | null>(null)
    const [scoreResult, setScoreResult] = useState<{ score: number; missing_keywords: string[]; matched_keywords: string[]; suggestions: string[] } | null>(null)
    const [tailorResult, setTailorResult] = useState<{ suggestions: string[]; keywordsAdded: string[]; summary: string } | null>(null)

    /**
     * Pull the job description off a posting URL, the same way the cover letter
     * flow does. Nobody wants to select and copy a job ad, and a partial paste is
     * the most common reason a tailored resume misses the requirements.
     */
    const handleFetchJd = async () => {
        if (!jobUrl.trim()) {
            toast.error('Paste a job posting URL first')
            return
        }
        setLoading('fetch')
        const res = await extractJobDescription(jobUrl.trim())
        setLoading(null)
        // Two checks, not one. `!res.success || !res.description` looks tidier but
        // defeats the discriminated union: TypeScript cannot narrow to the failure
        // branch through an `||` whose right side reads a success-only field, so
        // `res.error` stops existing. Narrow first, then guard the content.
        if (!res.success) {
            toast.error(res.error)
            return
        }
        if (!res.description) {
            toast.error('Could not read that posting - paste the description instead')
            return
        }
        setJd(res.description)
        // Only fill these if the user has not typed them; a page title is a guess
        // ("Careers | Acme") often enough that it must not overwrite them.
        if (res.title && !jobTitle.trim()) setJobTitle(res.title)
        if (res.company && !company.trim()) setCompany(res.company)
        toast.success('Job description pulled in - check it before tailoring')
    }

    // Scoring runs on the worker too, since RES-9.
    //
    // The reason is this panel rather than the model call: Score and Tailor sit
    // one above the other, and until now one returned inline and the other went
    // through a job. Two adjacent buttons waited differently, and the inline one
    // was the half with no phase label and no refund if the request died.
    const handleScore = async () => {
        if (!jd.trim()) return toast.error('Paste a job description first')
        setLoading('score')

        const started = await scoreResumeAgainstJD(draftId, jd)
        if (!started.success || !started.jobId) {
            setLoading(null)
            return toast.error(creditErrorMessage(started, 'Failed to score'))
        }

        const outcome = await awaitBackgroundJob<{
            score?: number
            missing_keywords?: string[]
            matched_keywords?: string[]
            suggestions?: string[]
        }>(started.jobId, (_p, phaseLabel) => { if (phaseLabel) setPhase(phaseLabel) })

        setLoading(null)
        setPhase('')
        if (!outcome.ok) return toast.error(outcome.error)

        // `typeof`, not truthiness: 0 is a real score for a resume genuinely
        // unrelated to the posting, and treating it as "no result" would hide the
        // most useful answer this panel ever gives.
        if (typeof outcome.result?.score !== 'number') {
            return toast.error('The scorer did not return a score. Please try again.')
        }

        setScoreResult({
            score: outcome.result.score,
            missing_keywords: outcome.result.missing_keywords ?? [],
            matched_keywords: outcome.result.matched_keywords ?? [],
            suggestions: outcome.result.suggestions ?? [],
        })
        setTailorResult(null)
    }

    // Tailoring makes a COPY and opens it.
    //
    // The version this replaced rewrote THIS draft in place, so tailoring for a
    // job destroyed the honest resume you had built - and tailoring again ran
    // against the already-narrowed copy, compounding it. That function was
    // deleted in RES-18; the reasoning is kept here because the copy-not-rewrite
    // rule is a live design decision, not history.
    //
    // The generation runs on the worker: it is a gpt-4o pass over a whole resume
    // plus a whole JD, which is not a call a request can hold open.
    const handleTailor = async () => {
        if (!jd.trim() || !jobTitle.trim()) return toast.error('Enter job title and paste JD')
        setLoading('tailor')

        const started = await createTailoredResume({
            sourceDraftId: draftId,
            jobTitle: jobTitle.trim(),
            company: company.trim() || undefined,
            jobDescription: jd,
        })
        if (!started.success || !started.jobId) {
            setLoading(null)
            return toast.error(creditErrorMessage(started, 'Could not start tailoring'))
        }

        const outcome = await awaitBackgroundJob<{
            suggestions?: string[]
            keywordsAdded?: string[]
            summary?: string
        }>(started.jobId, (_p, phaseLabel) => { if (phaseLabel) setPhase(phaseLabel) })

        setLoading(null)
        setPhase('')
        if (!outcome.ok) return toast.error(outcome.error)

        setTailorResult({
            suggestions: outcome.result?.suggestions ?? [],
            keywordsAdded: outcome.result?.keywordsAdded ?? [],
            summary: outcome.result?.summary ?? '',
        })
        setScoreResult(null)
        toast.success('Tailored copy created - your original is untouched')
        if (started.draftId) router.push(`/ai/resume/draft/${started.draftId}`)
    }

    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.aside
                    key="ai-tools"
                    // The width animates from 0, the same as the app shell's rail, so the
                    // preview beside it reflows continuously instead of jumping.
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 380, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="relative shrink-0 overflow-hidden border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                    aria-label="AI tools"
                >
                    {/* Pinned to the full width so the content does not reflow through every
                        intermediate width while the panel animates shut. */}
                    <div className="flex h-full w-[380px] flex-col">
                        <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                            <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                                <Wand2 className="h-4 w-4" /> AI Tools
                            </span>
                            <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 cursor-pointer p-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                onClick={onClose} aria-label="Close AI tools"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <ScrollArea className="min-h-0 flex-1" reflow>
                            <div className="space-y-5 p-4">
                                {/* Results FIRST.
                                    These sat at the bottom, under the job title, the company,
                                    the URL row and a 28rem job-description box - so the ATS
                                    score the user had just spent 5 credits on was off-screen
                                    the moment it arrived, and nothing on screen changed to say
                                    it had. The thing you paid for is the thing to show. */}
                                {/* Tailor result */}
                                {tailorResult && (
                                    <div className="space-y-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                                        {tailorResult.summary && (
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800/40">
                                                ✓ {tailorResult.summary}
                                            </p>
                                        )}
                                        {tailorResult.keywordsAdded.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-1.5">Keywords added/emphasised</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {tailorResult.keywordsAdded.map(k => <Badge key={k} className="text-xs bg-neutral-50 text-neutral-700 dark:bg-neutral-800/20 dark:text-neutral-100">{k}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                        {tailorResult.suggestions.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-1.5">What you should add to this resume</p>
                                                <ul className="space-y-1">
                                                    {tailorResult.suggestions.map((s, i) => (
                                                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400 flex gap-1.5">
                                                            <span className="text-neutral-900 dark:text-neutral-100 flex-shrink-0">→</span>{s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Changes are saved to this resume. Press Save in the editor to persist.</p>
                                    </div>
                                )}

                                {scoreResult && (
                                    <div className="space-y-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">ATS Score</span>
                                            <span className={cn('text-2xl font-black', scoreResult.score >= 80 ? 'text-neutral-800 dark:text-neutral-200' : scoreResult.score >= 60 ? 'text-neutral-800 dark:text-neutral-200' : 'text-red-600')}>
                                                {scoreResult.score}/100
                                            </span>
                                        </div>
                                        {scoreResult.missing_keywords.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-red-600 mb-1.5">Missing keywords</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {scoreResult.missing_keywords.map(k => <Badge key={k} className="text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">{k}</Badge>)}
                                                </div>
                                            </div>
                                        )}
                                        {scoreResult.suggestions.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Suggestions</p>
                                                <ul className="space-y-1">
                                                    {scoreResult.suggestions.map((s, i) => <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">• {s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Job Title</Label>
                        <Input placeholder="e.g. Senior Frontend Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Company <span className="text-neutral-600 dark:text-neutral-400">(optional)</span></Label>
                        <Input placeholder="e.g. Stripe" value={company} onChange={e => setCompany(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Job Posting URL</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://company.com/jobs/123"
                                value={jobUrl}
                                onChange={e => setJobUrl(e.target.value)}
                            />
                            <Button
                                variant="outline"
                                onClick={handleFetchJd}
                                disabled={loading !== null || !jobUrl.trim()}
                            >
                                {loading === 'fetch' ? 'Reading…' : 'Fetch'}
                            </Button>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Or paste the description below.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Job Description</Label>
                        <Textarea className="min-h-40 max-h-72 text-xs" placeholder="Paste the full job description here…" value={jd} onChange={e => setJd(e.target.value)} />
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <DotmSquare11 size={40} dotSize={5} speed={1.4} />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{loading === 'score' ? 'Scoring your resume…' : (phase || 'Creating your tailored copy…')}</p>
                        </div>
                    ) : (
                        // Stacked, not a 2-col grid: "Tailor This Resume (20 credits)" does
                        // not fit half a 380px column, and in the grid it was clipped at the
                        // panel edge with the price cut off - the one thing on the button the
                        // user most needs to read before pressing it.
                        <div className="flex flex-col gap-2">
                            <Button className="w-full cursor-pointer bg-neutral-900 text-white hover:opacity-90 dark:bg-white dark:text-black" onClick={handleTailor}>
                                <Wand2 className="mr-2 h-4 w-4 shrink-0" /> Tailor This Resume{priceSuffix('resume_tailor_jd')}
                            </Button>
                            <Button variant="outline" className="w-full cursor-pointer" onClick={handleScore}>
                                <BarChart3 className="mr-2 h-4 w-4 shrink-0" /> ATS Score{priceSuffix('resume_ats_score')}
                            </Button>
                        </div>
                    )}

                            </div>
                        </ScrollArea>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    )
}

/** The preview page's width in CSS pixels. Both the page itself and the pane that scales it
 *  are sized from this, so they cannot disagree about how wide a page is. */
const PAGE_W = 595

// ─── Live Preview (HTML) ──────────────────────────────────────────────────────
/**
 * ── Why the type here is sized for a screen, not for A4 ──
 *
 * This is not the PDF. `/api/resume/pdf/[draftId]` calls `generateResumePDF`, which renders
 * through `@react-pdf/renderer` from its own StyleSheet in `lib/resume-pdf/` - Helvetica,
 * body 9pt, name 22pt, 40/36pt page padding. This component is Inter with its own sizes and
 * its own padding, and there are five template slugs mapped onto two PDF templates. The two
 * renderers were never the same document, so nothing about matching A4 was ever being
 * preserved here.
 *
 * Which is what made the old sizes indefensible: body 10px, contact 9px, section headings
 * 9px, on a 595px page. At the width the pane actually gets this rendered contact details at
 * about 9.4px, and it was unreadable - the complaint that started this. Sizing it up costs no
 * fidelity because there was none to lose, and the preview's job is to let you check that the
 * right things are on the page in the right order.
 *
 * The one thing it must NOT do is claim to be page-accurate. It doesn't: the PDF button is
 * what produces the document that gets sent.
 */
function LivePreview({ content, templateSlug }: { content: ResumeDraftContent; templateSlug: string }) {
    const { header, experience, projects, education, skills } = content
    const platDef = PLATFORM_TEMPLATES.find(p => p.slug === templateSlug)
    const accent = platDef?.config.primaryColor ?? '#1a1a1a'

    /**
     * A section heading.
     *
     * Every heading, every entry title and every meta line used to be some variation of
     * "bold, dark, roughly this size", so EXPERIENCE, SKILLS, PROJECTS and the job titles
     * inside them all read at ONE level. A resume is skimmed, and skimming is entirely a
     * function of that contrast - if nothing is subordinate to anything, the reader has to
     * actually read it.
     *
     * Four levels now, and they differ on more than one axis each:
     *   section   small,, letterspaced, accent-coloured, ruled underneath
     *   title     largest body weight, near-black
     *   meta      same size as body, light grey, right-aligned
     *   body      neutral grey
     */
    const Section = ({ children }: { children: React.ReactNode }) => (
        <p style={{
            fontSize: 10, fontWeight: 700, color: accent, textTransform: '',
            letterSpacing: 1.6, borderBottomWidth: 1, borderBottomColor: accent,
            paddingBottom: 3, marginBottom: 8, marginTop: 18,
        }}>{children}</p>
    )
    const Title = ({ children }: { children: React.ReactNode }) => (
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>{children}</span>
    )
    const Meta = ({ children }: { children: React.ReactNode }) => (
        <span style={{ fontSize: 12, color: '#8a8a8a', whiteSpace: 'nowrap' }}>{children}</span>
    )
    /** A bullet renders as a hanging indent, so a wrapped line does not sit under the dot. */
    const Bullet = ({ children }: { children: React.ReactNode }) => (
        <li style={{ color: '#404040', marginTop: 3, lineHeight: 1.5 }}>{children}</li>
    )
    const bulletList = (items: string[]) => {
        const real = items.filter(b => b.trim().length)
        if (!real.length) return null
        return (
            <ul style={{ listStyleType: 'disc', paddingLeft: 18, marginTop: 2 }}>
                {real.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
            </ul>
        )
    }

    /** An icon plus a handle, linked. This is what the contact row is made of. */
    const Contact = ({ icon: Icon, text, href }: { icon: typeof Mail; text: string; href?: string }) => {
        const body = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <Icon size={11} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.75 }} />
                {text}
            </span>
        )
        if (!href) return body
        return (
            // `noopener` alongside `noreferrer`: a new tab gets `window.opener` otherwise.
            <a href={href} target="_blank" rel="noreferrer noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
                {body}
            </a>
        )
    }

    /** Blank-line-separated blocks. A single newline inside one stays a soft wrap. */
    const summaryParagraphs = (header.summary ?? '')
        .split(/\n\s*\n/)
        .map(t => t.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean)

    const monthYear = (iso?: string) => {
        if (!iso) return ''
        const m = /^(\d{4})-(\d{2})/.exec(iso)
        if (!m) return iso.split('T')[0] ?? ''
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`
    }
    const range = (start?: string, end?: string, current?: boolean) => {
        const a = monthYear(start)
        const b = current ? 'Present' : monthYear(end)
        return a && b ? `${a} - ${b}` : a || b
    }

    return (
        // `minHeight` is A4's 1:1.414 against PAGE_W, so a resume with only a name in it
        // still reads as a sheet of paper instead of a white strip floating in grey.
        <div
            className="bg-white text-[13px] leading-relaxed p-9"
            style={{ fontFamily: 'Inter, sans-serif', color: '#0a0a0a', minHeight: Math.round(PAGE_W * 1.414) }}
        >
            <div style={{ borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15 }}>{header.name || 'Your Name'}</p>
                {header.title && <p style={{ fontSize: 14, color: '#737373', marginTop: 2 }}>{header.title}</p>}
                {/* Icons and handles, not URLs. `rowGap` because this wraps on a narrow page
                    and two rows of contact details must not touch. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 6, color: '#737373', fontSize: 12 }}>
                    {header.email && <Contact icon={Mail} text={header.email} href={`mailto:${header.email}`} />}
                    {header.phone && <Contact icon={Phone} text={header.phone} href={`tel:${header.phone.replace(/[^+\d]/g, '')}`} />}
                    {header.location && <Contact icon={MapPin} text={header.location} />}
                    {header.github && <Contact icon={Github} text={handleFor(header.github, 'github')} href={hrefFor(header.github)} />}
                    {header.linkedin && <Contact icon={Linkedin} text={handleFor(header.linkedin, 'linkedin')} href={hrefFor(header.linkedin)} />}
                    {header.website && <Contact icon={Globe} text={handleFor(header.website, 'site')} href={hrefFor(header.website)} />}
                    {header.portfolio && <Contact icon={Link2} text={handleFor(header.portfolio, 'site')} href={hrefFor(header.portfolio)} />}
                </div>
            </div>

            {/* Paragraphs, not `white-space: pre-line`.
                `pre-line` renders every newline literally, so the blank line between two
                paragraphs became a FULL EMPTY LINE - roughly 20px of nothing between each
                one, which is why the summary took three times the height of the same text
                in the form beside it. Splitting on blank runs and spacing with a margin puts
                the gap under this component's control instead of the user's Enter key. */}
            {summaryParagraphs.length > 0 && (
                <div style={{ marginBottom: 2 }}>
                    {summaryParagraphs.map((para, i) => (
                        <p key={i} style={{ color: '#525252', lineHeight: 1.55, marginTop: i === 0 ? 0 : 6 }}>{para}</p>
                    ))}
                </div>
            )}

            {experience.length > 0 && (
                <div>
                    <Section>Experience</Section>
                    {experience.map(e => (
                        <div key={e.id} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                                <Title>
                                    {e.role}
                                    {e.company && <span style={{ fontWeight: 500, color: '#525252' }}>{' at '}
                                        {e.companyUrl
                                            ? <a href={hrefFor(e.companyUrl)} target="_blank" rel="noreferrer noopener" style={{ color: '#525252', textDecoration: 'underline', textUnderlineOffset: 2 }}>{e.company}</a>
                                            : e.company}
                                    </span>}
                                </Title>
                                <Meta>{range(e.startDate, e.endDate, e.current)}</Meta>
                            </div>
                            {e.location && <p style={{ fontSize: 12, color: '#8a8a8a' }}>{e.location}</p>}
                            {bulletList(e.bullets)}
                        </div>
                    ))}
                </div>
            )}

            {skills.length > 0 && (
                <div>
                    <Section>Skills</Section>
                    {skills.map((g, gi) => (
                        <div key={gi} style={{ marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#171717' }}>{g.category}: </span>
                            <span style={{ color: '#525252' }}>{g.items.join(' · ')}</span>
                        </div>
                    ))}
                </div>
            )}

            {projects.length > 0 && (
                <div>
                    <Section>Projects</Section>
                    {projects.map(p => (
                        <div key={p.id} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                                <Title>{p.name}</Title>
                                <span style={{ display: 'inline-flex', gap: 10, color: '#8a8a8a', fontSize: 12 }}>
                                    {p.github && <Contact icon={Github} text={handleFor(p.github, 'github')} href={hrefFor(p.github)} />}
                                    {p.liveUrl && <Contact icon={Globe} text={handleFor(p.liveUrl, 'site')} href={hrefFor(p.liveUrl)} />}
                                </span>
                            </div>
                            {p.technologies.length > 0 && (
                                <p style={{ fontSize: 12, color: '#8a8a8a', marginTop: 1 }}>{p.technologies.join(' · ')}</p>
                            )}
                            {bulletList(p.bullets)}
                        </div>
                    ))}
                </div>
            )}

            {education.length > 0 && (
                <div>
                    <Section>Education</Section>
                    {education.map(e => (
                        <div key={e.id} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                                <Title>{e.degree ? `${e.degree}${e.field ? `, ${e.field}` : ''}` : e.institution}</Title>
                                <Meta>{range(e.startDate, e.endDate)}</Meta>
                            </div>
                            {e.degree && <p style={{ fontSize: 12, color: '#525252' }}>{e.institution}</p>}
                            {bulletList(e.bullets)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Preview pane ────────────────────────────────────────────────────────────
/** `useLayoutEffect` warns when it runs during SSR, where it does nothing. Measuring before
 *  paint still matters on the client, so take it there and fall back to `useEffect` on the
 *  server, which is the standard shape for this. */
const useMeasureEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect


/**
 * The live preview, scaled to fit the space the form leaves it.
 *
 * ── Why this is measured and not a fixed width ──
 *
 * The page used to be pinned at `w-[595px]` inside a `flex-1` pane, which is only correct
 * when the pane happens to be at least 643px wide (595 plus the 24px padding either side).
 * Working the geometry out for the real shell - viewport, minus a 272px sidebar, minus the
 * 12px gutter, minus the form pane and its border:
 *
 *     viewport   card   form   preview   needs 643
 *     1024        740    440       299   cropped by 344px
 *     1280        996    440       555   cropped by  88px
 *     1440       1156    440       715   fits
 *
 * So it was already cutting the right-hand edge off the page at 1280 and below, before
 * anyone widened anything. And the AI rail is 460px by default and can be dragged to 900,
 * which subtracts from the same row - no fixed number survives a column the user resizes.
 *
 * Measuring means the form pane can take the extra width it needs without the preview
 * losing its right margin, and the whole page stays visible while the rail slides in and
 * out. `scale` is clamped at 1 so a wide screen shows it at true size rather than blown up.
 *
 * The transform needs a wrapper of the SCALED size: `transform` paints smaller but leaves
 * the layout box at full height, so without this the pane would scroll through hundreds of
 * pixels of empty grey below a shrunken page.
 */
function PreviewPane({ content, templateSlug }: { content: ResumeDraftContent; templateSlug: string }) {
    const paneRef = useRef<HTMLDivElement>(null)
    const pageRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [pageH, setPageH] = useState(0)

    useMeasureEffect(() => {
        const pane = paneRef.current
        const page = pageRef.current
        if (!pane || !page) return

        const measure = () => {
            const avail = pane.clientWidth - 48 // p-6, both sides
            const next = Math.min(1, Math.max(0.4, avail / PAGE_W))
            // Guarded: the wrapper height depends on the scale, and the height decides
            // whether this pane gets a scrollbar, which changes clientWidth. Without a
            // threshold that round trip can oscillate by a fraction of a pixel forever.
            setScale(s => (Math.abs(s - next) > 0.002 ? next : s))
            setPageH(h => (Math.abs(h - page.offsetHeight) > 0.5 ? page.offsetHeight : h))
        }

        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(pane)
        ro.observe(page)
        return () => ro.disconnect()
    }, [])

    return (
        // The padding stays on the ROOT, not the viewport: `paneRef` measures
        // `clientWidth - 48` to derive the scale, and moving `p-6` inside would make
        // that subtraction wrong by exactly one padding box.
        //
        // The measure comment below warns that a scrollbar changes `clientWidth` and
        // can oscillate the scale forever. Radix's scrollbar is an overlay and does
        // not take layout width, so that feedback loop is gone - the guard stays
        // anyway, because it also covers the page-height round trip.
        <ScrollArea
            ref={paneRef}
            className="hidden min-w-0 flex-1 bg-neutral-200 p-6 xl:block dark:bg-neutral-800"
            viewportClassName="flex items-start justify-center"
            reflow
        >
            {/* Outer box carries the scaled dimensions, so the shadow traces the page edge
                and the pane scrolls exactly as far as there is page to see. */}
            <div className="shadow-2xl" style={{ width: PAGE_W * scale, height: pageH ? pageH * scale : undefined }}>
                <div ref={pageRef} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                    <LivePreview content={content} templateSlug={templateSlug} />
                </div>
            </div>
        </ScrollArea>
    )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
export function ResumeEditor({ draft, content: initialContent, templates }: Props) {
    const [content, setContent] = useState<ResumeDraftContent>(initialContent)
    const [name, setName] = useState(draft.name)
    const [templateSlug, setTemplateSlug] = useState(draft.templateSlug)
    const [isPublic, setIsPublic] = useState(draft.isPublic)
    const [aiToolsOpen, setAiToolsOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [, startTransition] = useTransition()

    const handleSyncProfile = async () => {
        setSyncing(true)
        try {
            const result = await syncProfileToResumeDraft(draft.id)
            if (result.success) {
                setContent(result.content)
                toast.success('Profile synced. Anything you had already filled in was kept.')
            } else {
                toast.error(result.error ?? 'Sync failed')
            }
        } catch {
            toast.error('Failed to sync profile')
        } finally {
            setSyncing(false)
        }
    }

    const save = useCallback(async (silent = false) => {
        setSaving(true)
        const res = await updateResumeDraft(draft.id, { name, templateSlug, content, isPublic })

        // The same four links the import page already writes back to `users`. The header
        // form was collecting them and throwing them away, so the profile stayed empty and
        // the next Sync Profile had nothing to give - which is exactly why syncing was a
        // no-op on a real account.
        //
        // Deliberately NOT awaited into the result: both of these swallow their own errors,
        // and the draft is what the user asked to persist. A profile write must never be
        // able to fail a save.
        void saveMyProfileLinks({
            githubUrl: content.header.github,
            linkedinUrl: content.header.linkedin,
            websiteUrl: content.header.website ?? content.header.portfolio,
        })

        // Experience, projects, education and skills go back to the profile too. Without
        // this the editor was write-only: you could type a whole career into a resume and
        // your profile stayed empty, which is what made Sync Profile a no-op on a real
        // account. It upserts and never deletes - see the action's notes.
        const back = await syncResumeDraftToProfile(draft.id, content)

        setSaving(false)
        if (!silent) {
            if (!res.success) { toast.error('Save failed'); return }
            const w = back.written
            const total = w ? w.experience + w.projects + w.education + w.skills : 0
            toast.success('Saved!', total > 0 ? { description: `${summarise(w!)} also updated on your profile.` } : undefined)
        }
    }, [draft.id, name, templateSlug, content, isPublic])

    const platformTemplates = templates.filter(t => t.isPlatform)

    return (
        <div className="flex flex-col h-dvh">
            {/* ── Top bar ── */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild><Link href='/ai/resume'>
                    <ArrowLeft className="w-4 h-4" />
                </Link></Button>
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-7 text-sm border-transparent bg-transparent font-semibold w-48"
                />
                <Select value={templateSlug} onValueChange={setTemplateSlug}>
                    <SelectTrigger className="h-7 text-xs w-36 border-neutral-200 dark:border-neutral-700">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {platformTemplates.map(t => <SelectItem key={t.slug} value={t.slug} className="text-xs">{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-1.5">
                    {draft.atsScore !== null && (
                        <Badge variant="outline" className="text-xs">ATS {draft.atsScore}</Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={syncing}
                        onClick={handleSyncProfile}
                        title="Fill blank fields from your ShipItHQ profile. Your own edits are kept."
                    >
                        {syncing ? <InlineLoader size="sm" className="mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        {syncing ? 'Syncing…' : 'Sync Profile'}
                    </Button>
                    {/* A toggle now, not a one-way open. The panel is a docked column, so
                        the button that opened it is the obvious thing to press to close it -
                        the same way the AI rail's trigger behaves. */}
                    <Button
                        variant={aiToolsOpen ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 cursor-pointer text-xs"
                        aria-pressed={aiToolsOpen}
                        onClick={() => setAiToolsOpen(o => !o)}
                    >
                        <Wand2 className="w-3 h-3 mr-1" /> AI Tools
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                            startTransition(async () => {
                                await updateResumeDraft(draft.id, { isPublic: !isPublic })
                                setIsPublic(p => !p)
                                toast.success(!isPublic ? 'Made public' : 'Made private')
                            })
                        }}
                    >
                        {isPublic ? <><Eye className="w-3 h-3 mr-1" />Public</> : <><Lock className="w-3 h-3 mr-1" />Private</>}
                    </Button>
                    {isPublic && (
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(`/r/${draft.shareSlug}`, '_blank')}>
                            <ExternalLink className="w-3 h-3" />
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`/api/resume/pdf/${draft.id}`, '_blank')}>
                        <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90" onClick={() => save()}>
                        {saving ? <DotmSquare11 size={14} dotSize={2} speed={1.4} /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                    </Button>
                </div>
            </div>

            {/* ── Two-pane editor ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Form.
                    Wider than it was (440px), and the breakpoint moved from lg to xl. Below
                    1280 the preview pane could not fit a 595px page at all - it showed a
                    strip of one - so the form takes the whole width there instead, which is
                    the pane that is actually being used at that size. */}
                {/* ScrollArea rather than `overflow-y-auto`. The `sticky top-0` tab
                    strip below still pins: Radix's viewport is an ordinary overflow
                    container, so it is the sticky ancestor either way. JB-1. */}
                <ScrollArea reflow className={cn(
                    "w-full border-r border-neutral-200 bg-white transition-[width] duration-300 xl:flex-shrink-0 dark:border-neutral-800 dark:bg-neutral-900",
                    // Narrows when the AI tools column opens, for the reason
                    // `app/(main)/_components/main-shell.tsx` gives for collapsing the sidebar when the AI
                    // rail opens: "three full-width columns do not fit". Measured on a
                    // 1512px screen (page card 1228): at the full 560px the preview is left
                    // with 287px and scales to 0.40, which is a thumbnail. At 400px it gets
                    // 447px and scales to 0.67, which is still a readable page - and the
                    // form is not the pane being used while the tools panel is open.
                    aiToolsOpen ? "xl:w-[400px] 2xl:w-[460px]" : "xl:w-[560px] 2xl:w-[620px]",
                )}>
                    <Tabs defaultValue="header" className="h-full">
                        <TabsList className="sticky top-0 z-10 w-full rounded-none border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 justify-start px-4 gap-1 h-9">
                            {['header', 'experience', 'projects', 'education', 'skills'].map(t => (
                                <TabsTrigger key={t} value={t} className="text-xs capitalize h-7">{t}</TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="p-4">
                            <TabsContent value="header" className="mt-0"><HeaderSection header={content.header} onChange={h => setContent(c => ({ ...c, header: h }))} /></TabsContent>
                            <TabsContent value="experience" className="mt-0"><ExperienceSection items={content.experience} onChange={v => setContent(c => ({ ...c, experience: v }))} /></TabsContent>
                            <TabsContent value="projects" className="mt-0"><ProjectsSection items={content.projects} onChange={v => setContent(c => ({ ...c, projects: v }))} /></TabsContent>
                            <TabsContent value="education" className="mt-0"><EducationSection items={content.education} onChange={v => setContent(c => ({ ...c, education: v }))} /></TabsContent>
                            <TabsContent value="skills" className="mt-0"><SkillsSection items={content.skills} onChange={v => setContent(c => ({ ...c, skills: v }))} /></TabsContent>
                        </div>
                    </Tabs>
                </ScrollArea>

                {/* Middle: Live preview, scaled to whatever width the panes leave it. */}
                <PreviewPane content={content} templateSlug={templateSlug} />

                {/* Right: AI tools, a real column. It narrows the preview rather than
                    covering it, and PreviewPane rescales to match. */}
                <AIToolsPanel
                    draftId={draft.id}
                    open={aiToolsOpen}
                    onClose={() => setAiToolsOpen(false)}
                    onContentUpdated={(updatedContent) => setContent(updatedContent)}
                />
            </div>


        </div>
    )
}
