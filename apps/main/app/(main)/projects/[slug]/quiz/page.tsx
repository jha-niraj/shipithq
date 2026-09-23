import { getSession } from '@repo/auth'
import { QUIZ_UNLOCK_PERCENT, quizUnlocked } from '@/lib/projects/gates'
import { headers } from 'next/headers'
import { redirect } from "next/navigation"
import {
    db,
    users,
    projectsV2,
    projectV2Quizzes,
    projectV2QuizQuestions,
    projectV2QuizAttempts,
    userProjectV2Progress,
} from "@repo/db"
import { eq, and, desc } from "drizzle-orm"
import QuizClient from "./_components/quiz-client"
import { ProgressGate } from "../_components/progress-gate"

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getSession(headers())
    const { slug } = await params

    if (!session?.user?.id) {
        redirect(`/signin?callbackUrl=/projects/${slug}/quiz`)
    }

    // Get project
    const projectRows = await db
        .select({
            id: projectsV2.id,
            slug: projectsV2.slug,
            title: projectsV2.title,
            description: projectsV2.description,
            includeAssessment: projectsV2.includeAssessment,
        })
        .from(projectsV2)
        .where(eq(projectsV2.slug, slug))
        .limit(1)

    if (!projectRows[0]) {
        redirect('/projects')
    }

    const project = projectRows[0]

    if (!project.includeAssessment) {
        redirect(`/projects/${slug}`)
    }

    // Get user progress
    const progressRows = await db
        .select({
            progressPercentage: userProjectV2Progress.progressPercentage,
            status: userProjectV2Progress.status,
        })
        .from(userProjectV2Progress)
        .where(and(
            eq(userProjectV2Progress.userId, session.user.id),
            eq(userProjectV2Progress.projectId, project.id)
        ))
        .limit(1)

    const userProgress = progressRows[0]
    const currentProgress = userProgress?.progressPercentage || 0

    if (!userProgress || !quizUnlocked(currentProgress)) {
        return (
            <ProgressGate
                type="quiz"
                currentProgress={currentProgress}
                requiredProgress={QUIZ_UNLOCK_PERCENT}
                projectSlug={slug}
                projectTitle={project.title}
            />
        )
    }

    // Get user credits
    const userRows = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)

    // Get quiz
    const quizRows = await db
        .select({
            id: projectV2Quizzes.id,
            totalQuestions: projectV2Quizzes.totalQuestions,
        })
        .from(projectV2Quizzes)
        .where(eq(projectV2Quizzes.projectId, project.id))
        .limit(1)

    const quiz = quizRows[0] || null

    // Get quiz questions
    const questions = quiz
        ? await db
            .select({
                id: projectV2QuizQuestions.id,
                difficulty: projectV2QuizQuestions.difficulty,
                prompt: projectV2QuizQuestions.prompt,
                options: projectV2QuizQuestions.options,
                // NOT the answer key. This page is server-rendered into a payload
                // the browser can read, so selecting `correctAnswer` and
                // `explanation` handed every answer to anyone who opened the
                // devtools before taking the quiz. Submitting returns both.
                orderIndex: projectV2QuizQuestions.orderIndex,
            })
            .from(projectV2QuizQuestions)
            .where(eq(projectV2QuizQuestions.quizId, quiz.id))
            .orderBy(projectV2QuizQuestions.orderIndex)
        : []

    // Get previous attempts
    const attempts = await db
        .select({
            id: projectV2QuizAttempts.id,
            score: projectV2QuizAttempts.score,
            correctAnswers: projectV2QuizAttempts.correctAnswers,
            totalQuestions: projectV2QuizAttempts.totalQuestions,
            timeSpent: projectV2QuizAttempts.timeSpent,
            completedAt: projectV2QuizAttempts.completedAt,
            createdAt: projectV2QuizAttempts.createdAt,
        })
        .from(projectV2QuizAttempts)
        .where(and(
            eq(projectV2QuizAttempts.userId, session.user.id),
            eq(projectV2QuizAttempts.projectId, project.id)
        ))
        .orderBy(desc(projectV2QuizAttempts.createdAt))
        .limit(5)

    const existingQuiz = quiz ? {
        id: quiz.id,
        totalQuestions: quiz.totalQuestions,
        questions: questions.map(q => ({
            id: q.id,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options,
            orderIndex: q.orderIndex,
        })),
    } : null

    return (
        <QuizClient
            project={{
                id: project.id,
                slug: project.slug,
                title: project.title,
                description: project.description,
            }}
            existingQuiz={existingQuiz}
            userCredits={userRows[0]?.credits || 0}
            previousAttempts={attempts}
        />
    )
}
