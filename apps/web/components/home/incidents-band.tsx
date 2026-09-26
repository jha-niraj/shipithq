import { cn } from "@repo/ui/lib/utils"
import { APP_LINKS } from "@/lib/site"
import { Eyebrow, GhostCta, MONO, PrimaryCta } from "@/components/marketing/primitives"

/**
 * Incidents on the student landing (plan/incidents INC-6; Niraj, 2026-09-26: its own
 * section, not a ninth tile). The cases live in the app, public to read, so both
 * actions are app-origin links, rendered as plain <a> by PrimaryCta/GhostCta.
 *
 * The timeline on the right is case one in miniature, CSS only: the job runs, the
 * page is refreshed at 30 s, the work inside the request dies with nothing written.
 * Reduced motion shows that end state, still.
 */

const CASE = `${APP_LINKS.incidents}/the-demo-that-died-at-30-seconds`

const MOTION = `
@keyframes ib-run { 0% { width: 0 } 30%, 100% { width: 25% } }
@keyframes ib-dead { 0%, 30% { width: 0; opacity: 0 } 31% { opacity: 1 } 58%, 100% { width: 75%; opacity: 1 } }
@keyframes ib-wait { 0% { width: 0 } 30%, 100% { width: 25% } }
@keyframes ib-gone { 0%, 30% { opacity: 0 } 34%, 100% { opacity: 1 } }
@keyframes ib-head { 0% { left: 0 } 30% { left: 25% } 58%, 100% { left: 100% } }
@keyframes ib-late { 0%, 60% { opacity: 0; transform: translateY(6px) } 66%, 100% { opacity: 1; transform: none } }
.ib-run { width: 25%; animation: ib-run 8s linear infinite; }
.ib-dead { width: 75%; animation: ib-dead 8s linear infinite; }
.ib-wait { width: 25%; animation: ib-wait 8s linear infinite; }
.ib-gone { animation: ib-gone 8s linear infinite; }
.ib-head { left: 100%; animation: ib-head 8s linear infinite; }
.ib-late { animation: ib-late 8s ease-out infinite; }
.ib-stripes { background-image: repeating-linear-gradient(115deg, rgba(0,0,0,.12) 0 6px, transparent 6px 12px); }
@media (prefers-reduced-motion: reduce) { .ib-run, .ib-dead, .ib-wait, .ib-gone, .ib-head, .ib-late { animation: none; } }
`

function Lane({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className={cn(MONO, "w-16 shrink-0 text-[10px] uppercase tracking-[0.12em] text-neutral-400")}>{label}</span>
            <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-white/[0.05]">{children}</div>
        </div>
    )
}

export function IncidentsBand() {
    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <style>{MOTION}</style>
            <div className="sh-reveal mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[28px] bg-neutral-950 p-6 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:p-14">
                <div>
                    <Eyebrow className="text-neutral-400">New · Incidents</Eyebrow>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Learn production from the day it broke.</h2>
                    <p className="mt-4 max-w-md text-[16px] leading-7 text-neutral-300">
                        A demo died in front of a client and everyone blamed Cloudflare&apos;s 30-second limit. It was none of the three.
                        Real failures as cases you play: predict what happens, watch it, leave with the fix.
                    </p>
                    <p className={cn(MONO, "mt-4 text-[11px] uppercase tracking-[0.14em] text-neutral-400")}>Free to read · no codebase needed</p>
                    <div className="mt-8 flex flex-wrap items-center gap-5">
                        <PrimaryCta href={CASE} onInk>Open the case</PrimaryCta>
                        <GhostCta href={APP_LINKS.incidents} onInk>All incidents</GhostCta>
                    </div>
                </div>

                <div aria-hidden className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 sm:p-6">
                    <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-400")}>The demo · a two-minute job inside the request</p>
                    <div className="mt-5 flex gap-3">
                        <span className="w-16 shrink-0" />
                        <div className={cn(MONO, "relative h-4 flex-1 text-[10px] text-neutral-400")}>
                            {[0, 30, 60, 90, 120].map((v) => (
                                <span key={v} className={cn("absolute -translate-x-1/2", v === 30 && "text-white")} style={{ left: `${(v / 120) * 100}%` }}>{v}s</span>
                            ))}
                        </div>
                    </div>
                    <div className="relative mt-2 space-y-2">
                        <Lane label="Browser">
                            <span className="ib-wait absolute inset-y-1 left-0 rounded-md bg-white/20" />
                            <span className={cn(MONO, "ib-gone absolute inset-y-1 left-[25%] right-1 flex items-center rounded-md border border-dashed border-white/20 px-2 text-[10.5px] text-neutral-400")}>refreshed, old request gone</span>
                        </Lane>
                        <Lane label="The job">
                            <span className="ib-run ib-stripes absolute inset-y-1 left-0 rounded-md bg-white" />
                            <span className={cn(MONO, "ib-dead absolute inset-y-1 left-[25%] flex items-center overflow-hidden whitespace-nowrap rounded-md bg-rose-500/20 px-2 text-[10.5px] text-rose-300")}>killed, nothing written</span>
                        </Lane>
                        <div className="pointer-events-none absolute inset-y-0 left-[4.75rem] right-0">
                            <span className="absolute inset-y-0 left-[25%] w-px bg-rose-400" />
                            <span className="ib-head absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                        </div>
                    </div>
                    <div className="ib-late mt-5 rounded-xl bg-rose-500/[0.08] p-4 ring-1 ring-rose-400/25">
                        <p className="text-[14px] font-semibold text-rose-300">Status: generating. Error: empty.</p>
                        <p className="mt-1 text-[13px] leading-5 text-neutral-400">Nothing failed; something stopped. Which limit was it?</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
