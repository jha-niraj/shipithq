import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getJobBySlug } from "@/actions/jobs"
import { getJobPipeline, getPipelineChoices } from "@/actions/jobs/job-pipeline.action"
import JobFormContent, { type EditableJob } from "../../new/job-form-content"
import type { CustomQuestion } from "@/types"

export const dynamic = "force-dynamic"

export const metadata = { title: "Edit job | Hiring" }

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

/** Edit a job, including its own pipeline (plan/hiring-rounds HR-12). The jobs list linked here before it existed. */
export default async function EditJobPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const result = await getJobBySlug(slug)
    if (!result.success || !result.data) {
        return (
            <div className="page-frame space-y-4 px-page py-6">
                <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                    <ArrowLeft className="h-4 w-4" /> Jobs
                </Link>
                <p className="text-neutral-700 dark:text-neutral-300">That job doesn&apos;t exist.</p>
            </div>
        )
    }
    const j = result.data
    const job: EditableJob = {
        id: j.id,
        slug: j.slug,
        status: j.status,
        title: j.title,
        description: j.description,
        location: j.location,
        locationType: j.locationType,
        employmentType: j.employmentType,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: j.salaryCurrency,
        salaryDisclosed: j.salaryDisclosed,
        skillsRequired: strings(j.skillsRequired),
        skillsPreferred: strings(j.skillsPreferred),
        requirements: strings(j.requirements),
        responsibilities: strings(j.responsibilities),
        benefits: strings(j.benefits),
        hasAssignment: j.hasAssignment,
        assignmentDetails: (j.assignmentDetails as { title?: string; description?: string } | null) ?? null,
        assignmentDeadlineDays: j.assignmentDeadlineDays,
        customQuestions: Array.isArray(j.customQuestions) ? (j.customQuestions as CustomQuestion[]) : [],
    }
    const [choices, pipeline] = await Promise.all([getPipelineChoices(), getJobPipeline(j.id)])
    return (
        <JobFormContent
            pipelineChoices={choices.success ? choices.data : []}
            job={job}
            jobPipeline={pipeline.success ? pipeline.data : null}
        />
    )
}
