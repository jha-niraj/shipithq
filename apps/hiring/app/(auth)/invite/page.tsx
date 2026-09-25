"use client"

import { Suspense, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, MailX } from "lucide-react"
import { signOut, useSession } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader"
import { toast } from "@repo/ui/components/ui/sonner"
import { acceptInvitation, getInvitation, type InvitationView } from "@/actions/team/invite.action"

// ─────────────────────────────────────────────────────────────────────────────
// /invite?code=... (plan/hiring-app HA-8): the link in the invite email.
// Shows the company and role, then the one step this visitor needs: sign in
// or create an account with the invited email, or accept, or switch accounts
// when they are signed in as someone else. Every rule is checked again by
// `acceptInvitation` on the server.
// ─────────────────────────────────────────────────────────────────────────────

export default function InvitePage() {
    return (
        <Suspense fallback={<ShipItHQLoader />}>
            <InviteContent />
        </Suspense>
    )
}

const PROBLEM: Record<Exclude<InvitationView["status"], "valid">, { title: string; body: string }> = {
    expired: { title: "This invitation has expired", body: "Invitations last 7 days. Ask whoever invited you to send a new one." },
    used: { title: "This invitation has been used", body: "It has already been accepted. Sign in to continue." },
    cancelled: { title: "This invitation was cancelled", body: "Ask your company's admin for a new one." },
    not_found: { title: "This invitation doesn't exist", body: "Check the link in your email, or ask for a new invitation." },
}

function InviteContent() {
    const router = useRouter()
    const code = useSearchParams()?.get("code") ?? ""
    const { data: session, isPending: sessionPending } = useSession()
    const [invitation, setInvitation] = useState<InvitationView | null>(null)
    const [accepting, startAccept] = useTransition()
    const [signingOut, setSigningOut] = useState(false)

    useEffect(() => {
        let live = true
        void getInvitation(code).then((v) => { if (live) setInvitation(v) })
        return () => { live = false }
    }, [code])

    if (!invitation || sessionPending) return <ShipItHQLoader />

    if (invitation.status !== "valid") {
        const p = PROBLEM[invitation.status]
        return (
            <Card icon={<MailX className="h-5 w-5" />} title={p.title} body={p.body}>
                <Button asChild variant="outline" className="w-full"><Link href="/signin">Go to sign in</Link></Button>
            </Card>
        )
    }

    const here = `/invite?code=${encodeURIComponent(code)}`
    const signedInAs = session?.user?.email?.toLowerCase() ?? null
    const matches = signedInAs === invitation.email.toLowerCase()

    const accept = () => startAccept(async () => {
        const r = await acceptInvitation(code)
        if (!r.success) { toast.error(r.error); return }
        toast.success(`Welcome to ${invitation.companyName}`)
        // A full navigation, so the layout reads the new membership.
        window.location.href = "/home"
    })

    return (
        <Card
            icon={<Building2 className="h-5 w-5" />}
            title={`Join ${invitation.companyName}`}
            body={`${invitation.inviterName ?? "Your team"} invited ${invitation.email} to join as ${invitation.roleName}.`}
        >
            {invitation.message && (
                <blockquote className="mb-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {invitation.message}
                </blockquote>
            )}
            {!signedInAs ? (
                <div className="grid gap-2">
                    <Button asChild className="w-full"><Link href={`/signin?callbackUrl=${encodeURIComponent(here)}`}>Sign in to accept</Link></Button>
                    <Button asChild variant="outline" className="w-full"><Link href="/register">Create an account with {invitation.email}</Link></Button>
                    <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                        New here? After you verify your email, you&apos;ll be offered this invitation.
                    </p>
                </div>
            ) : matches ? (
                <Button className="w-full gap-1.5" disabled={accepting} onClick={accept}>
                    {accepting && <InlineLoader size="sm" />} Accept and join
                </Button>
            ) : (
                <div className="grid gap-2">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        You&apos;re signed in as {signedInAs}. This invitation is for {invitation.email}.
                    </p>
                    <Button
                        variant="outline"
                        className="w-full"
                        disabled={signingOut}
                        onClick={async () => {
                            setSigningOut(true)
                            await signOut().catch(() => {})
                            router.replace(`/signin?callbackUrl=${encodeURIComponent(here)}`)
                        }}
                    >
                        Sign out and switch account
                    </Button>
                </div>
            )}
        </Card>
    )
}

function Card({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-page dark:bg-neutral-950">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {icon}
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h1>
                <p className="mt-2 mb-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
                {children}
            </div>
        </div>
    )
}
