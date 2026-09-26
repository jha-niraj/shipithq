import { COMPANY_TABS, TAB_LABELS } from "@repo/db/inbox-kinds"
import { InboxApp } from "@repo/ui/components/inbox/inbox-app"
import { listInboxAction, markAllReadAction, openInboxAction, replyAction, setReadAction } from "@/actions/inbox"
import { reportMessageAction } from "@/actions/moderation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Inbox | ShipItHQ Hiring" }

const EMPTY: Record<string, string> = {
    all: "Nothing here yet. Candidate replies, new results and team news land here.",
    candidates: "When a candidate replies to your team, it shows up here.",
    results: "New results from candidates show up here.",
    team: "Invites and changes to your team show up here.",
}

/** The company Inbox (plan/inbox IN-6). */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
    const { open } = await searchParams
    return (
        <InboxApp
            tabs={COMPANY_TABS.map((t) => ({ value: t, label: TAB_LABELS[t] }))}
            actions={{ list: listInboxAction, open: openInboxAction, setRead: setReadAction, markAllRead: markAllReadAction, reply: replyAction, report: reportMessageAction }}
            initialOpenId={open ?? null}
            empty={EMPTY}
        />
    )
}
