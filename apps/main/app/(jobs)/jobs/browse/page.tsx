import { Suspense } from "react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getForYouFeedJobs } from "@/actions/jobs"
import { BrowseContent } from "./browse-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Browse All Jobs | ShipItHQ",
    description: "Browse all available job opportunities"
}

export default async function BrowsePage() {
    const [session, jobsResult] = await Promise.all([
        getSession(headers()),
        getForYouFeedJobs(1, 20)
    ])

    const isAuthenticated = !!session?.user?.id

    return (
        <Suspense fallback={<Loading />}>
            <BrowseContent 
                initialData={jobsResult}
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    )
}
