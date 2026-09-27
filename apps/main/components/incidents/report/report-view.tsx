import Link from "next/link"
import { ArrowLeft, ArrowRight, MessageSquareQuote, Mic } from "lucide-react"
import { cn } from "@repo/ui/lib/utils"
import type { IncidentBand } from "@repo/db"
import type { ReportPageData } from "@/lib/incidents/report"
import { ReportActions, AdoptForReport } from "./report-actions"

/**
 * One run's review on one page (plan/incidents INC-38): four rubric bands with the
 * evidence behind each, the reader's best moments in their own words, every question
 * they asked with a verdict, their checks, and what to learn next. The owner's page and
 * the public share page (INC-39) render this same view; only the owner gets actions.
 */

const SKILL: Record<string, { title: string; what: string }> = {
    diagnosis: { title: "Diagnosis", what: "Finding the real cause" },
    reasoning: { title: "Reasoning", what: "Weighing evidence under uncertainty" },
    questions: { title: "Questions asked", what: "Asking what gets to the cause" },
    explaining: { title: "Explaining the fix", what: "The fix and its trade-offs, in your words" },
}
const BAND: Record<IncidentBand, string> = { STRONG: "Strong", SOLID: "Solid", DEVELOPING: "Developing", NOT_SHOWN: "Not shown yet" }
const MARK: Record<string, string> = { sharp: "Sharp", clarifying: "Clarifying", off_track: "Off track" }

function BandChip({ band }: { band: IncidentBand }) {
    return (
        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 font-mono text-[11px]",
            band === "STRONG" && "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
            band === "SOLID" && "border border-neutral-900 text-neutral-900 dark:border-white dark:text-white",
            band === "DEVELOPING" && "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
            band === "NOT_SHOWN" && "border border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400")}>
            {BAND[band]}
        </span>
    )
}

export function ReportView({ data, owner, chapterSteps }: { data: ReportPageData; owner: boolean; chapterSteps: Record<string, string> }) {
    const r = data.report
    const date = new Date(data.reportedAt ?? data.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    const totals = r.checks.reduce((a, c) => ({ right: a.right + c.firstTry, all: a.all + c.total }), { right: 0, all: 0 })

    return (
        <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 print:bg-white print:text-black">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/85 px-page py-3 backdrop-blur print:hidden dark:border-neutral-800 dark:bg-neutral-950/85">
                <Link href={`/incidents/${data.slug}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    <ArrowLeft className="size-4" aria-hidden /> {owner ? "Back to the case" : "Open this case"}
                </Link>
                <span className="flex-1" />
                {owner && <ReportActions runId={data.runId} slug={data.slug} initialToken={data.shareToken} />}
            </div>

            <article className="mx-auto w-full max-w-3xl px-page py-10">
                <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">Incident review</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.caseTitle}</h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {data.reader} · {date}{data.minutes ? ` · ${data.minutes} min` : ""}{totals.all ? ` · ${totals.right} of ${totals.all} checks right first try` : ""}
                </p>
                {r.summary && <p className="mt-6 text-[17px] leading-8 text-neutral-800 dark:text-neutral-200">{r.summary}</p>}

                <section className="mt-10">
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">How you did</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {r.bands.map((b) => (
                            <div key={b.skill} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 print:break-inside-avoid">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[15px] font-semibold">{SKILL[b.skill]?.title ?? b.skill}</p>
                                        <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{SKILL[b.skill]?.what}</p>
                                    </div>
                                    <BandChip band={b.band} />
                                </div>
                                <p className="mt-3 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{b.evidence}</p>
                                {b.previous && b.previous !== b.band && (
                                    <p className="mt-2 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">Last run: {BAND[b.previous]} {"->"} {BAND[b.band]}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {r.highlights.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Best moments</h2>
                        <div className="mt-4 space-y-4">
                            {r.highlights.map((h) => (
                                <figure key={h.quote} className="border-l-2 border-neutral-900 pl-4 dark:border-white print:break-inside-avoid">
                                    <blockquote className="text-[16px] leading-7 text-neutral-900 dark:text-white">&ldquo;{h.quote}&rdquo;</blockquote>
                                    <figcaption className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">
                                        {h.source.sessionId ? <Mic className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                                        <span>{h.source.sessionId ? "In a talk" : "A question to the lead"}: {h.why}</span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mt-10">
                    <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Questions {owner ? "you" : "they"} asked</h2>
                    {r.questions.length === 0 ? (
                        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">None this run. Asking the lead is where the sharpest thinking usually shows.</p>
                    ) : (
                        <ul className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                            {r.questions.map((q) => (
                                <li key={q.eventId} className={cn("px-4 py-3 print:break-inside-avoid", q.eventId === r.bestQuestionEventId && "bg-neutral-50 dark:bg-neutral-900/60")}>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-[14.5px] leading-6 text-neutral-900 dark:text-white">&ldquo;{q.question}&rdquo;</p>
                                        <span className={cn("shrink-0 font-mono text-[11px]", q.mark === "sharp" ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400")}>
                                            {q.eventId === r.bestQuestionEventId ? "Best" : MARK[q.mark]}
                                        </span>
                                    </div>
                                    {q.why && <p className="mt-1 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">{q.why}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {r.checks.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Checks and the final quiz</h2>
                        <div className="mt-4 space-y-3">
                            {r.checks.map((c) => (
                                <div key={c.chapter} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 print:break-inside-avoid">
                                    <div className="flex items-center gap-3">
                                        {owner && chapterSteps[c.chapter]
                                            ? <Link href={`/incidents/${data.slug}?step=${chapterSteps[c.chapter]}`} className="min-w-0 flex-1 truncate text-[14.5px] font-medium hover:underline">{c.chapter}</Link>
                                            : <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{c.chapter}</p>}
                                        <span className="w-24 shrink-0"><span className="block h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><span className="block h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${c.total ? (c.firstTry / c.total) * 100 : 0}%` }} /></span></span>
                                        <span className="w-12 shrink-0 text-right font-mono text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{c.firstTry}/{c.total}</span>
                                    </div>
                                    {c.missed.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {c.missed.map((m) => <li key={m} className="text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">Missed: {m}</li>)}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {r.nextSteps.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">What to learn next</h2>
                        <ol className="mt-4 space-y-3">
                            {r.nextSteps.map((n, i) => {
                                const href = n.pathTopic ? data.topicLinks[n.pathTopic] : undefined
                                return (
                                    <li key={n.title} className="flex gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 print:break-inside-avoid">
                                        <span className="font-mono text-[12px] text-neutral-500">{i + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[14.5px] font-medium">{n.title}</p>
                                            <p className="mt-1 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">{n.why}</p>
                                            {owner && href && (
                                                <Link href={href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium hover:underline">
                                                    Open &ldquo;{n.pathTopic}&rdquo; in your path <ArrowRight className="size-3.5" aria-hidden />
                                                </Link>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                        {owner && !data.adoptedPath && <AdoptForReport slug={data.slug} />}
                    </section>
                )}

                <p className="mt-12 border-t border-neutral-200 pt-4 font-mono text-[11px] text-neutral-400 dark:border-neutral-800">
                    Written by {r.model} from this run&apos;s answers, questions and talks. Quotes are checked word for word against what was said.
                </p>
            </article>
        </div>
    )
}
