import { getProjectTasks } from '@/actions/(main)/projects/project.action'
import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import TasksPageClient from './_components/tasks-page-client'
import { ProjectDetailsError } from '../_components/project-details-error'

export default async function TasksPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const session = await getSession(headers())
    const { slug } = await params

    // `/signin`, which is the route that exists. This said `/auth/login` and the
    // sprints page said `/auth/signin`; neither is a page, so a signed-out
    // visitor was redirected to a 404 (plan/projects, PJ-12).
    //
    // Access itself is gated by `getProjectTasks`, which requires a progress row
    // and so answers "Project not started" to anybody who is neither the creator
    // nor enrolled.
    if (!session?.user?.id) {
        redirect(`/signin?callbackUrl=/projects/${slug}/tasks`)
    }

    const tasksResult = await getProjectTasks(slug)

    if (!tasksResult.success || !tasksResult.data) {
        return <ProjectDetailsError />
    }

    return (
        <TasksPageClient
            project={{
                title: tasksResult.data.projectTitle,
                slug: slug
            }}
            tasks={tasksResult.data.columns}
            userProgress={tasksResult.data.progress}
        />
    )
}