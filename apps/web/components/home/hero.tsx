import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SIGNUP_GRANT_CREDITS } from "@repo/pricing"
import { cn } from "@repo/ui/lib/utils"
import { APP_LINKS } from "@/lib/site"
import { LATEST } from "@/content/changelog"
import { GhostCta, MONO, PrimaryCta } from "@/components/marketing/primitives"
import { HeroWindow } from "./hero-window"

/**
 * The student landing hero (plan/web/revamp REV-10, REV-101; Niraj, 2026-09-26: a
 * split layout with a live product window). Copy on the left; on the right one app
 * window that cycles through Practice, Project, Mock and Resume on its own
 * (hero-window.tsx). Deliberately unlike the /hire hero, which is a dark band with
 * candidates flowing through gates.
 *
 * Below lg the window stacks under the copy.
 */
export function HomeHero() {
    const news = LATEST?.items[0]
    return (
        <section className="relative overflow-hidden bg-neutral-50">
            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pb-28 lg:pt-24">
                <div className="sh-reveal">
                    {LATEST && news && (
                        <Link
                            href={`/changelog#${LATEST.month}`}
                            className="group mb-8 inline-flex max-w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:border-neutral-300"
                        >
                            <span className={cn(MONO, "text-[11px] uppercase tracking-[0.14em] text-neutral-500")}>New</span>
                            <span className="truncate font-medium text-neutral-900">{news.title}</span>
                            <ArrowRight className="size-3.5 shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                    )}

                    <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-950 sm:text-6xl xl:text-7xl">
                        Practice, build,
                        <br />
                        and get{" "}
                        <span className={cn(MONO, "font-medium tracking-[-0.06em]")}>hired.</span>
                    </h1>

                    <p className="mt-7 max-w-lg text-lg leading-8 text-neutral-700">
                        Code that runs in a real Linux container, projects you are interviewed about,
                        voice mock interviews and a resume that says what you built.
                    </p>

                    <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                        <PrimaryCta href={APP_LINKS.signup}>Start free</PrimaryCta>
                        <GhostCta href="#modules" play>See how it works</GhostCta>
                    </div>

                    <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-neutral-200 pt-6">
                        {[
                            { v: `${SIGNUP_GRANT_CREDITS}`, l: "Free credits" },
                            { v: "5", l: "Languages that run" },
                            { v: "0", l: "Subscriptions" },
                        ].map((x) => (
                            <div key={x.l}>
                                <dt className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">{x.v}</dt>
                                <dd className={cn(MONO, "mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-600")}>{x.l}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: "0.1s" }}>
                    <HeroWindow />
                </div>
            </div>
        </section>
    )
}
