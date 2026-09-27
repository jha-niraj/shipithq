import { notFound, redirect } from "next/navigation"
import { getCompanyContext } from "@/lib/permissions"
import { COMPANY_TABS, loadCompanyPage, type CompanyTab } from "@/lib/company-page"
import { getOptions } from "@/actions/options"
import { CompanyPage } from "./company-page"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return { title: `${slug} | ShipItHQ Hiring` }
}

/** A company's page (plan/hiring-ui HU-11): cover, logo, and About / Jobs / People / Life below the header. */
export default async function CompanyPageRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
    const [{ slug }, { tab }, ctx] = await Promise.all([params, searchParams, getCompanyContext()])
    if (!ctx) redirect("/onboarding")
    const data = await loadCompanyPage(slug, { companyId: ctx.companyId, canEdit: ctx.can("edit_company") })
    if (!data) notFound()
    const current: CompanyTab = (COMPANY_TABS as readonly string[]).includes(tab ?? "") ? (tab as CompanyTab) : "about"
    const options = data.canEdit ? await getOptions(["industry", "city", "tech", "benefit"]) : null
    return <CompanyPage data={data} tab={current} options={options} />
}
