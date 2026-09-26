import { cn } from "@repo/ui/lib/utils"
import { HIRING_LINKS } from "@/lib/site"
import { GhostCta, MONO, PrimaryCta } from "@/components/marketing/primitives"
import { GateFlow } from "./gate-flow"

/**
 * The /hire hero (plan/web/revamp REV-21, REV-102; Niraj, 2026-09-26: "the hero needs
 * to be different"). An ink band, so a company knows at a glance it is not on the
 * student page, with the product's promise drawn underneath: candidates flow through
 * gated rounds and only some reach the shortlist (gate-flow.tsx).
 *
 * The headline is the product's promise, kept by Niraj's decision while the round
 * runners are built (content/hire.ts).
 */
export function HireHero() {
    return (
        <section className="px-4 pt-6 sm:px-6">
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-neutral-950 text-white">
                {/* Soft pastel light, far back. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_50%_at_15%_10%,rgba(168,213,186,0.18),transparent_70%),radial-gradient(40%_50%_at_90%_20%,rgba(242,201,196,0.16),transparent_70%)]" />

                <div className="relative flex flex-col items-center px-6 pb-6 pt-12 text-center md:pt-14">
                    <p className={cn(MONO, "sh-reveal mb-6 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-neutral-300")}>
                        ShipItHQ for companies
                    </p>
                    <h1 className="sh-reveal max-w-4xl font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-7xl">
                        Meet engineers who already{" "}
                        <span className={cn(MONO, "font-medium tracking-[-0.06em] text-[#A8D5BA]")}>passed.</span>
                    </h1>
                    <p className="sh-reveal mt-5 max-w-2xl text-lg leading-8 text-neutral-300" style={{ ["--sh-reveal-delay" as string]: "0.06s" }}>
                        Design your interview once: aptitude, coding, system design and voice rounds, each
                        with a pass mark. Candidates take them on ShipItHQ, and your shortlist starts with
                        the ones who cleared them.
                    </p>
                    <div className="sh-reveal mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-4" style={{ ["--sh-reveal-delay" as string]: "0.12s" }}>
                        <PrimaryCta href={HIRING_LINKS.signup} onInk>Start hiring free</PrimaryCta>
                        <GhostCta href="#how-it-works" play onInk>See how it works</GhostCta>
                    </div>
                    <p className={cn(MONO, "mt-4 text-[11px] uppercase tracking-[0.14em] text-neutral-400")}>
                        Free plan · Company email only
                    </p>
                </div>

                {/* The pipeline, full width at md and up; a compact row of rounds below. */}
                <div className="relative hidden px-8 pb-8 pt-0 md:block">
                    <GateFlow />
                </div>
                <div className="relative flex flex-wrap justify-center gap-2 border-t border-white/10 px-6 py-6 md:hidden">
                    {["Aptitude", "Coding (DSA)", "System design", "Voice round", "Shortlist"].map((r, i) => (
                        <span key={r} className={cn(MONO, "rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.1em]", i === 4 ? "bg-[#A8D5BA] text-neutral-950" : "border border-white/15 text-neutral-300")}>{r}</span>
                    ))}
                </div>
            </div>
        </section>
    )
}
