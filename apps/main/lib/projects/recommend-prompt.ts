import type { OnboardingProfile } from "@repo/db"

// The prompt behind "Picked for you" on the projects hub (plan/projects, PJ-1).
//
// The model PROPOSES projects for this person rather than ranking a catalogue.
// A project idea carries no tests, so an invented one is safe, and one shaped to
// the hours and the history someone described beats the nearest row in a fixed
// list. The curated catalogue is still there to browse on the ideas page.

export const MAX_IDEAS = 6
export const MAX_WHY_CHARS = 100
export const MAX_TITLE_CHARS = 70
export const MAX_DESCRIPTION_CHARS = 320

export const IDEAS_SYSTEM = [
    "You propose projects for one specific person to build next, from what they told us about their building history.",
    "",
    "Return ONLY JSON: {\"items\":[{\"title\":\"...\",\"description\":\"...\",\"difficulty\":\"EASY|MEDIUM|HARD\",\"technologies\":[\"...\"],\"why\":\"...\"}]}",
    "",
    "Rules:",
    `- Exactly ${MAX_IDEAS} projects, best first.`,
    "- Size them to the hours they actually have. The first one must be finishable in a weekend for someone who has shipped nothing.",
    "- Respect what killed their last projects: scope means smaller with a clear finish, losing interest means closer to what they say they want.",
    "- Build on the stack they use, and let one or two stretch into the stack they want to learn.",
    "- Each one has to be a thing that runs, with a visible result they can show someone. No tutorials, no clones described as clones, no courses.",
    `- "title" is under ${MAX_TITLE_CHARS} characters and names the thing, not the topic.`,
    `- "description" is under ${MAX_DESCRIPTION_CHARS} characters: what it does, and what the hardest part will be.`,
    "- \"technologies\" is 2 to 5 concrete tools.",
    `- "why" is one line under ${MAX_WHY_CHARS} characters, addressed to them, saying what building it gives THEM.`,
    "- Punctuation: plain hyphens only, never an em dash or en dash.",
].join("\n")

export function buildIdeasUserMessage(input: {
    profile: OnboardingProfile
    builtTitles: string[]
}): string {
    const { profile, builtTitles } = input
    const lines = [
        "The builder, from their onboarding:",
        `- Level: ${profile.level}`,
        ...profile.facts.map((f) => `- ${f}`),
        ...(profile.strengths.length ? [`- Good at: ${profile.strengths.join("; ")}`] : []),
        ...(profile.gaps.length ? [`- Struggles with: ${profile.gaps.join("; ")}`] : []),
        ...(profile.goals.length ? [`- Wants: ${profile.goals.join("; ")}`] : []),
    ]
    if (builtTitles.length) {
        lines.push("", "Already building or built here (propose something else):", builtTitles.join("; "))
    }
    return lines.join("\n")
}
