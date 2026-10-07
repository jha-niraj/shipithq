import type { ReactNode } from "react"
import { Check, Mic } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { MONO } from "@/components/marketing/primitives"

/**
 * Drawing primitives for stories (plan/web/story ST-5), in the site's own style: thin lines,
 * neutral ink, one lit element. No hooks, so they render on the server or inside a client
 * story alike. Every drawing gets its words from real data passed in, never from here.
 */

/** A check as the case asks it: the question, its options, the right one lit. */
export function QuizCard({ prompt, options, answer, label = "Check yourself" }: {
    prompt: string
    options: { id: string; label: string }[]
    answer?: string
    label?: string
}) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white">
            <p className={cn(MONO, "border-b border-neutral-200 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>{label}</p>
            <div className="p-4">
                <p className="text-[15px] font-semibold leading-6 text-neutral-900">{prompt}</p>
                <ul className="mt-3 space-y-2">
                    {options.map((o) => {
                        const right = o.id === answer
                        return (
                            <li key={o.id} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[14px] leading-5", right ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-700")}>
                                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", right ? "border-white" : "border-neutral-400")}>
                                    {right && <Check className="size-3" aria-hidden />}
                                </span>
                                {o.label}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

/** A conversation: the lead's lines, and where the reader answers (typed or spoken). */
export function Chat({ lines, reply }: { lines: { who: "lead"; text: ReactNode }[]; reply?: string }) {
    return (
        <div className="space-y-3">
            {lines.map((l, i) => (
                <div key={i} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">IL</span>
                    <p className="max-w-[34rem] rounded-2xl rounded-tl-sm bg-neutral-100 px-3.5 py-2.5 text-[14px] leading-6 text-neutral-900">{l.text}</p>
                </div>
            ))}
            {reply && (
                <div className="flex justify-end">
                    <p className="inline-flex items-center gap-2 rounded-2xl rounded-tr-sm border border-dashed border-neutral-400 px-3.5 py-2.5 text-[14px] text-neutral-600">
                        <Mic className="size-4" aria-hidden /> {reply}
                    </p>
                </div>
            )}
        </div>
    )
}

/** The run report's four bands (apps/main report-view.tsx), each on its four-step scale. */
export const REPORT_BANDS = ["Diagnosis", "Reasoning", "Questions asked", "Explaining the fix"] as const
export const REPORT_SCALE = ["Not shown yet", "Developing", "Solid", "Strong"] as const

export function ReportBands({ lit }: { lit?: string }) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-white">
            <p className={cn(MONO, "border-b border-neutral-200 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>Your run, reviewed</p>
            <ul className="divide-y divide-neutral-100">
                {REPORT_BANDS.map((b) => (
                    <li key={b} className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-3", lit === b && "bg-neutral-50")}>
                        <span className={cn("text-[14px] font-medium", lit === b ? "text-neutral-900" : "text-neutral-700")}>{b}</span>
                        <span className="flex gap-1" aria-label={`Rated on: ${REPORT_SCALE.join(", ")}`}>
                            {REPORT_SCALE.map((s) => <span key={s} className="h-2 w-6 rounded-full bg-neutral-200" />)}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="px-4 py-2.5 text-[12.5px] leading-5 text-neutral-600">Each band rated {REPORT_SCALE.slice().reverse().join(", ").toLowerCase()}, with the moments behind it.</p>
        </div>
    )
}

/**
 * A worked sum (plan/web/story ST-10): each line, its amount, the running total, and what is left
 * of `budget`. Pass amounts from their source; the total is computed here, never typed.
 */
export function Sum({ lines, budget, unit = "credits", label }: {
    lines: { what: string; amount: number; note?: string }[]
    budget: number
    unit?: string
    label: string
}) {
    let run = 0
    const total = lines.reduce((n, l) => n + l.amount, 0)
    const left = budget - total
    return (
        <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label={label}>
            <table className="w-full text-left text-[14px]">
                <caption className={cn(MONO, "border-b border-neutral-200 px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>{label}</caption>
                <thead className="sr-only"><tr><th>What</th><th>{unit}</th><th>Running total</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                    {lines.map((l) => {
                        run += l.amount
                        return (
                            <tr key={l.what}>
                                <td className="px-4 py-3">
                                    <span className="block font-medium text-neutral-900">{l.what}</span>
                                    {l.note && <span className="block text-[12.5px] text-neutral-600">{l.note}</span>}
                                </td>
                                <td className={cn(MONO, "px-4 py-3 text-right tabular-nums text-neutral-900")}>{l.amount}</td>
                                <td className={cn(MONO, "w-20 px-4 py-3 text-right tabular-nums text-neutral-500")}>{run}</td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-neutral-900">
                        <td className="px-4 py-3 font-semibold text-neutral-900">Total</td>
                        <td className={cn(MONO, "px-4 py-3 text-right font-semibold tabular-nums text-neutral-900")}>{total}</td>
                        <td className={cn(MONO, "whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-600")}>of {budget}</td>
                    </tr>
                </tfoot>
            </table>
            <figcaption className="border-t border-neutral-200 px-4 py-3 text-[14px] font-medium text-neutral-900">
                {left === 0 ? `Exactly the ${budget} free ${unit}.` : left > 0 ? `${left} ${unit} left over.` : `${-left} ${unit} more than the free ${budget}.`}
            </figcaption>
        </figure>
    )
}
