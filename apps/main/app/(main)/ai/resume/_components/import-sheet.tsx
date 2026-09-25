"use client"

/**
 * AI Import as a sheet on the hub (plan/resume RES-23). Replaces the page at
 * `/ai/resume/import`, which now redirects to `/ai/resume?import=1`.
 *
 * Niraj, 2026-09-25: the page's only job was to start an import, so it belongs
 * beside the list it adds to. The form, the prefill from the profile and the
 * four-stage progress are the page's, unchanged in behaviour.
 *
 * The job's state lives in THIS component, which the hub keeps mounted whether the
 * sheet is open or not. Closing the sheet mid-import therefore does not cancel or
 * forget the job: reopening it shows the same progress, and the hold settles once,
 * when the poll below sees the terminal status.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Github, Globe, Linkedin, Twitter } from "lucide-react"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import toast from "@repo/ui/components/ui/sonner"
import { importProfileAndCreateDraft } from "@/actions/(main)/ai/resume-import.action"
import { saveMyProfileLinks } from "@/actions/(main)/user/profile-links.action"
import { awaitBackgroundJob } from "@/hooks/use-background-job"
import { useResumeHubStore } from "@/app/store/resumeHubStore"
import { creditErrorMessage, priceSuffix } from "@/lib/credits/notify"
import { githubUsernameFrom, twitterHandleFrom, type ProfileLinks } from "@/lib/profile-links"
import { Field, FieldGroup, ProfileSheet } from "@/components/profile/sheets/profile-sheet"
import { cn } from "@repo/ui/lib/utils"

/** The phases `apps/worker/src/jobs/resume-import.ts` reports, read as "at least". */
const STAGES = [
    { at: 0, label: "Reading your profiles" },
    { at: 30, label: "Reading your code" },
    { at: 55, label: "Writing your resume" },
    { at: 85, label: "Saving your draft" },
] as const

function stageIndexFor(progress: number): number {
    let idx = 0
    for (let i = 0; i < STAGES.length; i++) if (progress >= STAGES[i]!.at) idx = i
    return idx
}

type Phase = { kind: "form" } | { kind: "running"; stage: number }

export function ImportSheet({ open, onOpenChange, links }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    links: ProfileLinks
}) {
    const router = useRouter()
    const { setImportProgress } = useResumeHubStore()
    const [linkedinUrl, setLinkedinUrl] = useState(links.linkedinUrl ?? "")
    const [githubUsername, setGithubUsername] = useState(githubUsernameFrom(links.githubUrl))
    const [twitterHandle, setTwitterHandle] = useState(twitterHandleFrom(links.twitterUrl))
    const [portfolioUrl, setPortfolioUrl] = useState(links.websiteUrl ?? "")
    const [phase, setPhase] = useState<Phase>({ kind: "form" })
    const [touched, setTouched] = useState(false)

    const errors = {
        linkedin: !linkedinUrl.trim()
            ? "Add your LinkedIn profile"
            : !/linkedin\.com\/in\//i.test(linkedinUrl) ? "Use your profile link, like linkedin.com/in/yourname" : null,
        github: !githubUsername.trim() ? "Add your GitHub username" : null,
    }
    const valid = !errors.linkedin && !errors.github
    const running = phase.kind === "running"

    const start = async () => {
        setTouched(true)
        if (!valid || running) return
        setPhase({ kind: "running", stage: 0 })
        try {
            // Saved before the import, which is the slow part that can fail: a failed
            // extraction should not also lose the links just typed.
            void saveMyProfileLinks({
                linkedinUrl: linkedinUrl.trim() || null,
                githubUrl: githubUsername.trim() || null,
                twitterUrl: twitterHandle.trim() || null,
                websiteUrl: portfolioUrl.trim() || null,
            })
            const res = await importProfileAndCreateDraft({
                linkedinUrl: linkedinUrl.trim(),
                githubUsername: githubUsername.replace(/^@/, "").trim(),
                twitterHandle: twitterHandle.replace(/^@/, "").trim() || undefined,
                portfolioUrl: portfolioUrl.trim() || undefined,
            })
            if (!res.success || !res.jobId) {
                toast.error(creditErrorMessage(res, "Import failed"))
                setPhase({ kind: "form" })
                return
            }
            // The worker runs it; the credit hold settles or refunds the first time
            // this poll sees a terminal status.
            const outcome = await awaitBackgroundJob<{ draftId?: string }>(res.jobId, (progress, phaseLabel) => {
                const idx = stageIndexFor(progress)
                setPhase({ kind: "running", stage: idx })
                setImportProgress({ stage: phaseLabel || STAGES[idx]!.label, percent: progress })
            })
            setImportProgress(null)
            if (!outcome.ok) {
                // The inputs are still in state, so the form comes back filled.
                toast.error(outcome.error)
                setPhase({ kind: "form" })
                return
            }
            if (!outcome.result?.draftId) {
                toast.error("The import finished but no resume was saved. Please try again.")
                setPhase({ kind: "form" })
                return
            }
            toast.success("Your imported resume is ready")
            onOpenChange(false)
            router.push(`/ai/resume/draft/${outcome.result.draftId}`)
        } catch (error: unknown) {
            console.error("Import failed:", error)
            setImportProgress(null)
            toast.error("Something went wrong. Please try again.")
            setPhase({ kind: "form" })
        }
    }

    const from = (on: boolean) => (on ? "Filled in from your profile. Changes here are saved back." : undefined)

    return (
        <ProfileSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Import with AI"
            description="Build a resume from your LinkedIn and GitHub. Review it before you send it anywhere."
            onSubmit={running ? undefined : start}
            submitLabel={`Import${priceSuffix("resume_import")}`}
            closeLabel={running ? "Hide" : "Cancel"}
        >
            {running ? (
                <div className="space-y-5">
                    <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{STAGES[phase.stage]!.label}</p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            Usually 20 to 40 seconds. You can close this; the import keeps going and opens the draft when it is done.
                        </p>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-neutral-900 transition-all duration-700 dark:bg-white" style={{ width: `${Math.round(((phase.stage + 1) / STAGES.length) * 100)}%` }} />
                    </div>
                    <ol className="space-y-2.5">
                        {STAGES.map((s, i) => (
                            <li key={s.label} className={cn("flex items-center gap-2.5 text-[13px]", i <= phase.stage ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500")}>
                                {i < phase.stage ? <CheckCircle2 className="size-4 shrink-0" />
                                    : i === phase.stage ? <InlineLoader size="sm" />
                                    : <span className="size-4 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700" />}
                                {s.label}
                            </li>
                        ))}
                    </ol>
                </div>
            ) : (
                <>
                    <FieldGroup title="Required">
                        <Field label="LinkedIn profile" htmlFor="imp-li" required
                            error={touched ? errors.linkedin : null}
                            hint={from(!!links.linkedinUrl) ?? "Your LinkedIn profile must be public."}>
                            <PrefixInput id="imp-li" icon={<Linkedin className="size-3.5" />} value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/yourname" />
                        </Field>
                        <Field label="GitHub" htmlFor="imp-gh" required error={touched ? errors.github : null} hint={from(!!links.githubUrl)}>
                            <PrefixInput id="imp-gh" icon={<Github className="size-3.5" />} prefix="github.com/" value={githubUsername} onChange={setGithubUsername} placeholder="username" />
                        </Field>
                    </FieldGroup>
                    <FieldGroup title="Optional, improves the result">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="X" htmlFor="imp-x" hint={from(!!links.twitterUrl)}>
                                <PrefixInput id="imp-x" icon={<Twitter className="size-3.5" />} prefix="@" value={twitterHandle} onChange={setTwitterHandle} placeholder="handle" />
                            </Field>
                            <Field label="Portfolio" htmlFor="imp-web" hint={from(!!links.websiteUrl)}>
                                <PrefixInput id="imp-web" icon={<Globe className="size-3.5" />} value={portfolioUrl} onChange={setPortfolioUrl} placeholder="yourname.dev" />
                            </Field>
                        </div>
                    </FieldGroup>
                    <FieldGroup title="What it builds">
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {["Summary", "Work experience", "Projects from GitHub", "Skills", "Education", "Contact links"].map((x) => (
                                <li key={x} className="flex items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-400">
                                    <CheckCircle2 className="size-3.5 shrink-0 text-neutral-400" />{x}
                                </li>
                            ))}
                        </ul>
                    </FieldGroup>
                </>
            )}
        </ProfileSheet>
    )
}

/** An input with an optional icon and fixed prefix in a divided cell, one control. */
function PrefixInput({ id, icon, prefix, value, onChange, placeholder }: {
    id: string
    icon: React.ReactNode
    prefix?: string
    value: string
    onChange: (v: string) => void
    placeholder: string
}) {
    return (
        <div className="flex min-w-0 items-center overflow-hidden rounded-md border border-neutral-200 focus-within:ring-2 focus-within:ring-ring/40 dark:border-neutral-800">
            <span className="flex shrink-0 items-center gap-1.5 self-stretch border-r border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                {icon}{prefix}
            </span>
            <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="min-w-0 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 dark:bg-transparent" />
        </div>
    )
}
