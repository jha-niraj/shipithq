import Link from "next/link"
import { ArrowRight, Check, ClipboardPaste, Combine, FileText, ListChecks, Mail, Scale, Shuffle, X } from "lucide-react"
import { HIRING_PLANS, UNLIMITED, type HiringPlanKey } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { Eyebrow, MONO, PrimaryCta, Section, TONE } from "@/components/marketing/primitives"
import { HIRE_WEDGE } from "@/content/hire"
import { HIRING_LINKS } from "@/lib/site"

/**
 * The sections only /hire has (plan/web/revamp REV-103 to REV-106), each laid out
 * differently from the student page's. Claims restate content/hire.ts (the hiring
 * research); limits come from HIRING_PLANS.
 */

// ── Old loop vs this loop (animated, REV-111) ─────────────────────────────────

const STAGES = ["Screen", "Assess", "Interview", "Decide"]
const OLD = [
    "A pile of resumes, filtered by keyword",
    "Phone screens to find out who can code",
    "A take-home for everyone who survived",
    "A decision shaped by who the interviewer liked",
]
const NEW = [
    "One pipeline, the same rounds for every candidate",
    "Hard gates on aptitude and coding, with written pass marks",
    "The ones who cleared them send you their results",
    "Their code, answers and transcripts, round by round",
]

/*
 * One 14s loop, both rows starting together. The usual row lights a stage every 3s and
 * waits in between; the ShipItHQ row lights a stage every 0.9s and then shows its
 * results while the usual row is still in stage two. It illustrates the order of
 * work, not a measured time: no numbers are shown.
 */
const LOOP_STYLES = `
@keyframes ovn-cell { 0% { opacity: 0.35; transform: translateY(6px); } 6%, 100% { opacity: 1; transform: none; } }
@keyframes ovn-old-dot { 0% { left: 0%; } 21% { left: 25%; } 43% { left: 50%; } 64% { left: 75%; } 86%, 100% { left: 100%; } }
@keyframes ovn-new-dot { 0% { left: 0%; } 7% { left: 25%; } 13% { left: 50%; } 20% { left: 75%; } 26%, 100% { left: 100%; } }
@keyframes ovn-done { 0%, 27% { opacity: 0; transform: scale(0.8); } 30%, 100% { opacity: 1; transform: scale(1); } }
@keyframes ovn-wait { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.ovn-run .ovn-cell { opacity: 0.35; animation: ovn-cell 14s ease-out infinite both; }
.ovn-run .ovn-old-dot { animation: ovn-old-dot 14s ease-in-out infinite; }
.ovn-run .ovn-new-dot { animation: ovn-new-dot 14s cubic-bezier(.4,0,.2,1) infinite; }
.ovn-run .ovn-done { animation: ovn-done 14s ease-out infinite both; }
.ovn-wait { animation: ovn-wait 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ovn-run .ovn-cell, .ovn-run .ovn-old-dot, .ovn-run .ovn-new-dot, .ovn-run .ovn-done, .ovn-wait { animation: none; opacity: 1; }
}
`

function LoopRow({ label, items, dark, speed }: { label: string; items: string[]; dark: boolean; speed: "old" | "new" }) {
    // Per-cell delay inside the 14s loop, matching the dot keyframes above.
    const delays = speed === "old" ? [0, 3, 6, 9] : [0, 0.9, 1.8, 2.7]
    return (
        <div className={cn("rounded-3xl p-6 md:p-8", dark ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-900")}>
            <div className="flex items-center justify-between gap-4">
                <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em]", dark ? "text-[#A8D5BA]" : "text-neutral-600")}>{label}</p>
                {dark ? (
                    <span className={cn(MONO, "ovn-done rounded-md bg-[#A8D5BA] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-950")} style={{ animationDelay: "0s" }}>Results in</span>
                ) : (
                    <span className={cn(MONO, "ovn-wait text-[10px] uppercase tracking-[0.12em] text-neutral-500")}>Still going</span>
                )}
            </div>
            {/* the track the candidate travels */}
            <div className="relative mt-6 hidden h-1 rounded-full md:block" style={{ background: dark ? "#262626" : "#e5e5e5" }}>
                <span
                    className={cn("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full", speed === "old" ? "ovn-old-dot bg-neutral-900" : "ovn-new-dot bg-[#A8D5BA]")}
                    aria-hidden
                />
            </div>
            <ol className="mt-6 grid gap-3 md:grid-cols-4">
                {items.map((t, i) => (
                    <li
                        key={t}
                        className={cn("ovn-cell rounded-2xl p-4", dark ? "bg-white/5" : "bg-neutral-50")}
                        style={{ animationDelay: `${delays[i]}s` }}
                    >
                        <span className="flex items-center justify-between">
                            <span className={cn(MONO, "text-[10px] uppercase tracking-[0.14em]", dark ? "text-neutral-400" : "text-neutral-500")}>{STAGES[i]}</span>
                            {dark ? <Check className="size-4 text-[#A8D5BA]" aria-hidden /> : <X className="size-4 text-rose-500" aria-hidden />}
                        </span>
                        <span className={cn("mt-2 block text-[14px] leading-5", dark ? "text-neutral-200" : "text-neutral-700")}>{t}</span>
                    </li>
                ))}
            </ol>
        </div>
    )
}

export function OldVsNew() {
    return (
        <Section
            eyebrow="Why it works"
            title="The usual loop, and this one"
            sub="Both loops below start at the same moment and go through the same four stages. Watch which one reaches results first."
        >
            <style>{LOOP_STYLES}</style>
            <div className="ovn-run sh-reveal space-y-4">
                <LoopRow label="The usual loop" items={OLD} dark={false} speed="old" />
                <LoopRow label="With ShipItHQ" items={NEW} dark speed="new" />
            </div>
            <p className={cn(MONO, "mt-4 text-center text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>
                An illustration of the order of work, not a measured time
            </p>
        </Section>
    )
}

// ── Students already practise your interview (CMP-5) ─────────────────────────

const WEDGE_ICONS = [ClipboardPaste, Combine, FileText]

/** The wedge from the company's side: imported jobs, adopt or replace, and reported totals. */
export function AlreadyPractising() {
    const w = HIRE_WEDGE
    const tone = TONE.sand
    return (
        <section className="px-4 pb-20 sm:px-6 md:pb-28">
            <div className={cn("sh-reveal mx-auto max-w-7xl rounded-3xl p-8 md:p-14", tone.surface, tone.ink)}>
                <div className="max-w-2xl">
                    <Eyebrow className={tone.muted}>{w.eyebrow}</Eyebrow>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{w.title}</h2>
                    <p className={cn("mt-4 text-[16px] leading-7", tone.muted)}>{w.sub}</p>
                </div>
                <ul className="mt-10 grid gap-6 md:grid-cols-3">
                    {w.points.map((p, i) => {
                        const Icon = WEDGE_ICONS[i] ?? FileText
                        return (
                            <li key={p.t} className="rounded-2xl bg-white/70 p-5 ring-1 ring-neutral-900/10">
                                <Icon className="size-5 text-neutral-900" aria-hidden />
                                <p className="mt-3 text-[16px] font-semibold text-neutral-900">{p.t}</p>
                                <p className="mt-1 text-[15px] leading-6 text-neutral-800">{p.b}</p>
                            </li>
                        )
                    })}
                </ul>
                <div className="mt-10">
                    <PrimaryCta href={HIRING_LINKS.signup}>{w.cta}</PrimaryCta>
                </div>
            </div>
        </section>
    )
}

// ── Fair by design ────────────────────────────────────────────────────────────

const FAIR = [
    { Icon: Mail, t: "Company email only", b: "Free and temporary addresses cannot create or join a company, so every account belongs to it." },
    { Icon: ListChecks, t: "The same rounds for everyone", b: "Every candidate for a job takes the same pipeline, so scores compare like with like." },
    { Icon: Shuffle, t: "Fresh draws per attempt", b: "Aptitude questions are drawn from a pool of 320 each time, so answers do not travel." },
    { Icon: Scale, t: "Pass marks written first", b: "Each round's pass mark and gate is set before anyone applies, not after the interview." },
]

const FAIR_STYLES = `
@keyframes fair-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.fair-icon { animation: fair-bob 3.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .fair-icon { animation: none; } }
`

export function FairByDesign() {
    return (
        <section className="px-4 py-10 sm:px-6">
            <style>{FAIR_STYLES}</style>
            <div className="mx-auto max-w-7xl rounded-3xl bg-[#BFE3D0] p-8 md:p-12">
                <div className="sh-reveal max-w-2xl">
                    <Eyebrow className="text-neutral-700">Fair by design</Eyebrow>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Every candidate gets the same shot</h2>
                </div>
                <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FAIR.map(({ Icon, t, b }, i) => (
                        <li key={t} className="sh-reveal rounded-2xl bg-white/60 p-6" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                            <span className="fair-icon flex size-12 items-center justify-center rounded-xl bg-neutral-900 text-white" style={{ animationDelay: `${i * 0.4}s` }}>
                                <Icon className="size-5" aria-hidden />
                            </span>
                            <h3 className="mt-5 text-[16px] font-semibold text-neutral-900">{t}</h3>
                            <p className="mt-1.5 text-[14px] leading-6 text-neutral-800">{b}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

// ── For every team size ───────────────────────────────────────────────────────

const SIZES: { key: HiringPlanKey; who: string; line: string }[] = [
    { key: "FREE", who: "Your first engineering hire", line: "One role, one pipeline, and a colleague to review with." },
    { key: "PRO", who: "A team hiring every month", line: "Several roles open at once, a pipeline per role, and a hiring panel with their own roles." },
    { key: "ENTERPRISE", who: "Hiring at volume", line: "No ceilings, a credit allowance sized to you, and help setting up." },
]

const n = (v: number) => (v >= UNLIMITED ? "Unlimited" : v.toLocaleString("en-IN"))

export function TeamSizes() {
    return (
        <Section
            eyebrow="For every team size"
            title="Start where you are"
            action={<Link href="/hire/pricing" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">Compare plans <ArrowRight className="size-3.5" /></Link>}
        >
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
                {SIZES.map((s, i) => {
                    const p = HIRING_PLANS[s.key]
                    return (
                        <li key={s.key} className="sh-reveal grid gap-6 p-6 md:grid-cols-[14rem_1fr_auto] md:items-center md:p-8" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                            <div>
                                <span className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-600")}>{p.name}</span>
                                <p className="mt-1 font-display text-xl font-semibold tracking-tight text-neutral-900">{s.who}</p>
                            </div>
                            <div>
                                <p className="text-[15px] leading-6 text-neutral-700">{s.line}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {[
                                        `${n(p.maxJobPosts)} active ${p.maxJobPosts === 1 ? "job" : "jobs"}`,
                                        `${n(p.maxPipelines)} ${p.maxPipelines === 1 ? "pipeline" : "pipelines"}`,
                                        `${n(p.maxTeamMembers)} team members`,
                                        `${n(p.maxCustomRoles)} custom ${p.maxCustomRoles === 1 ? "role" : "roles"}`,
                                    ].map((chip) => (
                                        <span key={chip} className={cn(MONO, "rounded-md bg-neutral-100 px-2 py-1 text-[11px] text-neutral-700")}>{chip}</span>
                                    ))}
                                </div>
                            </div>
                            <Link href="/hire/pricing" className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors", s.key === "PRO" ? "bg-neutral-900 text-white hover:bg-neutral-800" : "border border-neutral-200 text-neutral-900 hover:bg-neutral-50")}>
                                See {p.name} <ArrowRight className="size-4" aria-hidden />
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}
