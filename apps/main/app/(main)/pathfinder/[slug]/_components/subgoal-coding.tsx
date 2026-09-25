'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@repo/ui/components/ui/button'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Badge } from '@repo/ui/components/ui/badge'
import {
    Tabs, TabsList, TabsTrigger, TabsContent
} from '@repo/ui/components/ui/tabs'
import {
    Code2, Play, CheckCircle2, XCircle, Lightbulb, ChevronDown,
    ChevronUp, RefreshCcw
} from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import CodeEditor from '@/components/main/code-editor'
import { submitSubGoalCoding } from '@/actions/(main)/pathfinder/subgoals.action'
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@repo/ui/components/ui/collapsible'
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface CodingProblem {
    id?: string
    title: string
    description: string
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    starterCode: string
    hints: string[]
    sampleInput?: string
    sampleOutput?: string
}

interface SubGoal {
    id: string
    title: string
    aiCodingProblem: unknown
    codingCompleted: boolean
    codingPassed: boolean
}

interface SubGoalCodingProps {
    subGoal: SubGoal
    onComplete: () => void
}

interface Feedback {
    passed: boolean
    feedback: string
    suggestions: string[]
    score: number
}

export function SubGoalCoding({ subGoal, onComplete }: SubGoalCodingProps) {
    const raw = subGoal.aiCodingProblem
    const problems: CodingProblem[] = Array.isArray(raw)
        ? raw.map((p, i) => ({ ...p, id: (p as CodingProblem).id ?? `cp${i}` }))
        : raw ? [{ ...(raw as CodingProblem), id: 'cp0' }] : []
    const problem = problems[0] ?? null

    const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
    const currentProblem = problems[currentProblemIndex] ?? problem
    const [code, setCode] = useState<Record<string, string>>({})
    const getCode = (p: CodingProblem) => code[p.id ?? 'cp0'] ?? p.starterCode ?? ''
    const [language] = useState('javascript')
    const [hintsOpen, setHintsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>(null)
    const [showResult, setShowResult] = useState(false)

    if (!currentProblem && problems.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                No coding problem available for this task.
            </div>
        )
    }

    // If already completed, show result
    if (subGoal.codingCompleted && !showResult) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-4",
                    subGoal.codingPassed
                        ? "bg-neutral-100 dark:bg-neutral-800/30"
                        : "bg-neutral-100 dark:bg-neutral-800/30"
                )}>
                    {
                        subGoal.codingPassed ? (
                            <CheckCircle2 className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                        ) : (
                            <XCircle className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                        )
                    }
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    {subGoal.codingPassed ? 'Challenge Completed!' : 'Not Quite Right'}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    {
                        subGoal.codingPassed
                            ? 'Great work on solving this coding challenge!'
                            : 'You can try again to improve your solution.'
                    }
                </p>
                <Button
                    variant="outline"
                    onClick={() => {
                        setCode({})
                        setFeedback(null)
                        setShowResult(false)
                    }}
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
            </div>
        )
    }

    const handleSubmit = async () => {
        if (!currentProblem) return
        setIsSubmitting(true)
        try {
            const codeToSubmit = getCode(currentProblem)
            const response = await submitSubGoalCoding(
                subGoal.id,
                codeToSubmit,
                language,
                currentProblem.id
            )
            if (response.success) {
                setFeedback({
                    passed: response.passed!,
                    feedback: response.feedback!,
                    suggestions: response.suggestions || [],
                    score: response.score!,
                })
                setShowResult(true)
                if (response.allPassed) onComplete()
            }
        } catch (error) {
            console.error('Error submitting code:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const difficultyColors = {
        EASY: 'bg-neutral-100 text-neutral-700',
        MEDIUM: 'bg-neutral-100 text-neutral-700',
        HARD: 'bg-red-100 text-red-700',
    }

    if (showResult && feedback) {
        return (
            <div className="h-full flex flex-col">
                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-4 p-1">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "p-6 rounded-xl text-center",
                                feedback.passed
                                    ? "bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800"
                                    : "bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800"
                            )}
                        >
                            <div className={cn(
                                "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3",
                                feedback.passed ? "bg-neutral-100" : "bg-neutral-100"
                            )}>
                                {
                                    feedback.passed ? (
                                        <CheckCircle2 className="w-8 h-8 text-neutral-900 dark:text-neutral-100" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-neutral-900 dark:text-neutral-100" />
                                    )
                                }
                            </div>
                            <h3 className={cn(
                                "text-lg font-bold mb-1",
                                feedback.passed ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-700 dark:text-neutral-300"
                            )}>
                                {feedback.passed ? 'Solution Accepted!' : 'Needs Improvement'}
                            </h3>
                            <Badge variant="secondary" className={cn(
                                "text-sm px-3 py-0.5",
                                feedback.passed
                                    ? "bg-neutral-100 text-neutral-700"
                                    : "bg-neutral-100 text-neutral-700"
                            )}>
                                Score: {feedback.score}%
                            </Badge>
                        </motion.div>
                        <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                            <h4 className="font-medium text-neutral-900 dark:text-white mb-2">
                                Feedback
                            </h4>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {feedback.feedback}
                            </p>
                        </div>

                        {
                            feedback.suggestions.length > 0 && (
                                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800">
                                    <h4 className="font-medium text-neutral-700 dark:text-neutral-100 mb-2 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        Suggestions
                                    </h4>
                                    <ul className="space-y-1">
                                        {
                                            feedback.suggestions.map((suggestion, i) => (
                                                <li key={i} className="text-sm text-neutral-800 dark:text-neutral-100 flex items-start gap-2">
                                                    <span className="text-neutral-800 dark:text-neutral-200">•</span>
                                                    {suggestion}
                                                </li>
                                            ))
                                        }
                                    </ul>
                                </div>
                            )
                        }
                    </div>
                </ScrollArea>

                <div className="flex-shrink-0 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4 flex gap-2">
                    {
                        problems.length > 1 && currentProblemIndex < problems.length - 1 && feedback.passed && (
                            <Button
                                variant="default"
                                onClick={() => {
                                    setFeedback(null)
                                    setShowResult(false)
                                    setCurrentProblemIndex(prev => prev + 1)
                                }}
                                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                            >
                                Next Challenge
                            </Button>
                        )
                    }
                    <Button
                        variant="outline"
                        onClick={() => {
                            setFeedback(null)
                            setShowResult(false)
                        }}
                        className={problems.length > 1 && currentProblemIndex < problems.length - 1 && feedback.passed ? '' : 'w-full'}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    const renderProblemContent = (p: CodingProblem) => (
        <>
            <div className="flex-shrink-0 mb-4">
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Code2 className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                                {p.title}
                            </h3>
                        </div>
                        <Badge className={difficultyColors[p.difficulty]}>
                            {p.difficulty}
                        </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {p.description}
                    </p>

                    {
                        (p.sampleInput || p.sampleOutput) && (
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {
                                    p.sampleInput && (
                                        <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-900">
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Sample Input</div>
                                            <code className="text-xs text-neutral-700 dark:text-neutral-300">{p.sampleInput}</code>
                                        </div>
                                    )
                                }
                                {
                                    p.sampleOutput && (
                                        <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-900">
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Expected Output</div>
                                            <code className="text-xs text-neutral-700 dark:text-neutral-300">{p.sampleOutput}</code>
                                        </div>
                                    )
                                }
                            </div>
                        )
                    }

                    {
                        p.hints.length > 0 && (
                            <Collapsible open={hintsOpen} onOpenChange={setHintsOpen}>
                                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 hover:text-neutral-700 transition-colors">
                                    <Lightbulb className="w-4 h-4" />
                                    <span>Hints ({p.hints.length})</span>
                                    {hintsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/30 space-y-1">
                                        {
                                            p.hints.map((hint, i) => (
                                                <p key={i} className="text-xs text-neutral-700 dark:text-neutral-100 flex items-start gap-2">
                                                    <span className="text-neutral-800 dark:text-neutral-200">{i + 1}.</span>
                                                    {hint}
                                                </p>
                                            ))
                                        }
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )
                    }
                </div>
            </div>

            <div className="flex-1 min-h-[280px] rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <CodeEditor
                    code={getCode(p)}
                    onChange={(newCode: string) => setCode(prev => ({ ...prev, [p.id ?? 'cp0']: newCode }))}
                    language={language}
                    height="280px"
                    showLanguageSelector={false}
                    className="h-full min-h-[280px]"
                />
            </div>
            <div className="flex-shrink-0 flex items-center justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                    variant="outline"
                    onClick={() => setCode(prev => ({ ...prev, [p.id ?? 'cp0']: p.starterCode || '' }))}
                >
                    Reset Code
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !getCode(p).trim()}
                    className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                >
                    {
                        isSubmitting ? (
                            <>
                                <InlineLoader size="sm" className="mr-2" />
                                Evaluating...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Submit Solution
                            </>
                        )
                    }
                </Button>
            </div>
        </>
    )

    if (problems.length > 1) {
        return (
            <div className="h-full flex flex-col">
                <Tabs value={String(currentProblemIndex)} onValueChange={(v) => setCurrentProblemIndex(Number(v))}>
                    <div className="flex-shrink-0 px-4 pt-2">
                        <TabsList variant="segmented" size="sm" fit>
                            {problems.map((p, i) => (
                                <TabsTrigger key={p.id ?? i} value={String(i)}>
                                    {p.title.length > 25 ? `${p.title.slice(0, 25)}...` : p.title}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    {problems.map((p, i) => (
                        <TabsContent key={p.id ?? i} value={String(i)} className="flex-1 m-0 flex flex-col overflow-hidden">
                            {renderProblemContent(p)}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {currentProblem && renderProblemContent(currentProblem)}
        </div>
    )
}