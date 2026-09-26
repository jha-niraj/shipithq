import { CircleDashed, CircleHelp, ShieldCheck } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { companyTrust } from "@/lib/company-trust"

/*
 * A company's one label (plan/hiring-rounds HR-9). `compact` is the directory
 * card; the full form adds the one-line explanation, for the company page.
 */
export function CompanyTrustBadge({ claimStatus, verificationStatus, companyName, compact = false, className }: {
    claimStatus: string | null | undefined
    verificationStatus: string | null | undefined
    companyName: string
    compact?: boolean
    className?: string
}) {
    const t = companyTrust(claimStatus, verificationStatus)
    const Icon = t.kind === "verified" ? ShieldCheck : t.kind === "unverified" ? CircleHelp : CircleDashed
    const pill = (
        <span
            className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                t.kind === "verified"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300",
            )}
            title={compact ? t.explain(companyName) : undefined}
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{t.label}</span>
        </span>
    )
    if (compact) return <span className={cn("inline-flex min-w-0", className)}>{pill}</span>
    return (
        <div className={cn("space-y-1", className)}>
            {pill}
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.explain(companyName)}</p>
        </div>
    )
}
