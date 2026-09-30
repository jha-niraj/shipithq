"use client"

import { ClipboardList, Radio, ShieldAlert } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { IncidentRoles, StatusUpdates } from "@/content/incidents/types"
import { formatRel } from "./scrub"

/*
 * The human side of an incident (plan/incidents INC-72), framed as how a team should run
 * this one, never as what happened: the severity and why, who does what, the status-page
 * updates a team would post, and a runbook excerpt. Monochrome; `lit` rings the part the
 * narration is on (a role's name, an update's state, a step's number).
 */

export function RolesView({ roles, lit = null }: { roles: IncidentRoles; lit?: string | null }) {
    return (
        <section aria-label="Severity and roles" className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <div className={cn("flex gap-3 border-b border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/60", lit === "severity" && "ring-2 ring-inset ring-neutral-900 dark:ring-white")}>
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-neutral-700 dark:text-neutral-300" aria-hidden />
                <div>
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-400">Severity</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">{roles.severity.level}</p>
                    <p className="mt-1 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{roles.severity.why}</p>
                </div>
            </div>
            <ul className="grid divide-y divide-neutral-200 sm:grid-cols-2 sm:divide-y-0 dark:divide-neutral-800">
                {roles.roles.map((r, i) => (
                    <li key={r.role} className={cn(
                        "p-5 transition-opacity",
                        i % 2 === 0 && "sm:border-r sm:border-neutral-200 sm:dark:border-neutral-800",
                        i > 1 && "sm:border-t sm:border-neutral-200 sm:dark:border-neutral-800",
                        lit && lit !== r.role && "opacity-40",
                        lit === r.role && "bg-neutral-100 dark:bg-neutral-900",
                    )}>
                        <p className="text-[15px] font-semibold text-neutral-900 dark:text-white">{r.role}</p>
                        <p className="mt-1 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{r.does}</p>
                    </li>
                ))}
            </ul>
        </section>
    )
}

const STATE_DOT: Record<StatusUpdates["updates"][number]["state"], string> = {
    Investigating: "bg-rose-500",
    Identified: "bg-neutral-900 dark:bg-white",
    Monitoring: "bg-neutral-400",
    Resolved: "bg-emerald-600 dark:bg-emerald-500",
}

/** Status-page updates, newest last, the way a customer would read them. */
export function StatusView({ status, lit = null }: { status: StatusUpdates; lit?: string | null }) {
    return (
        <figure className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <Radio className="size-4 text-neutral-600 dark:text-neutral-400" aria-hidden />
                <p className="text-[13px] font-medium text-neutral-900 dark:text-white">Status page</p>
            </div>
            <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {status.updates.map((u, i) => (
                    <li key={i} className={cn("flex gap-4 px-5 py-4 transition-opacity", lit && lit !== u.state && "opacity-40", lit === u.state && "bg-neutral-50 dark:bg-neutral-900/60")}>
                        <div className="w-28 shrink-0">
                            <p className="flex items-center gap-2 text-[13px] font-semibold text-neutral-900 dark:text-white"><span className={cn("size-2 rounded-full", STATE_DOT[u.state])} aria-hidden />{u.state}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{formatRel(u.at)}</p>
                        </div>
                        <p className="min-w-0 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{u.text}</p>
                    </li>
                ))}
            </ol>
            {status.caption && <figcaption className="border-t border-neutral-200 px-5 py-3 text-[12.5px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">{status.caption}</figcaption>}
        </figure>
    )
}

/** A runbook excerpt: numbered steps a person follows under pressure. */
export function RunbookView({ title, steps, lit = null }: { title: string; steps: string[]; lit?: string | null }) {
    return (
        <figure className="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
            <p className="flex items-center gap-2 text-[13px] font-medium text-neutral-900 dark:text-white"><ClipboardList className="size-4" aria-hidden /> Runbook: {title}</p>
            <ol className="mt-3 space-y-2">
                {steps.map((st, i) => (
                    <li key={i} className={cn("flex gap-3 rounded-xl px-2 py-1.5 text-[14px] leading-6 text-neutral-800 transition-opacity dark:text-neutral-200", lit && lit !== String(i + 1) && "opacity-40", lit === String(i + 1) && "bg-neutral-100 dark:bg-neutral-900")}>
                        <span className="w-5 shrink-0 font-mono text-[12px] text-neutral-500">{i + 1}.</span>{st}
                    </li>
                ))}
            </ol>
        </figure>
    )
}
