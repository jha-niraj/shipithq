import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Code2, Coins, Swords, BookOpen, Users, LogIn } from 'lucide-react'
import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";
import { Reveal } from '@/components/reveal'
import { APP_LINKS } from '@/lib/site'
import { NotFoundArt } from './_components/not-found-art'

/**
 * The 404.
 *
 * ── Its job is to get somebody where they were going ──
 *
 * The previous version was a centred card with an apology and two buttons, which is what
 * most 404s are and is close to useless: it tells you the page is missing, which you knew,
 * and then offers "home" - the one destination somebody who typed a specific URL was not
 * looking for.
 *
 * This one leads with destinations. Six real places, each with a line saying what is there,
 * so a reader can recognise the one they wanted rather than navigating from scratch.
 *
 * ── The "signed in" block is not filler ──
 *
 * A large share of the 404s this page will ever see are people typing an app route on the
 * marketing domain - `/leaderboard`, `/chat`, `/dashboard`. Some of those used to redirect
 * into the app and land on ITS 404, which is worse: the app's error page has no way back
 * into the marketing site. Those redirects are gone (see the note on `APP_PATHS` in
 * `next.config.mjs`), so those URLs arrive here instead, and here we can actually help.
 *
 * ── noindex, follow ──
 *
 * Unchanged and deliberate. A 404 must never be indexed, and `follow` keeps the links on it
 * live so a crawler that lands here still reaches the rest of the site.
 */

export const metadata: Metadata = {
    title: 'Page not found',
    robots: { index: false, follow: true },
}

const DESTINATIONS = [
    {
        href: '/features',
        icon: Code2,
        title: 'Features',
        description: 'What each module does, and what each one deliberately does not',
    },
    {
        href: '/blogs',
        icon: BookOpen,
        title: 'Guides',
        description: '30 written guides on interviews, DSA, resumes and careers',
    },
    {
        href: '/compare',
        icon: Swords,
        title: 'Compare',
        description: 'Ten honest comparisons, each opening with what the alternative is good at',
    },
    {
        href: '/pricing',
        icon: Coins,
        title: 'Pricing',
        description: 'Credits per operation, 100 free at signup, no subscription',
    },
    {
        href: '/aboutus',
        icon: Users,
        title: 'About',
        description: 'Who is building this, and how the claims on this site are written',
    },
    {
        href: '/aboutus#contact',
        icon: ArrowRight,
        title: 'Contact',
        description: 'If a link brought you here that should not have, tell us',
    },
] as const

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950">
            <SiteHeader />

            <main className="flex-1">
                <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
                    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
                        <Reveal>
                            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                                404
                            </p>
                            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
                                That page is not here.
                            </h1>
                            <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
                                The link is probably out of date, or the page moved when the site was
                                reorganised. Nothing is broken on your end.
                            </p>

                            {/* The specific case this page sees most. */}
                            <div className="mt-8 max-w-lg rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
                                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                                    <LogIn className="h-4 w-4" aria-hidden />
                                    Looking for something you sign in to?
                                </p>
                                <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                    Practice, projects, mock interviews and your resume all live in the
                                    app rather than on this site.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <a
                                        href={APP_LINKS.signin}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                    >
                                        Sign in <ArrowRight className="h-4 w-4" aria-hidden />
                                    </a>
                                    <a
                                        href={APP_LINKS.signup}
                                        className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                                    >
                                        Create an account
                                    </a>
                                </div>
                            </div>
                        </Reveal>

                        <Reveal delay={0.1} className="hidden lg:block">
                            <NotFoundArt className="w-full text-neutral-300 dark:text-neutral-700" />
                        </Reveal>
                    </div>

                    {/* Destinations, not an apology. Somebody who typed a specific URL is not
                        looking for "home" - they are looking for a thing, and the fastest way
                        to help is to show them the things. */}
                    <Reveal className="mt-16 border-t border-neutral-200 pt-12 dark:border-neutral-800">
                        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            Where you might have been going
                        </p>
                        <div className="grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3">
                            {DESTINATIONS.map((d) => {
                                const Icon = d.icon
                                return (
                                    <Link
                                        key={d.href}
                                        href={d.href}
                                        className="group flex flex-col bg-white p-6 transition-colors hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900/60"
                                    >
                                        <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors group-hover:border-neutral-400 group-hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:group-hover:border-neutral-500 dark:group-hover:text-white">
                                            <Icon className="h-4 w-4" aria-hidden />
                                        </span>
                                        <span className="mb-1.5 font-semibold text-neutral-900 dark:text-white">
                                            {d.title}
                                        </span>
                                        <span className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                            {d.description}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>

                        <Link
                            href="/"
                            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900 dark:text-white dark:decoration-neutral-700 dark:hover:decoration-white"
                        >
                            Or start from the home page
                            <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                    </Reveal>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
