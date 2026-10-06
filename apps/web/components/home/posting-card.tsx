import { ArrowRight, CircleDashed, Link2 } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"
import { HOME_WEDGE } from "@/content/home"

/**
 * One pasted job and the rounds it becomes (plan/web/story ST-7): the landing hero's still, and the
 * first step of the job story. No timer and no loop: the whole result is on screen. Rounds and gates
 * come from HOME_WEDGE (content/home.ts), whose sources are the job-import code; `detail` adds each
 * round's gate, as the app's rounds overview shows it.
 */
export function PostingCard({ detail = false, className }: { detail?: boolean; className?: string }) {
    const w = HOME_WEDGE.example
    return (
        <div className={cn("rounded-2xl bg-white p-4 ring-1 ring-neutral-900/10 sm:p-5", className)}>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                <Link2 className="size-4 shrink-0 text-neutral-500" aria-hidden />
                <span className={cn(MONO, "min-w-0 flex-1 truncate text-[12.5px] text-neutral-800")}>{w.url}</span>
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white"><ArrowRight className="size-3.5" /></span>
            </div>
            <p className={cn(MONO, "mt-4 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Its rounds, in order</p>
            <ol className="mt-2 space-y-2">
                {w.rounds.map((r, i) => {
                    const advisory = r.meta.includes("advisory")
                    return (
                        <li key={r.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-neutral-200 px-3 py-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold text-neutral-700">{i + 1}</span>
                            <span className="min-w-0 text-[14px] font-medium text-neutral-900">{r.name}</span>
                            <span className={cn(MONO, "ml-auto shrink-0 text-right text-[11px] text-neutral-600")}>
                                {detail ? r.meta : r.meta.split(" · ")[0]}
                            </span>
                            {detail && (
                                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium", advisory ? "bg-neutral-100 text-neutral-700" : "bg-neutral-900 text-white")}>
                                    {advisory ? "Advisory" : "Gate"}
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
            <p className="mt-3 flex items-center gap-2 px-1 text-[12.5px] text-neutral-600">
                <CircleDashed className="size-3.5 shrink-0" aria-hidden /> {w.notPractisable}
            </p>
        </div>
    )
}
