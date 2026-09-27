import { getPathfinderGoal, getGoalSessions, refreshVerificationMock, refreshVerificationProject } from '@/actions/(main)/pathfinder'
import { notFound } from 'next/navigation'
import type { PathfinderVerification } from '@repo/db'
import { GoalWorkspace, type WorkspaceTab } from './_components/goal-workspace'
import type { DailySession } from './_components/topic-row'

export const dynamic = 'force-dynamic'

const TABS: WorkspaceTab[] = ['today', 'plan', 'notes', 'verify']

export default async function GoalPage({ params, searchParams }: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ tab?: string; topic?: string }>
}) {
    const [{ slug }, { tab, topic }] = await Promise.all([params, searchParams])
    // Verify reads the mock's and the project's live state: a scored interview or a
    // completed project completes its section here.
    if (tab === 'verify') {
        await refreshVerificationMock(slug)
        await refreshVerificationProject(slug)
    }
    const { goal } = await getPathfinderGoal(slug)
    if (!goal) notFound()
    const { sessions = [] } = await getGoalSessions(goal.id)

    return (
        <GoalWorkspace
            goal={{
                id: goal.id, slug: goal.slug, title: goal.title, category: goal.category, level: goal.level,
                isPublic: goal.isPublic, totalSubGoals: goal.totalSubGoals, completedSubGoals: goal.completedSubGoals,
            }}
            tab={TABS.includes(tab as WorkspaceTab) ? (tab as WorkspaceTab) : 'today'}
            sessions={sessions as unknown as DailySession[]}
            verification={(goal.verification ?? null) as PathfinderVerification | null}
            initialTopic={topic ?? null}
        />
    )
}
