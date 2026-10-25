"use client";

import { Spinner } from "./spinner";

interface LoaderProps {
    /** Visual size in px (default 32) */
    size?: number;
    /** Dot size in px (default 4) */
    dotSize?: number;
    /** Optional wrapper className */
    className?: string;
    /** Aria label (default "Loading") */
    label?: string;
}

/** Full-page centred loader */
export function PageLoader({ label = "Loading" }: { label?: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950">
            <Spinner className="size-8 text-neutral-500 dark:text-neutral-400" aria-label={label} />
        </div>
    );
}

/** Centred loader for a section/card (not full page) */
export function SectionLoader({ label = "Loading" }: { label?: string }) {
    return (
        <div className="flex h-40 w-full items-center justify-center">
            <Spinner className="size-6 text-neutral-500 dark:text-neutral-400" aria-label={label} />
        </div>
    );
}
