import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, reportPreferences } from "@repo/db";
import { Button } from "@repo/ui/components/ui/button";

/**
 * Turning progress reports off from an email (plan/progress PRG-10), no sign-in. The
 * link only opens this page; the change is a button press (a POST), because mail
 * scanners open every link in an email and must not unsubscribe anyone by doing so.
 * Mail clients' own one-click button posts straight to the route (RFC 8058).
 */

export const metadata: Metadata = { title: "Progress reports | ShipItHQ", robots: { index: false, follow: false } };

export default async function UnsubscribeReportsPage({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
    const { token, done } = await searchParams;
    const [pref] = token ? await db.select({ frequency: reportPreferences.frequency }).from(reportPreferences).where(eq(reportPreferences.unsubscribeToken, token)) : [];
    const off = done === "1" || pref?.frequency === "OFF";

    return (
        <main className="flex min-h-dvh items-center justify-center px-4 py-12">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-950">
                {!pref ? (
                    <>
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">This link doesn&apos;t work</h1>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">It may be from an old email. Sign in and change reports in Settings instead.</p>
                        <Button asChild className="mt-5"><Link href="/settings/reports">Open Settings</Link></Button>
                    </>
                ) : off ? (
                    <>
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Progress reports are off</h1>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">You won&apos;t get them by email any more. Your past reports stay in Settings, where you can turn them back on.</p>
                        <Button asChild variant="outline" className="mt-5"><Link href="/settings/reports">Open Settings</Link></Button>
                    </>
                ) : (
                    <>
                        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Turn off progress reports?</h1>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">You&apos;ll stop getting the summary of what you did on ShipItHQ. You can turn it back on in Settings any time.</p>
                        <form method="post" action={`/api/reports/unsubscribe?token=${encodeURIComponent(token!)}`} className="mt-5 flex justify-center gap-2">
                            <Button type="submit">Turn them off</Button>
                            <Button asChild variant="outline"><Link href="/settings/reports">Just change how often</Link></Button>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}
