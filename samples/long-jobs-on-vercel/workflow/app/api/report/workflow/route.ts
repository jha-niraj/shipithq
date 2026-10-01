import { start } from "workflow/api"
import { reportWorkflow } from "@/workflows/report"

// Starts the run and answers at once with its id. The work happens in the steps.
export async function POST() {
    const run = await start(reportWorkflow)
    return Response.json({ runId: run.runId })
}
