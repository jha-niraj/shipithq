"use server"

import { getSession } from "@repo/auth";
import { requireProjectAccess } from "@/lib/projects/access"
import { headers } from "next/headers";
import { db, projectV2Resources, projectsV2 } from "@repo/db";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache"

/**
 * Add a new resource to a project
 */
export async function addProjectResource(data: {
    projectId: string
    title: string
    link: string
    type: string
    description?: string
}) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        if (!data.title || data.title.length > 200) {
            return { success: false, error: "Title must be 1-200 characters" }
        }

        /*
         * A link, and a link we are willing to render. `data.link` was only
         * checked non-empty, so `javascript:` and `data:` URLs went straight into
         * a row the resources list renders as an anchor (sweep 2026-09-23,
         * finding 13).
         */
        let parsed: URL
        try {
            parsed = new URL(data.link)
        } catch {
            return { success: false, error: "That does not look like a link." }
        }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return { success: false, error: "Only http and https links can be added." }
        }

        // And the project has to be one this person is on.
        const access = await requireProjectAccess(data.projectId)
        if (!access.ok) return { success: false, error: access.error }

        const [project] = await db
            .select({ id: projectsV2.id, createdBy: projectsV2.createdBy })
            .from(projectsV2)
            .where(eq(projectsV2.id, data.projectId))
            .limit(1)

        if (!project) {
            return { success: false, error: "Project not found" }
        }

        const isCreator = project.createdBy === session.user.id

        const [resource] = await db
            .insert(projectV2Resources)
            .values({
                userId: session.user.id,
                projectId: data.projectId,
                title: data.title,
                link: data.link,
                type: data.type as any,
                description: data.description,
                isOfficial: isCreator,
            })
            .returning()

        if (!resource) return { success: false, error: "Failed to create resource" }

        // Fetch with user info
        const resourceWithUser = await db.query.projectV2Resources.findFirst({
            where: eq(projectV2Resources.id, resource.id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true, username: true }
                }
            }
        })

        revalidatePath(`/projects/[slug]`, 'page')

        return { success: true, resource: resourceWithUser }

    } catch (error) {
        console.error("Error adding resource:", error)
        return { success: false, error: "Failed to add resource" }
    }
}

/**
 * Get all resources for a project
 */
export async function getProjectResources(params: {
    projectId: string
    type?: string
}) {
    try {
        // Had no auth at all: a project id was enough to read everything anyone
        // had attached to a private project.
        const access = await requireProjectAccess(params.projectId)
        if (!access.ok) return { success: false, error: access.error }

        const conditions: SQL[] = [eq(projectV2Resources.projectId, params.projectId)]

        if (params.type) {
            conditions.push(eq(projectV2Resources.type, params.type as any))
        }

        const resources = await db.query.projectV2Resources.findMany({
            where: and(...conditions),
            orderBy: [
                desc(projectV2Resources.isOfficial),
                desc(projectV2Resources.helpfulCount),
                desc(projectV2Resources.createdAt)
            ],
            with: {
                user: {
                    columns: { id: true, name: true, image: true, username: true }
                }
            }
        })

        return { success: true, resources }

    } catch (error) {
        console.error("Error fetching resources:", error)
        return { success: false, error: "Failed to fetch resources", resources: [] }
    }
}

/**
 * Mark a resource as helpful
 */
export async function toggleResourceHelpful(resourceId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const [resource] = await db
            .select({
                markedHelpfulBy: projectV2Resources.markedHelpfulBy,
                helpfulCount: projectV2Resources.helpfulCount
            })
            .from(projectV2Resources)
            .where(eq(projectV2Resources.id, resourceId))
            .limit(1)

        if (!resource) {
            return { success: false, error: "Resource not found" }
        }

        const hasMarked = resource.markedHelpfulBy.includes(session.user.id)

        if (hasMarked) {
            await db
                .update(projectV2Resources)
                .set({
                    markedHelpfulBy: resource.markedHelpfulBy.filter((id: string) => id !== session.user.id),
                    helpfulCount: sql`${projectV2Resources.helpfulCount} - 1`,
                })
                .where(eq(projectV2Resources.id, resourceId))
            return { success: true, marked: false }
        } else {
            await db
                .update(projectV2Resources)
                .set({
                    markedHelpfulBy: [...resource.markedHelpfulBy, session.user.id],
                    helpfulCount: sql`${projectV2Resources.helpfulCount} + 1`,
                })
                .where(eq(projectV2Resources.id, resourceId))
            return { success: true, marked: true }
        }

    } catch (error) {
        console.error("Error toggling helpful:", error)
        return { success: false, error: "Failed to update resource" }
    }
}

/**
 * Increment resource view count
 */
export async function incrementResourceView(resourceId: string) {
    try {
        await db
            .update(projectV2Resources)
            .set({ views: sql`${projectV2Resources.views} + 1` })
            .where(eq(projectV2Resources.id, resourceId))
        return { success: true }
    } catch {
        return { success: false, error: "Failed to increment view" }
    }
}

/**
 * Delete a resource (only by creator or resource author)
 */
export async function deleteProjectResource(resourceId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" }
        }

        const resource = await db.query.projectV2Resources.findFirst({
            where: eq(projectV2Resources.id, resourceId),
            with: {
                project: {
                    columns: { createdBy: true }
                }
            }
        })

        if (!resource) {
            return { success: false, error: "Resource not found" }
        }

        const canDelete = resource.userId === session.user.id || resource.project.createdBy === session.user.id

        if (!canDelete) {
            return { success: false, error: "Not authorized to delete this resource" }
        }

        await db.delete(projectV2Resources).where(eq(projectV2Resources.id, resourceId))

        revalidatePath(`/projects/[slug]`, 'page')

        return { success: true }

    } catch (error) {
        console.error("Error deleting resource:", error)
        return { success: false, error: "Failed to delete resource" }
    }
}
