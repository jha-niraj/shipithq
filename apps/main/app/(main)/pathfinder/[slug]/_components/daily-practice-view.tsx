'use client'

import { useState, useEffect } from 'react'
import { PractisePrepJob } from '@/components/job-import/practise-prep-job'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Target, Plus, CheckCircle2, Circle, ArrowLeft, Code2,
    Brain, Trophy, Trash2, ChevronRight, Calendar, Sparkles, Coins,
    NotebookPen, Mic
} from 'lucide-react'
import Link from 'next/link'
import { PathfinderCategory, PathfinderLevel } from '@repo/db'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@repo/ui/components/ui/accordion'
import {
    updateSubGoalStatus, deleteSubGoal, getSubGoalWithContent
} from '@/actions/(main)/pathfinder/subgoals.action'
import { generateContentForAISubGoal } from '@/actions/(main)/pathfinder/goals.action'
import { useRouter } from 'next/navigation'
import {
    usePathfinderStore
} from '@/app/store/pathfinderStore'
import { SubGoalCoding } from './subgoal-coding'
import { CreateSubGoalSheet } from './create-subgoal-sheet'
import { SubGoalContentTabs } from './subgoal-content-tabs'
import { PathfinderUsageWidget } from './pathfinder-usage-widget'
import { CreatorEarningsSheet } from './creator-earnings-sheet'
import { PathfinderMockSheet } from './pathfinder-mock-sheet'
import toast from '@repo/ui/components/ui/sonner'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AnimatedIcon } from "@repo/ui/components/animated-icons"

function PathfinderMockButton({ goalId, goalTitle }: { goalId: string; goalTitle: string }) {
    const [sheetOpen, setSheetOpen] = useState(false)
    return (
        <>
            <Button
                variant="outline"
                className="w-full gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 border-neutral-700"
                onClick={() => setSheetOpen(true)}
            >
                <Mic className="w-4 h-4" />
                Start Mock Interview
            </Button>
            <PathfinderMockSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                goalId={goalId}
                goalTitle={goalTitle}
            />
        </>
    )
}

interface SubGoal {
    id: string
    title: string
    description: string | null
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
    source: string
    aiCodingProblem: unknown
    hasCoding: boolean
    quizCompleted: boolean
    quizScore: number | null
    codingCompleted: boolean
    codingPassed: boolean
    order: number
    /**
     * What kind of thing this sub-goal is. `TOPIC` for everything created before
     * interview prep existed, and for every ordinary study goal - which is why
     * the badge below renders only when it is NOT `TOPIC`. A `TOPIC` chip would
     * appear on every sub-goal in the product and say nothing.
     */
    kind?: 'TOPIC' | 'TECHNICAL' | 'BEHAVIORAL' | 'CODING'
    isAIGenerated?: boolean
    isContentLoaded?: boolean
    studioId?: string | null
}

interface DailySession {
    id: string
    date: Date | string
    totalSubGoals: number
    completedSubGoals: number
    totalQuizQuestions: number
    correctQuizAnswers: number
    totalCodingProblems: number
    solvedCodingProblems: number
    subGoals: SubGoal[]
}

interface Goal {
    id: string
    title: string
    slug?: string
    category: PathfinderCategory
    level: PathfinderLevel
    isPublic?: boolean
}

interface DailySessionWithSubGoals {
    id: string
    date: Date | string
    totalSubGoals: number
    completedSubGoals: number
    totalQuizQuestions: number
    correctQuizAnswers: number
    totalCodingProblems: number
    solvedCodingProblems: number
    subGoals: SubGoal[]
}

interface DailyPracticeViewProps {
    goal: Goal
    initialSession: DailySession | null
    allSessions?: DailySessionWithSubGoals[]
}

function PracticeHeader({ goal, onOpenEarnings, onOpenNotes }: { goal: Goal; onOpenEarnings?: () => void; onOpenNotes?: () => void }) {
    return (
        <div className="flex-shrink-0 p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Back goes to the goal LIST. It pointed at
                        `/pathfinder/${goal.slug}` - the page this component is
                        already rendering - so the button navigated to itself and
                        appeared to do nothing. */}
                    <Link href="/pathfinder">
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Target className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                            {goal.title}
                        </h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                            Add tasks, take quizzes, solve coding problems
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <PathfinderUsageWidget goalId={goal.id} />
                    {goal.category === "INTERVIEW_PREP" && <PractisePrepJob goalId={goal.id} />}
                    {
                        onOpenNotes && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                                onClick={onOpenNotes}
                            >
                                <NotebookPen className="w-3 h-3" />
                                Open Full Notes
                            </Button>
                        )
                    }
                    {
                        goal.isPublic && onOpenEarnings && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={onOpenEarnings}
                            >
                                <Coins className="w-3 h-3 mr-1" />
                                Earnings
                            </Button>
                        )
                    }
                    <Link href={`/pathfinder/${goal.slug ?? goal.id}/verify`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            Verify this Goal
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

/** An interview-prep question (plan/interview-prep): complete on arrival, unlike a study topic. */
const isQuestion = (subGoal: Pick<SubGoal, 'kind' | 'source'>) => (subGoal.kind != null && subGoal.kind !== 'TOPIC') || subGoal.source === 'interview_report'

function SubGoalItem({
    subGoal,
    isSelected,
    onSelect,
    onStatusChange,
    onDelete,
    onGenerateContent,
}: {
    subGoal: SubGoal
    isSelected: boolean
    onSelect: () => void
    onStatusChange: (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED') => void
    onDelete: () => void
    onGenerateContent?: () => void
}) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    // An interview question is its own content: nothing is ever generated for it (IP-12).
    const hasContent = (subGoal as { studioId?: string | null }).studioId != null || subGoal.hasCoding || isQuestion(subGoal)
    const needsContentGeneration = subGoal.isAIGenerated && !subGoal.isContentLoaded && !hasContent

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (subGoal.status === 'COMPLETED') {
            onStatusChange('PENDING')
        } else {
            onStatusChange('COMPLETED')
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDeleting(true)
        await onDelete()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={onSelect}
            className={cn(
                "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all",
                isSelected
                    ? "bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-transparent"
            )}
        >
            <button
                onClick={handleToggle}
                className="flex-shrink-0 mt-0.5"
            >
                {
                    subGoal.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                    ) : (
                        <Circle className={cn(
                            "w-5 h-5 transition-colors",
                            isSelected ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-600"
                        )} />
                    )
                }
            </button>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium",
                    subGoal.status === 'COMPLETED' && "line-through text-neutral-600 dark:text-neutral-400"
                )}>
                    {subGoal.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    {
                        needsContentGeneration && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onGenerateContent && !isGenerating) {
                                        setIsGenerating(true)
                                        onGenerateContent()
                                    }
                                }}
                                className="inline-flex items-center gap-1 text-xs h-5 px-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium hover:opacity-90 transition-opacity"
                                disabled={isGenerating}
                            >
                                {isGenerating ? <InlineLoader size="sm" /> : <Sparkles className="w-2.5 h-2.5" />}
                                {isGenerating ? 'Generating...' : 'Generate Content'}
                            </button>
                        )
                    }
                    {
                        subGoal.kind && subGoal.kind !== 'TOPIC' && (
                            <Badge variant="secondary" className="h-4 px-1 text-xs bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                                {subGoal.kind === 'TECHNICAL' ? 'Technical' : subGoal.kind === 'BEHAVIORAL' ? 'Behavioral' : 'Coding'}
                            </Badge>
                        )
                    }
                    {
                        subGoal.isAIGenerated && !needsContentGeneration && !hasContent && (
                            <Badge variant="secondary" className="text-xs h-4 px-1">
                                <InlineLoader size="sm" className="mr-1" />
                                Generating...
                            </Badge>
                        )
                    }
                    {
                        !subGoal.isAIGenerated && !hasContent && subGoal.source !== 'interview_report' && (
                            <Badge variant="secondary" className="text-xs h-4 px-1">
                                <InlineLoader size="sm" className="mr-1" />
                                Generating...
                            </Badge>
                        )
                    }
                    {
                        hasContent && subGoal.quizCompleted && (
                            <Badge variant="secondary" className="text-xs h-4 px-1 bg-neutral-100 text-neutral-700">
                                <Brain className="w-2 h-2 mr-1" />
                                Quiz: {subGoal.quizScore}%
                            </Badge>
                        )
                    }
                    {
                        hasContent && subGoal.hasCoding && subGoal.codingCompleted && (
                            <Badge variant="secondary" className={cn(
                                "text-xs h-4 px-1",
                                subGoal.codingPassed
                                    ? "bg-neutral-100 text-neutral-700"
                                    : "bg-red-100 text-red-700"
                            )}>
                                <Code2 className="w-2 h-2 mr-1" />
                                {subGoal.codingPassed ? 'Passed' : 'Failed'}
                            </Badge>
                        )
                    }
                    {
                        subGoal.isAIGenerated && (
                            <Badge variant="secondary" className="text-xs h-4 px-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                                AI
                            </Badge>
                        )
                    }
                    {
                        // Asked in real interviews at this company (plan/competition/skillmeet CMP-2).
                        subGoal.source === 'interview_report' && (
                            <Badge variant="secondary" className="text-xs h-4 px-1 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                                Reported by students
                            </Badge>
                        )
                    }
                </div>
            </div>
            <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-all"
                disabled={isDeleting}
            >
                {
                    isDeleting ? (
                        <InlineLoader size="sm" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )
                }
            </button>
            <ChevronRight className={cn(
                "w-4 h-4 transition-colors",
                isSelected ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-600"
            )} />
        </motion.div>
    )
}

function SessionStats({ session }: { session: DailySession | null }) {
    if (!session) return null

    const quizPercent = session.totalQuizQuestions > 0
        ? Math.round((session.correctQuizAnswers / session.totalQuizQuestions) * 100)
        : 0

    return (
        <div className="shrink-0 p-3 border-b border-neutral-200 dark:border-neutral-800">
            <StatBand
                size="sm"
                cols={3}
                items={[
                    { icon: CheckCircle2, label: 'Tasks', value: `${session.completedSubGoals}/${session.totalSubGoals}` },
                    { icon: Brain, label: 'Quiz Score', value: `${quizPercent}%` },
                    { icon: Code2, label: 'Code', value: `${session.solvedCodingProblems}/${session.totalCodingProblems}` },
                ]}
            />
        </div>
    )
}

export function DailyPracticeView({ goal, initialSession, allSessions: initialAllSessions = [] }: DailyPracticeViewProps) {
    const router = useRouter()
    const setGoalUsage = usePathfinderStore((s) => s.setGoalUsage)
    const [session, setSession] = useState(initialSession)
    const [allSessions, setAllSessions] = useState(initialAllSessions)

    useEffect(() => {
        if (initialAllSessions.length > 0) setAllSessions(initialAllSessions)
    }, [initialAllSessions])
    const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoal | null>(null)
    const [createSheetOpen, setCreateSheetOpen] = useState(false)
    const [earningsSheetOpen, setEarningsSheetOpen] = useState(false)
    const [_isRefreshing, setIsRefreshing] = useState(false)

    // Auto-refresh to check for AI content generation
    useEffect(() => {
        const checkForContent = async () => {
            if (!selectedSubGoal) return
            if ((selectedSubGoal as { studioId?: string | null }).studioId != null) return
            // A question never gets content generated, so there is nothing to wait for (IP-12).
            if (isQuestion(selectedSubGoal)) return

            setIsRefreshing(true)
            const result = await getSubGoalWithContent(selectedSubGoal.id)
            if (result.success && result.subGoal) {
                setSelectedSubGoal(result.subGoal as SubGoal)
                // Update in session list too
                if (session) {
                    setSession({
                        ...session,
                        subGoals: session.subGoals.map(sg =>
                            sg.id === result.subGoal!.id ? result.subGoal as SubGoal : sg
                        )
                    })
                }
            }
            setIsRefreshing(false)
        }

        if (selectedSubGoal && isQuestion(selectedSubGoal)) return
        const interval = setInterval(checkForContent, 3000)
        return () => clearInterval(interval)
    }, [selectedSubGoal, session])

    const handleSubGoalAdded = (
        subGoal: SubGoal,
        _aiResources?: unknown,
        usageSummary?: import('@/app/store/pathfinderStore').GoalUsageSummary
    ) => {
        const newSubGoal: SubGoal = { ...subGoal }
        if (session) {
            setSession({
                ...session,
                subGoals: [newSubGoal, ...session.subGoals],
                totalSubGoals: session.totalSubGoals + 1,
            })
        } else {
            setSession({
                id: '',
                date: new Date(),
                totalSubGoals: 1,
                completedSubGoals: 0,
                totalQuizQuestions: 0,
                correctQuizAnswers: 0,
                totalCodingProblems: 0,
                solvedCodingProblems: 0,
                subGoals: [newSubGoal],
            })
        }
        const todayStr = new Date().toISOString().slice(0, 10)
        setAllSessions((prev) => {
            const idx = prev.findIndex(
                (s) => new Date(s.date).toISOString().slice(0, 10) === todayStr
            )
            if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = {
                    ...updated[idx]!,
                    subGoals: [newSubGoal, ...updated[idx]!.subGoals],
                    totalSubGoals: updated[idx]!.totalSubGoals + 1,
                }
                return updated
            }
            return [
                {
                    id: session?.id ?? `new-${Date.now()}`,
                    date: new Date(),
                    totalSubGoals: 1,
                    completedSubGoals: 0,
                    totalQuizQuestions: 0,
                    correctQuizAnswers: 0,
                    totalCodingProblems: 0,
                    solvedCodingProblems: 0,
                    subGoals: [newSubGoal],
                },
                ...prev,
            ]
        })
        setSelectedSubGoal(newSubGoal)
        if (usageSummary) setGoalUsage(goal.id, usageSummary)
    }

    const handleStatusChange = async (subGoalId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED') => {
        await updateSubGoalStatus(subGoalId, status)
        router.refresh()
    }

    const handleDelete = async (subGoalId: string) => {
        await deleteSubGoal(subGoalId)
        if (selectedSubGoal?.id === subGoalId) {
            setSelectedSubGoal(null)
        }
        router.refresh()
    }

    const handleGenerateContent = async (subGoalId: string) => {
        try {
            const result = await generateContentForAISubGoal(subGoalId)
            if (result.success) {
                toast.success('Content generated! Quiz and resources are ready.')
                if (result.usageSummary) setGoalUsage(goal.id, result.usageSummary)
                const updated = await getSubGoalWithContent(subGoalId)
                if (updated.success && updated.subGoal) {
                    const updatedSubGoal = updated.subGoal as SubGoal
                    setSelectedSubGoal(updatedSubGoal)
                    if (session) {
                        setSession({
                            ...session,
                            subGoals: session.subGoals.map(sg =>
                                sg.id === subGoalId ? updatedSubGoal : sg
                            ),
                        })
                    }
                }
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to generate content')
            }
        } catch {
            toast.error('Failed to generate content')
        }
    }

    return (
        // `h-[var(--page-h)]`, not `flex-1`.
        //
        // This page is a full-height two-pane workspace, and it was relying on
        // `flex-1` to get its height. Inside the app shell that never resolves:
        // the page body is a Radix ScrollArea whose viewport is
        // `display:table` (shrink-to-fit), so there is no definite height for
        // `flex-1` to fill and the whole column collapsed to its content. Measured
        // at **284px against a 943px viewport**, which crushed the task list's
        // scroller to 70px and left the Start Mock Interview button sitting just
        // below the date header with dead space beneath it.
        //
        // `h-dvh` on the ROOT is the right lever, and it has to be a class rather
        // than `h-[var(--page-h)]`: measured live, `--page-h` is published on the
        // shell's `[data-app-page]` element but does NOT inherit down to this page
        // root, so `h-[var(--page-h)]` computed to `auto` - no better than the
        // `flex-1` it replaced.
        //
        // `h-dvh` works either way. A rule in packages/ui/src/styles/globals.css
        // retargets `h-dvh` inside `[data-app-page]` at `var(--page-h, 100dvh)`,
        // so within the shell it becomes the page-card height; outside it, it is
        // simply the viewport. Both are DEFINITE, which is the whole point.
        //
        // The same class on the row BELOW was useless for a different reason: that
        // row is a `flex-1` item in a `flex-col`, and the flex algorithm decides a
        // flex item's main size, overriding `height`. Root, not row.
        <div className="flex h-dvh flex-col overflow-hidden">
            <PracticeHeader
                goal={goal}
                onOpenEarnings={goal.isPublic ? () => setEarningsSheetOpen(true) : undefined}
                onOpenNotes={() => router.push('/studio?tab=pathfinder')}
            />
            <CreatorEarningsSheet
                open={earningsSheetOpen}
                onOpenChange={setEarningsSheetOpen}
                goalId={goal.id}
                goalTitle={goal.title}
                isPublic={goal.isPublic ?? false}
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <div className="w-[350px] border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/80 dark:bg-neutral-950 h-full">
                    <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => setCreateSheetOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Add Learning Task
                        </Button>
                    </div>

                    <CreateSubGoalSheet
                        open={createSheetOpen}
                        onOpenChange={setCreateSheetOpen}
                        goalId={goal.id}
                        onSuccess={handleSubGoalAdded}
                    />

                    <SessionStats session={session} />

                    {/* `reflow` + `min-w-0`: without the pin, Radix's
                        `display:table` viewport is shrink-to-fit, so this scroller
                        collapsed to its content instead of filling the column -
                        which is why the Start Mock Interview button below rode up
                        under the date header instead of sitting at the bottom. */}
                    <ScrollArea reflow className="min-h-0 min-w-0 flex-1">
                        <div className="p-3 space-y-2">
                            {
                                (() => {
                                    const rawSessions =
                                        allSessions.length > 0 ? allSessions : session ? [session] : []
                                    // Only show dates where tasks have been created
                                    const sessionsToShow = rawSessions.filter(
                                        (s) => s.totalSubGoals > 0
                                    )
                                    if (sessionsToShow.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
                                                <AnimatedIcon name="empty-search" size={40} motion="always" className="mx-auto mb-3 opacity-60" />
                                                <p className="text-sm">No tasks yet</p>
                                                <p className="text-xs mt-1">Add your first learning task above</p>
                                            </div>
                                        )
                                    }
                                    const todayStr = new Date().toISOString().slice(0, 10)
                                    const defaultOpen =
                                        sessionsToShow.find(
                                            (s) => new Date(s.date).toISOString().slice(0, 10) === todayStr
                                        ) ?? sessionsToShow[0]
                                    return (
                                        // `key` on an uncontrolled Accordion, and it is
                                        // load-bearing: `defaultValue` is only read on the
                                        // FIRST mount. `sessionsToShow` is empty on that
                                        // render and populates afterwards, so the accordion
                                        // mounted with a value matching no item and, being
                                        // uncontrolled, never revisited it. The session sat
                                        // closed with all 15 tasks inside it - the list
                                        // looked empty while 21 rows were in the DOM.
                                        //
                                        // Keying on the session id remounts it once the real
                                        // session arrives, so `defaultValue` is read again
                                        // against data that exists.
                                        //
                                        // The fallback was also broken: `'new-${Date.now()}'`
                                        // is single-quoted INSIDE a template literal, so it
                                        // was the literal text, never interpolated. It is
                                        // gone - there is nothing sensible to open when there
                                        // is no session, and `collapsible` allows none open.
                                        <Accordion
                                            key={defaultOpen?.id ?? 'no-session'}
                                            type="single"
                                            collapsible
                                            defaultValue={defaultOpen ? `session-${defaultOpen.id}` : undefined}
                                            className="w-full space-y-1"
                                        >
                                            {
                                                sessionsToShow.map((sess) => {
                                                    const d = new Date(sess.date)
                                                    const dateStr = d.toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                    const isToday =
                                                        d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
                                                    return (
                                                        <AccordionItem
                                                            key={sess.id}
                                                            value={`session-${sess.id}`}
                                                            // NO `overflow-hidden` here. It was on this item for
                                                            // rounded corners, and it silently disabled the sticky
                                                            // date header: an ancestor with `overflow: hidden`
                                                            // becomes the scroll container that `position: sticky`
                                                            // measures against, and this item does not scroll - so
                                                            // the header had zero room to stick and rode up out of
                                                            // view with its own item. The corners are handled by
                                                            // the trigger's own `rounded-lg`.
                                                            // `[&>h3]:sticky` - the STICKY IS ON THE HEADER, not on
                                                            // the trigger inside it. Radix renders
                                                            // `<h3 class="flex"><button/></h3>`, so a sticky button
                                                            // is a flex item whose containing block is that h3, and
                                                            // an h3 is exactly as tall as the button: sticky had
                                                            // nowhere to travel and the header scrolled away like
                                                            // ordinary content. Moving it one level up makes the
                                                            // scrollport the reference instead.
                                                            className="border border-neutral-200/60 dark:border-neutral-800 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/30 [&>h3]:sticky [&>h3]:top-0 [&>h3]:z-10"
                                                        >
                                                            <AccordionTrigger className="w-full rounded-lg bg-neutral-100 py-3 px-4 hover:no-underline hover:bg-neutral-200/70 dark:bg-neutral-900 dark:hover:bg-neutral-800/70 [&[data-state=open]]:rounded-b-none">
                                                                <div className="flex items-center justify-between w-full gap-3">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <Calendar className="w-4 h-4 text-neutral-900 dark:text-neutral-100 shrink-0" />
                                                                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                                            {dateStr}
                                                                            {
                                                                                isToday && (
                                                                                    <span className="ml-1.5 text-xs font-normal text-neutral-800 dark:text-neutral-100">(Today)</span>
                                                                                )
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-200/60 dark:bg-neutral-700/50 px-2 py-0.5 rounded">
                                                                        {sess.completedSubGoals}/{sess.totalSubGoals}
                                                                    </span>
                                                                </div>
                                                            </AccordionTrigger>
                                                            {/* The date header stays visible via `sticky top-0` on
                                                                the trigger above, NOT via a scroller in here.
                                                                A nested ScrollArea was tried and measured wrong:
                                                                Radix's viewport is `h-full`, and a percentage
                                                                height resolves against the parent's HEIGHT, which
                                                                is `auto` when the bound is a `max-h`. So the root
                                                                sat at its 591px cap while the viewport inside it
                                                                grew to its content - 1350px - and the overflow was
                                                                clipped rather than scrolled. Ten of the fifteen
                                                                tasks were simply unreachable.
                                                                One scroll region, owned by the panel, with a
                                                                sticky header pinned inside it. The trigger's
                                                                background has to be OPAQUE - the item surface is
                                                                `/50` and `/30`, and rows would otherwise slide
                                                                visibly underneath it. */}
                                                            <AccordionContent className="px-2 pt-1 pb-3">
                                                                    <div className="space-y-1.5">
                                                                    <AnimatePresence>
                                                                        {
                                                                            sess.subGoals.map((subGoal) => (
                                                                                <SubGoalItem
                                                                                    key={subGoal.id}
                                                                                    subGoal={subGoal}
                                                                                    isSelected={selectedSubGoal?.id === subGoal.id}
                                                                                    onSelect={() => setSelectedSubGoal(subGoal)}
                                                                                    onStatusChange={(status) =>
                                                                                        handleStatusChange(subGoal.id, status)
                                                                                    }
                                                                                    onDelete={() => handleDelete(subGoal.id)}
                                                                                    onGenerateContent={
                                                                                        subGoal.isAIGenerated && !subGoal.isContentLoaded
                                                                                            ? () => handleGenerateContent(subGoal.id)
                                                                                            : undefined
                                                                                    }
                                                                                />
                                                                            ))
                                                                        }
                                                                    </AnimatePresence>
                                                                    </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    )
                                                })
                                            }
                                        </Accordion>
                                    )
                                })()
                            }
                        </div>
                    </ScrollArea>

                    <div className="flex-shrink-0 p-3 border-t border-neutral-200 dark:border-neutral-800">
                        <PathfinderMockButton goalId={goal.id} goalTitle={goal.title} />
                    </div>
                </div>
                {/* The empty state is rendered OUTSIDE the ScrollArea.
                    A `flex-1 items-center justify-center` box cannot centre inside
                    Radix's `display:table` viewport - percentage and flex heights
                    do not resolve through a table box, so it collapsed to its
                    content and sat at the top-left. There is also nothing to
                    scroll when there is no task selected.

                    `h-dvh` was wrong here too: this pane is already inside a
                    bounded column, so a viewport-height child overflows it. */}
                {!selectedSubGoal ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <AnimatedIcon name="target" size={32} motion="always" className="text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                                Select a Task
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Click on a task to view its quiz and coding challenge
                            </p>
                        </div>
                    </div>
                ) : (
                // A plain bounded box, NOT a ScrollArea. `SubGoalContentTabs` is
                // already `flex flex-col overflow-hidden h-full` with `flex-1
                // overflow-hidden` panes - it scrolls itself. Wrapping it in a
                // second scroller gave the studio an auto-height `display:table`
                // parent, so nothing bounded it and it spilled past the card.
                // One scroll region per axis, owned by the thing that knows its
                // own layout.
                <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                    {
                        selectedSubGoal ? (
                            <SubGoalContentTabs
                                subGoalId={selectedSubGoal.id}
                                subGoalTitle={selectedSubGoal.title}
                                goalId={goal.id}
                                hasCoding={selectedSubGoal.hasCoding}
                                codingCompleted={selectedSubGoal.codingCompleted}
                                codingPassed={selectedSubGoal.codingPassed}
                                studioId={(selectedSubGoal as { studioId?: string | null }).studioId ?? null}
                                onCodingComplete={() => router.refresh()}
                                SubGoalCodingComponent={SubGoalCoding}
                                subGoal={{
                                    id: selectedSubGoal.id,
                                    title: selectedSubGoal.title,
                                    aiCodingProblem: selectedSubGoal.aiCodingProblem,
                                    codingCompleted: selectedSubGoal.codingCompleted,
                                    codingPassed: selectedSubGoal.codingPassed,
                                }}
                            />
                        ) : null
                    }
                </div>
                )}
            </div>
        </div>
    )
}