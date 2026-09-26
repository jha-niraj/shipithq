"use client"

import type React from "react";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import toast from '@repo/ui/components/ui/sonner';
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import {
    AuthDivider, AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, PasswordInput, authLinkClass,
} from "@repo/ui/components/auth/auth-form";
import { SocialButtons, type SocialProvider } from "@repo/ui/components/auth/social-buttons";
import { signIn, useSession } from '@repo/auth/client';

function SignInForm() {
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
    const router = useRouter();
    // Only a path inside this app: an absolute or protocol-relative URL here
    // would be an open redirect (it was taken as-is before plan/auth AUTH-4).
    const requested = searchParams?.get("callbackUrl") ?? "";
    const callbackUrl = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (session && !isPending) router.push(callbackUrl);
    }, [session, isPending, callbackUrl, router]);

    useEffect(() => {
        if (searchParams?.get("verified") === "true") toast.success("Email verified! You can now sign in.");
    }, [searchParams]);

    const handleSocial = async (provider: SocialProvider) => {
        setSocialPending(provider);
        try {
            await signIn.social({ provider, callbackURL: callbackUrl });
        } catch (error: unknown) {
            console.error("Google sign-in failed:", error);
            toast.error("Failed to sign in with Google");
            setSocialPending(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.trim() || !password) return toast.error("Enter your email and password");
        setIsSubmitting(true);
        try {
            const result = await signIn.email({ email: email.trim(), password, callbackURL: callbackUrl });
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
        } catch (error: unknown) {
            console.error("Sign-in failed:", error);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const registerUrl = callbackUrl !== '/dashboard'
        ? "/register?callbackUrl=" + encodeURIComponent(callbackUrl)
        : "/register";

    return (
        <>
            <AuthHeader title="Welcome back" description="Sign in to your institution's workspace." />

            <SocialButtons providers={["google"]} pending={socialPending} disabled={isSubmitting} onSelect={(p) => void handleSocial(p)} />
            <AuthDivider>or with email</AuthDivider>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <AuthField label="Email address" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
                </AuthField>
                <AuthField label="Password" htmlFor="password" action={<Link href="/forgotpassword" className={authLinkClass}>Forgot password?</Link>}>
                    <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} />
                </AuthField>
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !email.trim() || !password}>
                    {isSubmitting ? <><InlineLoader size="sm" /> Signing in</> : "Sign in"}
                </Button>
            </form>

            <AuthFootnote>
                New here? <Link href={registerUrl}>Register your institution</Link>
            </AuthFootnote>
        </>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={2} />}>
            <SignInForm />
        </Suspense>
    );
}
