import type { Metadata } from "next"
import { pageMeta } from "@/lib/seo"
import { breadcrumbSchema, faqSchema, jsonLd, webPageSchema } from "@/lib/schema"
import { APP_LINKS, BRAND, SITE } from "@/lib/site"
import { Eyebrow, GhostCta, MONO, PrimaryCta, Section } from "@/components/marketing/primitives"
import { CtaBand } from "@/components/marketing/sections"
import { FaqAccordion } from "@/components/faq-accordion"
import { StoryPanel } from "@/components/story/scroll-story"
import { ReportBands } from "@/components/story/kit"
import { getIncidentStory, STORY_CASE } from "@/lib/incidents"
import { CaseMap, IncidentStory } from "./_components/incident-story"

/**
 * Incidents, the launch page (plan/web/story ST-6). The product told as a story: one case,
 * "The demo that died at 30 seconds", carried from the call to the fix, every panel the case
 * player's own diagram drawn from the database. The cases are played in the app.
 */

export const revalidate = 3600

const meta = pageMeta({
    title: "Incidents: real production failures you play",
    description: "Real production failures as cases you play: predict, watch it fail, talk it through with an AI incident lead, and leave with the fix. Free, no codebase.",
    path: "/incidents",
})

// Without `images`, so the generated card in ./opengraph-image.tsx is the one used (pageMeta's
// default would win over it, as the blog index found).
const { images: _og, ...openGraph } = meta.openGraph ?? {}
const { images: _tw, ...twitter } = meta.twitter ?? {}
export const metadata: Metadata = { ...meta, openGraph, twitter }

// The facts below come from apps/main: no credits are spent on a case; reading is open; the
// daily limits are ASKS_PER_DAY (narration.action.ts), INCIDENT_MOCKS_PER_DAY (mock.action.ts)
// and REPORTS_PER_DAY (run.action.ts).
const FAQS = [
    { question: "What is an incident case?", answer: "A real kind of production failure, told as a story you play: what happened, how a request actually lives, why it failed, the fix, and what goes wrong after the fix ships. Each chapter has diagrams of the system, checks you answer before reading on, and some have a short talk with an AI incident lead." },
    { question: "Is it free?", answer: "Yes. Cases spend no credits. Anyone can read a case; answering checks, talking with the lead and keeping your progress need a free account." },
    { question: "Do I need to set anything up?", answer: "No. There is no codebase to clone and nothing to install. Everything happens in the case: the diagrams, the simulator, the checks and the talks." },
    { question: "What does the AI incident lead do?", answer: "It reads chapters aloud if you want, answers questions about the case, and talks a case through with you out loud or typed, pushing on the parts you skip. In a recorded run it writes a review of how you reasoned: diagnosis, reasoning, the questions you asked, and how you explained the fix." },
    { question: "Are there limits?", answer: "A few, per day: 20 questions to the lead, 3 closing talks and 2 run reviews. The short talks inside chapters have no limit, and reading has none." },
]

export default async function IncidentsPage() {
    const data = await getIncidentStory()
    const cases = data?.cases ?? []
    const story = data?.story ?? null
    const minutes = cases.map((c) => c.minutes)
    const span = minutes.length ? (Math.min(...minutes) === Math.max(...minutes) ? `${minutes[0]} minutes` : `${Math.min(...minutes)} to ${Math.max(...minutes)} minutes`) : null
    const playStory = `${APP_LINKS.incidents}/${STORY_CASE}`

    const crumbs = breadcrumbSchema([], { name: "Incidents", path: "/incidents" })
    const page = webPageSchema({ url: `${SITE}/incidents`, name: `Incidents | ${BRAND.name}`, description: "Real production failures as cases you play, with an AI incident lead.", breadcrumb: crumbs["@id"] })

    return (
        <main className="bg-neutral-50">
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(crumbs)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(page)} />
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(FAQS))} />

            {/* ── Hero: the product doing its job, drawn ── */}
            <section className="px-4 pt-10 sm:px-6 md:pt-16">
                <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="sh-reveal">
                        <Eyebrow>New · Incidents</Eyebrow>
                        <h1 className="mt-4 text-balance font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-neutral-900 md:text-6xl">
                            Learn production from the day it broke.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700">
                            Real failures as cases you play. Predict what happens, watch it fail, talk it through with an AI
                            incident lead, and leave with the fix. Free to read, no codebase needed.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                            <PrimaryCta href={playStory}>Play the 30-second case</PrimaryCta>
                            <GhostCta href={APP_LINKS.incidents}>See every case</GhostCta>
                        </div>
                        {cases.length > 0 && (
                            <p className={`${MONO} mt-8 text-[12px] uppercase tracking-[0.14em] text-neutral-600`}>
                                {cases.length} {cases.length === 1 ? "case" : "cases"} live{span ? ` · ${span} each` : ""} · no credits
                            </p>
                        )}
                    </div>
                    {story && (
                        <div className="sh-reveal min-w-0" style={{ ["--sh-reveal-delay" as string]: "0.1s" }}>
                            <StoryPanel label={story.title} takeaway={story.system.caption ?? story.summary}>
                                {/* At phone width the map's labels would shrink to ~6px: keep it at a
                                    readable size and let it scroll inside the frame instead. */}
                                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                                    <div className="min-w-[34rem] sm:min-w-0"><CaseMap map={story.system} /></div>
                                </div>
                            </StoryPanel>
                        </div>
                    )}
                </div>
            </section>

            {/* ── The before ── */}
            <Section eyebrow="Before" title="Most engineers meet this on a live call." sub="A job that dies inside a request, a limit nobody wrote down, an alert that never fires. Usually you learn it once it has already cost you.">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <figure className="rounded-2xl border border-neutral-200 bg-white p-6">
                        <p className={`${MONO} text-[11px] uppercase tracking-[0.14em] text-neutral-600`}>How it is learned today</p>
                        <ol className="mt-4 space-y-3">
                            {["Read a postmortem, after it happened to someone else", "Or meet it yourself, in production, with a client watching", "Guess at the cause, and fix the wrong thing first"].map((t, i) => (
                                <li key={t} className="flex gap-3 text-[15px] leading-6 text-neutral-800">
                                    <span className={`${MONO} mt-0.5 text-[12px] text-neutral-500`}>{String(i + 1).padStart(2, "0")}</span>{t}
                                </li>
                            ))}
                        </ol>
                        <figcaption className="mt-5 border-t border-neutral-200 pt-3 text-[14px] font-medium text-neutral-900">The lesson arrives after the damage.</figcaption>
                    </figure>
                    <figure className="rounded-2xl border border-neutral-900 bg-neutral-900 p-6 text-white">
                        <p className={`${MONO} text-[11px] uppercase tracking-[0.14em] text-neutral-300`}>In a case</p>
                        <ol className="mt-4 space-y-3">
                            {["Predict what happens before anything is explained", "Watch the request fail, step by step, on the real diagrams", "Talk it through with the lead, then fix it on the map"].map((t, i) => (
                                <li key={t} className="flex gap-3 text-[15px] leading-6 text-neutral-100">
                                    <span className={`${MONO} mt-0.5 text-[12px] text-neutral-400`}>{String(i + 1).padStart(2, "0")}</span>{t}
                                </li>
                            ))}
                        </ol>
                        <figcaption className="mt-5 border-t border-white/20 pt-3 text-[14px] font-medium">The same failure, with nothing at stake.</figcaption>
                    </figure>
                </div>
            </Section>

            {/* ── The story: one case, start to finish ── */}
            {story && (
                <Section eyebrow="One case, start to finish" title={story.title} sub={story.summary} className="pt-0 md:pt-0">
                    <IncidentStory story={story} />
                    <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
                        <PrimaryCta href={playStory}>Play this case</PrimaryCta>
                        <span className="text-[14px] text-neutral-600">About {story.minutes} minutes</span>
                    </div>
                </Section>
            )}

            {/* ── What you leave with ── */}
            <Section eyebrow="What you leave with" title="A review of how you reasoned, not a score." sub="Record a run and the lead reviews it on four things, with the moments behind each rating.">
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 md:grid-cols-2">
                    <ReportBands />
                    <ul className="space-y-4 text-[15px] leading-7 text-neutral-700">
                        <li><strong className="font-semibold text-neutral-900">Diagnosis:</strong> did you find the real cause, or the first plausible one.</li>
                        <li><strong className="font-semibold text-neutral-900">Reasoning:</strong> how you got there.</li>
                        <li><strong className="font-semibold text-neutral-900">Questions asked:</strong> whether your questions got to the cause.</li>
                        <li><strong className="font-semibold text-neutral-900">Explaining the fix:</strong> the fix and its trade-offs, in your own words.</li>
                    </ul>
                </div>
            </Section>

            {/* ── Every case so far ── */}
            {cases.length > 0 && (
                <Section eyebrow="The cases" title="Every case so far" sub="Each one is a real kind of failure, drawn on its own system map with the part that broke lit.">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        {cases.slice().reverse().map((c) => (
                            <li key={c.slug}>
                                <a href={`${APP_LINKS.incidents}/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900">
                                    {c.system && <div className="pointer-events-none border-b border-neutral-100 p-3"><CaseMap map={c.system} compact /></div>}
                                    <div className="flex flex-1 flex-col p-5">
                                        <p className={`${MONO} text-[11px] text-neutral-600`}>{c.minutes} min · {c.steps} steps · {c.checks} checks · up to {c.xp} XP</p>
                                        <p className="mt-2 text-[17px] font-semibold leading-snug text-neutral-900">{c.title}</p>
                                        <p className="mt-1.5 flex-1 text-[14px] leading-6 text-neutral-700">{c.summary}</p>
                                        {c.credit && <p className={`${MONO} mt-3 text-[11px] text-neutral-600`}>Based on {c.credit.name}&apos;s explanation</p>}
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
                <Eyebrow>Questions</Eyebrow>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Before you play one</h2>
                <div className="mt-8"><FaqAccordion faqs={FAQS} idPrefix="incidents-faq" /></div>
            </div>

            <CtaBand
                title={<>The next production failure,<br className="hidden sm:block" /> before it happens to you.</>}
                sub="Start with the 30-second case: a job, a client on the call, and a refresh."
                primary={{ text: "Play the 30-second case", href: playStory }}
                secondary={{ text: "See every case", href: APP_LINKS.incidents }}
                words={["Predict", "Watch it fail", "Talk it through", "Fix it", "Postmortem"]}
            />
        </main>
    )
}
