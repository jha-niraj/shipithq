import { eq } from "drizzle-orm"
import { db, osGitHubProfiles } from "@repo/db"
import { getGitHubCalendar } from "@/lib/github/contributions"
import { GitHubCalendarCard, GitHubCalendarSkeleton } from "./github-calendar-card"

/**
 * GitHub contributions on Home (plan/home HOME-10), under the ShipItHQ activity, for
 * users who connected GitHub in Settings > Integrations. Not connected: nothing, no nag.
 */

/** The connected GitHub username, or null. Cheap: the page asks before streaming the card. */
export async function connectedGitHub(userId: string): Promise<string | null> {
    const [row] = await db.select({ username: osGitHubProfiles.githubUsername }).from(osGitHubProfiles).where(eq(osGitHubProfiles.userId, userId))
    return row?.username ?? null
}

export async function GitHubActivity({ username }: { username: string }) {
    const r = await getGitHubCalendar(username)
    return <GitHubCalendarCard username={username} days={r.ok ? r.calendar?.days ?? [] : []} total={r.ok ? r.calendar?.total ?? 0 : 0} failed={!r.ok || !r.calendar} />
}

export { GitHubCalendarSkeleton }
