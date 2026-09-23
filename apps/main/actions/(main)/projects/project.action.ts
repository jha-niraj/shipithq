"use server";

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    creditTransactions,
    projectsV2,
    projectV2Tasks,
    projectV2Sprints,
    projectV2TaskDetails,
    projectV2KnowledgeBases,
    userProjectV2Progress,
    userTaskV2Statuses,
    projectV2Quizzes,
    projectV2QuizQuestions,
    projectV2QuizAttempts,
    projectV2QuizAnswers,
    projectV2Submissions,
    withTransaction
} from "@repo/db";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toErrorMessage } from "@/lib/errors"
import { debitCredits, insufficientCreditsMessage } from '@/lib/credits/debit'
import { ENROLL_CREDIT_COST } from '@/lib/credits/pricing'

interface ActionResponse {
    success: boolean;
    data?: any;
    error?: string;
}

async function getCurrentUser() {
    const session = await getSession(headers());
    if (!session?.user?.email) throw new Error("Not authenticated");
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) throw new Error("User not found");
    return user;
}

/**
 * The same lookup, for a read that an anonymous visitor is allowed to make.
 *
 * `getCurrentUser` THROWS, and `getProjectBySlug` called it first thing, so
 * every signed-out visitor to a PUBLIC project got "Project not found" - a
 * shared link has never worked (plan/projects, PJ-12). Reads that a stranger may
 * legitimately make use this and gate on the result instead.
 */
async function getOptionalUser() {
    const session = await getSession(headers());
    if (!session?.user?.email) return null;
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    return user ?? null;
}

// Helper functions for credits and XP
async function _deductCredits(userId: string, amount: number, description: string) {
    const result = await debitCredits({ userId, amount, description });
    // Same contract the callers already rely on: throw when the balance is short.
    // What changed is that the check and the write are now one guarded statement,
    // so two concurrent calls cannot both pass it.
    if (!result.ok) throw new Error(insufficientCreditsMessage(result));
}

async function _refundCredits(userId: string, amount: number, description: string) {
    await withTransaction(async (tx) => {
        await tx.update(users).set({ credits: sql`${users.credits} + ${amount}` }).where(eq(users.id, userId));
        await tx.insert(creditTransactions).values({
            userId,
            amount,
            type: "REWARD",
            currency: "INR",
            description,
        });
    });
}

function _generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50);
}

export async function getProjectBySlug(slug: string): Promise<ActionResponse> {
    try {
        const user = await getOptionalUser();

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, slug),
            with: {
                creator: {
                    columns: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    },
                },
                pages: {
                    orderBy: (pages, { asc }) => [asc(pages.orderIndex)],
                },
                sprints: {
                    orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)],
                    with: {
                        tasks: {
                            orderBy: (tasks, { asc }) => [asc(tasks.orderIndex)],
                            with: {
                                taskDetail: true,
                            },
                        },
                    },
                },
                quiz: {
                    with: {
                        questions: {
                            orderBy: (questions, { asc }) => [asc(questions.orderIndex)],
                            columns: {
                                id: true,
                                difficulty: true,
                            },
                        },
                    },
                },
                knowledgeBase: true,
                userProgress: {
                    // Nobody signed in has no progress. `false` rather than
                    // omitting the relation, which is not optional here.
                    where: user ? eq(userProjectV2Progress.userId, user.id) : sql`false`,
                    with: {
                        taskStatuses: {
                            columns: {
                                taskId: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        /*
         * A PRIVATE project is private.
         *
         * There was no visibility check here, so anybody with the slug could read
         * a project somebody paid the 25-credit private tier for, including its
         * sprints and tasks. Its creator and anyone enrolled still see it; to
         * everyone else it does not exist, which is also the right answer to give.
         */
        const isPrivate = project.visibility !== "PUBLIC";
        if (isPrivate && project.createdBy !== user?.id) {
            // A stranger cannot be enrolled, so there is nothing to look up.
            if (!user) return { success: false, error: "Project not found" };
            const enrolled = await db.query.userProjectV2Progress.findFirst({
                where: and(eq(userProjectV2Progress.userId, user.id), eq(userProjectV2Progress.projectId, project.id)),
                columns: { id: true },
            });
            if (!enrolled) return { success: false, error: "Project not found" };
        }

        /*
         * The schema calls the relation `userProgress`; `ProjectV2` and every
         * reader call it `progress`. Returned as-is, `project.progress` was always
         * undefined, so the page never knew you had enrolled and kept offering
         * "Enroll Now" (PJ-16 item 1). Renamed here, once, rather than in readers.
         */
        const { userProgress, ...rest } = project;

        /*
         * Public is a snapshot (plan/projects PJ-18). Anyone but the owner sees
         * the sprints and tasks that existed when it was published; what the
         * owner added afterwards is theirs. A PRIVATE project reaching here for a
         * non-owner is a legacy enrolment, which keeps the full view.
         */
        const isOwner = project.createdBy === user?.id;
        const cutoff = !isOwner && project.visibility === "PUBLIC" ? project.publishedAt : null;
        const sprints = cutoff
            ? rest.sprints
                .filter((sp) => sp.createdAt <= cutoff)
                .map((sp) => ({ ...sp, tasks: sp.tasks.filter((t) => t.createdAt <= cutoff) }))
            : rest.sprints;

        // The viewer's own copy of this project, if they have one: the page sends
        // them there instead of offering to enrol again.
        const myCopy = user && !isOwner
            ? await db.query.projectsV2.findFirst({
                where: and(eq(projectsV2.forkedFromId, project.id), eq(projectsV2.createdBy, user.id)),
                columns: { slug: true },
            })
            : null;
        // On a copy, where it came from.
        const forkedFrom = project.forkedFromId
            ? await db.query.projectsV2.findFirst({
                where: eq(projectsV2.id, project.forkedFromId),
                columns: { slug: true, title: true, visibility: true },
            })
            : null;

        return {
            success: true,
            data: {
                ...rest,
                sprints,
                progress: userProgress,
                myCopySlug: myCopy?.slug ?? null,
                forkedFrom: forkedFrom && forkedFrom.visibility === "PUBLIC" ? { slug: forkedFrom.slug, title: forkedFrom.title } : null,
            },
        };
    } catch (error: unknown) {
        console.log(error);
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function startProject(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            with: {
                sprints: {
                    with: {
                        tasks: true,
                    },
                },
            },
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        /*
         * The CREATOR's own start. Everyone else enrols, and enrolling is charged.
         *
         * This had no owner check at all, so calling it directly enrolled anybody
         * in any project for nothing, while `enrollInProject` beside it charges 13
         * credits for exactly the same outcome.
         */
        if (project.createdBy !== user.id) {
            return { success: false, error: "Enrol in this project to start it." };
        }

        // Check if already started
        const existing = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, user.id), eq(userProjectV2Progress.projectId, projectId)),
        });

        if (existing) {
            return { success: true, data: existing };
        }

        // Flatten tasks from all sprints
        const allTasks = project.sprints.flatMap((sprint) => sprint.tasks);

        // Create progress record
        const [progress] = await db.insert(userProjectV2Progress).values({
            userId: user.id,
            projectId,
            status: "IN_PROGRESS",
            totalTasks: allTasks.length,
            startedAt: new Date(),
        }).returning();

        // Create task statuses (all TO_DO initially)
        if (allTasks.length > 0) {
            const taskStatuses = allTasks.map((task) => ({
                userId: user.id,
                projectId,
                taskId: task.id,
                progressId: progress!.id,
                status: "TO_DO" as const,
            }));

            await db.insert(userTaskV2Statuses).values(taskStatuses);
        }

        // Increment project started count
        await db.update(projectsV2).set({ totalStarted: sql`${projectsV2.totalStarted} + 1` }).where(eq(projectsV2.id, projectId));

        revalidatePath(`/projects/${project.slug}`);

        return { success: true, data: progress };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
    }
}

// ========================================
// TASK MANAGEMENT
// ========================================

export async function getProjectTasks(slug: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.slug, slug),
            columns: {
                id: true,
                title: true,
            },
            with: {
                sprints: {
                    orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)],
                    with: {
                        tasks: {
                            orderBy: (tasks, { asc }) => [asc(tasks.orderIndex)],
                            with: {
                                userStatuses: {
                                    where: eq(userTaskV2Statuses.userId, user.id),
                                },
                                taskDetail: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        // Get progress
        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, user.id), eq(userProjectV2Progress.projectId, project.id)),
        });

        if (!progress) {
            return { success: false, error: "Project not started. Please start the project first." };
        }

        // Flatten tasks from all sprints and add status
        const allTasksWithStatus = project.sprints.flatMap((sprint) =>
            sprint.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                criteria: task.criteria,
                hints: task.hints,
                badges: task.badges,
                tags: task.tags,
                difficulty: task.difficulty,
                terminalCommand: task.terminalCommand,
                category: task.category,
                estimatedTime: task.estimatedTime,
                checkpoints: task.checkpoints,
                relatedPages: task.relatedPages,
                dependencies: task.dependencies,
                sprintId: task.sprintId,
                sprintName: sprint.name,
                sprintNumber: sprint.sprintNumber,
                taskDetail: task.taskDetail,
                status: task.userStatuses[0]?.status || "TO_DO",
                completedAt: task.userStatuses[0]?.completedAt,
                notes: task.userStatuses[0]?.notes,
            }))
        );

        // Group by status for kanban
        const columns = {
            todo: allTasksWithStatus.filter((t) => t.status === "TO_DO"),
            inProgress: allTasksWithStatus.filter((t) => t.status === "IN_PROGRESS"),
            completed: allTasksWithStatus.filter((t) => t.status === "COMPLETED"),
        };

        // Also return sprint-organized structure
        const sprintsWithTasks = project.sprints.map((sprint) => ({
            id: sprint.id,
            sprintNumber: sprint.sprintNumber,
            name: sprint.name,
            goal: sprint.goal,
            duration: sprint.duration,
            tasks: sprint.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                criteria: task.criteria,
                hints: task.hints,
                badges: task.badges,
                tags: task.tags,
                difficulty: task.difficulty,
                terminalCommand: task.terminalCommand,
                category: task.category,
                estimatedTime: task.estimatedTime,
                checkpoints: task.checkpoints,
                relatedPages: task.relatedPages,
                dependencies: task.dependencies,
                taskDetail: task.taskDetail,
                status: task.userStatuses[0]?.status || "TO_DO",
                completedAt: task.userStatuses[0]?.completedAt,
            })),
            completedTasks: sprint.tasks.filter((t) => t.userStatuses[0]?.status === "COMPLETED").length,
            totalTasks: sprint.tasks.length,
        }));

        return {
            success: true,
            data: {
                columns,
                sprints: sprintsWithTasks,
                progress: {
                    totalTasks: progress.totalTasks,
                    completedTasks: progress.tasksCompleted,
                    progressPercentage: progress.progressPercentage,
                },
                projectTitle: project.title,
            }
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
    }
}

export async function updateTaskStatus(
    taskId: string,
    newStatus: "TO_DO" | "IN_PROGRESS" | "COMPLETED"
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const task = await db.query.projectV2Tasks.findFirst({
            where: eq(projectV2Tasks.id, taskId),
            with: {
                sprint: {
                    columns: { projectId: true },
                },
            },
        });

        if (!task || !task.sprint) {
            return { success: false, error: "Task not found" };
        }

        const projectId = task.sprint.projectId;

        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, user.id), eq(userProjectV2Progress.projectId, projectId)),
        });

        if (!progress) {
            return { success: false, error: "Progress not found" };
        }

        // Update or create task status (upsert)
        const existingStatus = await db.query.userTaskV2Statuses.findFirst({
            where: and(eq(userTaskV2Statuses.userId, user.id), eq(userTaskV2Statuses.taskId, taskId)),
        });

        if (existingStatus) {
            await db.update(userTaskV2Statuses)
                .set({
                    status: newStatus,
                    completedAt: newStatus === "COMPLETED" ? new Date() : null,
                })
                .where(eq(userTaskV2Statuses.id, existingStatus.id));
        } else {
            await db.insert(userTaskV2Statuses).values({
                userId: user.id,
                projectId,
                taskId,
                progressId: progress.id,
                status: newStatus,
                completedAt: newStatus === "COMPLETED" ? new Date() : null,
            });
        }

        // Recalculate progress - count completed tasks for this user in this project
        const completedStatuses = await db.select().from(userTaskV2Statuses)
            .where(and(
                eq(userTaskV2Statuses.userId, user.id),
                eq(userTaskV2Statuses.projectId, projectId),
                eq(userTaskV2Statuses.status, "COMPLETED"),
            ));
        const completedCount = completedStatuses.length;

        // Get total tasks through sprints
        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            with: {
                sprints: {
                    with: {
                        tasks: {
                            columns: { id: true },
                        },
                    },
                },
            },
        });

        const totalTasks = project?.sprints.reduce((acc, sprint) => acc + sprint.tasks.length, 0) || 0;
        const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        // Update progress
        await db.update(userProjectV2Progress)
            .set({
                tasksCompleted: completedCount,
                totalTasks,
                progressPercentage,
                status: completedCount === totalTasks ? "COMPLETED" : "IN_PROGRESS",
                completedAt: completedCount === totalTasks ? new Date() : null,
            })
            .where(eq(userProjectV2Progress.id, progress.id));

        // If project completed, increment counter
        if (completedCount === totalTasks && totalTasks > 0) {
            await db.update(projectsV2)
                .set({ totalCompleted: sql`${projectsV2.totalCompleted} + 1` })
                .where(eq(projectsV2.id, projectId));
        }

        // Update score if task was completed
        if (newStatus === "COMPLETED") {
            const { updateProjectScore } = await import("./project-score.action");
            await updateProjectScore(projectId);
        }

        return { success: true, data: { completedCount, totalTasks, progressPercentage } };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
    }
}

export async function updateTaskNotes(taskId: string, notes: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const taskStatus = await db.query.userTaskV2Statuses.findFirst({
            where: and(eq(userTaskV2Statuses.userId, user.id), eq(userTaskV2Statuses.taskId, taskId)),
        });

        if (!taskStatus) {
            return { success: false, error: "Task status not found" };
        }

        await db.update(userTaskV2Statuses)
            .set({ notes })
            .where(eq(userTaskV2Statuses.id, taskStatus.id));

        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// QUIZ ACTIONS
// ========================================

export async function startQuiz(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const quiz = await db.query.projectV2Quizzes.findFirst({
            where: eq(projectV2Quizzes.projectId, projectId),
            with: {
                questions: {
                    orderBy: (questions, { asc }) => [asc(questions.orderIndex)],
                    columns: {
                        id: true,
                        prompt: true,
                        options: true,
                        difficulty: true,
                        orderIndex: true,
                    },
                },
            },
        });

        if (!quiz) {
            return { success: false, error: "Quiz not found for this project" };
        }

        // Check if already attempted
        const existingAttempt = await db.query.projectV2QuizAttempts.findFirst({
            where: and(eq(projectV2QuizAttempts.userId, user.id), eq(projectV2QuizAttempts.quizId, quiz.id)),
        });

        if (existingAttempt && existingAttempt.isCompleted) {
            return { success: false, error: "You have already completed this quiz" };
        }

        if (existingAttempt) {
            return { success: true, data: { attemptId: existingAttempt.id, questions: quiz.questions } };
        }

        // Create new attempt
        const [attempt] = await db.insert(projectV2QuizAttempts).values({
            userId: user.id,
            projectId,
            quizId: quiz.id,
            totalQuestions: quiz.questions.length,
        }).returning();

        return { success: true, data: { attemptId: attempt!.id, questions: quiz.questions } };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function submitQuizAnswer(
    attemptId: string,
    questionId: string,
    selectedAnswer: number
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const attempt = await db.query.projectV2QuizAttempts.findFirst({
            where: eq(projectV2QuizAttempts.id, attemptId),
        });

        if (!attempt || attempt.userId !== user.id) {
            return { success: false, error: "Invalid attempt" };
        }

        if (attempt.isCompleted) {
            return { success: false, error: "Quiz already completed" };
        }

        const question = await db.query.projectV2QuizQuestions.findFirst({
            where: eq(projectV2QuizQuestions.id, questionId),
        });

        if (!question) {
            return { success: false, error: "Question not found" };
        }

        const isCorrect = question.correctAnswer === selectedAnswer;

        // Upsert answer
        const existingAnswer = await db.query.projectV2QuizAnswers.findFirst({
            where: and(eq(projectV2QuizAnswers.attemptId, attemptId), eq(projectV2QuizAnswers.questionId, questionId)),
        });

        if (existingAnswer) {
            await db.update(projectV2QuizAnswers)
                .set({ selectedAnswer, isCorrect })
                .where(eq(projectV2QuizAnswers.id, existingAnswer.id));
        } else {
            await db.insert(projectV2QuizAnswers).values({
                attemptId,
                questionId,
                selectedAnswer,
                isCorrect,
            });
        }

        return { success: true, data: { isCorrect, explanation: question.explanation } };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function completeQuiz(attemptId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const attempt = await db.query.projectV2QuizAttempts.findFirst({
            where: eq(projectV2QuizAttempts.id, attemptId),
            with: {
                answers: true,
            },
        });

        if (!attempt || attempt.userId !== user.id) {
            return { success: false, error: "Invalid attempt" };
        }

        const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;
        const totalQuestions = attempt.totalQuestions;
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        await db.update(projectV2QuizAttempts)
            .set({
                correctAnswers,
                score,
                isCompleted: true,
                completedAt: new Date(),
            })
            .where(eq(projectV2QuizAttempts.id, attemptId));

        return { success: true, data: { score, correctAnswers, totalQuestions } };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// PROJECT SUBMISSION
// ========================================

export async function submitProject(
    projectId: string,
    data: { githubUrl: string; liveUrl?: string; notes?: string }
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const progress = await db.query.userProjectV2Progress.findFirst({
            where: and(eq(userProjectV2Progress.userId, user.id), eq(userProjectV2Progress.projectId, projectId)),
        });

        if (!progress) {
            return { success: false, error: "Project not started" };
        }

        if (progress.status !== "COMPLETED") {
            return { success: false, error: "Please complete all tasks before submitting" };
        }

        // Create submission
        const [submission] = await db.insert(projectV2Submissions).values({
            userId: user.id,
            projectId,
            githubUrl: data.githubUrl,
            liveUrl: data.liveUrl,
            notes: data.notes,
        }).returning();

        // Update progress
        await db.update(userProjectV2Progress)
            .set({
                status: "SUBMITTED",
                submittedAt: new Date(),
            })
            .where(eq(userProjectV2Progress.id, progress.id));

        // Increment project submissions
        await db.update(projectsV2)
            .set({ totalSubmissions: sql`${projectsV2.totalSubmissions} + 1` })
            .where(eq(projectsV2.id, projectId));

        return { success: true, data: submission };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// UTILITY ACTIONS
// ========================================

export async function getUserProjects(page: number = 1, limit: number = 20): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const [projects, totalArr] = await Promise.all([
            db.query.projectsV2.findMany({
                where: eq(projectsV2.createdBy, user.id),
                with: {
                    userProgress: {
                        where: eq(userProjectV2Progress.userId, user.id),
                        columns: {
                            status: true,
                            progressPercentage: true,
                            tasksCompleted: true,
                            totalTasks: true,
                        },
                    },
                    submissions: {
                        where: eq(projectV2Submissions.userId, user.id),
                        orderBy: (submissions, { desc }) => [desc(submissions.createdAt)],
                        limit: 1,
                    },
                },
                orderBy: (projects, { desc }) => [desc(projects.createdAt)],
                offset: (page - 1) * limit,
                limit,
            }),
            db.select({ count: sql<number>`count(*)` }).from(projectsV2).where(eq(projectsV2.createdBy, user.id)),
        ]);

        const total = Number(totalArr[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                // Same rename as getProjectBySlug: the readers expect `progress`.
                projects: projects.map(({ userProgress, ...p }) => ({ ...p, progress: userProgress })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1,
                },
            },
        };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function deleteProject(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        if (project.createdBy !== user.id) {
            return { success: false, error: "Unauthorized" };
        }

        await db.delete(projectsV2).where(eq(projectsV2.id, projectId));

        revalidatePath('/projects/myprojects');

        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function getPublicProjects(limit: number = 9): Promise<ActionResponse> {
    try {
        const projects = await db.query.projectsV2.findMany({
            where: eq(projectsV2.visibility, 'PUBLIC'),
            columns: {
                id: true,
                slug: true,
                title: true,
                shortDescription: true,
                description: true,
                technologies: true,
                difficulty: true,
                estimatedHours: true,
                totalViews: true,
                includeAssessment: true,
                createdAt: true,
            },
            with: {
                creator: {
                    columns: {
                        name: true,
                        username: true,
                        image: true,
                    },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
            limit,
        });

        return { success: true, data: projects };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function getAllPublicProjects(options?: {
    page?: number;
    limit?: number;
    difficulty?: string;
    technologies?: string[];
    search?: string;
    sortBy?: 'popular' | 'recent' | 'rating';
    // NO `: Promise<ActionResponse>` here, deliberately.
    //
    // `ActionResponse` declares `data?: any`, so annotating with it threw away
    // the precise shape this function actually returns and made every caller's
    // `result.data.projects` an `any` array. Letting TypeScript infer the return
    // gives callers the real row type for free.
    //
    // The other 15 functions in this file are still annotated and still leak
    // `any` the same way. Converting `ActionResponse` to a generic is the proper
    // fix and is tracked separately - see plan/cleanup/candidates.md, CLN-46.
}) {
    try {
        const {
            page = 1,
            limit = 30,
            difficulty,
            technologies,
            search,
            sortBy = 'recent'
        } = options || {};

        const skip = (page - 1) * limit;

        const conditions: SQL[] = [eq(projectsV2.visibility, 'PUBLIC')];

        if (difficulty && difficulty !== 'ALL') {
            conditions.push(eq(projectsV2.difficulty, difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED"));
        }

        if (technologies && technologies.length > 0) {
            conditions.push(sql`${projectsV2.technologies} && ARRAY[${sql.join(technologies.map(t => sql`${t}`), sql`, `)}]::text[]`);
        }

        if (search) {
            conditions.push(
                sql`(${projectsV2.title} ILIKE ${'%' + search + '%'} OR ${projectsV2.description} ILIKE ${'%' + search + '%'} OR ${projectsV2.shortDescription} ILIKE ${'%' + search + '%'})`
            );
        }

        const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

        // Inlined at the query below rather than routed through a lookup table.
        // The table was `const orderByMap: any`, and that single annotation made
        // all three callbacks implicitly `any`, so `p.totalViews` and friends
        // were never checked against the actual columns. Drizzle types the
        // callback when it is passed directly.

        const [projects, totalArr] = await Promise.all([
            db.query.projectsV2.findMany({
                where: whereClause,
                columns: {
                    id: true,
                    slug: true,
                    title: true,
                    shortDescription: true,
                    description: true,
                    technologies: true,
                    difficulty: true,
                    estimatedHours: true,
                    totalViews: true,
                    includeAssessment: true,
                    createdAt: true,
                },
                with: {
                    creator: {
                        columns: {
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                },
                orderBy: (p, { desc }) =>
                    sortBy === 'popular' ? [desc(p.totalViews)]
                        : sortBy === 'rating' ? [desc(p.totalSubmissions)]
                            : [desc(p.createdAt)],
                offset: skip,
                limit,
            }),
            db.select({ count: sql<number>`count(*)` }).from(projectsV2).where(whereClause),
        ]);

        const total = Number(totalArr[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1,
                },
            },
        };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function getRecentSubmissions(limit: number = 9): Promise<ActionResponse> {
    try {
        const submissions = await db.query.projectV2Submissions.findMany({
            with: {
                project: {
                    columns: {
                        id: true,
                        slug: true,
                        title: true,
                        technologies: true,
                        difficulty: true,
                        visibility: true,
                    },
                },
                user: {
                    columns: {
                        name: true,
                        username: true,
                        image: true,
                    },
                },
            },
            orderBy: (submissions, { desc }) => [desc(submissions.createdAt)],
            limit,
        });

        // Filter only PUBLIC project submissions
        const publicSubmissions = submissions.filter((s) => s.project?.visibility === 'PUBLIC');

        return { success: true, data: publicSubmissions };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// SEARCH SIMILAR PROJECTS
// ========================================

export async function searchSimilarProjects({
    title,
    technologies,
    limit = 6
}: {
    title: string;
    technologies: string[];
    limit?: number;
}): Promise<ActionResponse> {
    try {
        if (!title || !technologies || !Array.isArray(technologies)) {
            return {
                success: false,
                error: "Invalid search parameters",
            };
        }

        const result = await getAllPublicProjects({ limit: 100 });

        // Narrow on `success` ALONE. `!result.success || !result.data` reads as
        // the same check but defeats the discriminated union - TypeScript cannot
        // narrow through an `||` whose right side reads a success-only field, so
        // `result.data` stayed loose and every `project` below was implicitly
        // `any`. Same trap as the cover-letter extractor hit in IP-4.
        if (!result.success) {
            return {
                success: false,
                error: "Failed to fetch projects",
            };
        }

        const projects = result.data?.projects ?? [];

        const scoredProjects = projects.map((project) => {
            let score = 0;

            const titleWords = title.toLowerCase().split(' ');
            const projectTitleWords = project.title.toLowerCase().split(' ');

            titleWords.forEach((word: string) => {
                if (word.length > 2) {
                    projectTitleWords.forEach((projectWord: string) => {
                        if (projectWord.includes(word) || word.includes(projectWord)) {
                            score += 3;
                        }
                    });
                }
            });

            if (project.description) {
                const descWords = project.description.toLowerCase().split(' ');
                titleWords.forEach((word: string) => {
                    if (word.length > 2) {
                        descWords.forEach((descWord: string) => {
                            if (descWord.includes(word) || word.includes(descWord)) {
                                score += 1;
                            }
                        });
                    }
                });
            }

            const projectTechs = Array.isArray(project.technologies) ? project.technologies : [];
            const commonTechs = technologies.filter(tech =>
                projectTechs.some((projectTech: string) =>
                    projectTech.toLowerCase() === tech.toLowerCase()
                )
            );
            score += commonTechs.length * 2;

            return {
                ...project,
                similarityScore: score
            };
        });

        const similarProjects = scoredProjects
            .filter((project) => project.similarityScore > 0)
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, limit)
            .map((project) => ({
                id: project.id,
                slug: project.slug,
                title: project.title,
                description: project.description || project.shortDescription || '',
                shortDescription: project.shortDescription || '',
                difficulty: project.difficulty || 'INTERMEDIATE',
                technologies: Array.isArray(project.technologies) ? project.technologies : [],
                estimatedHours: project.estimatedHours || 20,
                totalViews: project.totalViews || 0,
                includeAssessment: project.includeAssessment || false,
                createdAt: project.createdAt,
                creator: project.creator || { name: 'Anonymous', username: null, image: null },
                similarityScore: project.similarityScore
            }));

        return {
            success: true,
            data: similarProjects,
        };
    } catch (error) {
        console.error("Error searching similar projects:", error);
        return {
            success: false,
            error: "Failed to search similar projects",
        };
    }
}

// ========================================
// PROJECT ENROLLMENT (PURCHASE)
// ========================================

/**
 * Enrolling makes the enrolee their own copy (plan/projects PJ-18, decided by
 * Niraj 2026-09-23).
 *
 * It used to write a progress row against the creator's own sprints, so every
 * enrolee shared one set of rows: anything the owner added appeared for all of
 * them, and none of them could add anything of their own. Now the published
 * snapshot - sprints, tasks, task details, quiz and mock knowledge base as they
 * stood at `published_at` - is copied into a new PRIVATE project owned by the
 * enrolee, with `forked_from_id` pointing back. From then on it is simply their
 * project, and every owner path (generate a sprint, add a task) works on it.
 *
 * All in one transaction with the debit. The unique index on
 * (forked_from_id, created_by) is what stops two quick clicks making two copies;
 * the read below only produces the friendlier message.
 */
export async function enrollInProject(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            with: {
                sprints: {
                    orderBy: (sprints, { asc }) => [asc(sprints.orderIndex)],
                    with: {
                        tasks: {
                            orderBy: (tasks, { asc }) => [asc(tasks.orderIndex)],
                            with: { taskDetail: true },
                        },
                    },
                },
                quiz: { with: { questions: true } },
                knowledgeBase: true,
            },
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }
        if (project.createdBy === user.id) {
            return { success: false, error: "You cannot enroll in your own project" };
        }
        if (project.visibility !== 'PUBLIC' || project.forkedFromId) {
            return { success: false, error: "This project is not available for enrollment" };
        }

        const existingCopy = await db.query.projectsV2.findFirst({
            where: and(eq(projectsV2.forkedFromId, projectId), eq(projectsV2.createdBy, user.id)),
            columns: { slug: true },
        });
        if (existingCopy) {
            return { success: false, error: "You already have a copy of this project", data: { projectSlug: existingCopy.slug } };
        }

        /*
         * Free for a project the platform wrote (plan/projects, PJ-11 decision,
         * 2026-09-23). Credits pay for a model run, and a curated project has
         * already been written - nothing runs when somebody starts one.
         */
        const enrollmentCost = project.isPlatformSeeded ? 0 : ENROLL_CREDIT_COST;
        if (user.credits < enrollmentCost) {
            return {
                success: false,
                error: `Insufficient credits. You need ${enrollmentCost} credits to enroll.`
            };
        }

        // The snapshot: what existed when it was published.
        const cutoff = project.publishedAt ?? project.createdAt;
        const sprints = project.sprints
            .filter((sp) => sp.createdAt <= cutoff)
            .map((sp) => ({ ...sp, tasks: sp.tasks.filter((t) => t.createdAt <= cutoff) }));
        const totalTasks = sprints.reduce((n, sp) => n + sp.tasks.length, 0);

        const copyId = crypto.randomUUID();
        const copySlug = `${project.slug.slice(0, 50)}-${copyId.slice(0, 6)}`;
        const now = new Date();

        const result = await withTransaction(async (tx) => {
            // 1. Debit, unless it is free. Guarded in SQL, not by the balance read
            // above: two concurrent enrols both pass a read-then-write check. A
            // free enrolment writes nothing to the ledger.
            if (enrollmentCost > 0) {
                const debited = await tx.update(users)
                    .set({ credits: sql`${users.credits} - ${enrollmentCost}` })
                    .where(and(eq(users.id, user.id), sql`${users.credits} >= ${enrollmentCost}`))
                    .returning({ credits: users.credits });
                if (debited.length === 0) throw new Error("Insufficient credits");
                await tx.insert(creditTransactions).values({
                    userId: user.id,
                    amount: -enrollmentCost,
                    type: "SPEND",
                    currency: "INR",
                    description: `Enrolled in: ${project.title}`,
                });
            }

            // 2. The copy itself. Everything describing the project comes across;
            // ownership, visibility, counters and the university fields do not.
            const {
                id: _id, slug: _slug, createdBy: _createdBy, visibility: _visibility, publishedAt: _publishedAt,
                forkedFromId: _forkedFromId, isPlatformSeeded: _seeded, totalStarted: _ts, totalCompleted: _tc,
                totalSubmissions: _tsub, totalViews: _tv, createdAt: _ca, updatedAt: _ua,
                isUniversityProject: _uni, universityId: _uid, teacherMemberId: _tm, classIds: _cls,
                assignmentDeadline: _ad, assignmentCredits: _ac, assignmentInstructions: _ai,
                sprints: _sprints, quiz, knowledgeBase,
                ...described
            } = project;
            await tx.insert(projectsV2).values({
                ...described,
                id: copyId,
                slug: copySlug,
                createdBy: user.id,
                visibility: "PRIVATE",
                forkedFromId: project.id,
                isPlatformSeeded: false,
                createdAt: now,
            });

            // 3. Sprints, tasks and task details, with fresh ids.
            const statusRows: { taskId: string }[] = [];
            for (const sp of sprints) {
                const sprintId = crypto.randomUUID();
                await tx.insert(projectV2Sprints).values({
                    id: sprintId,
                    projectId: copyId,
                    sprintNumber: sp.sprintNumber,
                    name: sp.name,
                    goal: sp.goal,
                    duration: sp.duration,
                    orderIndex: sp.orderIndex,
                    createdBy: user.id,
                    isApproved: true,
                    isPersonal: false,
                });
                if (sp.tasks.length === 0) continue;

                const taskRows = sp.tasks.map((t) => {
                    const { id: _tid, sprintId: _sid, projectV2Id: _pid, createdBy: _cb, createdAt: _tca, updatedAt: _tua, taskDetail: _td, ...task } = t;
                    return { ...task, id: crypto.randomUUID(), sprintId, projectV2Id: copyId, createdBy: user.id };
                });
                await tx.insert(projectV2Tasks).values(taskRows);
                statusRows.push(...taskRows.map((t) => ({ taskId: t.id })));

                const details = sp.tasks.flatMap((t, i) => {
                    if (!t.taskDetail) return [];
                    const { id: _did, taskId: _dtid, createdAt: _dca, updatedAt: _dua, ...detail } = t.taskDetail;
                    return [{ ...detail, taskId: taskRows[i]!.id }];
                });
                if (details.length > 0) await tx.insert(projectV2TaskDetails).values(details);
            }

            // 4. The assessment, if the project has one.
            if (quiz) {
                const quizId = crypto.randomUUID();
                await tx.insert(projectV2Quizzes).values({ id: quizId, projectId: copyId, totalQuestions: quiz.totalQuestions });
                if (quiz.questions.length > 0) {
                    await tx.insert(projectV2QuizQuestions).values(
                        quiz.questions.map(({ id: _qid, quizId: _qz, ...q }) => ({ ...q, quizId }))
                    );
                }
            }
            if (knowledgeBase) {
                const { id: _kid, projectId: _kp, createdAt: _kca, updatedAt: _kua, ...kb } = knowledgeBase;
                await tx.insert(projectV2KnowledgeBases).values({ ...kb, projectId: copyId });
            }

            // 5. Progress on the copy, and a status row per task.
            const [progress] = await tx.insert(userProjectV2Progress).values({
                userId: user.id,
                projectId: copyId,
                status: "IN_PROGRESS",
                totalTasks,
                startedAt: now,
            }).returning();
            if (statusRows.length > 0) {
                await tx.insert(userTaskV2Statuses).values(statusRows.map(({ taskId }) => ({
                    userId: user.id,
                    projectId: copyId,
                    taskId,
                    progressId: progress!.id,
                    status: "TO_DO" as const,
                })));
            }

            // 6. The original counts one more start.
            await tx.update(projectsV2).set({ totalStarted: sql`${projectsV2.totalStarted} + 1` }).where(eq(projectsV2.id, projectId));

            return progress!;
        });

        revalidatePath('/projects');
        revalidatePath('/projects/myprojects');
        revalidatePath(`/projects/${project.slug}`);

        return {
            success: true,
            data: {
                progress: result,
                creditsSpent: enrollmentCost,
                tasksCount: totalTasks,
                projectTitle: project.title,
                // The COPY: this is where the enrolee works from now on.
                projectSlug: copySlug,
            }
        };
    } catch (error: unknown) {
        console.error("[ENROLL PROJECT ERROR]:", error);
        const message = toErrorMessage(error);
        // The unique index caught a second click that raced the first.
        if (message.includes("uq_project_v2_fork_per_user")) {
            return { success: false, error: "You already have a copy of this project" };
        }
        return { success: false, error: message || "Failed to enroll in project" };
    }
}

/**
 * Make a private project public (plan/projects PJ-18, decided by Niraj
 * 2026-09-23).
 *
 * Records `published_at`: from this moment others see the sprints and tasks
 * that exist now, and anything added later stays the owner's. One way - there
 * is no unpublish, because people may already hold copies. The private-tier
 * price is not refunded. A copy cannot be published: publishing someone else's
 * project under your own name is the one thing a copy should not do.
 */
export async function publishProject(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        const project = await db.query.projectsV2.findFirst({
            where: eq(projectsV2.id, projectId),
            columns: { id: true, slug: true, createdBy: true, visibility: true, forkedFromId: true },
        });
        if (!project || project.createdBy !== user.id) return { success: false, error: "Project not found" };
        if (project.forkedFromId) return { success: false, error: "A copy of someone else's project cannot be published." };
        if (project.visibility === "PUBLIC") return { success: false, error: "This project is already public." };

        // Guarded on PRIVATE so a double click cannot move `published_at` forward.
        const updated = await db.update(projectsV2)
            .set({ visibility: "PUBLIC", publishedAt: new Date() })
            .where(and(eq(projectsV2.id, projectId), eq(projectsV2.visibility, "PRIVATE")))
            .returning({ id: projectsV2.id });
        if (updated.length === 0) return { success: false, error: "This project is already public." };

        revalidatePath('/projects');
        revalidatePath(`/projects/${project.slug}`);
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}
