import { redirect } from "next/navigation"
import { getCompanyContext } from "@/lib/permissions"
import { loadHome } from "@/lib/home"
import HomeContent from "./home-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Home | ShipItHQ Hiring" }

/** The company's Home (plan/hiring-app HA-15): roles, the funnel per round, and what needs attention. */
export default async function HomePage() {
    const ctx = await getCompanyContext()
    if (!ctx) redirect("/onboarding")
    const data = await loadHome(ctx.companyId, ctx.member.company, { candidates: ctx.can("view_candidates"), jobs: ctx.can("manage_jobs") })
    return <HomeContent data={data} canCreateJob={ctx.can("manage_jobs")} canSeeCandidates={ctx.can("view_candidates")} />
}
