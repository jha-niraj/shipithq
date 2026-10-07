"use client"

import { SIGNUP_GRANT_CREDITS } from "@repo/pricing"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Lock, Infinity as Infit, Server, Sparkles } from "lucide-react"
import { PricingBento } from "@repo/ui/components/pricing-bento"
import { checkoutUrl } from "@repo/pricing"
import { PageHero } from "@/components/page-hero"
import FaqsAccrodian from "@/components/landingpage/faqs"
import { pricingFaqs } from "./pricing-faqs"
import { APP_LINKS, APP_URL } from "@/lib/site"
import { Sum } from "@/components/story/kit"

const valueProps = [
	{ icon: Infit, title: "Credits never expire", desc: "Buy once, spend whenever. Your balance is yours forever." },
	// What the payments code does (plan/web/story ST-1): both currencies in @repo/pricing, and
	// credits added when the payment is verified (apps/main/app/api/payments/verify/route.ts).
	{ icon: Lock, title: "Pay in INR or USD", desc: "Every pack is priced in both. Each purchase gets a receipt on your Credits page." },
	{ icon: Server, title: "Credits land at once", desc: "As soon as the payment is verified, the credits are in your balance." },
]

/**
 * What the signup credits buy (plan/web/story ST-10), in credits so it holds when the pack
 * prices change (ST-12). Each amount is apps/main/lib/credits/pricing.ts: practice_set (the
 * mentor, once per problem), resume_ats_score, resume_tailor_jd, cover_letter_generate,
 * sprint_quiz, sprint_mock. Change them there first, then here.
 */
const FREE_WEEK = [
	{ what: "One problem with the mentor", amount: 5, note: "Two Sum, step by step; on your own it is free" },
	{ what: "An ATS score for your resume", amount: 5 },
	{ what: "Your resume tailored to one job", amount: 20 },
	{ what: "A cover letter for that job", amount: 15 },
	{ what: "A sprint quiz on your project", amount: 25, note: "Seeded projects are free to start; retakes are free" },
	{ what: "A sprint mock interview", amount: 30, note: "About ten minutes, typed or spoken" },
]

export default function PricingClient() {
	return (
		<main className="bg-white dark:bg-neutral-950">
			{/* ── Hero ─────────────────────────────────────────────────────────── */}
			{/* `ledger` variant: someone on this page arrived wanting a number, so the
			    header states the model and then puts four hard facts under a rule. The
			    bespoke #faf7f2 ground and its own shader went with the old header - see
			    components/page-hero.tsx on why the surface is not a prop. */}
			<PageHero
				variant="ledger"
				tone="butter"
				art="pricing"
				eyebrow="Pricing"
				title={<>Pay only for what you run.</>}
				sub="No subscription, no idle-time charge. Buy a pack once and spend credits when you actually build, practise or interview - and if an AI operation fails, the credits come straight back."
				facts={[
					{ value: `${SIGNUP_GRANT_CREDITS}`, label: "Free credits on signup" },
					{ value: "0", label: "Subscriptions" },
					{ value: "Never", label: "Credits expire" },
					{ value: "5", label: "Languages that run" },
				]}
			/>

			{/* ── Pricing cards ────────────────────────────────────────────────── */}
			<section className="relative border-t border-neutral-100 py-20 dark:border-neutral-800">
				<div className="mx-auto max-w-7xl px-6">
					{/* No currency toggle (plan/web/story ST-10): each card shows INR and USD, each with
					    its own checkout link. */}
					<PricingBento
						currency="INR"
						hrefFor={(pkg) => checkoutUrl(APP_URL, pkg, "INR")}
						second={{ currency: "USD", hrefFor: (pkg) => checkoutUrl(APP_URL, pkg, "USD") }}
						showFreeCredits
						freeCreditsHref={`${APP_URL}/purchase`}
					/>
				</div>
			</section>

			{/* ── What the free credits buy: a worked sum ── */}
			<section className="border-t border-neutral-100 py-16">
				<div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-8 px-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<div>
						<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-600">Worked out</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">What {SIGNUP_GRANT_CREDITS} free credits buy</h2>
						<p className="mt-4 text-[15px] leading-relaxed text-neutral-700">
							One week, priced the way the app charges it. Reading incident cases, practising on your own and
							retaking a sprint quiz cost nothing, so they are not on the bill.
						</p>
					</div>
					<Sum label={`One week on the free ${SIGNUP_GRANT_CREDITS} credits`} lines={FREE_WEEK} budget={SIGNUP_GRANT_CREDITS} />
				</div>
			</section>

			{/* ── Value props ──────────────────────────────────────────────────── */}
			<section className="border-t border-neutral-100 py-16 dark:border-neutral-800">
				<div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
					{valueProps.map((v) => (
						<div
							key={v.title}
							className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
						>
							<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 dark:bg-neutral-200/10">
								<v.icon className="h-5 w-5 text-neutral-900 dark:text-white" />
							</div>
							<h3 className="text-base font-bold text-neutral-900 dark:text-white">{v.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{v.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ── FAQ: the landing's shared FAQ band (plan/web/revamp REV-99) ── */}
			<section className="border-t border-neutral-100 bg-white">
				<FaqsAccrodian
					faqs={pricingFaqs.map((f) => ({ question: f.q, answer: f.a }))}
					idPrefix="pricing-faq"
					sub="Everything about how credits, billing and access work on ShipItHQ."
				/>
			</section>

			{/* ── CTA ──────────────────────────────────────────────────────────── */}
			<section className="border-t border-neutral-100 py-20 dark:border-neutral-800">
				<div className="mx-auto max-w-3xl px-6 text-center">
					<Sparkles className="mx-auto mb-5 h-7 w-7 text-neutral-900 dark:text-white" />
					<h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
						Start building for{" "}
						<span className="text-neutral-900 dark:text-white">free.</span>
					</h2>
					<p className="mx-auto mt-4 max-w-lg text-neutral-500 dark:text-neutral-400">
						Create an account, claim your starter credits, and start a project,
						a practice problem or an incident case in minutes.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<a
							href={APP_LINKS.signup}
							className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
						>
							Get started free <ArrowRight className="h-4 w-4" />
						</a>
						<Link
							href="/aboutus#contact"
							className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-7 py-3.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
						>
							Talk to us
						</Link>
					</div>
				</div>
			</section>
		</main>
	)
}
