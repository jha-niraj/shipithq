"use client"

import type React from "react";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, MailCheck, Wand2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import toast from '@repo/ui/components/ui/sonner';
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import {
    AuthDivider, AuthField, AuthFootnote, AuthFormSkeleton, AuthHeader, AuthNotice, OtpInput,
    PasswordInput, authLinkClass,
} from "@repo/ui/components/auth/auth-form";
import { SocialButtons, type SocialProvider } from "@repo/ui/components/auth/social-buttons";
import { signIn, emailOtp, useSession } from '@repo/auth/client';
import { isSafeCallback, onboardingUrlFor } from "@/lib/urls";
import { useAppContext } from "@/app/context/usercontext";
import { getAuthErrorMessage, shouldRedirectToVerification } from "@/lib/auth-errors";

const RESEND_COOLDOWN_SECONDS = 30;

/** Which of the three sign-in surfaces the form column is showing. */
type Mode = "password" | "magic" | "verify";

function SignInForm() {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<Mode>("password");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { email, setEmail, password, setPassword } = useAppContext();
    const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
    const [magicSent, setMagicSent] = useState(false);
    const router = useRouter();
    // Always /home by default: middleware bounces anyone who hasn't finished
    // onboarding to /onboarding. Same-origin paths only - an absolute callbackUrl
    // would let a mailed link hand the new session to an attacker's host.
    const rawCallback = searchParams?.get("callbackUrl");
    const callbackUrl = isSafeCallback(rawCallback) ? rawCallback : "/home";
    const { data: session } = useSession();

    // ── Inline verification (an unverified account tried to sign in) ──────────
    const [code, setCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (session) router.push(callbackUrl);
    }, [session, callbackUrl, router]);

    useEffect(() => {
        if (searchParams?.get("verified") === "true") toast.success("Email verified successfully! You can now sign in.");
        const err = searchParams?.get("error");
        if (err) toast.error(getAuthErrorMessage(err));
    }, [searchParams]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // `newUserCallbackURL` routes a first-time social sign-in to setup and everyone
    // else straight into the app - better-auth knows which of the two it just did.
    const handleSocial = async (provider: SocialProvider) => {
        setSocialPending(provider);
        try {
            await signIn.social({ provider, callbackURL: callbackUrl, newUserCallbackURL: onboardingUrlFor(callbackUrl) });
        } catch (error: unknown) {
            console.error(`${provider} sign-in failed:`, error);
            toast.error(`Failed to sign in with ${provider === "google" ? "Google" : "GitHub"}`);
            setSocialPending(null);
        }
    };

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    // ── Inline email verification ─────────────────────────────────────────────
    const sendVerificationCode = useCallback(async () => {
        try {
            const result = await emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "email-verification" });
            if (result.error) {
                toast.error(getAuthErrorMessage(result.error.code ?? result.error.message));
                return;
            }
            setCode("");
            setCooldown(RESEND_COOLDOWN_SECONDS);
            setMode("verify");
            toast.success("Your email isn't verified yet - we sent you a code");
        } catch (error: unknown) {
            console.error("Sending the verification code failed:", error);
            toast.error("Could not send a verification code. Please try again.");
        }
    }, [email]);

    // ── Password sign-in ──────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.trim()) return toast.error("Please enter your email address");
        if (!emailIsValid) return toast.error("Please enter a valid email address");
        if (!password) return toast.error("Please enter your password");
        if (password.length < 8) return toast.error("Password must be at least 8 characters");

        setIsSubmitting(true);
        try {
            const result = await signIn.email({ email: email.trim(), password, callbackURL: callbackUrl });
            if (result?.error) {
                const errCode = result.error.code ?? result.error.message ?? "";
                // An unverified account is not bounced to a separate page: mail a
                // fresh code and finish verification right here.
                if (shouldRedirectToVerification(errCode)) {
                    await sendVerificationCode();
                    return;
                }
                toast.error(getAuthErrorMessage(errCode));
                return;
            }
            toast.success("Welcome back!");
            router.push(callbackUrl);
        } catch (error: unknown) {
            console.error("Sign-in failed:", error);
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Magic link ────────────────────────────────────────────────────────────
    // better-auth mails a URL to its own verify endpoint: clicking it sets the
    // session cookie and 302s to `callbackURL`. An unknown email signs up (the
    // click proves ownership) and is sent to /onboarding.
    const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!emailIsValid) return toast.error("Please enter a valid email address");
        setIsSubmitting(true);
        try {
            const result = await signIn.magicLink({
                email: email.trim().toLowerCase(),
                callbackURL: callbackUrl,
                newUserCallbackURL: onboardingUrlFor(callbackUrl),
                // better-auth appends ?error=<code> here, which the effect above toasts.
                errorCallbackURL: "/signin",
            });
            if (result?.error) {
                toast.error(getAuthErrorMessage(result.error.code ?? result.error.message));
                return;
            }
            setMagicSent(true);
            setCooldown(RESEND_COOLDOWN_SECONDS);
            toast.success("Check your inbox for the sign-in link");
        } catch (error: unknown) {
            console.error("Sending the sign-in link failed:", error);
            toast.error("Could not send the link. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const verify = useCallback(
        async (otp: string) => {
            if (!/^\d{6}$/.test(otp) || isVerifying) return;
            setIsVerifying(true);
            try {
                const result = await emailOtp.verifyEmail({ email: email.trim().toLowerCase(), otp });
                if (result.error) {
                    toast.error(getAuthErrorMessage(result.error.code ?? result.error.message));
                    setCode("");
                    return;
                }
                // verifyEmail mints the session, so we're signed in already.
                toast.success("Email verified - welcome back!");
                router.push(callbackUrl);
            } catch (error: unknown) {
                console.error("Verifying the code failed:", error);
                toast.error("Could not verify the code. Please try again.");
            } finally {
                setIsVerifying(false);
            }
        },
        [email, isVerifying, router, callbackUrl],
    );

    const registerUrl = callbackUrl !== '/home'
        ? "/register?callbackUrl=" + encodeURIComponent(callbackUrl)
        : "/register";

    const emailField = (
        <AuthField label="Email address" htmlFor="email">
            <Input
                type="email"
                id="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setMagicSent(false); }}
                disabled={isSubmitting}
            />
        </AuthField>
    );

    if (mode === "verify") {
        return (
            <div key="verify" className="auth-enter">
                <AuthHeader
                    icon={<MailCheck className="size-5" />}
                    title="Verify your email"
                    description={<>Enter the 6-digit code we sent to <span className="font-medium text-neutral-900 dark:text-white">{email}</span>.</>}
                />
                <div className="space-y-5">
                    <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={isVerifying} autoFocus />
                    <Button type="button" size="lg" className="w-full" onClick={() => void verify(code)} disabled={isVerifying || !/^\d{6}$/.test(code)}>
                        {isVerifying ? <><InlineLoader size="sm" /> Verifying</> : "Verify and sign in"}
                    </Button>
                </div>
                <AuthFootnote>
                    Didn&apos;t get it?{" "}
                    <button type="button" onClick={() => void sendVerificationCode()} disabled={cooldown > 0} className={authLinkClass}>
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                </AuthFootnote>
                <AuthFootnote>
                    <button type="button" onClick={() => setMode("password")} className="inline-flex cursor-pointer items-center gap-1.5">
                        <ArrowLeft className="size-4" /> Back to sign in
                    </button>
                </AuthFootnote>
            </div>
        );
    }

    return (
        <div key={mode} className="auth-enter">
            <AuthHeader
                title="Welcome back"
                description={mode === "magic" ? "We'll email you a link that signs you straight in." : "Sign in to pick up where you left off."}
            />

            <SocialButtons providers={["google", "github"]} pending={socialPending} disabled={isSubmitting} onSelect={(p) => void handleSocial(p)} />

            <AuthDivider>or with email</AuthDivider>

            {mode === "magic" ? (
                <form className="space-y-5" onSubmit={handleMagicLink} noValidate>
                    {emailField}
                    {magicSent && (
                        <AuthNotice>Link sent. Open it on this device and you&apos;ll be signed in. It expires in 10 minutes.</AuthNotice>
                    )}
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !emailIsValid || cooldown > 0}>
                        {isSubmitting
                            ? <><InlineLoader size="sm" /> Sending link</>
                            : cooldown > 0 ? `Resend in ${cooldown}s` : magicSent ? "Send another link" : "Email me a sign-in link"}
                    </Button>
                </form>
            ) : (
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                    {emailField}
                    <AuthField
                        label="Password"
                        htmlFor="password"
                        action={<Link href="/forgotpassword" className={authLinkClass}>Forgot password?</Link>}
                    >
                        <PasswordInput
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </AuthField>
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !email.trim() || !password}>
                        {isSubmitting ? <><InlineLoader size="sm" /> Signing in</> : "Sign in"}
                    </Button>
                </form>
            )}

            <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full gap-2"
                onClick={() => { setMode(mode === "magic" ? "password" : "magic"); setMagicSent(false); }}
            >
                {mode === "magic"
                    ? <><KeyRound className="size-4" /> Use a password instead</>
                    : <><Wand2 className="size-4" /> Email me a sign-in link</>}
            </Button>

            <AuthFootnote>
                Don&apos;t have an account? <Link href={registerUrl}>Create one</Link>
            </AuthFootnote>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<AuthFormSkeleton fields={2} />}>
            <SignInForm />
        </Suspense>
    );
}
