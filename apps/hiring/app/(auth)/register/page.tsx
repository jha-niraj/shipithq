"use client";

import { useState, useEffect, Suspense } from "react";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { ShipItHQLoader } from "@repo/ui/components/ui/shipithq-loader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from '@repo/auth/client';
import { checkWorkEmail } from "@repo/auth/work-email";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, EyeOff, Check, X, Building2, ArrowRight, ShieldCheck,
    Users, Info
} from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Label } from "@repo/ui/components/ui/label";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select";
import toast from "@repo/ui/components/ui/sonner";

// ============================================
// TYPES
// ============================================

type FounderRole = "FOUNDER" | "CEO" | "CTO" | "COO" | "OTHER_EXECUTIVE";

const FOUNDER_ROLES: { value: FounderRole; label: string }[] = [
    { value: "FOUNDER", label: "Founder" },
    { value: "CEO", label: "CEO (Chief Executive Officer)" },
    { value: "CTO", label: "CTO (Chief Technology Officer)" },
    { value: "COO", label: "COO (Chief Operating Officer)" },
    { value: "OTHER_EXECUTIVE", label: "Other Executive/Co-Founder" },
];

function SignUpForm() {
    const [companyName, setCompanyName] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [founderRole, setFounderRole] = useState<FounderRole>("FOUNDER");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const router = useRouter();
    
    // Capture inviteBy from URL (university referral)
    const [inviteBy, setInviteBy] = useState<string | null>(null);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invite = params.get('inviteBy');
        if (invite) {
            setInviteBy(invite);
        }
    }, []);

    // Password validation states
    const [hasCapital, setHasCapital] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);
    const [hasSpecial, setHasSpecial] = useState(false);
    const [hasMinLength, setHasMinLength] = useState(false);

    useEffect(() => {
        setHasCapital(/[A-Z]/.test(password));
        setHasNumber(/[0-9]/.test(password));
        setHasSpecial(/[!@#$%^&*(),.?":{}|<>]/.test(password));
        setHasMinLength(password.length >= 8);
    }, [password]);

    const isPasswordValid = hasCapital && hasNumber && hasSpecial && hasMinLength;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!agreedToTerms) {
            setError("Please agree to the Terms of Service and Privacy Policy");
            return;
        }

        if (!isPasswordValid) {
            setError("Please ensure your password meets all requirements");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // better-auth owns sign-up now. The old POST to /api/auth/register
            // inserted a `users` row with a bcrypt hash in `users.hashedPassword`
            // and never created the `account` row that better-auth checks at
            // sign-in, so an email+password account could be registered and
            // verified and then never sign in. That route also silently dropped
            // `companyName`/`founderRole` (it only destructured name/email/
            // password), which is why they are not passed here either - onboarding
            // is where those are actually collected and persisted.
            const normalisedEmail = email.trim().toLowerCase();
            // Early feedback only: the hiring auth route enforces the same rule on
            // the server (plan/hiring-app HA-4).
            const workEmail = checkWorkEmail(normalisedEmail);
            if (!workEmail.ok) {
                setError(workEmail.message);
                return;
            }
            const { error } = await signUp.email({
                name,
                email: normalisedEmail,
                password,
            });

            if (error) {
                setError(error.message || "An error occurred during registration");
                return;
            }

            // `sendVerificationOnSignUp` mails the code as part of this call, so
            // the verify page has one waiting for it.
            toast.success("Account created! Please check your email for verification code.");
            // Forward inviteBy to verify page so it can be passed to onboarding
            const verifyUrl = inviteBy
                ? `/verify?email=${encodeURIComponent(normalisedEmail)}&inviteBy=${encodeURIComponent(inviteBy)}`
                : `/verify?email=${encodeURIComponent(normalisedEmail)}`;
            router.push(verifyUrl);
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // Full-bleed split (HA-9): both halves reach the viewport edges. A max-w-7xl
        // here left a white gutter beside the dark panel on wide screens in light mode.
        <div className="min-h-dvh flex w-full bg-white dark:bg-neutral-950">
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center bg-neutral-950 overflow-hidden">
                <div className="relative z-10 px-12 max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-black" />
                            </div>
                            <span className="text-2xl font-bold text-white">ShipItHQ Hiring</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
                            Deploy Your Hiring <br />
                            <span className="text-neutral-500">Infrastructure.</span>
                        </h1>
                        <p className="text-neutral-400 text-lg mb-8">
                            Initialize your workspace and gain access to pre-vetted engineering resources.
                        </p>
                        {/* The panel is dark in both themes, so its ink is constant too. */}
                        <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 mb-6">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-neutral-300 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-neutral-100 font-medium text-sm">You&apos;ll be its Owner</p>
                                    <p className="text-neutral-400 text-xs mt-1">
                                        Whoever creates a company&apos;s workspace becomes its Owner, and can invite the rest of the team and decide what each role can do.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 rounded-xl border border-neutral-800 bg-neutral-900">
                            <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-neutral-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-neutral-100">
                                        Not a founder?
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        If your company is already on ShipItHQ, ask your admin for an invite. It arrives by email and signs you straight in to your team.
                                    </p>
                                    <Link
                                        href="/signin"
                                        className="inline-flex items-center gap-1 text-xs text-white font-semibold hover:underline mt-2"
                                    >
                                        Go to Sign In
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white dark:text-black" />
                        </div>
                        <span className="text-lg font-bold text-neutral-900 dark:text-white">
                            ShipItHQ <span className="text-neutral-500 font-mono font-normal">HIRING</span>
                        </span>
                    </div>
                    <div className="lg:hidden p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/20 mb-6">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-neutral-800 dark:text-neutral-100 mt-0.5 shrink-0" />
                            <p className="text-neutral-800 dark:text-neutral-200 text-xs">
                                <strong>You&apos;ll be the Owner.</strong> Joining a company that is already here? Ask your admin for an invite instead.
                            </p>
                        </div>
                    </div>
                    <div className="text-center mb-8">
                        <span className="text-[10px]  tracking-widest text-neutral-500 mb-2 block">
                            Company Registration
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Create your company&apos;s workspace
                        </h2>
                        <p className="text-sm text-neutral-500 mt-2">
                            You&apos;ll be its Owner and can invite your team
                        </p>
                    </div>
                    <AnimatePresence>
                        {
                            error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"
                                >
                                    <p className="text-neutral-600 dark:text-neutral-400 text-sm text-center">{error}</p>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName" className="text-xs  tracking-wider text-neutral-500">
                                    Company Name
                                </Label>
                                <Input
                                    id="companyName"
                                    type="text"
                                    placeholder="Acme Inc."
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="founderRole" className="text-xs  tracking-wider text-neutral-500">
                                    Your Role
                                </Label>
                                <Select value={founderRole} onValueChange={(v) => setFounderRole(v as FounderRole)}>
                                    <SelectTrigger className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                                        <SelectValue placeholder="Select your role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            FOUNDER_ROLES.map((role) => (
                                                <SelectItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs tracking-wider text-neutral-500">
                                Your Full Name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs tracking-wider text-neutral-500">
                                Work Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs tracking-wider text-neutral-500">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a secure password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 pr-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <AnimatePresence initial={false}>
                            {
                                password && !isPasswordValid && (
                                    <motion.div
                                        key="pw-reqs"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                        className="overflow-hidden mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"
                                    >
                                        <p className="text-[10px]  tracking-widest text-neutral-500 mb-2">
                                            Security Requirements
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {
                                                [
                                                    { check: hasMinLength, label: "8+ chars" },
                                                    { check: hasCapital, label: "Uppercase" },
                                                    { check: hasNumber, label: "Number" },
                                                    { check: hasSpecial, label: "Special char" },
                                                ].map((req, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        {
                                                            req.check ? (
                                                                <Check className="h-3 w-3 text-neutral-900 dark:text-white" />
                                                            ) : (
                                                                <X className="h-3 w-3 text-neutral-400" />
                                                            )
                                                        }
                                                        <span className={req.check ? "text-neutral-900 dark:text-white" : "text-neutral-400"}>
                                                            {req.label}
                                                        </span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </motion.div>
                                )
                            }
                            </AnimatePresence>
                        </div>
                        <div className="flex items-start gap-3 pt-2">
                            <Checkbox
                                id="terms"
                                checked={agreedToTerms}
                                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                                className="cursor-pointer mt-0.5 border-neutral-300 dark:border-neutral-700 data-[state=checked]:bg-neutral-900 dark:data-[state=checked]:bg-white data-[state=checked]:border-neutral-900 dark:data-[state=checked]:border-white"
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm text-neutral-500 leading-relaxed cursor-pointer"
                            >
                                I agree to the{" "}
                                <Link href="/terms" className="text-neutral-900 dark:text-white hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="/privacy" className="text-neutral-900 dark:text-white hover:underline">
                                    Privacy Policy
                                </Link>
                            </Label>
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !agreedToTerms}
                            className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold mt-6"
                        >
                            {
                                isLoading ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Initializing...
                                    </>
                                ) : (
                                    <>
                                        Create Workspace
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )
                            }
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-neutral-500">
                        Already have access?{" "}
                        <Link
                            href="/signin"
                            className="text-neutral-900 dark:text-white font-semibold hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <ShipItHQLoader />
            }
        >
            <SignUpForm />
        </Suspense>
    );
}