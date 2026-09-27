import { redirect } from "next/navigation"
import { getCompanyContext } from "@/lib/permissions"

export const dynamic = "force-dynamic"

/** The company's page lives at /c/<slug> (plan/hiring-ui HU-11); the nav's "Company profile" lands here. */
export default async function CompanyRedirect() {
    const ctx = await getCompanyContext()
    if (!ctx) redirect("/onboarding")
    redirect(`/c/${ctx.member.company.slug}`)
}
