import { listPipelines } from "@/actions/interview-config/pipeline-builder.action"
import { PipelinesList } from "./_components/pipelines-list"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Interview pipelines | ShipItHQ Hiring",
    description: "The rounds candidates take for each role, with pass marks and gates.",
}

/** The company's pipelines (plan/hiring-rounds HR-10). The builder is /interview-config/[id]. */
export default async function InterviewConfigPage() {
    const result = await listPipelines()
    return (
        <PipelinesList
            pipelines={result.success ? result.data.pipelines : []}
            templates={result.success ? result.data.templates : []}
            canManage={result.success ? result.data.canManage : false}
            aiDraftsLeft={result.success ? result.data.aiDraftsLeft : 0}
            loadError={result.success ? null : result.error}
        />
    )
}
