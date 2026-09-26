/**
 * Server component as of 2026-08-21.
 *
 * It was `"use client"` for exactly two things: a pair of framer-motion blocks doing a
 * plain scroll fade. That is the same pattern four landing sections were converted off in
 * WEB-52 - decoration is not state, and a fade does not justify sending 273 lines of a
 * static page across a client boundary along with the motion runtime.
 *
 * `Reveal` does the same fade with zero JavaScript (one site-wide IntersectionObserver
 * flipping a CSS class - see components/reveal.tsx).
 *
 * The contact form below IS still a client component, and correctly so: it has form state
 * and a submit handler. The boundary now sits around the form rather than around the page.
 */
import Link from "next/link";

import React from 'react'
import { Reveal } from '@/components/reveal'
import { ArrowRight, Target, Users, Globe, Cpu, Mail } from 'lucide-react'
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { APP_LINKS, BRAND, APP_URL } from "@/lib/site"
import ContactClient from "./_components/contact-client"
import { PageHero } from "@/components/page-hero"
import { GapArt, EvidenceArt, ContainerArt } from "./_components/about-art"

/**
 * Facts, not vanity metrics.
 *
 * This block used to read "10K+ Active Developers", "500+ Projects Shipped", "12 Countries
 * Reached" and "1M+ Lines of Code". Not one of those was sourced, and they sat on the page
 * that DEFINES the company - the single worst place on the site to invent a number, because
 * it is the page a reader visits specifically to decide whether to believe the rest.
 *
 * Everything below is checkable in this repository, and the `source` says where. Same rule
 * as `features/_components/feature-modules.ts` and the comparison pages.
 *
 * If you want usage numbers here later, `actions/stats.action.ts` already returns real
 * counts from the database. Use those, or use nothing.
 */
const stats = [
    { value: "6", label: "Languages that run", note: "JavaScript, TypeScript, Python 3, C, C++, Java" },
    { value: "100", label: "Free credits at signup", note: "No card, and they never expire" },
    { value: "0", label: "Subscriptions", note: "You pay for operations, not for months" },
    { value: "30", label: "Guides published", note: "Across seven topics, all free to read" },
]

export default function AboutUs() {
    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800">
            {/* `statement` variant: About is an argument, not a list, so the header is
                one claim and nothing else. See components/page-hero.tsx for why the
                surface is fixed and only the composition varies. */}
            <PageHero
                variant="statement"
                tone="blush"
                art="about"
                eyebrow="Since 2024"
                title={<>Nobody gets hired for<br className="hidden sm:block" /> finishing a tutorial.</>}
                sub="ShipItHQ exists for the gap between passing a course and passing an interview - the part where you have to build something real, explain it out loud, and prove you can do it again."
                ctas={[
                    { text: "Start building", href: `${APP_URL}/register`, external: true },
                    { text: "See what it costs", href: "/pricing" },
                ]}
            />

            {/* ── The entity definition ──

                One sentence, in "X is Y" form, in the first 150 words, standing on its own
                without the paragraph around it.

                That shape is not a stylistic preference. This is the page an assistant reads
                when somebody asks "what is ShipItHQ", and the hero above it opens with an
                argument ("Nobody gets hired for finishing a tutorial") rather than a
                definition - which is right for a human arriving from an ad and useless to
                anything trying to extract what the product actually is.

                It says the same thing as the `description` in this route's AboutPage schema,
                deliberately. A definition that exists only in the markup is one no human
                sees; one that exists only in prose is one a parser has to guess at. */}
            <section className="border-b border-neutral-100 py-16 dark:border-neutral-800">
                <div className="mx-auto max-w-3xl px-6">
                    <p className="text-xl leading-relaxed text-neutral-900 dark:text-white sm:text-2xl">
                        <strong className="font-semibold">ShipItHQ is an interview preparation and portfolio
                        platform for computer science students and software engineers.</strong>{" "}
                        <span className="text-neutral-600 dark:text-neutral-400">
                            It combines four things that are usually five separate tabs: pattern-based
                            practice where your code runs in a real Linux container, portfolio projects
                            with a quiz and mock interview generated from what you actually built, voice
                            mock interviews you can take at any hour, and resume tooling that scores what
                            an applicant tracking system extracts from your file.
                        </span>
                    </p>
                    <p className="mt-6 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                        It is not a course. There are no video lessons, no curriculum to complete and
                        nothing that issues a certificate - the full list of what each part does, and
                        what each part deliberately does not do, is on the{" "}
                        <Link href="/features" className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 dark:text-white dark:decoration-neutral-700 dark:hover:decoration-white">
                            features page
                        </Link>.
                    </p>
                </div>
            </section>

            <section className="py-24 border-b border-neutral-100 dark:border-neutral-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                        {
                            [
                                { icon: Target, title: "Our Mission", desc: "To democratize access to high-level engineering tools and AI guidance." },
                                { icon: Users, title: "Growth", desc: "Helping developers build real projects, practice, and get hired." },
                                { icon: Cpu, title: "Technology", desc: "Leveraging AI to simulate real-world technical interviews and tasks." },
                                { icon: Globe, title: "Impact", desc: "Helping students land roles at top product companies globally." }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-white">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{item.title}</h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            ))
                        }
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                        {
                            stats.map((stat, i) => (
                                <div key={i}>
                                    <div className="mb-1 font-mono text-3xl font-bold tabular-nums text-neutral-900 dark:text-white">{stat.value}</div>
                                    <div className="text-sm uppercase tracking-wider text-neutral-600 dark:text-neutral-400">{stat.label}</div>
                                    {/* A plain-English note, not a repository path. These four
                                        replaced invented vanity metrics, and for a while they
                                        cited the file each was read from - which proved the
                                        number to nobody and published our directory layout to
                                        everybody. The verification still happens; it belongs in
                                        review, not on the page. */}
                                    <div className="mt-1.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-500">{stat.note}</div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </section>
            {/* ── Why this exists ── */}
            <section className="border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
                        <Reveal>
                            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                Why this exists
                            </p>
                            <h2 className="mb-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                                The gap is not knowledge.
                            </h2>
                            <div className="space-y-4 text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                <p>
                                    People finish the course. They finish four hundred problems. Then they
                                    freeze on a follow-up question, cannot explain why they chose Postgres,
                                    and find out their resume was never read because it was two columns.
                                </p>
                                <p>
                                    None of that is a knowledge problem, and none of it is fixed by another
                                    tutorial. It is the distance between knowing a thing and being able to
                                    perform it, in front of a stranger, on a schedule you do not control.
                                </p>
                                <p className="border-l-2 border-neutral-900 py-1 pl-6 text-neutral-600 dark:border-white dark:text-neutral-400">
                                    Everything here is built for that distance. Not for teaching you what a
                                    hash map is.
                                </p>
                            </div>
                        </Reveal>
                        <Reveal delay={0.1} className="hidden lg:block">
                            <GapArt className="w-full text-neutral-400 dark:text-neutral-500" />
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── The rule ── */}
            <section className="border-t border-neutral-100 bg-neutral-50 py-24 dark:border-neutral-800 dark:bg-neutral-900/30">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
                        <Reveal delay={0.1} className="hidden lg:block">
                            <EvidenceArt className="w-full text-neutral-400 dark:text-neutral-500" />
                        </Reveal>
                        <Reveal>
                            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                How we write this site
                            </p>
                            <h2 className="mb-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                                Every claim names the file it came from.
                            </h2>
                            <div className="space-y-4 text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                <p>
                                    This site used to advertise a notes module with spaced repetition that
                                    had been deleted from the product. Somebody could have read that page,
                                    signed up, gone looking for it, and found nothing.
                                </p>
                                <p>
                                    So there is a rule now, and it is enforced in the code rather than in
                                    somebody&rsquo;s memory: a claim ships only if there is a route, an action or
                                    a constant behind it, and the evidence sits in the same file as the
                                    sentence. The features page names the file for every module. The
                                    comparison pages print the source in the table, on the page, where you
                                    can see it.
                                </p>
                                <p>
                                    It has teeth. Applying it deleted a section, six product claims, and five
                                    statistics that read as researched and were not - including the ones that
                                    used to be on this page.
                                </p>
                            </div>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href="/features"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                                >
                                    What each module is, and is not
                                </Link>
                                <Link
                                    href="/compare"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                                >
                                    How we compare ourselves
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── The one technical thing worth pointing at ── */}
            <section className="border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
                        <Reveal>
                            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                What is actually different
                            </p>
                            <h2 className="mb-6 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                                Your code runs on a real machine.
                            </h2>
                            <div className="space-y-4 text-[17px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                                <p>
                                    Most practice platforms mark an answer by comparing it to an expected
                                    string. When something goes wrong you get their description of the error,
                                    which is a translation of a translation.
                                </p>
                                <p>
                                    Here it goes to a Linux container that exists for that execution and is
                                    destroyed afterwards - a real filesystem, a real process, the compiler&rsquo;s
                                    own diagnostics. If g++ says you compared a signed int to an unsigned
                                    size, that is g++ talking.
                                </p>
                                <p className="border-l-2 border-neutral-900 py-1 pl-6 text-neutral-600 dark:border-white dark:text-neutral-400">
                                    It is the one claim on this site you can verify without trusting us: the
                                    image is checked into the repository.
                                </p>
                            </div>
                        </Reveal>
                        <Reveal delay={0.1} className="hidden lg:block">
                            <ContainerArt className="w-full text-neutral-400 dark:text-neutral-500" />
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ── What we are not ── */}
            <section className="border-t border-neutral-100 bg-neutral-50 py-24 dark:border-neutral-800 dark:bg-neutral-900/30">
                <div className="mx-auto max-w-4xl px-6">
                    <Reveal>
                        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            What this is not
                        </p>
                        <h2 className="mb-8 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                            Four things we are deliberately not doing.
                        </h2>
                    </Reveal>
                    <div className="space-y-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
                        {[
                            {
                                t: "Not a course.",
                                d: "No video lessons, no curriculum to complete, and nothing that issues a certificate. If you are learning your first language, start elsewhere and come back when you can solve a basic problem unaided.",
                            },
                            {
                                t: "Not a bigger problem bank.",
                                d: "There is no version of this where a newer product out-banks a decade-old archive, and pretending otherwise would waste your time and ours. Keep using the one you use.",
                            },
                            {
                                t: "Not a subscription.",
                                d: "Operations that cost real money to run cost credits. Reading, browsing and organising cost nothing, and nobody is charged for a month they did not use.",
                            },
                            {
                                t: "Not multiplayer.",
                                d: "Projects are single-user. Teams, shared workspaces and collaborators were removed from the product, and the marketing was corrected to match rather than the other way round.",
                            },
                        ].map((item, i) => (
                            <Reveal key={item.t} delay={i * 0.06} className="bg-white p-6 dark:bg-neutral-950">
                                <h3 className="mb-2 text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                                    {item.t}
                                </h3>
                                <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                    {item.d}
                                </p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 border-t border-neutral-100 dark:border-neutral-800">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">Ready to join the movement?</h2>
                    <div className="flex justify-center gap-4">
                        <a href="#contact">
                            <Button size="lg" className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900">
                                Contact Us <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </a>
                        <a href={APP_LINKS.signup}>
                            <Button variant="outline" size="lg" className="rounded-full border-neutral-200 dark:border-neutral-800">
                                Explore Platform
                            </Button>
                        </a>
                    </div>
                </div>
            </section>
            <section id="contact" className="scroll-mt-24 border-t border-neutral-100 py-24 dark:border-neutral-800">
                <div className="mx-auto max-w-7xl px-6">
                    <Reveal className="grid gap-14 lg:grid-cols-[1fr_1.2fr]">
                        <div>
                            <h2 className="mb-5 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                                Get in touch
                            </h2>
                            <p className="mb-8 text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
                                Questions about the platform, bulk credits for a university or bootcamp,
                                partnerships, or something that is broken. We read everything.
                            </p>

                            <div className="space-y-6 text-sm">
                                <div>
                                    <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        Email
                                    </p>
                                    <a
                                        href={`mailto:${BRAND.email}`}
                                        className="inline-flex items-center gap-2 text-neutral-900 underline-offset-4 hover:underline dark:text-white"
                                    >
                                        <Mail className="h-4 w-4" aria-hidden />
                                        {BRAND.email}
                                    </a>
                                </div>
                                <div>
                                    <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        Response time
                                    </p>
                                    <p className="text-neutral-600 dark:text-neutral-400">Within two working days.</p>
                                </div>
                                <div>
                                    <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                        Account &amp; billing
                                    </p>
                                    <p className="text-neutral-600 dark:text-neutral-400">
                                        Already have an account? Billing and account settings live in the app -
                                        this form is for everything else.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ContactClient />
                    </Reveal>
                </div>
            </section>
        </div>
    )
}