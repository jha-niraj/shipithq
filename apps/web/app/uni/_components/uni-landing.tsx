// The universities landing page, shipithq.com/uni (plan/web/revamp REV-31), on the same
// system as / and /hire. Early access, told honestly (plan/web/story ST-15; Niraj, 2026-10-07):
// the hero says what works today, a story walks one campus from sign-up to its first assignment
// and then what is being built, and the call is to request early access. The semester plan, the
// four "how it works" cards and the tabbed tour told an unbuilt journey three ways; the story
// replaces them. Copy and sources: content/uni.ts and plan/uni/overview.md.
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { ModuleCardGrid } from "@/components/home/modules"
import { TestimonialWall } from "@/components/site/testimonial-wall"
import { Section } from "@/components/marketing/primitives"
import { CtaBand } from "@/components/marketing/sections"
import { UniHero } from "@/components/uni/hero"
import { CampusStory } from "@/components/uni/campus-story"
import { EarlyAccess } from "@/components/uni/early-access"
import { CampusRoles, CampusSizes, OneAccount } from "@/components/uni/sections"
import { TESTIMONIALS as UNI_TESTIMONIALS } from "@/content/testimonials/universities"
import { DEMO_UNIVERSITIES } from "@/content/testimonials/demo"
import { UNI_FAQS, UNI_MODULES } from "@/content/uni"
import { UniGuidesStrip } from "./guides-strip"
import UniPricingSection from "./pricing-section"

export function UniLanding() {
    return (
        <>
            <SiteHeader />
            <main className="relative bg-neutral-50">
                <UniHero />

                <Section
                    id="how-it-works"
                    eyebrow="What works today, and what comes next"
                    title="One campus, from sign-up to its first assignment"
                    sub="The first four steps run in the university workspace today. The last two are being built with our first campuses."
                >
                    <CampusStory />
                </Section>

                <Section
                    id="features"
                    eyebrow="The workspace"
                    title="Five parts, two of them working today"
                    sub="Faculty and Assignments run today. Students, Placements and Analytics are being built, and say so on their pages."
                >
                    <ModuleCardGrid items={UNI_MODULES} />
                </Section>

                <CampusRoles />
                <OneAccount />

                <Section
                    id="early-access"
                    eyebrow="Early access"
                    title="Bring your campus in early"
                    sub="We set up each early campus with them: the workspace today, and classes, rosters and results as they land. Tell us about yours."
                    width="narrow"
                >
                    <EarlyAccess />
                </Section>

                <CampusSizes />
                <UniGuidesStrip />
                <UniPricingSection />

                <TestimonialWall id="testimonials" testimonials={UNI_TESTIMONIALS} demo={DEMO_UNIVERSITIES} title="Campuses preparing with ShipItHQ" />

                <section id="faq" className="bg-white">
                    <FaqsAccrodian
                        faqs={UNI_FAQS}
                        idPrefix="uni-faq"
                        sub="Who uses it on campus, what faculty can assign, how students join and what it costs."
                    />
                </section>

                <CtaBand
                    title={<>Build readiness <br className="hidden sm:block" />with us.</>}
                    sub="Early access: set up your campus and its faculty today, and grow into classes, rosters and results as they land."
                    primary={{ text: "Request early access", href: "#early-access" }}
                    secondary={{ text: "See the plans", href: "/uni/pricing" }}
                    words={["Projects", "Voice mocks", "Assessments", "Six roles", "21 permissions", "Early access"]}
                />
            </main>
            <SiteFooter audience="universities" />
        </>
    )
}
