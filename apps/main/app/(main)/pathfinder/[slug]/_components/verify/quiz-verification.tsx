'use client'

import { useMemo } from 'react'
import Quiz from '@/components/quiz'
import type { QuizQuestion, QuizResult } from '@/components/main/quiz'
import {
    submitVerificationQuiz, retryVerificationSection
} from '@/actions/(main)/pathfinder'
import toast from '@repo/ui/components/ui/sonner'
import { VerificationSectionStatus } from '@repo/db'
import { Button } from '@repo/ui/components/ui/button'
import { RotateCcw } from 'lucide-react'

interface Question {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
    difficulty: string
    category: string
    codeSnippet?: string | null
}

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
            isCorrect: i === q.correctAnswer,
        })),
        explanation: q.explanation,
        difficulty: (q.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
        category: q.category,
        codeSnippet: q.codeSnippet ?? undefined,
        codeLanguage: 'javascript',
    }))
}

export function QuizVerification({ goalId, questions, status, score, attempts }: QuizVerificationProps) {
    const quizQuestions = useMemo(() => transformToQuizQuestions(questions), [questions])

    const handleRetry = async () => {
        const result = await retryVerificationSection(goalId, 'quiz')
        if (result.success) {
            toast.success('Quiz reset. You can try again!')
            window.location.reload()
        } else {
            toast.error(result.error ?? 'Failed to retry')
        }
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
            const q = questions.find((rq) => rq.id === a.questionId)
            let selectedIndex = 0
            if (q && typeof a.selectedAnswer === 'string') {
                const idx = q.options.findIndex((_, i) => `opt-${i}` === a.selectedAnswer)
                selectedIndex = idx >= 0 ? idx : 0
            }
            const isCorrect = q ? selectedIndex === q.correctAnswer : false
            return {
                questionId: a.questionId,
                selectedAnswer: selectedIndex,
                isCorrect,
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
            toast.success(`Quiz completed! Score: ${result.score}%`)
            window.location.reload()
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
                mode="practice"
                showTimer={false}
                immediateResults
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
