import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getSparkJobs } from "@/actions/jobs/tabs"
import { SparkContent } from "./spark/spark-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Spark - Discover Jobs | ShipItHQ",
    description: "Swipe through jobs and find your perfect match with AI-powered recommendations"
}

// Default /jobs page shows Spark (swipe) interface
export default async function JobsPage() {
    const [session, jobsResult] = await Promise.all([
        getSession(headers()),
        getSparkJobs(1, 20)
    ])

    const isAuthenticated = !!session?.user?.id
    const jobs = jobsResult.success && jobsResult.data ? jobsResult.data.jobs : []
    const pagination = jobsResult.success && jobsResult.data ? jobsResult.data.pagination : null

    return (
        <Suspense fallback={<Loading />}>
            <SparkContent 
                initialJobs={jobs}
                pagination={pagination}
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    )
}