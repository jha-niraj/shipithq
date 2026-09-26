import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { getMyCompanyRequests } from "@/actions/companies/request.action"
import { RequestCompanyContent } from "./_components/request-company-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Request a company | ShipItHQ",
    description: "Ask ShipItHQ to add a company. We build its page from the company's own website.",
}

/** Students ask for a company that isn't listed (plan/hiring-rounds HR-7). */
export default async function RequestCompanyPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const [{ q }, session] = await Promise.all([searchParams, getSession(await headers())])
    const signedIn = Boolean(session?.user?.id)
    const mine = signedIn ? await getMyCompanyRequests() : null
    return (
        <RequestCompanyContent
            signedIn={signedIn}
            initialQuery={(q ?? "").slice(0, 120)}
            initialRequests={mine?.success ? mine.data : []}
        />
    )
}
