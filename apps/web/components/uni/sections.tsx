import Link from "next/link"
import { ArrowRight, BookOpenCheck, Briefcase, Building2, Code2, GraduationCap, Landmark, Mic, ShieldCheck, UserCog, Users, Wallet } from "lucide-react"
import { UNI_PLANS, UNI_PLAN_ORDER } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { MONO, Section } from "@/components/marketing/primitives"

/**
 * The /uni landing's own sections (plan/web/revamp REV-31), each a different look:
 * a semester on one line (butter), the six campus roles (ink), one account from first
 * year to first job (white), and plans by campus size (rows from UNI_PLANS).
 * Roles and permissions: apps/uni/app/(main)/faculty/roles. Assignment types:
 * apps/uni/app/(main)/assignments.
 */

// ── A semester, on one line ────────────────────────────────────────────────

const WEEKS = [
    { w: 2, title: "Assign a project", body: "AI writes a brief for the stack and level you pick.", Icon: Code2 },
    { w: 6, title: "A mock interview round", body: "Voice mocks by category, at any hour, no booking.", Icon: Mic },
    { w: 9, title: "An assessment", body: "A quiz or a code test, with a time limit and a deadline.", Icon: BookOpenCheck },
    { w: 12, title: "Readiness review", body: "Each department's progress, before the season starts.", Icon: GraduationCap },
    { w: 14, title: "The placement drive", body: "Companies meet students who did the work.", Icon: Briefcase },
]

const SEMESTER_MOTION = `
@keyframes sp-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes sp-pop { 0%, 60% { transform: scale(.6); opacity: .4; } 100% { transform: scale(1); opacity: 1; } }
.sp-line { transform-origin: left center; animation: sp-line 3.2s cubic-bezier(.2,.7,.2,1) both; }
.sp-pop { animation: sp-pop 3.2s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .sp-line, .sp-pop { animation: none; } }
`

export function SemesterPlan() {
    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <style>{SEMESTER_MOTION}</style>
            <div className="sh-reveal mx-auto max-w-7xl rounded-3xl bg-[#F5E6A8] p-8 text-neutral-900 md:p-12">
                <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-700")}>A semester with ShipItHQ</p>
                <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Sixteen weeks, and a batch that can prove what it knows</h2>
                <div className="relative mt-12">
                    {/* The line, weeks 1 to 16 */}
                    <div className="absolute left-0 right-0 top-[1.375rem] hidden h-0.5 bg-neutral-900/15 lg:block" />
                    <div className="sp-line absolute left-0 right-0 top-[1.375rem] hidden h-0.5 bg-neutral-900 lg:block" />
                    <ol className="grid gap-6 lg:grid-cols-5 lg:gap-4">
                        {WEEKS.map(({ w, title, body, Icon }, i) => (
                            <li key={w} className="relative flex gap-4 lg:block">
                                <span className="sp-pop relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white" style={{ animationDelay: `${0.4 + i * 0.55}s` }}>
                                    <Icon className="size-5" aria-hidden />
                                </span>
                                <div className="lg:mt-5">
                                    <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-700")}>Week {w}</p>
                                    <p className="mt-1 text-[17px] font-semibold leading-snug">{title}</p>
                                    <p className="mt-1.5 text-[14px] leading-6 text-neutral-800">{body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    )
}

// ── The six campus roles ───────────────────────────────────────────────────

const ROLES = [
    { name: "University Admin", does: "Sets up the campus, invites everyone, owns billing and permissions.", Icon: Landmark },
    { name: "Department Head", does: "Runs a department: its classes, faculty and readiness.", Icon: Building2 },
    { name: "Placement Officer", does: "Brings companies in and runs each drive.", Icon: Briefcase },
    { name: "Finance Officer", does: "Watches the plan and the credit pool.", Icon: Wallet },
    { name: "Faculty", does: "Assigns projects, mocks and assessments to classes, and grades them.", Icon: UserCog },
    { name: "Teaching Assistant", does: "Helps a class with the work, with the access you allow.", Icon: Users },
]

export function CampusRoles() {
    return (
        <section className="px-4 py-20 sm:px-6 md:py-28">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-neutral-950 p-8 text-white md:p-12">
                <div className="sh-reveal flex flex-wrap items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-400")}>For the whole campus</p>
                        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Six roles, each with exactly the access it needs</h2>
                    </div>
                    <p className="flex items-center gap-2 text-[14px] text-neutral-300">
                        <ShieldCheck className="size-4" aria-hidden /> Fourteen permissions, on or off per person
                    </p>
                </div>
                <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
                    {ROLES.map(({ name, does, Icon }, i) => (
                        <li key={name} className="sh-reveal bg-neutral-950 p-6 transition-colors duration-300 hover:bg-neutral-900" style={{ ["--sh-reveal-delay" as string]: `${i * 0.05}s` }}>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon className="size-5" aria-hidden /></span>
                            <p className="mt-5 text-[17px] font-semibold">{name}</p>
                            <p className="mt-1.5 text-[14px] leading-6 text-neutral-400">{does}</p>
                        </li>
                    ))}
                </ul>
                <Link href="/uni/faculty" className="mt-8 inline-flex items-center gap-2 border-b border-white/30 pb-0.5 text-sm font-medium hover:border-white">
                    How roles and permissions work <ArrowRight className="size-4" aria-hidden />
                </Link>
            </div>
        </section>
    )
}

// ── One account, first year to first job ─────────────────────────────────

const JOURNEY = [
    { stage: "First year", what: "Practice problems and the guided path" },
    { stage: "Coursework", what: "The projects, mocks and assessments you assign" },
    { stage: "Placement season", what: "A resume and a public profile built from that work" },
    { stage: "First job", what: "Applied through ShipItHQ, where companies see the work" },
]

export function OneAccount() {
    return (
        <Section eyebrow="Where students do the work" title="One account, from first year to first job" sub="Students use their own ShipItHQ account. The work you assign sits beside everything else they do, and follows them when they graduate.">
            <ol className="grid gap-3 md:grid-cols-4">
                {JOURNEY.map((j, i) => (
                    <li key={j.stage} className="sh-reveal relative rounded-2xl border border-neutral-200 bg-white p-6" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                        <span className={cn(MONO, "text-3xl font-medium tracking-tight text-neutral-900")}>{String(i + 1).padStart(2, "0")}</span>
                        <p className="mt-6 text-[16px] font-semibold text-neutral-900">{j.stage}</p>
                        <p className="mt-1.5 text-[14px] leading-6 text-neutral-600">{j.what}</p>
                        {i < JOURNEY.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-neutral-50 text-neutral-400 md:block" aria-hidden />}
                    </li>
                ))}
            </ol>
        </Section>
    )
}

// ── Plans by campus size ──────────────────────────────────────────────────

const show = (n: number) => (n >= 999999 ? "Unlimited" : n.toLocaleString("en-IN"))

export function CampusSizes() {
    return (
        <Section eyebrow="Every campus size" title="From one department to a whole university" sub="What each plan holds. Every plan includes projects, mock interviews and assessments.">
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                {UNI_PLAN_ORDER.map((k, i) => {
                    const p = UNI_PLANS[k]
                    return (
                        <li key={k} className="sh-reveal grid gap-4 p-6 transition-colors hover:bg-neutral-50 md:grid-cols-[12rem_repeat(4,minmax(0,1fr))] md:items-center" style={{ ["--sh-reveal-delay" as string]: `${i * 0.05}s` }}>
                            <div>
                                <p className="font-display text-xl font-semibold text-neutral-900">{p.name}</p>
                                <p className="mt-0.5 text-[13px] text-neutral-600">{p.description}</p>
                            </div>
                            {[
                                { l: "Students", v: show(p.maxStudents) },
                                { l: "Faculty", v: show(p.maxFaculty) },
                                { l: "Departments", v: show(p.maxDepartments) },
                                { l: "Credits a month", v: p.maxCreditsPerMonth >= 999999 ? "Unlimited" : p.maxCreditsPerMonth.toLocaleString("en-IN") },
                            ].map((c) => (
                                <div key={c.l}>
                                    <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.12em] text-neutral-600")}>{c.l}</p>
                                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-neutral-900">{c.v}</p>
                                </div>
                            ))}
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}
