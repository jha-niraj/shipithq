import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"

// Matches /uni: the blush split hero with the readiness board, then the five module cards.
export default function Loading() {
    return (
        <main className="bg-neutral-50">
            <ShimmerStyles />
            <section className="px-4 pt-6 sm:px-6" aria-hidden>
                <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-3xl bg-[#F2C9C4]/60 p-8 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:p-16">
                    <div className="space-y-4">
                        <Shimmer className="h-7 w-52 rounded-lg" />
                        <Shimmer className="h-14 w-full" delay={0.05} />
                        <Shimmer className="h-14 w-4/5" delay={0.08} />
                        <Shimmer className="h-5 w-full" delay={0.1} />
                        <div className="flex gap-4 pt-4"><Shimmer className="h-12 w-44 rounded-lg" /><Shimmer className="h-12 w-36 rounded-lg" /></div>
                    </div>
                    <Shimmer className="h-80 w-full rounded-2xl" delay={0.1} />
                </div>
            </section>
            <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="mt-4 h-9 w-96 max-w-full" />
                <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-80 rounded-2xl" delay={i * 0.05} />)}
                </div>
            </div>
        </main>
    )
}
