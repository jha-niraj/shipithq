"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Brain, ArrowLeft, Trophy, Sparkles, AlertCircle, Coins, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@repo/ui/components/ui/button';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@repo/ui/components/ui/card';
import toast from '@repo/ui/components/ui/sonner';
import { awaitBackgroundJob } from '@/hooks/use-background-job';
import {
    startProjectQuizGeneration, getProjectQuiz, submitQuizAttempt, getQuizAttempts
} from '@/actions/(main)/projects/projectv2-quiz.action';
import {
    type QuizClientProps, type Quiz as ProjectQuiz, type QuizResult as ProjectQuizResult, type QuizAttempt
} from '@/types/project';
import { type QuestionDifficulty } from "@repo/db";
import Quiz, { type QuizQuestion, type QuizResult } from '@/components/main/quiz';
import QuizResults from '@/components/main/quiz-results';
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

export default function QuizClient({ project, existingQuiz, userCredits, previousAttempts: initialAttempts }: QuizClientProps) {
    const [stage, setStage] = useState<'payment' | 'quiz' | 'results'>('payment');
    const [quiz, setQuiz] = useState<ProjectQuiz | null>(existingQuiz);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<ProjectQuizResult | null>(null);
    const [attempts, setAttempts] = useState(initialAttempts);
    const [submitting, setSubmitting] = useState(false);

    // Start quiz if already exists
    useEffect(() => {
        if (existingQuiz) {
            setQuiz(existingQuiz);
            setStage('quiz');
        }
    }, [existingQuiz]);

    const handleGenerateQuiz = async () => {
        if (userCredits < 25) {
            toast.error('Insufficient credits! You need 25 credits to generate a quiz.');
            return;
        }

        setGenerating(true);

        // Generation runs on the worker (twenty questions on gpt-4-turbo-preview
        // is the longest completion in this module). Credits are held for the
        // job and refunded automatically if it fails.
        const started = await startProjectQuizGeneration(project.slug);

        if (!started.success || !started.jobId) {
            toast.error(started.error || 'Failed to generate quiz');
            setGenerating(false);
            return;
        }

        const outcome = await awaitBackgroundJob(started.jobId);

        if (outcome.ok) {
            const read = await getProjectQuiz(project.slug);
            if (read.success && read.quiz) {
                setQuiz(read.quiz);
                setStage('quiz');
                toast.success('Quiz generated successfully!');
            } else {
                toast.error(read.error || 'Quiz generated but could not be loaded');
            }
        } else {
            toast.error(outcome.error);
        }
        setGenerating(false);
    };

    const handleQuizComplete = async (quizResult: QuizResult) => {
        setSubmitting(true);
        const apiAnswers: Record<string, number> = {};
        quizResult.answers.forEach(a => {
            const val = Array.isArray(a.selectedAnswer) ? (a.selectedAnswer[0] || "0") : a.selectedAnswer;
            apiAnswers[a.questionId] = parseInt(val);
        });

        const res = await submitQuizAttempt(project.slug, apiAnswers, quizResult.totalTimeTaken);

        if (res.success && res.attempt) {
            setResult(res.attempt);
            setStage('results');
            toast.success(`Quiz completed! Your score: ${res.attempt.score}%`);

            // Refresh attempts
            const attemptsRes = await getQuizAttempts(project.slug);
            if (attemptsRes.success) {
                setAttempts(attemptsRes.attempts || []);
            }
        } else {
            toast.error(res.error || 'Failed to submit quiz');
        }
        setSubmitting(false);
    };

    const handleRetake = () => {
        setStage('quiz');
        setResult(null);
    };

    if (stage === 'payment') {
        return (
            <div className="min-h-screen py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-full backdrop-blur-sm mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Project
                    </Link>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-neutral-900 to-pink-500 rounded-2xl mb-4">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-500 dark:from-neutral-50 dark:to-neutral-400 mb-2">
                                Quiz Assessment
                            </h1>
                            <p className="text-lg text-neutral-600 dark:text-neutral-400">
                                Test your knowledge of {project.title}
                            </p>
                        </div>
                        <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Generate AI Quiz
                                </CardTitle>
                                <CardDescription>
                                    Generate 20 personalized quiz questions based on this project
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">20</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Questions</div>
                                    </div>
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">3</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Difficulty Levels</div>
                                    </div>
                                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                                        <div className="text-2xl font-bold text-neutral-900 dark:text-white">60</div>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Minutes</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="font-semibold text-neutral-900 dark:text-white">What you&apos;ll get:</p>
                                    <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>20 AI-generated questions tailored to this project</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Questions spanning beginner, intermediate, and advanced levels</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Detailed explanations for each answer</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100 flex-shrink-0 mt-0.5" />
                                            <span>Unlimited retakes to improve your score</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Your Credits</p>
                                            <p className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                <Coins className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
                                                {userCredits}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Cost</p>
                                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">25 Credits</p>
                                        </div>
                                    </div>

                                    {
                                        userCredits < 25 && (
                                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                                                        Insufficient Credits
                                                    </p>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        You need {25 - userCredits} more credits to generate this quiz
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }

                                    <Button
                                        onClick={handleGenerateQuiz}
                                        disabled={generating || userCredits < 25}
                                        className="w-full bg-gradient-to-r from-neutral-800 to-pink-600 text-white hover:opacity-90 rounded-xl"
                                        size="lg"
                                    >
                                        {
                                            generating ? (
                                                <>
                                                    <InlineLoader size="md" className="mr-2" />
                                                    Generating Quiz...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5 mr-2" />
                                                    Generate Quiz for 25 Credits
                                                </>
                                            )
                                        }
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        {
                            attempts.length > 0 && (
                                <Card className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                                    <CardHeader>
                                        <CardTitle className="text-base">Previous Attempts</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {
                                                attempts.map((attempt: QuizAttempt) => (
                                                    <div
                                                        key={attempt.id}
                                                        className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Trophy className="w-4 h-4 text-neutral-800 dark:text-neutral-100" />
                                                            <div>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    Score: {attempt.score}%
                                                                </p>
                                                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                                                    {attempt.correctAnswers}/{attempt.totalQuestions} correct
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString() : '-'}
                                                        </p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        }
                    </motion.div>
                </div>
            </div>
        );
    }

    if (stage === 'quiz' && quiz) {
        if (submitting) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6">
                    <InlineLoader size="lg" className="text-primary mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Submitting Quiz</h2>
                    <p className="text-muted-foreground">Please wait while we process your results...</p>
                </div>
            );
        }

        // Transform questions
        const questions: QuizQuestion[] = quiz.questions.map(q => ({
            id: q.id,
            text: q.prompt,
            type: "single",
            difficulty: q.difficulty as QuestionDifficulty,
            options: q.options.map((opt, idx) => ({
                id: idx.toString(),
                text: opt
            }))
        }));

        return (
            <div className="min-h-screen py-12 px-6">
                <Quiz
                    quizId={quiz.id}
                    questions={questions}
                    title="Quiz Assessment"
                    timeLimit={3600}
                    onComplete={handleQuizComplete}
                    onExit={() => setStage('payment')}
                    showTimer={true}
                    mode="assessment"
                    allowSkip={false}
                    allowHints={false}
                    allowFlag={true}
                    showQuestionNavigator={true}
                />
            </div>
        );
    }

    if (stage === 'results' && result && quiz) {
        // Transform user answers to map them to the corresponding question
        const userAnswers = result.answers.map(a => ({
            questionId: a.questionId,
            selectedAnswer: a.selectedAnswer.toString(),
            isCorrect: a.isCorrect,
            timeTaken: 0
        }));

        // Transform questions with correctness info derived from the result
        // We need to look up the correct answer index from the result to mark options
        // But the result.answers array has `correctAnswer` index.
        const transformedQuestions: QuizQuestion[] = quiz.questions.map(q => {
            const answer = result.answers.find(a => a.questionId === q.id);
            return {
                id: q.id,
                text: q.prompt,
                type: "single",
                options: q.options.map((opt, idx) => ({
                    id: idx.toString(),
                    text: opt,
                    isCorrect: answer ? idx === answer.correctAnswer : undefined
                })),
                explanation: answer?.explanation
            };
        });

        const transformedResult: QuizResult = {
            quizId: quiz.id,
            answers: userAnswers,
            correctCount: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            scorePercentage: result.score,
            totalTimeTaken: 0, // Time is not returned by API in attempt?
            flaggedQuestions: []
        };

        return (
            <div className="min-h-screen py-12 px-6">
                <QuizResults
                    result={transformedResult}
                    questions={transformedQuestions}
                    onRetake={handleRetake}
                    onBack={() => setStage('payment')}
                />
            </div>
        );
    }

    /*
     * Every stage above returns, so reaching here means `stage === 'quiz'` with
     * no quiz loaded - the generation reported success and the read came back
     * null. It used to `return null`, which renders a blank white page with no
     * message and no way out (sweep 2026-09-23).
     */
    return (
        <div className="px-page py-6">
            <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
                <h2 className="text-sm font-medium text-neutral-900 dark:text-white">The quiz did not load.</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    It was generated, but reading it back failed. Your credits were not spent twice - try again.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                    <Button size="sm" onClick={() => window.location.assign(`/projects/${project.slug}/quiz`)}>Try again</Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link href={`/projects/${project.slug}`}>Back to the project</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}