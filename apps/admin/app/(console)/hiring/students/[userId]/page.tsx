import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getStudentAttempts } from "@/actions/hiring/reports.action"

export const dynamic = "force-dynamic"

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })

/** A student's hiring attempts with their integrity signals, for reviewing a report (HR-24). */
export default async function StudentAttemptsPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params
    const r = await getStudentAttempts(userId)
    return (
        <div className="w-full p-6 lg:p-8">
            <Link href="/hiring/reports" className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                <ArrowLeft className="h-4 w-4" /> Reports
            </Link>
            {!r.success ? (
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{r.error}</p>
            ) : (
                <>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">{r.data.student.name ?? "Student"}&apos;s attempts</h1>
                    <p className="mb-6 font-mono text-sm text-neutral-500">{r.data.student.email}</p>
                    {r.data.attempts.length === 0 ? (
                        <p className="rounded-xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">No hiring attempts.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                                    <tr><th className="px-4 py-2.5">Started</th><th className="px-4 py-2.5">Company and role</th><th className="px-4 py-2.5">Round</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Score</th><th className="px-4 py-2.5 text-right">Pastes</th><th className="px-4 py-2.5 text-right">Tab leaves</th></tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {r.data.attempts.map((a) => (
                                        <tr key={a.id}>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600 dark:text-neutral-400">{when(a.startedAt)}</td>
                                            <td className="px-4 py-2.5 text-neutral-900 dark:text-white">{a.company}{a.job ? ` · ${a.job}` : " · practice"}</td>
                                            <td className="px-4 py-2.5 text-neutral-900 dark:text-white">{a.round} <span className="text-xs text-neutral-500">{a.roundType}</span></td>
                                            <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{a.status}</td>
                                            <td className="px-4 py-2.5 text-right font-medium text-neutral-900 dark:text-white">{a.score ?? "-"}</td>
                                            <td className="px-4 py-2.5 text-right text-neutral-900 dark:text-white">{a.integrity?.pastes ?? 0}</td>
                                            <td className="px-4 py-2.5 text-right text-neutral-900 dark:text-white">{a.integrity?.tabLeaves ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
