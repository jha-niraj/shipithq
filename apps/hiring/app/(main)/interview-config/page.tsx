import { listPipelines } from "@/actions/interview-config/pipeline-builder.action"
import { getImportedJobs } from "@/actions/imported"
import { ImportedJobs } from "./_components/imported-jobs"
import { PipelinesList } from "./_components/pipelines-list"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Interview pipelines | ShipItHQ Hiring",
    description: "The rounds candidates take for each role, with pass marks and gates.",
}

/** The company's pipelines (plan/hiring-rounds HR-10). The builder is /interview-config/[id]. */
export default async function InterviewConfigPage() {
    const [result, imported] = await Promise.all([listPipelines(), getImportedJobs()])
    return (
        <>
            <PipelinesList
                pipelines={result.success ? result.data.pipelines : []}
                templates={result.success ? result.data.templates : []}
                canManage={result.success ? result.data.canManage : false}
                aiDraftsLeft={result.success ? result.data.aiDraftsLeft : 0}
                loadError={result.success ? null : result.error}
            />
            {/* Jobs students imported for this company (plan/job-import JI-9). */}
            {imported.success && (imported.data.count > 0) && (
                <div className="page-frame px-page pb-8">
                    <ImportedJobs view={imported.data} canManage={imported.data.canManage} pipelines={result.success ? result.data.pipelines.map((p) => ({ id: p.id, name: p.name })) : []} />
                </div>
            )}
        </>
    )
}
