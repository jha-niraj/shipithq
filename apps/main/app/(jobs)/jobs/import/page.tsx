import { PageHeader } from "@repo/ui/components/ui/page-header"
import { getImportAllowance } from "@/actions/(main)/jobs/import.action"
import { ImportForm } from "@/components/job-import/import-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Practise any job | ShipItHQ" }

/** Paste a job from anywhere and practise its interview, round by round (plan/job-import JI-7). */
export default async function ImportJobPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
    const [{ company }, allowance] = await Promise.all([searchParams, getImportAllowance()])
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader
                title="Practise any job"
                subtitle="Paste a job from LinkedIn, a careers page or anywhere else. We read it, design its interview as rounds with pass marks, and you practise them in order."
            />
            <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <ImportForm allowance={allowance} company={company?.slice(0, 120)} />
            </div>
        </div>
    )
}
