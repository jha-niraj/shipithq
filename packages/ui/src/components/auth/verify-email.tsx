"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, MailCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "../ui/button"
import { InlineLoader } from "../ui/inline-loader"
import toast from "../ui/sonner"
import { AuthFootnote, AuthFormSkeleton, AuthHeader, OtpInput, authLinkClass } from "./auth-form"

/**
 * The emailed-code screen after register, for the apps that verify on a page of
 * their own (hiring, uni; main verifies inline on register and sign-in). Reads
 * `?email=` and passes every other search param to `next` so a referral such as
 * hiring's `inviteBy` survives into onboarding (plan/auth AUTH-1).
 *
 * `verify` is better-auth's `emailOtp.verifyEmail`, which checks the code AND
 * mints the session, so `next` is reached signed in. Each call resolves to an
 * error message, or null on success.
 */

type Call<A extends unknown[]> = (...args: A) => Promise<string | null>

const RESEND_SECONDS = 30

function VerifyInner({ verify, resend, next }: {
    verify: Call<[email: string, otp: string]>
    resend: Call<[email: string]>
    /** Where a verified user goes, given the page's search params. */
    next: (params: URLSearchParams) => string
}) {
    const router = useRouter()
    const params = useSearchParams()
    const email = params.get("email")
    const [code, setCode] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [done, setDone] = React.useState(false)
    const [timer, setTimer] = React.useState(RESEND_SECONDS)

    React.useEffect(() => {
        if (!email) router.replace("/register")
    }, [email, router])

    React.useEffect(() => {
        if (timer <= 0) return
        const t = setTimeout(() => setTimer((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [timer])

    const submit = async (otp: string) => {
        if (!email || busy || !/^\d{6}$/.test(otp)) return
        setBusy(true)
        try {
            const error = await verify(email, otp)
            if (error) {
                toast.error(error)
                setCode("")
                return
            }
            setDone(true)
            toast.success("Email verified")
            setTimeout(() => router.push(next(new URLSearchParams(params.toString()))), 1000)
        } catch (error: unknown) {
            console.error("Verifying the email failed:", error)
            toast.error("Verification failed")
        } finally {
            setBusy(false)
        }
    }

    const doResend = async () => {
        if (!email) return
        try {
            const error = await resend(email)
            if (error) return toast.error(error)
            toast.success("A new code is on its way")
            setTimer(RESEND_SECONDS)
            setCode("")
        } catch (error: unknown) {
            console.error("Resending the code failed:", error)
            toast.error("Failed to resend the code")
        }
    }

    if (done) {
        return (
            <AuthHeader icon={<CheckCircle2 className="size-5" />} title="Email verified" description="Setting up your workspace now." />
        )
    }

    return (
        <>
            <AuthHeader
                icon={<MailCheck className="size-5" />}
                title="Check your email"
                description={<>We sent a 6-digit code to <span className="font-medium text-neutral-900 dark:text-white">{email}</span>.</>}
            />
            <div className="space-y-5">
                <OtpInput value={code} onChange={setCode} onComplete={(v) => void submit(v)} disabled={busy} autoFocus />
                <Button type="button" size="lg" className="w-full" onClick={() => void submit(code)} disabled={busy || !/^\d{6}$/.test(code)}>
                    {busy ? <><InlineLoader size="sm" /> Verifying</> : "Verify and continue"}
                </Button>
            </div>
            <AuthFootnote>
                Didn&apos;t get the code?{" "}
                <button type="button" onClick={() => void doResend()} disabled={timer > 0} className={authLinkClass}>
                    {timer > 0 ? `Resend in ${timer}s` : "Resend code"}
                </button>
            </AuthFootnote>
            <AuthFootnote>
                <Link href="/register" className="inline-flex items-center gap-1.5">
                    <ArrowLeft className="size-4" /> Use a different email
                </Link>
            </AuthFootnote>
        </>
    )
}

export function VerifyEmailForm(props: React.ComponentProps<typeof VerifyInner>) {
    return (
        <React.Suspense fallback={<AuthFormSkeleton fields={1} />}>
            <VerifyInner {...props} />
        </React.Suspense>
    )
}
