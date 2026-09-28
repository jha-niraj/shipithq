"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Link2 } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { importJob, type ImportAllowance } from "@/actions/(main)/jobs/import.action"

/*
 * The paste form (plan/job-import JI-7, JI-13): a link or the posting's text. It
 * only starts the read; the student checks the result and chooses public or
 * private at Build (JI-15). Text needs the company's name; a link doesn't.
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
    const [busy, setBusy] = useState(false)
    // What is sent follows the mode: a link box only sends a link; the text area, text.
    const link = mode === "link" && isLink(value)
    const text = mode === "text" && value.trim().length > 0
    const ready = allowance.signedIn && (link || (text && companyName.trim().length >= 2))

    const submit = async () => {
        setBusy(true)
        const r = await importJob(link ? { url: value.trim() } : { text: value, companyName })
        if (!r.success) {
            setBusy(false)
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

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Reading is free. You&apos;ll check what we read and fix anything before the rounds are built; that&apos;s where you choose public or private.
            </p>

            {allowance.signedIn ? (
                <Button type="submit" disabled={!ready || busy} className="gap-1.5">
                    {busy ? <InlineLoader size="sm" /> : <ArrowRight className="h-4 w-4" />} {link || mode === "link" ? "Read the job" : "Check the text"}
                </Button>
            ) : (
                <Button asChild><Link href={`/signin?callbackUrl=${encodeURIComponent("/jobs/import")}`}>Sign in to practise a job</Link></Button>
            )}
        </form>
    )
}
