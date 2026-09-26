import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getJobBySlug } from "@/actions/jobs"
import { getDefaultPoolSizes, getPipeline } from "@/actions/interview-config/pipeline-builder.action"
import { PipelineBuilder } from "../../../interview-config/[id]/_components/pipeline-builder"

export const dynamic = "force-dynamic"

export const metadata = { title: "Job rounds | Hiring" }

/** One job's own pipeline, in the same builder as the templates (plan/hiring-rounds HR-12). */
export default async function JobPipelinePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const job = await getJobBySlug(slug)
    const back = (
        <Link href={job.success && job.data ? `/jobs/${slug}/edit` : "/jobs"} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
            <ArrowLeft className="h-4 w-4" /> {job.success && job.data ? job.data.title : "Jobs"}
        </Link>
    )
    if (!job.success || !job.data) {
        return <div className="page-frame space-y-4 px-page py-6">{back}<p className="text-neutral-700 dark:text-neutral-300">That job doesn&apos;t exist.</p></div>
    }
    if (!job.data.interviewProcessId) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                {back}
                <p className="text-neutral-700 dark:text-neutral-300">This job has no pipeline yet. Pick one on the job&apos;s page first.</p>
            </div>
        )
    }
    const [pipeline, pools] = await Promise.all([getPipeline(job.data.interviewProcessId), getDefaultPoolSizes()])
    if (!pipeline.success) return <div className="page-frame space-y-4 px-page py-6">{back}<p className="text-neutral-700 dark:text-neutral-300">{pipeline.error}</p></div>
    return <PipelineBuilder pipeline={pipeline.data} defaultPoolSizes={pools.success ? pools.data : {}} />
}
