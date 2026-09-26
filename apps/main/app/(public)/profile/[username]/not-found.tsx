import Link from "next/link";
import { Button } from "@repo/ui/components/ui/button";

/**
 * A username that does not exist, and a profile set to private, look the same here
 * on purpose: telling an anonymous visitor "this profile is private" confirms that
 * an account exists at that username (the same rule as /knowme/<username>).
 */
export default function NotFound() {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-white px-6 py-12 dark:bg-black">
            <div className="w-full max-w-sm text-center">
                <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">404</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">This profile is not available</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    The link may be mistyped, or the page is not shared publicly. If someone sent it to you, ask them to check it.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-6">
                    <Link href="/">Go to ShipItHQ</Link>
                </Button>
            </div>
        </div>
    );
}
