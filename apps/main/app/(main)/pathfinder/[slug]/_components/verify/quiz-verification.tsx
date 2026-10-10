'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Quiz from '@/components/quiz'
import type { QuizQuestion, QuizResult } from '@/components/main/quiz'
import {
    submitVerificationQuiz, retryVerificationSection
} from '@/actions/(main)/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import { VerificationSectionStatus } from '@repo/db'
import { Button } from '@repo/ui/components/ui/button'
import { RotateCcw } from 'lucide-react'
import type { ClientQuizQuestion, QuizReviewItem } from '@/lib/pathfinder/verification-plan'

// The page never gets the answers: the server grades (plan/pathfinder PF-16).
type Question = ClientQuizQuestion

interface QuizVerificationProps {
    goalId: string
    questions: Question[]
    status: VerificationSectionStatus
    score: number | null
    attempts: number
}

function transformToQuizQuestions(raw: Question[]): QuizQuestion[] {
    return raw.map((q) => ({
        id: q.id,
        text: q.question,
        type: 'single' as const,
        options: q.options.map((opt, i) => ({
            id: `opt-${i}`,
            text: opt,
        })),
        difficulty: (q.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
        category: q.category,
        codeSnippet: q.codeSnippet ?? undefined,
        codeLanguage: 'javascript',
    }))
}

export function QuizVerification({ goalId, questions, status, score, attempts }: QuizVerificationProps) {
    const router = useRouter()
    const quizQuestions = useMemo(() => transformToQuizQuestions(questions), [questions])
    // The graded attempt, shown until dismissed. On a pass it carries each answer
    // and explanation; on a fail only which questions were wrong.
    const [review, setReview] = useState<{ score: number; passed: boolean; items: QuizReviewItem[] } | null>(null)

    const handleRetry = async () => {
        const result = await retryVerificationSection(goalId, 'quiz')
        if (result.success) {
            toast.success('Quiz reset. You can try again!')
            // The server re-renders this tab; no full reload (plan/pathfinder PF-9).
            router.refresh()
        } else {
            toast.error(result.error ?? 'Failed to retry')
        }
    }

    if (review) {
        return <QuizReview questions={questions} {...review} onDone={() => setReview(null)} onRetry={review.passed ? undefined : async () => { setReview(null); await handleRetry() }} />
    }

    if (status === 'COMPLETED') {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mb-4">
                        <span className="text-3xl">✓</span>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Quiz Passed!</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">You scored {score}%</p>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Attempts: {attempts}</span>
                </div>
            </div>
        )
    }

    if (status === 'FAILED') {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                        <span className="text-3xl">✗</span>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Quiz Not Passed</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">You scored {score}%. You need 70% to pass.</p>
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Attempts: {attempts}</span>
                        <Button onClick={handleRetry} variant="outline" className="bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 border-0">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (quizQuestions.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                No questions available.
            </div>
        )
    }

    const handleComplete = async (results: QuizResult) => {
        const answerData = results.answers.map((a) => {
            const m = typeof a.selectedAnswer === 'string' ? /^opt-(\d+)$/.exec(a.selectedAnswer) : null
            return {
                questionId: a.questionId,
                selectedAnswer: m ? Number(m[1]) : -1,
                timeTaken: a.timeTaken || 0,
            }
        })
        const totalTime = results.totalTimeTaken || 0
        const result = await submitVerificationQuiz({
            goalId,
            answers: answerData,
            totalTime,
        })
        if (result.success) {
            setReview({ score: result.score ?? 0, passed: !!result.passed, items: result.review ?? [] })
            // The server re-renders this tab; no full reload (plan/pathfinder PF-9).
            router.refresh()
        } else {
            toast.error(result.error ?? 'Failed to submit quiz')
        }
    }

    return (
        <div className="p-4">
            <Quiz
                quizId={`verification-${goalId}`}
                questions={quizQuestions}
                title="Verification Quiz"
                mode="assessment"
                showTimer={false}
                allowSkip={false}
                allowPrevious
                allowQuestionNavigation
                onComplete={handleComplete}
                showProgress
                showQuestionNavigator
            />
        </div>
    )
}

function QuizReview({ questions, score, passed, items, onDone, onRetry }: {
    questions: Question[]
    score: number
    passed: boolean
    items: QuizReviewItem[]
    onDone: () => void
    onRetry?: () => void
}) {
    const wrong = items.filter((i) => !i.correct).length
    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                        {passed ? 'Quiz passed' : 'Quiz not passed'} - {score}%
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {passed
                            ? 'Each answer and why, below.'
                            : `${wrong} wrong. You need 70% to pass. The answers are shown once you pass.`}
                    </p>
                </div>
                <div className="flex gap-2">
                    {onRetry && (
                        <Button onClick={onRetry} size="sm">
                            <RotateCcw className="mr-2 size-4" /> Try again
                        </Button>
                    )}
                    <Button onClick={onDone} size="sm" variant="outline">Done</Button>
                </div>
            </div>
            <ol className="space-y-3">
                {items.map((item, n) => {
                    const q = questions.find((x) => x.id === item.questionId)
                    if (!q) return null
                    return (
                        <li key={item.questionId} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">{n + 1}. {q.question}</p>
                                <span className={item.correct ? 'shrink-0 text-xs font-medium text-neutral-900 dark:text-white' : 'shrink-0 text-xs font-medium text-red-600 dark:text-red-400'}>
                                    {item.correct ? 'Correct' : 'Wrong'}
                                </span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Your answer: {item.selectedAnswer !== null && q.options[item.selectedAnswer] !== undefined ? q.options[item.selectedAnswer] : 'none'}
                            </p>
                            {item.correctAnswer !== undefined && !item.correct && (
                                <p className="text-sm text-neutral-900 dark:text-white">Answer: {q.options[item.correctAnswer]}</p>
                            )}
                            {item.explanation && (
                                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{item.explanation}</p>
                            )}
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
