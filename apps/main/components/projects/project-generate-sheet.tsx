'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { getProjectPicks, type RecommendedIdeaView } from '@/actions/(main)/projects/recommendations.action'
import { useRouter } from 'next/navigation'
import {
    ArrowRight, Check, Sparkles, Code2, Brain, Rocket,
    Zap, Globe, Lock, Terminal, Cpu, Layers, } from 'lucide-react'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@repo/ui/components/ui/sheet'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { Label } from '@repo/ui/components/ui/label'
import { Progress } from '@repo/ui/components/ui/progress'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import toast from '@repo/ui/components/ui/sonner'
import { ProjectEchoSchema } from '@/actions/(main)/schemas/projects.schema'
import { startProjectGeneration, getGenerationStatus } from '@/actions/(main)/workers/projectsworker.action'
import { z } from 'zod'
import { cn } from '@repo/ui/lib/utils'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

type FormData = z.infer<typeof ProjectEchoSchema>

const GENERATION_TYPES = [
    { value: 'FULL_STACK', label: 'Full Stack', icon: Layers, description: 'Complete web app' },
    { value: 'FRONTEND', label: 'Frontend', icon: Code2, description: 'UI-focused build' },
    { value: 'APP', label: 'Mobile App', icon: Rocket, description: 'iOS & Android' },
    { value: 'PROGRAMS', label: 'Programs', icon: Terminal, description: 'CLI tools & scripts' },
    { value: 'AI/ML', label: 'AI / ML', icon: Sparkles, description: 'Models & pipelines' },
    { value: 'AI_AGENT', label: 'AI Agent', icon: Zap, description: 'Autonomous systems' },
    { value: 'OTHER', label: 'Other', icon: Brain, description: 'Custom project' },
] as const

const DIFFICULTY_LEVELS = [
    { value: 'BEGINNER', label: 'Beginner', desc: '0-6 months' },
    { value: 'INTERMEDIATE', label: 'Intermediate', desc: '6-18 months' },
    { value: 'ADVANCED', label: 'Advanced', desc: '18+ months' },
] as const

const FRONTEND_STACKS = ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'React Native']
const BACKEND_STACKS = ['Node.js', 'Next.js API', 'Python / FastAPI', 'Django', 'Java / Spring', 'Go']
const DATABASES = ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'Supabase', 'Firebase']

/** EASY/MEDIUM/HARD (catalogue and picks) to what this form and the generator take. */
function toFormDifficulty(value?: string): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
    switch ((value ?? '').toUpperCase()) {
        case 'EASY':
        case 'BEGINNER':
            return 'BEGINNER'
        case 'HARD':
        case 'ADVANCED':
            return 'ADVANCED'
        default:
            return 'INTERMEDIATE'
    }
}

interface ProjectGenerateSheetProps {
    trigger?: React.ReactNode
    onSuccess?: (projectSlug: string) => void
    spaceId?: string
    defaultValues?: { title?: string; description?: string; type?: string; difficulty?: string }
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const PHASES = [
    'Designing the project blueprint',
    'Saving your project',
    'Creating sprints & tasks',
    'Finalizing',
]

export default function ProjectGenerateSheet({
    trigger, onSuccess, defaultValues, isOpen: externalIsOpen, onOpenChange: externalOnOpenChange,
}: ProjectGenerateSheetProps) {
    const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const open = externalIsOpen !== undefined ? externalIsOpen : internalOpen
    const setOpen = useCallback((v: boolean) => { setInternalOpen(v); externalOnOpenChange?.(v) }, [externalOnOpenChange])

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [phaseLabel, setPhaseLabel] = useState<string>(PHASES[0]!)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    /*
     * What the onboarding already knows (plan/projects, PJ-6).
     *
     * The projects onboarding asks what someone has built, what stopped the ones
     * that died and how many hours they have, and this form ignored all of it.
     * The picks made from those answers are offered here; pressing one fills the
     * form, and it stays editable, because the answer to "what do you want to
     * build" has to remain theirs.
     */
    const [picks, setPicks] = useState<RecommendedIdeaView[]>([])
    useEffect(() => {
        if (!open) return
        let cancelled = false
        void getProjectPicks()
            .then((r) => { if (!cancelled) setPicks(r.picks.slice(0, 3)) })
            .catch(() => undefined)
        return () => { cancelled = true }
    }, [open])

    const [form, setForm] = useState<Partial<FormData>>({
        projectTitle: defaultValues?.title || '',
        projectDescription: defaultValues?.description || '',
        generationType: (defaultValues?.type as FormData['generationType']) || undefined,
        // The catalogue and the picks say EASY/MEDIUM/HARD; this form and the
        // generator's schema say BEGINNER/INTERMEDIATE/ADVANCED. Passing one
        // through as the other failed Zod at Generate with a raw toast.
        difficulty: toFormDifficulty(defaultValues?.difficulty),
        technologies: [],
        LearnsFocus: [],
        stacks: { frontend: '', backend: '', database: '', deployment: '', aiProvider: '' },
        preferences: { generateNow: true, pagesPreset: 'CUSTOM' },
        visibility: 'PUBLIC',
        includeAssessment: false,
    })

    const set = (key: keyof FormData, value: unknown) => setForm(p => ({ ...p, [key]: value }))
    const setStack = (key: string, value: string) =>
        setForm(p => ({ ...p, stacks: { ...(p.stacks || {}), [key]: p.stacks?.[key as keyof typeof p.stacks] === value ? '' : value } }))

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

    const cost = (form.visibility === 'PUBLIC' ? 13 : 25) + (form.includeAssessment ? 30 : 0)

    // The three things `ProjectEchoSchema` actually requires. Checked here so the
    // button is disabled rather than the user finding out through a Zod toast
    // after clicking Generate.
    const canProceed =
        (form.projectTitle?.length ?? 0) >= 3 &&
        (form.projectDescription?.length ?? 0) >= 10 &&
        !!form.generationType

    const startPolling = useCallback((jobId: string) => {
        pollingRef.current = setInterval(async () => {
            const s = await getGenerationStatus(jobId)
            if (!s.success) return
            if (typeof s.progress === 'number') setProgress(s.progress)
            if (s.phaseLabel) setPhaseLabel(s.phaseLabel)
            if (s.status === 'completed' && s.slug) {
                if (pollingRef.current) clearInterval(pollingRef.current)
                setProgress(100)
                toast.success('Project generated!')
                if (onSuccess) onSuccess(s.slug)
                else router.push(`/projects/${s.slug}`)
                setOpen(false)
            } else if (s.status === 'failed') {
                if (pollingRef.current) clearInterval(pollingRef.current)
                setLoading(false)
                toast.error(s.error || 'Generation failed. Please try again.')
            }
        }, 3000)
    }, [onSuccess, router, setOpen])

    const handleSubmit = async () => {
        try {
            const validated = ProjectEchoSchema.parse(form)
            setLoading(true)
            setProgress(5)
            setPhaseLabel(PHASES[0]!)
            const res = await startProjectGeneration(validated)
            if (!res.success || !res.jobId) {
                setLoading(false)
                toast.error(res.error || 'Could not start generation')
                return
            }
            startPolling(res.jobId)
        } catch (err) {
            if (err instanceof z.ZodError) toast.error(err.issues[0]?.message || 'Please complete the form')
            else toast.error('Something went wrong')
        }
    }

    // ── Generating view ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <Sheet open={open} onOpenChange={(v) => { if (!v) toast.info('Generation continues in the background.'); setOpen(v) }}>
                <SheetContent scroll={false} side="right" className="flex w-full flex-col p-0 sm:max-w-[720px]">
                    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
                        <div className="relative flex h-20 w-20 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-neutral-900/20" />
                            <Sparkles className="h-7 w-7 text-neutral-900 dark:text-neutral-100" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Building your project</h3>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{phaseLabel}</p>
                        </div>
                        <div className="w-full max-w-sm">
                            <Progress value={progress} className="h-1.5" />
                            <div className="mt-2 flex justify-between font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                <span>{progress}%</span>
                                <span>~1-2 min</span>
                            </div>
                        </div>
                        <div className="w-full max-w-sm space-y-2">
                            {PHASES.map((p, i) => {
                                const active = phaseLabel === p
                                const done = PHASES.indexOf(phaseLabel) > i
                                return (
                                    <div key={p} className="flex items-center gap-2.5 text-sm">
                                        {done ? <Check className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                                            : active ? <InlineLoader size="sm" className="text-neutral-900 dark:text-neutral-100" />
                                                : <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700" />}
                                        <span className={cn(done || active ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400')}>{p}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <Button variant="outline" onClick={() => setOpen(false)} className="mt-2">Close - keep generating</Button>
                    </div>
                </SheetContent>
            </Sheet>
        )
    }

    // ── Form view ────────────────────────────────────────────────────────────
    //
    // The trigger DEFAULTS to a real button. It used to be `{trigger && ...}` with
    // no fallback, so the three call sites that pass neither `trigger` nor
    // `isOpen` - the hub's primary hero action, the hub's closing CTA, and the
    // "Registry Empty" state whose whole job is to offer this action - each
    // mounted a Sheet that rendered nothing and could not be opened. A component
    // whose only purpose is to open should not answer silence with silence.
    // See PRJ-8.
    //
    // `isControlled` is what stops the ideas page, which drives `isOpen` itself,
    // from getting a second stray button beside its own.
    const isControlled = externalIsOpen !== undefined

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger ? (
                <SheetTrigger asChild>{trigger}</SheetTrigger>
            ) : !isControlled ? (
                <SheetTrigger asChild>
                    <Button className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Generate a project
                    </Button>
                </SheetTrigger>
            ) : null}
            {/*
              * `scroll={false}` is load-bearing (Niraj, 2026-09-23: "this should be
              * on the bottom of the sheet like sticky").
              *
              * SheetContent wraps its children in a ScrollArea unless told not to,
              * so the header, the body's own ScrollArea and the footer were all
              * inside one outer scroller and the cost row scrolled away with the
              * form. This sheet lays itself out: header, `flex-1` body, pinned
              * footer.
              */}
            <SheetContent scroll={false} side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[720px]">
                <SheetHeader className="space-y-0 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-base">Generate a project</SheetTitle>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Two answers is enough. The AI decides the rest.
                            </p>
                        </div>
                    </div>
                </SheetHeader>

                {/* ONE screen, not two.
                    This was a wizard asking for title, description, type, difficulty,
                    technologies, learning focus and five separate stack pickers before
                    it would start - nine answers to a question the user is asking the
                    AI precisely because they do not want to answer it themselves.
                    Niraj, 2026-08-29: "make sure that we are not asking much questions".

                    What is left required is what genuinely steers the output and cannot
                    be inferred from the description: what to build, and how hard.

                    Cost-bearing choices stay VISIBLE. Visibility and the assessment
                    toggle change the price (13 vs 25, plus 30), and a field hidden
                    behind a disclosure that silently changes what someone is charged is
                    worse than one more question. Only the stack pickers - which cost
                    nothing and have a good default of "let the AI pick" - are folded
                    away. See PRJ-9. */}
                {/* ScrollArea, not `overflow-y-auto`. The native scrollbar is an OS
                    control: it paints outside the sheet's rounded corner on Windows,
                    reserves gutter width on some platforms and not others, and cannot
                    be styled to match this surface. `min-h-0 flex-1` because a flex
                    child defaults to `min-height: auto` and refuses to shrink below
                    its content - without it the footer with the Generate button gets
                    pushed off the bottom instead of this list scrolling. See JB-1. */}
                <ScrollArea className="min-h-0 min-w-0 flex-1" reflow>
                    <div className="space-y-5 px-6 py-5">
                        {/* Only while the form is untouched: once someone starts typing,
                            a list of other projects is in the way. */}
                        {picks.length > 0 && !form.projectDescription && !form.projectTitle && (
                            <div className="space-y-1.5">
                                <Label className="text-sm">From your onboarding</Label>
                                <ul className="space-y-1.5">
                                    {picks.map((pick) => (
                                        <li key={pick.title}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    set('projectTitle', pick.title)
                                                    set('projectDescription', pick.description)
                                                    set('difficulty', toFormDifficulty(pick.difficulty))
                                                }}
                                                className="group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">{pick.title}</span>
                                                    {pick.why && <span className="mt-0.5 block truncate text-xs text-neutral-600 dark:text-neutral-400">{pick.why}</span>}
                                                </span>
                                                <span className="shrink-0 text-xs font-medium text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white">Use this</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-sm">What do you want to build?</Label>
                            {/* The base Input/Textarea/SelectTrigger are square
                                (packages/ui). A form field in a panel like this
                                asks for its own radius - Niraj, 2026-09-23. */}
                            <Textarea
                                rows={4}
                                                                placeholder="A realtime collaboration board for small design teams. Boards, sticky notes, live cursors, and comments."
                                value={form.projectDescription}
                                onChange={e => set('projectDescription', e.target.value)}
                            />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                The more concrete this is, the better the sprints and tasks come out.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm">Call it</Label>
                            <Input
                                                                placeholder="Realtime collaboration board"
                                value={form.projectTitle}
                                onChange={e => set('projectTitle', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">What kind of project?</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {GENERATION_TYPES.map(t => {
                                    const active = form.generationType === t.value
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => set('generationType', t.value)}
                                            className={cn(
                                                'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                                                active
                                                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                                                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700',
                                            )}
                                        >
                                            <t.icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500')} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t.label}</p>
                                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">How hard should it be?</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTY_LEVELS.map(d => {
                                    const active = form.difficulty === d.value
                                    return (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => set('difficulty', d.value)}
                                            className={cn(
                                                'cursor-pointer rounded-xl border p-3 text-center transition-colors',
                                                active
                                                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                                                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700',
                                            )}
                                        >
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{d.label}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{d.desc}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {([
                                { value: 'PUBLIC', label: 'Public', desc: 'Anyone can view · 13 credits', icon: Globe },
                                { value: 'PRIVATE', label: 'Private', desc: 'Only you · 25 credits', icon: Lock },
                            ] as const).map(v => {
                                const active = form.visibility === v.value
                                return (
                                    <button
                                        key={v.value}
                                        type="button"
                                        onClick={() => set('visibility', v.value)}
                                        className={cn(
                                            'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                                            active
                                                ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                                                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700',
                                        )}
                                    >
                                        <v.icon className={cn('mt-0.5 h-4 w-4', active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500')} />
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{v.label}</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{v.desc}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => set('includeAssessment', !form.includeAssessment)}
                            className={cn(
                                'flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors',
                                form.includeAssessment
                                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                                    : 'border-neutral-200 dark:border-neutral-800',
                            )}
                        >
                            <span className="flex items-center gap-2.5">
                                <Cpu className={cn('h-4 w-4', form.includeAssessment ? 'text-neutral-900 dark:text-white' : 'text-neutral-500')} />
                                <span>
                                    <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Add skill assessment</span>
                                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">Auto-graded checkpoints · +30 credits</span>
                                </span>
                            </span>
                            <span className={cn('h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors', form.includeAssessment ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700')}>
                                <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform dark:bg-neutral-900', form.includeAssessment && 'translate-x-4')} />
                            </span>
                        </button>

                        {/* Folded away, and genuinely optional: the generator picks a
                            coherent stack on its own, and picking one badly is a worse
                            outcome than not picking. */}
                        <details className="group rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-neutral-900 dark:text-white">
                                <span className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-neutral-500" />
                                    Pick the stack yourself
                                    <span className="font-normal text-neutral-500 dark:text-neutral-400">· optional</span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="space-y-3 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Leave these alone and the AI picks a stack that fits what you described.
                                </p>
                                <StackRow label="Frontend" options={FRONTEND_STACKS} value={form.stacks?.frontend} onSelect={v => setStack('frontend', v)} />
                                <StackRow label="Backend" options={BACKEND_STACKS} value={form.stacks?.backend} onSelect={v => setStack('backend', v)} />
                                <StackRow label="Database" options={DATABASES} value={form.stacks?.database} onSelect={v => setStack('database', v)} />
                            </div>
                        </details>

                        {/* The cost used to be stated HERE as well, in a panel at the
                            foot of the form, and again on the pinned footer two
                            inches below it. One price, said once, where the button
                            that charges it lives (Niraj, 2026-09-23). */}
                    </div>
                </ScrollArea>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Takes about a minute. You can close this and it keeps going.
                        <span className="block">Credits are only charged once it succeeds.</span>
                    </p>
                    {/* `disabled` was gated on `canProceed` alone, so the button
                        stayed live through the dispatch and a double click bought
                        two projects (sweep 2026-09-23, loading P2). */}
                    <Button onClick={handleSubmit} disabled={!canProceed || loading} className="shrink-0">
                        {loading ? (
                            <><InlineLoader size="sm" className="mr-1.5" /> Starting</>
                        ) : (
                            <><Sparkles className="mr-1.5 h-4 w-4" /> Generate · {cost} credits</>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function StackRow({ label, options, value, onSelect }: { label: string; options: string[]; value?: string; onSelect: (v: string) => void }) {
    return (
        <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(o => {
                    const active = value === o
                    return (
                        <button key={o} type="button" onClick={() => onSelect(o)}
                            className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
                                active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300')}>
                            {o}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
