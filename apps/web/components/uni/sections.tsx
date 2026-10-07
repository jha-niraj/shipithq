import Link from "next/link"
import { ArrowRight, Briefcase, Building2, Landmark, ShieldCheck, UserCog, Users, Wallet } from "lucide-react"
import { UNI_PLANS, UNI_PLAN_ORDER } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { MONO, Section } from "@/components/marketing/primitives"
import { SoonNote } from "@/components/marketing/soon"

/**
 * The /uni landing's own sections (plan/web/revamp REV-31), each a different look:
 * a semester on one line (butter), the six campus roles (ink), one account from first
 * year to first job (white), and plans by campus size (rows from UNI_PLANS).
 * Roles and permissions: apps/uni/app/(main)/faculty/roles. Assignment types:
 * apps/uni/app/(main)/assignments.
 */

// ── The six campus roles ───────────────────────────────────────────────────

const ROLES = [
    { name: "University Admin", does: "Sets up the campus, invites everyone and sets each person's permissions.", Icon: Landmark },
    { name: "Department Head", does: "Runs a department: its faculty and the work they set.", Icon: Building2 },
    { name: "Placement Officer", does: "Will run each campus drive once Placements is built.", Icon: Briefcase },
    { name: "Finance Officer", does: "Will watch the plan and the credit pool once billing is built.", Icon: Wallet },
    { name: "Faculty", does: "Designs projects, voice mocks and assessments for their classes.", Icon: UserCog },
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
                        <ShieldCheck className="size-4" aria-hidden /> 21 permissions, on or off per person
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

// plan/web/story ST-15: coursework reaching the student's account is not built (plan/uni UNI-3).
const JOURNEY: { stage: string; what: string; soon?: { what: string; today: string } }[] = [
    { stage: "First year", what: "Practice problems and the guided path" },
    { stage: "Coursework", what: "The projects, mocks and assessments you assign", soon: { what: "assignments reaching the student's account", today: "students practise and build on ShipItHQ on their own" } },
    { stage: "Placement season", what: "A resume and a public profile built from their work" },
    { stage: "First job", what: "Jobs and company interview rounds on ShipItHQ, where companies see the work" },
]

export function OneAccount() {
    return (
        <Section eyebrow="Where students do the work" title="One account, from first year to first job" sub="Students use their own ShipItHQ account. The work you assign will sit beside everything else they do, and follow them when they graduate.">
            <ol className="grid gap-3 md:grid-cols-4">
                {JOURNEY.map((j, i) => (
                    <li key={j.stage} className="sh-reveal relative rounded-2xl border border-neutral-200 bg-white p-6" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                        <span className={cn(MONO, "text-3xl font-medium tracking-tight text-neutral-900")}>{String(i + 1).padStart(2, "0")}</span>
                        <p className="mt-6 text-[16px] font-semibold text-neutral-900">{j.stage}</p>
                        <p className="mt-1.5 text-[14px] leading-6 text-neutral-600">{j.what}</p>
                        {j.soon && <SoonNote {...j.soon} className="mt-3" />}
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
