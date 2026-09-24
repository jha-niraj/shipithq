'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, ArrowRight, Check, Circle, CircleDot, Clock, Code2, Coins, Copy, Globe, GraduationCap, Layers, ListChecks,
    Lock, Play, Presentation, Target, Terminal, Trophy, Users,
} from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@repo/ui/components/ui/sheet'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Textarea } from '@repo/ui/components/ui/textarea'
import toast from '@repo/ui/components/ui/sonner'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { cn } from '@repo/ui/lib/utils'
import { publishProject, startProject, submitProject } from '@/actions/(main)/projects/project.action'
import type { ProjectDetailsClientProps, ProjectV2Sprint } from '@/types/project'
import { MOCK_UNLOCK_PERCENT, QUIZ_UNLOCK_PERCENT, mockUnlocked, quizUnlocked } from '@/lib/projects/gates'
import { ENROLL_CREDIT_COST } from '@/lib/credits/pricing'
import { EnrollmentDialog } from './enrollment-dialog'
import DailyStandupSheet from './daily-standup-sheet'
import { ProjectAssistantButtons } from './project-assistant-buttons'
import { SetupGuideTab } from './setup-guide-tab'
import { isSetupSprint, sprintLabel } from '@/lib/projects/sprints'

/*
 * The project page, redesigned (Niraj, 2026-09-24: "follow the one you
 * designed"; the mockup was /projects/<slug>/redesign).
 *
 * 1. The hero is one band: what the project is on the left, your progress and
 *    the one action that matters on the right. It replaced a tall card that
 *    left a column of empty page beside the title.
 * 2. "Next up" comes straight after: the task you are on, one click away.
 * 3. One body, no Overview / Setup Guide tabs. Read on the left (about, what
 *    you will learn, the plan with every sprint's tasks); glance on the right
 *    (stack, running it locally, the final gates). The full setup guide, with
 *    its ticks, opens in a sheet from the "Run it locally" card.
 *
 * The primary action depends on who is looking, in this order:
 *   a copy of this project exists for you -> open your copy
 *   you own it (yours, or your copy) and started -> open the workspace
 *   you own it, not started -> start building
 *   public, not yours -> enrol (free for a curated project)
 *
 * A legacy enrolment (a progress row on someone else's project, from before
 * enrolling made copies) has no workspace - the workspace is owner-only, and
 * the board that served it was deleted on 2026-09-24. It is offered the same
 * enrolment as anyone, with a line saying why.
 */

const workspaceUrl = (slug: string, params?: Record<string, string>) =>
    `/projects/${slug}/workspace${params ? `?${new URLSearchParams(params)}` : ''}`

export default function ProjectDetailsClient({ project, currentUserId, userCredits = 0 }: ProjectDetailsClientProps) {
    const router = useRouter()

    const isCreator = currentUserId === project?.creator?.id
    // Progress counts only on a project you own; see the legacy note above.
    const ownProgress = isCreator ? project.progress?.[0] : undefined
    const legacyEnrolment = !isCreator && !!project.progress?.[0] && project.progress[0].status !== 'NOT_STARTED'
    const userProgress = ownProgress
    const hasStarted = !!userProgress && userProgress.status !== 'NOT_STARTED'
    const isPublic = project.visibility === 'PUBLIC'
    const hasCopy = !!project.myCopySlug && !isCreator

    const [starting, setStarting] = useState(false)
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
    const [standupSheetOpen, setStandupSheetOpen] = useState(false)
    const [setupOpen, setSetupOpen] = useState(false)
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitForm, setSubmitForm] = useState({ githubUrl: '', liveUrl: '', notes: '' })

    const sprints: ProjectV2Sprint[] = project.sprints ?? []
    const status = useMemo(
        () => new Map((userProgress?.taskStatuses ?? []).map((t) => [t.taskId, t.status])),
        [userProgress]
    )
    const tasks = useMemo(() => sprints.flatMap((sp) => (sp.tasks ?? []).map((t) => ({ sprint: sp, task: t }))), [sprints])
    const done = tasks.filter((x) => status.get(x.task.id) === 'COMPLETED').length
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    const next = hasStarted ? tasks.find((x) => status.get(x.task.id) !== 'COMPLETED') : undefined
    const stackRows = Object.entries(project.stacks ?? {}).filter(([, v]) => typeof v === 'string' && v && v !== 'None') as [string, string][]
    const setupGuide = project.setupGuide
        ? {
            prerequisites: project.setupGuide.prerequisites || [],
            environmentVariables: project.setupGuide.environmentVariables || [],
            installationSteps: project.setupGuide.installationSteps || [],
            verificationSteps: project.setupGuide.verificationSteps || [],
        }
        : null
    const commands = setupGuide?.installationSteps ?? []
    // Setup is sprint 0 (plan/project-repos RP-3). A project generated before
    // it existed has none, and keeps the old "Run it locally" card.
    const setupSprint = sprints.find((sp) => isSetupSprint(sp.sprintNumber)) ?? null
    const buildSprints = sprints.filter((sp) => !isSetupSprint(sp.sprintNumber))
    const buildTaskCount = buildSprints.reduce((n, sp) => n + (sp.tasks?.length ?? 0), 0)
    const setupTasks = setupSprint?.tasks ?? []
    const setupDone = setupTasks.filter((t) => status.get(t.id) === 'COMPLETED').length
    const setupNext = setupTasks.find((t) => status.get(t.id) !== 'COMPLETED') ?? setupTasks[0]

    const openUrl = (params?: Record<string, string>) => workspaceUrl(project.slug, params)
    // Where "Start setup" goes: your workspace if you have one, else nowhere yet.
    // A copy's task ids are its own, so a copy opens on its first open task.
    const setupHref = !setupNext ? null
        : hasCopy ? workspaceUrl(project.myCopySlug!)
        : hasStarted || isCreator ? openUrl({ task: setupNext.id, file: '@task' })
        : null

    const handleStartProject = async () => {
        try {
            setStarting(true)
            const result = await startProject(project.id)
            if (result.success) {
                toast.success('Project started.')
                router.push(workspaceUrl(project.slug))
            } else {
                toast.error(result.error || 'Failed to start project')
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Something went wrong')
        } finally {
            setStarting(false)
        }
    }

    const handleSubmitProject = async () => {
        if (!submitForm.githubUrl) {
            toast.error('GitHub URL is required')
            return
        }
        try {
            setSubmitting(true)
            const result = await submitProject(project.id, {
                githubUrl: submitForm.githubUrl,
                liveUrl: submitForm.liveUrl || undefined,
                notes: submitForm.notes || undefined,
            })
            if (result.success) {
                toast.success('Project submitted.')
                setSubmitDialogOpen(false)
                setSubmitForm({ githubUrl: '', liveUrl: '', notes: '' })
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to submit project')
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit project')
        } finally {
            setSubmitting(false)
        }
    }

    // ── The primary action block (hero, right) ───────────────────────────────
    const primary = hasCopy ? (
        <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">You have your own copy of this project.</p>
            <Button asChild size="lg" className="w-full gap-2">
                <Link href={workspaceUrl(project.myCopySlug!)}><Code2 className="h-4 w-4" /> Open your copy</Link>
            </Button>
        </>
    ) : hasStarted ? (
        <>
            <ProgressBar done={done} total={tasks.length} pct={pct} />
            <Button asChild size="lg" className="w-full gap-2">
                <Link href={openUrl()}>
                    <Code2 className="h-4 w-4" /> Open the workspace
                </Link>
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => setStandupSheetOpen(true)}>
                <Target className="h-4 w-4" /> Daily standup
            </Button>
            {pct >= 90 && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setSubmitDialogOpen(true)}>
                    <Trophy className="h-4 w-4" /> Submit project
                </Button>
            )}
        </>
    ) : isCreator ? (
        <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Your project. Start it to track progress.</p>
            <Button size="lg" className="w-full gap-2" onClick={handleStartProject} disabled={starting}>
                {starting ? <><InlineLoader size="sm" /> Starting</> : <><Play className="h-4 w-4" /> Start building</>}
            </Button>
        </>
    ) : isPublic ? (
        <>
            <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Your own copy to build on</span>
                <span className="flex items-center gap-1 font-medium text-neutral-900 dark:text-white">
                    <Coins className="h-3.5 w-3.5" />
                    {/* Curated projects are free (overview, prices). */}
                    {project.isPlatformSeeded ? 'Free' : `${ENROLL_CREDIT_COST} credits`}
                </span>
            </div>
            <Button size="lg" className="w-full gap-2" onClick={() => setEnrollDialogOpen(true)}>
                <Coins className="h-4 w-4" /> Enroll
            </Button>
            {!project.isPlatformSeeded && <p className="text-xs text-neutral-500 dark:text-neutral-400">Your balance: {userCredits} credits</p>}
            {legacyEnrolment && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    You started this before projects came as copies. Enrolling gives you your own copy with its workspace; progress starts fresh there.
                </p>
            )}
        </>
    ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This project is private. Its owner can make it public for others to enrol in.
        </p>
    )

    return (
        <div className="relative w-full">
            <div className="mx-auto w-full max-w-6xl px-page py-6">
                {/* Top bar */}
                <div className="flex items-center justify-between gap-3">
                    <Link
                        href="/projects/explore"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Projects
                    </Link>
                    <div className="flex items-center gap-2">
                        <ProjectAssistantButtons
                            projectId={project.id}
                            projectSlug={project.slug}
                            isCreator={isCreator}
                            isEnrolled={hasStarted || isCreator}
                            currentUserId={currentUserId}
                        />
                    </div>
                </div>

                {/* 1. The hero, one band */}
                <section className="mt-6 grid gap-8 border-b border-neutral-200 pb-8 dark:border-neutral-800 lg:grid-cols-[1fr_300px]">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Chip>{project.difficulty.toLowerCase()}</Chip>
                            <Chip>{isPublic ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}</Chip>
                            {hasStarted && <Chip>In progress</Chip>}
                        </div>
                        {project.forkedFrom && (
                            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                                Your copy of{' '}
                                <Link href={`/projects/${project.forkedFrom.slug}`} className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                                    {project.forkedFrom.title}
                                </Link>
                            </p>
                        )}
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-3xl">{project.title}</h1>
                        <p className="mt-2 max-w-2xl text-base text-neutral-700 dark:text-neutral-200 md:text-lg">{project.shortDescription || project.description}</p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {project.estimatedHours} hours</span>
                            <span className="flex items-center gap-1.5"><ListChecks className="h-4 w-4" /> {buildTaskCount} tasks in {buildSprints.length} sprints{setupSprint ? ', after setup' : ''}</span>
                            {isPublic && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {project.totalStarted} started</span>}
                            {isPublic && <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" /> {project.totalSubmissions} finished</span>}
                        </div>
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                        {primary}
                        {isCreator && !isPublic && !project.forkedFromId && <MakePublicButton projectId={project.id} />}
                    </div>
                </section>

                {/* 2. Next up */}
                {next && (
                    <section className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Next up · {sprintLabel(next.sprint.sprintNumber)}</p>
                            <p className="mt-1 truncate text-base font-semibold text-neutral-900 dark:text-white">{next.task.title}</p>
                            <p className="mt-0.5 truncate text-sm text-neutral-600 dark:text-neutral-400">
                                {next.sprint.name}{next.task.estimatedTime ? ` · about ${next.task.estimatedTime}` : ''}
                            </p>
                        </div>
                        <Button asChild className="shrink-0 gap-2">
                            <Link href={openUrl({ task: next.task.id, file: '@task' })}>Continue <ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                    </section>
                )}

                {/* 3. One body: read on the left, glance on the right */}
                <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
                    <main className="min-w-0 space-y-10">
                        <section>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">About this project</h2>
                            <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">{project.blueprintOverview}</p>
                            {project.vision && <p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-400">{project.vision}</p>}
                            {(project.targetAudience || project.problemSolution) && (
                                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                    {project.targetAudience && (
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Who it is for</dt>
                                            <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{project.targetAudience}</dd>
                                        </div>
                                    )}
                                    {project.problemSolution && (
                                        <div>
                                            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">The problem it solves</dt>
                                            <dd className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{project.problemSolution}</dd>
                                        </div>
                                    )}
                                </dl>
                            )}
                        </section>

                        {(project.keyOutcomes?.length ?? 0) > 0 && (
                            <section>
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">What you will be able to do</h2>
                                <ol className="mt-3 space-y-3">
                                    {project.keyOutcomes.map((o, i) => (
                                        <li key={i} className="flex gap-3 text-neutral-700 dark:text-neutral-300">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-semibold tabular-nums dark:border-neutral-700">{i + 1}</span>
                                            <span className="pt-0.5">{o}</span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}

                        <section>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">The plan</h2>
                            {sprints.length === 0 ? (
                                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">No sprints yet.</p>
                            ) : (
                                <>
                                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                                        {setupSprint ? 'Setup first, then ' : ''}{buildSprints.length} sprints. Each sprint ends with a quiz and a mock interview.
                                    </p>
                                    <ol className="mt-4 space-y-3">
                                        {sprints.map((sp) => {
                                            const spTasks = sp.tasks ?? []
                                            const spDone = spTasks.filter((t) => status.get(t.id) === 'COMPLETED').length
                                            const current = next?.sprint.id === sp.id
                                            return (
                                                <li key={sp.id} className={cn('rounded-xl border p-4', current ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-800')}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{sprintLabel(sp.sprintNumber)}{current ? ' · you are here' : ''}</p>
                                                            <p className="font-semibold text-neutral-900 dark:text-white">{sp.name}</p>
                                                            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{sp.goal}</p>
                                                        </div>
                                                        {hasStarted && <span className="shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-400">{spDone}/{spTasks.length}</span>}
                                                    </div>
                                                    <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                                        {spTasks.map((t) => {
                                                            const s = status.get(t.id)
                                                            const Icon = s === 'COMPLETED' ? Check : s === 'IN_PROGRESS' ? CircleDot : Circle
                                                            return (
                                                                <li key={t.id} className="flex min-w-0 items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                                                    <Icon className={cn('h-3.5 w-3.5 shrink-0', s === 'COMPLETED' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400')} />
                                                                    <span className={cn('truncate', s === 'COMPLETED' && 'text-neutral-500 line-through')} title={t.title}>{t.title}</span>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                </li>
                                            )
                                        })}
                                    </ol>
                                </>
                            )}
                        </section>
                    </main>

                    <aside className="space-y-6">
                        {stackRows.length > 0 && (
                            <SideCard title="Stack" icon={Layers}>
                                <dl className="space-y-2 text-sm">
                                    {stackRows.map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-3">
                                            <dt className="capitalize text-neutral-500 dark:text-neutral-400">{k}</dt>
                                            <dd className="text-right font-medium text-neutral-900 dark:text-white">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </SideCard>
                        )}

                        {setupSprint && setupTasks.length > 0 && (
                            <SideCard title="Setup" icon={Terminal}>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {setupTasks.length} steps from an empty folder to the app running on your machine.
                                </p>
                                <ol className="mt-3 space-y-1.5">
                                    {setupTasks.map((t, i) => {
                                        const ticked = status.get(t.id) === 'COMPLETED'
                                        return (
                                            <li key={t.id} className="flex min-w-0 items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                                {ticked
                                                    ? <Check className="h-3.5 w-3.5 shrink-0 text-neutral-900 dark:text-white" />
                                                    : <span className="w-3.5 shrink-0 text-center text-xs tabular-nums text-neutral-500">{i + 1}</span>}
                                                <span className={cn('truncate', ticked && 'text-neutral-500 line-through')} title={t.title}>{t.title}</span>
                                            </li>
                                        )
                                    })}
                                </ol>
                                {setupHref ? (
                                    <Link href={setupHref} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white">
                                        {setupDone === setupTasks.length ? 'Review setup' : setupDone > 0 ? `Continue setup (${setupDone}/${setupTasks.length})` : 'Start setup'} <ArrowRight className="h-3 w-3" />
                                    </Link>
                                ) : (
                                    <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Opens in your workspace once you start.</p>
                                )}
                            </SideCard>
                        )}

                        {!setupSprint && setupGuide && (
                            <SideCard title="Run it locally" icon={Terminal}>
                                {commands.length > 0 && (
                                    <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 font-mono text-xs text-neutral-100">
                                        {commands.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-neutral-500">$</span>
                                                <span className="min-w-0 flex-1 truncate" title={c}>{c}</span>
                                                <CopyCommand text={c} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSetupOpen(true)}
                                    className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-white"
                                >
                                    Full setup guide <ArrowRight className="h-3 w-3" />
                                </button>
                            </SideCard>
                        )}

                        <SideCard title="Final gates" icon={GraduationCap}>
                            <GateRow
                                icon={GraduationCap} label="Final quiz" at={QUIZ_UNLOCK_PERCENT} open={quizUnlocked(pct)}
                                href={hasStarted ? openUrl({ file: '@final-quiz' }) : null}
                            />
                            <GateRow
                                icon={Presentation} label="Final mock interview" at={MOCK_UNLOCK_PERCENT} open={mockUnlocked(pct)}
                                href={hasStarted ? openUrl({ file: '@final-mock' }) : null}
                            />
                        </SideCard>
                    </aside>
                </div>
            </div>

            <EnrollmentDialog
                open={enrollDialogOpen}
                onOpenChange={setEnrollDialogOpen}
                projectId={project.id}
                projectTitle={project.title}
                projectSlug={project.slug}
                tasksCount={tasks.length}
                userCredits={userCredits}
                isFree={project.isPlatformSeeded}
            />

            <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
                <SheetContent scroll={false} side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
                    <SheetHeader className="space-y-0 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                        <SheetTitle className="text-base">Setup guide</SheetTitle>
                        <SheetDescription className="text-xs">Running {project.title} on your own machine.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea reflow className="min-h-0 flex-1">
                        <div className="px-6 py-5">
                            <SetupGuideTab storageKey={project.id} setupGuide={setupGuide} />
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <Sheet open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Submit your project</SheetTitle>
                        <SheetDescription>Share your finished project for review.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="githubUrl">GitHub repository URL</Label>
                            <Input id="githubUrl" placeholder="https://github.com/username/repo" value={submitForm.githubUrl} onChange={(e) => setSubmitForm({ ...submitForm, githubUrl: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="liveUrl">Live demo URL <span className="font-normal text-neutral-500">(optional)</span></Label>
                            <Input id="liveUrl" placeholder="https://your-project.vercel.app" value={submitForm.liveUrl} onChange={(e) => setSubmitForm({ ...submitForm, liveUrl: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes <span className="font-normal text-neutral-500">(optional)</span></Label>
                            <Textarea id="notes" placeholder="Challenges, what you learned, anything you added" value={submitForm.notes} onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })} rows={4} />
                        </div>
                    </div>
                    <SheetFooter>
                        <Button onClick={handleSubmitProject} disabled={submitting || !submitForm.githubUrl} className="w-full gap-2">
                            {submitting ? <><InlineLoader size="sm" /> Submitting</> : <><Trophy className="h-4 w-4" /> Submit project</>}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <DailyStandupSheet
                isOpen={standupSheetOpen}
                onClose={() => setStandupSheetOpen(false)}
                projectId={project.id}
                projectSlug={project.slug}
                projectTitle={project.title}
                userCredits={userCredits}
                hasStarted={hasStarted}
            />
        </div>
    )
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-0.5 capitalize text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
            {children}
        </span>
    )
}

function ProgressBar({ done, total, pct }: { done: number; total: number; pct: number }) {
    return (
        <div>
            <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Your progress</span>
                <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">{done}/{total} · {pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-500 dark:bg-white" style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

function SideCard({ title, icon: Icon, children }: { title: string; icon: typeof Layers; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <Icon className="h-4 w-4 text-neutral-500" /> {title}
            </h3>
            {children}
        </section>
    )
}

function GateRow({ icon: Icon, label, at, open, href }: { icon: typeof Layers; label: string; at: number; open: boolean; href: string | null }) {
    const body = (
        <>
            <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
            <span className="flex-1 text-neutral-800 dark:text-neutral-200">{label}</span>
            {open
                ? <span className="text-xs text-neutral-900 dark:text-white">Open</span>
                : <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"><Lock className="h-3 w-3" /> at {at}%</span>}
        </>
    )
    return href && open ? (
        <Link href={href} className="-mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900">{body}</Link>
    ) : (
        <div className="flex items-center gap-2.5 py-1.5 text-sm">{body}</div>
    )
}

function CopyCommand({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            type="button"
            aria-label={copied ? 'Copied' : 'Copy command'}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                } catch {
                    toast.error('Could not copy - select the text instead')
                }
            }}
            className="shrink-0 cursor-pointer text-neutral-500 hover:text-neutral-100"
        >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
    )
}

/*
 * "Make public" (PJ-18). One way, so it asks first - in place, not in a browser
 * confirm() dialog - and says what it does where the button is.
 */
function MakePublicButton({ projectId }: { projectId: string }) {
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)
    const [busy, setBusy] = useState(false)

    const publish = async () => {
        setBusy(true)
        const result = await publishProject(projectId)
        setBusy(false)
        if (result.success) {
            toast.success('Your project is public.')
            router.refresh()
        } else {
            toast.error(result.error || 'Could not publish')
            setConfirming(false)
        }
    }

    if (!confirming) {
        return (
            <Button variant="outline" className="w-full gap-2" onClick={() => setConfirming(true)}>
                <Globe className="h-4 w-4" /> Make public
            </Button>
        )
    }
    return (
        <div className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Others will see the sprints and tasks as they are now and can enrol in their own copy. Anything you add later stays yours. This cannot be undone.
            </p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={publish} disabled={busy}>{busy ? <InlineLoader size="sm" /> : 'Publish'}</Button>
            </div>
        </div>
    )
}
