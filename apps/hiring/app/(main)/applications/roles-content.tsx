import Link from "next/link"
import { ChevronRight, FileCheck2, Inbox, Mail, Briefcase } from "lucide-react"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"
import type { RoleSends } from "@/lib/sends"

/*
 * Results by role (plan/hiring-rounds HR-18): each role with the results it
 * has received, new ones counted apart, leading into its review workspace.
 */

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-")

export function RolesContent({ roles }: { roles: RoleSends[] }) {
    const total = roles.reduce((n, r) => n + r.total, 0)
    const unread = roles.reduce((n, r) => n + r.unread, 0)
    const invited = roles.reduce((n, r) => n + r.invited, 0)
    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader title="Results" subtitle="Each role and the results students sent after clearing its rounds." />
            <StatBand
                cols={4}
                items={[
                    { icon: Briefcase, label: "Roles", value: roles.length },
                    { icon: FileCheck2, label: "Results received", value: total },
                    { icon: Inbox, label: "New", value: unread },
                    { icon: Mail, label: "Invited", value: invited },
                ]}
            />
            {roles.length === 0 ? (
                <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    No roles yet. <Link href="/jobs/new" className="font-medium underline underline-offset-2">Post a role</Link> with a pipeline, and results arrive here as students clear it.
                </p>
            ) : (
                <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
                    {roles.map((r) => (
                        <li key={r.slug}>
                            <Link href={`/applications/${r.slug}`} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-neutral-900 dark:text-white">{r.title}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.status === "ACTIVE" ? "Open" : r.status.charAt(0) + r.status.slice(1).toLowerCase()} · last result {when(r.lastAt)}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
                                    <span className="text-neutral-700 dark:text-neutral-300">{r.total} <span className="text-xs text-neutral-500">results</span></span>
                                    <span className={cn("min-w-14 text-right", r.unread ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500")}>{r.unread} <span className="text-xs font-normal text-neutral-500">new</span></span>
                                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
