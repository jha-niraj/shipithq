import { STEPS, runReportStep, type StepResult } from "@/lib/report"

// Vercel stops this function after 60 seconds and answers 504 FUNCTION_INVOCATION_TIMEOUT.
// 60 stands in for Hobby's 300: the same cliff, reached sooner. The report needs 150.
// `next dev` does not enforce it: deploy to see the 504.
export const maxDuration = 60

export async function POST() {
    const started = Date.now()
    const lines: StepResult[] = []
    for (let step = 1; step <= STEPS.length; step++) {
        lines.push(await runReportStep(step))
    }
    return Response.json({ lines, seconds: Math.round((Date.now() - started) / 1000) })
}
