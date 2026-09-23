"use server"

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    userProjectV2Progress,
    projectV2QuizAttempts,
    projectV2MockSessions,
} from "@repo/db";
import { eq, and } from "drizzle-orm";
import { calculateTotalScore } from "@/lib/project-scoring"
import type { CompletedTask, ScoreCalculation } from "@/types/projectv2"

// ─────────────────────────────────────────────────────────────────────────────
// A user's score on their own project.
//
// Lifted out of `leaderboard.action.ts` when leaderboards were removed. The
// scoring itself was never a leaderboard concern - it is how far along THIS user
// is on THIS project, written to `user_project_v2_progress` and read by the
// project page. Only the two lines that mirrored it into the ranking tables have
// gone; the calculation, the queries and the weights are unchanged.
//
// Called after any event that can move a score: a task completed, a quiz
// submitted, a mock interview finished.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The `userId` parameter is GONE.
 *
 * It was `userId || session.user.id`, in a `"use server"` file, which makes it a
 * public endpoint: any signed-in caller could pass somebody else's id and
 * overwrite their `totalScore`, `tasksScore`, `quizScore` and `mockScore`
 * (sweep 2026-09-23, finding 9). The score belongs to whoever is asking.
 */
export async function updateProjectScore(projectId: string) {
    try {
        const session = await getSession(headers());
        const targetUserId = session?.user?.id

        if (!targetUserId) {
            return { success: false, message: "User not authenticated" }
        }

        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(
                eq(userProjectV2Progress.userId, targetUserId),
                eq(userProjectV2Progress.projectId, projectId)
            ),
            with: {
                taskStatuses: {
                    with: {
                        task: {
                            columns: { id: true, difficulty: true }
                        }
                    }
                },
                project: {
                    with: {
                        sprints: {
                            with: {
                                tasks: {
                                    columns: { id: true, difficulty: true }
                                }
                            }
                        },
                        quiz: {
                            columns: { id: true, totalQuestions: true }
                        }
                    }
                }
            }
        });

        if (!progress) {
            return { success: false, message: "Progress not found" }
        }

        const completedTasks: CompletedTask[] = progress.taskStatuses
            .filter((ts) => ts.status === "COMPLETED")
            .map((ts) => ({
                taskId: ts.task.id,
                difficulty: ts.task.difficulty
            }))

        const quizAttempt = await db.query.projectV2QuizAttempts.findFirst({
            where: and(
                eq(projectV2QuizAttempts.userId, targetUserId),
                eq(projectV2QuizAttempts.quizId, progress.project.quiz?.id || "")
            )
        });

        const quizCorrect = quizAttempt?.correctAnswers || 0
        const quizTotal = progress.project.quiz?.totalQuestions || 0

        const mockSession = await db.query.projectV2MockSessions.findFirst({
            where: and(
                eq(projectV2MockSessions.userId, targetUserId),
                eq(projectV2MockSessions.projectId, projectId),
                eq(projectV2MockSessions.status, "COMPLETED")
            ),
            orderBy: (sessions, { desc }) => [desc(sessions.completedAt)]
        });

        const mockScore = mockSession?.score || null

        // No `as any`. The query above already loads `project.sprints.tasks`, so
        // Drizzle types this fully - the cast was throwing that away and taking
        // the checking on `s.tasks` with it.
        const allTasks = progress.project.sprints?.flatMap((s) => s.tasks) ?? []

        const scoreCalculation: ScoreCalculation = calculateTotalScore(
            completedTasks,
            allTasks,
            quizCorrect,
            quizTotal,
            mockScore
        )

        await db.update(userProjectV2Progress)
            .set({
                totalScore: scoreCalculation.totalScore,
                tasksScore: scoreCalculation.tasksScore,
                quizScore: scoreCalculation.quizScore,
                mockScore: scoreCalculation.mockScore
            })
            .where(eq(userProjectV2Progress.id, progress.id));

        return {
            success: true,
            data: scoreCalculation
        }
    } catch (error) {
        console.error("Error updating project score:", error)
        return { success: false, message: "Failed to update score" }
    }
}
