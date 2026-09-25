"use client"

// The companies landing page (moved from apps/hiring, plan/hiring-app HA-3,
// Niraj 2026-09-25: moved, not deleted; it is improved later). The hiring app
// itself opens on sign-in.
import Navbar from "./navbar";
import HeroSection from "./hero-section";
import FeaturesSection from "./features-section";
import HowItWorksSection from "./how-it-works-section";
import PricingSection from "./pricing-section";
import TestimonialsSection from "./testimonials-section";
import FaqSection from "./faq-section";
import CtaSection from "./cta-section";
import Footer from "./footer";
import VerificationTools from "./verificationtools";
import InterviewSuite from "./interviewsuite";
import SmoothScroll from "@/components/smoothscroll";
import BotTerminal from "./botterminal";
import CandidateIntelligence from "./candidateintelliegence";
import IntegrationMarquee from "./intergrationmarquee";

export function HireLanding() {
	return (
		<SmoothScroll>
			<Navbar />
			<main className="relative bg-white dark:bg-neutral-900">
				<section id="hero">
					<HeroSection />
				</section>
				<section id="features">
					<FeaturesSection />
				</section>
				<section id="how-it-works">
					<HowItWorksSection />
				</section>
				<section id="botterminal">
					<BotTerminal />
				</section>
				<section id="verificationtools">
					<VerificationTools />
				</section>
				<section id="candidateintelliegence">
					<CandidateIntelligence />
				</section>
				<section id="integrationmarquee">
					<IntegrationMarquee />
				</section>
				<section id="interviewsuite">
					<InterviewSuite />
				</section>
				<section id="pricing">
					<PricingSection />
				</section>
				<section id="testimonials">
					<TestimonialsSection />
				</section>
				<section id="faq">
					<FaqSection />
				</section>
				<section id="cta">
					<CtaSection />
				</section>
				<Footer />
			</main>
		</SmoothScroll>
	)
}