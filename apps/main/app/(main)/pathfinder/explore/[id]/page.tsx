import { getPublicPathfinderGoalBySlugOnly } from '@/actions/(main)/pathfinder'
import { GoalPreviewContent } from '../_components/goal-preview-content'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function ExploreGoalPage({ params }: PageProps) {
    const { slug } = await params
    const { success, goal } = await getPublicPathfinderGoalBySlugOnly(slug)

    if (!success || !goal) {
        notFound()
    }

    return <GoalPreviewContent goal={goal} />
}