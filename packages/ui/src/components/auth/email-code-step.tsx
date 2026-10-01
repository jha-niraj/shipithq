"use client"

import * as React from "react"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "../ui/button"
import { InlineLoader } from "../ui/inline-loader"
import toast from "../ui/sonner"
import { AuthAlert, AuthFootnote, AuthHeader, OtpInput, authLinkClass } from "./auth-form"

/**
 * The emailed-code step, shown on the register page itself once the details are sent
 * (plan/auth AUTH-15; Niraj, 2026-10-01: "fold that step into the register page"). Hiring
 * and uni use it; main's register has the same step inline. It replaced the separate
 * /verify pages and their VerifyEmailForm.
 *
 * `verify` is better-auth's `emailOtp.verifyEmail`, which checks the code AND mints the
 * session, so `onVerified` runs signed in. Each call resolves to an error message, or null.
 */

type Call<A extends unknown[]> = (...args: A) => Promise<string | null>

const RESEND_SECONDS = 30

export function EmailCodeStep({ email, verify, resend, onVerified, onBack, doneNote = "Setting up your workspace now." }: {
    email: string
    verify: Call<[email: string, otp: string]>
    resend: Call<[email: string]>
    /** Where to go once verified (onboarding). */
    onVerified: () => void
    /** Back to the details, to fix the address. */
    onBack: () => void
    doneNote?: string
}) {
    const [code, setCode] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [resending, setResending] = React.useState(false)
    const [done, setDone] = React.useState(false)
    const [error, setError] = React.useState("")
    const [timer, setTimer] = React.useState(RESEND_SECONDS)

    React.useEffect(() => {
        if (timer <= 0) return
        const t = setTimeout(() => setTimer((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [timer])

    const submit = async (otp: string) => {
        if (busy || !/^\d{6}$/.test(otp)) return
        setBusy(true)
        setError("")
        try {
            const message = await verify(email, otp)
            if (message) {
                setError(message)
                setCode("")
                return
            }
            setDone(true)
            onVerified()
        } catch (err: unknown) {
            console.error("Verifying the email failed:", err)
            setError("Could not verify the code. Please try again.")
        } finally {
            setBusy(false)
        }
    }

    const doResend = async () => {
        if (timer > 0 || resending) return
        setResending(true)
        try {
            const message = await resend(email)
            if (message) return setError(message)
            toast.success("A new code is on its way")
            setTimer(RESEND_SECONDS)
            setCode("")
            setError("")
        } catch (err: unknown) {
            console.error("Resending the code failed:", err)
            setError("Could not resend the code. Please try again.")
        } finally {
            setResending(false)
        }
    }

    if (done) return <AuthHeader icon={<CheckCircle2 className="size-5" />} title="Email verified" description={doneNote} />

    return (
        <div key="code" className="auth-enter">
            <AuthHeader
                title="Check your email"
                description={<>We sent a 6-digit code to <span className="font-medium text-neutral-900 dark:text-white">{email}</span>.</>}
            />
            <AuthAlert>{error}</AuthAlert>
            <div className="space-y-5">
                <OtpInput value={code} onChange={setCode} onComplete={(v) => void submit(v)} disabled={busy} autoFocus />
                <Button type="button" size="lg" className="w-full" onClick={() => void submit(code)} disabled={busy || !/^\d{6}$/.test(code)}>
                    {busy ? <><InlineLoader size="sm" /> Verifying</> : "Verify and continue"}
                </Button>
            </div>
            <AuthFootnote>
                Didn&apos;t get the code?{" "}
                <button type="button" onClick={() => void doResend()} disabled={timer > 0 || resending} className={authLinkClass}>
                    {resending ? "Sending" : timer > 0 ? `Resend in ${timer}s` : "Resend code"}
                </button>
            </AuthFootnote>
            <AuthFootnote>
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5">
                    <ArrowLeft className="size-4" /> Use a different email
                </button>
            </AuthFootnote>
        </div>
    )
}
