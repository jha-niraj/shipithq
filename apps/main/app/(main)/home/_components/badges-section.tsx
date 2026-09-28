import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Award } from "lucide-react"
import { Shimmer } from "@repo/ui/components/skeleton-kit"
import { byStanding, loadBadges } from "@/lib/badges/load"
import { BadgeTiles } from "@/components/badges/badge-tiles"

/**
 * Badges on Home (plan/badges BDG-5): the four latest earned and the four closest to
 * earning, and a link to all of them. A new account sees the four closest.
 */

async function BadgesInner({ userId }: { userId: string }) {
    const all = await loadBadges(userId)
    const earned = all.filter((b) => b.earned).sort(byStanding).slice(0, 4)
    const next = all.filter((b) => !b.earned).sort(byStanding).slice(0, 8 - earned.length)
    const total = all.filter((b) => b.earned).length
    return (
        <>
            <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
                {total ? `${total} of ${all.length} earned. The latest, then the closest to earning.` : "None yet. These are the closest to earning."}
            </p>
            <BadgeTiles badges={[...earned, ...next]} />
        </>
    )
}

function BadgesSkeleton() {
    return (
        <>
            <Shimmer className="mb-3 h-3 w-72" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-60 rounded-[18px]" delay={i * 0.05} />)}
            </div>
        </>
    )
}

export function BadgesSection({ userId }: { userId: string }) {
    return (
        <section aria-label="Badges" className="space-y-1">
            <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                        <Award className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    </span>
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Badges</h2>
                </div>
                <Link href="/badges" className="group inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                    All badges <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
            <Suspense fallback={<BadgesSkeleton />}>
                <BadgesInner userId={userId} />
            </Suspense>
        </section>
    )
}

export function BadgesSectionSkeleton() {
    return (
        <section aria-busy aria-label="Loading badges" className="space-y-1">
            <div className="flex items-center gap-2.5 pt-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/10 dark:bg-white/10">
                    <Award className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                </span>
                <span className="text-base font-semibold text-neutral-900 dark:text-white">Badges</span>
            </div>
            <BadgesSkeleton />
        </section>
    )
}
