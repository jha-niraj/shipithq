/**
 * Fuzzy matching for search boxes - ported from synchq for the Inbox switcher (manual-pass R8-5).
 *
 * A plain `includes()` fails the moment a user types a label without its spaces
 * - "mytasks" does not substring-match "My Tasks" - which is exactly the class
 * of miss this replaces. Matching is substring-first (fast path, big score) and
 * falls back to subsequence with consecutive/word-boundary bonuses, so typos and
 * squashed words still land.
 */

/**
 * Levenshtein distance, abandoned as soon as it provably exceeds `max`.
 *
 * Only ever called on a short query against one short word, and it bails on the
 * length difference first, so the quadratic worst case is never reached in
 * practice. Returns `max + 1` to mean "further away than we care about".
 */
function editDistanceWithin(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
        const row = [i]
        let rowMin = i
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            const v = Math.min(
                (row[j - 1] ?? 0) + 1,          // insertion
                (prev[j] ?? 0) + 1,             // deletion
                (prev[j - 1] ?? 0) + cost,      // substitution
            )
            row.push(v)
            if (v < rowMin) rowMin = v
        }
        // Every remaining path goes through this row, so if the whole row is
        // already over budget the final distance must be too.
        if (rowMin > max) return max + 1
        prev = row
    }
    return prev[b.length] ?? max + 1
}

/** Typo budget: none for very short queries, where it would only add noise. */
function typoBudget(query: string): number {
    if (query.length < 4) return 0
    return query.length >= 7 ? 2 : 1
}

/**
 * Score `text` against `query`. 0 means no match at all.
 *
 * Three tiers, each an order of magnitude below the last, so a better kind of
 * match always outranks a worse one no matter how long the strings are:
 *   1. substring  (~1000+) - "task" in "My Tasks"
 *   2. subsequence   (~5-60) - "mytasks" in "My Tasks", squashed spaces
 *   3. near-miss      (2-6) - "calender" vs "Calendar", one or two typos
 */
export function fuzzyScore(text: string, query: string): number {
    if (!query) return 1
    const t = text.toLowerCase()
    const q = query.toLowerCase()
    const idx = t.indexOf(q)
    if (idx !== -1) {
        const boundary = idx === 0 || /[\s/\-_]/.test(t[idx - 1] ?? "")
        return 1000 - idx + (boundary ? 200 : 0)
    }
    let ti = 0, score = 0, consecutive = 0, prev = -2
    let subsequence = true
    for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi]!
        let found = -1
        for (let k = ti; k < t.length; k++) { if (t[k] === c) { found = k; break } }
        if (found === -1) { subsequence = false; break }
        consecutive = found === prev + 1 ? consecutive + 1 : 0
        const boundary = found === 0 || /[\s/\-_]/.test(t[found - 1] ?? "")
        score += 1 + consecutive * 3 + (boundary ? 5 : 0)
        prev = found
        ti = found + 1
    }
    if (subsequence) return score

    // Nothing matched in order, so the query is likely misspelled rather than
    // abbreviated. Compare it against the whole label and each of its words -
    // "invoics" should still find "Invoices" inside "finance/invoices".
    const budget = typoBudget(q)
    if (budget === 0) return 0
    let best = budget + 1
    for (const word of [t, ...t.split(/[\s/\-_]+/)]) {
        if (!word) continue
        const d = editDistanceWithin(q, word, budget)
        if (d < best) best = d
    }
    return best <= budget ? (budget - best + 1) * 2 : 0
}

/**
 * Synonym clusters for a school's conversations, so typing "parents" also finds "guardian" chats. Matches score at a
 * reduced weight and only when there is no direct hit.
 */
const SYNONYM_CLUSTERS: string[][] = [
    ["parent", "parents", "guardian", "guardians", "mother", "father", "family"],
    ["teacher", "teachers", "staff", "sir", "miss", "maam"],
    ["student", "students", "pupil", "pupils", "class", "section", "group", "groups"],
    ["fee", "fees", "billing", "payment", "payments", "dues"],
    ["exam", "exams", "test", "tests", "result", "results", "marks"],
    ["homework", "classwork", "work", "assignment", "assignments"],
]

const SYN_WEIGHT = 0.4

export function expandSynonyms(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
    if (words.length === 0) return []
    const out = new Set<string>()
    for (const w of words) {
        for (const cluster of SYNONYM_CLUSTERS) {
            if (cluster.some((term) => term.includes(w) || w.includes(term))) {
                for (const term of cluster) out.add(term)
            }
        }
    }
    for (const w of words) out.delete(w)
    return [...out]
}

/** Best score across secondary fields, falling back to synonym expansion. */
export function bestKeywordScore(keywords: string[], q: string): number {
    if (keywords.length === 0) return 0
    let best = 0
    for (const k of keywords) best = Math.max(best, fuzzyScore(k, q))
    if (best === 0) {
        for (const term of expandSynonyms(q)) {
            for (const k of keywords) {
                const s = fuzzyScore(k, term)
                if (s > 0) best = Math.max(best, s * SYN_WEIGHT)
            }
        }
    }
    return best
}

/**
 * Score one candidate. The primary label gets a ~3x multiplier so a literal name
 * hit ("Fees") always beats a section/keyword/synonym hit on another entry.
 */
export function scoreCandidate(label: string, keywords: readonly (string | undefined)[], q: string): number {
    const primary = fuzzyScore(label, q)
    const rest = bestKeywordScore(keywords.filter((k): k is string => Boolean(k)), q)
    return Math.max(primary * 3, rest)
}
