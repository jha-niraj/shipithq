import Link from "next/link"
import { getRunnerAttempt } from "@/actions/hiring/run.action"
import { RoundRunner } from "@/components/hiring/round-runner"

export const dynamic = "force-dynamic"
export const metadata = { title: "Round | ShipItHQ" }

/** One attempt at a hiring round, full page (plan/hiring-rounds HR-13, HR-14). */
export default async function RoundPage({ params }: { params: Promise<{ attemptId: string }> }) {
    const { attemptId } = await params
    const result = await getRunnerAttempt(attemptId)
    if (!result.success) {
        return (
            <div className="mx-auto max-w-md px-4 py-24 text-center">
                <p className="text-neutral-700 dark:text-neutral-300">{result.error}</p>
                <Link href="/jobs" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Back to jobs</Link>
            </div>
        )
    }
    return <RoundRunner attempt={result.data} />
}
