import { Suspense } from "react"
import Loading from "./loading"
import { 
    getInterviewProcesses, getInterviewProcessStats 
} from "@/actions/interview-config"
import { InterviewConfigContent } from "./interview-config-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Interview Process Configuration | ShipItHQ Hiring",
    description: "Configure your interview process for transparency and enable AI mock interviews"
}

export default async function InterviewConfigPage() {
    const [processesResult, statsResult] = await Promise.all([
        getInterviewProcesses(),
        getInterviewProcessStats()
    ])

    const processes = processesResult.success ? processesResult.data : []
    const stats = statsResult.success ? statsResult.data : { processCount: 0, totalRounds: 0, jobsWithProcess: 0 }

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <InterviewConfigContent 
                initialProcesses={processes ?? []}
                initialStats={stats ?? { processCount: 0, totalRounds: 0, jobsWithProcess: 0 }}
            />
        </Suspense>
    )
}