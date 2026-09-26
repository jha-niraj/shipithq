import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getDefaultPoolSizes, getPipeline } from "@/actions/interview-config/pipeline-builder.action"
import { PipelineBuilder } from "./_components/pipeline-builder"

export const dynamic = "force-dynamic"

/** The pipeline builder (plan/hiring-rounds HR-10). */
export default async function PipelineBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [pipeline, pools] = await Promise.all([getPipeline(id), getDefaultPoolSizes()])
    if (!pipeline.success) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                <Link href="/interview-config" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                    <ArrowLeft className="h-4 w-4" /> Pipelines
                </Link>
                <p className="text-neutral-700 dark:text-neutral-300">{pipeline.error}</p>
            </div>
        )
    }
    return <PipelineBuilder pipeline={pipeline.data} defaultPoolSizes={pools.success ? pools.data : {}} />
}
