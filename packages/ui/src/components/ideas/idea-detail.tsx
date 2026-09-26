import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"
import type { IdeaCardStatus } from "./idea-card"

/**
 * The parts of an idea's page shared by shipithq.com/ideas/<id> and the app's
 * /ideas/<id> (plan/ideas IDEA-5, IDEA-6): the status timeline and the team update.
 * Presentational only, monochrome plus emerald, `dark:` pairs for the app.
 */

const MONO = "font-[family-name:var(--font-geist-mono)]"

const ORDER: IdeaCardStatus[] = ["open", "planned", "building", "shipped"]

function when(d: Date | string | null | undefined) {
    if (!d) return null
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

/**
 * Posted, Planned, Building, Shipped, down the page. Reached stages are filled and
 * dated; the current one is marked; later ones are faint. A stage reached without a
 * recorded date (ideas moved before timestamps existed) shows as reached, undated.
 */
export function IdeaTimeline({ status, labels, dates }: {
    status: IdeaCardStatus
    labels: Record<IdeaCardStatus, string>
    dates: { open: Date | string; planned?: Date | string | null; building?: Date | string | null; shipped?: Date | string | null }
}) {
    const reachedIndex = ORDER.indexOf(status)
    return (
        <ol className="relative space-y-5">
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px bg-neutral-200 dark:bg-neutral-800" />
            {ORDER.map((st, i) => {
                const reached = i <= reachedIndex
                const current = i === reachedIndex
                const date = when(dates[st])
                return (
                    <li key={st} className="relative flex items-start gap-3">
                        <span
                            className={cn(
                                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
                                reached
                                    ? st === "shipped" ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                    : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950",
                            )}
                        >
                            {reached && <Check className="size-3.5" />}
                            {current && st !== "shipped" && (
                                <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-neutral-900 opacity-40 motion-reduce:animate-none dark:border-white" />
                            )}
                        </span>
                        <span className="pt-0.5">
                            <span className={cn("block text-[14px] font-medium", reached ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-600")}>
                                {st === "open" ? "Posted" : labels[st]}
                                {current && <span className={cn(MONO, "ml-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500")}>Now</span>}
                            </span>
                            <span className={cn(MONO, "text-[11px] text-neutral-500 dark:text-neutral-400")}>{reached ? date ?? "Reached" : "Not yet"}</span>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

/** The public note from the team, with an optional link to what shipped. */
export function IdeaTeamUpdate({ text, link }: { text: string | null; link?: ReactNode }) {
    if (!text && !link) return null
    return (
        <div className="rounded-2xl bg-neutral-950 p-6 text-white dark:bg-white dark:text-neutral-950">
            <p className={cn(MONO, "text-[11px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500")}>Update from the team</p>
            {text && <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-neutral-200 dark:text-neutral-800">{text}</p>}
            {link && <div className="mt-4">{link}</div>}
        </div>
    )
}
