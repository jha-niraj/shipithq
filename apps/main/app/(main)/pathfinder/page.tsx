import { PathfinderDashboard } from './_components/pathfinder-dashboard'
import { getUserPathfinderGoals } from '@/actions/(main)/pathfinder'
import { getModuleActivity } from '@/actions/(common)/stats/module-activity.action'
import type { PathfinderGoal, PathfinderGroup } from '@/app/store/pathfinderStore'

export const dynamic = 'force-dynamic'

export default async function PathfinderPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    // `pathfinder_daily_session` records a day the user actually sat down and worked
    // a goal: the one signal that says "did I show up".
    const [{ goals = [], groups = [] }, activity] = await Promise.all([
        getUserPathfinderGoals(),
        getModuleActivity('pathfinder', 30),
    ])
    return (
        <PathfinderDashboard
            tab={tab === 'overview' ? 'overview' : 'goals'}
            initialGoals={goals as PathfinderGoal[]}
            initialGroups={groups as PathfinderGroup[]}
            activity={activity}
        />
    )
}
