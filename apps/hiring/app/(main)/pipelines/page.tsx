import { listPipelines } from "@/actions/pipelines/pipeline-builder.action"
import { getImportedJobs } from "@/actions/imported"
import { ImportedJobs } from "./_components/imported-jobs"
import { PipelinesList } from "./_components/pipelines-list"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Pipelines | ShipItHQ Hiring",
    description: "The rounds candidates take for each role, with pass marks and gates.",
}

/** The company's pipelines (plan/hiring-rounds HR-10). The builder is /pipelines/[id]. */
export default async function PipelinesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const [{ tab }, result, imported] = await Promise.all([searchParams, listPipelines(), getImportedJobs()])
    const importedCount = imported.success ? imported.data.count : 0
    const current = tab === "templates" ? "templates" : tab === "imported" && importedCount > 0 ? "imported" : "yours"
    return (
        <PipelinesList
            tab={current}
            pipelines={result.success ? result.data.pipelines : []}
            templates={result.success ? result.data.templates : []}
            canManage={result.success ? result.data.canManage : false}
            aiDraftsLeft={result.success ? result.data.aiDraftsLeft : 0}
            loadError={result.success ? null : result.error}
            importedCount={importedCount}
            imported={imported.success && importedCount > 0 ? (
                // Jobs students imported for this company (plan/job-import JI-9), as a tab (HU-7).
                <ImportedJobs view={imported.data} canManage={imported.data.canManage} pipelines={result.success ? result.data.pipelines.map((p) => ({ id: p.id, name: p.name })) : []} />
            ) : null}
        />
    )
}
