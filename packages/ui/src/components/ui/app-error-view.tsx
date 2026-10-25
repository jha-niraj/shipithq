'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, DatabaseZap } from 'lucide-react';
import { classifyError } from '@repo/errors';
import { Button } from './button';
import { Spinner } from './spinner';

/**
 * The ONE server-component error boundary view, shared by every app.
 *
 * Next.js requires an `error.tsx` per app/route-segment (must be a Client
 * Component), but each of those is a 3-line shim that renders this:
 *
 *   'use client';
 *   import { AppErrorView } from '@repo/ui/components/ui/app-error-view';
 *   export default function Error(props) { return <AppErrorView {...props} />; }
 *
 * Behavior:
 *   - Classifies the thrown error via @repo/errors (single source of truth).
 *   - For a transient/`network` error: shows a calm amber "Reconnecting…" screen
 *     and AUTO-RETRIES ONCE (compute is usually warm by then, so the user often
 *     never sees this). NEVER prints the raw message (it can contain SQL).
 *   - For anything else: a red "Something went wrong" with the safe message.
 *   - Shows `error.digest` as a copyable "Error ID" for support.
 */
export function AppErrorView({
    error,
    reset,
    title,
}: {
    error: Error & { digest?: string };
    reset: () => void;
    /** Optional override for the non-transient heading (e.g. "This page failed"). */
    title?: string;
}) {
    // classifyError may re-throw Next control-flow; guard so the boundary itself
    // never crashes while rendering.
    let transient = false;
    let safeMessage = 'An unexpected error occurred. Please try again.';
    try {
        const c = classifyError(error);
        transient = c.kind === 'network';
        safeMessage = c.userMessage;
    } catch {
        // Not our concern to classify - fall back to generic copy.
    }

    const [retrying, setRetrying] = useState(transient);
    const autoRetried = useRef(false);

    useEffect(() => {
        console.error('[AppErrorView]', error);
    }, [error]);

    // One automatic retry for transient errors - a warm compute usually answers
    // the second time, so the user never even sees this screen.
    useEffect(() => {
        if (!transient || autoRetried.current) return;
        autoRetried.current = true;
        const t = setTimeout(() => reset(), 1200);
        return () => clearTimeout(t);
    }, [transient, reset]);

    const handleRetry = () => {
        setRetrying(true);
        reset();
    };

    return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${transient ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                {transient
                    ? <DatabaseZap className="h-7 w-7 text-amber-500" />
                    : <AlertTriangle className="h-7 w-7 text-red-500" />}
            </div>
            <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {transient ? 'Reconnecting…' : (title ?? 'Something went wrong')}
                </h2>
                <p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-300">
                    {transient
                        ? 'We had trouble reaching the server for a moment. This usually clears up on its own - retrying now.'
                        : safeMessage}
                </p>
                {error.digest && (
                    <p className="mt-1 font-mono text-sm text-neutral-500 dark:text-neutral-400">Error ID: {error.digest}</p>
                )}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={retrying}
                className="gap-2 rounded-full"
            >
                {retrying ? <Spinner className="size-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {retrying ? 'Retrying…' : 'Try again'}
            </Button>
        </div>
    );
}
