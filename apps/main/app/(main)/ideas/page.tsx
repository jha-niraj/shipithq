import { getIdeaBoard } from "@/actions/(main)/ideas/ideas.action"
import { IdeasClient } from "./_components/ideas-client"

export const metadata = {
    title: "Ideas | ShipItHQ",
    description: "Ask for features, courses and improvements, and vote on what we build next.",
}

// Votes change constantly and the page shows your own; never cache it.
export const dynamic = "force-dynamic"

/**
 * The app's Ideas board (plan/web/revamp REV-41). shipithq.com/ideas shows the same
 * list read-only and links here to post (`?post=1`) and vote (`#<id>`).
 */
export default async function IdeasPage() {
    const result = await getIdeaBoard({ sort: "top" })
    return <IdeasClient board={result.success ? result.board : null} error={result.success ? null : result.error} />
}
