import { redirect } from 'next/navigation'

// Verify is a tab of the goal's workspace now (plan/pathfinder PF-9). Old links land on it.
export default async function VerificationPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    redirect(`/pathfinder/${slug}?tab=verify`)
}
