import { listCandidates } from "@/actions/sends"
import { CandidatesList } from "./candidates-list"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Candidates | ShipItHQ Hiring",
    description: "Everyone who sent you their round results",
}

/** Everyone who sent results, across roles (plan/hiring-app HA-16). */
export default async function CandidatesPage() {
    const r = await listCandidates()
    if (!r.success) return <p className="p-8 text-sm text-neutral-700 dark:text-neutral-300">{r.error}</p>
    return <CandidatesList candidates={r.data} />
}
