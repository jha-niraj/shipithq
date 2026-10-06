// The companies landing page, shipithq.com/hire (plan/web/revamp REV-21), rebuilt on
// the same system as the student landing: hero, what you get, how it works, pricing,
// testimonials (real quotes only), FAQ, and a closing band. Copy and sources:
// content/hire.ts.
import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";
import FaqsAccrodian from "@/components/landingpage/faqs";
import { HireHero } from "@/components/hire/hero";
import { ModuleCardGrid } from "@/components/home/modules";
import { TestimonialWall } from "@/components/site/testimonial-wall";
import { Section } from "@/components/marketing/primitives";
import { CtaBand, NumbersBand } from "@/components/marketing/sections";
import { RoleStory } from "@/components/hire/role-story";
import { GuidesStrip } from "./guides-strip";
import { AlreadyPractising, FairByDesign, OldVsNew, TeamSizes } from "@/components/hire/sections";
import { TESTIMONIALS as COMPANY_TESTIMONIALS } from "@/content/testimonials/companies";
import { DEMO_COMPANIES } from "@/content/testimonials/demo";
import { HIRE_FAQS, HIRE_MODULES } from "@/content/hire";
import { BRAND, HIRING_LINKS } from "@/lib/site";
import PricingSection from "./pricing-section";

export function HireLanding() {
	return (
		<>
			<SiteHeader />
			<main className="relative bg-neutral-50">
				<HireHero />

				<Section
					id="features"
					eyebrow="What you get"
					title="Everything between a job post and a hire"
					sub="Five parts of one workspace, for the whole hiring team. Each has its own page."
				>
					<ModuleCardGrid items={HIRE_MODULES} />
				</Section>

				<OldVsNew />
				{/* plan/web/story ST-9 (Niraj, 2026-10-07): one role and one candidate from the company's
				    chair replaces "How it works", the candidate's phone (a 12s timer) and the workspace
				    tour (tabs), which told one journey three ways. */}
				<Section
					id="how-it-works"
					eyebrow="How it works"
					title="One role, from the rounds to a decision"
					sub="A backend role, its four rounds, and one candidate who cleared them, seen from your side."
				>
					<RoleStory />
				</Section>
				<AlreadyPractising />
				<NumbersBand title="On ShipItHQ today" keys={["developers", "activeJobs", "companies", "mocks"]} />
				<FairByDesign />
				<TeamSizes />
				<GuidesStrip />
				<PricingSection />

				<TestimonialWall id="testimonials" testimonials={COMPANY_TESTIMONIALS} demo={DEMO_COMPANIES} title="Teams hiring with ShipItHQ" />

				<section id="faq" className="bg-white">
					<FaqsAccrodian
						faqs={HIRE_FAQS}
						idPrefix="hire-faq"
						sub="Who can sign up, what the rounds are, where candidates come from and what it costs."
					/>
				</section>

				<CtaBand
					title={<>Design your interview <br className="hidden sm:block" />once.</>}
					sub="Set up your workspace with a company email and build your first pipeline in minutes."
					primary={{ text: "Start hiring free", href: HIRING_LINKS.signup }}
					secondary={{ text: "Talk to us", href: `mailto:${BRAND.email}` }}
					words={["Pipelines", "Hard gates", "Pass marks", "Question bank", "Round results", "Invite or decline", "Custom roles"]}
				/>
			</main>
			<SiteFooter audience="companies" />
		</>
	)
}
