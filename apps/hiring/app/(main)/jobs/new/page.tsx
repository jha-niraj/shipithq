import { getPipelineChoices } from "@/actions/jobs/job-pipeline.action"
import { getOptions } from "@/actions/options"
import JobFormContent from "./job-form-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "New job | Hiring",
    description: "Create a job: its pipeline, the job, location and pay, skills and details",
}

/** A new job, in five steps with the pipeline first (plan/hiring-ui HU-5). */
export default async function NewJobPage() {
    const [choices, options] = await Promise.all([
        getPipelineChoices(),
        getOptions(["job_title", "department", "location", "skill", "benefit"]),
    ])
    return <JobFormContent pipelineChoices={choices.success ? choices.data : []} options={options} />
}
