import type { SendRow } from "@/lib/sends"

/*
 * Sorting and filtering the candidate list (plan/hiring-rounds HR-18). Pure and
 * client-safe, so the page and its check use the same code. A candidate without
 * a score on the sorted round goes last.
 */

export type SendSort = "sent" | "average" | `round:${number}`

export function sortSends(rows: SendRow[], sort: SendSort, filter: { round: number | null; min: number }): SendRow[] {
    const key = (r: SendRow) =>
        sort === "sent" ? new Date(r.sentAt).getTime()
            : sort === "average" ? (r.average ?? -1)
                : (r.scores[Number(sort.slice(6))]?.score ?? -1)
    return rows
        .filter((r) => filter.round === null || (r.scores[filter.round]?.score ?? -1) >= filter.min)
        .sort((a, b) => key(b) - key(a))
}
