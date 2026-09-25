import { Suspense } from "react"
import Loading from "./loading"
import { 
    getCompanyProfile, getCompanyPublicStats 
} from "@/actions/company"
import { CompanyProfileContent } from "./company-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Company Profile | ShipItHQ Hiring",
    description: "Manage your company information and branding"
}

export default async function CompanyPage() {
    const [profileResult, statsResult] = await Promise.all([
        getCompanyProfile(),
        getCompanyPublicStats()
    ])

    const profile = profileResult.success && profileResult.data ? profileResult.data : null
    const stats = statsResult.success && statsResult.data ? statsResult.data : null

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <CompanyProfileContent 
                profile={profile}
                stats={stats}
            />
        </Suspense>
    )
}