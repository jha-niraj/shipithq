import Link from "next/link"
import { headers } from "next/headers"
import { ArrowLeft } from "lucide-react"
import { getSession } from "@repo/auth"
import { getJobRounds } from "@/actions/hiring/run.action"
import { RoundsOverviewView } from "@/components/hiring/rounds-overview"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rounds | ShipItHQ" }

/** A job's rounds, taken in order (plan/hiring-rounds HR-13). */
export default async function JobRoundsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const [result, session] = await Promise.all([getJobRounds(slug), getSession(await headers())])
    if (!result.success) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                <Link href={`/jobs/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"><ArrowLeft className="h-4 w-4" /> Job</Link>
                <p className="text-neutral-700 dark:text-neutral-300">{result.error}</p>
            </div>
        )
    }
    return <RoundsOverviewView data={result.data} signedIn={Boolean(session?.user?.id)} />
}
