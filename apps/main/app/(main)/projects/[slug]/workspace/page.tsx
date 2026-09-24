import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@repo/auth'
import { db, users } from '@repo/db'
import { eq } from 'drizzle-orm'
import { getProjectBySlug } from '@/actions/(main)/projects/project.action'
import { listFiles } from '@/actions/(main)/projects/workspace.action'
import { WorkspaceClient, type WorkspaceSprint } from './_components/workspace-client'
import { loadWorkspacePlan } from '@/lib/projects/workspace-plan'
import { WORKSPACE_EDITOR } from '@/lib/projects/flags'

/*
 * The project workspace (plan/project-workspace, WS-3).
 *
 * Owner only: your own project, or your copy of a public one (PJ-18). Anyone
 * else is sent to their copy if they have one, and otherwise to the project
 * page, where enrolling makes them one.
 */
export default async function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const session = await getSession(headers())
    if (!session?.user?.id) redirect(`/projects/${slug}`)

    const result = await getProjectBySlug(slug)
    if (!result.success || !result.data) redirect('/projects')
    const project = result.data

    if (project.createdBy !== session.user.id) {
        redirect(project.myCopySlug ? `/projects/${project.myCopySlug}/workspace` : `/projects/${slug}`)
    }

    const [files, [me]] = await Promise.all([
        // No editor in V1 (plan/project-repos RP-2), so no files to load.
        WORKSPACE_EDITOR ? listFiles(project.id) : Promise.resolve(null),
        db.select({ credits: users.credits }).from(users).where(eq(users.id, session.user.id)).limit(1),
    ])
    // The page and the Project AI's Add read the plan through one function, so
    // a task list after an Add is exactly what a reload shows.
    const sprints: WorkspaceSprint[] = await loadWorkspacePlan(project.id, session.user.id)

    return (
        <WorkspaceClient
            project={{ id: project.id, slug: project.slug, title: project.title, forkedFrom: project.forkedFrom ?? null, runtime: project.runtime === 'server' ? 'server' : 'browser' }}
            sprints={sprints}
            initialFiles={files?.success ? files.data : []}
            currentUserId={session.user.id}
            userCredits={me?.credits ?? 0}
        />
    )
}
