import type { OnboardingProfile } from "@repo/db"
import type { CatalogueEntry } from "./recommend-prompt"

// The prompt behind the practice path (plan/practice-path, PP-2). The model orders
// the catalogue into stages; it never writes a problem, only picks slugs.

export const MIN_STAGES = 5
export const MAX_STAGES = 8
export const MIN_STAGE_PROBLEMS = 3
export const MAX_STAGE_PROBLEMS = 6
/** A goal longer than this is prose, not a goal. */
export const MAX_GOAL_CHARS = 90

export const PATH_SYSTEM = [
    "You lay out a route through a fixed catalogue of practice problems for one learner.",
    "",
    "Return ONLY JSON: {\"stages\":[{\"topic\":\"<catalogue topic>\",\"goal\":\"<one line>\",\"slugs\":[\"<slug>\"]}]}",
    "",
    "Rules:",
    `- Between ${MIN_STAGES} and ${MAX_STAGES} stages, in the order they should be worked through.`,
    `- ${MIN_STAGE_PROBLEMS} to ${MAX_STAGE_PROBLEMS} problems per stage. Every slug copied exactly from the catalogue, never invented, never repeated anywhere in the path.`,
    "- One topic per stage. Name it exactly as the catalogue spells it.",
    "- Order the STAGES so each one rests on the last: what they already do well comes first and briefly, then the next thing it unlocks, then what they avoid. Do not open with their weakest topic, and do not leave it to the end untouched.",
    "- Order the PROBLEMS inside a stage from easiest to hardest.",
    `- "goal" is under ${MAX_GOAL_CHARS} characters, says what they will be able to DO after the stage, and is addressed to them ("Spot when a hash map replaces a second loop"). Not a topic name, not "learn about X".`,
    "- Weight the length by the hours they have: fewer hours means fewer, shorter stages, not the same path compressed.",
    "- Punctuation: plain hyphens only, never an em dash or en dash.",
].join("\n")

export function buildPathUserMessage(input: {
    moduleLabel: string
    profile: OnboardingProfile
    catalogue: CatalogueEntry[]
    solvedSlugs: string[]
    /** What the mentor has recorded as shaky or mistaken, if anything yet. */
    weakConcepts: string[]
}): string {
    const { moduleLabel, profile, catalogue, solvedSlugs, weakConcepts } = input
    const topics = [...new Set(catalogue.map((c) => c.topic))]
    const lines = [
        `Module: ${moduleLabel}`,
        "",
        "The learner, from their onboarding:",
        `- Level: ${profile.level}`,
        ...profile.facts.map((f) => `- ${f}`),
        ...(profile.strengths.length ? [`- Comfortable with: ${profile.strengths.join("; ")}`] : []),
        ...(profile.gaps.length ? [`- Avoids or struggles with: ${profile.gaps.join("; ")}`] : []),
        ...(profile.goals.length ? [`- Wants: ${profile.goals.join("; ")}`] : []),
    ]
    if (weakConcepts.length) {
        lines.push("", `The mentor has seen them struggle with: ${weakConcepts.join("; ")}`)
    }
    if (solvedSlugs.length) {
        lines.push("", "Already solved (do not put these in the path):", solvedSlugs.join(", "))
    }
    lines.push(
        "",
        `Topics in this catalogue: ${topics.join(", ")}`,
        "",
        `Catalogue (${catalogue.length} problems, "slug | title | topic | difficulty"):`,
        ...catalogue.map((c) => `${c.slug} | ${c.title} | ${c.topic} | ${c.difficulty}`),
    )
    return lines.join("\n")
}
