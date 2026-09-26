'use server'

import { db, users, projectsV2, projectV2Tasks, projectV2Submissions, projectIdeas, openSourceProjects, mockVoiceSession, userProjectV2Progress } from '@repo/db'
import { eq, sql, count } from 'drizzle-orm'

/**
 * Get comprehensive platform statistics for the landing page
 * Returns real data from the database
 */
export async function getPlatformStats() {
    try {
        const [
            [totalUsersRow],
            [totalProjectsRow],
            [totalTasksRow],
            [completedTasksRow],
            [totalProjectIdeasRow],
            [problemStatementsRow],
            [technologyIdeasRow],
            [publicProjectsRow],
            [totalOpenSourceProjectsRow],
            [totalMockSessionsRow],
        ] = await Promise.all([
            // Total registered users
            db.select({ value: count() }).from(users),
            // Total projects created
            db.select({ value: count() }).from(projectsV2),
            // Total tasks across all projects
            db.select({ value: count() }).from(projectV2Tasks),
            // Completed task submissions
            db.select({ value: count() }).from(projectV2Submissions).where(eq(projectV2Submissions.status, 'APPROVED')),
            // Total project ideas
            db.select({ value: count() }).from(projectIdeas),
            // Problem statements
            db.select({ value: count() }).from(projectIdeas).where(eq(projectIdeas.ideaType, 'PROBLEM_STATEMENT')),
            // Technology-specific ideas
            db.select({ value: count() }).from(projectIdeas).where(eq(projectIdeas.ideaType, 'TECHNOLOGY_SPECIFIC')),
            // Public projects
            db.select({ value: count() }).from(projectsV2).where(eq(projectsV2.visibility, 'PUBLIC')),
            // Open source projects
            db.select({ value: count() }).from(openSourceProjects).catch(() => [{ value: 0 }]),
            // Mock interview sessions
            db.select({ value: count() }).from(mockVoiceSession).catch(() => [{ value: 0 }]),
        ])

        const totalUsers = Number(totalUsersRow?.value ?? 0)
        const totalProjects = Number(totalProjectsRow?.value ?? 0)
        const totalTasks = Number(totalTasksRow?.value ?? 0)
        const completedTasks = Number(completedTasksRow?.value ?? 0)
        const totalProjectIdeas = Number(totalProjectIdeasRow?.value ?? 0)
        const problemStatements = Number(problemStatementsRow?.value ?? 0)
        const technologyIdeas = Number(technologyIdeasRow?.value ?? 0)
        const publicProjects = Number(publicProjectsRow?.value ?? 0)
        const totalOpenSourceProjectsCount = Number(totalOpenSourceProjectsRow?.value ?? 0)
        const totalMockSessions = Number(totalMockSessionsRow?.value ?? 0)

        // Calculate success rate (completed vs total task submissions)
        const [totalSubmissionsRow] = await db.select({ value: count() }).from(projectV2Submissions)
        const totalSubmissions = Number(totalSubmissionsRow?.value ?? 0)
        const successRate = totalSubmissions > 0
            ? Math.round((completedTasks / totalSubmissions) * 100)
            : 0 // No submissions yet: say so; never an invented rate

        return {
            success: true,
            data: {
                // User stats
                totalUsers,
                activeBuilders: totalUsers, // All users are potential builders

                // Project stats
                totalProjects,
                publicProjects,

                // Task stats
                totalTasks,
                completedTasks,
                successRate,

                // Idea stats
                totalProjectIdeas,
                problemStatements,
                technologyIdeas,

                // Other stats
                totalOpenSourceProjects: totalOpenSourceProjectsCount,
                totalMockSessions,
            }
        }
    } catch (error) {
        console.error('Error fetching platform stats:', error)
        return {
            success: false,
            error: 'Failed to fetch platform statistics',
            data: null
        }
    }
}

/**
 * Get project statistics grouped by technology
 */
export async function getProjectStatsByTechnology() {
    try {
        // Get project ideas grouped by technology
        const byTechnologyRows = await db
            .select({
                technology: projectIdeas.technology,
                count: count(),
            })
            .from(projectIdeas)
            .groupBy(projectIdeas.technology)
            .orderBy(sql`count(*) desc`)
            .limit(10)

        // Get actual projects created, grouped by generationType
        const byTypeRows = await db
            .select({
                type: projectsV2.generationType,
                count: count(),
            })
            .from(projectsV2)
            .groupBy(projectsV2.generationType)

        return {
            success: true,
            data: {
                byTechnology: byTechnologyRows.map(item => ({
                    technology: item.technology || 'Unknown',
                    count: Number(item.count),
                })),
                byType: byTypeRows.map(item => ({
                    type: item.type,
                    count: Number(item.count),
                })),
            }
        }
    } catch (error) {
        console.error('Error fetching project stats by technology:', error)
        return {
            success: false,
            error: 'Failed to fetch project statistics',
            data: null
        }
    }
}

/**
 * Get statistics specific to the projects page
 */
export async function getProjectsPageStats() {
    try {
        const [
            [totalProjectsRow],
            [totalProjectIdeasRow],
            [problemStatementsRow],
            [technologyIdeasRow],
            [frontendProjectsRow],
            [fullStackProjectsRow],
            [backendProjectsRow],
            [aiAgentProjectsRow],
            [totalTasksRow],
            [completedTaskSubmissionsRow],
            activeUsersRows,
        ] = await Promise.all([
            db.select({ value: count() }).from(projectsV2),
            db.select({ value: count() }).from(projectIdeas).where(eq(projectIdeas.status, 'APPROVED')),
            db.select({ value: count() }).from(projectIdeas).where(
                sql`${projectIdeas.ideaType} = 'PROBLEM_STATEMENT' AND ${projectIdeas.status} = 'APPROVED'`
            ),
            db.select({ value: count() }).from(projectIdeas).where(
                sql`${projectIdeas.ideaType} = 'TECHNOLOGY_SPECIFIC' AND ${projectIdeas.status} = 'APPROVED'`
            ),
            db.select({ value: count() }).from(projectsV2).where(eq(projectsV2.generationType, 'FRONTEND')),
            db.select({ value: count() }).from(projectsV2).where(eq(projectsV2.generationType, 'FULL_STACK')),
            db.select({ value: count() }).from(projectsV2).where(eq(projectsV2.generationType, 'BACKEND')),
            db.select({ value: count() }).from(projectsV2).where(eq(projectsV2.generationType, 'AI_AGENT')),
            db.select({ value: count() }).from(projectV2Tasks),
            db.select({ value: count() }).from(projectV2Submissions).where(eq(projectV2Submissions.status, 'APPROVED')),
            // Active users - distinct userId count from userProjectV2Progress
            db.selectDistinct({ userId: userProjectV2Progress.userId }).from(userProjectV2Progress).catch(() => []),
        ])

        const totalProjects = Number(totalProjectsRow?.value ?? 0)
        const totalProjectIdeas = Number(totalProjectIdeasRow?.value ?? 0)
        const problemStatements = Number(problemStatementsRow?.value ?? 0)
        const technologyIdeas = Number(technologyIdeasRow?.value ?? 0)
        const frontendProjects = Number(frontendProjectsRow?.value ?? 0)
        const fullStackProjects = Number(fullStackProjectsRow?.value ?? 0)
        const backendProjects = Number(backendProjectsRow?.value ?? 0)
        const aiAgentProjects = Number(aiAgentProjectsRow?.value ?? 0)
        const totalTasks = Number(totalTasksRow?.value ?? 0)
        const completedTaskSubmissions = Number(completedTaskSubmissionsRow?.value ?? 0)
        const activeUsers = Array.isArray(activeUsersRows) ? activeUsersRows.length : 0

        // Calculate success rate
        const [totalSubmissionsRow] = await db.select({ value: count() }).from(projectV2Submissions)
        const totalSubmissions = Number(totalSubmissionsRow?.value ?? 0)
        const successRate = totalSubmissions > 0
            ? Math.round((completedTaskSubmissions / totalSubmissions) * 100)
            : 0

        return {
            success: true,
            data: {
                totalProjects,
                totalProjectIdeas,
                problemStatements,
                technologyIdeas,
                byType: {
                    frontend: frontendProjects,
                    fullStack: fullStackProjects,
                    backend: backendProjects,
                    aiAgent: aiAgentProjects,
                },
                totalTasks,
                completedTasks: completedTaskSubmissions,
                successRate,
                activeBuilders: activeUsers
            }
        }
    } catch (error) {
        console.error('Error fetching projects page stats:', error)
        return {
            success: false,
            error: 'Failed to fetch statistics',
            data: null
        }
    }
}

