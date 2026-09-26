"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import toast from "@repo/ui/components/ui/sonner";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import {
    AuthAlert, AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, AuthLegal, PasswordInput,
    PasswordRules, passwordIsStrong,
} from "@repo/ui/components/auth/auth-form";
import { signUp } from '@repo/auth/client';
import { checkWorkEmail } from "@repo/auth/work-email";

/** This app's own legal pages, under app/(legal). */
const APP_LEGAL = { terms: "/terms", privacy: "/privacy" };

function SignUpForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const router = useRouter();

    // Capture inviteBy from URL (university referral), forwarded to verify and onboarding.
    const [inviteBy, setInviteBy] = useState<string | null>(null);
    useEffect(() => {
        const invite = new URLSearchParams(window.location.search).get('inviteBy');
        if (invite) setInviteBy(invite);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError("Add your name");
        if (!passwordIsStrong(password)) return setError("Please ensure your password meets all requirements");
        if (!agreedToTerms) return setError("Please agree to the Terms of Service and Privacy Policy");

        setIsLoading(true);
        setError("");
        try {
            // better-auth owns sign-up. Register asks only for what an account needs;
            // the company is named in onboarding, the one place it is saved (HA-19).
            const normalisedEmail = email.trim().toLowerCase();
            // Early feedback only: the hiring auth route enforces the same rule on
            // the server (plan/hiring-app HA-4).
            const workEmail = checkWorkEmail(normalisedEmail);
            if (!workEmail.ok) {
                setError(workEmail.message);
                return;
            }
            const { error } = await signUp.email({ name: name.trim(), email: normalisedEmail, password });
            if (error) {
                setError(error.message || "An error occurred during registration");
                return;
            }
            // `sendVerificationOnSignUp` mails the code as part of this call.
            toast.success("Account created. Check your email for the verification code.");
            const verifyUrl = inviteBy
                ? `/verify?email=${encodeURIComponent(normalisedEmail)}&inviteBy=${encodeURIComponent(inviteBy)}`
                : `/verify?email=${encodeURIComponent(normalisedEmail)}`;
            router.push(verifyUrl);
        } catch (error: unknown) {
            console.error("Sign-up failed:", error);
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AuthHeader title="Create your company's workspace" description="Use your work email. Personal addresses can't register a company." />

            <div className="mb-5 flex items-start gap-3 rounded-lg border border-neutral-200 px-3.5 py-3 dark:border-neutral-800">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neutral-900 dark:text-white" />
                <p className="text-[13px] leading-5 text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium text-neutral-900 dark:text-white">You&apos;ll be its Owner.</span>{" "}
                    Joining a company that&apos;s already here? Ask your admin for an invite instead.
                </p>
            </div>

            <AuthAlert>{error}</AuthAlert>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <AuthField label="Full name" htmlFor="name">
                    <Input id="name" autoComplete="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                </AuthField>
                <AuthField label="Work email" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
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
