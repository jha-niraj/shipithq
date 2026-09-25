'use client';

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { AuthVisual } from "@repo/ui/components/auth-visual";
import { Logo } from "@repo/ui/components/logo"
import {
    FormEvent, useState, useRef, useEffect, JSX
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Button } from "@repo/ui/components/ui/button";
import {
    RefreshCw, CheckCircle2, Lock, ArrowRight
} from "lucide-react";
import toast from '@repo/ui/components/ui/sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { emailOtp } from '@repo/auth/client';
import { cn } from "@repo/ui/lib/utils";

const ResetPassword = (): JSX.Element | null => {
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [email, setEmail] = useState<string | null>(null);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        } else {
            router.push('/forgotpassword');
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (timer > 0 && !canResend) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0 && !canResend) {
            setCanResend(true);
        }
    }, [timer, canResend]);

    const handleOtpChange = (index: number, value: string) => {
        if (value && !/^\d+$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs[index + 1]?.current?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs[index - 1]?.current?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").trim();
        if (/^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split("");
            setOtp(digits);
            inputRefs[5]?.current?.focus();
        }
    };

    const handleResend = async () => {
        if (!email) return;
        try {
            const { error } = await emailOtp.requestPasswordReset({ email });
            if (error) {
                toast.error(error.message || "Failed to resend code");
                return;
            }
            toast.success("Reset code sent!");
            setCanResend(false);
            setTimer(30);
            setOtp(["", "", "", "", "", ""]);
        } catch {
            toast.error("Failed to resend code");
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error("Session invalid. Restart process.");
        if (password !== confirmPassword) return toast.error('Passwords do not match');
        // Matches `minPasswordLength` in packages/auth/src/auth.ts. This used to
        // say 6, so a 6- or 7-character password passed here and was then
        // rejected by the server with a less helpful message.
        if (password.length < 8) return toast.error('Password too short (min 8 characters)');
        if (otp.join("").length !== 6) return toast.error("Enter full 6-digit code");

        setIsLoading(true);
        try {
            // Writes the password where better-auth actually looks (the `account`
            // row). The previous /api/resetpassword route hashed it into
            // `users.hashedPassword`, which better-auth never reads -- so it
            // always reported success while leaving the old password in force.
            const { error } = await emailOtp.resetPassword({
                email,
                otp: otp.join(""),
                password,
            });

            if (error) {
                toast.error(error.message || "Reset failed");
                setOtp(["", "", "", "", "", ""]);
                inputRefs[0]?.current?.focus();
                return;
            }

            setIsSuccess(true);
            toast.success("Password reset successfully!");
            setTimeout(() => router.push('/signin'), 2000);
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
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
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Access Restored</h2>
                    <p className="text-neutral-500">Redirecting to login...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh w-full bg-white dark:bg-neutral-950 flex flex-col items-center justify-center relative p-4">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Replaces the static 40px grid. The grid read as a form field
                    behind a card; a slow monochrome motif gives the panel depth
                    without competing with the form. Held well back in opacity and
                    CSS-animated, so a theme switch only recolours it. */}
                <AuthVisual
                    variant="terminal"
                    className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 text-neutral-900/[0.07] dark:text-white/[0.07]"
                />
            </div>

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
                            <Lock className="w-6 h-6 text-neutral-900 dark:text-white" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            Security Update
                        </span>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Set New Password</h2>
                        <p className="text-sm text-neutral-500 mt-2">
                            Code sent to <span className="font-mono text-neutral-900 dark:text-white">{email}</span>
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                                Verification Code
                            </Label>
                            <div className="flex justify-between gap-2">
                                {
                                    otp.map((digit, index) => (
                                        <Input
                                            key={index}
                                            ref={inputRefs[index]}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
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
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase tracking-wider text-neutral-500" htmlFor="password">
                                    New Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-xl bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase tracking-wider text-neutral-500" htmlFor="confirmPassword">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-12 rounded-xl bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold"
                            disabled={isLoading || otp.join("").length !== 6}
                        >
                            {
                                isLoading ? (
                                    <InlineLoader size="sm" />
                                ) : (
                                    <>
                                        Reset Password
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
    );
};

export default ResetPassword;