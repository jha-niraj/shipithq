'use client';

import { AlertCircle, DatabaseZap, RotateCcw, Lock, SearchX } from 'lucide-react';
import {
    ERROR_TITLES,
    failureKind,
    failureMessage,
    failureRetryable,
    type ActionFailure,
    type ErrorKind,
} from '@repo/errors';
import { Button } from './button';

function iconFor(kind: ErrorKind) {
    switch (kind) {
        case 'network': return <DatabaseZap className="h-8 w-8 text-amber-500" />;
        case 'forbidden':
        case 'auth': return <Lock className="h-8 w-8 text-neutral-400" />;
        case 'notfound': return <SearchX className="h-8 w-8 text-neutral-400" />;
        default: return <AlertCircle className="h-8 w-8 text-red-400" />;
    }
}

/**
 * Inline error state for a failed data load inside a client component - render
 * this instead of an empty list/blank panel so the user never sees "nothing".
 *
 *   {error
 *     ? <DataError result={error} onRetry={refetch} />
 *     : <List items={data} />}
 *
 * Distinct from an EMPTY state (no rows) - only use this when a load actually
 * failed. Shows a Retry button only for retryable (network/ratelimit) failures.
 */
export function DataError({
    result,
    onRetry,
    className,
}: {
    result: ActionFailure;
    onRetry?: () => void;
    className?: string;
}) {
    const kind = failureKind(result);
    const retryable = failureRetryable(result);
    return (
        <div className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className ?? ''}`}>
            {iconFor(kind)}
            <div>
                <p className="text-base font-semibold text-neutral-900 dark:text-white">{ERROR_TITLES[kind]}</p>
                <p className="mt-1 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">{failureMessage(result)}</p>
            </div>
            {retryable && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 rounded-full">
                    <RotateCcw className="h-3.5 w-3.5" /> Try again
                </Button>
            )}
        </div>
    );
}
