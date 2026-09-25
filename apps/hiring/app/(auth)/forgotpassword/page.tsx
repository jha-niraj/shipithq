"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Button } from "@repo/ui/components/ui/button";
import { Logo } from "@repo/ui/components/logo"
import { AuthVisual } from "@repo/ui/components/auth-visual";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import React, { useState } from "react";
import toast from "@repo/ui/components/ui/sonner";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, KeyRound, Mail, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { emailOtp } from "@repo/auth/client";
import { cn } from "@repo/ui/lib/utils";

export default function ForgotPassword() {
    const [email, setEmail] = useState<string>("");
    const [sending, setIsSending] = useState<boolean>(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error("Please enter your email");

        setIsSending(true);

        try {
            // better-auth owns the reset code end to end. This used to POST to a
            // hand-rolled /api/forgotpassword route that wrote an OTP onto
            // `users.resetOTP`, paired with an /api/resetpassword route that
            // hashed the new password into `users.hashedPassword` -- a column
            // better-auth never reads. Credential passwords live on the `account`
            // row, so the flow reported success and changed nothing.
            const { error } = await emailOtp.requestPasswordReset({ email: email.trim().toLowerCase() });

            if (error) {
                toast.error(error.message || 'Error sending reset code');
                return;
            }

            // Deliberately not branching on "no such user": better-auth answers
            // identically either way, so the page cannot be used to probe which
            // addresses have accounts.
            toast.success('If that address has an account, a reset code is on its way');
            router.push(`/resetpassword?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        } catch (error: unknown) {
            console.error("Error sending password reset email:", error);
            toast.error('Failed to send reset email. Please try again.');
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="min-h-dvh w-full bg-white dark:bg-neutral-950 flex flex-col items-center justify-center relative p-4">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Replaces the static 40px grid. The grid read as a form field
                    behind a card; a slow monochrome motif gives the panel depth
                    without competing with the form. Held well back in opacity and
                    CSS-animated, so a theme switch only recolours it. */}
                <AuthVisual
                    variant="funnel"
                    className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 text-neutral-900/[0.07] dark:text-white/[0.07]"
                />
            </div>

            {/* CSS entrance instead of framer-motion: this was the only motion
                usage on the route, so dropping it takes motion-dom (and the
                next/process.js polyfill it pulls in) out of this route's client
                graph entirely. See .auth-enter in globals.css. */}
            <div className="auth-enter w-full max-w-md relative z-10">
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
                            <KeyRound className="w-6 h-6 text-neutral-900 dark:text-white" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            Account Recovery
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Reset Access Credentials
                        </h1>
                        <p className="text-sm text-neutral-500 mt-2">
                            Enter your email to receive a recovery code.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-neutral-500" htmlFor="email">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                <Input
                                    id="email"
                                    className={cn(
                                        "h-12 pl-11 rounded-xl bg-white dark:bg-neutral-950",
                                        "border-neutral-200 dark:border-neutral-800",
                                        "focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                                    )}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    type="email"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold"
                            type="submit"
                            disabled={sending}
                        >
                            {
                                sending ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Send Recovery Code
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )
                            }
                        </Button>
                    </form>
                    <div className="mt-6 text-center">
                        <Link
                            href="/signin"
                            className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}