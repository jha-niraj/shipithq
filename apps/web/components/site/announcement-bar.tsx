"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { ANNOUNCEMENT, ANNOUNCEMENT_STORAGE_KEY } from "@/content/announcement"
import { MONO } from "@/components/marketing/primitives"

/**
 * The dismissable strip above the navbar (plan/web/revamp REV-4).
 *
 * The page is static, so the server always renders the bar. For a visitor who has
 * already closed this announcement, `AnnouncementHideScript` (in <head>) injects a
 * rule hiding it before first paint, so it never flashes in and out.
 */
export function AnnouncementBar() {
    const [closed, setClosed] = useState(false)
    const a = ANNOUNCEMENT
    if (!a || closed) return null

    const external = /^https?:\/\//.test(a.href)
    const body = (
        <>
            <span className={cn(MONO, "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500")}>{a.tag}</span>
            <span className="font-medium text-neutral-900">{a.text}</span>
            <span className="inline-flex items-center gap-1 text-neutral-600 group-hover:text-neutral-900">
                {a.cta} <ArrowRight className="size-3.5" aria-hidden />
            </span>
        </>
    )

    return (
        <div data-announcement={a.id} className="relative border-b border-neutral-200 bg-neutral-50">
            <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-center px-12 py-2 text-[13px]">
                {external ? (
                    <a href={a.href} className="group flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-center">{body}</a>
                ) : (
                    <Link href={a.href} className="group flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-center">{body}</Link>
                )}
            </div>
            <button
                type="button"
                aria-label="Dismiss announcement"
                onClick={() => {
                    setClosed(true)
                    try { localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, a.id) } catch { /* storage blocked: closes for this visit only */ }
                }}
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900"
            >
                <X className="size-4" />
            </button>
        </div>
    )
}

/** Runs before paint: hides the bar if this visitor closed this exact announcement. */
export function AnnouncementHideScript() {
    if (!ANNOUNCEMENT) return null
    const js = `try{if(localStorage.getItem(${JSON.stringify(ANNOUNCEMENT_STORAGE_KEY)})===${JSON.stringify(ANNOUNCEMENT.id)}){var s=document.createElement('style');s.textContent='[data-announcement]{display:none}';document.head.appendChild(s)}}catch(e){}`
    return <script dangerouslySetInnerHTML={{ __html: js }} />
}
