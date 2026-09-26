import { listCompanyDrafts } from "@/actions/hiring/company-drafts.action"
import { DraftsClient } from "./_components/drafts-client"

/** Unclaimed company drafts (plan/hiring-rounds HR-6). Server component, as the other console pages. */
export default async function CompanyDraftsPage() {
    const result = await listCompanyDrafts()
    return (
        <DraftsClient
            initialDrafts={result.success ? result.data.drafts : []}
            initialCounts={result.success ? result.data.counts : { SCRAPING: 0, READY: 0, FAILED: 0, PUBLISHED: 0, DISCARDED: 0 }}
            loadError={result.success ? null : result.error}
        />
    )
}
