'use client'

import { Fragment, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import toast from '@repo/ui/components/ui/sonner'

/*
 * How a task's text renders in the Task tab (plan/project-repos RP-4).
 *
 * Setup tasks are commands to run, so the brief needs two things plain text
 * does not give: a line starting with "$ " is a command (consecutive ones make
 * one terminal block, each line with its own copy button), and `backticks`
 * are inline code. Everything else is a paragraph, as before.
 */
export function BriefParagraphs({ paragraphs }: { paragraphs: string[] }) {
    const blocks: ({ kind: 'text'; text: string } | { kind: 'commands'; lines: string[] })[] = []
    for (const p of paragraphs) {
        if (p.startsWith('$ ')) {
            const last = blocks[blocks.length - 1]
            if (last?.kind === 'commands') last.lines.push(p.slice(2))
            else blocks.push({ kind: 'commands', lines: [p.slice(2)] })
        } else {
            blocks.push({ kind: 'text', text: p })
        }
    }
    return (
        <>
            {blocks.map((b, i) =>
                b.kind === 'text'
                    ? <p key={i}><BriefText text={b.text} /></p>
                    : (
                        // A terminal is dark in both themes, so its ink is constant too.
                        <div key={i} className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 font-mono text-[13px] text-neutral-100">
                            {b.lines.map((line, j) => (
                                <div key={j} className="flex items-start gap-2">
                                    <span className="select-none text-neutral-500">$</span>
                                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">{line}</span>
                                    <CopyLine text={line} />
                                </div>
                            ))}
                        </div>
                    )
            )}
        </>
    )
}

/** Text with `inline code`. An unmatched backtick is left as it is. */
export function BriefText({ text }: { text: string }) {
    const parts = text.split(/(`[^`]+`)/g)
    return (
        <>
            {parts.map((part, i) =>
                part.length > 2 && part.startsWith('`') && part.endsWith('`')
                    ? <code key={i} className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">{part.slice(1, -1)}</code>
                    : <Fragment key={i}>{part}</Fragment>
            )}
        </>
    )
}

function CopyLine({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            type="button"
            aria-label={copied ? 'Copied' : 'Copy command'}
            title={copied ? 'Copied' : 'Copy'}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                } catch {
                    toast.error('Could not copy - select the text instead')
                }
            }}
            className="mt-0.5 shrink-0 cursor-pointer text-neutral-500 transition-colors hover:text-neutral-100"
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    )
}
