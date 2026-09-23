"use server";

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    projectV2Tasks,
    projectV2Sprints,
    projectsV2,
    userTaskV2Assessments,
    projectV2MockSessions,
    userProjectV2Progress,
} from "@repo/db";
import { eq, and, inArray, lte, sql } from "drizzle-orm";
import { requireProjectAccess, requireTaskAccess } from "@/lib/projects/access";
import { revalidatePath } from "next/cache";


// ========================================
// TYPES
// ========================================

interface ActionResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface QuizQuestion {
    prompt: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface CodeValidationResult {
    passed: boolean;
    score: number;
    feedback: string;
    suggestions: string[];
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function getCurrentUser() {
    const session = await getSession(headers());
    if (!session?.user?.id) throw new Error("Not authenticated");
    const user = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!user[0]) throw new Error("User not found");
    return user[0];
}

import { openai } from "@/lib/openai-client";

function getOpenAIClient() {
    return openai;
}

// ========================================
// TASK ASSESSMENT - QUIZ
// ========================================

/**
 * Generate quiz questions for a task using AI
 * Questions are based on the task's Learns and description
 */
export async function generateTaskQuizQuestions(
    taskId: string
): Promise<ActionResponse<QuizQuestion[]>> {
    try {
        const access = await requireTaskAccess(taskId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        // Get task with its sprint and project
        const taskRows = await db
            .select({
                task: projectV2Tasks,
                sprint: projectV2Sprints,
                project: projectsV2,
            })
            .from(projectV2Tasks)
            .innerJoin(projectV2Sprints, eq(projectV2Tasks.sprintId, projectV2Sprints.id))
            .innerJoin(projectsV2, eq(projectV2Sprints.projectId, projectsV2.id))
            .where(eq(projectV2Tasks.id, taskId))
            .limit(1);

        if (!taskRows[0]) {
            return { success: false, error: "Task not found" };
        }

        const { task, sprint: _sprint, project } = taskRows[0];

        // Check if user already has an assessment for this task
        const existingAssessment = await db
            .select()
            .from(userTaskV2Assessments)
            .where(and(
                eq(userTaskV2Assessments.userId, user.id),
                eq(userTaskV2Assessments.taskId, taskId)
            ))
            .limit(1);

        if (existingAssessment[0]?.quizQuestions) {
            return {
                success: true,
                data: existingAssessment[0].quizQuestions as unknown as QuizQuestion[],
            };
        }

        // Generate new questions using AI
        const openai = getOpenAIClient();

        const Learns = task.learns as Array<{ title: string; description: string }> | null;
        const LearnsText = Learns
            ? Learns.map(c => `- ${c.title}: ${c.description}`).join("\n")
            : "No specific Learns defined";

        const prompt = `You are an expert coding instructor. Generate 3-5 multiple choice quiz questions to test a developer's understanding after completing this task.

Task Title: ${task.title}
Task Description: ${task.description.join("\n")}
Success Criteria: ${task.criteria.join("\n")}
Technologies: ${project.technologies.join(", ")}

Key Learns to Test:
${LearnsText}

Generate questions that:
1. Test Learnual understanding, not just memorization
2. Have 4 options each (one correct)
3. Include clear explanations for why the correct answer is right
4. Cover different aspects of the task

Respond in JSON format:
{
  "questions": [
    {
      "prompt": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "Failed to generate questions" };
        }

        const parsed = JSON.parse(content);
        const questions: QuizQuestion[] = parsed.questions || [];

        const questionsJson = JSON.parse(JSON.stringify(questions));

        if (existingAssessment[0]) {
            await db
                .update(userTaskV2Assessments)
                .set({
                    quizQuestions: questionsJson,
                    totalQuestions: questions.length,
                })
                .where(eq(userTaskV2Assessments.id, existingAssessment[0].id));
        } else {
            await db.insert(userTaskV2Assessments).values({
                userId: user.id,
                taskId,
                assessmentType: "QUIZ",
                quizQuestions: questionsJson,
                totalQuestions: questions.length,
            });
        }

        return { success: true, data: questions };
    } catch (error) {
        console.error("[GENERATE QUIZ ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate quiz",
        };
    }
}

/**
 * Submit quiz answers and get results
 */
export async function submitTaskQuizAnswers(
    taskId: string,
    answers: Array<{
        questionIndex: number;
        selectedAnswer: number
    }>
): Promise<ActionResponse<{
    passed: boolean;
    scorePercentage: number;
    correctAnswers: number
}>> {
    try {
        const user = await getCurrentUser();

        const assessmentRows = await db
            .select()
            .from(userTaskV2Assessments)
            .where(and(
                eq(userTaskV2Assessments.userId, user.id),
                eq(userTaskV2Assessments.taskId, taskId)
            ))
            .limit(1);

        const assessment = assessmentRows[0];

        if (!assessment || !assessment.quizQuestions) {
            return { success: false, error: "No quiz found for this task" };
        }

        const questions = assessment.quizQuestions as unknown as QuizQuestion[];

        const gradedAnswers = answers.map(answer => {
            const question = questions[answer.questionIndex];
            const isCorrect = question?.correctAnswer === answer.selectedAnswer;
            return {
                questionIndex: answer.questionIndex,
                selectedAnswer: answer.selectedAnswer,
                isCorrect,
            };
        });

        const correctCount = gradedAnswers.filter(a => a.isCorrect).length;
        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= 70;

        await db
            .update(userTaskV2Assessments)
            .set({
                quizAnswers: gradedAnswers,
                quizScore: score,
                correctAnswers: correctCount,
                passed,
                completedAt: passed ? new Date() : null,
                attempts: sql`${userTaskV2Assessments.attempts} + 1`,
            })
            .where(eq(userTaskV2Assessments.id, assessment.id));

        // Get task for path revalidation
        const taskRows = await db
            .select({
                slug: projectsV2.slug,
            })
            .from(projectV2Tasks)
            .innerJoin(projectV2Sprints, eq(projectV2Tasks.sprintId, projectV2Sprints.id))
            .innerJoin(projectsV2, eq(projectV2Sprints.projectId, projectsV2.id))
            .where(eq(projectV2Tasks.id, taskId))
            .limit(1);

        if (taskRows[0]) {
            revalidatePath(`/projects/${taskRows[0].slug}/sprints`);
        }

        return {
            success: true,
            data: {
                passed,
                scorePercentage: score,
                correctAnswers: correctCount
            }
        };
    } catch (error) {
        console.error("[SUBMIT QUIZ ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to submit quiz",
        };
    }
}

// ========================================
// TASK ASSESSMENT - CODE
// ========================================

/**
 * Get code challenge instructions for a task
 */
export async function getCodeChallengeInstructions(
    taskId: string
): Promise<ActionResponse<{ instructions: string; starterCode: string; language: string }>> {
    try {
        const access = await requireTaskAccess(taskId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const taskRows = await db
            .select({
                task: projectV2Tasks,
                project: projectsV2,
            })
            .from(projectV2Tasks)
            .innerJoin(projectV2Sprints, eq(projectV2Tasks.sprintId, projectV2Sprints.id))
            .innerJoin(projectsV2, eq(projectV2Sprints.projectId, projectsV2.id))
            .where(eq(projectV2Tasks.id, taskId))
            .limit(1);

        if (!taskRows[0]) {
            return { success: false, error: "Task not found" };
        }

        const { task, project } = taskRows[0];

        const existingAssessmentRows = await db
            .select()
            .from(userTaskV2Assessments)
            .where(and(
                eq(userTaskV2Assessments.userId, user.id),
                eq(userTaskV2Assessments.taskId, taskId)
            ))
            .limit(1);

        const existingAssessment = existingAssessmentRows[0];

        if (existingAssessment?.codeValidation) {
            const validation = existingAssessment.codeValidation as { instructions?: string; starterCode?: string };
            if (validation.instructions) {
                return {
                    success: true,
                    data: {
                        instructions: validation.instructions,
                        starterCode: validation.starterCode || "",
                        language: existingAssessment.codeLanguage || "javascript",
                    },
                };
            }
        }

        // Generate instructions using AI
        const openai = getOpenAIClient();
        const primaryLang = project.primaryLanguageOrFramework || "JavaScript";

        const prompt = `You are an expert coding instructor. Create a code challenge to verify a developer completed this task correctly.

Task Title: ${task.title}
Task Description: ${task.description.join("\n")}
Success Criteria: ${task.criteria.join("\n")}
Primary Language: ${primaryLang}

Create a focused code challenge that:
1. Tests the core implementation from this task
2. Can be completed in 5-10 minutes
3. Has clear success criteria

Respond in JSON format:
{
  "instructions": "Clear instructions for what code to write",
  "starterCode": "// Starter code template with TODO comments",
  "expectedPatterns": ["pattern1", "pattern2"]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "Failed to generate challenge" };
        }

        const parsed = JSON.parse(content);

        const codeValidationData = {
            instructions: parsed.instructions,
            starterCode: parsed.starterCode,
            expectedPatterns: parsed.expectedPatterns,
        };

        if (existingAssessment) {
            await db
                .update(userTaskV2Assessments)
                .set({ codeValidation: codeValidationData })
                .where(eq(userTaskV2Assessments.id, existingAssessment.id));
        } else {
            await db.insert(userTaskV2Assessments).values({
                userId: user.id,
                taskId,
                assessmentType: "CODE",
                codeLanguage: primaryLang.toLowerCase(),
                codeValidation: codeValidationData,
            });
        }

        return {
            success: true,
            data: {
                instructions: parsed.instructions,
                starterCode: parsed.starterCode || "",
                language: primaryLang.toLowerCase(),
            },
        };
    } catch (error) {
        console.error("[GET CODE CHALLENGE ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get code challenge",
        };
    }
}

/**
 * Submit code for AI validation
 */
export async function submitCodeForValidation(
    taskId: string,
    code: string,
    language: string
): Promise<ActionResponse<CodeValidationResult>> {
    try {
        const access = await requireTaskAccess(taskId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const taskRows = await db
            .select({
                task: projectV2Tasks,
                slug: projectsV2.slug,
            })
            .from(projectV2Tasks)
            .innerJoin(projectV2Sprints, eq(projectV2Tasks.sprintId, projectV2Sprints.id))
            .innerJoin(projectsV2, eq(projectV2Sprints.projectId, projectsV2.id))
            .where(eq(projectV2Tasks.id, taskId))
            .limit(1);

        if (!taskRows[0]) {
            return { success: false, error: "Task not found" };
        }

        const { task, slug } = taskRows[0];

        const assessmentRows = await db
            .select()
            .from(userTaskV2Assessments)
            .where(and(
                eq(userTaskV2Assessments.userId, user.id),
                eq(userTaskV2Assessments.taskId, taskId)
            ))
            .limit(1);

        const assessment = assessmentRows[0];

        const openai = getOpenAIClient();

        const prompt = `You are a code reviewer. Evaluate if this code submission correctly implements the task requirements.

Task: ${task.title}
Requirements: ${task.criteria.join("\n")}

Submitted Code:
\`\`\`${language}
${code}
\`\`\`

Evaluate and respond in JSON:
{
  "passed": true/false,
  "score": 0-100,
  "feedback": "Overall assessment",
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"]
}

Be encouraging but honest. Pass if core requirements are met (score >= 70).`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: "Failed to validate code" };
        }

        const result: CodeValidationResult = JSON.parse(content);
        const resultJson = JSON.parse(JSON.stringify(result));

        if (assessment) {
            await db
                .update(userTaskV2Assessments)
                .set({
                    codeSubmission: code,
                    codeLanguage: language,
                    codeValidation: resultJson,
                    codeScore: result.score,
                    passed: result.passed,
                    completedAt: result.passed ? new Date() : null,
                    attempts: sql`${userTaskV2Assessments.attempts} + 1`,
                })
                .where(eq(userTaskV2Assessments.id, assessment.id));
        }

        revalidatePath(`/projects/${slug}/sprints`);

        return { success: true, data: result };
    } catch (error) {
        console.error("[SUBMIT CODE ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to validate code",
        };
    }
}

// ========================================
// SPRINT MOCK INTERVIEW
// ========================================

/**
 * Prepare knowledge base for sprint mock interview
 */
export async function prepareSprintMockKnowledge(
    projectId: string,
    sprintId: string
): Promise<ActionResponse<{ knowledgeBase: string; topics: string[] }>> {
    try {
        /*
         * There was no session lookup here AT ALL, and the function returns the
         * project's whole knowledge base - every sprint name and goal, every task
         * description, every success criterion. An unauthenticated caller with a
         * project id could read the paid content of a private project
         * (sweep 2026-09-23, finding 11).
         */
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        const targetSprintRows = await db
            .select({ sprintNumber: projectV2Sprints.sprintNumber, name: projectV2Sprints.name })
            .from(projectV2Sprints)
            .where(eq(projectV2Sprints.id, sprintId))
            .limit(1);

        if (!targetSprintRows[0]) {
            return { success: false, error: "Sprint not found" };
        }

        const targetSprint = targetSprintRows[0];

        const sprints = await db
            .select()
            .from(projectV2Sprints)
            .where(and(
                eq(projectV2Sprints.projectId, projectId),
                lte(projectV2Sprints.sprintNumber, targetSprint.sprintNumber)
            ))
            .orderBy(projectV2Sprints.sprintNumber);

        const projectRows = await db
            .select({
                title: projectsV2.title,
                technologies: projectsV2.technologies,
                targetAudience: projectsV2.targetAudience,
                vision: projectsV2.vision,
            })
            .from(projectsV2)
            .where(eq(projectsV2.id, projectId))
            .limit(1);

        const project = projectRows[0];

        const sprintIds = sprints.map(s => s.id);
        const allTasks = sprintIds.length > 0
            ? await db
                .select()
                .from(projectV2Tasks)
                .where(inArray(projectV2Tasks.sprintId, sprintIds))
                .orderBy(projectV2Tasks.orderIndex)
            : [];

        const tasksBySprintId = new Map<string, typeof allTasks>();
        for (const task of allTasks) {
            const existing = tasksBySprintId.get(task.sprintId) || [];
            existing.push(task);
            tasksBySprintId.set(task.sprintId, existing);
        }

        const topics: string[] = [];
        let knowledgeBase = `# Project: ${project?.title}\n`;
        knowledgeBase += `Technologies: ${project?.technologies.join(", ")}\n\n`;
        knowledgeBase += `## Sprint Review: ${targetSprint.name}\n\n`;
        knowledgeBase += `This mock interview covers the following sprints:\n\n`;

        for (const sprint of sprints) {
            const sprintTasks = tasksBySprintId.get(sprint.id) || [];
            knowledgeBase += `### ${sprint.name}\n`;
            knowledgeBase += `Goal: ${sprint.goal}\n\n`;

            for (const task of sprintTasks) {
                knowledgeBase += `**${task.title}**\n`;
                knowledgeBase += `- Description: ${task.description.join(" ")}\n`;
                knowledgeBase += `- Success Criteria: ${task.criteria.join("; ")}\n`;

                if (task.learns) {
                    const Learns = task.learns as Array<{ title: string; description: string }>;
                    Learns.forEach(c => {
                        knowledgeBase += `- learn: ${c.title} - ${c.description}\n`;
                        if (!topics.includes(c.title)) {
                            topics.push(c.title);
                        }
                    });
                }

                if (task.tags.length > 0) {
                    task.tags.forEach(tag => {
                        if (!topics.includes(tag)) {
                            topics.push(tag);
                        }
                    });
                }

                knowledgeBase += "\n";
            }
        }

        knowledgeBase += `\n## Interview Guidelines\n`;
        knowledgeBase += `Ask questions about:\n`;
        knowledgeBase += `1. Implementation decisions made during these sprints\n`;
        knowledgeBase += `2. Technical Learns that were applied\n`;
        knowledgeBase += `3. Challenges faced and how they were solved\n`;
        knowledgeBase += `4. Alternative approaches that could have been taken\n`;

        return {
            success: true,
            data: { knowledgeBase, topics },
        };
    } catch (error) {
        console.error("[PREPARE MOCK KNOWLEDGE ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to prepare knowledge base",
        };
    }
}

/**
 * Start a sprint mock interview session
 */
export async function startSprintMockSession(
    projectId: string,
    sprintId: string
): Promise<ActionResponse<{ sessionId: string; knowledgeBase: string }>> {
    try {
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const existingSessionRows = await db
            .select()
            .from(projectV2MockSessions)
            .where(and(
                eq(projectV2MockSessions.userId, user.id),
                eq(projectV2MockSessions.projectId, projectId),
                eq(projectV2MockSessions.sprintId, sprintId),
                inArray(projectV2MockSessions.status, ["SCHEDULED", "IN_PROGRESS"])
            ))
            .limit(1);

        if (existingSessionRows[0]) {
            const knowledge = await prepareSprintMockKnowledge(projectId, sprintId);
            return {
                success: true,
                data: {
                    sessionId: existingSessionRows[0].id,
                    knowledgeBase: knowledge.data?.knowledgeBase || "",
                },
            };
        }

        const knowledge = await prepareSprintMockKnowledge(projectId, sprintId);
        if (!knowledge.success) {
            return { success: false, error: knowledge.error };
        }

        const newSessionRows = await db
            .insert(projectV2MockSessions)
            .values({
                userId: user.id,
                projectId,
                sprintId,
                sessionType: "SPRINT_REVIEW",
                status: "SCHEDULED",
            })
            .returning({ id: projectV2MockSessions.id });

        const newSession = newSessionRows[0]
        if (!newSession) throw new Error("Failed to create mock session")

        return {
            success: true,
            data: {
                sessionId: newSession.id,
                knowledgeBase: knowledge.data!.knowledgeBase,
            },
        };
    } catch (error) {
        console.error("[START SPRINT MOCK ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to start mock session",
        };
    }
}

/**
 * Complete a sprint mock interview and record score
 */
export async function completeSprintMockSession(
    sessionId: string,
    data: {
        conversationId?: string;
        duration?: number;
        transcript?: string;
        score?: number;
        feedback?: string;
        strengths?: string[];
        improvements?: string[];
    }
): Promise<ActionResponse<{ score: number }>> {
    try {
        const user = await getCurrentUser();

        const sessionRows = await db
            .select({
                session: projectV2MockSessions,
                slug: projectsV2.slug,
            })
            .from(projectV2MockSessions)
            .innerJoin(projectsV2, eq(projectV2MockSessions.projectId, projectsV2.id))
            .where(eq(projectV2MockSessions.id, sessionId))
            .limit(1);

        if (!sessionRows[0] || sessionRows[0].session.userId !== user.id) {
            return { success: false, error: "Session not found" };
        }

        const { session, slug } = sessionRows[0];

        await db
            .update(projectV2MockSessions)
            .set({
                conversationId: data.conversationId,
                duration: data.duration,
                transcript: data.transcript,
                score: data.score,
                feedback: data.feedback,
                strengths: data.strengths || [],
                improvements: data.improvements || [],
                status: "COMPLETED",
                completedAt: new Date(),
            })
            .where(eq(projectV2MockSessions.id, sessionId));

        if (data.score !== undefined && session.sprintId) {
            await db
                .update(userProjectV2Progress)
                .set({ mockScore: data.score })
                .where(and(
                    eq(userProjectV2Progress.userId, user.id),
                    eq(userProjectV2Progress.projectId, session.projectId)
                ));
        }

        revalidatePath(`/projects/${slug}/sprints`);

        return {
            success: true,
            data: { score: data.score || 0 },
        };
    } catch (error) {
        console.error("[COMPLETE MOCK ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to complete mock session",
        };
    }
}

// ========================================
// GET ASSESSMENT STATUS
// ========================================

/**
 * Get assessment status for a task
 */
export async function getTaskAssessmentStatus(
    taskId: string
): Promise<ActionResponse<{
    hasAssessment: boolean;
    assessmentType: string;
    passed: boolean;
    attempts: number;
    score: number | null;
}>> {
    try {
        const access = await requireTaskAccess(taskId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const taskRows = await db
            .select({ assessmentType: projectV2Tasks.assessmentType })
            .from(projectV2Tasks)
            .where(eq(projectV2Tasks.id, taskId))
            .limit(1);

        if (!taskRows[0]) {
            return { success: false, error: "Task not found" };
        }

        const assessmentRows = await db
            .select()
            .from(userTaskV2Assessments)
            .where(and(
                eq(userTaskV2Assessments.userId, user.id),
                eq(userTaskV2Assessments.taskId, taskId)
            ))
            .limit(1);

        const assessment = assessmentRows[0];

        return {
            success: true,
            data: {
                hasAssessment: taskRows[0].assessmentType !== "NONE",
                assessmentType: taskRows[0].assessmentType,
                passed: assessment?.passed || false,
                attempts: assessment?.attempts || 0,
                score: assessment?.quizScore || assessment?.codeScore || null,
            },
        };
    } catch (error) {
        console.error("[GET ASSESSMENT STATUS ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get assessment status",
        };
    }
}

/**
 * Get sprint mock session status
 */
export async function getSprintMockStatus(
    projectId: string,
    sprintId: string
): Promise<ActionResponse<{
    hasCompleted: boolean;
    score: number | null;
    lastAttempt: Date | null;
}>> {
    try {
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const sessionRows = await db
            .select({
                score: projectV2MockSessions.score,
                completedAt: projectV2MockSessions.completedAt,
            })
            .from(projectV2MockSessions)
            .where(and(
                eq(projectV2MockSessions.userId, user.id),
                eq(projectV2MockSessions.projectId, projectId),
                eq(projectV2MockSessions.sprintId, sprintId),
                eq(projectV2MockSessions.status, "COMPLETED")
            ))
            .orderBy(projectV2MockSessions.completedAt)
            .limit(1);

        const session = sessionRows[0];

        return {
            success: true,
            data: {
                hasCompleted: !!session,
                score: session?.score || null,
                lastAttempt: session?.completedAt || null,
            },
        };
    } catch (error) {
        console.error("[GET MOCK STATUS ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get mock status",
        };
    }
}

/**
 * Save sprint mock interview result after Voice session ends
 */
export async function saveSprintMockResult(
    projectId: string,
    sprintId: string,
    conversationId: string
): Promise<ActionResponse<{ score: number }>> {
    try {
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const existingSessionRows = await db
            .select({
                session: projectV2MockSessions,
                slug: projectsV2.slug,
            })
            .from(projectV2MockSessions)
            .innerJoin(projectsV2, eq(projectV2MockSessions.projectId, projectsV2.id))
            .where(and(
                eq(projectV2MockSessions.userId, user.id),
                eq(projectV2MockSessions.projectId, projectId),
                eq(projectV2MockSessions.sprintId, sprintId),
                inArray(projectV2MockSessions.status, ["SCHEDULED", "IN_PROGRESS"])
            ))
            .limit(1);

        if (!existingSessionRows[0]) {
            const _newSessionRows = await db
                .insert(projectV2MockSessions)
                .values({
                    userId: user.id,
                    projectId,
                    sprintId,
                    conversationId,
                    sessionType: "SPRINT_REVIEW",
                    status: "COMPLETED",
                    completedAt: new Date(),
                    score: 75,
                })
                .returning({ id: projectV2MockSessions.id });

            const projectRows = await db
                .select({ slug: projectsV2.slug })
                .from(projectsV2)
                .where(eq(projectsV2.id, projectId))
                .limit(1);

            if (projectRows[0]) {
                revalidatePath(`/projects/${projectRows[0].slug}/sprints`);
            }

            return {
                success: true,
                data: { score: 75 },
            };
        }

        await db
            .update(projectV2MockSessions)
            .set({
                conversationId,
                status: "COMPLETED",
                completedAt: new Date(),
                score: 80,
            })
            .where(eq(projectV2MockSessions.id, existingSessionRows[0].session.id));

        await db
            .update(userProjectV2Progress)
            .set({ mockScore: 80 })
            .where(and(
                eq(userProjectV2Progress.userId, user.id),
                eq(userProjectV2Progress.projectId, projectId)
            ));

        revalidatePath(`/projects/${existingSessionRows[0].slug}/sprints`);

        return {
            success: true,
            data: { score: 80 },
        };
    } catch (error) {
        console.error("[SAVE MOCK RESULT ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save mock result",
        };
    }
}

// ========================================
// SPRINT COMPLETION STATUS (FOR LOCKING)
// ========================================

interface SprintCompletionStatus {
    isFullyCompleted: boolean;
    tasksCompleted: boolean;
    allAssessmentsPassed: boolean;
    mockInterviewCompleted: boolean;
    taskStats: {
        total: number;
        completed: number;
    };
    assessmentStats: {
        total: number;
        passed: number;
    };
    mockStatus: {
        required: boolean;
        completed: boolean;
        score: number | null;
    };
}

/**
 * Every sprint's completion status for a project, in one round trip.
 *
 * The sprints page used to call `getSprintCompletionStatus` once per sprint, in
 * series, inside a mount effect: a ten-sprint project opened with ten sequential
 * server actions, each one its own session lookup and four queries, and the
 * sprint locks flickered open one at a time as they landed. This reads the same
 * facts with five queries total, whatever the sprint count.
 *
 * `isLastSprint` is decided here from the highest sprint number on the project,
 * rather than from the length of the list the browser happens to be holding -
 * personal sprints make those two disagree.
 */
export async function getSprintCompletionStatuses(
    projectId: string,
): Promise<ActionResponse<Record<string, SprintCompletionStatus>>> {
    try {
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const sprints = await db
            .select({ id: projectV2Sprints.id, sprintNumber: projectV2Sprints.sprintNumber })
            .from(projectV2Sprints)
            .where(eq(projectV2Sprints.projectId, projectId));

        if (sprints.length === 0) return { success: true, data: {} };

        const lastSprintNumber = Math.max(...sprints.map((s) => s.sprintNumber));
        const sprintIds = sprints.map((s) => s.id);

        const tasks = await db
            .select({
                id: projectV2Tasks.id,
                sprintId: projectV2Tasks.sprintId,
                assessmentType: projectV2Tasks.assessmentType,
            })
            .from(projectV2Tasks)
            .where(inArray(projectV2Tasks.sprintId, sprintIds));

        const taskIds = tasks.map((t) => t.id);
        const assessmentTaskIds = tasks.filter((t) => t.assessmentType !== "NONE").map((t) => t.id);

        const { userTaskV2Statuses } = await import("@repo/db");
        const completedTaskStatuses = taskIds.length > 0
            ? await db
                .select({ taskId: userTaskV2Statuses.taskId })
                .from(userTaskV2Statuses)
                .where(and(
                    eq(userTaskV2Statuses.userId, user.id),
                    inArray(userTaskV2Statuses.taskId, taskIds),
                    eq(userTaskV2Statuses.status, "COMPLETED"),
                ))
            : [];
        const completedTaskIds = new Set(completedTaskStatuses.map((s) => s.taskId));

        const assessments = assessmentTaskIds.length > 0
            ? await db
                .select({ taskId: userTaskV2Assessments.taskId, passed: userTaskV2Assessments.passed })
                .from(userTaskV2Assessments)
                .where(and(
                    eq(userTaskV2Assessments.userId, user.id),
                    inArray(userTaskV2Assessments.taskId, assessmentTaskIds),
                ))
            : [];
        const passedAssessmentTaskIds = new Set(
            assessments.filter((a) => a.passed).map((a) => a.taskId),
        );

        const mocks = await db
            .select({ sprintId: projectV2MockSessions.sprintId, score: projectV2MockSessions.score })
            .from(projectV2MockSessions)
            .where(and(
                eq(projectV2MockSessions.userId, user.id),
                eq(projectV2MockSessions.projectId, projectId),
                eq(projectV2MockSessions.status, "COMPLETED"),
            ));
        const mockBySprint = new Map<string, number | null>();
        for (const m of mocks) {
            if (m.sprintId && !mockBySprint.has(m.sprintId)) mockBySprint.set(m.sprintId, m.score ?? null);
        }

        const data: Record<string, SprintCompletionStatus> = {};
        for (const sprint of sprints) {
            const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
            const totalTasks = sprintTasks.length;
            const completedTasks = sprintTasks.filter((t) => completedTaskIds.has(t.id)).length;
            const tasksCompleted = totalTasks === 0 || completedTasks === totalTasks;

            const withAssessments = sprintTasks.filter((t) => t.assessmentType !== "NONE");
            const passedAssessments = withAssessments.filter((t) => passedAssessmentTaskIds.has(t.id)).length;
            const allAssessmentsPassed = withAssessments.length === 0 || passedAssessments === withAssessments.length;

            const mockRequired = sprint.sprintNumber !== lastSprintNumber;
            const mockInterviewCompleted = mockRequired ? mockBySprint.has(sprint.id) : true;
            const mockScore = mockRequired ? (mockBySprint.get(sprint.id) ?? null) : null;

            data[sprint.id] = {
                isFullyCompleted: tasksCompleted && allAssessmentsPassed && mockInterviewCompleted,
                tasksCompleted,
                allAssessmentsPassed,
                mockInterviewCompleted,
                taskStats: { total: totalTasks, completed: completedTasks },
                assessmentStats: { total: withAssessments.length, passed: passedAssessments },
                mockStatus: { required: mockRequired, completed: mockInterviewCompleted, score: mockScore },
            };
        }

        return { success: true, data };
    } catch (error: unknown) {
        console.error("[GET SPRINT COMPLETION STATUSES ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get sprint completion status",
        };
    }
}

/**
 * Get comprehensive sprint completion status for determining if next sprint should be unlocked.
 */
export async function getSprintCompletionStatus(
    projectId: string,
    sprintId: string,
    isLastSprint: boolean = false
): Promise<ActionResponse<SprintCompletionStatus>> {
    try {
        const access = await requireProjectAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const user = await getCurrentUser();

        const sprintTasks = await db
            .select({
                id: projectV2Tasks.id,
                assessmentType: projectV2Tasks.assessmentType,
            })
            .from(projectV2Tasks)
            .where(eq(projectV2Tasks.sprintId, sprintId));

        const _userProgressRows = await db
            .select({ taskStatuses: userProjectV2Progress.tasksCompleted })
            .from(userProjectV2Progress)
            .where(and(
                eq(userProjectV2Progress.userId, user.id),
                eq(userProjectV2Progress.projectId, projectId)
            ))
            .limit(1);

        // For task completion, check userTaskV2Statuses
        const { userTaskV2Statuses } = await import("@repo/db");
        const taskIds = sprintTasks.map(t => t.id);
        const completedTaskStatuses = taskIds.length > 0
            ? await db
                .select({ taskId: userTaskV2Statuses.taskId })
                .from(userTaskV2Statuses)
                .where(and(
                    eq(userTaskV2Statuses.userId, user.id),
                    inArray(userTaskV2Statuses.taskId, taskIds),
                    eq(userTaskV2Statuses.status, "COMPLETED")
                ))
            : [];

        const completedTaskIds = new Set(completedTaskStatuses.map(s => s.taskId));

        const totalTasks = sprintTasks.length;
        const completedTasks = sprintTasks.filter(t => completedTaskIds.has(t.id)).length;
        const tasksCompleted = totalTasks === 0 || completedTasks === totalTasks;

        const tasksWithAssessments = sprintTasks.filter(t => t.assessmentType !== "NONE");
        const assessmentTaskIds = tasksWithAssessments.map(t => t.id);

        const userAssessments = assessmentTaskIds.length > 0
            ? await db
                .select({
                    taskId: userTaskV2Assessments.taskId,
                    passed: userTaskV2Assessments.passed,
                })
                .from(userTaskV2Assessments)
                .where(and(
                    eq(userTaskV2Assessments.userId, user.id),
                    inArray(userTaskV2Assessments.taskId, assessmentTaskIds)
                ))
            : [];

        const assessmentMap = new Map(userAssessments.map(a => [a.taskId, a.passed]));
        const totalAssessments = tasksWithAssessments.length;
        const passedAssessments = tasksWithAssessments.filter(t => assessmentMap.get(t.id) === true).length;
        const allAssessmentsPassed = totalAssessments === 0 || passedAssessments === totalAssessments;

        let mockInterviewCompleted = true;
        let mockScore: number | null = null;
        const mockRequired = !isLastSprint;

        if (mockRequired) {
            const mockSessionRows = await db
                .select({ score: projectV2MockSessions.score })
                .from(projectV2MockSessions)
                .where(and(
                    eq(projectV2MockSessions.userId, user.id),
                    eq(projectV2MockSessions.projectId, projectId),
                    eq(projectV2MockSessions.sprintId, sprintId),
                    eq(projectV2MockSessions.status, "COMPLETED")
                ))
                .orderBy(projectV2MockSessions.completedAt)
                .limit(1);

            mockInterviewCompleted = mockSessionRows.length > 0;
            mockScore = mockSessionRows[0]?.score || null;
        }

        const isFullyCompleted = tasksCompleted && allAssessmentsPassed && mockInterviewCompleted;

        return {
            success: true,
            data: {
                isFullyCompleted,
                tasksCompleted,
                allAssessmentsPassed,
                mockInterviewCompleted,
                taskStats: {
                    total: totalTasks,
                    completed: completedTasks,
                },
                assessmentStats: {
                    total: totalAssessments,
                    passed: passedAssessments,
                },
                mockStatus: {
                    required: mockRequired,
                    completed: mockInterviewCompleted,
                    score: mockScore,
                },
            },
        };
    } catch (error) {
        console.error("[GET SPRINT COMPLETION STATUS ERROR]:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get sprint completion status",
        };
    }
}
