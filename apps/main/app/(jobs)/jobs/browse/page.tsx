import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { browseFacets, browseJobListings } from "@/actions/jobs"
import { parseBrowseParams } from "@/lib/jobs/browse-params"
import { BrowseContent } from "./browse-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Browse All Jobs | ShipItHQ",
    description: "Browse all available job opportunities",
}

/** Browse all jobs (plan/jobs-polish JP-21, JP-22): the filters, sort and page come from the URL. */
export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const [session, raw] = await Promise.all([getSession(headers()), searchParams])
    const signedIn = !!session?.user?.id
    const params = parseBrowseParams(raw, signedIn)
    const [result, facets] = await Promise.all([browseJobListings(params), browseFacets()])
    return (
        <BrowseContent
            params={params}
            result={result.success ? result.data : null}
            facets={facets}
            signedIn={signedIn}
        />
    )
}
