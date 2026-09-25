// Hand-matched to `workspace-client.tsx`. With the editor off (V1,
// plan/project-repos RP-2): 44px title bar, 48px activity rail, tasks (16%),
// the tab row over the page, and the Project AI panel (40%) on the right (WS-20). With it on, also the preview (38%
// of the editor), tests below (26%), the explorer (16%) and a 24px status bar.
// Change the two together.
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit";
import { WORKSPACE_EDITOR } from "@/lib/projects/flags";

export default function Loading() {
    return (
        <div className="flex h-screen flex-col bg-white dark:bg-black">
            <ShimmerStyles />
            <div className="flex h-11 shrink-0 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                <Shimmer className="h-4 w-44" />
                <Shimmer className="mx-auto h-3 w-64" delay={0.06} />
                <Shimmer className="h-3 w-16" delay={0.1} />
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-neutral-200 py-3 dark:border-neutral-800">
                    {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-6 w-6 rounded-md" delay={i * 0.04} />)}
                </div>
                <div className="w-[16%] shrink-0 space-y-2 border-r border-neutral-200 p-3 dark:border-neutral-800">
                    <Shimmer className="h-3 w-12" />
                    {Array.from({ length: 7 }).map((_, i) => <Shimmer key={i} className="h-5 w-full" delay={i * 0.05} />)}
                </div>
                {WORKSPACE_EDITOR ? <EditorColumns /> : <PageColumn />}
                {/* The Project AI panel, open by default on the right (WS-20). */}
                <div className="flex w-[40%] shrink-0 flex-col border-l border-neutral-200 dark:border-neutral-800">
                    <div className="flex h-9 items-center border-b border-neutral-200 px-3 dark:border-neutral-800"><Shimmer className="h-3 w-20" /></div>
                    <div className="space-y-3 p-4">
                        <Shimmer className="h-3 w-4/5" delay={0.05} />
                        <Shimmer className="ml-auto h-8 w-3/5 rounded-2xl" delay={0.1} />
                        <Shimmer className="h-12 w-4/5 rounded-2xl" delay={0.15} />
                    </div>
                </div>
            </div>
            {WORKSPACE_EDITOR && <div className="h-6 shrink-0 border-t border-neutral-200 dark:border-neutral-800" />}
        </div>
    );
}

function TabRow() {
    return (
        <div className="flex h-9 items-center gap-2 border-b border-neutral-200 px-2 dark:border-neutral-800">
            <Shimmer className="h-5 w-24 rounded" />
            <Shimmer className="h-5 w-20 rounded" delay={0.05} />
        </div>
    );
}

/* The Task tab's brief, in the page's centred column (PAGE_COLUMN). */
function PageColumn() {
    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <TabRow />
            <div className="mx-auto w-full max-w-4xl space-y-3 px-6 pt-4">
                <Shimmer className="h-3 w-40" />
                <Shimmer className="h-6 w-2/3" delay={0.04} />
                <Shimmer className="mt-4 h-7 w-56 rounded-lg" delay={0.08} />
                <div className="space-y-2.5 pt-6">
                    {["w-full", "w-11/12", "w-4/5", "w-3/5"].map((w, i) => <Shimmer key={w} className={`h-3.5 ${w}`} delay={0.1 + i * 0.05} />)}
                </div>
            </div>
        </div>
    );
}

function EditorColumns() {
    return (
        <>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-[74]">
                    <div className="flex min-w-0 flex-[62] flex-col">
                        <TabRow />
                        <div className="space-y-2.5 p-6">
                            {["w-4/5", "w-3/5", "w-2/3", "w-2/5", "w-3/4", "w-1/2"].map((w, i) => <Shimmer key={w} className={`h-3.5 ${w}`} delay={i * 0.05} />)}
                        </div>
                    </div>
                    <div className="flex-[38] border-l border-neutral-200 dark:border-neutral-800">
                        <div className="flex h-9 items-center border-b border-neutral-200 px-3 dark:border-neutral-800"><Shimmer className="h-3 w-16" /></div>
                    </div>
                </div>
                <div className="flex-[26] border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex h-9 items-center gap-2 border-b border-neutral-200 px-2 dark:border-neutral-800">
                        <Shimmer className="h-5 w-14 rounded" />
                        <Shimmer className="h-5 w-16 rounded" delay={0.05} />
                    </div>
                </div>
            </div>
            <div className="w-[16%] shrink-0 space-y-2 border-l border-neutral-200 p-3 dark:border-neutral-800">
                <Shimmer className="h-3 w-16" />
                {Array.from({ length: 9 }).map((_, i) => <Shimmer key={i} className="h-4 w-full" delay={i * 0.04} />)}
            </div>
        </>
    );
}
