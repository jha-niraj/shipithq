"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "@repo/auth/client"
import { AIChatPanel, type AIChatSessionApi } from "@repo/ui/components/ai-chat/ai-chat-panel"
import type { EmptyStateContent } from "@repo/ui/components/ai-chat/chat-empty-state"
import { deleteHiringChat, getHiringAiUsage, getHiringChat, listHiringChats, setHiringMessageFeedback } from "@/actions/ai/hiring-ai.action"
import { useHiringAIStore } from "./hiring-ai-store"
import { HiringProposalCard } from "./hiring-proposal-card"

/*
 * The company AI panel (plan/hiring-app HA-11): the shared `AIChatPanel` with
 * this app's store, its chat route, the member's own conversations and the
 * company's monthly allowance under the composer. It reads only this company's
 * data; that is enforced in the route, not here.
 */

const SESSIONS: AIChatSessionApi = {
    list: listHiringChats,
    get: getHiringChat,
    remove: deleteHiringChat,
    feedback: setHiringMessageFeedback,
}

const EMPTY_STATE: EmptyStateContent = {
    subtitle: { docked: "Ask about your roles and candidates.", wide: "Ask about your roles, candidates and results." },
    create: [],
    ask: [
        { label: "Who scored highest in DSA for a role?", prompt: "For each of our open roles, who scored highest in the DSA round?" },
        { label: "Which candidates haven't been decided yet?", prompt: "Which candidates have sent us results that we haven't invited or declined yet?" },
        { label: "Summarise this week's results", prompt: "Summarise the results candidates sent us this week, role by role." },
        { label: "Which round do most candidates fail?", prompt: "Across our roles, which round do most candidates fail, and by how much?" },
    ],
}

/** A short label for the page the member is on: only the route and the title. */
function pageContext(pathname: string): { route: string; title: string } {
    let title = ""
    if (typeof document !== "undefined" && document.title) title = document.title.replace(/\s*[|\-]\s*ShipItHQ.*$/i, "").trim()
    if (!title) {
        title = pathname.split("/").filter(Boolean).filter((s) => !/^[0-9]+$/.test(s) && !/^(c[a-z0-9]{20,}|[0-9a-f-]{16,})$/i.test(s))
            .map((s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(" > ") || "Home"
    }
    return { route: pathname || "/", title }
}

export function HiringAIPanel() {
    const pathname = usePathname()
    const page = useMemo(() => pageContext(pathname), [pathname])
    const extraBody = useMemo(() => ({ page }), [page])
    const { data: session } = useSession()
    const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? ""

    const [usage, setUsage] = useState<{ left: number; cap: number } | null>(null)
    const refreshUsage = useCallback(() => {
        void getHiringAiUsage().then((r) => { if (r.success) setUsage({ left: r.left, cap: r.cap }) }).catch(() => undefined)
    }, [])
    useEffect(() => { refreshUsage() }, [refreshUsage])

    return (
        <AIChatPanel
            useStore={useHiringAIStore}
            endpoint="/api/ai/chat"
            sessions={SESSIONS}
            uploadEndpoint="/api/ai/documents"
            extraBody={extraBody}
            pageTitle={null}
            title="Company AI"
            emptyState={EMPTY_STATE}
            firstName={firstName}
            renderProposal={(args) => <HiringProposalCard {...args} />}
            placeholder="Ask about your roles, candidates or results"
            composerLabel="Message the company AI"
            usage={usage}
            capReachedText={`This month's ${usage?.cap ?? 300} questions are used. It resets on the 1st.`}
            onTurnEnd={refreshUsage}
        />
    )
}

export default HiringAIPanel
