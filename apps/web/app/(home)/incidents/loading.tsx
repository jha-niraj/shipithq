/** Skeleton for /incidents: the split hero (copy beside the system map), then the before's two panels. */
export default function Loading() {
    return (
        <div className="animate-pulse bg-neutral-50">
            <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div>
                    <div className="h-3 w-28 rounded bg-neutral-200" />
                    <div className="mt-5 h-12 w-full max-w-lg rounded bg-neutral-300" />
                    <div className="mt-3 h-12 w-2/3 rounded bg-neutral-300" />
                    <div className="mt-6 h-4 w-full max-w-xl rounded bg-neutral-200" />
                    <div className="mt-2 h-4 w-4/5 max-w-xl rounded bg-neutral-200" />
                    <div className="mt-8 h-12 w-56 rounded-lg bg-neutral-300" />
                </div>
                <div className="h-80 rounded-2xl border border-neutral-200 bg-white" />
            </div>
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
                <div className="h-3 w-16 rounded bg-neutral-200" />
                <div className="mt-4 h-9 w-full max-w-md rounded bg-neutral-300" />
                <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <div className="h-56 rounded-2xl border border-neutral-200 bg-white" />
                    <div className="h-56 rounded-2xl bg-neutral-300" />
                </div>
            </div>
        </div>
    )
}
