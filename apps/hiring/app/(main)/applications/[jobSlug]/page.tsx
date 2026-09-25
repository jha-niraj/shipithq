import { Suspense } from "react"
import Loading from "./loading"
import { notFound } from "next/navigation"
import { 
    getApplications, getJobBySlug 
} from "@/actions/applications"
import { JobApplicationsContent } from "./job-applications-content"
import type { ApplicationStatus } from "@/types"

interface JobApplicationsPageProps {
    params: Promise<{
        jobSlug: string
    }>
    searchParams: Promise<{
        page?: string
        status?: string
        search?: string
    }>
}

export default async function JobApplicationsPage({ params, searchParams }: JobApplicationsPageProps) {
    const { jobSlug } = await params
    const { page = "1", status, search } = await searchParams

    // Get job info
    const jobResult = await getJobBySlug(jobSlug)

    if (!jobResult.success || !jobResult.data) {
        notFound()
    }

    // Get applications for this job
    const applicationsResult = await getApplications(
        jobSlug,
        parseInt(page, 10),
        25, // 25 items per page
        {
            status: status ? (status.split(",") as ApplicationStatus[]) : undefined,
            search: search || undefined
        }
    )

    return (
        <Suspense fallback={<Loading />}>
            <JobApplicationsContent
                job={jobResult.data}
                initialApplications={applicationsResult.success ? applicationsResult.data! : {
                    applications: [],
                    total: 0,
                    page: 1,
                    pageSize: 25,
                    totalPages: 0
                }}
                initialFilters={{
                    status: status ? status.split(",") as ApplicationStatus[] : undefined,
                    search: search || undefined
                }}
            />
        </Suspense>
    )
}