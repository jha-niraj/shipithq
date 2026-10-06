import { ExternalLink } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { CaseCredit } from "@/content/incidents"

/**
 * Whose work a case is based on (plan/rag-latency RL-2). The case is our own words; the
 * method and the scenario are theirs, and every reader should see where they came from.
 */

/**
 * One line for a case card. Plain text: the card is itself a link, and a link cannot sit
 * inside another, so the clickable links live on the start and closing steps.
 */
export function CreditLine({ credit, dark = false, className }: { credit?: CaseCredit; dark?: boolean; className?: string }) {
    if (!credit) return null
    return (
        <p className={cn("truncate font-mono text-[11px]", dark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400", className)}>
            Based on {credit.name}&apos;s explanation
        </p>
    )
}

/** The credit with both links: on the start step, the closing step and beside the sources. */
export function CreditCard({ credit, className }: { credit?: CaseCredit; className?: string }) {
    if (!credit) return null
    const link = "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
    return (
        <aside aria-label="Credit" className={cn("rounded-xl border border-neutral-200 p-4 dark:border-neutral-800", className)}>
            <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">Based on</p>
            <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-white">
                {credit.name}&apos;s explanation{credit.role && <span className="font-normal text-neutral-500 dark:text-neutral-400"> · {credit.role}</span>}
            </p>
            <p className="mt-1 text-[13.5px] leading-6 text-neutral-600 dark:text-neutral-400">{credit.what}</p>
            <div className="-ml-2 mt-2 flex flex-wrap gap-1">
                <a href={credit.postUrl} target="_blank" rel="noopener noreferrer" className={link}>
                    {credit.postTitle} <ExternalLink className="size-3.5" aria-hidden />
                </a>
                <a href={credit.profileUrl} target="_blank" rel="noopener noreferrer" className={link}>
                    {credit.name} on LinkedIn <ExternalLink className="size-3.5" aria-hidden />
                </a>
            </div>
        </aside>
    )
}
