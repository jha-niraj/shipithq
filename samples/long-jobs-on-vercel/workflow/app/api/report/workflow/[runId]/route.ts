import { getRun } from "workflow/api"

// The run's status (pending, running, completed, failed or cancelled), for a page that
// was closed and opened again.
export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params
    const run = getRun(runId)
    if (!(await run.exists)) return Response.json({ error: "No such run" }, { status: 404 })
    const status = await run.status
    const result = status === "completed" ? await run.returnValue : null
    return Response.json({ status, result })
}
