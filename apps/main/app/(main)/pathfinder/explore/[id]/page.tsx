import { getPublicPathfinderGoal } from '@/actions/(main)/pathfinder'
import { GoalPreviewContent } from '../_components/goal-preview-content'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ExploreGoalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { goal } = await getPublicPathfinderGoal(id)
    if (!goal) notFound()
    return <GoalPreviewContent goal={goal} />
}
