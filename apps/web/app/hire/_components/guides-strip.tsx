import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import { BLOG_POSTS } from "@/content/blog"
import { HIRING_GUIDE_ART, HIRING_GUIDE_SLUGS } from "@/content/hiring-guides"
import { CardArt, CardArtStyles, type ArtKind } from "@/components/marketing/card-art"
import { MONO, Section, TONE, type Tone } from "@/components/marketing/primitives"

/** Four hiring guides on /hire (REV-84), the companies' counterpart of the compare strip. */
const TONES: Tone[] = ["coral", "sage", "butter", "blush"]

export function GuidesStrip() {
    const posts = HIRING_GUIDE_SLUGS.slice(0, 4).map((slug) => ({ slug, post: BLOG_POSTS[slug] })).filter((x) => !!x.post)
    return (
        <Section
            eyebrow="Hiring guides"
            title="How to interview engineers well"
            sub="Short guides grounded in selection research, for whoever designs your loop."
            action={<Link href="/hire/guides" className="inline-flex items-center gap-1.5 border-b border-neutral-300 pb-0.5 text-sm font-medium text-neutral-900 hover:border-neutral-900">All hiring guides <ArrowRight className="size-3.5" /></Link>}
        >
            <CardArtStyles />
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {posts.map(({ slug, post }, i) => {
                    const t = TONE[TONES[i % TONES.length]!]
                    return (
                        <li key={slug} className="sh-reveal" style={{ ["--sh-reveal-delay" as string]: `${i * 0.07}s` }}>
                            <Link href={`/blogs/${slug}`} className={cn("group flex h-full flex-col rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1", t.surface, t.ink)}>
                                <span className="mb-5 flex h-32 items-center justify-center rounded-xl bg-white/45">
                                    <CardArt kind={(HIRING_GUIDE_ART[slug] ?? "guides") as ArtKind} className="max-h-28 transition-transform duration-500 group-hover:scale-[1.05]" />
                                </span>
                                <span className={cn(MONO, "text-[11px] uppercase tracking-[0.16em]", t.muted)}>{post!.readingTime} min read</span>
                                <span className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight">{post!.title}</span>
                                <span className={cn("mt-3 flex-1 text-[14px] leading-5", t.muted)}>{post!.description}</span>
                                <span className="mt-6 flex items-center justify-between text-sm font-medium">
                                    Read the guide
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}
