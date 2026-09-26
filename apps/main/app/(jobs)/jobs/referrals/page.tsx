import { getMyReferralRequests, getReferrerInbox, getReferrerState } from "@/actions/(main)/referrer"
import { ReferralsView } from "@/components/referrals/referrals-view"

export const dynamic = "force-dynamic"
export const metadata = { title: "Referrals | ShipItHQ", description: "Ask a verified employee for a referral, or refer students for your company" }

/** Verified referrals (plan/competition/skillmeet CMP-4e): both sides on one page. */
export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const view = tab === "referring" ? "referring" : "mine"
    const [mine, state, inbox] = await Promise.all([
        view === "mine" ? getMyReferralRequests() : null,
        view === "referring" ? getReferrerState() : null,
        view === "referring" ? getReferrerInbox() : null,
    ])
    return (
        <ReferralsView
            tab={view}
            mine={mine?.success ? mine.data : []}
            state={state?.success ? state.data : null}
            inbox={inbox?.success ? inbox.data : []}
        />
    )
}
