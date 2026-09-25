import { Suspense } from "react"
import { notFound } from "next/navigation"
import { 
    Loader2 
} from "lucide-react"
import { getJobBySlug } from "@/actions/jobs"
import { JobDetailContent } from "./job-detail-content"
import Loading from "./loading"

interface JobDetailPageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: JobDetailPageProps) {
    const { slug } = await params
    const result = await getJobBySlug(slug)
    
    if (!result.success || !result.data) {
        return { title: "Job Not Found" }
    }

    return {
        title: `${result.data.title} at ${result.data.company.name} | ShipItHQ`,
        description: result.data.description?.slice(0, 160)
    }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
    const { slug } = await params
    const result = await getJobBySlug(slug)

    if (!result.success || !result.data) {
        notFound()
    }

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <JobDetailContent job={result.data} />
        </Suspense>
    )
}