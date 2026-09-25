import { Suspense } from "react"
import Loading from "./loading"
import { 
    getAnalyticsOverview, getRecruiterPerformance 
} from "@/actions/analytics"
import { AnalyticsContent } from "./analytics-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Analytics | ShipItHQ Hiring",
    description: "Track your hiring pipeline performance"
}

export default async function AnalyticsPage() {
    const [analyticsResult, performanceResult] = await Promise.all([
        getAnalyticsOverview(),
        getRecruiterPerformance()
    ])

    const analytics = analyticsResult.success && analyticsResult.data ? analyticsResult.data : null
    const performance = performanceResult.success && performanceResult.data ? performanceResult.data : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <AnalyticsContent 
                analytics={analytics}
                recruiterPerformance={performance}
            />
        </Suspense>
    )
}