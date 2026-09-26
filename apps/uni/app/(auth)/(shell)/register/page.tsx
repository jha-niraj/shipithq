"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import toast from "@repo/ui/components/ui/sonner";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import {
    AuthAlert, AuthDivider, AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, AuthLegal,
    AuthLegalNote, PasswordInput, PasswordRules, passwordIsStrong,
} from "@repo/ui/components/auth/auth-form";
import { SocialButtons, type SocialProvider } from "@repo/ui/components/auth/social-buttons";
import { signIn, signUp } from '@repo/auth/client';

/** This app's own legal pages, under app/(legal). */
const APP_LEGAL = { terms: "/terms", privacy: "/privacy" };

function SignUpForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
    const [error, setError] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError("Add your name");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address");
        if (!passwordIsStrong(password)) return setError("Please ensure your password meets all requirements");
        if (!agreedToTerms) return setError("Please agree to the Terms of Service and Privacy Policy");

        setIsLoading(true);
        setError("");
        try {
            // better-auth owns sign-up. The institution's name and the head's role
            // are collected in onboarding, the one place they are saved; the fields
            // that used to sit here were never sent anywhere (plan/auth AUTH-4).
            const normalised = email.trim().toLowerCase();
            const { error } = await signUp.email({ name: name.trim(), email: normalised, password });
            if (error) {
                setError(error.message || "An error occurred during registration");
                return;
            }
            // `sendVerificationOnSignUp` mails the code as part of this call.
            toast.success("Account created. Check your email for the verification code.");
            router.push(`/verify?email=${encodeURIComponent(normalised)}`);
        } catch (error: unknown) {
            console.error("Sign-up failed:", error);
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocial = async (provider: SocialProvider) => {
        setSocialPending(provider);
        setError("");
        try {
            await signIn.social({ provider, callbackURL: "/onboarding" });
        } catch (error: unknown) {
            console.error("Google sign-up failed:", error);
            setError("Google sign-up failed. Please try again.");
            setSocialPending(null);
        }
    };

    return (
        <>
            <AuthHeader
                title="Create your institution's workspace"
                description="For chancellors, principals, deans and registrars. Faculty and students join by invite."
            />
            <AuthAlert>{error}</AuthAlert>

            <SocialButtons providers={["google"]} pending={socialPending} disabled={isLoading} onSelect={(p) => void handleSocial(p)} />
            <AuthDivider>or sign up with email</AuthDivider>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <AuthField label="Full name" htmlFor="name">
                    <Input id="name" autoComplete="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                </AuthField>
                <AuthField label="Institution email" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </AuthField>
                <AuthField label="Password" htmlFor="password">
                    <PasswordInput id="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                    <PasswordRules password={password} />
                </AuthField>
                <AuthLegal hrefs={APP_LEGAL} checked={agreedToTerms} onCheckedChange={setAgreedToTerms} disabled={isLoading} />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading || !agreedToTerms}>
                    {isLoading ? <><InlineLoader size="sm" /> Creating workspace</> : "Create workspace"}
                </Button>
            </form>

            <AuthFootnote>
                Already have an account? <Link href="/signin">Sign in</Link>
            </AuthFootnote>
            <AuthLegalNote hrefs={APP_LEGAL} />
        </>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={3} />}>
            <SignUpForm />
        </Suspense>
    );
}
