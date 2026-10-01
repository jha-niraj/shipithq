'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, Plus, CalendarDays } from 'lucide-react'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { PageHeader } from '@repo/ui/components/ui/page-header'
import { TabsNav } from '@repo/ui/components/ui/tabs'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { AnimatedIcon } from '@repo/ui/components/animated-icons'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import type { PathfinderCategory, PathfinderLevel, PathfinderVerification } from '@repo/db'
import { updateSubGoalStatus, deleteSubGoal, getSubGoalWithContent } from '@/actions/(main)/pathfinder/subgoals.action'
import { generateContentForAISubGoal } from '@/actions/(main)/pathfinder/goals.action'
import { awaitBackgroundJob } from '@/hooks/use-background-job'
import { usePathfinderStore, type GoalUsageSummary } from '@/app/store/pathfinderStore'
import { PractisePrepJob } from '@/components/job-import/practise-prep-job'
import { TopicRow, DayStats, isQuestion, type SubGoal, type DailySession } from './topic-row'
import { SubGoalCoding } from './subgoal-coding'
import { SubGoalContentTabs } from './subgoal-content-tabs'
import { CreateSubGoalSheet } from './create-subgoal-sheet'
import { PathfinderUsageWidget } from './pathfinder-usage-widget'
import { PathfinderMockSheet } from './pathfinder-mock-sheet'
import { ShareToggle } from './share-toggle'
import { NotesReader } from './notes-reader'
import { VerificationPageClient } from './verify/verification-page-client'

/**
 * A goal's workspace (plan/pathfinder PF-8, PF-9), in the shape of the Projects and
 * Incidents workspaces: a header with the goal and its actions, tabs across the top,
 * and a resizable topic list beside the selected topic.
 *
 *   Today   today's topics and anything added today
 *   Plan    every day of the plan
 *   Notes   every topic's notes, read straight through
 *   Verify  the quiz, coding, mock and project that prove the goal
 *
 * Below `lg` the list and the topic take turns: pick a topic and it fills the
 * screen, with a way back. The tab lives in the URL so a link can open one.
 */

export type WorkspaceTab = 'today' | 'plan' | 'notes' | 'verify'

type Goal = {
    id: string
    slug: string
    title: string
    category: PathfinderCategory
    level: PathfinderLevel
    isPublic: boolean
    totalSubGoals: number
    completedSubGoals: number
}

const TABS: { value: WorkspaceTab; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'plan', label: 'Plan' },
    { value: 'notes', label: 'Notes' },
    { value: 'verify', label: 'Verify' },
]

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10)
const label = (v: string) => v.replace(/_/g, ' ').toLowerCase()

function useIsDesktop() {
    const [desktop, setDesktop] = useState(true)
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const on = () => setDesktop(mq.matches)
        on()
        mq.addEventListener('change', on)
        return () => mq.removeEventListener('change', on)
    }, [])
    return desktop
}

export function GoalWorkspace({ goal, tab, sessions: initialSessions, verification, initialTopic = null }: {
    goal: Goal
    tab: WorkspaceTab
    sessions: DailySession[]
    verification: PathfinderVerification | null
    /** `?topic=`: opens with that topic selected, e.g. from an incident report's next steps. */
    initialTopic?: string | null
}) {
    const router = useRouter()
    const desktop = useIsDesktop()
    const setGoalUsage = usePathfinderStore((s) => s.setGoalUsage)
    const [sessions, setSessions] = useState(initialSessions)
    const [selectedId, setSelectedId] = useState<string | null>(initialTopic)
    const [addOpen, setAddOpen] = useState(false)
    const [mockOpen, setMockOpen] = useState(false)

    useEffect(() => { setSessions(initialSessions) }, [initialSessions])

    const today = dayKey(new Date())
    const todays = sessions.find((s) => dayKey(s.date) === today) ?? null
    const planned = useMemo(() => [...sessions].filter((s) => s.subGoals.length > 0).sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date))), [sessions])
    const allTopics = useMemo(() => planned.flatMap((s) => s.subGoals), [planned])
    const selected = allTopics.find((t) => t.id === selectedId) ?? null
    const done = allTopics.filter((t) => t.status === 'COMPLETED').length
    const total = allTopics.length || goal.totalSubGoals
    const pct = total ? Math.round((done / total) * 100) : 0

    const patchTopic = useCallback((id: string, next: Partial<SubGoal> | null) => {
        setSessions((prev) => prev.map((s) => ({
            ...s,
            subGoals: next === null ? s.subGoals.filter((t) => t.id !== id) : s.subGoals.map((t) => (t.id === id ? { ...t, ...next } : t)),
        })))
    }, [])

    // A topic just added is filled by a worker job; poll the selected one until its notes exist.
    useEffect(() => {
        if (!selected || selected.studioId != null || isQuestion(selected)) return
        const t = window.setInterval(async () => {
            const r = await getSubGoalWithContent(selected.id)
            if (r.success && r.subGoal) patchTopic(selected.id, r.subGoal as SubGoal)
        }, 3000)
        return () => window.clearInterval(t)
    }, [selected, patchTopic])

    const onStatus = async (id: string, status: SubGoal['status']) => {
        patchTopic(id, { status })
        const r = await updateSubGoalStatus(id, status)
        if (!r.success) { toast.error(r.error ?? 'Could not update the topic'); router.refresh(); return }
        if ('usageSummary' in r && r.usageSummary) setGoalUsage(goal.id, r.usageSummary as GoalUsageSummary)
        router.refresh()
    }
    const onDelete = async (id: string) => {
        const r = await deleteSubGoal(id)
        if (!r.success) { toast.error(r.error ?? 'Could not delete the topic'); return }
        patchTopic(id, null)
        if (selectedId === id) setSelectedId(null)
        router.refresh()
    }
    const onGenerate = async (id: string): Promise<boolean> => {
        const started = await generateContentForAISubGoal(id)
        if (!started.success) { toast.error(started.error); return false }
        if (started.jobId) {
            toast.success('Writing the notes and practice problems for this topic...')
            const outcome = await awaitBackgroundJob(started.jobId)
            if (!outcome.ok) { toast.error(`${outcome.error} Try again.`); return false }
            toast.success('This topic is ready')
        }
        const r = await getSubGoalWithContent(id)
        if (r.success && r.subGoal) patchTopic(id, r.subGoal as SubGoal)
        router.refresh()
        return true
    }
    const onAdded = (topic: SubGoal, _resources?: unknown, usage?: GoalUsageSummary) => {
        setSessions((prev) => {
            const i = prev.findIndex((s) => dayKey(s.date) === today)
            if (i >= 0) return prev.map((s, j) => (j === i ? { ...s, subGoals: [...s.subGoals, topic], totalSubGoals: s.totalSubGoals + 1 } : s))
            return [{ id: `new-${Date.now()}`, date: new Date(), totalSubGoals: 1, completedSubGoals: 0, totalQuizQuestions: 0, correctQuizAnswers: 0, totalCodingProblems: 0, solvedCodingProblems: 0, subGoals: [topic] }, ...prev]
        })
        setSelectedId(topic.id)
        if (usage) setGoalUsage(goal.id, usage)
    }

    const row = (t: SubGoal) => (
        <TopicRow key={t.id} subGoal={t} isSelected={selectedId === t.id} onSelect={() => setSelectedId(t.id)}
            onStatusChange={(s) => void onStatus(t.id, s)} onDelete={() => onDelete(t.id)}
            onGenerateContent={t.isAIGenerated && !t.isContentLoaded ? () => onGenerate(t.id) : undefined} />
    )

    const addButton = (
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />Add a topic
        </Button>
    )

    const todayList = (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 space-y-3 border-b border-neutral-200 p-3 dark:border-neutral-800">
                {addButton}
                {todays && todays.subGoals.length > 0 && <DayStats session={todays} />}
            </div>
            <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                <div className="space-y-1.5 p-3">
                    {todays && todays.subGoals.length > 0
                        ? <AnimatePresence>{todays.subGoals.map(row)}</AnimatePresence>
                        : <NothingToday next={allTopics.find((t) => t.status !== 'COMPLETED') ?? null} slug={goal.slug} onOpen={(id) => setSelectedId(id)} />}
                </div>
            </ScrollArea>
        </div>
    )

    const planList = (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-neutral-200 p-3 dark:border-neutral-800">{addButton}</div>
            <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                <div className="space-y-5 p-3">
                    {planned.length === 0 && <p className="px-1 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No topics yet. Add the first one above.</p>}
                    {planned.map((s, i) => {
                        const isToday = dayKey(s.date) === today
                        const d = s.subGoals.filter((t) => t.status === 'COMPLETED').length
                        return (
                            <section key={s.id}>
                                <p className="mb-1.5 flex items-center gap-2 px-1 font-mono text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                    Day {i + 1}
                                    <span className="normal-case tracking-normal">{new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{isToday ? ' · today' : ''}</span>
                                    <span className="ml-auto tabular-nums">{d}/{s.subGoals.length}</span>
                                </p>
                                <div className="space-y-1.5"><AnimatePresence>{s.subGoals.map(row)}</AnimatePresence></div>
                            </section>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )

    const content = selected ? (
        <SubGoalContentTabs
            key={selected.id}
            subGoalId={selected.id}
            subGoalTitle={selected.title}
            goalId={goal.id}
            hasCoding={selected.hasCoding}
            codingCompleted={selected.codingCompleted}
            codingPassed={selected.codingPassed}
            studioId={selected.studioId ?? null}
            onCodingComplete={() => router.refresh()}
            SubGoalCodingComponent={SubGoalCoding}
            subGoal={{ id: selected.id, title: selected.title, aiCodingProblem: selected.aiCodingProblem, codingCompleted: selected.codingCompleted, codingPassed: selected.codingPassed }}
        />
    ) : (
        <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
                <AnimatedIcon name="target" size={36} motion="always" className="mx-auto text-neutral-400" />
                <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">Pick a topic</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Its notes and coding problems open here.</p>
            </div>
        </div>
    )

    const split = (list: React.ReactNode) => desktop ? (
        <PanelGroup orientation="horizontal" id="pathfinder-goal" className="h-full">
            <Panel id="topics" defaultSize="24%" minSize="18%" maxSize="45%" className="min-w-0 bg-neutral-50/60 dark:bg-neutral-950">{list}</Panel>
            <PanelResizeHandle className="group relative w-px shrink-0 bg-neutral-200 outline-none dark:bg-neutral-800">
                <span className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
                <span className="absolute inset-y-0 left-0 w-px bg-transparent transition-colors group-hover:bg-neutral-400 group-data-[resize-handle-state=drag]:bg-neutral-900 dark:group-hover:bg-neutral-600 dark:group-data-[resize-handle-state=drag]:bg-white" />
            </PanelResizeHandle>
            <Panel id="topic" minSize="45%" className="flex min-w-0 flex-col">{content}</Panel>
        </PanelGroup>
    ) : selected ? (
        <div className="flex h-full min-h-0 flex-col">
            <button type="button" onClick={() => setSelectedId(null)} className="flex shrink-0 items-center gap-1.5 border-b border-neutral-200 px-4 py-2.5 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <ArrowLeft className="size-4" />All topics
            </button>
            <div className="flex min-h-0 flex-1 flex-col">{content}</div>
        </div>
    ) : list

    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <div className="shrink-0 border-b border-neutral-200 px-page py-3 dark:border-neutral-800">
                <PageHeader
                    title={goal.title}
                    subtitle={`${label(goal.category)} · ${label(goal.level)} · ${done} of ${total} topics · ${pct}%`}
                    tabs={
                        <TabsNav aria-label="Goal" size="sm" variant="segmented"
                            items={TABS.map((t) => ({ href: t.value === 'today' ? `/pathfinder/${goal.slug}` : `/pathfinder/${goal.slug}?tab=${t.value}`, label: t.label, active: tab === t.value }))} />
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <PathfinderUsageWidget goalId={goal.id} />
                            {goal.category === 'INTERVIEW_PREP' && <PractisePrepJob goalId={goal.id} />}
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setMockOpen(true)}><Mic className="size-3.5" /><span className="sm:hidden">Mock</span><span className="hidden sm:inline">Mock interview</span></Button>
                            <ShareToggle goalId={goal.id} initial={goal.isPublic} />
                        </div>
                    }
                />
            </div>

            <div className={cn('min-h-0 flex-1', (tab === 'notes' || tab === 'verify') && 'overflow-hidden')}>
                {tab === 'today' && split(todayList)}
                {tab === 'plan' && split(planList)}
                {tab === 'notes' && <NotesReader goalId={goal.id} />}
                {tab === 'verify' && (
                    <div className="flex h-full min-h-0 flex-col">
                        <VerificationPageClient goal={goal} verification={verification} />
                    </div>
                )}
            </div>

            <CreateSubGoalSheet open={addOpen} onOpenChange={setAddOpen} goalId={goal.id} onSuccess={onAdded} />
            <PathfinderMockSheet open={mockOpen} onOpenChange={setMockOpen} goalId={goal.id} goalTitle={goal.title} />
        </div>
    )
}

/** Today has nothing yet: point at the next unfinished topic in the plan. */
function NothingToday({ next, slug, onOpen }: { next: SubGoal | null; slug: string; onOpen: (id: string) => void }) {
    return (
        <div className="px-2 py-8 text-center">
            <CalendarDays className="mx-auto size-6 text-neutral-400" />
            <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">Nothing added today</p>
            {next ? (
                <>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Next in your plan:</p>
                    <button type="button" onClick={() => onOpen(next.id)} className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-900 hover:border-neutral-400 dark:border-neutral-800 dark:text-white">
                        {next.title}
                    </button>
                    <Link href={`/pathfinder/${slug}?tab=plan`} className="mt-3 inline-block text-[13px] text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400">See the whole plan</Link>
                </>
            ) : (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Add a topic to start today.</p>
            )}
        </div>
    )
}
