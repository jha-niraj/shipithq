import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getSavedFeedJobs } from "@/actions/jobs"
import { SavedJobsContent } from "./saved-jobs-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Saved Jobs | ShipItHQ",
    description: "Your saved job opportunities"
}

export default async function SavedJobsPage() {
    const [session, result] = await Promise.all([
        getSession(headers()),
        getSavedFeedJobs(1, 20)
    ])

    const isAuthenticated = !!session?.user?.id

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <SavedJobsContent 
                initialData={result}
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    )
}