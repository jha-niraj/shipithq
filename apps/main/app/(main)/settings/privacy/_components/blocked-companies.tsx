"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { setCompanyBlocked, type BlockedCompany } from "@/actions/moderation.action"

/** Every company this student has blocked, each with Unblock (HR-24). */
export function BlockedCompanies({ initial }: { initial: BlockedCompany[] }) {
    const [rows, setRows] = useState(initial)
    const [busy, setBusy] = useState<string | null>(null)
    const unblock = async (b: BlockedCompany) => {
        setBusy(b.companyId)
        const r = await setCompanyBlocked(b.companyId, false)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        setRows((x) => x.filter((y) => y.companyId !== b.companyId))
        toast.success(`Unblocked ${b.name}. It can message you again.`)
    }
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950" aria-label="Blocked companies">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Blocked companies</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">A company you block can&apos;t message you. It sees &quot;This candidate isn&apos;t accepting messages&quot;, never that you blocked it.</p>
            {rows.length === 0 ? (
                <p className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">You haven&apos;t blocked anyone. You can block a company from its page or from a conversation in your Inbox.</p>
            ) : (
                <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {rows.map((b) => (
                        <li key={b.companyId} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <Link href={`/companies/${b.slug}`} className="font-medium text-neutral-900 hover:underline dark:text-white">{b.name}</Link>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Blocked {new Date(b.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => void unblock(b)} disabled={busy === b.companyId} className="gap-1.5">
                                {busy === b.companyId && <InlineLoader size="sm" />} Unblock
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
