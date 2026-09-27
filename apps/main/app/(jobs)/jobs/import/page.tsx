import { PageHeader } from "@repo/ui/components/ui/page-header"
import { getImportAllowance } from "@/actions/(main)/jobs/import.action"
import { ImportForm } from "@/components/job-import/import-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Practise any job | ShipItHQ" }

/** Paste a job from anywhere and practise its interview, round by round (plan/job-import JI-7). */
export default async function ImportJobPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
    const [{ company }, allowance] = await Promise.all([searchParams, getImportAllowance()])
    return (
        <div className="page-frame space-y-6 px-page py-6">
            <PageHeader
                title="Practise any job"
                subtitle="Paste a job from LinkedIn, a careers page or anywhere else. We read it, design its interview as rounds with pass marks, and you practise them in order."
            />
            {/* The form beside what happens next, instead of a narrow card with empty space to its right (plan/ui-forms UF-9). */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <ImportForm allowance={allowance} company={company?.slice(0, 120)} />
                </div>
                <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">How it works</h2>
                    <ol className="space-y-2">
                        {[
                            { title: "Paste the job", body: "A link or the posting's text. LinkedIn links often need the text pasted instead." },
                            { title: "We design its interview", body: "Rounds the company is likely to run, each with a pass mark, in the order they'd come." },
                            { title: "Practise round by round", body: "Clear a round to open the next. Your results stay yours until you choose to send them." },
                        ].map((step, i) => (
                            <li key={step.title} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">{i + 1}</span>
                                <span>
                                    <span className="block text-sm font-medium text-neutral-900 dark:text-white">{step.title}</span>
                                    <span className="mt-0.5 block text-sm text-neutral-600 dark:text-neutral-400">{step.body}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </aside>
            </div>
        </div>
    )
}
