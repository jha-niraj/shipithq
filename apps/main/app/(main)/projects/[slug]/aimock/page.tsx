import { getSession } from '@repo/auth'
import { MOCK_UNLOCK_PERCENT, mockUnlocked } from '@/lib/projects/gates'
import { headers } from 'next/headers'
import { redirect } from "next/navigation"
import {
    db,
    users,
    projectsV2,
    projectV2KnowledgeBases,
    projectV2MockSessions,
    userProjectV2Progress,
} from "@repo/db"
import { eq, and, desc } from "drizzle-orm"
import AIMockInterviewClient from "./_components/aimock-client"
import { ProgressGate } from "../_components/progress-gate"

export default async function AIMockPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getSession(headers())
    const { slug } = await params

    if (!session?.user?.id) {
        redirect(`/signin?callbackUrl=/projects/${slug}/aimock`)
    }

    // Get project
    const projectRows = await db
        .select({
            id: projectsV2.id,
            slug: projectsV2.slug,
            title: projectsV2.title,
            description: projectsV2.description,
            difficulty: projectsV2.difficulty,
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

    // Get knowledge base
    const knowledgeRows = await db
        .select({ mockKnowledgeBase: projectV2KnowledgeBases.mockKnowledgeBase })
        .from(projectV2KnowledgeBases)
        .where(eq(projectV2KnowledgeBases.projectId, project.id))
        .limit(1)

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

    if (!userProgress || !mockUnlocked(currentProgress)) {
        return (
            <ProgressGate
                type="mock"
                currentProgress={currentProgress}
                requiredProgress={MOCK_UNLOCK_PERCENT}
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

    // Get previous mock attempts
    const previousAttempts = await db
        .select({
            id: projectV2MockSessions.id,
            score: projectV2MockSessions.score,
            duration: projectV2MockSessions.duration,
            completedAt: projectV2MockSessions.completedAt,
        })
        .from(projectV2MockSessions)
        .where(and(
            eq(projectV2MockSessions.userId, session.user.id),
            eq(projectV2MockSessions.projectId, project.id),
            eq(projectV2MockSessions.status, "COMPLETED")
        ))
        .orderBy(desc(projectV2MockSessions.createdAt))
        .limit(5)

    const knowledgeBase = knowledgeRows[0]?.mockKnowledgeBase || null

    return (
        <AIMockInterviewClient
            project={{
                id: project.id,
                slug: project.slug,
                title: project.title,
                description: project.description,
                difficulty: project.difficulty || 'INTERMEDIATE',
            }}
            userCredits={userRows[0]?.credits || 0}
            hasKnowledgeBase={!!knowledgeBase}
            knowledgeBase={knowledgeBase}
            previousAttempts={previousAttempts}
        />
    )
}
