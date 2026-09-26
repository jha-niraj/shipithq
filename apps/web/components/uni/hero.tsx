import { UNI_PLANS } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { UNI_LINKS } from "@/lib/site"
import { GhostCta, MONO, PrimaryCta } from "@/components/marketing/primitives"

/**
 * The /uni hero (plan/web/revamp REV-31). Different from the student page (split,
 * white) and /hire (ink, centred): a blush panel with a cohort readiness board drawn
 * beside the copy. Four departments fill dot by dot as students finish the work you
 * assign; the board is an illustration, not data (it says so), CSS only, and holds
 * its finished frame under reduced motion.
 */

const DEPTS = [
    { name: "CSE", ready: 11 },
    { name: "IT", ready: 9 },
    { name: "ECE", ready: 7 },
    { name: "ME", ready: 5 },
]
const DOTS = 14

const MOTION = `
@keyframes uh-fill { 0%, 8% { background: rgba(23,23,23,.12); transform: scale(.7); } 22%, 100% { background: #171717; transform: scale(1); } }
@keyframes uh-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes uh-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.uh-dot[data-on] { animation: uh-fill 6s cubic-bezier(.2,.7,.2,1) infinite; }
.uh-bar { transform-origin: left center; animation: uh-bar 1.6s cubic-bezier(.2,.7,.2,1) both; }
.uh-in { animation: uh-in .6s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) {
  .uh-dot[data-on] { animation: none; background: #171717; }
  .uh-bar, .uh-in { animation: none; }
}
`

function Board() {
    const total = DEPTS.reduce((s, d) => s + d.ready, 0)
    return (
        <div aria-hidden className="rounded-2xl bg-white p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-neutral-900/5 sm:p-6">
            <div className="flex items-center justify-between">
                <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Batch of 2027 · readiness</p>
                <span className={cn(MONO, "rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600")}>Illustration</span>
            </div>
            <ul className="mt-5 space-y-3.5">
                {DEPTS.map((d, di) => (
                    <li key={d.name} className="flex items-center gap-3">
                        <span className={cn(MONO, "w-9 shrink-0 text-[12px] font-medium text-neutral-900")}>{d.name}</span>
                        <span className="flex flex-1 flex-wrap gap-1.5">
                            {Array.from({ length: DOTS }, (_, i) => (
                                <span
                                    key={i}
                                    data-on={i < d.ready ? "" : undefined}
                                    className={cn("uh-dot size-3 rounded-full sm:size-3.5", i < d.ready ? "bg-neutral-900" : "bg-neutral-900/10")}
                                    style={i < d.ready ? { animationDelay: `${di * 0.35 + i * 0.12}s` } : undefined}
                                />
                            ))}
                        </span>
                        <span className={cn(MONO, "w-10 shrink-0 text-right text-[12px] tabular-nums text-neutral-700")}>{Math.round((d.ready / DOTS) * 100)}%</span>
                    </li>
                ))}
            </ul>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-5">
                {[
                    { label: "Projects done", v: 0.72 },
                    { label: "Mocks taken", v: 0.58 },
                    { label: "Assessments", v: 0.81 },
                ].map((m, i) => (
                    <div key={m.label}>
                        <p className="text-[11.5px] text-neutral-600">{m.label}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            <div className="uh-bar h-full rounded-full bg-neutral-900" style={{ width: `${m.v * 100}%`, animationDelay: `${0.3 + i * 0.15}s` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="uh-in mt-5 flex items-center justify-between rounded-xl bg-[#BFE3D0] px-4 py-3" style={{ animationDelay: "0.9s" }}>
                <span className="text-[13px] font-medium text-neutral-900">Ready for the placement drive</span>
                <span className={cn(MONO, "text-[13px] font-semibold tabular-nums text-neutral-900")}>{total} students</span>
            </div>
        </div>
    )
}

export function UniHero() {
    return (
        <section className="px-4 pt-6 sm:px-6">
            <style>{MOTION}</style>
            <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-3xl bg-[#F2C9C4] p-8 text-neutral-900 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:p-16">
                <div className="min-w-0">
                    <p className={cn(MONO, "sh-reveal inline-flex rounded-lg border border-neutral-900/15 bg-white/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-neutral-800")}>
                        ShipItHQ for universities
                    </p>
                    <h1 className="sh-reveal mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
                        Know who is ready <span className="block text-neutral-900/55">before the companies arrive.</span>
                    </h1>
                    <p className="sh-reveal mt-6 max-w-xl text-lg leading-8 text-neutral-800" style={{ ["--sh-reveal-delay" as string]: "0.06s" }}>
                        Assign real projects, voice mock interviews and code assessments to every class. Students do the
                        work on ShipItHQ, where they already practise, and the placement cell sees each department&apos;s
                        readiness in one place.
                    </p>
                    <div className="sh-reveal mt-8 flex flex-wrap items-center gap-x-7 gap-y-4" style={{ ["--sh-reveal-delay" as string]: "0.12s" }}>
                        <PrimaryCta href={UNI_LINKS.signup}>Set up your campus</PrimaryCta>
                        <GhostCta href="#how-it-works" play>See how it works</GhostCta>
                    </div>
                    <p className={cn(MONO, "mt-5 text-[11px] uppercase tracking-[0.14em] text-neutral-700")}>
                        Free for up to {UNI_PLANS.FREE.maxStudents} students · Six campus roles
                    </p>
                </div>
                <div className="sh-reveal min-w-0" style={{ ["--sh-reveal-delay" as string]: "0.1s" }}>
                    <Board />
                </div>
            </div>
        </section>
    )
}
