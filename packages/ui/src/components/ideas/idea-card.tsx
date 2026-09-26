import type { ReactNode } from "react"
import { cn } from "../../lib/utils"

/**
 * One idea on an Ideas board (plan/web/revamp REV-42, plan/ideas IDEA-5, IDEA-6), shared
 * by shipithq.com/ideas and the app's /ideas so the two look identical.
 *
 * Vote box on the left; then the author (avatar and first name, "ShipItHQ team", or
 * "Community"), the age and the status; the title, which links to the idea's page;
 * two lines of description; the category and a marker when the team has posted an
 * update.
 *
 * Colour stays monochrome plus emerald for Shipped, because the app itself is
 * monochrome (CLAUDE.md); the web's pastels do not belong in a shared component.
 *
 * `vote` is the box itself, the one part that differs: a link into the app on the web,
 * a toggle in the app. `href` is the idea's page on the host that renders the card.
 * Presentational only (no data, no auth), with `dark:` pairs for the app.
 */

export type IdeaCardStatus = "open" | "planned" | "building" | "shipped"

export type IdeaCardData = {
    id: string
    title: string
    description: string
    categoryLabel: string
    status: IdeaCardStatus
    statusLabel: string
    author: { name: string; image: string | null; kind: "team" | "person" | "anonymous" }
    hasUpdate?: boolean
    createdAt: Date | string
}

const MONO = "font-[family-name:var(--font-geist-mono)]"

export function ideaAge(date: Date | string, now = Date.now()): string {
    const ms = now - new Date(date).getTime()
    const d = Math.floor(ms / 86_400_000)
    if (d < 1) return "today"
    if (d < 30) return `${d}d ago`
    const mo = Math.floor(d / 30)
    if (mo < 12) return `${mo}mo ago`
    return `${Math.floor(mo / 12)}y ago`
}

const STATUS_STYLE: Record<IdeaCardStatus, string> = {
    open: "border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
    planned: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
    building: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
    shipped: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export function IdeaStatusPill({ status, label }: { status: IdeaCardStatus; label: string }) {
    return (
        <span className={cn(MONO, "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", STATUS_STYLE[status])}>
            {status === "building" && (
                <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                </span>
            )}
            {label}
        </span>
    )
}

export function IdeaAvatar({ author, size = 24 }: { author: IdeaCardData["author"]; size?: number }) {
    const initials = author.kind === "team" ? "S" : author.kind === "anonymous" ? "?" : author.name.slice(0, 1).toUpperCase()
    return author.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from several hosts
        <img src={author.image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
        <span
            aria-hidden
            className={cn("flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", author.kind === "team" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")}
            style={{ width: size, height: size }}
        >
            {initials}
        </span>
    )
}

export function IdeaCard({ idea, vote, href, renderLink }: {
    idea: IdeaCardData
    vote: ReactNode
    href: string
    /** How to render the title link (Next's Link in each app); a plain anchor by default. */
    renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode
}) {
    const linkClass = "after:absolute after:inset-0 focus-visible:outline-none"
    const title = renderLink
        ? renderLink({ href, className: linkClass, children: idea.title })
        : <a href={href} className={linkClass}>{idea.title}</a>
    return (
        <article
            id={idea.id}
            className="group relative flex scroll-mt-24 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.25)] focus-within:border-neutral-400 sm:p-5 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
        >
            {/* The vote box sits above the card-wide link, so it stays clickable. */}
            <div className="relative z-10 shrink-0">{vote}</div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <IdeaAvatar author={idea.author} size={22} />
                    <span className={cn("text-[13px] font-medium", idea.author.kind === "team" ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300")}>{idea.author.name}</span>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden>·</span>
                    <span className={cn(MONO, "text-[11px] text-neutral-500 dark:text-neutral-400")}>{ideaAge(idea.createdAt)}</span>
                    <span className="ml-auto"><IdeaStatusPill status={idea.status} label={idea.statusLabel} /></span>
                </div>
                <h3 className="mt-2.5 text-[16px] font-semibold leading-snug text-neutral-900 group-hover:underline group-hover:underline-offset-4 dark:text-white">{title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{idea.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={cn(MONO, "rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")}>{idea.categoryLabel}</span>
                    {idea.hasUpdate && (
                        <span className={cn(MONO, "rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white dark:bg-white dark:text-neutral-900")}>Team update</span>
                    )}
                </div>
            </div>
        </article>
    )
}

/** The vote box's look, for both the link (web) and the button (app). */
export function voteBoxClass(active = false) {
    return cn(
        "flex w-12 flex-col items-center justify-center gap-0.5 rounded-xl border py-2.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
        active
            ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
    )
}
