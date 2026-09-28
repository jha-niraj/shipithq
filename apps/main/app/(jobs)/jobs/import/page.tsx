import { redirect } from "next/navigation"
import { getImport, getImportAllowance, listMyImports } from "@/actions/(main)/jobs/import.action"
import { ImportWizard } from "@/components/job-import/import-progress"
import { MyImports } from "@/components/job-import/my-imports"

export const dynamic = "force-dynamic"
export const metadata = { title: "Practise any job | ShipItHQ" }

/**
 * Paste a job from anywhere and practise its interview (plan/job-import JI-19): one
 * wizard, with the import as `?id=` once it's started. A built job's rounds live at
 * /jobs/import/[id].
 */
export default async function ImportJobPage({ searchParams }: { searchParams: Promise<{ company?: string; id?: string }> }) {
    const { company, id } = await searchParams
    const [allowance, imp] = await Promise.all([getImportAllowance(), id ? getImport(id) : null])
    if (imp?.success && imp.data.status === "READY") redirect(`/jobs/import/${imp.data.id}`)
    const view = imp?.success ? imp.data : null
    const mine = !view && allowance.signedIn ? await listMyImports() : []
    return (
        <>
            {id && !view && (
                <p className="page-frame px-page pt-6 text-sm text-neutral-600 dark:text-neutral-400">
                    {imp && !imp.success && imp.code === "UNAUTHORIZED" ? "Sign in to see that import." : "That import doesn't exist, or it's someone else's private one. Start a new one below."}
                </p>
            )}
            <ImportWizard
                key={view?.id ?? "new"}
                initial={view}
                allowance={allowance}
                company={company?.slice(0, 120)}
                rail={allowance.signedIn ? <MyImports items={mine} /> : undefined}
            />
        </>
    )
}
