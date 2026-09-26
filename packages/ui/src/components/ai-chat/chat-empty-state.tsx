"use client"

import { useEffect, useState } from "react"
import { ArrowRight, MessageSquareText } from "lucide-react"
import { AIGlyph, AIMark } from "../ui/ai-mark"
import { cn } from "../../lib/utils"
import { SuggestionGlyph, type GlyphKind } from "./ai-art"

// A new conversation, in gurukulhq's launcher layout (plan/ai-chat, AC-7): who it is
// talking to, what it can see, things it can MAKE, then questions it can answer.
// Everything sends straight away - a card that only fills the box is one more click
// for nothing.

export interface EmptyCreateItem { title: string; hint: string; prompt: string; glyph: GlyphKind }
export interface EmptyAskItem { label: string; prompt: string }

/** What an app puts on a new conversation's screen. */
export interface EmptyStateContent {
    /** The line under the greeting: docked (short) and maximized. */
    subtitle: { docked: string; wide: string }
    /** "Start something": things the assistant can make. Empty hides the section. */
    create: EmptyCreateItem[]
    /** "Or ask a question". */
    ask: EmptyAskItem[]
    /** Lead the questions with "Explain this page" (a page-aware assistant). */
    explainPage?: boolean
}

/** Docked the rail is narrow, so it shows fewer of each; maximized shows them all. */
const DOCK_CREATE = 2
const DOCK_ASK = 3

function greetingFor(hour: number): string {
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}

export function ChatEmptyState({
    onSelect,
    pageTitle,
    wide,
    disabled,
    firstName = "",
    content,
}: {
    /** The reader's first name for the greeting, or empty. */
    firstName?: string
    content: EmptyStateContent
    onSelect: (prompt: string) => void
    /** The page the assistant can see, or null when there is nothing worth naming. */
    pageTitle: string | null
    /** Maximized: a larger greeting and two cards across. */
    wide: boolean
    disabled?: boolean
}) {
    // The hour is read after mount: the server's clock and time zone are not the
    // reader's, and a greeting that changes during hydration is a mismatch error.
    const [greeting, setGreeting] = useState("Welcome back")
    useEffect(() => { setGreeting(greetingFor(new Date().getHours())) }, [])

    const creates = wide ? content.create : content.create.slice(0, DOCK_CREATE)
    const asks = wide ? content.ask : content.ask.slice(0, DOCK_ASK)

    return (
        <div className={cn("mx-auto flex w-full min-w-0 flex-col justify-center", wide ? "max-w-2xl gap-9 px-6 py-12" : "gap-6 px-4 py-6")}>
            <div className={cn("flex flex-col", wide ? "items-center gap-2 text-center" : "gap-3")}>
                <div className={cn("flex gap-3", wide ? "flex-col items-center" : "items-center")}>
                    <AIMark size={wide ? 64 : 44} />
                    <div className="min-w-0">
                        <h2 className={cn("font-semibold tracking-tight text-neutral-900 dark:text-white", wide ? "text-[28px] leading-tight" : "text-base")}>
                            {greeting}{firstName ? `, ${firstName}` : ""}
                        </h2>
                        <p className={cn("text-neutral-600 dark:text-neutral-400", wide ? "mt-2 text-[15px]" : "mt-0.5 text-xs")}>
                            {wide ? content.subtitle.wide : content.subtitle.docked}
                        </p>
                    </div>
                </div>
                {/* The assistant is page-aware without anyone tagging anything, so say so. */}
                {pageTitle && (
                    <span className="mt-1 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" aria-hidden />
                        <span className="truncate">You&apos;re on {pageTitle}</span>
                    </span>
                )}
            </div>

            {creates.length > 0 && (
            <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Start something</h3>
                <div className={cn("grid min-w-0 gap-2.5", wide && "sm:grid-cols-2")}>
                    {creates.map((c) => (
                        <button
                            key={c.title}
                            type="button"
                            onClick={() => onSelect(c.prompt)}
                            disabled={disabled}
                            className={cn(
                                "group flex w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left",
                                "border-neutral-200 bg-white transition-[border-color,transform,box-shadow] duration-200",
                                "hover:-translate-y-px hover:border-neutral-300 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)]",
                                "dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700",
                                "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
                            )}
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                                <SuggestionGlyph kind={c.glyph} className="h-[22px] w-[22px]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{c.title}</span>
                                <span className="mt-0.5 truncate text-xs font-medium text-neutral-600 dark:text-neutral-400">{c.hint}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                        </button>
                    ))}
                </div>
            </section>
            )}

            <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Or ask a question</h3>
                <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
                    {/* First, always: the one question only a page-aware assistant can answer. */}
                    {content.explainPage && <AskRow label="Explain this page" prompt="Explain this page and what I can do here." icon="glyph" onSelect={onSelect} disabled={disabled} />}
                    {asks.map((a) => (
                        <AskRow key={a.label} label={a.label} prompt={a.prompt} icon="message" onSelect={onSelect} disabled={disabled} />
                    ))}
                </div>
            </section>
        </div>
    )
}

function AskRow({ label, prompt, icon, onSelect, disabled }: {
    label: string
    prompt: string
    icon: "glyph" | "message"
    onSelect: (prompt: string) => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
            className="group flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-neutral-900"
        >
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-neutral-500 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white">
                {icon === "glyph" ? <AIGlyph size={14} /> : <MessageSquareText className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
        </button>
    )
}

export default ChatEmptyState
