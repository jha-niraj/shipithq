import { PageHeader } from "@repo/ui/components/ui/page-header"
import { getImportAllowance } from "@/actions/(main)/jobs/import.action"
import { cn } from "@repo/ui/lib/utils"
import { ImportForm } from "@/components/job-import/import-form"

const STEPS = [
    { title: "Paste the job", body: "Its link, or the posting's text. LinkedIn links often need the text pasted instead." },
    { title: "We design its interview", body: "The rounds the company is likely to run, each with a pass mark, in the order they'd come." },
    { title: "Practise round by round", body: "Clear a round to open the next. Your results stay yours until you choose to send them." },
]

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
            {/* The steps as a stepper on the left, the form on the right (plan/jobs-polish JP-4). */}
            <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,44rem)] lg:items-start">
                <aside className="lg:sticky lg:top-4">
                    <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">How it works</h2>
                    <ol className="relative space-y-6">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="relative flex gap-3">
                                {i < STEPS.length - 1 && <span aria-hidden className="absolute top-8 bottom-[-1.5rem] left-[13px] w-px bg-neutral-200 dark:bg-neutral-800" />}
                                <span className={cn(
                                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                    i === 0 ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400",
                                )}>{i + 1}</span>
                                <span className="pt-0.5">
                                    <span className={cn("block text-sm font-medium", i === 0 ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300")}>{step.title}</span>
                                    <span className="mt-1 block text-xs leading-5 text-neutral-600 dark:text-neutral-400">{step.body}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </aside>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
                    <ImportForm allowance={allowance} company={company?.slice(0, 120)} />
                </div>
            </div>
        </div>
    )
}
