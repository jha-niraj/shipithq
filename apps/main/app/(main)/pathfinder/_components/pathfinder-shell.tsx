import { PageHeader } from "@repo/ui/components/ui/page-header"
import { TabsNav } from "@repo/ui/components/ui/tabs"

// Pathfinder's frame (plan/pathfinder PF-3, PF-12): the header with the tabs on its
// right, like Projects' Explore, and whatever the tab shows under it. The header is
// sticky over the shell's own scroller, so it needs an opaque surface and must be a
// sibling of the content, never inside a pane that animates a transform.

export const PATHFINDER_TABS = [
    { value: "goals", label: "My goals", href: "/pathfinder" },
    { value: "overview", label: "Overview", href: "/pathfinder?tab=overview" },
    { value: "explore", label: "Explore", href: "/pathfinder/explore" },
] as const

export type PathfinderTab = (typeof PATHFINDER_TABS)[number]["value"]

const SUBTITLE: Record<PathfinderTab, string> = {
    goals: "Your learning goals, a plan of topics a day at a time.",
    overview: "How your practice is going across every goal.",
    explore: "Goals other learners have shared. Copy one and it becomes yours, free.",
}

export function PathfinderShell({ tab, actions, children }: { tab: PathfinderTab; actions?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="w-full pb-6">
            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 px-page py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
                <PageHeader
                    title="Pathfinder"
                    subtitle={SUBTITLE[tab]}
                    tabs={
                        <TabsNav
                            aria-label="Pathfinder"
                            size="sm"
                            variant="segmented"
                            items={PATHFINDER_TABS.map((t) => ({ href: t.href, label: t.label, active: tab === t.value }))}
                        />
                    }
                    actions={actions}
                />
            </div>
            <div className="px-page pt-5">{children}</div>
        </div>
    )
}
