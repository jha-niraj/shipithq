import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Award, Clock, Target } from "lucide-react"
import { getSession } from "@repo/auth"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { BADGE_MODULES, byStanding, loadBadges } from "@/lib/badges/load"
import { BadgeTiles } from "@/components/badges/badge-tiles"

/**
 * Every badge on ShipItHQ (plan/badges BDG-4): a section per module, earned newest first,
 * then locked ones closest to earning, each with its progress.
 */

export const metadata: Metadata = { title: "Badges | ShipItHQ", description: "Every badge, what earns it, and how close you are" }
export const dynamic = "force-dynamic"

export default async function BadgesPage() {
    const session = await getSession(await headers())
    if (!session?.user?.id) redirect("/signin?callbackUrl=/badges")
    const badges = await loadBadges(session.user.id)
    const earned = badges.filter((b) => b.earned).sort(byStanding)
    const closest = badges.filter((b) => !b.earned && b.progress && b.progress.value > 0).sort(byStanding)[0]
    const latest = earned[0]

    return (
        <div className="mx-auto w-full space-y-8 px-page py-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Badges</h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Each is earned once, from what you do, and kept. Earned ones light up where your pointer is.</p>
            </header>

            <StatBand
                cols={3}
                items={[
                    { icon: Award, label: "Earned", value: `${earned.length}`, hint: `of ${badges.length}` },
                    { icon: Clock, label: "Latest", value: latest ? latest.title : "-", hint: latest?.earnedAt ? new Date(latest.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "none yet" },
                    { icon: Target, label: "Closest", value: closest ? closest.title : "-", hint: closest?.progress?.label ?? "start anything to begin" },
                ]}
            />

            {BADGE_MODULES.map((m) => {
                const list = badges.filter((b) => b.module === m.key).sort(byStanding)
                if (!list.length) return null
                const got = list.filter((b) => b.earned).length
                return (
                    <section key={m.key} aria-label={m.label}>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{m.label}</h2>
                            <p className="text-xs text-neutral-500 tabular-nums">{got} of {list.length} earned</p>
                        </div>
                        <BadgeTiles badges={list} />
                    </section>
                )
            })}
        </div>
    )
}
