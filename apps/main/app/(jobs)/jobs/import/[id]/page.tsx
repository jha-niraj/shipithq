import Link from "next/link"
import { headers } from "next/headers"
import { ArrowLeft, CircleDashed } from "lucide-react"
import { getSession } from "@repo/auth"
import { redirect } from "next/navigation"
import { getImport } from "@/actions/(main)/jobs/import.action"
import { getImportRounds } from "@/actions/hiring/run.action"
import { RoundsOverviewView } from "@/components/hiring/rounds-overview"
import { ReportInterviewButton } from "@/components/interview-reports/report-sheet"
import { AskReferral } from "@/components/referrals/ask-referral"
import { getReferralAvailability } from "@/actions/(main)/referrer"

export const dynamic = "force-dynamic"
export const metadata = { title: "Practise a job | ShipItHQ" }

/**
 * A built imported job's rounds, practised in order (plan/job-import JI-7). Before
 * READY an import is a step of the wizard at /jobs/import?id= (JI-19), so this page
 * sends it there; this link is the one students share.
 */
export default async function ImportedJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [imp, session] = await Promise.all([getImport(id), getSession(await headers())])
    if (!imp.success) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                <Link href="/jobs/import" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"><ArrowLeft className="h-4 w-4" /> Practise any job</Link>
                <p className="text-neutral-700 dark:text-neutral-300">{imp.code === "UNAUTHORIZED" ? "Sign in to see this job." : imp.error}</p>
            </div>
        )
    }
    // Anything not built yet is a step of the wizard (JI-19).
    if (imp.data.status !== "READY") redirect(`/jobs/import?id=${id}`)

    const [rounds, referral] = await Promise.all([
        getImportRounds(id),
        // Referrals need a company on ShipItHQ (CMP-4); a job still under review has none.
        imp.data.companyId ? getReferralAvailability({ importedJobId: id }) : null,
    ])
    if (!rounds.success) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                <Link href="/jobs/import" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"><ArrowLeft className="h-4 w-4" /> Practise any job</Link>
                <p className="text-neutral-700 dark:text-neutral-300">{rounds.error}</p>
            </div>
        )
    }
    const skipped = imp.data.notPractisable
    const ctx = rounds.data.context
    // Filed against the company, or the request while it's under review (CMP-1).
    const reportCompany = imp.data.companyId || imp.data.companyRequestId
        ? { companyId: imp.data.companyId, companyRequestId: imp.data.companyId ? null : imp.data.companyRequestId, name: ctx.kind === "import" ? ctx.companyName : (imp.data.companyName ?? "") }
        : undefined
    const reportLevel = imp.data.level === "LEAD" ? "SENIOR" : imp.data.level ?? undefined
    return (
        <RoundsOverviewView
            data={rounds.data}
            signedIn={Boolean(session?.user?.id)}
            extra={
                <>
                    {imp.data.companyId && referral?.success && (
                        <AskReferral target={{ importedJobId: id }} availability={referral.data} companyName={ctx.kind === "import" ? ctx.companyName : (imp.data.companyName ?? "the company")} />
                    )}
                    {reportCompany && session?.user?.id && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
                            <div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">Interviewed for this role?</p>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Report the rounds you actually took. It helps the next student; only totals are ever shown.</p>
                            </div>
                            <ReportInterviewButton label="I interviewed for this" prefill={{ company: reportCompany, importedJobId: imp.data.id, role: imp.data.title ?? undefined, level: reportLevel }} />
                        </div>
                    )}
                    {skipped.length > 0 && (
                        <div className="space-y-2 rounded-2xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Also in this interview, not practisable here yet</p>
                            <ul className="space-y-1.5">
                                {skipped.map((s) => (
                                    <li key={s.name} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                        <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                                        <span><span className="font-medium">{s.name}</span>{s.reason ? `: ${s.reason}` : ""}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            }
        />
    )
}
