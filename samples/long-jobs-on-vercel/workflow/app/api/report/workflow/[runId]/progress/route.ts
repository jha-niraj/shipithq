import { getRun } from "workflow/api"
import type { StepResult } from "@/lib/report"

// Each finished step as one line of JSON, from step `from` on, so a page that comes back
// later asks only for what it has not seen yet.
export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params
    const from = Number(new URL(request.url).searchParams.get("from") ?? 0)
    const lines = getRun(runId)
        .getReadable<StepResult>({ startIndex: from })
        .pipeThrough(new TransformStream<StepResult, string>({
            transform(chunk, controller) {
                controller.enqueue(JSON.stringify(chunk) + "\n")
            },
        }))
        .pipeThrough(new TextEncoderStream())
    return new Response(lines, { headers: { "Content-Type": "application/x-ndjson" } })
}
