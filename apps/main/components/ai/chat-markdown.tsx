"use client"

import { isValidElement, useState, type JSX, type ReactElement, type ReactNode } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Check, Copy } from "lucide-react"
import { readChartSpec } from "./chat-chart"

// Markdown inside an assistant bubble (plan/ai-chat, AC-6). Ported from gurukulhq's
// chat renderer rather than reusing `components/common/markdown-renderer.tsx`: that
// one mounts a Monaco editor per code block and a Mermaid runtime, which is right for
// a lesson page and far too heavy for a reply in a 380px rail.
//
// The rule that shapes everything here: NOTHING may widen the bubble. Tables and code
// scroll sideways inside their own box, so a wide answer never pushes the panel's
// layout out from under the composer.

const ChatChart = dynamic(() => import("./chat-chart"), {
    ssr: false,
    loading: () => <div className="my-2 h-[214px] w-full animate-pulse rounded-xl bg-neutral-200/60 dark:bg-neutral-700/40" />,
})

type MdProps<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T] & { node?: unknown }

/** A box that scrolls sideways on its own. `contain: inline-size` stops its content's
 *  width from feeding back into the bubble's. */
function Wide({ children }: { children: ReactNode }) {
    return <div className="my-2 w-full max-w-full overflow-x-auto [contain:inline-size] [scrollbar-width:thin]">{children}</div>
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { /* clipboard blocked: nothing to do */ }
    }
    return (
        <div className="my-2 w-full max-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950 [contain:inline-size]">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-1 dark:border-neutral-800">
                <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">{lang ?? "code"}</span>
                <button
                    type="button"
                    onClick={() => void copy()}
                    className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed [scrollbar-width:thin]">
                <code className="font-mono text-neutral-900 dark:text-neutral-100">{code}</code>
            </pre>
        </div>
    )
}

/** Inline code. Blocks never reach this: `pre` below takes them, because only the
 *  wrapping <pre> says reliably that a code element is a block. */
function InlineCode({ children }: MdProps<"code">) {
    return <code className="rounded bg-neutral-200/70 px-1 py-px font-mono text-[0.85em] dark:bg-neutral-700/60">{children}</code>
}

function Pre({ children }: MdProps<"pre">) {
    const child = (Array.isArray(children) ? children[0] : children) as ReactElement<{ className?: string; children?: ReactNode }> | undefined
    const className = isValidElement(child) ? child.props.className : undefined
    const text = String((isValidElement(child) ? child.props.children : children) ?? "").replace(/\n$/, "")
    const lang = /language-([\w-]+)/.exec(className ?? "")?.[1]
    if (lang === "chart") {
        try {
            const spec = readChartSpec(JSON.parse(text))
            if (spec) return <ChatChart spec={spec} />
        } catch { /* half-streamed or malformed: shown as code until it parses */ }
    }
    return <CodeBlock lang={lang} code={text} />
}

export function ChatMarkdown({ content }: { content: string }) {
    return (
        <div className="min-w-0 break-words">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }: MdProps<"p">) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
                    h1: ({ children }: MdProps<"h1">) => <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
                    h2: ({ children }: MdProps<"h2">) => <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
                    h3: ({ children }: MdProps<"h3">) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>,
                    h4: ({ children }: MdProps<"h4">) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>,
                    ul: ({ children }: MdProps<"ul">) => <ul className="my-1.5 list-disc space-y-1 pl-5 marker:text-neutral-400">{children}</ul>,
                    ol: ({ children }: MdProps<"ol">) => <ol className="my-1.5 list-decimal space-y-1 pl-5 marker:text-neutral-500">{children}</ol>,
                    li: ({ children }: MdProps<"li">) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }: MdProps<"strong">) => <strong className="font-semibold text-neutral-900 dark:text-white">{children}</strong>,
                    a: ({ children, href }: MdProps<"a">) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-900 dark:hover:decoration-white">
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }: MdProps<"blockquote">) => (
                        <blockquote className="my-2 border-l-2 border-neutral-300 pl-3 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300">{children}</blockquote>
                    ),
                    hr: () => <hr className="my-3 border-neutral-200 dark:border-neutral-700" />,
                    table: ({ children }: MdProps<"table">) => (
                        <Wide>
                            <table className="w-full border-collapse text-xs">{children}</table>
                        </Wide>
                    ),
                    thead: ({ children }: MdProps<"thead">) => <thead className="bg-neutral-200/60 dark:bg-neutral-700/50">{children}</thead>,
                    tr: ({ children }: MdProps<"tr">) => <tr className="even:bg-white/60 dark:even:bg-neutral-900/40">{children}</tr>,
                    th: ({ children }: MdProps<"th">) => <th className="whitespace-nowrap border border-neutral-200 px-2 py-1 text-left font-semibold dark:border-neutral-700">{children}</th>,
                    td: ({ children }: MdProps<"td">) => <td className="border border-neutral-200 px-2 py-1 align-top dark:border-neutral-700">{children}</td>,
                    pre: Pre,
                    code: InlineCode,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

export default ChatMarkdown
