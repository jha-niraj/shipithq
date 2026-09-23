import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * The one page header: what this page is on the left, where else you can go on
 * the right, in ONE row (plan/projects, PJ-3).
 *
 * Practice used to spend a whole row on its tabs and then another on its title,
 * which is 100px of chrome before any content on a laptop (Niraj, 2026-09-23:
 * "put the tabs on the right and then keep the title bar on the left, that will
 * save the space").
 *
 * The tabs are a slot rather than a prop: a section may want links, a Radix
 * TabsList, or a control that is not tabs at all, and a prop-driven header would
 * have to model all three. It stacks below `sm`, where a title and six tabs do
 * not share a line honestly.
 */
export function PageHeader({
    title,
    subtitle,
    tabs,
    actions,
    className,
}: {
    title: React.ReactNode
    /** One line under the title. Optional: a section with obvious contents needs none. */
    subtitle?: React.ReactNode
    /** Right of the title: the section's tabs. */
    tabs?: React.ReactNode
    /** Right of the tabs: a button or two. Wraps under them when there is no room. */
    actions?: React.ReactNode
    className?: string
}) {
    return (
        <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h1>
                {subtitle && (
                    <p className="mt-0.5 truncate text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
                )}
            </div>
            {(tabs || actions) && (
                <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {tabs}
                    {actions}
                </div>
            )}
        </header>
    )
}

export default PageHeader
