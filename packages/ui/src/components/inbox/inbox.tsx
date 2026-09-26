"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, CheckCheck, ExternalLink, Flag, Mail, MailOpen } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { InlineLoader } from "../ui/inline-loader"
import { Shimmer, ShimmerStyles } from "../skeleton-kit"
import { ReportDialog } from "../moderation/report-dialog"
import { kindIcon } from "./inbox-icons"
import { relativeTime } from "./time"
import type { InboxActor, InboxEntry, InboxMessage, InboxTab } from "./types"

/*
 * The Inbox (plan/inbox IN-3), shared by the student app and the company app.
 * A list on the left (header with an Unread switch and "mark all read", tabs,
 * items) and the open item on the right (back, breadcrumb, Open, the title and
 * chips, the conversation and a reply box). Data and actions come in as props.
 *
 * Keys, when focus isn't in a text field: j/k or the arrows move, Enter opens,
 * e toggles read, Esc goes back to the list on small screens.
 */

export type { InboxActor, InboxEntry, InboxMessage, InboxTab }

function Initials({ actor, className }: { actor: InboxActor | null; className?: string }) {
    return (
        <span aria-hidden className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200", className)}>
            {actor?.initials ?? "S"}
        </span>
    )
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** The two panes. Below lg they take turns: the list, or the open item. */
export function InboxLayout({ list, detail, showDetail }: { list: ReactNode; detail: ReactNode; showDetail: boolean }) {
    return (
        <div className="flex h-screen min-h-0">
            <div className={cn("min-h-0 w-full shrink-0 flex-col border-neutral-200 lg:flex lg:w-[28rem] lg:border-r dark:border-neutral-800", showDetail ? "hidden" : "flex")}>{list}</div>
            <div className={cn("min-h-0 min-w-0 flex-1 flex-col lg:flex", showDetail ? "flex" : "hidden")}>{detail}</div>
        </div>
    )
}

// ── List ─────────────────────────────────────────────────────────────────────

export function InboxList({
    title = "Inbox", tabs, tab, onTab, unreadOnly, onUnreadOnly, onMarkAllRead, markingAll,
    entries, selectedId, onSelect, onToggleRead, loading, empty, footer,
}: {
    title?: string
    tabs: InboxTab[]
    tab: string
    onTab: (value: string) => void
    unreadOnly: boolean
    onUnreadOnly: (value: boolean) => void
    onMarkAllRead: () => void
    markingAll?: boolean
    entries: InboxEntry[]
    selectedId: string | null
    onSelect: (entry: InboxEntry) => void
    onToggleRead: (entry: InboxEntry) => void
    loading: boolean
    empty: ReactNode
    footer?: ReactNode
}) {
    const listRef = useRef<HTMLOListElement>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
            if (e.metaKey || e.ctrlKey || e.altKey) return
            const i = entries.findIndex((x) => x.id === selectedId)
            const move = (d: number) => {
                const next = entries[Math.min(entries.length - 1, Math.max(0, (i < 0 ? -1 : i) + d))]
                if (!next) return
                e.preventDefault()
                onSelect(next)
                listRef.current?.querySelector(`[data-entry="${next.id}"]`)?.scrollIntoView({ block: "nearest" })
            }
            if (e.key === "j" || e.key === "ArrowDown") move(1)
            else if (e.key === "k" || e.key === "ArrowUp") move(-1)
            else if (e.key === "e" && i >= 0) { e.preventDefault(); onToggleRead(entries[i]!) }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [entries, selectedId, onSelect, onToggleRead])

    return (
        <>
            <div className="shrink-0 px-5 pt-4">
                <div className="flex items-center gap-3">
                    <h1 className="flex-1 text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                        <Switch checked={unreadOnly} onCheckedChange={onUnreadOnly} aria-label="Unread only" />
                        Unread
                    </label>
                    <button type="button" onClick={onMarkAllRead} disabled={markingAll} title="Mark all read" aria-label="Mark all read" className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        {markingAll ? <InlineLoader size="sm" /> : <CheckCheck className="h-4 w-4" />}
                    </button>
                </div>
                <div role="tablist" aria-label="Inbox filters" className="mt-3 flex gap-5 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
                    {tabs.map((t) => (
                        <button
                            key={t.value}
                            role="tab"
                            type="button"
                            aria-selected={t.value === tab}
                            onClick={() => onTab(t.value)}
                            className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm", t.value === tab ? "border-neutral-900 font-medium text-neutral-900 dark:border-white dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200")}
                        >
                            {t.label}
                            {t.count ? <span className="rounded-full bg-neutral-900 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums dark:bg-white dark:text-neutral-900">{t.count > 99 ? "99+" : t.count}</span> : null}
                        </button>
                    ))}
                </div>
            </div>

            <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto" aria-label={title}>
                {loading && entries.length === 0 ? (
                    <InboxListSkeleton />
                ) : entries.length === 0 ? (
                    <li className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">{empty}</li>
                ) : entries.map((e) => (
                    <li key={e.id} data-entry={e.id}>
                        <InboxItem entry={e} selected={e.id === selectedId} onSelect={() => onSelect(e)} onToggleRead={() => onToggleRead(e)} />
                    </li>
                ))}
            </ol>
            {footer}
        </>
    )
}

export function InboxItem({ entry: e, selected, onSelect, onToggleRead }: { entry: InboxEntry; selected: boolean; onSelect: () => void; onToggleRead: () => void }) {
    const Icon = kindIcon(e.kind)
    return (
        <div
            role="button"
            tabIndex={0}
            aria-current={selected ? "true" : undefined}
            onClick={onSelect}
            onKeyDown={(k) => { if (k.key === "Enter") onSelect() }}
            className={cn("group flex cursor-pointer gap-3 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-900", selected ? "bg-neutral-100 dark:bg-neutral-800/70" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/70")}
        >
            <div className="relative">
                <Initials actor={e.actor} />
                {e.unread && <span aria-label="Unread" className="absolute -left-1.5 top-3 h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />}
            </div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm leading-snug text-neutral-800 dark:text-neutral-200", e.unread && "text-neutral-950 dark:text-white")}>
                    {e.actor && <span className="font-semibold text-neutral-950 dark:text-white">{e.actor.name} </span>}
                    <span className={cn(e.unread && "font-medium")}>{e.title}</span>
                </p>
                {e.preview && <p className="mt-0.5 line-clamp-1 text-sm text-neutral-600 dark:text-neutral-400">{e.preview}</p>}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {e.context && (
                        <>
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                            <span className="truncate">{e.context.label}</span>
                            <span aria-hidden>·</span>
                        </>
                    )}
                    <time dateTime={e.at} className="shrink-0">{relativeTime(e.at)}</time>
                </p>
            </div>
            <button
                type="button"
                onClick={(k) => { k.stopPropagation(); onToggleRead() }}
                title={e.unread ? "Mark read" : "Mark unread"}
                aria-label={e.unread ? "Mark read" : "Mark unread"}
                className="h-7 w-7 shrink-0 rounded-md p-1.5 text-neutral-400 opacity-60 hover:bg-neutral-200 hover:text-neutral-800 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-white"
            >
                {e.unread ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
            </button>
        </div>
    )
}

export function InboxListSkeleton({ rows = 7 }: { rows?: number }) {
    return (
        <>
            <ShimmerStyles />
            {Array.from({ length: rows }).map((_, i) => (
                <li key={i} className="flex gap-3 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-900">
                    <Shimmer className="h-8 w-8 rounded-full" delay={i * 0.03} />
                    <div className="flex-1 space-y-2">
                        <Shimmer className="h-3.5 w-4/5" delay={0.02 + i * 0.03} />
                        <Shimmer className="h-3 w-3/5" delay={0.04 + i * 0.03} />
                        <Shimmer className="h-2.5 w-2/5" delay={0.06 + i * 0.03} />
                    </div>
                </li>
            ))}
        </>
    )
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function InboxDetail({
    onBack, breadcrumb, open, title, chips, body, conversation, reply, loading, children, headerActions, onReportMessage,
}: {
    onBack: () => void
    breadcrumb: string | null
    open?: { href: string; label: string } | null
    title: string
    chips?: ReactNode[]
    /** A notification's text, when there's no conversation. */
    body?: string | null
    conversation?: InboxMessage[] | null
    reply?: { placeholder: string; onSend: (text: string) => Promise<boolean>; disabledReason?: string | null } | null
    loading?: boolean
    children?: ReactNode
    /** Extra buttons in the header, before "open" (e.g. Block). */
    headerActions?: ReactNode
    /** Report a message from the other side; resolves to an error or null. */
    onReportMessage?: (messageId: string, reason: string, details: string) => Promise<string | null>
}) {
    const end = useRef<HTMLDivElement>(null)
    useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [conversation?.length])
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null
            if (e.key === "Escape" && !(t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT"))) onBack()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onBack])

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-5 dark:border-neutral-800">
                <button type="button" onClick={onBack} aria-label="Back to the list" className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"><ArrowLeft className="h-4 w-4" /></button>
                {breadcrumb && (
                    <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-neutral-700 dark:text-neutral-300">
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                        <span className="truncate">{breadcrumb}</span>
                    </p>
                )}
                {!breadcrumb && <span className="flex-1" />}
                {headerActions}
                {open && (
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a href={open.href}><ExternalLink className="h-4 w-4" /> {open.label}</a>
                    </Button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-6 py-8">
                    {loading ? (
                        <InboxDetailSkeleton />
                    ) : (
                        <>
                            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">{title}</h2>
                            {chips?.length ? <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-700 dark:text-neutral-300">{chips}</div> : null}
                            {body && <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">{body}</p>}
                            {children}
                            {conversation && (
                                <section className="mt-8" aria-label="Conversation">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Conversation</p>
                                    <ol className="mt-4 space-y-5">
                                        {conversation.map((m) => (
                                            <li key={m.id} className="flex gap-3">
                                                <Initials actor={m.author} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm"><span className="font-semibold text-neutral-900 dark:text-white">{m.mine ? "You" : m.author.name}</span> <time dateTime={m.at} className="text-xs text-neutral-500">{relativeTime(m.at)}</time></p>
                                                        {!m.mine && onReportMessage && (
                                                            <ReportDialog kind="MESSAGE" onSubmit={(reason, details) => onReportMessage(m.id, reason, details)}
                                                                trigger={<button type="button" aria-label="Report this message" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"><Flag className="h-3.5 w-3.5" /></button>} />
                                                        )}
                                                    </div>
                                                    <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200">{m.body}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                    <div ref={end} />
                                </section>
                            )}
                            {reply && <ReplyBox {...reply} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

/** The reply box: Cmd/Ctrl+Enter sends. A failed send keeps the text. */
export function ReplyBox({ placeholder, onSend, disabledReason, actionLabel = "Reply" }: { placeholder: string; onSend: (text: string) => Promise<boolean>; disabledReason?: string | null; actionLabel?: string }) {
    const [text, setText] = useState("")
    const [sending, setSending] = useState(false)
    const send = async () => {
        const t = text.trim()
        if (!t || sending || disabledReason) return
        setSending(true)
        const ok = await onSend(t)
        setSending(false)
        if (ok) setText("")
    }
    if (disabledReason) return <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">{disabledReason}</p>
    return (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-600">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 4000))}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() } }}
                placeholder={placeholder}
                rows={3}
                aria-label="Reply"
                className="block w-full resize-none rounded-t-xl bg-transparent px-4 pt-3 text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none dark:text-white"
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
                <span className="text-xs text-neutral-500">Cmd/Ctrl+Enter to send</span>
                <Button size="sm" onClick={() => void send()} disabled={!text.trim() || sending} className="gap-1.5">{sending && <InlineLoader size="sm" />} {actionLabel}</Button>
            </div>
        </div>
    )
}

export function InboxDetailSkeleton() {
    return (
        <div className="space-y-4">
            <ShimmerStyles />
            <Shimmer className="h-7 w-2/3" />
            <div className="flex gap-4"><Shimmer className="h-5 w-20" delay={0.03} /><Shimmer className="h-5 w-28" delay={0.05} /><Shimmer className="h-5 w-16" delay={0.07} /></div>
            <Shimmer className="mt-6 h-3 w-24" delay={0.09} />
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3"><Shimmer className="h-8 w-8 rounded-full" delay={0.1 + i * 0.03} /><div className="flex-1 space-y-2"><Shimmer className="h-3.5 w-32" delay={0.11 + i * 0.03} /><Shimmer className="h-3.5 w-full" delay={0.12 + i * 0.03} /></div></div>
            ))}
            <Shimmer className="h-28 w-full rounded-xl" delay={0.2} />
        </div>
    )
}

/** A metadata chip under the title, like the reference's status / person / date row. */
export function InboxChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
    return <span className="inline-flex items-center gap-1.5">{icon}{children}</span>
}

/** The empty right pane on wide screens. */
export function InboxNothingOpen({ text = "Choose something from your inbox." }: { text?: string }) {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500 dark:text-neutral-400">{text}</div>
}
