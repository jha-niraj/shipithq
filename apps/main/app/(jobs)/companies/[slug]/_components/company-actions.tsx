"use client"

import { useState } from "react"
import { Ban } from "lucide-react"
import { ReportDialog } from "@repo/ui/components/moderation/report-dialog"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { reportCompany, setCompanyBlocked } from "@/actions/moderation.action"

/** Report and Block on a company's page (HR-24). Signed-in students only. */
export function CompanyActions({ companyId, companyName, blocked: initial }: { companyId: string; companyName: string; blocked: boolean }) {
    const [blocked, setBlocked] = useState(initial)
    const [busy, setBusy] = useState(false)
    const toggle = async () => {
        setBusy(true)
        const r = await setCompanyBlocked(companyId, !blocked)
        setBusy(false)
        if (!r.success) { toast.error(r.error); return }
        toast.success(blocked ? `Unblocked ${companyName}.` : `Blocked ${companyName}. It can't message you.`)
        setBlocked(!blocked)
    }
    return (
        <>
            <ReportDialog kind="COMPANY" name={companyName} onSubmit={async (reason, details) => {
                const r = await reportCompany(companyId, reason, details)
                return r.success ? null : r.error
            }} />
            <Button variant="ghost" size="sm" onClick={() => void toggle()} disabled={busy} aria-pressed={blocked} className="gap-1.5 text-neutral-600 dark:text-neutral-400">
                {busy ? <InlineLoader size="sm" /> : <Ban className="h-4 w-4" />} {blocked ? "Unblock" : "Block"}
            </Button>
        </>
    )
}
