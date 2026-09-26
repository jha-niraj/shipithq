import { getIncidentCase } from "@/content/incidents/cases"

/**
 * A compact brief of an Incidents case for ShipItHQ AI (plan/incidents INC-18), so a
 * reader asking "why did nothing get written?" gets an answer grounded in the case.
 * Capped, and plain text: the case is public teaching material, not user data.
 */
export function incidentBrief(slug: string): string | null {
    const c = getIncidentCase(slug)
    if (!c) return null
    const text = [
        `The user is working through the Incidents case "${c.title}": ${c.summary}`,
        "What the case teaches (answer from this; say so when a question goes beyond it):",
        ...c.model.steps.map((s) => `- ${s.title}: ${s.body}`),
        `- The fix: ${c.fix.tree.leaves.map((l) => `${l.title}: ${l.body}`).join(" ")}`,
        `- The twist: ${c.fix.twist.body.join(" ")}`,
        "Explain like a patient senior engineer, in plain words, with no code unless asked. Do not give away quiz answers outright: guide the user to reason it out.",
    ].join("\n").replace(/`/g, "")
    return text.slice(0, 4000)
}
