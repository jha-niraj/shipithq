"use client"

import Link from "next/link"
import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { IdeaBoard } from "@repo/db/ideas"
import { MONO, PrimaryCta } from "@/components/marketing/primitives"
import { APP_URL } from "@/lib/site"

/**
 * The status tabs and the sort (plan/web/revamp REV-115). Each is a link to
 * `?status=&sort=`, so the server queries the database for it; the pressed state
 * moves at once (optimistic) while the list's skeleton shows below.
 */

type Tab = keyof IdeaBoard["counts"]
const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "planned", label: "Planned" },
    { id: "building", label: "Building" },
    { id: "shipped", label: "Shipped" },
]

function href(status: Tab, sort: "top" | "new") {
    const p = new URLSearchParams()
    if (status !== "all") p.set("status", status)
    if (sort !== "top") p.set("sort", sort)
    const q = p.toString()
    return q ? `/ideas?${q}` : "/ideas"
}

export function IdeasTabs({ status, sort, counts }: { status: Tab; sort: "top" | "new"; counts: IdeaBoard["counts"] }) {
    const router = useRouter()
    const [, start] = useTransition()
    const [view, setView] = useOptimistic({ status, sort })

    const go = (next: { status: Tab; sort: "top" | "new" }) => (e: React.MouseEvent) => {
        e.preventDefault()
        start(() => {
            setView(next)
            router.push(href(next.status, next.sort), { scroll: false })
        })
    }

    return (
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
                {TABS.map((t) => {
                    const on = view.status === t.id
                    return (
                        <Link
                            key={t.id}
                            href={href(t.id, view.sort)}
                            onClick={go({ status: t.id, sort: view.sort })}
                            aria-current={on ? "page" : undefined}
                            className={cn(
                                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                                on ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900",
                            )}
                        >
                            {t.label}
                            <span className={cn(MONO, "rounded px-1 text-[11px] tabular-nums", on ? "bg-white/15 text-neutral-200" : "bg-neutral-200/70 text-neutral-600")}>{counts[t.id]}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="flex items-center gap-3">
                <div role="group" aria-label="Sort" className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
                    {(["top", "new"] as const).map((s) => (
                        <Link
                            key={s}
                            href={href(view.status, s)}
                            onClick={go({ status: view.status, sort: s })}
                            aria-current={view.sort === s ? "true" : undefined}
                            className={cn("inline-flex h-8 items-center rounded-md px-3 text-sm transition-colors", view.sort === s ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:text-neutral-900")}
                        >
                            {s === "top" ? "Top" : "New"}
                        </Link>
                    ))}
                </div>
                <PrimaryCta href={`${APP_URL}/ideas?post=1`} size="sm" arrow={false}>
                    <Plus className="-ml-1 size-4" aria-hidden /> Post an idea
                </PrimaryCta>
            </div>
        </div>
    )
}
