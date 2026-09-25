import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Loader2 } from "lucide-react"
import { 
    getCompanyBySlug, getCompanyInterviewProcesses 
} from "@/actions/companies"
import { getCompanyJobs } from "@/actions/jobs"
import { CompanyDetailContent } from "./company-detail-content"
import Loading from "./loading"

interface CompanyDetailPageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CompanyDetailPageProps) {
    const { slug } = await params
    const result = await getCompanyBySlug(slug)
    
    if (!result.success || !result.data) {
        return { title: "Company Not Found" }
    }

    return {
        title: `${result.data.name} | ShipItHQ`,
        description: result.data.description?.slice(0, 160) || `Learn about ${result.data.name} and their interview process`
    }
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
    const { slug } = await params
    
    const [companyResult, processesResult, jobsResult] = await Promise.all([
        getCompanyBySlug(slug),
        getCompanyInterviewProcesses(slug),
        getCompanyJobs(slug)
    ])

    if (!companyResult.success || !companyResult.data) {
        notFound()
    }

    const company = companyResult.data
    const interviewProcesses = processesResult.success ? processesResult.data || [] : []
    const jobs = jobsResult.success ? jobsResult.data || [] : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <CompanyDetailContent 
                company={company}
                interviewProcesses={interviewProcesses}
                jobs={jobs}
            />
        </Suspense>
    )
}