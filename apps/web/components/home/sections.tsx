import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { BLOG_CATEGORIES, publishedPosts } from "@/content/blog"
import { MONO, Section, TONE, type Tone } from "@/components/marketing/primitives"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"

/**
 * Sections only the student landing has (plan/web/revamp REV-107, REV-109, REV-110),
 * each with its own layout, unlike the /hire sections. Claims restate content/modules.ts.
 * "Built for your stage" is a client component in stage-tabs.tsx.
 */

// ── What you walk away with (bento) ───────────────────────────────────────────

type Tile = { title: string; body: string; art: ArtKind; tone: Tone; span: string; href: string }

const TILES: Tile[] = [
    { title: "A finished project", body: "Four sprints, twenty tasks, and a mock interview about your own decisions.", art: "projects", tone: "ink", span: "md:col-span-2 md:row-span-2", href: "/features/projects" },
    { title: "Accepted solutions", body: "Problems that passed hidden tests in a real container.", art: "practice", tone: "mint", span: "", href: "/features/practice" },
    { title: "A tailored resume", body: "An ATS score, the keywords you were missing, and a public link.", art: "ai", tone: "butter", span: "", href: "/features/ai" },
    { title: "Mock scores", body: "Communication, technical skills and problem solving, out of 100.", art: "mock", tone: "blush", span: "", href: "/features/mock" },
    { title: "Jobs that fit", body: "A match score for each role, and the skills to close the gap.", art: "jobs", tone: "sage", span: "", href: "/features/jobs" },
]

export function WalkAway() {
    return (
        <Section eyebrow="What you walk away with" title="Proof, not certificates" sub="Everything here is something you can show an interviewer, not a badge.">
            <CardArtStyles />
            <ul className="grid auto-rows-[minmax(15rem,auto)] gap-4 md:grid-cols-4">
                {TILES.map((t, i) => {
                    const tone = TONE[t.tone]
                    const dark = t.tone === "ink"
                    const big = i === 0
                    return (
                        <li key={t.title} className={cn("sh-reveal", t.span)} style={{ ["--sh-reveal-delay" as string]: `${i * 0.06}s` }}>
                            <Link href={t.href} className={cn("group flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1", tone.surface, tone.ink)}>
                                <div className={cn("flex items-center justify-center", big ? "flex-1 py-6" : "h-28")}>
                                    <CardArt kind={t.art} dark={dark} className={big ? "max-h-72" : "max-h-28"} />
                                </div>
                                <div className="mt-4 flex items-end justify-between gap-3">
                                    <span>
                                        <span className={cn("block font-semibold tracking-tight", big ? "font-display text-3xl" : "text-lg")}>{t.title}</span>
                                        <span className={cn("mt-1 block leading-6", big ? "text-[16px]" : "text-[14px]", dark ? "text-neutral-300" : "text-neutral-800")}>{t.body}</span>
                                    </span>
                                    <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
                                </div>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}

// ── Practice tracks ───────────────────────────────────────────────────────────

const TRACKS = [
    { name: "DSA", file: "dsa.py", facts: ["76 problems", "16 categories", "A guided path"], body: "Arrays to graphs, judged on hidden tests.", art: "practice" as ArtKind },
    { name: "System design", file: "design.canvas", facts: ["A drawing canvas", "Your own prompts"], body: "Draw the architecture instead of only reading about one.", art: "hire-pipelines" as ArtKind },
    { name: "Frontend", file: "App.tsx", facts: ["Problems you add", "Run in the editor"], body: "Practise the kind of UI problems interviews ask for.", art: "hire-jobs" as ArtKind },
    { name: "Backend", file: "api.ts", facts: ["An API tester", "Problems you add"], body: "Build endpoints and hit them from the tester.", art: "hire-questions" as ArtKind },
]

export function PracticeTracks() {
    return (
        <Section
            eyebrow="Practice tracks"
            title="Four tracks, one real container"
            sub="JavaScript, TypeScript, Python, Java and C++, run on Linux, not guessed at in a browser."
            action={<Link href="/features/practice" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">How practice works <ArrowRight className="size-3.5" /></Link>}
        >
            <CardArtStyles />
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {TRACKS.map((tr, i) => (
                    <li key={tr.name} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-white">
                            <div className="flex items-center gap-1.5 border-b border-neutral-800 px-4 py-2.5">
                                <span className="size-2 rounded-full bg-neutral-700" /><span className="size-2 rounded-full bg-neutral-700" /><span className="size-2 rounded-full bg-neutral-700" />
                                <span className={cn(MONO, "ml-2 text-[11px] text-neutral-400")}>{tr.file}</span>
                            </div>
                            <div className="flex h-36 items-center justify-center px-6"><CardArt kind={tr.art} dark className="max-h-32" /></div>
                            <div className="flex flex-1 flex-col p-5">
                                <h3 className={cn(MONO, "text-2xl font-medium tracking-[-0.03em]")}>{tr.name}</h3>
                                <p className="mt-2 text-[14px] leading-6 text-neutral-300">{tr.body}</p>
                                <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                                    {tr.facts.map((f) => <span key={f} className={cn(MONO, "rounded-md bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-neutral-200")}>{f}</span>)}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </Section>
    )
}

// ── From the guides ───────────────────────────────────────────────────────────

export function FromTheGuides() {
    // The newest student guides (hiring guides live on /hire/guides).
    const posts = [...publishedPosts]
        .filter((p) => p.category !== "hiring")
        .sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1))
        .slice(0, 3)
    if (posts.length === 0) return null
    return (
        <Section
            eyebrow="From the guides"
            title="Read before your next interview"
            action={<Link href="/blogs" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">All guides <ArrowRight className="size-3.5" /></Link>}
        >
            <ul className="grid gap-6 md:grid-cols-3">
                {posts.map((p, i) => (
                    <li key={p.slug} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                        <Link href={`/blogs/${p.slug}`} className="group block">
                            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element -- a generated cover route, not a static asset */}
                                <img src={`/blogs/${p.slug}/cover`} alt="" width={1200} height={630} loading="lazy" className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                            </div>
                            <p className={cn(MONO, "mt-4 text-[11px] uppercase tracking-[0.14em] text-neutral-600")}>
                                {BLOG_CATEGORIES[p.category]} · {p.readingTime} min
                            </p>
                            <h3 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-neutral-900 group-hover:underline group-hover:underline-offset-4">{p.title}</h3>
                        </Link>
                    </li>
                ))}
            </ul>
        </Section>
    )
}

