"use client"

import { useState, type ReactNode } from "react"
import { ExternalLink } from "lucide-react"
import type { SentProfile, SnapshotRound, TranscriptTurn } from "@repo/db/hiring-send-types"
import { cn } from "../../lib/utils"
import { TranscriptPane } from "./transcript-pane"

/*
 * A send as the company sees it (plan/hiring-rounds HR-17, HR-18): the
 * student's profile and links, then each round's chosen attempt with its score,
 * attempt number, integrity signals and the detail behind the score. The
 * student's send page renders it live from their choices; the hiring app
 * renders the stored snapshot. One component, so the two can never differ.
 *
 * The design diagram needs Excalidraw, which each app owns: pass
 * `renderDiagram` to show it.
 */

export type RenderDiagram = (elements: unknown[]) => ReactNode

const TYPE_LABEL: Record<string, string> = {
    APTITUDE: "Aptitude",
    DSA: "Coding (DSA)",
    SYSTEM_DESIGN: "System design",
    VOICE_BEHAVIOURAL: "Behavioural interview",
    VOICE_CULTURE: "Culture conversation",
}
const SECTION: Record<string, string> = { QUANT: "Quant", LOGICAL: "Logical", VERBAL: "Verbal" }
const AI_ASSESSED = new Set(["SYSTEM_DESIGN", "VOICE_BEHAVIOURAL", "VOICE_CULTURE"])

const year = (iso: string | null) => (iso ? new Date(iso).getFullYear() : "now")

type Rubric = { criteria?: { criterion: string; weight: number; score: number; evidence: string }[]; summary?: string } | null

export function SendView({ companyName, jobTitle, profile, rounds, reusedFromJob, renderDiagram, className }: {
    companyName: string
    jobTitle: string
    profile: Pick<SentProfile, "name" | "headline" | "education" | "links"> | null
    rounds: SnapshotRound[]
    reusedFromJob?: string | null
    renderDiagram?: RenderDiagram
    className?: string
}) {
    return (
        <div className={cn("space-y-4", className)}>
            <ProfileCard companyName={companyName} jobTitle={jobTitle} profile={profile} reusedFromJob={reusedFromJob} />
            {rounds.map((r) => <RoundCard key={r.roundId} round={r} renderDiagram={renderDiagram} />)}
        </div>
    )
}

/** The student's profile and links as sent. `email` is shown only once the company invited them. */
export function ProfileCard({ companyName, jobTitle, profile, reusedFromJob, email }: {
    companyName: string
    jobTitle: string
    profile: Pick<SentProfile, "name" | "headline" | "education" | "links"> | null
    reusedFromJob?: string | null
    email?: string | null
}) {
    return (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">For {companyName} · {jobTitle}</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{profile?.name ?? "Your name"}</h2>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{profile?.headline ?? "Your headline"}</p>
                {profile?.education?.length ? (
                    <ul className="mt-2 space-y-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                        {profile.education.map((e, i) => (
                            <li key={i}>{e.degree ? `${e.degree}, ` : ""}{e.institution} · {year(e.from)} to {year(e.to)}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">No education yet.</p>
                )}
                {profile?.links?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {profile.links.map((l) => (
                            <a key={`${l.kind}:${l.url}`} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200">
                                {l.label} <ExternalLink className="h-3 w-3" />
                            </a>
                        ))}
                    </div>
                ) : null}
                {email
                    ? <p className="mt-3 text-sm text-neutral-800 dark:text-neutral-200"><a href={`mailto:${email}`} className="underline underline-offset-2">{email}</a></p>
                    : <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Email stays private until {companyName} invites.</p>}
                {reusedFromJob && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Rounds taken for {reusedFromJob}, the same test as this role.</p>}
            </section>
    )
}

/** One round's chosen attempt: score, attempt number, the detail behind the score, integrity. */
export function RoundCard({ round: r, renderDiagram }: { round: SnapshotRound; renderDiagram?: RenderDiagram }) {
    const a = r.attempt
    const i = a.integrity
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Round {r.number} · {TYPE_LABEL[r.type] ?? r.type}{AI_ASSESSED.has(r.type) ? " · AI-assessed" : ""}</p>
                    <h3 className="font-medium text-neutral-900 dark:text-white">{r.title}</h3>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        Attempt {a.number} of {a.of} · {r.gateMode === "HARD" ? `pass mark ${r.passMark}` : "advisory"}
                    </p>
                </div>
                <p className={cn("shrink-0 text-3xl font-semibold tabular-nums", a.passed && r.gateMode === "HARD" ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white")}>{a.score}</p>
            </div>
            <Detail type={r.type} detail={a.detail} renderDiagram={renderDiagram} />
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                Integrity: {i.pastes} {i.pastes === 1 ? "paste" : "pastes"} · left the tab {i.tabLeaves} {i.tabLeaves === 1 ? "time" : "times"}
                {i.secondsTotal > 0 ? ` · ${Math.round(i.secondsTotal / 60)} min on questions` : ""}
                {i.aiBlocked > 0 ? ` · ${i.aiBlocked} blocked AI ${i.aiBlocked === 1 ? "request" : "requests"}` : ""}
            </p>
        </section>
    )
}

function Detail({ type, detail, renderDiagram }: { type: string; detail: Record<string, unknown>; renderDiagram?: RenderDiagram }) {
    if (type === "APTITUDE") {
        const d = detail as { right?: number; total?: number; bySection?: Record<string, { right: number; total: number }> }
        return (
            <div className="mt-3 space-y-1.5">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{d.right ?? 0} of {d.total ?? 0} right</p>
                {Object.entries(d.bySection ?? {}).map(([s, v]) => (
                    <div key={s} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="w-16">{SECTION[s] ?? s}</span>
                        <span className="h-1.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800"><span className="block h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${v.total ? (v.right / v.total) * 100 : 0}%` }} /></span>
                        <span className="w-10 text-right tabular-nums">{v.right}/{v.total}</span>
                    </div>
                ))}
            </div>
        )
    }
    if (type === "DSA") {
        const problems = (detail.problems as { problemId: string; title: string; language: string; status: string; passed: number; total: number; code: string }[] | undefined) ?? []
        return (
            <ul className="mt-3 space-y-2">
                {problems.map((p) => (
                    <li key={p.problemId} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                        <p className="flex justify-between gap-2 text-sm"><span className="font-medium text-neutral-900 dark:text-white">{p.title}</span><span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">{p.passed}/{p.total} tests</span></p>
                        {p.status !== "ok" && <p className="text-xs text-neutral-500">{p.status === "empty" ? "Not attempted" : "Didn't compile"}</p>}
                        {p.code && (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">Code ({p.language})</summary>
                                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-neutral-50 p-2 font-mono text-xs text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">{p.code}</pre>
                            </details>
                        )}
                    </li>
                ))}
            </ul>
        )
    }
    const rubric = detail.rubric as Rubric
    return (
        <div className="mt-3 space-y-2">
            {rubric?.summary && <p className="text-sm text-neutral-700 dark:text-neutral-300">{rubric.summary}</p>}
            {rubric?.criteria?.length ? (
                <ul className="space-y-1.5">
                    {rubric.criteria.map((c) => (
                        <li key={c.criterion} className="text-xs">
                            <p className="flex justify-between gap-2 text-neutral-800 dark:text-neutral-200"><span>{c.criterion} <span className="text-neutral-500">· {c.weight}%</span></span><span className="font-mono tabular-nums">{c.score}/10</span></p>
                            {c.evidence && <p className="text-neutral-500 dark:text-neutral-400">{c.evidence}</p>}
                        </li>
                    ))}
                </ul>
            ) : null}
            {type === "SYSTEM_DESIGN" && renderDiagram && Array.isArray(detail.diagram) && detail.diagram.length > 0 && <Diagram elements={detail.diagram} render={renderDiagram} />}
            {type === "SYSTEM_DESIGN" && typeof detail.answer === "string" && detail.answer && (
                <details>
                    <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">Written answer</summary>
                    <p className="mt-2 whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">{detail.answer}</p>
                </details>
            )}
            {Array.isArray(detail.transcript) && detail.transcript.length > 0 && (
                <details>
                    <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">Transcript{detail.mode === "TYPED" ? " (typed)" : ""}</summary>
                    <TranscriptPane turns={detail.transcript as TranscriptTurn[]} className="mt-2 max-h-80 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950" />
                </details>
            )}
        </div>
    )
}

/** The design diagram, read-only, mounted only when opened (Excalidraw is heavy). */
function Diagram({ elements, render }: { elements: unknown[]; render: RenderDiagram }) {
    const [open, setOpen] = useState(false)
    return (
        <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">Diagram</summary>
            {open && <div className="relative mt-2 h-80 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"><div className="absolute inset-0">{render(elements)}</div></div>}
        </details>
    )
}
