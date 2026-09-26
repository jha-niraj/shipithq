"use client"

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { AuthHeader } from "@repo/ui/components/auth/auth-form";

/**
 * The /error route's own error boundary. It used to be a Pages Router component
 * (`next/router`), which throws when mounted in the App Router, so the boundary
 * itself crashed the moment it was needed (plan/auth AUTH-2).
 */
export default function AuthErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <>
            <AuthHeader icon={<AlertCircle className="size-5" />} title="Something went wrong" description="This page failed to load. Try again, or go back to sign in." />
            <div className="grid gap-3">
                <Button size="lg" className="w-full" onClick={reset}>Try again</Button>
                <Button asChild size="lg" variant="outline" className="w-full"><Link href="/signin">Back to sign in</Link></Button>
            </div>
        </>
    );
}
