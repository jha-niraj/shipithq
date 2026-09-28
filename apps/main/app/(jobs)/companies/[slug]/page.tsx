import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { getSession } from "@repo/auth"
import { db, companies } from "@repo/db"
import { companyTab, loadCompanyPage } from "@/lib/companies/public-page"
import { CompanyPageView } from "./_components/company-page"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const c = await db.query.companies.findFirst({ where: eq(companies.slug, slug), columns: { name: true, description: true } })
    if (!c) return { title: "Company not found | ShipItHQ" }
    return { title: `${c.name} | ShipItHQ`, description: c.description?.slice(0, 160) || `${c.name}'s open roles and interview rounds on ShipItHQ` }
}

/** A company's public page (plan/hiring-rounds HR-23), tabbed by `?tab=` (plan/jobs-polish JP-5). */
export default async function CompanyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
    const [{ slug }, sp] = await Promise.all([params, searchParams])
    const tab = companyTab(sp.tab)
    const session = await getSession(await headers())
    const data = await loadCompanyPage(slug, session?.user?.id ?? null)
    if (!data) notFound()
    return <CompanyPageView data={data} tab={tab} />
}
