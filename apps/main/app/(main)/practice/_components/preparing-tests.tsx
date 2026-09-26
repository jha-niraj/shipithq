"use client";

import { useState } from "react";
import NextLink from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader";
import { useBackgroundJob } from "@/hooks/use-background-job";
import { requestJudgeAssets } from "@/actions/(main)/practice/judge.action";

// ─────────────────────────────────────────────────────────────────────────────
// Shown in the Add Problem sheet after a DSA problem is saved (PD-12): follows
// the test-generation job, then offers the problem, or the reason it could not
// be tested and one retry. Closing the sheet does not stop the job; the list
// shows its state on the next visit.
// ─────────────────────────────────────────────────────────────────────────────

type GenResult = { ready?: boolean; error?: string; skipped?: boolean };

export function PreparingTests({
    jobId: initialJobId,
    problem,
    onDone,
}: {
    jobId: string | null;
    problem: { id: string; slug: string; title: string };
    onDone: () => void;
}) {
    const [jobId, setJobId] = useState<string | null>(initialJobId);
    const [retried, setRetried] = useState(false);
    const [retryError, setRetryError] = useState<string | null>(null);
    const job = useBackgroundJob<GenResult>(jobId);

    const ready = job.status === "completed" && (job.result?.ready === true || job.result?.skipped === true);
    const failedMessage =
        job.status === "failed"
            ? job.error ?? "Test generation failed."
            : job.status === "completed" && job.result?.ready === false
                ? job.result.error ?? "Tests could not be prepared."
                : !jobId
                    ? "Test generation could not be started."
                    : null;

    const retry = async () => {
        setRetried(true);
        setRetryError(null);
        const res = await requestJudgeAssets(problem.id);
        if (!res.success || !res.jobId) {
            setRetryError(res.error ?? "Could not retry.");
            return;
        }
        setJobId(res.jobId);
    };

    return (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{problem.title}</p>
            {ready ? (
                <>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Tests are ready. The problem is in your list.</p>
                    <Button asChild className="mt-4 h-10">
                        <NextLink href={`/practice/dsa/${problem.slug}`} onClick={onDone}>
                            Open the problem <ArrowRight className="ml-2 h-4 w-4" />
                        </NextLink>
                    </Button>
                </>
            ) : failedMessage ? (
                <>
                    <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{failedMessage}</p>
                    {retryError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{retryError}</p>}
                    {!retried ? (
                        <Button type="button" variant="outline" onClick={retry} className="mt-4 h-10">
                            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Try again
                        </Button>
                    ) : (
                        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                            It failed again. The statement may be too vague to test; try adding the problem from its URL instead.
                        </p>
                    )}
                </>
            ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400" role="status">
                    <InlineLoader size="sm" />
                    <span>{job.phaseLabel ?? "Preparing tests"}. This takes about half a minute.</span>
                </div>
            )}
        </div>
    );
}
