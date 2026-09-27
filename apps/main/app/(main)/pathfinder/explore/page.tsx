import { getPublicPathfinderGoals } from '@/actions/(main)/pathfinder'
import { PathfinderShell } from '../_components/pathfinder-shell'
import { ExploreGrid } from './_components/explore-grid'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
    const { goals } = await getPublicPathfinderGoals()
    return (
        <PathfinderShell tab="explore">
            <ExploreGrid goals={goals} />
        </PathfinderShell>
    )
}
