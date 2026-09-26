"use client"

import { useState } from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { signOut } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { deleteMyAccount, getDeletionPlan } from "@/actions/(main)/user/account-delete.action"

/*
 * Delete account (plan/hiring-rounds HR-21): says what goes, asks for the
 * account's email, then deletes and signs out. Final.
 */

type Plan = { sends: number; threads: number; files: number; ownerOf: string[] }

export function DeleteAccountCard({ email }: { email: string }) {
    const [open, setOpen] = useState(false)
    const [plan, setPlan] = useState<Plan | null>(null)
    const [typed, setTyped] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const start = async () => {
        setOpen(true)
        setError(null)
        setTyped("")
        const r = await getDeletionPlan()
        if (r.success) setPlan(r.data)
        else setError(r.error)
    }

    const confirm = async () => {
        setBusy(true)
        setError(null)
        const r = await deleteMyAccount(typed)
        if (!r.success) { setBusy(false); setError(r.error); return }
        await signOut().catch(() => undefined)
        window.location.href = "/"
    }

    const matches = typed.trim().toLowerCase() === email.toLowerCase()
    return (
        <Card className="border-rose-200 dark:border-rose-900/60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400"><AlertTriangle className="h-5 w-5" /> Delete account</CardTitle>
                <CardDescription>Permanently delete your account and everything in it. This can&apos;t be undone.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" onClick={() => void start()} className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40">
                    <Trash2 className="h-4 w-4" /> Delete my account
                </Button>
            </CardContent>
            <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>Everything goes: your profile, resumes, projects, practice, rounds and messages. Payments stay on record without your name.</DialogDescription>
                    </DialogHeader>
                    {!plan && !error ? (
                        <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"><InlineLoader size="sm" /> Checking your account</p>
                    ) : plan?.ownerOf.length ? (
                        <p className="text-sm text-rose-700 dark:text-rose-400">You&apos;re the Owner of {plan.ownerOf.join(", ")} on ShipItHQ Hiring. Hand ownership to a teammate, or delete the company there, first.</p>
                    ) : plan ? (
                        <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                            <ul className="list-disc space-y-1 pl-5">
                                {plan.sends > 0 && <li>{plan.sends} {plan.sends === 1 ? "send" : "sends"} to companies are withdrawn and their data removed now.</li>}
                                {plan.threads > 0 && <li>{plan.threads} {plan.threads === 1 ? "conversation shows" : "conversations show"} &ldquo;account deleted&rdquo; to the company.</li>}
                                {plan.files > 0 && <li>{plan.files} uploaded {plan.files === 1 ? "file is" : "files are"} deleted.</li>}
                                <li>You&apos;re signed out everywhere.</li>
                            </ul>
                            <label className="block">
                                <span className="text-neutral-800 dark:text-neutral-200">Type <strong>{email}</strong> to confirm</span>
                                <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="mt-1.5" aria-label="Your email" />
                            </label>
                        </div>
                    ) : null}
                    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Keep my account</Button>
                        <Button onClick={() => void confirm()} disabled={!plan || plan.ownerOf.length > 0 || !matches || busy} className="gap-2 bg-rose-700 text-white hover:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-700">
                            {busy && <InlineLoader size="sm" />} Delete forever
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
