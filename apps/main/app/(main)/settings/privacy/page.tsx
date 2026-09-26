import { getMyBlocks } from "@/actions/moderation.action"
import { BlockedCompanies } from "./_components/blocked-companies"

export const dynamic = "force-dynamic"
export const metadata = { title: "Privacy | Settings | ShipItHQ", description: "Companies you've blocked" }

/** Settings > Privacy (plan/hiring-rounds HR-24): every company the student has blocked. */
export default async function PrivacySettingsPage() {
    const r = await getMyBlocks()
    return <BlockedCompanies initial={r.success ? r.data : []} />
}
