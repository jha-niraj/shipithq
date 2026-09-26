"use client"

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit';
import { AuthHeader } from '@repo/ui/components/auth/auth-form';

// Error codes better-auth (and the old next-auth routes) append as `?error=`.
const MESSAGES: Record<string, { title: string; description: string }> = {
    Configuration: { title: "Sign-in is misconfigured", description: "There's an issue with our authentication setup. Please try again later, or contact support if it persists." },
    AccessDenied: { title: "Access denied", description: "You don't have permission to open this. Ask an administrator if you think that's wrong." },
    Verification: { title: "That link has expired", description: "Sign-in links expire for security. Request a new one and try again." },
    OAuthSignin: { title: "Couldn't reach the provider", description: "There was a problem connecting to the sign-in provider. Try again, or use another method." },
    OAuthCallback: { title: "Sign-in didn't finish", description: "We couldn't process the provider's response. Please try signing in again." },
    OAuthCreateAccount: { title: "Couldn't create your account", description: "Try a different sign-in method, or contact support." },
    EmailCreateAccount: { title: "Couldn't create your account", description: "Check the email address and try again." },
    Callback: { title: "Sign-in was interrupted", description: "Please try signing in again." },
    OAuthAccountNotLinked: { title: "Account not linked", description: "This social account isn't linked to an existing account. Sign in the way you signed up, then link it from your profile." },
    CredentialsSignin: { title: "Wrong email or password", description: "Check your details and try again." },
    EmailSignin: { title: "Couldn't send the email", description: "Check the email address and try again." },
    SessionRequired: { title: "Please sign in", description: "You need to be signed in to open this page." },
};
const FALLBACK = { title: "Something went wrong", description: "An unexpected error occurred while signing you in. Please try again." };

function ErrorContent() {
    const error = useSearchParams().get('error');
    const info = (error && MESSAGES[error]) || FALLBACK;

    return (
        <>
            <AuthHeader icon={<AlertCircle className="size-5" />} title={info.title} description={info.description} />
            <div className="grid gap-3">
                <Button asChild size="lg" className="w-full"><Link href="/signin">Back to sign in</Link></Button>
                <Button asChild size="lg" variant="outline" className="w-full"><Link href="/register">Create an account</Link></Button>
            </div>
            {process.env.NODE_ENV === 'development' && error && (
                <p className="mt-6 font-mono text-xs text-neutral-500 dark:text-neutral-400">error={error}</p>
            )}
        </>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="space-y-3">
                <ShimmerStyles />
                <Shimmer className="size-11 rounded-lg" />
                <Shimmer className="h-7 w-2/3" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="mt-4 h-11 w-full" />
                <Shimmer className="h-11 w-full" />
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}
