"use client";

// The loading silhouette for `profile-view.tsx`: identity card (cover + avatar +
// level + stats), then the 2/1 section grid.
//
// Lives beside the view rather than inside one route's _components, because BOTH
// profile routes render that view and so both need this. Kept deliberately in
// step with it - per CLAUDE.md a skeleton that does not match the real layout is
// worse than none, since the page visibly reflows when the data lands.
function Block({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/60 ${className}`}
        />
    );
}

export function ProfileSkeleton() {
    return (
        <div className="mx-auto w-full max-w-5xl space-y-5 px-page py-6 pb-12">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="h-24 animate-pulse bg-neutral-200 dark:bg-neutral-800 sm:h-28" />
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="flex items-end gap-4">
                        <div className="-mt-10 h-20 w-20 animate-pulse rounded-2xl border-4 border-white bg-neutral-200 dark:border-neutral-900 dark:bg-neutral-800 sm:-mt-12 sm:h-24 sm:w-24" />
                        <div className="space-y-2 pb-1">
                            <Block className="h-5 w-40" />
                            <Block className="h-3.5 w-24" />
                        </div>
                    </div>
                    <Block className="mt-4 h-4 w-64" />
                    <Block className="mt-2 h-4 w-full max-w-lg" />
                    <Block className="mt-5 h-[68px] w-full" />
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <Block key={i} className="h-[62px]" />)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <Block className="h-64" />
                    <Block className="h-48" />
                    <Block className="h-40" />
                </div>
                <div className="space-y-5">
                    <Block className="h-40" />
                    <Block className="h-32" />
                </div>
            </div>
        </div>
    );
}

export default ProfileSkeleton;
