import { getStepMetadata, getWritable } from "workflow"
import { STEPS, runReportStep, type StepResult } from "@/lib/report"

// The same 10 steps, as a workflow. The workflow function only decides what runs next;
// it is replayed from the run's event log, so it must not do the work itself.
export async function reportWorkflow() {
    "use workflow"
    const lines: StepResult[] = []
    for (let step = 1; step <= STEPS.length; step++) {
        lines.push(await reportStep(step))
    }
    return { lines }
}

// One step is one function invocation of about 15 seconds, far under any limit. If it
// throws, it is retried (3 times by default) from its first line, so anything it does
// to the outside world must be safe to do twice.
async function reportStep(step: number): Promise<StepResult> {
    "use step"
    const { attempt } = getStepMetadata()
    const result = await runReportStep(step, attempt)
    const writer = getWritable<StepResult>().getWriter()
    try {
        await writer.write(result)
    } finally {
        writer.releaseLock()
    }
    return result
}
