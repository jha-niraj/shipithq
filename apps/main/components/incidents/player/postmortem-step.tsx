"use client"

import { useEffect, useRef, useState } from "react"
import { Check, FileText } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { cn } from "@repo/ui/lib/utils"
import { POSTMORTEM_MIN_CHARS, POSTMORTEM_SECTIONS, postmortemComplete, type PostmortemDraft, type PostmortemSection } from "@/content/incidents/postmortem"
import type { SourceRef } from "@/content/incidents/types"
import { useProgress } from "../case-progress"

/*
 * Write the postmortem (plan/incidents INC-72): the five sections of a blameless
 * postmortem, saved as you write (debounced), then the case's real postmortem beside
 * yours with a checklist of the points a good one covers, to tick the ones yours did.
 * 30 XP the first time every section has at least a sentence (the server decides).
 */

type Real = { summary: string; sections: { title: string; items: string[] }[]; sources: SourceRef[] }
type Points = Record<PostmortemSection, { id: string; label: string }[]>

const SAVE_AFTER_MS = 1200

export function PostmortemStep({ real, points, xp }: { real: Real; points: Points; xp: number }) {
    const { progress, dispatch } = useProgress()
    const [draft, setDraft] = useState<PostmortemDraft>(progress.postmortem ?? { sections: {}, covered: [] })
    const [compare, setCompare] = useState(false)
    const [saved, setSaved] = useState(true)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latest = useRef(draft)
    latest.current = draft

    const save = (next: PostmortemDraft, now = false) => {
        setDraft(next)
        setSaved(false)
        if (timer.current) clearTimeout(timer.current)
        const go = () => { dispatch({ type: "postmortem", draft: latest.current }); setSaved(true); timer.current = null }
        if (now) go()
        else timer.current = setTimeout(go, SAVE_AFTER_MS)
    }
    // Leaving the step with unsaved text: save it.
    useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); dispatch({ type: "postmortem", draft: latest.current }) } }, [dispatch])

    const complete = postmortemComplete(draft)
    const all = POSTMORTEM_SECTIONS.flatMap((s) => points[s.id] ?? [])
    const covered = draft.covered.filter((id) => all.some((p) => p.id === id)).length

    return (
        <div className="space-y-6">
            <p className="text-[17px] leading-8 text-neutral-700 dark:text-neutral-300">
                Write the postmortem as the team would: blameless, about the system, not a person. A sentence or two per section is enough. {xp > 0 && <>Writing all five earns {xp} XP, once.</>}
            </p>

            {!compare ? (
                <div className="space-y-5">
                    {POSTMORTEM_SECTIONS.map((s) => {
                        const text = draft.sections[s.id] ?? ""
                        const short = text.trim().length > 0 && text.trim().length < POSTMORTEM_MIN_CHARS
                        return (
                            <div key={s.id} className="space-y-1.5">
                                <label htmlFor={`pm-${s.id}`} className="flex items-baseline justify-between gap-3">
                                    <span className="text-[15px] font-semibold text-neutral-900 dark:text-white">{s.label}</span>
                                    {text.trim().length >= POSTMORTEM_MIN_CHARS && <Check className="size-4 text-neutral-600 dark:text-neutral-400" aria-label="Written" />}
                                </label>
                                <p className="text-[13px] text-neutral-600 dark:text-neutral-400">{s.hint}</p>
                                <Textarea id={`pm-${s.id}`} value={text} rows={3} maxLength={2000}
                                    onChange={(e) => save({ ...draft, sections: { ...draft.sections, [s.id]: e.target.value } })}
                                    onBlur={() => timer.current && save(latest.current, true)} />
                                {short && <p className="text-[12px] text-neutral-500">A sentence at least.</p>}
                            </div>
                        )
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{saved ? "Saved" : "Saving..."}</p>
                        <Button type="button" onClick={() => { save(latest.current, true); setCompare(true) }} disabled={!complete}>
                            <FileText /> Compare with the real one
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[14px] text-neutral-700 dark:text-neutral-300">Yours covered <span className="font-semibold text-neutral-900 dark:text-white">{covered} of {all.length}</span> points. Tick the ones it did.</p>
                        <Button type="button" variant="outline" onClick={() => setCompare(false)}>Edit mine</Button>
                    </div>
                    <div className="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">The real postmortem</p>
                        <p className="mt-1 text-[15px] leading-7 text-neutral-900 dark:text-white">{real.summary}</p>
                    </div>
                    {POSTMORTEM_SECTIONS.map((s) => (
                        <section key={s.id} aria-label={s.label} className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/60">
                                <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Yours: {s.label}</p>
                                <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-neutral-800 dark:text-neutral-200">{draft.sections[s.id]}</p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                                <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">A good one covers</p>
                                <ul className="mt-2 space-y-2">
                                    {(points[s.id] ?? []).map((p) => {
                                        const on = draft.covered.includes(p.id)
                                        return (
                                            <li key={p.id}>
                                                <label className={cn("flex cursor-pointer items-start gap-2.5 text-[14px] leading-6", on ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300")}>
                                                    <Checkbox className="mt-1" checked={on} onCheckedChange={() => save({ ...draft, covered: on ? draft.covered.filter((x) => x !== p.id) : [...draft.covered, p.id] }, true)} />
                                                    {p.label}
                                                </label>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        </section>
                    ))}
                    <details className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                        <summary className="cursor-pointer text-[14px] font-medium text-neutral-900 dark:text-white">The real postmortem, in full</summary>
                        <div className="mt-3 space-y-4">
                            {real.sections.map((sec) => (
                                <div key={sec.title}>
                                    <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">{sec.title}</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] leading-6 text-neutral-700 dark:text-neutral-300">{sec.items.map((it) => <li key={it}>{it}</li>)}</ul>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    )
}
