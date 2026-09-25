import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { getSession } from "@repo/auth"
import { headers } from 'next/headers'
import { getMyApplications } from "@/actions/jobs"
import { ApplicationsContent } from "./applications-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "My Applications | ShipItHQ",
    description: "Track your job applications and preparation progress"
}

export default async function ApplicationsPage() {
    const [session, result] = await Promise.all([
        getSession(headers()),
        getMyApplications()
    ])

    const isAuthenticated = !!session?.user?.id
    const applications = result.success && result.data ? result.data.applications : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <ApplicationsContent 
                applications={applications} 
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    )
}