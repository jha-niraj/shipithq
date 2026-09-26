import { getPipelineChoices } from "@/actions/jobs/job-pipeline.action"
import JobFormContent from "./job-form-content"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Create New Job | Hiring",
    description: "Create a new job posting",
}

export default async function NewJobPage() {
    const choices = await getPipelineChoices()
    return <JobFormContent pipelineChoices={choices.success ? choices.data : []} />
}
