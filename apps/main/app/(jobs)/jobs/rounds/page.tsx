import Link from "next/link"
import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { Button } from "@repo/ui/components/ui/button"
import { getMyReports } from "@/actions/(main)/companies/reports.action"
import { loadMyRounds } from "@/lib/hiring/my-rounds"
import { MyRoundsView } from "./_components/my-rounds"

export const dynamic = "force-dynamic"
export const metadata = { title: "My rounds | ShipItHQ", description: "Your rounds in progress, the results you've sent, and what companies said" }

/** Every run and send of the signed-in student (plan/hiring-rounds HR-22). */
export default async function MyRoundsPage() {
    const session = await getSession(await headers())
    const uid = session?.user?.id
    if (!uid) {
        return (
            <div className="page-frame space-y-3 px-page py-6">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">My rounds</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Sign in to see the rounds you&apos;ve taken and the results you&apos;ve sent.</p>
                <Button asChild size="sm"><Link href="/signin?callbackUrl=/jobs/rounds">Sign in</Link></Button>
            </div>
        )
    }
    const [data, reports] = await Promise.all([loadMyRounds(uid), getMyReports()])
    return <MyRoundsView data={data} reports={reports.success ? reports.data : []} />
}
