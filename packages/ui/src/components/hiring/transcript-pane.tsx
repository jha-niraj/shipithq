"use client"

import { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import type { TranscriptTurn } from "@repo/db/hiring-send-types"

/** A voice or typed interview's turns, newest at the bottom, kept in view as it grows (plan/voice). */
export function TranscriptPane({ turns, className, empty = "The conversation will appear here." }: { turns: TranscriptTurn[]; className?: string; empty?: string }) {
    const end = useRef<HTMLDivElement>(null)
    useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [turns.length])
    return (
        <div className={cn("overflow-y-auto", className)} aria-live="polite" aria-label="Transcript">
            {turns.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{empty}</p>
            ) : (
                <ol className="space-y-3">
                    {turns.map((t, i) => (
                        <li key={i} className={cn("flex", t.role === "candidate" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                                t.role === "candidate"
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
                            )}>
                                <span className="sr-only">{t.role === "candidate" ? "You: " : "Interviewer: "}</span>
                                {t.text}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            <div ref={end} />
        </div>
    )
}
