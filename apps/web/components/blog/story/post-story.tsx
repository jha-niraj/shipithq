import { cn } from "@repo/ui/lib/utils"
import { MONO, PASTEL_HEX, type Pastel } from "@/components/marketing/primitives"
import type { BlogCategory } from "@/content/blog"
import type { PostStory as Story } from "./types"
import {
    Annotated, Bars, BeforeAfter, Checklist, DecisionPath, Dialogue, Flow, Funnel, Ladder, Layers, Matrix,
    PatternMap, Receipt, Table, Timeline,
} from "./forms"

/**
 * The story at the top of a blog post (plan/web/story ST-14): the post's core idea drawn once, from
 * its own facts, in the form chosen for that post. The frame takes its category's pastel (the TONE
 * exception for apps/web), always with dark ink.
 */

const CATEGORY_TONE: Partial<Record<BlogCategory, Pastel>> = {
    "interview-prep": "blush", dsa: "mint", resume: "butter", career: "sage", portfolio: "sand",
    "open-source": "coral", "ai-tools": "mint", hiring: "sand", placements: "sage",
}

function Drawing({ s }: { s: Story }) {
    switch (s.form) {
        case "flow": return <Flow d={s.data} />
        case "bars": return <Bars d={s.data} />
        case "decisionPath": return <DecisionPath d={s.data} />
        case "annotated": return <Annotated d={s.data} />
        case "funnel": return <Funnel d={s.data} />
        case "timeline": return <Timeline d={s.data} />
        case "matrix": return <Matrix d={s.data} />
        case "sum": return <Receipt d={s.data} />
        case "beforeAfter": return <BeforeAfter d={s.data} />
        case "checklist": return <Checklist d={s.data} />
        case "dialogue": return <Dialogue d={s.data} />
        case "patternMap": return <PatternMap d={s.data} />
        case "table": return <Table d={s.data} />
        case "ladder": return <Ladder d={s.data} />
        case "layers": return <Layers d={s.data} />
    }
}

export function PostStory({ story, category }: { story: Story; category: BlogCategory }) {
    const tone = CATEGORY_TONE[category] ?? "sand"
    return (
        <figure aria-label={story.title} className="overflow-hidden rounded-2xl text-neutral-900" style={{ background: PASTEL_HEX[tone] }}>
            <div className="p-5 sm:p-7">
                <p className={cn(MONO, "text-[10.5px] uppercase tracking-[0.16em] text-neutral-700")}>This post in one picture</p>
                <p className="mt-2 max-w-3xl text-balance font-display text-xl font-semibold leading-snug tracking-tight md:text-2xl">{story.title}</p>
                <div className="mt-5"><Drawing s={story} /></div>
            </div>
            <figcaption className="border-t border-neutral-900/10 bg-white/55 px-5 py-3.5 text-[14.5px] font-medium leading-6 sm:px-7">{story.takeaway}</figcaption>
        </figure>
    )
}
