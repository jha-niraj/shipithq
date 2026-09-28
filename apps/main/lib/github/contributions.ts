import "server-only"
import { unstable_cache } from "next/cache"
import type { Activity } from "@repo/ui/components/contribution-graph"

/**
 * A GitHub user's contribution calendar for the last year (plan/home HOME-10), from
 * GitHub's GraphQL API with the app's token (the same `GITHUB_NIRAJ_JHA_TOKEN` the rest
 * of the GitHub integration uses). Cached a day per username; public contributions only.
 */

const LEVEL: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 }

type Calendar = { total: number; days: Activity[] }

type GraphQLResponse = {
    data?: { user?: { contributionsCollection?: { contributionCalendar?: {
        totalContributions: number
        weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[]
    } } } | null }
    errors?: { message: string }[]
}

async function fetchCalendar(username: string): Promise<Calendar | null> {
    const token = process.env.GITHUB_NIRAJ_JHA_TOKEN
    if (!token) return null
    const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "ShipItHQ" },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
            query: `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
                totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }`,
            variables: { login: username },
        }),
    })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const body = (await res.json()) as GraphQLResponse
    const cal = body.data?.user?.contributionsCollection?.contributionCalendar
    if (!cal) return null
    return {
        total: cal.totalContributions,
        days: cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 })),
    }
}

export const getGitHubCalendar = unstable_cache(
    async (username: string): Promise<{ ok: true; calendar: Calendar | null } | { ok: false }> => {
        try {
            return { ok: true, calendar: await fetchCalendar(username) }
        } catch (error: unknown) {
            console.error("[github] contributions failed:", error instanceof Error ? error.message : error)
            return { ok: false }
        }
    },
    ["github-contributions-v1"],
    { revalidate: 86_400 },
)
