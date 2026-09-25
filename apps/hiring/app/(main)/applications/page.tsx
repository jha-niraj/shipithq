import { Suspense } from "react"
import Loading from "./loading"
import { 
    getApplicationStats, getJobApplicationStats 
} from "@/actions/applications"
import { ApplicationsContent } from "./applications-content"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
    const [statsResult, jobStatsResult] = await Promise.all([
        getApplicationStats(),
        getJobApplicationStats()
    ])

    const stats = statsResult.success ? statsResult.data : null
    const jobStats = jobStatsResult.success ? jobStatsResult.data : []

    return (
        <Suspense fallback={<Loading />}>
            <ApplicationsContent 
                stats={stats ?? null}
                jobStats={jobStats ?? []}
            />
        </Suspense>
    )
}
