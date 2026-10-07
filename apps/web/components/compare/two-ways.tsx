import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import type { Comparison } from "@/app/(home)/compare/_components/comparisons"

/**
 * One interview loop prepared both ways (plan/web/story ST-10): each comparison row that is part of
 * preparing is a step, the two products are two lanes, and a step is dashed only where its row's
 * `gap` says that side does not cover it, as that side's own cell words it (for them "Not what a
 * problem bank is for", for us "None. It is tooling, not a person"). The marks are data in
 * comparisons.ts, set by reading each cell, not guessed from text; a partial cell ("Varies",
 * "Sometimes included") counts as covered. Rows with `step: false` (cost, timescale, scheduling)
 * are left out. No score: the table below has the words.
 *
 * It sits AFTER "What X is genuinely good at", not at the top: the page's rule is that a comparison
 * opening with the other product's gaps reads as an advert (see the page's header comment).
 */
export function TwoWays({ c }: { c: Comparison }) {
    const steps = c.rows.filter((r) => r.step !== false)
    const lane = (who: string, dark: boolean, covered: (r: Comparison["rows"][number]) => boolean) => (
        <div className="min-w-0">
            <p className={cn(MONO, "mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>{who}</p>
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
                {steps.map((r) => {
                    const on = covered(r)
                    return (
                        <li
                            key={r.dimension}
                            className={cn(
                                "flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] leading-5",
                                on ? (dark ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 ring-1 ring-neutral-300") : "border border-dashed border-neutral-400 text-neutral-600",
                            )}
                        >
                            {on ? <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />}
                            <span>{r.dimension}{!on && <span className="sr-only"> (not covered)</span>}</span>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
    return (
        <figure className="mt-16 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50" aria-label={`One interview loop, prepared with ${c.name} and with ShipItHQ`}>
            <div className="p-5 sm:p-6">
                <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>One interview loop, both ways</p>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
                    {lane(c.name, false, (r) => r.gap !== "theirs")}
                    {lane("ShipItHQ", true, (r) => r.gap !== "ours")}
                </div>
                <p className="mt-4 text-[12.5px] leading-5 text-neutral-600">
                    Dashed: a step that side does not cover, in its own words, as the table below quotes them. Prices are not compared.
                </p>
            </div>
            <figcaption className="border-t border-neutral-200 bg-white px-5 py-3.5 text-[15px] font-medium text-neutral-900 sm:px-6">{c.stance}</figcaption>
        </figure>
    )
}
