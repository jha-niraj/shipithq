import { PageHeader } from "@repo/ui/components/ui/page-header"
import { listDocsTree } from "@/actions/documents"
import { DocsExplorer } from "./_components/docs-explorer"

export const dynamic = "force-dynamic"
export const metadata = { title: "Documents | ShipItHQ Hiring" }

/** The company's documents for its AI (plan/hiring-app HA-13). */
export default async function DocumentsPage() {
    const r = await listDocsTree()
    return (
        <div className="page-frame flex h-[var(--page-h)] flex-col gap-4 overflow-hidden px-page py-5">
            <PageHeader title="Documents" subtitle="JDs, hiring policies and notes your company's AI reads. Private to your team; never shown to candidates." />
            {r.success
                ? <DocsExplorer initialTree={r.data} />
                : <p className="text-sm text-neutral-700 dark:text-neutral-300">{r.error}</p>}
        </div>
    )
}
