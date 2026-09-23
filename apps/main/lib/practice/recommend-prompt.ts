import type { OnboardingProfile } from "@repo/db"

// The prompt behind the Recommended tab (plan/practice-dsa, PD-15). The model is
// given the catalogue as slugs plus the little that identifies each problem, and
// the onboarding profile; it returns an order and a reason per pick.
//
// Slugs, not descriptions: the model already knows what "two-sum" is, and 75
// problem statements would be most of the prompt for nothing.

export const MAX_RECOMMENDATIONS = 30
/** A reason longer than this is the model writing prose instead of a label. */
export const MAX_WHY_CHARS = 90

export interface CatalogueEntry {
    slug: string
    title: string
    /** The category's readable name, for example "Arrays & Hashing". */
    topic: string
    difficulty: string
}

export const RECOMMEND_SYSTEM = [
    "You pick which practice problems a specific learner should do next, from a fixed catalogue.",
    "",
    "Return ONLY JSON: {\"items\":[{\"slug\":\"<slug from the catalogue>\",\"why\":\"<reason>\"}]}",
    "",
    "Rules:",
    `- At most ${MAX_RECOMMENDATIONS} items, in the order they should be attempted. Fewer is fine; never pad the list.`,
    "- Every slug must be copied exactly from the catalogue. Never invent one, never repeat one.",
    "- Start where they can succeed, then move toward what they avoid. A learner who fears a topic gets the gentlest problem in it first, not the hardest.",
    "- Respect what they already solve comfortably: do not fill the list with problems in a topic they called easy.",
    "- Weight by the time they said they have. Fewer hours means a shorter list, not the same list in a worse order.",
    `- "why" is one line under ${MAX_WHY_CHARS} characters, addressed to them, saying what this problem gives THEM ("Your weakest topic, and the gentlest way in"). Never restate the title or the topic, never write "this problem".`,
    "- Punctuation: plain hyphens only, never an em dash or en dash.",
].join("\n")

export function buildRecommendUserMessage(input: {
    moduleLabel: string
    profile: OnboardingProfile
    catalogue: CatalogueEntry[]
    solvedSlugs: string[]
}): string {
    const { moduleLabel, profile, catalogue, solvedSlugs } = input
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
    if (solvedSlugs.length) {
        lines.push(
            "",
            "Already solved here (do not recommend these again unless nothing else fits):",
            solvedSlugs.join(", "),
        )
    }
    lines.push(
        "",
        `Catalogue (${catalogue.length} problems, "slug | title | topic | difficulty"):`,
        ...catalogue.map((c) => `${c.slug} | ${c.title} | ${c.topic} | ${c.difficulty}`),
    )
    return lines.join("\n")
}
