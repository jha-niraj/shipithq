import { cn } from "@repo/ui/lib/utils"
import { PageHero, type PageHeroCta } from "@/components/page-hero"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { MONO, Section, TONE, isDark, type Tone } from "@/components/marketing/primitives"
import { CardArt, type ArtKind } from "@/components/marketing/card-art"
import { ModuleCardGrid, type ModuleCardData } from "@/components/home/modules"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { FEATURE_EXTRAS } from "@/content/feature-extras"
import { CtaBand } from "./sections"

/**
 * One product feature in depth (plan/web/revamp REV-81, REV-82). Shared by the
 * student pages at /features/<id> and the company pages at /hire/<id>, so the two
 * read as one site.
 *
 * Top to bottom: the shared hero with the feature's own animated scene; "how it
 * works" as a numbered timeline beside a large copy of that scene; what is different;
 * what it costs (only prices the product actually charges); what it does not do; a
 * short FAQ; and the other features as the same cards the landing page uses.
 */

export interface FeatureDetailProps {
    crumbs: { name: string; href?: string }[]
    kind: string
    name: string
    headline: string
    intro: string
    tone: Tone
    art: ArtKind
    meta: string[]
    ctas: PageHeroCta[]
    steps: string[]
    different: string[]
    limits: string[]
    costs?: { label: string; credits: number }[]
    faqs: { question: string; answer: string }[]
    others: ModuleCardData[]
    othersTitle: string
    /** The closing band's primary action. */
    finalCta: { text: string; href: string }
    /** Hire pages: this feature's limits per plan, from HIRING_PLANS (REV-98). */
    planLimits?: { label: string; values: string[] }[]
    /** The plan columns of `planLimits`, and where "Compare every plan" goes. Hiring's by default. */
    planNames?: string[]
    pricingHref?: string
}

const ROW_TONES = ["blush", "mint", "butter"] as const

export function FeatureDetail(p: FeatureDetailProps) {
    const t = TONE[p.tone]
    const dark = isDark(p.tone)
    const x = FEATURE_EXTRAS[p.art]
    const faqs = [...p.faqs, ...(x?.moreFaqs ?? [])]
    // The scenes this page draws on, so every card below has one that belongs here.
    const scenes = [...new Set<ArtKind>([p.art, ...(x?.spotlights.map((sp) => sp.art) ?? []), ...(x?.connects.map((c) => c.art) ?? [])])]
    const sceneAt = (i: number) => scenes[i % scenes.length]!

    return (
        <main className="bg-neutral-50">
            <PageHero
                crumbs={p.crumbs}
                eyebrow={p.kind}
                title={p.headline}
                sub={p.intro}
                tone={p.tone}
                art={p.art}
                ctas={p.ctas}
                // Counts only ("76 DSA problems"): a meta line without a number is not a fact.
                facts={p.meta.filter((m) => /^\d/.test(m)).map((m) => {
                    const [value, ...rest] = m.split(" ")
                    return { value: value ?? m, label: rest.join(" ") }
                })}
            />

            {/* ── A closer look: three capabilities, alternating sides (REV-92) ── */}
            {x && (
                <Section eyebrow="A closer look" title={`What ${p.name.toLowerCase()} actually does`}>
                    <div className="space-y-6">
                        {x.spotlights.map((sp, i) => {
                            const rt = TONE[ROW_TONES[i % ROW_TONES.length]!]
                            return (
                                <div key={sp.title} className="sh-reveal grid items-center gap-8 rounded-3xl border border-neutral-200 bg-white p-6 md:grid-cols-2 md:p-10">
                                    <div className={cn("flex h-64 items-center justify-center rounded-2xl p-6", rt.surface, i % 2 === 1 && "md:order-2")}>
                                        <CardArt kind={sp.art} className="max-h-56" />
                                    </div>
                                    <div className={cn(i % 2 === 1 && "md:order-1")}>
                                        <span className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-600")}>{String(i + 1).padStart(2, "0")} / {String(x.spotlights.length).padStart(2, "0")}</span>
                                        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">{sp.title}</h3>
                                        <p className="mt-4 text-[16px] leading-7 text-neutral-700">{sp.body}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Section>
            )}

            {/* ── How it works: illustrated step cards (REV-98) ── */}
            <Section eyebrow="How it works" title={`${p.name}, step by step`}>
                <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {p.steps.map((step, i) => {
                        const st = TONE[(["ink", "blush", "sage", "butter"] as const)[i % 4]!]
                        const stDark = i % 4 === 0
                        return (
                            <li
                                key={step}
                                className={cn("sh-reveal flex flex-col rounded-2xl p-6", st.surface, st.ink)}
                                style={{ ["--sh-reveal-delay" as string]: `${i * 0.08}s` }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn(MONO, "text-3xl font-medium tracking-tight")}>{String(i + 1).padStart(2, "0")}</span>
                                    <span className={cn(MONO, "text-[10px] uppercase tracking-[0.16em]", st.muted)}>Step {i + 1} of {p.steps.length}</span>
                                </div>
                                <div className="my-6 flex h-32 items-center justify-center">
                                    <CardArt kind={sceneAt(i)} dark={stDark} className="max-h-32" />
                                </div>
                                <p className={cn("mt-auto text-[15px] leading-6", stDark ? "text-neutral-200" : "text-neutral-800")}>{step}</p>
                            </li>
                        )
                    })}
                </ol>
            </Section>

            {/* ── What is different ── */}
            <Section eyebrow="Why it is different" title="What you will not find elsewhere" className="pt-0 md:pt-0">
                <ul className="grid gap-4 md:grid-cols-3">
                    {p.different.map((d, i) => {
                        const tone = (["blush", "mint", "butter"] as const)[i % 3]!
                        return (
                            <li key={d} className={cn("sh-reveal flex flex-col rounded-2xl p-6 text-neutral-900", TONE[tone].surface)} style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                                <span className="mb-5 flex h-32 items-center justify-center rounded-xl bg-white/45">
                                    <CardArt kind={sceneAt(i + 1)} className="max-h-28" />
                                </span>
                                <span aria-hidden className={cn(MONO, "text-2xl font-medium")}>{String(i + 1).padStart(2, "0")}</span>
                                <p className="mt-6 text-[15px] leading-6">{d}</p>
                            </li>
                        )
                    })}
                </ul>
            </Section>

            {/* ── Who it is for ── */}
            {x && (
                <Section eyebrow="Who it is for" title="Made for where you are" className="pt-0 md:pt-0">
                    <ul className="grid gap-4 md:grid-cols-3">
                        {x.forWho.map((w, i) => (
                            <li key={w.title} className={cn("sh-reveal flex flex-col rounded-2xl p-6", i === 1 ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-900")} style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                                <span className={cn("mb-5 flex h-32 items-center justify-center rounded-xl", i === 1 ? "bg-white/5" : "bg-neutral-50")}>
                                    <CardArt kind={sceneAt(i + 2)} dark={i === 1} className="max-h-28" />
                                </span>
                                <h3 className="text-lg font-semibold tracking-tight">{w.title}</h3>
                                <p className={cn("mt-2 text-[15px] leading-6", i === 1 ? "text-neutral-300" : "text-neutral-700")}>{w.body}</p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* ── Costs and limits, side by side ── */}
            <Section eyebrow="Before you start" title="What it costs, and what it does not do" className="pt-0 md:pt-0">
                <div className={cn("grid gap-4", p.costs?.length || p.planLimits?.length ? "lg:grid-cols-2" : "")}>
                    {p.planLimits && p.planLimits.length > 0 && (
                        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                            <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>By plan</p>
                            <table className="mt-4 w-full text-left text-[15px]">
                                <thead>
                                    <tr className="text-[13px] text-neutral-600">
                                        <th className="pb-3 font-normal" />
                                        {(p.planNames ?? ["Free", "Pro", "Enterprise"]).map((n) => <th key={n} className="pb-3 font-medium">{n}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {p.planLimits.map((r) => (
                                        <tr key={r.label}>
                                            <td className="py-3 pr-3 text-neutral-700">{r.label}</td>
                                            {r.values.map((v, i) => <td key={i} className={cn(MONO, "py-3 font-medium text-neutral-900")}>{v}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Link href={p.pricingHref ?? "/hire/pricing"} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
                                Compare every plan <ArrowRight className="size-3.5" aria-hidden />
                            </Link>
                        </div>
                    )}
                    {p.costs && p.costs.length > 0 && (
                        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                            <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>Credits</p>
                            <dl className="mt-4 divide-y divide-neutral-100">
                                {p.costs.map((c) => (
                                    <div key={c.label} className="flex items-baseline justify-between gap-4 py-3 text-[15px]">
                                        <dt className="text-neutral-700">{c.label}</dt>
                                        <dd className={cn(MONO, "shrink-0 font-medium text-neutral-900")}>{c.credits === 0 ? "Free" : `${c.credits} credits`}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                        <p className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>Honest limits</p>
                        <ul className="mt-4 divide-y divide-neutral-100">
                            {p.limits.map((l) => (
                                <li key={l} className="flex gap-3 py-3 text-[15px] leading-6 text-neutral-700">
                                    <span aria-hidden className={cn(MONO, "text-neutral-500")}>-</span>
                                    {l}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Section>

            {/* ── Works with the rest ── */}
            {x && (
                <Section eyebrow="Works with" title="Where it hands off" className="pt-0 md:pt-0">
                    <ul className="grid gap-4 md:grid-cols-3">
                        {x.connects.map((c, i) => {
                            const ct = TONE[(["sage", "coral", "sand"] as const)[i % 3]!]
                            return (
                                <li key={c.title} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                                    <Link href={c.href} className={cn("group flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1", ct.surface, ct.ink)}>
                                        <span className="flex h-28 items-center justify-center rounded-xl bg-white/45">
                                            <CardArt kind={c.art} className="max-h-24" />
                                        </span>
                                        <span className="mt-5 text-lg font-semibold tracking-tight">{c.title}</span>
                                        <span className={cn("mt-1.5 flex-1 text-[14px] leading-6", ct.muted)}>{c.body}</span>
                                        <ArrowRight className="mt-5 size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </Section>
            )}

            {/* ── FAQ: the landing's own FAQ band, fed this page's questions (REV-99) ── */}
            <section className="bg-white">
                <FaqsAccrodian faqs={faqs} idPrefix={`faq-${p.art}`} sub={`What people ask about ${p.name.toLowerCase()} before they start.`} />
            </section>

            {/* ── The other features, as the landing's cards ── */}
            <Section eyebrow="Keep exploring" title={p.othersTitle} className="pt-0 md:pt-0">
                <ModuleCardGrid items={p.others} cols={4} />
            </Section>

            <CtaBand
                title={p.headline}
                sub={p.intro}
                primary={p.finalCta}
                words={[p.name, ...p.others.map((o) => o.name)]}
            />
        </main>
    )
}
