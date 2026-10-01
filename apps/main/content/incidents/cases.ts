import type { IncidentCase } from "./types"
import { demoThatDiedAt30Seconds } from "./the-demo-that-died-at-30-seconds"
import { loginThatSaidYes } from "./the-login-that-said-yes-to-guessing"
import { exportThatFinishedAfterItFailed } from "./the-export-that-finished-after-it-failed"

/**
 * Every case's full content, by slug (plan/incidents INC-2). Separate from
 * `index.ts` so pages that only list cases do not pull in every case body. Plain
 * data and pure functions, so client components import it directly.
 */
export const INCIDENT_CASES: Record<string, IncidentCase> = {
    [demoThatDiedAt30Seconds.slug]: demoThatDiedAt30Seconds,
    [loginThatSaidYes.slug]: loginThatSaidYes,
    [exportThatFinishedAfterItFailed.slug]: exportThatFinishedAfterItFailed,
}

export function getIncidentCase(slug: string): IncidentCase | undefined {
    return INCIDENT_CASES[slug]
}
