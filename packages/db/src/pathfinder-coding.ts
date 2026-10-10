// ─────────────────────────────────────────────────────────────────────────────
// Which Practice problems verify a Pathfinder goal's coding (plan/pathfinder
// PF-17). Pure: the caller loads the candidates (ready, active DSA problems)
// with its own client, so the worker and the backfill script pick the same way.
//
// A problem scores by how many of its tag and title words appear in the goal's
// title and topic titles; tags count double. A DSA goal always gets problems
// (any DSA problem fits it, the overlap only ranks them). Any other goal needs
// a problem sharing two tag words with it, or it gets none, and its
// verification has no coding section.
// ─────────────────────────────────────────────────────────────────────────────

export interface CodingCandidate {
    id: string
    title: string
    tags: string[]
    difficulty: string
    sortOrder: number
}

export interface CodingGoal {
    title: string
    category: string
    topics: string[]
}

/** How many problems a verification gets: one EASY and two MEDIUM where possible. */
export const VERIFICATION_PROBLEM_COUNT = 3

// Words too generic to say two things are about the same topic. "design"
// would tie an LRU-cache problem to every system design goal.
const STOP = new Set([
    "the", "and", "for", "with", "into", "from", "your", "how", "what", "using", "use", "basic", "basics",
    "intro", "introduction", "advanced", "fundamental", "fundamentals", "concept", "concepts", "problem",
    "problems", "data", "structure", "structures", "design", "manipulation", "place", "practice", "part",
    "day", "learn", "learning", "understanding", "build", "building", "working", "common", "pattern", "patterns",
    "first", "search", "algorithm", "processing", "time", "real", "world", "case", "studies", "high", "scale",
])

// Short forms a topic title uses for what a tag spells out.
const ALIASES: Record<string, string[]> = {
    dp: ["dynamic", "programming"],
    bfs: ["breadth", "first", "search"],
    dfs: ["depth", "first", "search"],
    bst: ["binary", "search", "tree"],
    hashmap: ["hashing", "hash"],
    hashtable: ["hashing", "hash"],
    pq: ["heap", "priority", "queue"],
    trie: ["tries"],
}

function words(text: string): string[] {
    const out: string[] = []
    for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
        if (!raw) continue
        for (const w of [raw, ...(ALIASES[raw] ?? [])]) {
            const singular = w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w
            if (singular.length >= 3 && !STOP.has(singular) && !STOP.has(w)) out.push(singular)
        }
    }
    return out
}

function score(p: CodingCandidate, goalWords: Set<string>): { s: number; tagHits: number } {
    const tagWords = new Set(p.tags.flatMap(words))
    const titleWords = new Set(words(p.title))
    let s = 0, tagHits = 0
    for (const w of tagWords) if (goalWords.has(w)) { s += 2; tagHits++ }
    for (const w of titleWords) if (!tagWords.has(w) && goalWords.has(w)) s += 1
    return { s, tagHits }
}

/**
 * Outside DSA one shared word is usually a coincidence ("windows" in a rate
 * limiting goal, "B-tree" in an indexing one), so a problem has to share two
 * different tag words with the goal before it can verify it.
 */
const MIN_TAG_HITS_OUTSIDE_DSA = 2

/** The problem ids for a goal's coding section, best first; empty when none fit. */
export function pickVerificationProblems(candidates: CodingCandidate[], goal: CodingGoal): string[] {
    const goalWords = new Set(words([goal.title, ...goal.topics].join(" ")))
    const ranked = candidates
        .map((p) => ({ p, ...score(p, goalWords) }))
        .filter((x) => goal.category === "DSA" || x.tagHits >= MIN_TAG_HITS_OUTSIDE_DSA)
        .sort((a, b) => b.s - a.s || a.p.sortOrder - b.p.sortOrder || a.p.id.localeCompare(b.p.id))

    const picked: string[] = []
    const take = (difficulty: string | null, n: number) => {
        for (const { p } of ranked) {
            if (picked.length >= VERIFICATION_PROBLEM_COUNT || n <= 0) return
            if (picked.includes(p.id) || (difficulty && p.difficulty !== difficulty)) continue
            picked.push(p.id)
            n--
        }
    }
    take("EASY", 1)
    take("MEDIUM", 2)
    take(null, VERIFICATION_PROBLEM_COUNT)
    return picked
}
