import { Suspense } from "react"
import Loading from "./loading"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getCandidateStats } from "@/actions/candidates"
import { getInterviewProcesses } from "@/actions/interview-config"
import HomeContent from "./home-content"

export const dynamic = "force-dynamic"

export default async function HomePage() {
    const session = await getSession(headers())

    // Fetch real stats
    const [candidateStatsResult, interviewProcessesResult] = await Promise.all([
        getCandidateStats(),
        getInterviewProcesses()
    ])

    const candidateStats = candidateStatsResult.success ? candidateStatsResult.data ?? null : null
    const interviewProcesses = interviewProcessesResult.success ? interviewProcessesResult.data : []

    return (
        <Suspense fallback={<Loading />}>
            <HomeContent
                userName={session?.user?.name?.split(" ")[0] || "there"}
                candidateStats={candidateStats}
                interviewProcessCount={interviewProcesses?.length || 0}
            />
        </Suspense>
    )
}
