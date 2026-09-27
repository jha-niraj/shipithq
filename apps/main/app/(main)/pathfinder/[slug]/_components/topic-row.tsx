'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@repo/ui/components/ui/badge'
import { CheckCircle2, Circle, Code2, Brain, Trash2, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { StatBand } from '@repo/ui/components/ui/stat-band'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

// A topic in a goal's list, and the day's numbers (plan/pathfinder PF-8). Lifted out of
// the old daily-practice view unchanged, so Today and Plan draw the same row.

export interface SubGoal {
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

export interface DailySession {
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

export const isQuestion = (subGoal: Pick<SubGoal, 'kind' | 'source'>) => (subGoal.kind != null && subGoal.kind !== 'TOPIC') || subGoal.source === 'interview_report'

export function TopicRow({
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
    onGenerateContent?: () => Promise<boolean>
}) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    // An interview question is its own content: nothing is ever generated for it (IP-12).
    const hasContent = (subGoal as { studioId?: string | null }).studioId != null || subGoal.hasCoding || isQuestion(subGoal)
    // Keyed on `isContentLoaded`, not on having a Studio: the Studio is made when generating
    // starts, so a failed run must still offer the button again (plan/pathfinder PF-7).
    const needsContentGeneration = subGoal.isAIGenerated && !subGoal.isContentLoaded && !isQuestion(subGoal)

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
                                        // Back to "Generate content" when it failed, so it can be retried.
                                        void onGenerateContent().then((ok) => { if (!ok) setIsGenerating(false) })
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

export function DayStats({ session }: { session: DailySession | null }) {
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
