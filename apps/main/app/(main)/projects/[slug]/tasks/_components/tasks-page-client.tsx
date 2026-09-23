'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    ArrowLeft, Target, CheckCircle2, Info, Sparkles, AlertCircle, Play, ChevronRight, ChevronDown, RotateCcw, Zap
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@repo/ui/components/ui/button'
import {
    Card, CardContent
} from '@repo/ui/components/ui/card'
import { Progress } from '@repo/ui/components/ui/progress'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
    DialogFooter
} from '@repo/ui/components/ui/dialog'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import toast from '@repo/ui/components/ui/sonner'
import { updateTaskStatus } from '@/actions/(main)/projects/project.action'
import {
    checkTaskDetailExists, generateTaskDetail, getTaskDetail
} from '@/actions/(main)/projects/task-details.action'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

// ============================================================================
// Types
// ============================================================================
interface TaskWithStatus {
    id: string
    title: string
    description: string[]
    criteria: string[]
    hints: string[]
    badges: string[]
    tags: string[]
    difficulty: string
    terminalCommand: string | null
    status: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'
    completedAt: Date | null
    notes: string | null
}

interface TasksColumns {
    todo: TaskWithStatus[]
    inProgress: TaskWithStatus[]
    completed: TaskWithStatus[]
}

interface TasksPageClientPropsUpdated {
    project: {
        title: string
        slug: string
    }
    tasks: TasksColumns
    userProgress?: {
        progressPercentage: number
        tasksCompleted: number
        totalTasks: number
    }
}

interface TaskDetail {
    id: string
    subTasks: Array<{
        title: string
        description: string
        command: string | null
        approach: string[]
        tips: string[]
    }>
    commonErrors: string[]
    errorsToWatchout: string[]
    relatedTasks: Array<{
        title: string
        description: string
        difficulty: string
        why_related: string
    }>
}

// ============================================================================
// Task Item Component
// ============================================================================

function TaskItem({
    task,
    index,
    total,
    projectSlug,
    onStatusChange
}: {
    task: TaskWithStatus
    index: number
    total: number
    projectSlug: string
    onStatusChange: () => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null)
    const [hasDetailAccess, setHasDetailAccess] = useState(false)
    const [isCheckingDetail, setIsCheckingDetail] = useState(false)
    const [isGeneratingDetail, setIsGeneratingDetail] = useState(false)

    const difficultyColors = {
        BEGINNER: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800',
        INTERMEDIATE: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800',
        ADVANCED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800',
    }

    const statusStyles = {
        TO_DO: 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
        IN_PROGRESS: 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20 ring-1 ring-neutral-200 dark:ring-neutral-800',
        COMPLETED: 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20',
    }

    const handleStatusToggle = async () => {
        setIsUpdating(true)
        try {
            const newStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
            const result = await updateTaskStatus(task.id, newStatus)

            if (result.success) {
                toast.success(
                    newStatus === 'COMPLETED'
                        ? '🎉 Task completed!'
                        : 'Task reopened'
                )
                onStatusChange()
            } else {
                toast.error(result.error || 'Failed to update task')
            }
        } catch (error) {
            toast.error('Something went wrong: ' + error)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleStartTask = async () => {
        if (task.status !== 'TO_DO') return

        setIsUpdating(true)
        try {
            const result = await updateTaskStatus(task.id, 'IN_PROGRESS')

            if (result.success) {
                toast.success('Task started! Good luck! 🚀')
                onStatusChange()
                setIsExpanded(true)
                checkDetailAccess()
            } else {
                toast.error(result.error || 'Failed to start task')
            }
        } catch (error) {
            toast.error('Something went wrong: ' + error)
        } finally {
            setIsUpdating(false)
        }
    }

    const checkDetailAccess = async () => {
        setIsCheckingDetail(true)
        try {
            const result = await checkTaskDetailExists(task.id)
            if (result.success && result.data?.hasAccess) {
                const detailResult = await getTaskDetail(task.id)
                if (detailResult.success && detailResult.data) {
                    setTaskDetail(detailResult.data)
                    setHasDetailAccess(true)
                }
            }
        } catch (error) {
            console.error('Error checking task detail:', error)
        } finally {
            setIsCheckingDetail(false)
        }
    }

    const handleGenerateDetail = async () => {
        setIsGeneratingDetail(true)
        try {
            const result = await generateTaskDetail(task.id, projectSlug)
            if (result.success && result.data) {
                setTaskDetail(result.data)
                setHasDetailAccess(true)
                setShowDetailDialog(false)
                toast.success('Task details generated!', {
                    description: '1 credit deducted'
                })
            } else {
                toast.error(result.error || 'Failed to generate details')
            }
        } catch (error) {
            toast.error('Something went wrong: ' + error)
        } finally {
            setIsGeneratingDetail(false)
        }
    }

    const handleToggleExpand = () => {
        const newExpandedState = !isExpanded
        setIsExpanded(newExpandedState)
        if (newExpandedState && task.status !== 'TO_DO' && !hasDetailAccess && !isCheckingDetail) {
            checkDetailAccess()
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
                'rounded-xl border-2 overflow-hidden transition-all duration-200',
                statusStyles[task.status]
            )}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                        {
                            task.status === 'TO_DO' ? (
                                <button
                                    onClick={handleStartTask}
                                    disabled={isUpdating}
                                    className="w-6 h-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-neutral-100 flex items-center justify-center transition-colors group"
                                >
                                    {
                                        isUpdating ? (
                                            <InlineLoader size="sm" className="text-neutral-900 dark:text-neutral-100" />
                                        ) : (
                                            <Play className="w-3 h-3 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )
                                    }
                                </button>
                            ) : (
                                <button
                                    onClick={handleStatusToggle}
                                    disabled={isUpdating}
                                    className="relative"
                                >
                                    {
                                        isUpdating ? (
                                            <InlineLoader size="md" className="text-neutral-900 dark:text-neutral-100" />
                                        ) : task.status === 'COMPLETED' ? (
                                            <CheckCircle2 className="w-6 h-6 text-neutral-900 dark:text-neutral-100 fill-neutral-900" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-neutral-900 bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse" />
                                            </div>
                                        )
                                    }
                                </button>
                            )
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Task {index + 1}/{total}
                                    </span>
                                    <Badge className={cn('text-xs px-1.5 py-0 border', difficultyColors[task.difficulty as keyof typeof difficultyColors] || difficultyColors.INTERMEDIATE)}>
                                        {task.difficulty}
                                    </Badge>
                                    {
                                        task.status === 'IN_PROGRESS' && (
                                            <Badge className="text-xs px-1.5 py-0 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 animate-pulse">
                                                IN PROGRESS
                                            </Badge>
                                        )
                                    }
                                </div>
                                <h4 className={cn(
                                    'font-semibold text-base',
                                    task.status === 'COMPLETED'
                                        ? 'line-through text-neutral-500 dark:text-neutral-400'
                                        : 'text-neutral-900 dark:text-white'
                                )}>
                                    {task.title}
                                </h4>
                            </div>
                            <button
                                onClick={handleToggleExpand}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                {
                                    isExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    )
                                }
                            </button>
                        </div>
                        {
                            task.badges && task.badges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {
                                        task.badges.slice(0, 3).map((badge, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {badge}
                                            </Badge>
                                        ))
                                    }
                                </div>
                            )
                        }
                        {
                            task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {
                                        task.tags.slice(0, 4).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400"
                                            >
                                                {tag}
                                            </span>
                                        ))
                                    }
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>

            {
                isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                            {
                                task.status !== 'TO_DO' && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                                                    Detailed Roadmap
                                                </span>
                                            </div>
                                            {
                                                !hasDetailAccess && !isCheckingDetail && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setShowDetailDialog(true)}
                                                        className="h-7 text-xs gap-1"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        Unlock (1 credit)
                                                    </Button>
                                                )
                                            }
                                        </div>

                                        {
                                            isCheckingDetail && (
                                                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                                                    <InlineLoader size="sm" />
                                                    Loading...
                                                </div>
                                            )
                                        }

                                        {
                                            hasDetailAccess && taskDetail && (
                                                <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/10 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800">
                                                    <div>
                                                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                                                            Sub-tasks Breakdown:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {
                                                                taskDetail.subTasks.map((sub, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-start gap-2 text-xs bg-white dark:bg-neutral-900 p-2 rounded-lg"
                                                                    >
                                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 flex items-center justify-center text-xs font-bold">
                                                                            {idx + 1}
                                                                        </span>
                                                                        <div>
                                                                            <p className="font-medium text-neutral-900 dark:text-white">{sub.title}</p>
                                                                            <p className="text-neutral-600 dark:text-neutral-400">{sub.description}</p>
                                                                            {
                                                                                sub.command && (
                                                                                    <code className="block mt-1 bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-2 py-1 rounded text-xs font-mono">
                                                                                        {sub.command}
                                                                                    </code>
                                                                                )
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                    {
                                                        (taskDetail.commonErrors.length > 0 || taskDetail.errorsToWatchout.length > 0) && (
                                                            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-lg p-2 border border-neutral-200 dark:border-neutral-800">
                                                                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1 flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Watch Out For:
                                                                </p>
                                                                <ul className="space-y-1">
                                                                    {
                                                                        [...taskDetail.commonErrors, ...taskDetail.errorsToWatchout].slice(0, 3).map((err, idx) => (
                                                                            <li key={idx} className="text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-1">
                                                                                <span>⚠️</span>
                                                                                <span>{err}</span>
                                                                            </li>
                                                                        ))
                                                                    }
                                                                </ul>
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            )
                                        }

                                        {
                                            !hasDetailAccess && !isCheckingDetail && (
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg">
                                                    💡 Get AI-powered sub-tasks breakdown, approach tips, and common errors to avoid.
                                                </p>
                                            )
                                        }
                                    </div>
                                )
                            }

                            {
                                task.description && task.description.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Implementation Steps
                                        </h5>
                                        <ol className="space-y-1.5">
                                            {
                                                task.description.map((step, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-medium">
                                                            {idx + 1}
                                                        </span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))
                                            }
                                        </ol>
                                    </div>
                                )
                            }

                            {
                                task.terminalCommand && (
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            Terminal Command
                                        </h5>
                                        <code className="block bg-neutral-900 text-neutral-800 dark:text-neutral-200 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                                            {task.terminalCommand}
                                        </code>
                                    </div>
                                )
                            }

                            {
                                task.criteria && task.criteria.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                            Success Criteria
                                        </h5>
                                        <ul className="space-y-1">
                                            {
                                                task.criteria.map((criterion, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                                        <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                                        <span>{criterion}</span>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    </div>
                                )
                            }

                            {
                                task.hints && task.hints.length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                            Hints
                                        </h5>
                                        <div className="space-y-1">
                                            {
                                                task.hints.map((hint, idx) => (
                                                    <p key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/20 p-2 rounded-lg">
                                                        💡 {hint}
                                                    </p>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )
                            }
                            <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                {
                                    task.status === 'TO_DO' && (
                                        <Button
                                            onClick={handleStartTask}
                                            disabled={isUpdating}
                                            className="flex-1 bg-neutral-800 hover:bg-neutral-700"
                                        >
                                            {isUpdating ? <InlineLoader size="sm" className="mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                            Start Task
                                        </Button>
                                    )
                                }
                                {
                                    task.status === 'IN_PROGRESS' && (
                                        <>
                                            <Button
                                                onClick={handleStatusToggle}
                                                disabled={isUpdating}
                                                className="flex-1 bg-neutral-800 hover:bg-neutral-700"
                                            >
                                                {isUpdating ? <InlineLoader size="sm" className="mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                Mark Complete
                                            </Button>
                                            <Button
                                                onClick={async () => {
                                                    setIsUpdating(true)
                                                    const result = await updateTaskStatus(task.id, 'TO_DO')
                                                    if (result.success) {
                                                        toast.info('Task moved back to To Do')
                                                        onStatusChange()
                                                    }
                                                    setIsUpdating(false)
                                                }}
                                                disabled={isUpdating}
                                                variant="outline"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )
                                }
                                {
                                    task.status === 'COMPLETED' && (
                                        <Button
                                            onClick={handleStatusToggle}
                                            disabled={isUpdating}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            {isUpdating ? <InlineLoader size="sm" className="mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                                            Reopen Task
                                        </Button>
                                    )
                                }
                            </div>
                        </div>
                    </motion.div>
                )
            }
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                            Unlock Detailed Roadmap?
                        </DialogTitle>
                        <DialogDescription>
                            Get AI-powered guidance to break down this task
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div className="bg-neutral-50 dark:bg-neutral-800/10 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Step-by-step sub-tasks
                                </li>
                                <li className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Terminal commands
                                </li>
                                <li className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Common errors to avoid
                                </li>
                            </ul>
                        </div>
                        <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/10 rounded-lg p-2 border border-neutral-200 dark:border-neutral-800">
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                Cost: 1 Credit
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                            Skip
                        </Button>
                        <Button
                            onClick={handleGenerateDetail}
                            disabled={isGeneratingDetail}
                            className="bg-neutral-800 hover:bg-neutral-700"
                        >
                            {
                                isGeneratingDetail ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Unlock
                                    </>
                                )
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    )
}

// ============================================================================
// Main Component
// ============================================================================

export default function TasksPageClient({ project, tasks, userProgress }: TasksPageClientPropsUpdated) {
    const [filter, setFilter] = useState<'ALL' | 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED'>('ALL')
    const progressPercentage = userProgress?.progressPercentage || 0

    // Combine all tasks for unified list
    const allTasks: TaskWithStatus[] = useMemo(() => {
        return [
            ...tasks.todo.map((t, i) => ({ ...t, orderIndex: i })),
            ...tasks.inProgress.map((t, i) => ({ ...t, orderIndex: tasks.todo.length + i })),
            ...tasks.completed.map((t, i) => ({ ...t, orderIndex: tasks.todo.length + tasks.inProgress.length + i })),
        ].sort((a, b) => {
            // Sort: In Progress first, then To Do, then Completed
            const statusOrder = { 'IN_PROGRESS': 0, 'TO_DO': 1, 'COMPLETED': 2 }
            return statusOrder[a.status] - statusOrder[b.status]
        })
    }, [tasks])

    const filteredTasks = filter === 'ALL'
        ? allTasks
        : allTasks.filter(t => t.status === filter)

    /*
     * Refresh the server data, do not reload the browser.
     *
     * This was `window.location.reload()`, so ticking a checkbox threw the whole
     * document away and fetched it again: the scroll position, the open filter
     * and every bit of client state went with it, and on a slow connection the
     * page went white (plan/projects, PJ-12). `router.refresh()` re-runs the
     * server component and swaps the data in place.
     */
    const router = useRouter()
    const [, startTransition] = useTransition()
    const handleTaskUpdate = () => {
        startTransition(() => router.refresh())
    }

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
            <div className="max-w-4xl mx-auto py-6 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Project
                    </Link>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-neutral-50 dark:via-neutral-200 dark:to-neutral-400 mb-2">
                        {project.title}
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        Track your progress and complete tasks one by one
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <Card className="bg-gradient-to-r from-neutral-900/10 via-neutral-900/10 to-pink-500/10 border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                        Progress
                                    </h3>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {tasks.completed.length} of {allTasks.length} tasks completed
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 to-neutral-800">
                                        {Math.round(progressPercentage)}%
                                    </div>
                                </div>
                            </div>
                            <Progress value={progressPercentage} className="h-3 mb-4" />
                            <StatBand
                                size="sm"
                                cols={3}
                                items={[
                                    { icon: Target, label: "To Do", value: tasks.todo.length },
                                    { icon: Play, label: "In Progress", value: tasks.inProgress.length },
                                    { icon: CheckCircle2, label: "Completed", value: tasks.completed.length },
                                ]}
                            />
                            <div className="flex justify-between mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                                <span className={progressPercentage >= 0 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : ''}>Start</span>
                                <span className={progressPercentage >= 50 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : ''}>
                                    50% → Quiz 🧠
                                </span>
                                <span className={progressPercentage >= 75 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : ''}>
                                    75% → Mock 🎤
                                </span>
                                <span className={progressPercentage >= 100 ? 'text-neutral-800 dark:text-neutral-200 font-medium' : ''}>
                                    Complete 🏆
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                >
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {
                            (['ALL', 'IN_PROGRESS', 'TO_DO', 'COMPLETED'] as const).map((status) => {
                                const count = status === 'ALL'
                                    ? allTasks.length
                                    : allTasks.filter(t => t.status === status).length
                                const labels = {
                                    ALL: 'All Tasks',
                                    TO_DO: 'To Do',
                                    IN_PROGRESS: 'In Progress',
                                    COMPLETED: 'Completed',
                                }
                                const colors = {
                                    ALL: '',
                                    TO_DO: '',
                                    IN_PROGRESS: 'border-neutral-300 dark:border-neutral-700',
                                    COMPLETED: 'border-neutral-300 dark:border-neutral-700',
                                }
                                return (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        className={cn(
                                            'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border-2',
                                            filter === status
                                                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white'
                                                : `bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${colors[status] || 'border-neutral-200 dark:border-neutral-800'}`
                                        )}
                                    >
                                        {labels[status]} ({count})
                                    </button>
                                )
                            })
                        }
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                >
                    {
                        filteredTasks.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No tasks in this category</p>
                            </div>
                        ) : (
                            filteredTasks.map((task, index) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    total={filteredTasks.length}
                                    projectSlug={project.slug}
                                    onStatusChange={handleTaskUpdate}
                                />
                            ))
                        )
                    }
                </motion.div>
            </div>
        </div>
    )
}