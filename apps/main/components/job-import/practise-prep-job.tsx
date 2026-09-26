"use client"

import { useState } from "react"
import Link from "next/link"
import { ClipboardPaste } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { getImportAllowance, getPrepGoalPosting, type ImportAllowance } from "@/actions/(main)/jobs/import.action"
import { ImportForm } from "./import-form"

/*
 * "Practise this job's rounds" on an interview-prep goal (plan/job-import JI-8,
 * Niraj 2026-09-26): the goal's own posting, in the paste form, one click from
 * the questions it produced. The student still picks public or private.
 */
export function PractisePrepJob({ goalId }: { goalId: string }) {
    const [open, setOpen] = useState(false)
    const [data, setData] = useState<{ allowance: ImportAllowance; text: string; company: string } | { error: string } | null>(null)

    const openSheet = async () => {
        setOpen(true)
        if (data && !("error" in data)) return
        setData(null)
        const [allowance, posting] = await Promise.all([getImportAllowance(), getPrepGoalPosting(goalId)])
        setData(posting.success ? { allowance, ...posting.data } : { error: posting.error })
    }

    return (
        <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void openSheet()}>
                <ClipboardPaste className="h-3 w-3" /> Practise this job&apos;s rounds
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>Practise this job&apos;s rounds</SheetTitle>
                        <SheetDescription>The same posting, designed as the interview: rounds in order, each with a pass mark.</SheetDescription>
                    </SheetHeader>
                    <div className="px-4 pb-6">
                        {data === null ? (
                            <div className="space-y-5">
                                <ShimmerStyles />
                                <div className="space-y-2"><Shimmer className="h-4 w-16" /><Shimmer className="h-36 w-full rounded-lg" delay={0.04} /></div>
                                <div className="space-y-2"><Shimmer className="h-4 w-20" delay={0.06} /><Shimmer className="h-9 w-full rounded-md" delay={0.08} /></div>
                                <div className="grid gap-2 sm:grid-cols-2"><Shimmer className="h-20 rounded-xl" delay={0.1} /><Shimmer className="h-20 rounded-xl" delay={0.12} /></div>
                                <Shimmer className="h-9 w-36 rounded-md" delay={0.14} />
                            </div>
                        ) : "error" in data ? (
                            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                                <p>{data.error}</p>
                                <Button asChild size="sm" variant="outline"><Link href="/jobs/import">Paste a job</Link></Button>
                            </div>
                        ) : (
                            <ImportForm allowance={data.allowance} initialText={data.text} company={data.company} />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}
