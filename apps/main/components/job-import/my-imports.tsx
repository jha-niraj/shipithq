import Link from "next/link"
import { ArrowRight, Globe, Lock } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { MyImport } from "@/actions/(main)/jobs/import.action"

/*
 * The student's own imports, newest first (plan/job-import JI-16, JI-17): a draft left
 * mid-review shows "Check and build" and opens where it was. Used on /jobs/import and on
 * the owner's profile.
 */

const STATE: Record<MyImport["state"], { label: string; action: string; strong?: boolean }> = {
    reading: { label: "Reading", action: "Open" },
    review: { label: "Waiting for your check", action: "Check and build", strong: true },
    needs_text: { label: "Needs the text", action: "Paste the text", strong: true },
    building: { label: "Building", action: "Open" },
    ready: { label: "Ready to practise", action: "Practise" },
    failed: { label: "Couldn't build", action: "See why" },
    duplicate: { label: "Built by someone else first", action: "Practise" },
    cancelled: { label: "Discarded", action: "Open" },
}

function when(iso: string) {
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (days <= 0) return "today"
    if (days === 1) return "yesterday"
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function MyImports({ items, title = "Your imports", empty = "Jobs you import show here, with where each one is." }: { items: MyImport[]; title?: string; empty?: string }) {
    const shown = items.filter((i) => i.state !== "cancelled")
    return (
        <section aria-labelledby="my-imports" className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-baseline justify-between gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <h2 id="my-imports" className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
                <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{shown.length}</span>
            </div>
            {shown.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-600 dark:text-neutral-400">{empty}</p>
            ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {shown.map((i) => {
                        const s = STATE[i.state]
                        return (
                            <li key={i.id}>
                                <Link href={i.href} className="group flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300" title={i.visibility === "PRIVATE" ? "Private" : "Public"}>
                                        {i.visibility === "PRIVATE" ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white" title={i.title}>{i.title}</p>
                                        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                                            {i.company ? `${i.company} · ` : ""}<span className={cn(s.strong && "font-medium text-neutral-900 dark:text-white")}>{s.label}</span> · {when(i.at)}
                                        </p>
                                    </div>
                                    <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-neutral-700 sm:inline-flex dark:text-neutral-300">
                                        {s.action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
