"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader"
import type React from "react"
import { Logo } from "@repo/ui/components/logo"
import { useState, useRef, useEffect, Suspense } from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import {
    CheckCircle2, RefreshCw, ShieldCheck, ArrowRight
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from '@repo/ui/components/ui/sonner'
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@repo/ui/lib/utils"
import { Label } from "@repo/ui/components/ui/label"
import { emailOtp } from "@repo/auth/client"

function VerifyContent() {
    const [isLoading, setIsLoading] = useState(false)
    const [isVerified, setIsVerified] = useState(false)
    const [timer, setTimer] = useState(30)
    const [canResend, setCanResend] = useState(false)
    const [email, setEmail] = useState<string | null>(null)
    const [inviteBy, setInviteBy] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ]

    const [code, setCode] = useState(["", "", "", "", "", ""])

    useEffect(() => {
        const emailParam = searchParams.get('email')
        const inviteByParam = searchParams.get('inviteBy')
        if (emailParam) {
            setEmail(emailParam)
        } else {
            router.push('/register')
        }
        if (inviteByParam) {
            setInviteBy(inviteByParam)
        }
    }, [searchParams, router])

    useEffect(() => {
        if (timer > 0 && !canResend) {
            const interval = setInterval(() => setTimer((prev) => prev - 1), 1000)
            return () => clearInterval(interval)
        } else if (timer === 0 && !canResend) {
            setCanResend(true)
        }
    }, [timer, canResend])

    const handleInputChange = (index: number, value: string) => {
        if (value && !/^\d+$/.test(value)) return
        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)
        if (value && index < 5) inputRefs[index + 1]?.current?.focus()
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) inputRefs[index - 1]?.current?.focus()
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData("text/plain").trim()
        if (/^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split("")
            setCode(digits)
            inputRefs[5]?.current?.focus()
        }
    }

    const handleResend = async () => {
        if (!email) return
        try {
            const { error } = await emailOtp.sendVerificationOtp({ email, type: "email-verification" })
            if (error) {
                toast.error(error.message || "Failed to resend")
                return
            }
            toast.success("Verification code sent!")
            setCanResend(false)
            setTimer(30)
            setCode(["", "", "", "", "", ""])
        } catch {
            toast.error("Failed to resend code")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return toast.error("Session invalid")
        if (code.join("").length !== 6) return toast.error("Enter full 6-digit code")

        setIsLoading(true)
        try {
            // `verifyEmail` checks the code AND mints the session in one call.
            //
            // What was here before could not work: it POSTed to /api/verify-otp
            // (which compared against `users.verifyOTP`, a column better-auth
            // never writes) and then tried to sign in with the literal string
            // 'verified' as the password. Both halves failed, so every user was
            // dumped on /signin?verified=true - where their real password also
            // failed, because registration never created the `account` row that
            // better-auth checks.
            const { error } = await emailOtp.verifyEmail({ email, otp: code.join("") })

            if (error) {
                toast.error(error.message || "Invalid code")
                setCode(["", "", "", "", "", ""])
                inputRefs[0]?.current?.focus()
                return
            }

            setIsVerified(true)
            toast.success("Email verified successfully!")
            const onboardingUrl = inviteBy
                ? `/onboarding?inviteBy=${encodeURIComponent(inviteBy)}`
                : '/onboarding'
            setTimeout(() => router.push(onboardingUrl), 1000)
        } catch {
            toast.error("Verification failed")
        } finally {
            setIsLoading(false)
        }
    }

    if (isVerified) {
        return (
            <div className="min-h-dvh w-full bg-white dark:bg-neutral-950 flex flex-col items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-neutral-900 dark:text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Verified Successfully</h2>
                    <p className="text-neutral-500">Initializing your workspace...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh w-full bg-white dark:bg-neutral-950 flex flex-col items-center justify-center relative p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
                            <Logo className="h-[19px] w-[19px] text-white dark:text-black" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                            ShipItHQ <span className="text-neutral-500 font-mono font-normal">HIRING</span>
                        </span>
                    </Link>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-6 h-6 text-neutral-900 dark:text-white" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            Email Verification
                        </span>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Enter Verification Code</h2>
                        <p className="text-sm text-neutral-500 mt-2">
                            Code sent to <span className="font-mono text-neutral-900 dark:text-white">{email}</span>
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                                6-Digit Code
                            </Label>
                            <div className="flex justify-between gap-2">
                                {
                                    code.map((digit, index) => (
                                        <Input
                                            key={index}
                                            ref={inputRefs[index]}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleInputChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onPaste={index === 0 ? handlePaste : undefined}
                                            className={cn(
                                                "w-12 h-12 text-center text-xl font-bold p-0 rounded-xl",
                                                "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800",
                                                "focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                                            )}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold"
                            disabled={isLoading || code.join("").length !== 6}
                        >
                            {
                                isLoading ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify & Continue
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )
                            }
                        </Button>
                        <div className="text-center">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleResend}
                                disabled={!canResend}
                                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            >
                                <RefreshCw className="mr-2 h-3 w-3" />
                                {canResend ? "Resend Code" : `Resend in ${timer}s`}
                            </Button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default function Verify() {
    return (
        <Suspense fallback={<ShipItHQLoader />}>
            <VerifyContent />
        </Suspense>
    )
}