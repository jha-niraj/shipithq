import { Suspense } from "react"
import Loading from "./loading"
import { 
    getJobs, getOverallJobStats 
} from "@/actions/jobs"
import { getInterviewProcesses } from "@/actions/interview-config"
import { JobsContent } from "./jobs-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Jobs | ShipItHQ Hiring",
    description: "Manage your job listings"
}

export default async function JobsPage() {
    const [jobsResult, statsResult, processesResult] = await Promise.all([
        getJobs(),
        getOverallJobStats(),
        getInterviewProcesses()
    ])

    const jobs = jobsResult.success && jobsResult.data ? jobsResult.data : []
    const stats = statsResult.success && statsResult.data ? statsResult.data : null
    const interviewProcesses = processesResult.success && processesResult.data ? processesResult.data : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <JobsContent 
                initialJobs={jobs}
                stats={stats}
                interviewProcesses={interviewProcesses}
            />
        </Suspense>
    )
}