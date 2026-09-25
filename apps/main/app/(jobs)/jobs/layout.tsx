import { Suspense } from "react"
import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { getJobsTabCounts } from "@/actions/jobs/tabs"
import { JobsTabsWrapper } from "./components/jobs-tabs-wrapper"
import { JobsHeaderOffset } from "./components/header-offset"

/**
 * The jobs shell: one header row carrying the title AND the tabs.
 *
 * ── Why the tabs moved up beside the title ───────────────────────────────────
 * They were a second stacked row, so ~140px of chrome sat above the first job on
 * every tab. The tabs are a filter on one surface, not five separate places, and
 * a filter belongs on the same line as the thing it filters. Niraj, 2026-08-29.
 *
 * ── Why this page was slow, and what actually fixed it ───────────────────────
 * The layout used to `await getJobsTabCounts()` alongside the session before
 * returning anything. A layout renders BEFORE its children, so that five-count
 * aggregate blocked the header, the tab row and the page body on every single
 * navigation - each tab paying for the counts of the other four before it could
 * paint.
 *
 * The counts are now behind their own `<Suspense>`. The shell and the page paint
 * immediately; the numbers arrive when they arrive.
 *
 * Niraj asked whether these should be `?tab=` params on one page instead. They
 * should not: the query is identical either way, so a param fixes nothing, and
 * routes buy a shareable URL, a per-tab `loading.tsx`, independent fetching and
 * real browser history. The blocking `await` was the whole problem. See
 * `plan/jobs/overview.md`.
 */
export default async function JobsLayout({
    children
}: {
    children: React.ReactNode
}) {
    const session = await getSession(headers())
    const isAuthenticated = !!session?.user?.id

    return (
        <div className="min-h-full">
            {/* Opaque (JB-11), and it publishes its own height as `--jobs-header-h`
                so the browse page's control bar can pin beneath it without a
                hand-written offset. See `header-offset.tsx`. */}
            <JobsHeaderOffset>
                {/* The size of every other page header (plan/ui-pass UI-11): one 36px tab
                    strip beside a PageHeader-sized title, not a 2xl title over 44px tabs.
                    In the page frame (UI-10), so it lines up with the pages under it. */}
                <div className="page-frame flex flex-col gap-3 px-page py-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                    <div className="min-w-0 shrink-0">
                        <h1 className="text-lg leading-tight font-semibold tracking-tight text-neutral-900 dark:text-white">
                            Jobs
                        </h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Find your next opportunity
                        </p>
                    </div>

                    {/* Its own boundary. Without this the counts block the whole tree. */}
                    <Suspense
                        fallback={
                            <div className="h-8 w-full animate-pulse rounded-xl bg-neutral-100 lg:w-[34rem] dark:bg-neutral-900" />
                        }
                    >
                        <JobsTabs isAuthenticated={isAuthenticated} />
                    </Suspense>
                </div>
            </JobsHeaderOffset>

            {/* No fallback of its own: every route below has a loading.tsx
                skeleton, and a centred loader here flashed before it (UI-12). */}
            <Suspense fallback={null}>
                {children}
            </Suspense>
        </div>
    )
}

/** Split out purely so the `await` below sits inside a Suspense boundary. */
async function JobsTabs({ isAuthenticated }: { isAuthenticated: boolean }) {
    const countsResult = await getJobsTabCounts()
    const counts = countsResult.success && countsResult.data
        ? countsResult.data
        : { spark: 0, following: 0, saved: 0, applied: 0, browse: 0 }

    return <JobsTabsWrapper counts={counts} isAuthenticated={isAuthenticated} />
}
