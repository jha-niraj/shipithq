import { Check } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { GhostCta, MONO, PrimaryCta } from "@/components/marketing/primitives"

/**
 * The /uni hero (plan/web/revamp REV-31; rebuilt for early access, plan/web/story ST-15, Niraj
 * 2026-10-07). The headline keeps the goal; the paragraph and the card say plainly what works in
 * apps/uni today and what is being built (plan/uni/overview.md). It used to draw a department
 * readiness board, which is the unbuilt Analytics screen, so it is gone. No motion.
 */

const TODAY = ["Set up your institution and its departments", "Invite faculty with roles and 21 permissions", "Design projects, voice mocks and assessments"]
const NEXT = ["Classes and student rosters", "Assignments reaching students", "Results and scores back to faculty", "Department readiness and placements"]

function Status() {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-neutral-900/5 sm:p-6">
            <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>The university workspace, today</p>
            <ul className="mt-4 space-y-2">
                {TODAY.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 rounded-lg bg-neutral-900 px-3.5 py-2.5 text-[14px] font-medium leading-5 text-white">
                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden />{t}
                    </li>
                ))}
            </ul>
            <p className={cn(MONO, "mt-5 text-[10.5px] uppercase tracking-[0.14em] text-neutral-600")}>Being built with our first campuses</p>
            <ul className="mt-2 space-y-2">
                {NEXT.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 rounded-lg border border-dashed border-neutral-400 px-3.5 py-2.5 text-[14px] leading-5 text-neutral-800">
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-500" />{t}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function UniHero() {
    return (
        <section className="px-4 pt-6 sm:px-6">
            <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 overflow-hidden rounded-3xl bg-[#F2C9C4] p-8 text-neutral-900 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:p-16">
                <div className="min-w-0">
                    <p className={cn(MONO, "sh-reveal inline-flex rounded-lg border border-neutral-900/15 bg-white/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-neutral-800")}>
                        ShipItHQ for universities · Early access
                    </p>
                    <h1 className="sh-reveal mt-6 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
                        Know who is ready <span className="block text-neutral-700">before the companies arrive.</span>
                    </h1>
                    <p className="sh-reveal mt-6 max-w-xl text-lg leading-8 text-neutral-800" style={{ ["--sh-reveal-delay" as string]: "0.06s" }}>
                        We are building the university workspace with our first campuses. Today you set up your institution,
                        invite faculty with roles and permissions, and design projects, voice mock interviews and assessments.
                        Classes, delivery to students, results and readiness come next.
                    </p>
                    <div className="sh-reveal mt-8 flex flex-wrap items-center gap-x-7 gap-y-4" style={{ ["--sh-reveal-delay" as string]: "0.12s" }}>
                        <PrimaryCta href="#early-access">Request early access</PrimaryCta>
                        <GhostCta href="#how-it-works" play>See what works today</GhostCta>
                    </div>
                    <p className={cn(MONO, "mt-5 text-[11px] uppercase tracking-[0.14em] text-neutral-700")}>
                        Early access · Six campus roles · 21 permissions
                    </p>
                </div>
                <div className="sh-reveal min-w-0" style={{ ["--sh-reveal-delay" as string]: "0.1s" }}>
                    <Status />
                </div>
            </div>
        </section>
    )
}
