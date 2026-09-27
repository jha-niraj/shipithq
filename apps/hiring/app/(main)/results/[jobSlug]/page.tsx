import { notFound } from "next/navigation"
import { listJobSends } from "@/actions/sends"
import { getCompanyContext } from "@/lib/permissions"
import { SendsWorkspace } from "./_components/sends-workspace"

export const dynamic = "force-dynamic"

/** A role's candidates by round (plan/hiring-rounds HR-18). */
export default async function JobApplicationsPage({ params, searchParams }: { params: Promise<{ jobSlug: string }>; searchParams: Promise<{ send?: string }> }) {
    const [{ jobSlug }, { send }] = await Promise.all([params, searchParams])
    const r = await listJobSends(jobSlug)
    if (!r.success) {
        if (r.error === "That role doesn't exist.") notFound()
        return <p className="p-8 text-sm text-neutral-700 dark:text-neutral-300">{r.error}</p>
    }
    const ctx = await getCompanyContext()
    return (
        <SendsWorkspace
            data={r.data}
            canMessage={Boolean(ctx?.can("message_candidates"))}
            canDecide={Boolean(ctx?.can("invite_decline"))}
            canDraft={Boolean(ctx?.can("invite_decline") && ctx?.can("use_ai"))}
            initialSendId={send && r.data.rows.some((x) => x.id === send) ? send : null}
        />
    )
}
