import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { notFound } from "next/navigation"
import { getCompanyBySlug } from "@/actions/companies"
import { getCompanyMockHub } from "@/actions/companies/mock"
import { CompanyMockHubContent } from "./mock-hub-content"
import Loading from "./loading"

export const metadata = {
    title: "Mock Interview Hub | ShipItHQ",
    description: "Practice AI mock interviews for this company's interview process"
}

interface Props {
    params: Promise<{ slug: string }>
}

export default async function CompanyMockHubPage({ params }: Props) {
    const { slug } = await params
    
    const [companyResult, mockHubResult] = await Promise.all([
        getCompanyBySlug(slug),
        getCompanyMockHub(slug)
    ])

    if (!companyResult.success || !companyResult.data) {
        notFound()
    }

    const companyData = companyResult.data
    const company = {
        id: companyData.id,
        name: companyData.name,
        slug: companyData.slug,
        logo: companyData.logoUrl,
        industry: companyData.industry,
        isVerified: companyData.verificationStatus === "VERIFIED"
    }
    const mockHub = mockHubResult.success && mockHubResult.data ? mockHubResult.data : null

    return (
        <Suspense 
            fallback={<Loading />}
        >
            <CompanyMockHubContent 
                company={company}
                mockHub={mockHub}
            />
        </Suspense>
    )
}
