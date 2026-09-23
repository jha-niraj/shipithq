import { PageHeader } from "@repo/ui/components/ui/page-header"
import { TabsNav } from "@repo/ui/components/ui/tabs"
import { Button } from "@repo/ui/components/ui/button"
import { Plus } from "lucide-react"
import ProjectGenerateSheet from "@/components/projects/project-generate-sheet"

// The Explore page's frame: the header with the tabs on its right, and whatever
// pane the tab selected (plan/projects, PJ-3 and PJ-4).

export const EXPLORE_TABS = [
    { value: "ideas", label: "Ideas" },
    { value: "community", label: "Community" },
    { value: "mine", label: "Mine" },
] as const

export type ExploreTab = (typeof EXPLORE_TABS)[number]["value"]

const SUBTITLE: Record<ExploreTab, string> = {
    ideas: "Curated projects to build, by stack or by the problem they solve.",
    community: "What other people have built here and made public.",
    mine: "Everything you have started, and where each one stands.",
}

export function ExploreShell({ tab, children }: { tab: ExploreTab; children: React.ReactNode }) {
    return (
        /*
         * The header stays put while the grid scrolls under it (Niraj,
         * 2026-09-23). Three things make that work here, and all three are
         * load-bearing:
         *
         *  - The scroller is the shell's ScrollArea viewport, not the window, so
         *    `sticky top-0` is relative to it. Nothing between this header and
         *    that viewport may have `overflow-hidden` or a `transform` - which is
         *    why the header is a SIBLING of `{children}` and not inside one of the
         *    panes, whose framer wrappers animate a transform on mount and would
         *    otherwise contain it.
         *  - It needs its own opaque surface. `data-app-page` is deliberately
         *    transparent over the backdrop, so a bare sticky header has the grid
         *    visibly scrolling through it.
         *  - The padding moves off the column and onto the header and the body
         *    separately, or the stuck band leaves transparent gutters either side.
         *    That also means no `space-y-*` on the parent: a sibling margin renders
         *    ABOVE a stuck element.
         */
        <div className="w-full pb-6">
            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 px-page py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
            <PageHeader
                title="Explore projects"
                subtitle={SUBTITLE[tab]}
                tabs={
                    <TabsNav
                        aria-label="Explore"
                        size="sm"
                        variant="segmented"
                        items={EXPLORE_TABS.map((t) => ({
                            // Only the tab: switching tabs drops the previous tab's filters,
                            // which belong to it and mean nothing in the next one.
                            href: `/projects/explore?tab=${t.value}`,
                            label: t.label,
                            active: tab === t.value,
                        }))}
                    />
                }
                actions={
                    // The sheet opens HERE. It used to link to `/projects?generate=1`,
                    // a parameter the hub does not read, so the page's primary action
                    // navigated away and did nothing.
                    <ProjectGenerateSheet
                        trigger={
                            <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" aria-hidden />
                                New project
                            </Button>
                        }
                    />
                }
            />
            </div>
            <div className="px-page pt-5">{children}</div>
        </div>
    )
}
