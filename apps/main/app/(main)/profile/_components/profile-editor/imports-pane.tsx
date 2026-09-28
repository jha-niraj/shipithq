"use client"

import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import type { MyImport } from "@/actions/(main)/jobs/import.action"
import { MyImports } from "@/components/job-import/my-imports"
import { EmptyPane, PaneBody, PaneHeader } from "./parts"

/**
 * The jobs this student imported (plan/job-import JI-17): the count and the list, drafts
 * included. Only the owner sees the list; the public profile shows the count of built ones.
 */
export function ImportsPane({ items }: { items: MyImport[] | null }) {
    const shown = items?.filter((i) => i.state !== "cancelled") ?? null
    const built = shown?.filter((i) => i.state === "ready").length ?? 0
    const newJob = <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs"><Link href="/jobs/import">Import a job</Link></Button>
    return (
        <>
            <PaneHeader title="Jobs imported" count={shown?.length} action={newJob} />
            {shown === null ? (
                <PaneBody className="space-y-3">
                    {[0, 1, 2].map((i) => <Shimmer key={i} className="h-14 w-full rounded-xl" delay={i * 0.04} />)}
                </PaneBody>
            ) : shown.length === 0 ? (
                <EmptyPane title="No jobs imported yet" body="Paste a job from LinkedIn or any careers page and practise its interview, round by round." action={newJob} />
            ) : (
                <PaneBody className="space-y-3">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        {built === 0 ? "None built yet." : `${built} ready to practise.`} Your public profile shows how many jobs you&apos;ve built; this list is only yours.
                    </p>
                    <MyImports items={shown} title="All your imports" />
                </PaneBody>
            )}
        </>
    )
}
