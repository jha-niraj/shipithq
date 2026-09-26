"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Check, Send } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { sendResults, type SendPage } from "@/actions/hiring/send.action"
import { SendView } from "@repo/ui/components/hiring/send-view"
import { renderDiagram } from "@/components/hiring/diagram-viewer"
import type { SentProfile } from "@repo/db/hiring-send-types"

/*
 * The send screen (plan/hiring-rounds HR-17): choices on the left, the company's
 * exact view on the right, updating as the choices change. The server re-checks
 * every choice on Send.
 */

const FIELD: Record<string, string> = { name: "Name", headline: "Headline", education: "Education" }

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900", className)}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
            {children}
        </section>
    )
}

export function SendClient({ jobSlug, page }: { jobSlug: string; page: SendPage }) {
    const router = useRouter()
    const { state, profile, previews } = page
    const back = `/jobs/${jobSlug}/rounds`

    const [picks, setPicks] = useState<Record<string, string>>(() =>
        Object.fromEntries(state.rounds.filter((r) => r.defaultAttemptId).map((r) => [r.id, r.defaultAttemptId!])))
    const [resumeId, setResumeId] = useState<string | null>(() => profile.resumes.find((r) => r.isDefault)?.id ?? profile.resumes[0]?.id ?? null)
    const [github, setGithub] = useState(Boolean(profile.github))
    const [knowMe, setKnowMe] = useState(Boolean(profile.knowMe))
    const [projects, setProjects] = useState<string[]>([])
    const [consent, setConsent] = useState(false)
    const [sending, setSending] = useState(false)

    const resume = profile.resumes.find((r) => r.id === resumeId) ?? null
    const previewProfile: Pick<SentProfile, "name" | "headline" | "education" | "links"> = useMemo(() => ({
        name: profile.name ?? "",
        headline: profile.headline ?? "",
        education: profile.education,
        links: [
            ...(resume ? [{ kind: "resume" as const, label: "Resume", url: resume.url }] : []),
            ...(github && profile.github ? [{ kind: "github" as const, label: "GitHub", url: profile.github }] : []),
            ...(knowMe && profile.knowMe ? [{ kind: "knowme" as const, label: "KnowMe", url: profile.knowMe }] : []),
            ...projects.map((k) => profile.projects.find((p) => p.key === k)).filter((p): p is NonNullable<typeof p> => Boolean(p?.url))
                .map((p) => ({ kind: "project" as const, label: p.title, url: p.url! })),
        ],
    }), [profile, resume, github, knowMe, projects])
    const previewRounds = state.rounds.map((r) => previews[picks[r.id] ?? ""]).filter((x): x is NonNullable<typeof x> => Boolean(x))

    // Not sendable at all: say why, and nothing else.
    const hardBlock = state.blocks.find((b) => b.code !== "ALREADY_SENT")
    if (state.activeSend || hardBlock) {
        return (
            <div className="page-frame space-y-5 px-page py-6">
                <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"><ArrowLeft className="h-4 w-4" /> Rounds for {state.job.title}</Link>
                <div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    {state.activeSend ? <Check className="mx-auto mb-3 h-6 w-6" /> : <AlertCircle className="mx-auto mb-3 h-6 w-6 text-neutral-500" />}
                    <p className="font-medium text-neutral-900 dark:text-white">{state.activeSend ? `Sent to ${state.company.name}` : "Not ready to send"}</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{state.activeSend ? `On ${new Date(state.activeSend.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. You can withdraw it from the rounds page.` : hardBlock!.message}</p>
                    <Button asChild variant="outline" className="mt-5"><Link href={back}>Back to the rounds</Link></Button>
                </div>
            </div>
        )
    }

    const allPicked = state.rounds.every((r) => picks[r.id])
    const canSend = allPicked && profile.missing.length === 0 && consent && !sending

    const toggleProject = (key: string) => setProjects((cur) => cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= page.maxProjects ? cur : [...cur, key])

    const send = async () => {
        if (!canSend || !state.run) return
        setSending(true)
        const r = await sendResults(jobSlug, { runId: state.run.id, picks, links: { resumeId, github, knowMe, projects }, consent })
        if (!r.success) { setSending(false); toast.error(r.error); return }
        toast.success(`Sent to ${state.company.name}`)
        router.push(back)
        router.refresh()
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"><ArrowLeft className="h-4 w-4" /> Rounds for {state.job.title}</Link>
            <PageHeader
                title={`Send your results to ${state.company.name}`}
                subtitle={state.run?.reusedFrom
                    ? `Your rounds for ${state.run.reusedFrom.jobTitle} are the same test as ${state.job.title}, so they can be sent here without a retake.`
                    : "Choose what to send. The right side is exactly what the company will see."}
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                <div className="space-y-4">
                    <Section title="Which attempt per round">
                        <ul className="space-y-3">
                            {state.rounds.map((r) => (
                                <li key={r.id}>
                                    <label className="block text-xs text-neutral-500 dark:text-neutral-400" htmlFor={`pick-${r.id}`}>Round {r.number} · {r.title}{r.gateMode === "HARD" ? ` · pass ${r.passMark}` : ""}</label>
                                    <select
                                        id={`pick-${r.id}`}
                                        value={picks[r.id] ?? ""}
                                        onChange={(e) => setPicks((p) => ({ ...p, [r.id]: e.target.value }))}
                                        className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                                    >
                                        {!picks[r.id] && <option value="">Choose an attempt</option>}
                                        {r.attempts.map((a) => (
                                            <option key={a.id} value={a.id} disabled={!a.passed}>
                                                Attempt {a.number}: {a.score}{!a.passed ? " (below the mark)" : ""} · {new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </option>
                                        ))}
                                    </select>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">The company sees the attempt you choose and how many attempts you made, not the others.</p>
                    </Section>

                    <Section title="Your profile">
                        {profile.missing.length ? (
                            <div className="space-y-2">
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">A send needs your name, headline and education.</p>
                                <ul className="space-y-1">
                                    {profile.missing.map((m) => (
                                        <li key={m.field} className="flex items-center justify-between text-sm">
                                            <span className="text-rose-700 dark:text-rose-400">{FIELD[m.field]} missing</span>
                                            <Link href={m.href} className="font-medium underline underline-offset-2">Add it</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300"><Check className="h-4 w-4" /> Name, headline and education are set.</p>
                        )}
                    </Section>

                    <Section title="Links">
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="resume" className="block text-xs text-neutral-500 dark:text-neutral-400">Resume</label>
                                <select
                                    id="resume"
                                    value={resumeId ?? ""}
                                    onChange={(e) => setResumeId(e.target.value || null)}
                                    className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                                >
                                    <option value="">No resume</option>
                                    {profile.resumes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.isDefault ? " (primary)" : ""}</option>)}
                                </select>
                                {resume && !resume.isPublic && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Sending makes this resume public at its link, so the company can open it.</p>}
                            </div>
                            <LinkToggle label="GitHub" checked={github} onChange={setGithub} disabledNote={profile.github ? null : "Add GitHub to your profile first"} />
                            <LinkToggle label="KnowMe" checked={knowMe} onChange={setKnowMe} disabledNote={profile.knowMe ? null : "Your KnowMe page isn't public yet"} />
                            <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Projects (up to {page.maxProjects})</p>
                                {profile.projects.length === 0 ? (
                                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">No projects yet.</p>
                                ) : (
                                    <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto">
                                        {profile.projects.map((p) => {
                                            const on = projects.includes(p.key)
                                            const full = !on && projects.length >= page.maxProjects
                                            const disabled = !p.isPublic || !p.url || full
                                            return (
                                                <li key={p.key}>
                                                    <label className={cn("flex items-center gap-2 rounded-md px-1 py-1 text-sm", disabled ? "text-neutral-400 dark:text-neutral-500" : "cursor-pointer text-neutral-800 dark:text-neutral-200")}>
                                                        <Checkbox checked={on} disabled={disabled} onCheckedChange={() => toggleProject(p.key)} />
                                                        <span className="min-w-0 flex-1 truncate">{p.title}</span>
                                                        <span className="shrink-0 text-xs">{!p.isPublic ? "Make public to attach" : p.kind === "workspace" ? "ShipItHQ" : "Portfolio"}</span>
                                                    </label>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </Section>

                    <Section title="Consent">
                        <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                            <span>{page.consentText}</span>
                        </label>
                        <Button onClick={() => void send()} disabled={!canSend} className="mt-4 w-full gap-1.5">
                            {sending ? <InlineLoader size="sm" /> : <Send className="h-4 w-4" />} Send to {state.company.name}
                        </Button>
                        {!allPicked && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Choose an attempt for every round.</p>}
                    </Section>
                </div>

                <div className="lg:sticky lg:top-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">What {state.company.name} will see</p>
                    <SendView
                        renderDiagram={renderDiagram}
                        companyName={state.company.name}
                        jobTitle={state.job.title}
                        profile={previewProfile}
                        rounds={previewRounds}
                        reusedFromJob={state.run?.reusedFrom?.jobTitle ?? null}
                    />
                </div>
            </div>
        </div>
    )
}

function LinkToggle({ label, checked, onChange, disabledNote }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabledNote: string | null }) {
    return (
        <label className={cn("flex items-center gap-2 text-sm", disabledNote ? "text-neutral-400 dark:text-neutral-500" : "cursor-pointer text-neutral-800 dark:text-neutral-200")}>
            <Checkbox checked={checked && !disabledNote} disabled={Boolean(disabledNote)} onCheckedChange={(v) => onChange(v === true)} />
            <span className="flex-1">{label}</span>
            {disabledNote && <span className="text-xs">{disabledNote}</span>}
        </label>
    )
}
