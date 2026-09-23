"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

/**
 * Error boundary for every route under /projects.
 *
 * Without this, a throw anywhere in the module walks all the way to the root
 * boundary and replaces the entire app shell - sidebar, AI rail and all - so a
 * failure in one panel reads to the user as the whole product crashing.
 *
 * Sized with `min-h-screen` rather than `h-full` on purpose: the rule in
 * globals.css retargets that utility at the shell's `--page-h`
 * (`calc(100vh - 1rem)`) inside `[data-app-page]`, so this fills the page card
 * exactly instead of overflowing it by the shell's margin.
 */
export default function ProjectsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[projects] route error:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                    <TriangleAlert className="h-7 w-7 text-neutral-900 dark:text-white" />
                </div>

                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    This page didn&apos;t load
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                    Something went wrong while loading your projects. Your work is saved - nothing
                    has been lost.
                </p>

                {/* The digest is the only handle on a server-side error in production,
                    where the message itself is deliberately withheld. Without it a bug
                    report cannot be matched to a log line. */}
                {error.digest && (
                    <p className="mt-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                        Reference: {error.digest}
                    </p>
                )}

                <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <Button onClick={reset} className="w-full gap-2 sm:w-auto">
                        <RotateCcw className="h-4 w-4" />
                        Try again
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
                        <Link href="/projects/explore?tab=mine">
                            <ArrowLeft className="h-4 w-4" />
                            My projects
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
