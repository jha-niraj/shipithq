"use client"

import { Suspense, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, MailX } from "lucide-react"
import { signOut, useSession } from "@repo/auth/client"
import { Button } from "@repo/ui/components/ui/button"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AuthFormSkeleton, AuthHeader, AuthNotice } from "@repo/ui/components/auth/auth-form"
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
        <Suspense fallback={<AuthFormSkeleton fields={1} />}>
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

    if (!invitation || sessionPending) return <AuthFormSkeleton fields={1} />

    if (invitation.status !== "valid") {
        const p = PROBLEM[invitation.status]
        return (
            <Card icon={<MailX className="h-5 w-5" />} title={p.title} body={p.body}>
                <Button asChild size="lg" variant="outline" className="w-full"><Link href="/signin">Go to sign in</Link></Button>
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
                <div className="mb-5"><AuthNotice>{invitation.message}</AuthNotice></div>
            )}
            {!signedInAs ? (
                <div className="grid gap-2">
                    <Button asChild size="lg" className="w-full"><Link href={`/signin?callbackUrl=${encodeURIComponent(here)}`}>Sign in to accept</Link></Button>
                    <Button asChild size="lg" variant="outline" className="w-full"><Link href="/register">Create an account with {invitation.email}</Link></Button>
                    <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                        New here? After you verify your email, you&apos;ll be offered this invitation.
                    </p>
                </div>
            ) : matches ? (
                <Button size="lg" className="w-full" disabled={accepting} onClick={accept}>
                    {accepting && <InlineLoader size="sm" />} Accept and join
                </Button>
            ) : (
                <div className="grid gap-2">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        You&apos;re signed in as {signedInAs}. This invitation is for {invitation.email}.
                    </p>
                    <Button
                        size="lg"
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

/** The invite states share the auth shell's header; the shell draws the rest. */
function Card({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
    return (
        <>
            <AuthHeader icon={icon} title={title} description={body} />
            {children}
        </>
    )
}
