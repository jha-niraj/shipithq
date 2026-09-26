import { ArrowRight, CircleDashed, Link2 } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { APP_LINKS } from "@/lib/site"
import { HOME_WEDGE } from "@/content/home"
import { Eyebrow, MONO, PrimaryCta, TONE } from "@/components/marketing/primitives"

/**
 * The wedge, right under the hero (plan/competition/skillmeet CMP-5; Niraj, 2026-09-26:
 * keep the hero, give the wedge its own band). A pasted link turns into that job's
 * rounds with their pass marks, CSS only; reduced motion shows the rounds, still.
 * Copy lives in content/home.ts (HOME_WEDGE), where its sources are listed.
 */

/** Row i appears at 28% + 9% x i of the 9-second loop. Keyframe selectors can't read a CSS variable, so one set per row. */
const ROWS = HOME_WEDGE.example.rounds.length + 1
const rowAt = (i: number) => 28 + i * 9
const MOTION = `
@keyframes pj-type { 0% { width: 0 } 22%, 100% { width: 100% } }
${Array.from({ length: ROWS }, (_, i) => `@keyframes pj-row-${i} { 0%, ${rowAt(i)}% { opacity: 0; transform: translateY(6px) } ${rowAt(i) + 4}%, 100% { opacity: 1; transform: none } }
.pj-row-${i} { animation: pj-row-${i} 9s ease-out infinite; }`).join("\n")}
.pj-type { width: 100%; animation: pj-type 9s steps(34, end) infinite; }
@media (prefers-reduced-motion: reduce) { .pj-type, ${Array.from({ length: ROWS }, (_, i) => `.pj-row-${i}`).join(", ")} { animation: none; } }
`

const tone = TONE.mint

export function PasteJobBand() {
    const w = HOME_WEDGE
    return (
        <section className="px-4 pt-4 sm:px-6">
            <style>{MOTION}</style>
            <div className={cn("sh-reveal mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[28px] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:p-14", tone.surface, tone.ink)}>
                <div>
                    <Eyebrow className={tone.muted}>{w.eyebrow}</Eyebrow>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{w.title}</h2>
                    <p className={cn("mt-4 max-w-lg text-[16px] leading-7", tone.muted)}>{w.sub}</p>
                    <p className={cn(MONO, "mt-4 text-[11px] uppercase tracking-[0.14em]", tone.muted)}>{w.fine}</p>
                    <div className="mt-8">
                        <PrimaryCta href={APP_LINKS.importJob}>Paste a job</PrimaryCta>
                    </div>
                </div>

                <div aria-hidden className="rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-neutral-900/10 sm:p-6">
                    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                        <Link2 className="size-4 shrink-0 text-neutral-500" />
                        <span className={cn(MONO, "block min-w-0 flex-1 overflow-hidden text-[12.5px] text-neutral-800")}>
                            <span className="pj-type block overflow-hidden whitespace-nowrap">{w.example.url}</span>
                        </span>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white"><ArrowRight className="size-3.5" /></span>
                    </div>
                    <ol className="mt-4 space-y-2">
                        {w.example.rounds.map((r, i) => (
                            <li key={r.name} className={cn(`pj-row-${i}`, "flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5")}>
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold text-neutral-700">{i + 1}</span>
                                <span className="text-[14px] font-medium text-neutral-900">{r.name}</span>
                                <span className={cn(MONO, "ml-auto text-[11px] text-neutral-600")}>{r.meta}</span>
                            </li>
                        ))}
                        <li className={cn(`pj-row-${w.example.rounds.length}`, "flex items-center gap-2 px-1 pt-1 text-[12.5px] text-neutral-600")}>
                            <CircleDashed className="size-3.5" /> {w.example.notPractisable}
                        </li>
                    </ol>
                </div>
            </div>
        </section>
    )
}
