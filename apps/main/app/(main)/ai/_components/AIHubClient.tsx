"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
    ArrowRight, Sparkles, Zap, Briefcase, ChevronRight,
    FileText, FileSignature, Wand2, Target, Download
} from "lucide-react"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { TemplatePreview, type TemplateShape } from "@/components/resume/template-preview"
import { priceLabel, type PricedOperation } from "@/lib/credits/pricing"
import type { AiHubStats } from "@/actions/(main)/ai/hub-stats.action"
import { ActivityChart, type ActivityPoint } from "@/components/common/activity-chart"
import { StatBand, type StatBandItem } from "@repo/ui/components/ui/stat-band"

/**
 * The entry page for every AI module.
 *
 * ── What this page is for ──
 *
 * Somebody lands here to decide which of three tools to open, and to find out what it will
 * cost them before they spend anything. So everything on it is either a real number about
 * this user, a real price out of the pricing table, or a link to a route that exists.
 *
 * ── What was removed, and why ──
 *
 * The page it replaced was a marketing landing page that had been dropped inside the
 * signed-in shell, and it made four claims the product could not back:
 *
 *   "850+ Interviews Aced" / "2.1K Systems Designed" / "10K+ Active Developers" / "99.9%
 *      Uptime"  - four numbers typed into a const, none of them measured anywhere.
 *   "One subscription. Infinite possibilities."  - ShipItHQ sells credits. There is no
 *      subscription, so this described a product that does not exist.
 *   "Get Started Free" / "View Pricing"  - buttons with no handler and no href, on a page
 *      only reachable by someone who has already signed up.
 *   Cover Letter -> /ai/resume/cover-letter  - not a route. It fell through to
 *      /ai/resume/[username] and rendered a stranger's profile lookup.
 *
 * Prices come from `CREDIT_PRICES`, so this page cannot drift from what the charge sites
 * actually deduct. The interview assistant is the one tool with no fixed price - it bills
 * per question - so it says that instead of inventing a number.
 */

const tools = [
    {
        id: "resume",
        icon: FileText,
        name: "Resume Builder",
        description:
            "Import from LinkedIn and GitHub, pick a template, and tailor the result to a specific posting. Everything syncs back to your profile.",
        price: `Free to build, ${priceLabel("resume_tailor_jd")} to tailor`,
        href: "/ai/resume",
    },
    {
        id: "coverletter",
        icon: FileSignature,
        name: "Cover Letter",
        description:
            "Paste a job posting and get a letter written from your own experience, not a template with your name dropped into it.",
        price: `${priceLabel("cover_letter_generate")} per letter`,
        href: "/ai/coverletter",
    },
    {
        // Points at PATHFINDER, not at an AI-tools page. The Job Interview
        // Assistant was retired into it - see plan/interview-prep/ - because it
        // was a narrower second copy of Pathfinder: same questions, same coding
        // problems, same publish-and-sell model, on five parallel tables.
        id: "interviewprep",
        icon: Briefcase,
        name: "Prep for a job",
        description:
            "Paste a posting and get a Pathfinder goal of the questions it is likely to ask, with quizzes and coding problems you work through and score.",
        price: "1 credit per 2 questions",
        href: "/pathfinder",
    },
] as const

/** Three real counts for the signed-in user, each linked to the thing it counts. */
function statCards(stats: AiHubStats): StatBandItem[] {
    return [
        { label: "Resumes", value: stats.resumes, icon: FileText, href: "/ai/resume" },
        { label: "Cover letters", value: stats.coverLetters, icon: FileSignature, href: "/ai/coverletter" },
        { label: "Credits left", value: stats.credits, icon: Zap, href: "/purchase" },
    ]
}

/** The three steps, in the order somebody actually does them. */
const steps = [
    {
        icon: Download,
        title: "Bring your history in once",
        body: "Import a LinkedIn profile and a GitHub account, or upload a resume you already have. Parsing an upload is free.",
        href: "/ai/resume/import",
        cta: "Start an import",
    },
    {
        icon: Wand2,
        title: "Point it at a posting",
        body: "Paste the job description. The resume gets tailored to it and the cover letter is written from the same source, so the two agree with each other.",
        href: "/ai/resume",
        cta: "Open the builder",
    },
    {
        icon: Target,
        title: "Prepare for the room",
        body: "Turn the same posting into a Pathfinder goal of the questions it will ask, and work through them with quizzes and coding problems.",
        href: "/pathfinder",
        cta: "Prep for the job",
    },
] as const

/** Every priced AI operation, straight out of the pricing table. */
const priced: Array<{ op: PricedOperation; label: string }> = [
    { op: "resume_parse_upload", label: "Parse an uploaded resume" },
    { op: "resume_import", label: "Import from LinkedIn or GitHub" },
    { op: "resume_tailor_jd", label: "Tailor a resume to a posting" },
    { op: "resume_ats_score", label: "Score a resume against ATS" },
    { op: "cover_letter_generate", label: "Generate a cover letter" },
    { op: "cover_letter_questions", label: "Answer application questions" },
]

/** The three template previews fanned behind the hero copy. Decorative only. */
const HERO_CARDS: Array<{ shape: TemplateShape; x: number; y: number; r: number; o: number; d: number }> = [
    { shape: "executive-classic", x: -46, y: 18, r: -9, o: 0.35, d: 0 },
    { shape: "developer-pro", x: 0, y: 0, r: 0, o: 1, d: 0.12 },
    { shape: "modern-creative", x: 46, y: 18, r: 9, o: 0.35, d: 0.24 },
]

export default function AiToolsPage({
    stats,
    activity,
}: {
    stats: AiHubStats
    activity: { series: ActivityPoint[]; unit: string; total: number }
}) {
    const cards = statCards(stats)

    return (
        // An overview in the page frame (plan/ui-pass UI-10), not a landing page: the
        // hero, the numbers and the tools at the scale of /home and /mock.
        <div className="page-frame space-y-8 px-page pt-6 pb-10 font-sans selection:bg-neutral-100 dark:selection:bg-neutral-800">
            <section className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white px-6 py-8 lg:px-8 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-neutral-950" />
                <div className="absolute -top-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-neutral-900/10 opacity-50 blur-[100px] dark:bg-neutral-200/20" />

                <div className="relative z-10 w-full">
                    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
                        <motion.div
                            className="space-y-4"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Badge
                                variant="outline"
                                className="rounded-full border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                            >
                                <Sparkles className="mr-2 h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100" />
                                Three tools, one source of truth
                            </Badge>

                            <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl dark:text-white">
                                Your resume, your letter, and your interview{" "}
                                <span className="text-neutral-600 dark:text-neutral-400">
                                    built from the same history.
                                </span>
                            </h1>

                            <p className="max-w-2xl text-sm leading-relaxed text-neutral-600 md:text-base dark:text-neutral-400">
                                Import your experience once. Every tool here reads that one profile, so the
                                resume you send, the letter attached to it and the questions you practise are
                                describing the same person.
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button
                                    asChild
                                    className="cursor-pointer bg-neutral-900 px-5 text-white transition-all duration-300 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                                >
                                    <Link href="/ai/resume">
                                        Open Resume Builder
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="cursor-pointer border-neutral-200 bg-transparent px-5 text-neutral-900 hover:bg-neutral-50 dark:border-neutral-800 dark:text-white dark:hover:bg-neutral-900"
                                >
                                    <Link href="/ai/resume/import">Import from LinkedIn</Link>
                                </Button>
                            </div>
                        </motion.div>

                        {/* A fanned stack of the real template previews - the same component the
                            template picker draws, so the hero cannot show a layout that is not on
                            offer. Decorative, so it is hidden from assistive tech and dropped
                            entirely on small screens rather than squashed. */}
                        <div aria-hidden className="relative hidden h-[15rem] lg:block">
                            {HERO_CARDS.map((c) => (
                                <motion.div
                                    key={c.shape}
                                    className="absolute top-1/2 left-1/2 w-32 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-900 shadow-xl shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-black/40"
                                    initial={{ x: "-50%", y: "-50%", rotate: c.r, scale: 0.94, opacity: 0 }}
                                    animate={{
                                        x: `calc(-50% + ${c.x}%)`,
                                        y: [`calc(-50% + ${c.y}px)`, `calc(-50% + ${c.y - 8}px)`, `calc(-50% + ${c.y}px)`],
                                        rotate: c.r,
                                        scale: 1,
                                        opacity: c.o,
                                    }}
                                    transition={{
                                        opacity: { duration: 0.5, delay: c.d },
                                        scale: { duration: 0.5, delay: c.d },
                                        y: { duration: 6, delay: c.d, repeat: Infinity, ease: "easeInOut" },
                                    }}
                                >
                                    <TemplatePreview shape={c.shape} className="w-full" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="w-full">
                    {/* Linked to the page it counts. A number the reader can go and
                        check is a different kind of claim from one they cannot. */}
                    <StatBand cols={3} items={cards} />

                    {/* Cover letters per day. Resume drafts are edited in place rather
                        than created per session, so counting them would report one
                        point ever and call it activity - see the note beside `ai` in
                        module-activity.action.ts. */}
                    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                                Cover letters written
                            </h2>
                            <Link
                                href="/ai/coverletter"
                                className="shrink-0 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                            >
                                Open the writer
                            </Link>
                        </div>
                        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="font-medium text-neutral-900 tabular-nums dark:text-white">
                                {activity.total}
                            </span>
                            {" in the last 30 days"}
                        </p>
                        <ActivityChart data={activity.series} unit={activity.unit} />
                    </div>
                </div>
            </section>

            <section id="studio">
                <div className="w-full">
                    <div className="max-w-2xl">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">The tools</h2>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                            Three of them. Each one reads the profile the others write to.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {tools.map((tool, index) => (
                            <motion.div
                                key={tool.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                {/* A real link, not an onClick on a div: it opens in a new tab on
                                    middle-click, it can be copied, and it is reachable by keyboard. */}
                                <Link
                                    href={tool.href}
                                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-500 hover:border-neutral-400 dark:hover:border-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/50"
                                >
                                    <div className="flex flex-1 flex-col p-5">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                                                <tool.icon className="h-5 w-5" />
                                            </div>
                                            <Badge className="bg-neutral-50 text-right text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                                                {tool.price}
                                            </Badge>
                                        </div>
                                        <h3 className="mb-1.5 text-base font-semibold text-neutral-900 dark:text-white">
                                            {tool.name}
                                        </h3>
                                        <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                            {tool.description}
                                        </p>
                                        <div className="mt-auto flex items-center justify-end text-sm font-bold text-neutral-900 transition-transform group-hover:translate-x-1 dark:text-white">
                                            Open <ChevronRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section>
                <div className="w-full">
                    <div className="max-w-2xl">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            How a run through it goes
                        </h2>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                            Import once, then point the tools at whatever you are applying for.
                        </p>
                    </div>

                    <ol className="mt-4 grid gap-3 md:grid-cols-3">
                        {steps.map((step, i) => (
                            <motion.li
                                key={step.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: i * 0.1 }}
                                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                            >
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
                                        {i + 1}
                                    </span>
                                    <step.icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                </div>
                                <h3 className="mb-1.5 text-base font-semibold text-neutral-900 dark:text-white">
                                    {step.title}
                                </h3>
                                <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                    {step.body}
                                </p>
                                <Link
                                    href={step.href}
                                    className="mt-auto inline-flex items-center text-sm font-semibold text-neutral-900 hover:underline dark:text-white"
                                >
                                    {step.cta}
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                            </motion.li>
                        ))}
                    </ol>
                </div>
            </section>

            <section>
                <div className="w-full">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                What each thing costs
                            </h2>
                            <p className="mt-0.5 mb-4 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                Credits are held when an operation starts and refunded if it fails. This table
                                is generated from the same prices the charge sites read, so it cannot say one
                                thing while you are billed another.
                            </p>

                            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 font-medium">Operation</th>
                                            <th scope="col" className="px-6 py-3 text-right font-medium">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {priced.map((row) => (
                                            <tr key={row.op}>
                                                <td className="px-6 py-3 text-neutral-700 dark:text-neutral-300">
                                                    {row.label}
                                                </td>
                                                <td className="px-6 py-3 text-right font-semibold tabular-nums text-neutral-900 dark:text-white">
                                                    {priceLabel(row.op) ?? "Free"}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="px-6 py-3 text-neutral-700 dark:text-neutral-300">
                                                Build an interview question set
                                            </td>
                                            <td className="px-6 py-3 text-right font-semibold text-neutral-900 dark:text-white">
                                                1 credit / 2 questions
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                <Zap className="h-4 w-4" />
                                Your balance
                            </div>
                            <div className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                                {stats.credits}
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                                Credits do not expire and there is no subscription. You buy a pack and spend it
                                when you choose to.
                            </p>
                            <Button
                                asChild
                                className="mt-4 w-full cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <Link href="/purchase">
                                    Top up credits
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
