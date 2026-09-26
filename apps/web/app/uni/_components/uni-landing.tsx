// The universities landing page, shipithq.com/uni (plan/web/revamp REV-31), on the same
// system as / and /hire, with its own hero and sections: modules, a semester plan, how
// it works, the tour, the six campus roles, one account from first year to first job,
// plans by campus size, guides, pricing, testimonials, FAQ and a closing band.
// Copy and sources: content/uni.ts.
import SiteHeader from "@/components/site/header"
import SiteFooter from "@/components/site/footer"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { ModuleCardGrid } from "@/components/home/modules"
import { TestimonialWall } from "@/components/site/testimonial-wall"
import { Section } from "@/components/marketing/primitives"
import { CtaBand, HowItWorks } from "@/components/marketing/sections"
import { ProductTour } from "@/components/marketing/product-tour"
import { UniHero } from "@/components/uni/hero"
import { CampusRoles, CampusSizes, OneAccount, SemesterPlan } from "@/components/uni/sections"
import { TESTIMONIALS as UNI_TESTIMONIALS } from "@/content/testimonials/universities"
import { DEMO_UNIVERSITIES } from "@/content/testimonials/demo"
import { UNI_FAQS, UNI_MODULES, UNI_STEP_CARDS, UNI_TOUR } from "@/content/uni"
import { BRAND, UNI_LINKS } from "@/lib/site"
import { UniGuidesStrip } from "./guides-strip"
import UniPricingSection from "./pricing-section"

export function UniLanding() {
    return (
        <>
            <SiteHeader />
            <main className="relative bg-neutral-50">
                <UniHero />

                <Section
                    id="features"
                    eyebrow="What you get"
                    title="Everything between the first class and the placement drive"
                    sub="Five parts of one workspace for the placement cell and faculty. Each has its own page."
                >
                    <ModuleCardGrid items={UNI_MODULES} />
                </Section>

                <SemesterPlan />
                <HowItWorks title="From setting up the campus to placing who is ready" steps={UNI_STEP_CARDS} />
                <ProductTour eyebrow="Take the tour" title="See the workspace" tabs={UNI_TOUR} />
                <CampusRoles />
                <OneAccount />
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
                    title={<>Know who is ready <br className="hidden sm:block" />this season.</>}
                    sub="Set up your campus free for up to 50 students, and assign the first project this week."
                    primary={{ text: "Set up your campus", href: UNI_LINKS.signup }}
                    secondary={{ text: "Talk to us", href: `mailto:${BRAND.email}` }}
                    words={["Projects", "Voice mocks", "Assessments", "Six roles", "Readiness", "Placements", "Credits"]}
                />
            </main>
            <SiteFooter audience="universities" />
        </>
    )
}
