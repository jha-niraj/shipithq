"use server"

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    creditTransactions,
    projectsV2,
    projectV2Quizzes,
    projectV2QuizQuestions,
    projectV2QuizAttempts,
    projectV2QuizAnswers,
    withTransaction
} from "@repo/db";
import { eq, and, sql } from "drizzle-orm";
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { type Quiz } from '@/types/project'

import { QUIZ_CREDIT_COST } from "@/lib/credits/pricing"

interface QuizQuestion {
    difficulty: "EASY" | "MEDIUM" | "HARD"
    prompt: string
    options: string[]
    correctAnswer: number
    explanation: string
}

/** Read a project's quiz, or null if it has not been generated yet. */
async function readQuiz(projectId: string): Promise<Quiz | null> {
    const quiz = await db.query.projectV2Quizzes.findFirst({
        where: eq(projectV2Quizzes.projectId, projectId),
        with: {
            questions: {
                orderBy: (questions, { asc }) => [asc(questions.orderIndex)]
            }
        }
    });
    if (!quiz) return null

    return {
        id: quiz.id,
        totalQuestions: quiz.totalQuestions,
        questions: quiz.questions.map((q) => ({
            id: q.id,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? "",
            orderIndex: q.orderIndex
        }))
    }
}

/**
 * The quiz for a project, if it already exists.
 *
 * Split out from generation because the two have completely different costs: a
 * read is instant and free, generating twenty questions on gpt-4-turbo-preview
 * takes the better part of a minute and 25 credits. Bundling them meant every
 * page load of an ungenerated quiz silently started a paid job.
 */
export async function getProjectQuiz(projectSlug: string): Promise<{
    success: boolean
    quiz?: Quiz | null
    error?: string
}> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) return { success: false, error: "Not authenticated" }

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, projectSlug),
            columns: { id: true, includeAssessment: true },
        });
        if (!project) return { success: false, error: "Project not found" }
        if (!project.includeAssessment) {
            return { success: false, error: "This project does not include assessments" }
        }

        return { success: true, quiz: await readQuiz(project.id) }
    } catch (error) {
        console.error("Error reading project quiz:", error)
        return { success: false, error: "Failed to load quiz" }
    }
}

/**
 * Start quiz generation on the worker.
 *
 * Twenty questions with options and explanations - routinely the longest
 * completion in the projects module, and one that used to run inline on a
 * request Cloudflare would kill first, after debiting the credits.
 *
 * The credits are now HELD (`cost` below), not debited: the hold settles when
 * the app sees the job complete and is refunded automatically if it fails. The
 * worker never touches credits.
 */
export async function startProjectQuizGeneration(projectSlug: string): Promise<{
    success: boolean
    jobId?: string
    error?: string
    requiredCredits?: number
}> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) return { success: false, error: "Not authenticated" }

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, projectSlug),
            columns: { id: true, title: true, includeAssessment: true },
            with: { quiz: { columns: { id: true } } },
        });
        if (!project) return { success: false, error: "Project not found" }
        if (!project.includeAssessment) {
            return { success: false, error: "This project does not include assessments" }
        }
        if (project.quiz) return { success: false, error: "This quiz has already been generated" }

        const started = await startBackgroundJob(
            'project_quiz',
            { projectId: project.id },
            {
                cost: QUIZ_CREDIT_COST,
                reason: `Quiz assessment generated for project: ${project.title}`,
                // The `project.quiz` check above is a read-then-write: two tabs
                // both see no quiz, both dispatch, both hold 25 credits. Single
                // flight per project is what sprint generation already does
                // (sweep 2026-09-23, finding 1).
                singleFlight: true,
                singleFlightKey: project.id,
            },
        )
        if (!started.success) {
            return { success: false, error: started.error, requiredCredits: started.required ?? QUIZ_CREDIT_COST }
        }

        return { success: true, jobId: started.jobId }
    } catch (error) {
        console.error("Error starting quiz generation:", error)
        return { success: false, error: "Failed to start quiz generation" }
    }
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuizAttempt(
    projectSlug: string,
    answers: Record<string, number>,
    timeSpent: number
) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, projectSlug),
            with: {
                quiz: {
                    with: {
                        questions: true
                    }
                }
            }
        });

        if (!project?.quiz) {
            return { success: false, error: "Quiz not found" }
        }

        let correctAnswers = 0
        const questionAnswers: Array<{
            questionId: string
            selectedAnswer: number
            isCorrect: boolean
        }> = []

        for (const question of project.quiz.questions) {
            const selectedAnswer = answers[question.id]
            if (selectedAnswer !== undefined) {
                const isCorrect = selectedAnswer === question.correctAnswer
                if (isCorrect) correctAnswers++

                questionAnswers.push({
                    questionId: question.id,
                    selectedAnswer,
                    isCorrect
                })
            }
        }

        const totalQuestions = project.quiz.questions.length
        const score = Math.round((correctAnswers / totalQuestions) * 100)

        /*
         * A RETAKE overwrites the attempt; there is one row per user and quiz.
         *
         * The insert was unconditional against
         * `uq_project_v2_quiz_attempt_user_id_quiz_id`, while the quiz page offers
         * a Retake button: the second submit hit a duplicate key, was caught as
         * "Failed to submit quiz", and the retake could never be finished.
         */
        const [attempt] = await db.insert(projectV2QuizAttempts).values({
            userId: session.user.id,
            projectId: project.id,
            quizId: project.quiz.id,
            score,
            totalQuestions,
            correctAnswers,
            timeSpent,
            isCompleted: true,
            completedAt: new Date(),
        })
            .onConflictDoUpdate({
                target: [projectV2QuizAttempts.userId, projectV2QuizAttempts.quizId],
                set: { score, totalQuestions, correctAnswers, timeSpent, isCompleted: true, completedAt: new Date() },
            })
            .returning();

        // The previous attempt's answers belong to that attempt, not this one.
        await db.delete(projectV2QuizAnswers).where(eq(projectV2QuizAnswers.attemptId, attempt!.id));

        if (questionAnswers.length > 0) {
            await db.insert(projectV2QuizAnswers).values(
                questionAnswers.map(qa => ({
                    attemptId: attempt!.id,
                    questionId: qa.questionId,
                    selectedAnswer: qa.selectedAnswer,
                    isCorrect: qa.isCorrect
                }))
            );
        }

        const attemptWithAnswers = await db.query.projectV2QuizAttempts.findFirst({
            where: eq(projectV2QuizAttempts.id, attempt!.id),
            with: {
                answers: {
                    with: {
                        question: true
                    }
                }
            }
        });

        try {
            const { updateProjectScore } = await import("./project-score.action")
            await updateProjectScore(project.id)
        } catch (error) {
            console.error("Failed to update leaderboard scores:", error)
        }

        return {
            success: true,
            attempt: {
                id: attempt!.id,
                score: attempt!.score,
                correctAnswers: attempt!.correctAnswers,
                totalQuestions: attempt!.totalQuestions,
                answers: attemptWithAnswers?.answers.map((a) => ({
                    questionId: a.questionId,
                    selectedAnswer: a.selectedAnswer,
                    isCorrect: a.isCorrect,
                    correctAnswer: a.question.correctAnswer,
                    explanation: a.question.explanation
                })) || []
            }
        }

    } catch (error) {
        console.error("Error submitting quiz attempt:", error)
        return { success: false, error: "Failed to submit quiz" }
    }
}

/**
 * Get user's previous quiz attempts for a project
 */
export async function getQuizAttempts(projectSlug: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, projectSlug),
            columns: { id: true }
        });

        if (!project) {
            return { success: false, error: "Project not found" }
        }

        const attempts = await db.query.projectV2QuizAttempts.findMany({
            where: and(
                eq(projectV2QuizAttempts.userId, session.user.id),
                eq(projectV2QuizAttempts.projectId, project.id)
            ),
            orderBy: (attempts, { desc }) => [desc(attempts.createdAt)],
            limit: 10,
            columns: {
                id: true,
                score: true,
                correctAnswers: true,
                totalQuestions: true,
                timeSpent: true,
                completedAt: true,
                createdAt: true
            }
        });

        return { success: true, attempts }

    } catch (error) {
        console.error("Error fetching quiz attempts:", error)
        return { success: false, error: "Failed to fetch attempts" }
    }
}
