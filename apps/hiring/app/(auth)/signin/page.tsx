"use client"

import type React from "react";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";
import { Logo } from "@repo/ui/components/logo"
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Eye, EyeOff, ArrowRight
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { signIn, useSession } from '@repo/auth/client';
import toast from '@repo/ui/components/ui/sonner'
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";

function SearchParamsLoader() {
    const searchParams = useSearchParams();
    return <SignInForm searchParams={searchParams} />;
}

interface SignInFormProps {
    searchParams: ReturnType<typeof useSearchParams>;
}

function SignInForm({ searchParams }: SignInFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    // Only a path inside this app: an absolute or protocol-relative URL here
    // would be an open redirect. There is no /dashboard; Home is the landing.
    const requested = searchParams?.get("callbackUrl") ?? "";
    const callbackUrl = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/home";
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (session && !isPending) {
            router.push(callbackUrl);
        }
    }, [session, isPending, callbackUrl, router]);

    // Show success message if user just verified their email
    useEffect(() => {
        const verified = searchParams?.get("verified");
        if (verified === "true") {
            toast.success("Email verified! You can now sign in.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await signIn.email({
                email,
                password,
                callbackURL: callbackUrl
            });

            if (result?.error) {
                toast.error("Invalid email or password. Please try again.");
                return;
            }

            if (result?.data) {
                toast.success("Welcome back!");
                router.push(callbackUrl);
            } else {
                toast.error("Sign in failed. Please try again.");
            }
        } catch (err: unknown) {
            console.error("Signin error:", err);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const registerUrl = callbackUrl && callbackUrl !== '/home'
        ? "/register?callbackUrl=" + encodeURIComponent(callbackUrl)
        : "/register";

    return (
        <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-neutral-950 p-4 w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
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
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 block">
                            Authentication
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Access Your Workspace
                        </h1>
                    </div>
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                                Work Email
                            </Label>
                            <Input
                                type="email"
                                id="email"
                                placeholder="you@company.com"
                                className={cn(
                                    "h-12 rounded-xl bg-white dark:bg-neutral-950",
                                    "border-neutral-200 dark:border-neutral-800",
                                    "focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white",
                                    "text-neutral-900 dark:text-white placeholder:text-neutral-400"
                                )}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                                    Password
                                </Label>
                                <Link
                                    href="/forgotpassword"
                                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                >
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="••••••••"
                                    className={cn(
                                        "h-12 rounded-xl bg-white dark:bg-neutral-950 pr-12",
                                        "border-neutral-200 dark:border-neutral-800",
                                        "focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white",
                                        "text-neutral-900 dark:text-white placeholder:text-neutral-400"
                                    )}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold transition-all"
                        >
                            {
                                isSubmitting ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Initialize Session
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )
                            }
                        </Button>
                    </form>
                    <p className="text-center text-neutral-500 text-sm mt-6">
                        New to the platform?{" "}
                        <Link
                            href={registerUrl}
                            className="text-neutral-900 dark:text-white font-semibold hover:underline"
                        >
                            Register Company
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <ShipItHQLoader />
        }>
            <SearchParamsLoader />
        </Suspense>
    );
}