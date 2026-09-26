"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Gift, MailCheck, Wand2 } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import toast from "@repo/ui/components/ui/sonner";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import {
    AuthAlert, AuthDivider, AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, AuthLegal,
    AuthLegalNote, AuthNotice, OtpInput, PasswordInput, PasswordRules, authLinkClass, passwordIsStrong,
} from "@repo/ui/components/auth/auth-form";
import { SocialButtons, type SocialProvider } from "@repo/ui/components/auth/social-buttons";
import { signIn, signUp, emailOtp } from "@repo/auth/client";
import { isSafeCallback, onboardingUrlFor } from "@/lib/urls";
import { useAppContext } from "@/app/context/usercontext";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { finalizeSignup } from "@/actions/(auth)/auth/signup.actions";

const RESEND_COOLDOWN_SECONDS = 30;

type Phase = "details" | "magic" | "otp";

function SignUpForm() {
    const [phase, setPhase] = useState<Phase>("details");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
    const [isMagicLoading, setIsMagicLoading] = useState(false);
    const [magicSent, setMagicSent] = useState(false);
    const [error, setError] = useState("");
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setEmail: setContextEmail } = useAppContext();

    // ── OTP step state ────────────────────────────────────────────────────────
    const [code, setCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        const ref = searchParams.get("ref");
        if (ref) setReferralCode(ref);

        // `callbackUrl` is what the sign-in page and the middleware send, and what
        // the marketing site's pricing CTAs use to resume checkout after signup.
        // `sso_callback` is the older name kept working for existing links.
        const callback = searchParams.get("callbackUrl") ?? searchParams.get("sso_callback");
        if (callback && isSafeCallback(callback)) {
            sessionStorage.setItem("sso_callback", callback);
        }
    }, [searchParams]);

    // Same predicate sign-in uses, so the two magic panels accept the same addresses.
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isPasswordValid = passwordIsStrong(password);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // ── Step 1: create the account ────────────────────────────────────────────
    // better-auth creates the (unverified) user and the emailOTP plugin mails the
    // code from the same request, so we switch to the OTP step right away.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError("Add your name");
        if (!emailIsValid) return setError("Enter a valid email address");
        if (!isPasswordValid) return setError("Please ensure your password meets all requirements");
        if (!agreedToTerms) return setError("Please agree to the Terms of Service and Privacy Policy");

        setIsLoading(true);
        setError("");
        try {
            const result = await signUp.email({ name: name.trim(), email: email.trim().toLowerCase(), password });
            if (result.error) {
                setError(getAuthErrorMessage(result.error.code ?? result.error.message));
                return;
            }
            setContextEmail(email.trim().toLowerCase());
            setCode("");
            setCooldown(RESEND_COOLDOWN_SECONDS);
            setPhase("otp");
            toast.success("We sent a 6-digit code to your email");
        } catch (error: unknown) {
            console.error("Sign-up failed:", error);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: verify the OTP ────────────────────────────────────────────────
    // `verifyEmail` marks the address verified AND mints the session, so a
    // verified user lands on onboarding already signed in.
    const verify = useCallback(
        async (otp: string) => {
            if (!/^\d{6}$/.test(otp) || isVerifying) return;
            setIsVerifying(true);
            setError("");
            try {
                const result = await emailOtp.verifyEmail({ email: email.trim().toLowerCase(), otp });
                if (result.error) {
                    setError(getAuthErrorMessage(result.error.code ?? result.error.message));
                    setCode("");
                    return;
                }
                // Credit the referrer / log the signup now that a session exists.
                await finalizeSignup(referralCode);
                toast.success("Email verified - let's set up your profile");
                // The destination rides in the URL (and stays parked in sessionStorage
                // as a fallback); onboarding hands it back (plan/ideas IDEA-1).
                router.push(onboardingUrlFor(sessionStorage.getItem("sso_callback")));
            } catch (error: unknown) {
                console.error("Verifying the sign-up code failed:", error);
                setError("Could not verify the code. Please try again.");
            } finally {
                setIsVerifying(false);
            }
        },
        [email, isVerifying, referralCode, router],
    );

    const handleResend = async () => {
        if (cooldown > 0 || isResending) return;
        setIsResending(true);
        try {
            const result = await emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "email-verification" });
            if (result.error) {
                toast.error(getAuthErrorMessage(result.error.code ?? result.error.message));
                return;
            }
            setCode("");
            setCooldown(RESEND_COOLDOWN_SECONDS);
            toast.success("A new code is on its way");
        } catch (error: unknown) {
            console.error("Resending the sign-up code failed:", error);
            toast.error("Failed to resend the code");
        } finally {
            setIsResending(false);
        }
    };

    // ── Sign up with a magic link (no password) ───────────────────────────────
    // A clicked link proves the address, so better-auth creates the account already
    // verified. `newUserCallbackURL` routes a brand-new account to onboarding.
    const handleMagicSignUp = async (e?: React.FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!emailIsValid) return setError("Enter a valid email address.");
        setIsMagicLoading(true);
        setError("");
        try {
            const ssoCallback = sessionStorage.getItem("sso_callback");
            const result = await signIn.magicLink({
                email: email.trim().toLowerCase(),
                callbackURL: ssoCallback || "/home",
                newUserCallbackURL: onboardingUrlFor(ssoCallback),
                errorCallbackURL: "/signin",
            });
            if (result?.error) {
                setError(getAuthErrorMessage(result.error.code ?? result.error.message));
                return;
            }
            setMagicSent(true);
            toast.success("Check your inbox for your sign-up link");
        } catch (error: unknown) {
            console.error("Sending the sign-up link failed:", error);
            setError("Could not send the link. Please try again.");
        } finally {
            setIsMagicLoading(false);
        }
    };

    // ── Social ─────────────────────────────────────────────────────────────────
    // better-auth knows whether the callback created the account, so
    // `newUserCallbackURL` routes first-timers to setup. Middleware re-checks
    // `onboardingCompleted` for anyone who bailed mid-setup.
    const handleSocial = async (provider: SocialProvider) => {
        setSocialPending(provider);
        setError("");
        try {
            const ssoCallback = sessionStorage.getItem("sso_callback");
            await signIn.social({ provider, callbackURL: ssoCallback || "/home", newUserCallbackURL: onboardingUrlFor(ssoCallback) });
        } catch (error: unknown) {
            console.error(`${provider} sign-up failed:`, error);
            setError(`${provider === "google" ? "Google" : "GitHub"} sign-up failed. Please try again.`);
            setSocialPending(null);
        }
    };

    const signInFootnote = (
        <AuthFootnote>
            Already have an account? <Link href="/signin">Sign in</Link>
        </AuthFootnote>
    );

    if (phase === "otp") {
        return (
            <div key="otp" className="auth-enter">
                <AuthHeader
                    icon={<MailCheck className="size-5" />}
                    title="Check your email"
                    description={<>We sent a 6-digit code to <span className="font-medium text-neutral-900 dark:text-white">{email}</span>.</>}
                />
                <AuthAlert>{error}</AuthAlert>
                <div className="space-y-5">
                    <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={isVerifying} autoFocus />
                    <Button type="button" size="lg" className="w-full" onClick={() => void verify(code)} disabled={isVerifying || !/^\d{6}$/.test(code)}>
                        {isVerifying ? <><InlineLoader size="sm" /> Verifying</> : "Verify and continue"}
                    </Button>
                </div>
                <AuthFootnote>
                    Didn&apos;t get the code?{" "}
                    <button type="button" onClick={() => void handleResend()} disabled={cooldown > 0 || isResending} className={authLinkClass}>
                        {isResending ? "Sending" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                </AuthFootnote>
                <AuthFootnote>
                    <button type="button" onClick={() => { setPhase("details"); setError(""); }} className="inline-flex cursor-pointer items-center gap-1.5">
                        <ArrowLeft className="size-4" /> Use a different email
                    </button>
                </AuthFootnote>
            </div>
        );
    }

    if (phase === "magic") {
        return (
            <div key="magic" className="auth-enter">
                <AuthHeader
                    title="Sign up without a password"
                    description="We'll email you a link that creates your account and signs you in."
                />
                <AuthAlert>{error}</AuthAlert>
                <form onSubmit={handleMagicSignUp} className="space-y-5" noValidate>
                    <AuthField label="Email address" htmlFor="magic-email">
                        <Input
                            id="magic-email"
                            type="email"
                            autoFocus
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setMagicSent(false); }}
                        />
                    </AuthField>
                    {magicSent && (
                        <AuthNotice>
                            Link sent. Open it on this device and your account is created and signed in. It expires in 10 minutes.
                        </AuthNotice>
                    )}
                    <Button type="submit" size="lg" className="w-full" disabled={isMagicLoading || !emailIsValid}>
                        {isMagicLoading ? <><InlineLoader size="sm" /> Sending link</> : magicSent ? "Send another link" : "Email me a sign-up link"}
                    </Button>
                </form>
                <AuthLegalNote />
                <AuthFootnote>
                    <button type="button" onClick={() => { setPhase("details"); setMagicSent(false); setError(""); }} className="inline-flex cursor-pointer items-center gap-1.5">
                        <ArrowLeft className="size-4" /> Back to sign up
                    </button>
                </AuthFootnote>
            </div>
        );
    }

    return (
        <div key="details" className="auth-enter">
            <AuthHeader title="Create your account" description="Start building with ShipItHQ in under a minute." />

            {referralCode && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-neutral-200 px-3.5 py-2.5 dark:border-neutral-800">
                    <Gift className="size-4 shrink-0 text-neutral-900 dark:text-white" />
                    <p className="text-[13px] text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium text-neutral-900 dark:text-white">Referral applied.</span> You get 100 bonus credits when you sign up.
                    </p>
                </div>
            )}

            <AuthAlert>{error}</AuthAlert>

            <SocialButtons providers={["google", "github"]} pending={socialPending} disabled={isLoading} onSelect={(p) => void handleSocial(p)} />

            <AuthDivider>or sign up with email</AuthDivider>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <AuthField label="Full name" htmlFor="name">
                    <Input id="name" autoComplete="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                </AuthField>
                <AuthField label="Email address" htmlFor="email">
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                </AuthField>
                <AuthField label="Password" htmlFor="password">
                    <PasswordInput id="password" autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                    <PasswordRules password={password} />
                </AuthField>
                <AuthLegal checked={agreedToTerms} onCheckedChange={setAgreedToTerms} disabled={isLoading} />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading || !agreedToTerms}>
                    {isLoading ? <><InlineLoader size="sm" /> Creating account</> : "Create account"}
                </Button>
            </form>

            <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full gap-2"
                onClick={() => { setError(""); setMagicSent(false); setPhase("magic"); }}
            >
                <Wand2 className="size-4" /> Sign up without a password
            </Button>

            {signInFootnote}
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={3} />}>
            <SignUpForm />
        </Suspense>
    );
}
