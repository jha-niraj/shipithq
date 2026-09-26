import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, Building2, Lock, Plus } from "lucide-react"
import { getSession } from "@repo/auth"
import { Button } from "@repo/ui/components/ui/button"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { ReportInterviewButton } from "@/components/interview-reports/report-sheet"
import { loadPendingCompany } from "@/lib/job-import/pending"

export const dynamic = "force-dynamic"
export const metadata = { title: "Company under review | ShipItHQ" }

const LEVEL: Record<string, string> = { INTERN: "Intern", ENTRY: "Entry level", MID: "Mid level", SENIOR: "Senior", LEAD: "Lead" }

/** A company students imported jobs for, while ShipItHQ reviews it (plan/job-import). */
export default async function PendingCompanyPage({ params }: { params: Promise<{ requestId: string }> }) {
    const { requestId } = await params
    const session = await getSession(await headers())
    const data = await loadPendingCompany(requestId, session?.user?.id ?? null)
    if (!data) notFound()
    // Published: every old link lands on the real page.
    if (data.companySlug) redirect(`/companies/${data.companySlug}`)

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title={`${data.name} (under review by ShipItHQ)`}
                subtitle={data.rejected
                    ? `ShipItHQ didn't add ${data.domain} as a company page. The jobs students imported for it stay practisable.`
                    : `${data.domain} · students imported these jobs before ${data.name} was on ShipItHQ. We're reviewing the company; when its page is live, everything here moves to it.`}
                actions={
                    <div className="flex flex-wrap gap-2">
                        {!data.rejected && session?.user?.id && <ReportInterviewButton prefill={{ company: { companyId: null, companyRequestId: data.requestId, name: data.name } }} variant="ghost" />}
                        <Button asChild size="sm" variant="outline" className="gap-1.5"><Link href={`/jobs/import?company=${encodeURIComponent(data.name)}`}><Plus className="h-4 w-4" /> Import another {data.name} job</Link></Button>
                    </div>
                }
            />
            {data.jobs.length === 0 ? (
                <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">No jobs are ready to practise here yet.</p>
            ) : (
                <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                    {data.jobs.map((j) => (
                        <li key={j.id}>
                            <Link href={`/jobs/import/${j.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700"><Building2 className="h-4 w-4 text-neutral-500" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">{j.title}{j.private && <Lock className="h-3.5 w-3.5 text-neutral-400" aria-label="Private: only you see it" />}</span>
                                    <span className="block text-sm text-neutral-500 dark:text-neutral-400">{[j.level ? LEVEL[j.level] : null, j.location, `${j.rounds} rounds`].filter(Boolean).join(" · ")}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
