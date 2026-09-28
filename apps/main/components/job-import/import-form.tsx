"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Globe, Link2, Lock } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@repo/ui/lib/utils"
import { importJob, type ImportAllowance } from "@/actions/(main)/jobs/import.action"

/*
 * The paste form (plan/job-import JI-7): a link or the posting's text, public
 * (free, 3 a day) or private (15 credits). Text needs the company's name; a
 * link doesn't, since it's read from the page.
 */

/** A single token starting with http(s) is a link; anything else is the posting's text. */
const isLink = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())

/** `initialText`: a posting to start from (an interview-prep goal's, JI-8). */
export function ImportForm({ allowance, company, initialText }: { allowance: ImportAllowance; company?: string; initialText?: string }) {
    const router = useRouter()
    // A one-line link box by default; the text area only when the posting itself is pasted
    // (plan/jobs-polish JP-4). A posting pasted into the link box switches it over.
    const [mode, setMode] = useState<"link" | "text">(initialText ? "text" : "link")
    const [value, setValue] = useState(initialText ?? "")
    const [companyName, setCompanyName] = useState(company ?? "")
    const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(allowance.publicLeft > 0 ? "PUBLIC" : "PRIVATE")
    const [busy, setBusy] = useState(false)
    // What is sent follows the mode: a link box only sends a link; the text area, text.
    const link = mode === "link" && isLink(value)
    const text = mode === "text" && value.trim().length > 0
    const canAffordPrivate = allowance.credits >= allowance.privatePrice
    const ready = allowance.signedIn && (link || (text && companyName.trim().length >= 2)) && (visibility === "PUBLIC" ? allowance.publicLeft > 0 : canAffordPrivate)

    const submit = async () => {
        setBusy(true)
        const r = await importJob(link ? { url: value.trim(), visibility } : { text: value, companyName, visibility })
        if (!r.success) {
            setBusy(false)
            if (r.code === "DAILY_LIMIT") setVisibility("PRIVATE")
            toast.error(r.error)
            return
        }
        router.push(r.data.kind === "on_platform" ? r.data.href : `/jobs/import/${r.data.importId}`)
    }

    return (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) void submit() }}>
            <div className="space-y-2">
                <label htmlFor="job-paste" className="text-sm font-medium text-neutral-900 dark:text-white">{mode === "link" ? "The job's link" : "The job's text"}</label>
                {mode === "link" ? (
                    <Input
                        id="job-paste"
                        type="url"
                        inputMode="url"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onPaste={(e) => {
                            const pasted = e.clipboardData.getData("text")
                            // A whole posting, not a link: take it as text.
                            if (pasted.trim() && !isLink(pasted) && (/\s/.test(pasted.trim()) || pasted.length > 200)) {
                                e.preventDefault()
                                setValue(pasted)
                                setMode("text")
                            }
                        }}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        autoComplete="off"
                    />
                ) : (
                    <Textarea
                        id="job-paste"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Paste the whole posting: the title, what the role does, what they ask for."
                        className="min-h-[12rem] resize-y"
                        maxLength={20_000}
                        autoFocus={!initialText}
                    />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <p className="flex items-center gap-1.5">
                        {link ? <><Link2 className="h-3.5 w-3.5" /> We&apos;ll read the posting; if the site won&apos;t let us, you&apos;ll paste the text.</>
                            : mode === "text" ? "The posting's text. Add the company below."
                                : "LinkedIn, a careers page, any job board."}
                    </p>
                    <button
                        type="button"
                        onClick={() => { setMode(mode === "link" ? "text" : "link"); setValue("") }}
                        className="inline-flex items-center gap-1 font-medium text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-300"
                    >
                        {mode === "link" ? <><FileText className="h-3.5 w-3.5" /> Paste the text instead</> : <><Link2 className="h-3.5 w-3.5" /> Use a link instead</>}
                    </button>
                </div>
            </div>

            {text && (
                <div className="space-y-2">
                    <label htmlFor="job-company" className="text-sm font-medium text-neutral-900 dark:text-white">Company</label>
                    <Input id="job-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Who is hiring? e.g. Razorpay" maxLength={120} />
                </div>
            )}

            <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-neutral-900 dark:text-white">Who can practise it</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                    <Choice
                        selected={visibility === "PUBLIC"}
                        disabled={allowance.signedIn && allowance.publicLeft === 0}
                        onSelect={() => setVisibility("PUBLIC")}
                        icon={<Globe className="h-4 w-4" />}
                        title="Public · free"
                        body={allowance.signedIn
                            ? allowance.publicLeft > 0
                                ? `Any student can practise it too. ${allowance.publicLeft} of ${allowance.publicPerDay} left in the last 24 hours.`
                                : `You've used ${allowance.publicPerDay} in the last 24 hours. Try again later, or import privately.`
                            : `Any student can practise it too. ${allowance.publicPerDay} a day.`}
                    />
                    <Choice
                        selected={visibility === "PRIVATE"}
                        disabled={allowance.signedIn && !canAffordPrivate}
                        onSelect={() => setVisibility("PRIVATE")}
                        icon={<Lock className="h-4 w-4" />}
                        title={`Private · ${allowance.privatePrice} credits`}
                        body={allowance.signedIn
                            ? canAffordPrivate
                                ? `Only you see it. Refunded if we can't build it. You have ${allowance.credits} credits.`
                                : `Only you see it. You have ${allowance.credits} credits.`
                            : "Only you see it. Refunded if we can't build it."}
                    />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Building the rounds is the only charge; each round then costs what every practice round does. A job someone already imported publicly is free to practise.
                </p>
            </fieldset>

            {allowance.signedIn ? (
                <Button type="submit" disabled={!ready || busy} className="gap-1.5">
                    {busy ? <InlineLoader size="sm" /> : <ArrowRight className="h-4 w-4" />} Build the rounds
                </Button>
            ) : (
                <Button asChild><Link href={`/signin?callbackUrl=${encodeURIComponent("/jobs/import")}`}>Sign in to practise a job</Link></Button>
            )}
        </form>
    )
}

function Choice({ selected, disabled, onSelect, icon, title, body }: { selected: boolean; disabled: boolean; onSelect: () => void; icon: React.ReactNode; title: string; body: string }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600",
            )}
        >
            <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white">{icon} {title}</span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{body}</span>
        </button>
    )
}
