import { notFound, redirect } from "next/navigation"
import { getSendPage } from "@/actions/hiring/send.action"
import { SendClient } from "./_components/send-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Send your results | ShipItHQ" }

/** Send a run's results to the company (plan/hiring-rounds HR-17). */
export default async function SendPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const r = await getSendPage(slug)
    if (!r.success) {
        if (r.code === "UNAUTHORIZED") redirect(`/signin?callbackUrl=${encodeURIComponent(`/jobs/${slug}/rounds/send`)}`)
        if (r.code === "NOT_FOUND") notFound()
        throw new Error(r.error)
    }
    return <SendClient jobSlug={slug} page={r.data} />
}
