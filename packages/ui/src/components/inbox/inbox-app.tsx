"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Ban } from "lucide-react"
import { Button } from "../ui/button"
import { InlineLoader } from "../ui/inline-loader"
import { toast } from "../ui/sonner"
import { InboxChip, InboxDetail, InboxLayout, InboxList, InboxNothingOpen } from "./inbox"
import { INBOX_CHANGED_EVENT, type InboxActions, type InboxEntry, type InboxOpened, type InboxTab } from "./types"

/*
 * The whole Inbox screen (plan/inbox IN-5, IN-6): state and wiring on top of the
 * layout, the same for the student app and the company app. Each app passes its
 * tabs and its server actions; nothing here knows which side it's on.
 */

const changed = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(INBOX_CHANGED_EVENT)) }

export function InboxApp({ tabs, actions, initialOpenId = null, empty }: {
    tabs: InboxTab[]
    actions: InboxActions
    initialOpenId?: string | null
    empty: Record<string, string>
}) {
    const [tab, setTab] = useState(tabs[0]?.value ?? "all")
    const [unreadOnly, setUnreadOnly] = useState(false)
    const [entries, setEntries] = useState<InboxEntry[]>([])
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string | null>(initialOpenId)
    const [opened, setOpened] = useState<InboxOpened | null>(null)
    const [opening, setOpening] = useState(false)
    const [markingAll, setMarkingAll] = useState(false)
    const openSeq = useRef(0)

    const load = useCallback(async () => {
        setLoading(true)
        const r = await actions.list(tab, unreadOnly)
        setLoading(false)
        if (!r.success) { toast.error(r.error); return }
        setEntries(r.data.entries)
        setCounts(r.data.tabCounts)
    }, [actions, tab, unreadOnly])

    useEffect(() => { void load() }, [load])
    // Something new may have arrived while away.
    useEffect(() => {
        const onFocus = () => { void load() }
        window.addEventListener("focus", onFocus)
        const t = window.setInterval(() => { if (document.visibilityState === "visible") void load() }, 60_000)
        return () => { window.removeEventListener("focus", onFocus); window.clearInterval(t) }
    }, [load])

    const open = useCallback(async (id: string) => {
        setSelected(id)
        const mine = ++openSeq.current
        setOpening(true)
        const r = await actions.open(id)
        if (mine !== openSeq.current) return
        setOpening(false)
        if (!r.success) { toast.error(r.error); setOpened(null); return }
        setOpened(r.data)
        setEntries((es) => es.map((e) => (e.id === id ? { ...e, unread: false } : e)))
        changed()
        void actions.list(tab, unreadOnly).then((x) => { if (x.success) setCounts(x.data.tabCounts) })
    }, [actions, tab, unreadOnly])

    useEffect(() => { if (initialOpenId) void open(initialOpenId) }, [initialOpenId, open])

    const toggleRead = useCallback(async (e: InboxEntry) => {
        setEntries((es) => es.map((x) => (x.id === e.id ? { ...x, unread: !e.unread } : x)))
        const r = await actions.setRead(e.id, e.unread)
        if (!r.success) { toast.error(r.error); void load(); return }
        changed()
        void actions.list(tab, unreadOnly).then((x) => { if (x.success) setCounts(x.data.tabCounts) })
    }, [actions, load, tab, unreadOnly])

    const markAll = async () => {
        setMarkingAll(true)
        const r = await actions.markAllRead(tab)
        setMarkingAll(false)
        if (!r.success) { toast.error(r.error); return }
        changed()
        void load()
    }

    const reply = async (text: string) => {
        if (!opened?.threadId) return false
        const r = await actions.reply(opened.threadId, text)
        if (!r.success) { toast.error(r.error); return false }
        setOpened((o) => (o ? { ...o, conversation: [...(o.conversation ?? []), r.data] } : o))
        changed()
        return true
    }

    const back = useCallback(() => { setSelected(null); setOpened(null) }, [])

    const [blocking, setBlocking] = useState(false)
    const toggleBlock = async () => {
        if (!opened?.threadId || !opened.block || !actions.setBlocked) return
        const next = !opened.block.blocked
        setBlocking(true)
        const r = await actions.setBlocked(opened.threadId, next)
        setBlocking(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success(next ? `Blocked ${opened.block.companyName}. It can't message you.` : `Unblocked ${opened.block.companyName}.`)
        // Re-open, so the reply box and the button match the new state.
        if (selected) void open(selected)
    }
    const reportMessage = actions.report
        ? async (messageId: string, reason: string, details: string) => {
            const r = await actions.report!(messageId, reason, details)
            return r.success ? null : r.error
        }
        : undefined

    return (
        <InboxLayout
            showDetail={Boolean(selected)}
            list={
                <InboxList
                    tabs={tabs.map((t) => ({ ...t, count: counts[t.value] }))}
                    tab={tab}
                    onTab={(v) => { setTab(v); back() }}
                    unreadOnly={unreadOnly}
                    onUnreadOnly={setUnreadOnly}
                    onMarkAllRead={() => void markAll()}
                    markingAll={markingAll}
                    entries={entries}
                    selectedId={selected}
                    onSelect={(e) => void open(e.id)}
                    onToggleRead={(e) => void toggleRead(e)}
                    loading={loading}
                    empty={unreadOnly ? "Nothing unread here." : (empty[tab] ?? "Nothing here yet.")}
                />
            }
            detail={
                selected ? (
                    <InboxDetail
                        onBack={back}
                        loading={opening || !opened}
                        breadcrumb={opened?.breadcrumb ?? null}
                        open={opened?.open ?? null}
                        title={opened?.title ?? ""}
                        chips={opened?.chips.map((c) => <InboxChip key={c}>{c}</InboxChip>)}
                        body={opened?.body ?? null}
                        conversation={opened?.conversation ?? null}
                        reply={opened?.reply ? { placeholder: opened.reply.placeholder, disabledReason: opened.reply.disabledReason, onSend: reply } : null}
                        onReportMessage={opened?.conversation ? reportMessage : undefined}
                        headerActions={opened?.block && actions.setBlocked ? (
                            <Button variant="ghost" size="sm" onClick={() => void toggleBlock()} disabled={blocking} className="gap-1.5 text-neutral-600 dark:text-neutral-400">
                                {blocking ? <InlineLoader size="sm" /> : <Ban className="h-4 w-4" />} {opened.block.blocked ? "Unblock" : "Block"}
                            </Button>
                        ) : null}
                    />
                ) : <InboxNothingOpen />
            }
        />
    )
}
