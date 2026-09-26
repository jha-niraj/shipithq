"use client"

import { memo, useState } from "react"
import Link from "next/link"
import { format, isToday } from "date-fns"
import { ArrowUpRight, Check, Copy, FileText, ThumbsDown, ThumbsUp } from "lucide-react"
import { AIGlyph } from "../ui/ai-mark"
import { cn } from "../../lib/utils"
import type { AssistantFeedback } from "@repo/db/assistant"
import { isTempId, type AIChatMessage } from "./types"
import { ToolSteps } from "./tool-steps"
import { ChatMarkdown } from "./chat-markdown"

// One turn of the conversation, in gurukulhq's layout (plan/ai-chat, AC-6):
// the user's turns are ink bubbles on the right; the assistant's sit beside a round
// avatar in a grey bubble, with what it did above and what you can do with it below.

/** Time only if today, otherwise "Sep 21, 4:05 PM". */
function stamp(ms: number): string {
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return ""
    return isToday(d) ? format(d, "h:mm a") : format(d, "MMM d, h:mm a")
}

function useCopy(text: string) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { /* clipboard blocked */ }
    }
    return { copied, copy }
}

const ICON_BUTTON =
    "relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"

export const ChatMessage = memo(function ChatMessage({
    message,
    isStreaming,
    onFeedback,
}: {
    message: AIChatMessage
    /** This is the turn in flight. */
    isStreaming: boolean
    onFeedback: (messageId: string, value: AssistantFeedback | null) => void
}) {
    const { copied, copy } = useCopy(message.content)
    const when = stamp(message.createdAt)

    if (message.role === "user") {
        return (
            <div className="group flex flex-col items-end px-4 py-1.5">
                {/* What was attached, so the turn still says so when scrolled back to. The
                    text itself is not shown - it is the document, not the message. */}
                {!!message.attachments?.length && (
                    <div className="mb-1 flex max-w-[85%] flex-wrap justify-end gap-1.5">
                        {message.attachments.map((a) => (
                            <span
                                key={a.id}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                                <FileText className="h-3 w-3 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
                                <span className="max-w-[160px] truncate">{a.name}</span>
                            </span>
                        ))}
                    </div>
                )}
                {message.content && (
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-none bg-neutral-900 px-4 py-2.5 text-[15px] leading-relaxed text-white dark:bg-neutral-100 dark:text-neutral-900">
                        {message.content}
                    </div>
                )}
                <div className="mt-1 flex items-center gap-1.5 pr-1">
                    {message.content && (
                        <button type="button" onClick={() => void copy()} className={ICON_BUTTON} aria-label="Copy message" title="Copy">
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                    )}
                    {when && <span className="text-xs text-neutral-500 dark:text-neutral-400">{when}</span>}
                </div>
            </div>
        )
    }

    const saved = !isTempId(message.id)
    const rate = (value: AssistantFeedback) => onFeedback(message.id, message.feedback === value ? null : value)

    return (
        <div className="group flex gap-2 px-4 py-2">
            <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                aria-hidden
            >
                <AIGlyph size={14} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {/* What the agent did for this turn, above the reply it produced. */}
                {!!message.steps?.length && <ToolSteps steps={message.steps} />}

                {(message.content || isStreaming) && (
                    // Not capped at 85% like the user's bubble: replies carry tables and
                    // charts, and squeezing those to keep the bubbles symmetrical would be
                    // paying for the wrong thing.
                    <div className="min-w-0 max-w-full rounded-2xl rounded-tl-none bg-neutral-100 px-4 py-2.5 text-[15px] leading-relaxed text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                        {message.content ? (
                            <ChatMarkdown content={message.content} />
                        ) : (
                            // Waiting for the first token. Dots, not a spinner (CLAUDE.md).
                            <span className="inline-flex gap-1 py-1.5" role="status" aria-label="Thinking">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:0ms] dark:bg-neutral-400" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:150ms] dark:bg-neutral-400" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:300ms] dark:bg-neutral-400" />
                            </span>
                        )}
                    </div>
                )}

                {message.partial && !isStreaming && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Stopped before the reply finished.</span>
                )}

                {/* Buttons a tool produced: the thing it made, or where to go next. The href
                    came from the tool, never from the model. */}
                {!!message.actions?.length && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {message.actions.map((a) => (
                            <Link
                                key={a.href}
                                href={a.href}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
                            >
                                <span className="truncate">{a.label}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
                            </Link>
                        ))}
                    </div>
                )}

                {!isStreaming && message.content && (
                    <div className="flex items-center gap-4 pl-0.5">
                        <button type="button" onClick={() => void copy()} className={ICON_BUTTON} aria-label="Copy reply" title="Copy">
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                        <span className="h-3 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden />
                        {/* Feedback needs the saved id, so it waits for the turn to be saved. */}
                        <button
                            type="button"
                            onClick={() => rate(1)}
                            disabled={!saved}
                            aria-pressed={message.feedback === 1}
                            aria-label="Good response"
                            title="Good response"
                            className={cn(ICON_BUTTON, message.feedback === 1 && "bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-white dark:hover:text-neutral-900")}
                        >
                            <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => rate(-1)}
                            disabled={!saved}
                            aria-pressed={message.feedback === -1}
                            aria-label="Bad response"
                            title="Bad response"
                            className={cn(ICON_BUTTON, message.feedback === -1 && "bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-white dark:hover:text-neutral-900")}
                        >
                            <ThumbsDown className="h-3 w-3" />
                        </button>
                        {when && <span className="text-xs text-neutral-500 dark:text-neutral-400">{when}</span>}
                    </div>
                )}
            </div>
        </div>
    )
})

export default ChatMessage
