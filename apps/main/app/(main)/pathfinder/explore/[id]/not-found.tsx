import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

/**
 * Shown when a public goal slug does not resolve.
 *
 * A dedicated page rather than the global 404 because this is a *normal* thing
 * to hit - goals get unpublished, and forked links outlive their source - and the
 * generic 404 gives the user no route back into the module they were in.
 *
 * `min-h-screen` is retargeted at the shell's `--page-h` by the rule in
 * globals.css, so this fills the page card rather than overflowing it.
 */
export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                    <SearchX className="h-7 w-7 text-neutral-900 dark:text-white" />
                </div>

                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    This goal isn&apos;t available
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                    It may have been unpublished by its creator, or the link is out of date.
                </p>

                <div className="mt-6 flex justify-center">
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/pathfinder/explore">
                            <ArrowLeft className="h-4 w-4" />
                            Explore goals
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
