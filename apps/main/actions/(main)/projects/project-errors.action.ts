"use server";

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db, projectV2Errors, projectsV2, userProjectV2Progress, projectV2Tasks,
    withTransaction
} from "@repo/db";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { requireProjectReadAccess } from "@/lib/projects/access";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toErrorMessage } from "@/lib/errors"

interface ActionResponse {
    success: boolean;
    data?: any;
    error?: string;
}

async function getCurrentUser() {
    const session = await getSession(headers());
    if (!session?.user?.id) throw new Error("Not authenticated");
    return { id: session.user.id, email: session.user.email, role: session.user.role };
}

// ========================================
// INPUT SCHEMAS
// ========================================

const CreateErrorSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(5).max(200),
    description: z.string().min(20).max(2000),
    solution: z.string().min(20).max(3000),
    severity: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    category: z.enum([
        "SETUP",
        "CONFIGURATION",
        "DATABASE",
        "API",
        "UI",
        "STATE",
        "DEPLOYMENT",
        "SECURITY",
        "PERFORMANCE",
        "OTHER"
    ]).default("OTHER"),
    taskId: z.string().optional(),
    errorCode: z.string().max(5000).optional(),
    fixedCode: z.string().max(5000).optional(),
    tags: z.array(z.string()).max(10).optional(),
});

const UpdateErrorSchema = CreateErrorSchema.partial().extend({
    id: z.string().min(1),
});

// ========================================
// GET PROJECT ERRORS
// ========================================

/**
 * Get all errors for a project (approved ones for public, all for project owner/admin)
 */
export async function getProjectErrors(
    projectId: string,
    options?: {
        page?: number;
        limit?: number;
        category?: string;
        severity?: string;
        sortBy?: "recent" | "helpful" | "encountered";
        includeAll?: boolean;
    }
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        const {
            page = 1,
            limit = 20,
            category,
            severity,
            sortBy = "helpful",
            includeAll = false
        } = options || {};

        // Read access (PJ-21): the people on the project, or anyone for a PUBLIC
        // one, and a copy reads its original's errors too. This had no check at
        // all: any signed-in user could read any project's errors, private ones
        // included.
        const access = await requireProjectReadAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        const isOwnerOrAdmin = access.isCreator || user.role === "Admin";

        const conditions: any[] = [inArray(projectV2Errors.projectId, access.projectIds)];

        if (!includeAll || !isOwnerOrAdmin) {
            conditions.push(eq(projectV2Errors.status, "APPROVED"));
        }

        if (category && category !== "ALL") {
            conditions.push(eq(projectV2Errors.category, category as any));
        }

        if (severity && severity !== "ALL") {
            conditions.push(eq(projectV2Errors.severity, severity as any));
        }

        let orderByClause: any = desc(projectV2Errors.helpfulCount);
        if (sortBy === "recent") {
            orderByClause = desc(projectV2Errors.createdAt);
        } else if (sortBy === "encountered") {
            orderByClause = desc(projectV2Errors.encounteredCount);
        }

        const offset = (page - 1) * limit;

        const [errors, countResult] = await Promise.all([
            db.query.projectV2Errors.findMany({
                where: and(...conditions),
                orderBy: orderByClause,
                offset,
                limit,
                with: {
                    submittedBy: {
                        columns: { id: true, name: true, image: true }
                    },
                    task: {
                        columns: { id: true, title: true }
                    }
                }
            }),
            db.select({ count: sql<number>`count(*)` }).from(projectV2Errors).where(and(...conditions))
        ]);

        const total = Number(countResult[0]?.count ?? 0);

        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                errors,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1,
                }
            }
        };
    } catch (error: unknown) {
        console.error("[GET PROJECT ERRORS]:", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

/**
 * Get a single error by ID
 */
export async function getErrorById(errorId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const error = await db.query.projectV2Errors.findFirst({
            where: eq(projectV2Errors.id, errorId),
            with: {
                submittedBy: {
                    columns: { id: true, name: true, image: true }
                },
                task: {
                    columns: { id: true, title: true }
                },
                project: {
                    columns: { id: true, slug: true, title: true, createdBy: true }
                }
            }
        });

        if (!error) {
            return { success: false, error: "Error not found" };
        }

        const isOwnerOrAdmin = error.project.createdBy === user.id ||
            error.submittedById === user.id ||
            user.role === "Admin";

        if (error.status !== "APPROVED" && !isOwnerOrAdmin) {
            return { success: false, error: "Error not found" };
        }

        return {
            success: true,
            data: error
        };
    } catch (error: unknown) {
        console.error("[GET ERROR BY ID]:", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// CREATE ERROR
// ========================================

/**
 * Submit a new error/mistake for a project
 */
export async function createProjectError(
    input: z.infer<typeof CreateErrorSchema>
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        const validated = CreateErrorSchema.parse(input);

        const [project] = await db
            .select({ id: projectsV2.id, slug: projectsV2.slug, createdBy: projectsV2.createdBy })
            .from(projectsV2)
            .where(eq(projectsV2.id, validated.projectId))
            .limit(1);

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        // Check user progress - must be enrolled to submit errors
        const [progress] = await db
            .select({ id: userProjectV2Progress.id })
            .from(userProjectV2Progress)
            .where(
                and(
                    eq(userProjectV2Progress.userId, user.id),
                    eq(userProjectV2Progress.projectId, validated.projectId)
                )
            )
            .limit(1);

        const isOwner = project.createdBy === user.id;
        if (!isOwner && !progress) {
            return {
                success: false,
                error: "You must be enrolled in this project to submit errors"
            };
        }

        // Verify task belongs to project if taskId provided
        if (validated.taskId) {
            const [task] = await db
                .select({ id: projectV2Tasks.id })
                .from(projectV2Tasks)
                .where(eq(projectV2Tasks.id, validated.taskId))
                .limit(1);

            if (!task) {
                return { success: false, error: "Invalid task" };
            }
        }

        const autoApprove = isOwner || user.role === "Admin";

        const [error] = await db
            .insert(projectV2Errors)
            .values({
                projectId: validated.projectId,
                title: validated.title,
                description: validated.description,
                solution: validated.solution,
                severity: validated.severity,
                category: validated.category,
                taskId: validated.taskId,
                errorCode: validated.errorCode,
                fixedCode: validated.fixedCode,
                tags: validated.tags || [],
                submittedById: user.id,
                status: autoApprove ? "APPROVED" : "PENDING",
                approvedAt: autoApprove ? new Date() : null,
            })
            .returning();

        revalidatePath(`/projects/${project.slug}`);

        return {
            success: true,
            data: error,
        };
    } catch (error: unknown) {
        console.error("[CREATE PROJECT ERROR]:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.message };
        }
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// UPDATE ERROR
// ========================================

/**
 * Update an existing error (only by submitter or admin)
 */
export async function updateProjectError(
    input: z.infer<typeof UpdateErrorSchema>
): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        const validated = UpdateErrorSchema.parse(input);

        const existingError = await db.query.projectV2Errors.findFirst({
            where: eq(projectV2Errors.id, validated.id),
            with: {
                project: {
                    columns: { slug: true, createdBy: true }
                }
            }
        });

        if (!existingError) {
            return { success: false, error: "Error not found" };
        }

        const canUpdate = existingError.submittedById === user.id ||
            existingError.project.createdBy === user.id ||
            user.role === "Admin";

        if (!canUpdate) {
            return { success: false, error: "Unauthorized" };
        }

        const updateData: any = {};
        if (validated.title) updateData.title = validated.title;
        if (validated.description) updateData.description = validated.description;
        if (validated.solution) updateData.solution = validated.solution;
        if (validated.severity) updateData.severity = validated.severity;
        if (validated.category) updateData.category = validated.category;
        if (validated.taskId !== undefined) updateData.taskId = validated.taskId;
        if (validated.errorCode !== undefined) updateData.errorCode = validated.errorCode;
        if (validated.fixedCode !== undefined) updateData.fixedCode = validated.fixedCode;
        if (validated.tags) updateData.tags = validated.tags;

        const [error] = await db
            .update(projectV2Errors)
            .set(updateData)
            .where(eq(projectV2Errors.id, validated.id))
            .returning();

        revalidatePath(`/projects/${existingError.project.slug}`);

        return { success: true, data: error };
    } catch (error: unknown) {
        console.error("[UPDATE PROJECT ERROR]:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.message };
        }
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// DELETE ERROR
// ========================================

/**
 * Delete an error (only by submitter or admin)
 */
export async function deleteProjectError(errorId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const error = await db.query.projectV2Errors.findFirst({
            where: eq(projectV2Errors.id, errorId),
            with: {
                project: {
                    columns: { slug: true, createdBy: true }
                }
            }
        });

        if (!error) {
            return { success: false, error: "Error not found" };
        }

        const canDelete = error.submittedById === user.id ||
            error.project.createdBy === user.id ||
            user.role === "Admin";

        if (!canDelete) {
            return { success: false, error: "Unauthorized" };
        }

        await db.delete(projectV2Errors).where(eq(projectV2Errors.id, errorId));

        revalidatePath(`/projects/${error.project.slug}`);

        return { success: true };
    } catch (error: unknown) {
        console.error("[DELETE PROJECT ERROR]:", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// VOTING
// ========================================

// ========================================
// MODERATION (Admin/Owner)
// ========================================

// ========================================
// STATS
// ========================================

/**
 * Get error stats for a project
 */
export async function getProjectErrorStats(projectId: string): Promise<ActionResponse> {
    try {
        const access = await requireProjectReadAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const baseCondition = and(
            inArray(projectV2Errors.projectId, access.projectIds),
            eq(projectV2Errors.status, "APPROVED")
        );

        const [totalErrors, topHelpful] = await Promise.all([
            db.select({ count: sql<number>`count(*)` })
                .from(projectV2Errors)
                .where(baseCondition),
            db.query.projectV2Errors.findMany({
                where: baseCondition,
                orderBy: [desc(projectV2Errors.helpfulCount)],
                limit: 5,
                columns: {
                    id: true,
                    title: true,
                    helpfulCount: true,
                    encounteredCount: true,
                }
            })
        ]);

        return {
            success: true,
            data: {
                totalErrors: Number(totalErrors[0]?.count ?? 0),
                topHelpful
            }
        };
    } catch (error: unknown) {
        console.error("[GET PROJECT ERROR STATS]:", error);
        return { success: false, error: toErrorMessage(error) };
    }
}
