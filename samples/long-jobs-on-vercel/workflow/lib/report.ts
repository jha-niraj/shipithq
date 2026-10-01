// The slow function: a weekly report in 10 steps. The work is simulated (each step
// waits), so it costs nothing, needs no keys and takes the same time on every run.

export const STEPS = [
    "Load the week's events",
    "Count sign-ups",
    "Count active teams",
    "Sum revenue",
    "Compare with last week",
    "Find the top ten pages",
    "Find the slowest pages",
    "Build the charts",
    "Write the summary",
    "Save the report",
] as const

/** One step takes 15 seconds, so the whole report takes 10 x 15 = 150 seconds. */
export const STEP_MS = 15_000

/** Set FAIL_ONCE_AT to a step number (1 to 10) to make that step fail on its first attempt. */
export const FAIL_ONCE_AT = Number(process.env.FAIL_ONCE_AT ?? 0)

export type StepResult = { step: number; name: string; at: string }

export async function runReportStep(step: number, attempt = 1): Promise<StepResult> {
    await new Promise((resolve) => setTimeout(resolve, STEP_MS))
    if (step === FAIL_ONCE_AT && attempt === 1) {
        throw new Error(`Step ${step} failed on purpose (attempt ${attempt})`)
    }
    return { step, name: STEPS[step - 1] ?? `Step ${step}`, at: new Date().toISOString() }
}
