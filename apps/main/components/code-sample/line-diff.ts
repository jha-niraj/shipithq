/*
 * A line diff for the code viewer's Compare (plan/long-jobs-vercel LJV-4): the longest common
 * subsequence of lines, walked into a unified list. Files here are a few hundred lines at
 * most, so the plain O(n x m) table is fine and needs no dependency.
 */

export type DiffLine = { kind: "same" | "added" | "removed"; text: string }

export function lineDiff(before: string, after: string): DiffLine[] {
    const a = before.replace(/\n$/, "").split("\n")
    const b = after.replace(/\n$/, "").split("\n")
    if (!before) return b.map((text) => ({ kind: "added", text }))
    if (!after) return a.map((text) => ({ kind: "removed", text }))
    const n = a.length
    const m = b.length
    // lcs[i][j]: the longest common run of a[i..] and b[j..].
    const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
        }
    }
    const out: DiffLine[] = []
    let i = 0
    let j = 0
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            out.push({ kind: "same", text: a[i]! })
            i++
            j++
        } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
            out.push({ kind: "removed", text: a[i++]! })
        } else {
            out.push({ kind: "added", text: b[j++]! })
        }
    }
    while (i < n) out.push({ kind: "removed", text: a[i++]! })
    while (j < m) out.push({ kind: "added", text: b[j++]! })
    return out
}

/** "3-5,12" to the set {3, 4, 5, 12}. Bad parts are ignored. */
export function parseLines(spec: string | undefined): Set<number> {
    const out = new Set<number>()
    for (const part of (spec ?? "").split(",")) {
        const [from, to] = part.trim().split("-").map((x) => Number(x))
        if (!from || from < 1) continue
        const end = to && to >= from ? Math.min(to, from + 500) : from
        for (let n = from; n <= end; n++) out.add(n)
    }
    return out
}
