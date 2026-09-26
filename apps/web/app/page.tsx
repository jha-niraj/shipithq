import type { Metadata } from 'next'

import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";
import { HomeHero } from "@/components/home/hero";
import { HomeModules } from "@/components/home/modules";
import { EverythingElse } from "@/components/home/everything-else";
import { IncidentsBand } from "@/components/home/incidents-band";
import { PricingStrip } from "@/components/home/pricing-strip";
import { CompareStrip, CtaBand, HowItWorks, NumbersBand } from "@/components/marketing/sections";
import { ProductTour } from "@/components/marketing/product-tour";
import { HOME_STEPS, HOME_TOUR } from "@/content/home";
import { FromTheGuides, PracticeTracks, WalkAway } from "@/components/home/sections";
import { StageTabs } from "@/components/home/stage-tabs";
import { APP_LINKS } from "@/lib/site";
import { TestimonialWall } from "@/components/site/testimonial-wall";
import { TESTIMONIALS } from "@/content/testimonials/students";
import { DEMO_STUDENTS } from "@/content/testimonials/demo";
import FaqsAccrodian from "@/components/landingpage/faqs";
import { LANDING_FAQS } from "@/components/landingpage/faq-data";
import { SITE, BRAND } from "@/lib/site";
import { faqSchema, webPageSchema, jsonLd } from "@/lib/schema";

export const metadata: Metadata = {
    // 40 chars. Google cuts near 60, and this one takes no template suffix - it IS the
    // root layout's default title - so it is measured exactly as written.
    title: 'ShipItHQ - Practice, Build and Get Hired',
    description:
        'Practice DSA and system design with code that runs in a real Linux container, build projects you can be interviewed about, and fix the resume an ATS reads.',
    alternates: { canonical: SITE },
    // This block REPLACES the root layout's openGraph rather than merging into it, which
    // is why the landing page was shipping with no og:image at all - the busiest page on
    // the site shared as a bare text preview. Anything the layout declares has to be
    // restated here.
    openGraph: {
        type: 'website',
        url: SITE,
        siteName: BRAND.name,
        title: 'ShipItHQ - Practice, Build and Get Hired',
        description:
            'Real container execution, projects with interviews written from your own build, voice mocks and ATS resume tooling. 100 free credits, no subscription.',
        images: [{ url: '/og/home.webp', width: 1200, height: 630, alt: `${BRAND.name} - ${BRAND.tagline}` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ShipItHQ - Practice, Build and Get Hired',
        description:
            'Real container execution, projects with interviews written from your own build, voice mocks and ATS resume tooling.',
        images: ['/og/home.webp'],
    },
}

/**
 * The student landing page (plan/web/revamp REV-16), rebuilt on the fanout.sh reference
 * (2026-09-25). It reads top to bottom as:
 *
 *   Hero            the promise, with the product's own fragments around it
 *   Modules         the five parts of the product, each a card into its detail page
 *   Everything else the rest of the product and the site, as numbered tiles
 *   Pricing         the three ways to pay, every number from @repo/pricing
 *   Testimonials    real quotes only; hidden until there are enough
 *   FAQ             the objections
 *
 * The old argument-order page (problem, capabilities, proof, projects, compare) is
 * replaced; its components are listed for deletion in plan/web/revamp REV-16. Every
 * claim on the new sections traces to a file in content/modules.ts.
 */
// FAQPage rich-result data, built from the SAME array the accordion renders.
//
// The landing page had none, while /pricing did - so nine well-written answers on the
// highest-authority page on the site were invisible to the one result type that quotes
// answers directly. Google requires the marked-up text to match what a visitor sees, which
// is why this reads LANDING_FAQS rather than restating them.
const landingFaqSchema = faqSchema(LANDING_FAQS)

// The landing page's own WebPage node, wired into the site graph by @id.
//
// It does NOT redeclare WebSite. An earlier version of this file did, with the same @id
// the root layout uses - two competing definitions of one entity. See lib/schema.ts.
const landingPageSchema = webPageSchema({
    url: SITE,
    name: `${BRAND.name} - ${BRAND.tagline}`,
    description:
        "Practice DSA and system design with code that runs in a real Linux container, build projects you can be interviewed about, rehearse voice mock interviews and fix the resume an ATS is actually reading.",
})

// The numbers band reads live counts (cached an hour in lib/landing-numbers.ts).
export const revalidate = 3600

export default function LandingPage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(landingFaqSchema)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(landingPageSchema)} />
            <SiteHeader />
            <main className="relative bg-neutral-50">
                <HomeHero />
                <HomeModules />
                <WalkAway />
                <HowItWorks title="From sign-up to an offer, in four steps" steps={HOME_STEPS} />
                <ProductTour eyebrow="Take the tour" title="See what each part does" tabs={HOME_TOUR} />
                {/* Two sections between the two sticky scrolls (tour: sticky right; stage:
                    sticky left), so they never come back to back (REV-114). */}
                <PracticeTracks />
                <NumbersBand title="ShipItHQ so far" keys={["developers", "projects", "tasksApproved", "mocks"]} />
                <StageTabs />
                <IncidentsBand />
                <EverythingElse />
                <CompareStrip />
                <PricingStrip />
                <FromTheGuides />
                <TestimonialWall id="testimonials" testimonials={TESTIMONIALS} demo={DEMO_STUDENTS} title="Engineers building with ShipItHQ" />
                <section id="faq" className="bg-white">
                    <FaqsAccrodian />
                </section>
                <CtaBand
                    title={<>Stop preparing. <br className="hidden sm:block" />Start shipping.</>}
                    sub="Practise in a real container, build something you can defend, and walk into the interview having done it before."
                    primary={{ text: "Start free", href: APP_LINKS.signup }}
                    secondary={{ text: "See pricing", href: "/pricing" }}
                    words={["Practice", "Projects", "Mock interviews", "Resume", "Jobs", "Pathfinder", "Public profile", "Ideas"]}
                />
            </main>
            <SiteFooter />
        </>
    )
}
