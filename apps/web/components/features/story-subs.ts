/**
 * The sub-heading of each feature page's "How it works" story (plan/web/story ST-8). Kept out of
 * stories.tsx, a client module, so the server page can read it; the stories read it from here.
 */
export const STORY_SUBS: Record<string, string> = {
    practice: "One problem from the catalogue, Two Sum, from picking how to work to the verdict.",
    projects: "One blueprint, URL Shortener with Click Analytics, from its first task to the end of a sprint.",
    mock: "One interview, from setting it up to its scores.",
    ai: "One resume, from importing it to a public link.",
    jobs: "One listing, Backend Engineer, Trace Ingestion, from its match to sending your results.",
}
