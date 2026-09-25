import { Suspense } from "react"
import Loading from "./loading"
import { 
    getCandidates, getCandidateStats, getCompanyJobsForFilter 
} from "@/actions/candidates"
import { CandidatesContent } from "./candidates-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Candidates | ShipItHQ Hiring",
    description: "View and manage candidate applications"
}

export default async function CandidatesPage() {
    const [candidatesResult, statsResult, jobsResult] = await Promise.all([
        getCandidates(),
        getCandidateStats(),
        getCompanyJobsForFilter()
    ])

    const candidates = candidatesResult.success && candidatesResult.data ? candidatesResult.data : []
    const stats = statsResult.success && statsResult.data ? statsResult.data : null
    const jobs = jobsResult.success && jobsResult.data ? jobsResult.data : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <CandidatesContent 
                initialCandidates={candidates}
                stats={stats}
                jobs={jobs}
            />
        </Suspense>
    )
}