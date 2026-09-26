"use client"

import { useState } from "react"
import { ArrowUpRight, CircleAlert, CircleCheck, Linkedin } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { cn } from "@/lib/utils"
import { approveCompanyClaim, rejectCompanyClaim, type ClaimRow } from "@/actions/hiring/claims.action"

/*
 * Claims on company pages (plan/hiring-rounds HR-8). Approving makes the
 * claimant the Owner of the existing page and verifies the company; rejecting
 * returns the page to Unclaimed and emails them the reason.
 */

const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? ""

export function ClaimsSection({ claims, onDecided }: { claims: ClaimRow[]; onDecided: (id: string, kind: "approved" | "rejected") => void }) {
    return (
        <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Claims on company pages</h2>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{claims.length} waiting</span>
            </div>
            {claims.length === 0 ? (
                <p className="rounded-xl border border-neutral-200 bg-white px-5 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    No claims waiting. When someone from a company claims its unclaimed page, it shows up here.
                </p>
            ) : (
                <div className="space-y-4">
                    {claims.map((c) => <ClaimCard key={c.id} claim={c} onDecided={onDecided} />)}
                </div>
            )}
        </section>
    )
}

function ClaimCard({ claim: c, onDecided }: { claim: ClaimRow; onDecided: (id: string, kind: "approved" | "rejected") => void }) {
    const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState("")

    const approve = async () => {
        setBusy("approve")
        const r = await approveCompanyClaim(c.id)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        toast.success(`${c.claimant.email} is now the Owner of ${c.company.name}`)
        onDecided(c.id, "approved")
    }
    const reject = async () => {
        setBusy("reject")
        const r = await rejectCompanyClaim(c.id, reason)
        setBusy(null)
        if (!r.success) { toast.error(r.error); return }
        toast.success("Claim rejected; the claimant was told why")
        onDecided(c.id, "rejected")
    }

    return (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                    <div>
                        <p className="text-base font-semibold text-neutral-900 dark:text-white">
                            {c.company.name}
                            {c.company.websiteDomain && <span className="ml-2 font-mono text-sm font-normal text-neutral-500">{c.company.websiteDomain}</span>}
                        </p>
                        {MAIN_URL && (
                            <a href={`${MAIN_URL}/companies/${c.company.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-neutral-500 hover:underline dark:text-neutral-400">
                                Unclaimed page <ArrowUpRight className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <dt className="text-neutral-500 dark:text-neutral-400">Claimed by</dt>
                        <dd className="min-w-0 text-neutral-900 dark:text-white">
                            {c.claimant.name ? `${c.claimant.name} · ` : ""}<span className="font-mono">{c.claimant.email}</span>
                        </dd>
                        <dt className="text-neutral-500 dark:text-neutral-400">Email domain</dt>
                        <dd className={cn("inline-flex items-center gap-1.5", c.domainMatches ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                            {c.domainMatches ? <CircleCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                            {c.domainMatches ? `Matches ${c.company.websiteDomain}` : `Does not match ${c.company.websiteDomain ?? "the page"}`}
                        </dd>
                        <dt className="text-neutral-500 dark:text-neutral-400">Job title</dt>
                        <dd className="text-neutral-900 dark:text-white">{c.jobTitle}</dd>
                        {c.linkedinUrl && (
                            <>
                                <dt className="text-neutral-500 dark:text-neutral-400">LinkedIn</dt>
                                <dd className="min-w-0">
                                    <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-neutral-900 hover:underline dark:text-white">
                                        <Linkedin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{c.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                                    </a>
                                </dd>
                            </>
                        )}
                        {c.note && (
                            <>
                                <dt className="text-neutral-500 dark:text-neutral-400">Note</dt>
                                <dd className="whitespace-pre-line break-words text-neutral-700 dark:text-neutral-300">{c.note}</dd>
                            </>
                        )}
                        <dt className="text-neutral-500 dark:text-neutral-400">Claimed</dt>
                        <dd className="text-neutral-700 dark:text-neutral-300">{new Date(c.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</dd>
                    </dl>
                    {c.earlierRejections.length > 0 && (
                        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                            <p className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">Earlier rejected claims on this company</p>
                            <ul className="space-y-0.5">
                                {c.earlierRejections.map((r, i) => (
                                    <li key={i}><span className="font-mono">{r.email}</span>{r.reason ? `: ${r.reason}` : ""}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 lg:w-72">
                    {rejecting ? (
                        <>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why (the claimant sees this)"
                                maxLength={300}
                                aria-label="Reason for rejecting the claim"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                    onClick={reject}
                                    disabled={busy !== null || reason.trim().length < 5}
                                >
                                    {busy === "reject" && <InlineLoader size="sm" />} Reject claim
                                </Button>
                                <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy !== null}>Back</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button onClick={approve} disabled={busy !== null} className="gap-1.5">
                                {busy === "approve" && <InlineLoader size="sm" />} Approve: make Owner and verify
                            </Button>
                            <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy !== null}>Reject</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
