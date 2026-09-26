"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { InlineLoader } from "../ui/inline-loader"
import toast from "../ui/sonner"
import {
    AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, OtpInput, PasswordInput, authLinkClass,
} from "./auth-form"

/**
 * Forgot and reset password, the same two screens in main, hiring and uni
 * (plan/auth AUTH-1). The auth calls come in as props, because this package does
 * not depend on @repo/auth and each app words its errors its own way: each call
 * resolves to an error message, or null on success.
 *
 * Both run on better-auth's email OTP: `emailOtp.requestPasswordReset` mails a
 * code, `emailOtp.resetPassword` checks it and writes the password onto the
 * `account` row. Neither screen says whether an address has an account;
 * better-auth answers the same either way, so the page cannot probe for users.
 */

type Call<A extends unknown[]> = (...args: A) => Promise<string | null>

const RESEND_SECONDS = 30

export function ForgotPasswordForm({ request, placeholder = "you@example.com" }: {
    request: Call<[email: string]>
    placeholder?: string
}) {
    const [email, setEmail] = React.useState("")
    const [sending, setSending] = React.useState(false)
    const router = useRouter()

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const normalised = email.trim().toLowerCase()
        if (!normalised) return toast.error("Please enter your email")
        setSending(true)
        try {
            const error = await request(normalised)
            if (error) return toast.error(error)
            toast.success("If that address has an account, a reset code is on its way")
            router.push(`/resetpassword?email=${encodeURIComponent(normalised)}`)
        } catch (error: unknown) {
            console.error("Requesting a reset code failed:", error)
            toast.error("Failed to send the reset code. Please try again.")
        } finally {
            setSending(false)
        }
    }

    return (
        <>
            <AuthHeader title="Forgot your password?" description="We'll email you a code to set a new one." />
            <form onSubmit={submit} className="space-y-5" noValidate>
                <AuthField label="Email address" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" autoFocus placeholder={placeholder}
                        value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} />
                </AuthField>
                <Button type="submit" size="lg" className="w-full" disabled={sending || !email.trim()}>
                    {sending ? <><InlineLoader size="sm" /> Sending code</> : "Send reset code"}
                </Button>
            </form>
            <BackToSignIn />
        </>
    )
}

function BackToSignIn() {
    return (
        <AuthFootnote>
            <Link href="/signin" className="inline-flex items-center gap-1.5">
                <ArrowLeft className="size-4" /> Back to sign in
            </Link>
        </AuthFootnote>
    )
}

function ResetPasswordInner({ reset, resend }: {
    reset: Call<[email: string, otp: string, password: string]>
    resend: Call<[email: string]>
}) {
    const router = useRouter()
    const email = useSearchParams().get("email")
    const [otp, setOtp] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirm, setConfirm] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [done, setDone] = React.useState(false)
    const [timer, setTimer] = React.useState(RESEND_SECONDS)

    // No address means the page was opened directly: start from the beginning.
    React.useEffect(() => {
        if (!email) router.replace("/forgotpassword")
    }, [email, router])

    React.useEffect(() => {
        if (timer <= 0) return
        const t = setTimeout(() => setTimer((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [timer])

    const codeReady = /^\d{6}$/.test(otp)

    const doResend = async () => {
        if (!email) return
        try {
            const error = await resend(email)
            if (error) return toast.error(error)
            toast.success("A new code is on its way")
            setTimer(RESEND_SECONDS)
            setOtp("")
        } catch (error: unknown) {
            console.error("Resending the reset code failed:", error)
            toast.error("Failed to resend the code")
        }
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        if (!codeReady) return toast.error("Enter the full 6-digit code")
        // 8 matches `minPasswordLength` in packages/auth/src/auth.ts.
        if (password.length < 8) return toast.error("Password too short (min 8 characters)")
        if (password !== confirm) return toast.error("Passwords do not match")
        setBusy(true)
        try {
            const error = await reset(email, otp, password)
            if (error) {
                toast.error(error)
                setOtp("")
                return
            }
            setDone(true)
            toast.success("Password reset")
            setTimeout(() => router.push("/signin"), 2000)
        } catch (error: unknown) {
            console.error("Resetting the password failed:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setBusy(false)
        }
    }

    if (done) {
        return (
            <>
                <AuthHeader icon={<CheckCircle2 className="size-5" />} title="Password updated"
                    description="Sign in with your new password. Taking you there now." />
                <Button asChild size="lg" className="w-full"><Link href="/signin">Go to sign in</Link></Button>
            </>
        )
    }

    return (
        <>
            <AuthHeader
                title="Set a new password"
                description={<>Enter the code we sent to <span className="font-medium text-neutral-900 dark:text-white">{email}</span>.</>}
            />
            <form onSubmit={submit} className="space-y-5" noValidate>
                <AuthField label="Verification code">
                    <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus />
                </AuthField>
                <AuthField label="New password" htmlFor="password" hint="At least 8 characters.">
                    <PasswordInput id="password" autoComplete="new-password" value={password}
                        onChange={(e) => setPassword(e.target.value)} disabled={busy} />
                </AuthField>
                <AuthField label="Confirm password" htmlFor="confirm"
                    error={confirm && confirm !== password ? "Passwords do not match" : null}>
                    <PasswordInput id="confirm" autoComplete="new-password" value={confirm}
                        onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
                </AuthField>
                <Button type="submit" size="lg" className="w-full" disabled={busy || !codeReady}>
                    {busy ? <><InlineLoader size="sm" /> Saving</> : "Reset password"}
                </Button>
            </form>
            <AuthFootnote>
                Didn&apos;t get it?{" "}
                <button type="button" onClick={() => void doResend()} disabled={timer > 0} className={authLinkClass}>
                    {timer > 0 ? `Resend in ${timer}s` : "Resend code"}
                </button>
            </AuthFootnote>
            <BackToSignIn />
        </>
    )
}

export function ResetPasswordForm(props: {
    reset: Call<[email: string, otp: string, password: string]>
    resend: Call<[email: string]>
}) {
    return (
        <React.Suspense fallback={<AuthFormSkeleton fields={3} />}>
            <ResetPasswordInner {...props} />
        </React.Suspense>
    )
}
