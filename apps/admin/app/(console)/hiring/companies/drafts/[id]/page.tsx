import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCompanyDraft } from "@/actions/hiring/company-drafts.action"
import { DraftReview } from "./_components/draft-review"

/** Review one scraped company draft (plan/hiring-rounds HR-6). */
export default async function CompanyDraftPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getCompanyDraft(id)
    if (!result.success) {
        return (
            <div className="p-6 lg:p-8">
                <Link href="/hiring/companies/drafts" className="mb-6 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                    <ArrowLeft className="h-4 w-4" /> Back to drafts
                </Link>
                <p className="text-neutral-700 dark:text-neutral-300">{result.error}</p>
            </div>
        )
    }
    return <DraftReview draft={result.data} />
}
