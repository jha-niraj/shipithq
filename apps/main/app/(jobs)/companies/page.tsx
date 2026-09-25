import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { browseCompanies, getFeaturedCompanies, getFollowedCompanyIds } from "@/actions/companies"
import { CompaniesContent } from "./companies-content"
import Loading from "./loading"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Companies | ShipItHQ",
    description: "Discover companies with transparent interview processes"
}

export default async function CompaniesPage() {
    const [companiesResult, featuredResult, followedResult] = await Promise.all([
        browseCompanies({}, 1, 20),
        getFeaturedCompanies(),
        getFollowedCompanyIds()
    ])

    const companies = companiesResult.success && companiesResult.data 
        ? companiesResult.data.companies 
        : []
    const pagination = companiesResult.success && companiesResult.data
        ? companiesResult.data.pagination
        : { page: 1, limit: 20, total: 0, totalPages: 0 }
    const featuredCompanies = featuredResult.success ? featuredResult.data || [] : []
    const followedCompanyIds = followedResult.success ? followedResult.data || [] : []

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <CompaniesContent 
                initialCompanies={companies}
                initialPagination={pagination}
                featuredCompanies={featuredCompanies}
                followedCompanyIds={followedCompanyIds}
            />
        </Suspense>
    )
}