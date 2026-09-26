import { Suspense } from "react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getFollowingFeedJobs } from "@/actions/jobs"
import { FollowingContent } from "./following-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Following - Jobs | ShipItHQ",
    description: "Jobs from companies you follow"
}

export default async function FollowingPage() {
    const [session, jobsResult] = await Promise.all([
        getSession(headers()),
        getFollowingFeedJobs(1, 20)
    ])

    const isAuthenticated = !!session?.user?.id
    
    return (
        <Suspense fallback={<Loading />}>
            <FollowingContent 
                initialData={jobsResult}
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    )
}
