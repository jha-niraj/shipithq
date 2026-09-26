import { STUDENT_TABS, TAB_LABELS } from "@repo/db/inbox-kinds"
import { InboxApp } from "@repo/ui/components/inbox/inbox-app"
import { listInboxAction, markAllReadAction, openInboxAction, replyAction, setReadAction } from "@/actions/inbox.action"
import { reportMessage, setThreadBlocked } from "@/actions/moderation.action"

export const dynamic = "force-dynamic"
export const metadata = { title: "Inbox | ShipItHQ" }

const EMPTY: Record<string, string> = {
    all: "Nothing here yet. Messages from companies and updates from ShipItHQ land here.",
    companies: "When a company writes to you or invites you, it shows up here.",
    rounds: "Scores, sends and decisions on your rounds show up here.",
    updates: "Reminders and news from ShipItHQ show up here.",
}

/** The student's Inbox (plan/inbox IN-5): company messages and every notification. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
    const { open } = await searchParams
    return (
        <InboxApp
            tabs={STUDENT_TABS.map((t) => ({ value: t, label: TAB_LABELS[t] }))}
            actions={{ list: listInboxAction, open: openInboxAction, setRead: setReadAction, markAllRead: markAllReadAction, reply: replyAction, report: reportMessage, setBlocked: setThreadBlocked }}
            initialOpenId={open ?? null}
            empty={EMPTY}
        />
    )
}
