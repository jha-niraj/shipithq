"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ArrowUp, FileText, Mic, Plus, Square, X } from "lucide-react"
import { InlineLoader } from "../ui/inline-loader"
import { cn } from "../../lib/utils"
import type { AIChatAttachment } from "./types"

/** A chip for something the conversation is about (the student app's context tags). */
export interface ComposerTag { id: string; kind: string; title: string }

/** What a dictation hook returns: the student app passes its Sarvam `useDictation`. */
export interface DictationLike {
    status: string
    error: string | null
    unavailable?: boolean
    start: () => Promise<unknown> | unknown
    stop: () => Promise<unknown> | unknown
}
export type UseDictation = (opts: { onText: (text: string) => void }) => DictationLike

const NO_DICTATION: DictationLike = { status: "idle", error: null, start: () => undefined, stop: () => undefined }
const useNoDictation: UseDictation = () => NO_DICTATION

// The composer, in gurukulhq's shape (plan/ai-chat, AC-8): one rounded box holding the
// attached files, the text and a toolbar - attach, record, send. Context chips sit
// above the box because they describe the conversation, not this one message.

/** Tallest the text field grows before it scrolls, in px. */
const MAX_TEXTAREA = 200

export interface ChatComposerHandle {
    focus: () => void
}

type MicState = "idle" | "connecting" | "listening"

export const ChatComposer = forwardRef<ChatComposerHandle, {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    onStop: () => void
    isStreaming: boolean
    docs: AIChatAttachment[]
    uploading: number
    onRemoveDoc: (id: string) => void
    /** Omitted: no attach button (an app without document uploads). */
    onPickFiles?: (files: File[]) => void
    tags?: ComposerTag[]
    /** The tag that is there because of the page, which cannot be removed. */
    autoTag?: ComposerTag | null
    onRemoveTag?: (id: string) => void
    wide: boolean
    /** Omitted: no microphone. Must be the same hook on every render. */
    useDictation?: UseDictation
    placeholder?: string
    /** The textarea's accessible name. */
    label?: string
    /** Set: the composer is disabled and this line explains why (e.g. a monthly cap). */
    disabledReason?: string | null
    /** A line under the box when nothing else is said there (e.g. what's left this month). */
    footnote?: string | null
}>(function ChatComposer({
    value, onChange, onSubmit, onStop, isStreaming, docs, uploading, onRemoveDoc, onPickFiles,
    tags = [], autoTag = null, onRemoveTag, wide, useDictation, placeholder = "Ask anything, or start something",
    label = "Message ShipItHQ AI", disabledReason = null, footnote = null,
}, ref) {
    const hasMic = Boolean(useDictation)
    const dictate = useDictation ?? useNoDictation
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), [])

    // Grow with the text, including text the microphone wrote.
    useEffect(() => {
        const t = textareaRef.current
        if (!t) return
        t.style.height = "auto"
        t.style.height = `${Math.min(t.scrollHeight, MAX_TEXTAREA)}px`
    }, [value])

    // ── Voice ──────────────────────────────────────────────────────────────
    // Sarvam dictation (plan/voice VO-13), the same as the practice mentor's: the
    // words land in the field in bursts of about two seconds, for review; nothing
    // is sent until the user sends.
    const [micNotice, setMicNotice] = useState<string | null>(null)
    // What was in the field when recording started, so the transcript replaces
    // only what the mic added.
    const baseRef = useRef("")
    const valueRef = useRef(value)
    valueRef.current = value
    const dictation = dictate({ onText: (text) => onChange(`${baseRef.current}${text}`) })
    const mic: MicState = dictation.status === "starting" ? "connecting" : dictation.status === "idle" ? "idle" : "listening"
    useEffect(() => {
        if (dictation.error) setMicNotice(dictation.unavailable ? "The microphone is unavailable right now. You can still type." : dictation.error)
    }, [dictation.error, dictation.unavailable])
    const stopMic = () => { if (dictation.status !== "idle") void dictation.stop() }

    const toggleMic = async () => {
        if (mic !== "idle") { stopMic(); return }
        setMicNotice(null)
        const current = valueRef.current
        baseRef.current = current ? `${current.trimEnd()} ` : ""
        await dictation.start()
    }

    const canSend = !disabledReason && (value.trim().length > 0 || docs.length > 0) && uploading === 0 && !isStreaming
    const submit = () => {
        if (!canSend) return
        stopMic()
        onSubmit()
    }

    const hint =
        disabledReason ? disabledReason
            : mic === "listening" ? "Listening. Press Stop when you are done, then review and send."
                : mic === "connecting" ? "Starting the microphone..."
                    : micNotice ?? footnote ?? (onPickFiles ? "Enter to send · Shift+Enter for a new line · drop a file to attach" : "Enter to send · Shift+Enter for a new line")

    return (
        <div className={cn("shrink-0 px-3 pb-3 pt-2", wide && "mx-auto w-full max-w-3xl")}>
            {/* What the agent is told about. Context the user cannot see is context they
                cannot correct, and the page chip says WHY it is there. */}
            {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {tags.map((tag) => {
                        const isAuto = autoTag?.id === tag.id && autoTag?.kind === tag.kind
                        return (
                            <span
                                key={`${tag.kind}:${tag.id}`}
                                className="inline-flex max-w-full items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 py-0.5 pl-2 pr-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                                <span className="truncate">{tag.title}</span>
                                {isAuto ? (
                                    <span className="shrink-0 pr-1 text-neutral-600 dark:text-neutral-400">(this page)</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveTag?.(tag.id)}
                                        aria-label={`Remove ${tag.title} from context`}
                                        className="shrink-0 cursor-pointer rounded-full p-0.5 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        )
                    })}
                </div>
            )}

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 transition-colors focus-within:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-500">
                {(docs.length > 0 || uploading > 0) && (
                    <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                        {docs.map((d) => (
                            <span key={d.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-neutral-200/70 px-2.5 py-1 text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                                <FileText className="h-3 w-3 shrink-0 text-neutral-600 dark:text-neutral-400" aria-hidden />
                                <span className="max-w-[140px] truncate">{d.name}</span>
                                <span className="shrink-0 text-neutral-600 dark:text-neutral-400">{d.truncated ? "part" : `${Math.max(1, Math.round(d.chars / 1000))}k`}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveDoc(d.id)}
                                    aria-label={`Remove ${d.name}`}
                                    className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                        {uploading > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                                <InlineLoader size="sm" />
                                Reading {uploading > 1 ? `${uploading} files` : "file"}
                            </span>
                        )}
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            submit()
                        }
                    }}
                    rows={1}
                    // Not disabled while a reply streams, so focus never leaves the box
                    // after pressing Enter. Sending is guarded instead.
                    disabled={Boolean(disabledReason)}
                    placeholder={mic === "listening" ? "Listening..." : placeholder}
                    aria-label={label}
                    className="block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pb-1.5 pt-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-white dark:placeholder:text-neutral-400 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                />

                <div className="flex items-center gap-1 px-2 pb-2">
                    {onPickFiles && (
                        <>
                    <input
                        ref={fileRef}
                        type="file"
                        multiple
                        // Matches the allow-list /api/ai/upload-doc enforces.
                        accept=".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
                        className="hidden"
                        onChange={(e) => {
                            onPickFiles?.(Array.from(e.target.files ?? []))
                            // Reset, or choosing the same file twice fires no change event.
                            e.target.value = ""
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={isStreaming || Boolean(disabledReason)}
                        aria-label="Attach a document"
                        title="Attach a PDF, Word, text or CSV file (10MB max)"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                        <Plus className="h-4 w-4" />
                    </button>

                        </>
                    )}

                    <div className="flex-1" />

                    {hasMic && (
                    <button
                        type="button"
                        onClick={() => void toggleMic()}
                        disabled={mic === "connecting"}
                        aria-pressed={mic === "listening"}
                        title={mic === "listening" ? "Stop recording" : "Speak instead of typing"}
                        className={cn(
                            "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors disabled:cursor-wait",
                            mic === "listening"
                                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800",
                        )}
                    >
                        {mic === "connecting" ? (
                            <><InlineLoader size="sm" /> Starting</>
                        ) : mic === "listening" ? (
                            <><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span> Stop</>
                        ) : (
                            <><Mic className="h-3.5 w-3.5" /> Record</>
                        )}
                    </button>
                    )}

                    {isStreaming ? (
                        <button
                            type="button"
                            onClick={onStop}
                            aria-label="Stop the reply"
                            title="Stop"
                            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-900/10 bg-neutral-900 text-white transition-colors hover:bg-neutral-700 dark:border-white/20 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!canSend}
                            aria-label="Send message"
                            title="Send"
                            className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-all",
                                canSend
                                    ? "cursor-pointer border-neutral-900/10 bg-neutral-900/90 text-white hover:bg-neutral-900 dark:border-white/20 dark:bg-white/90 dark:text-neutral-900 dark:hover:bg-white"
                                    : "cursor-not-allowed border-neutral-900/10 bg-neutral-900/[0.06] text-neutral-500 dark:border-white/15 dark:bg-white/10 dark:text-neutral-400",
                            )}
                        >
                            <ArrowUp className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <p className={cn("mt-1.5 px-1 text-center text-xs", mic === "listening" ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400")} aria-live="polite">
                {hint}
            </p>
        </div>
    )
})

export default ChatComposer
