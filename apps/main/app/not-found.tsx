import Link from "next/link"
import { headers } from "next/headers"
import { ArrowRight, LogIn } from "lucide-react"
import { getSession } from "@repo/auth"
import { Button } from "@repo/ui/components/ui/button"
import { LostAtSea } from "@/components/common/lost-at-sea"

export const metadata = { title: "Page not found | ShipItHQ" }

/**
 * Every missing page (plan/jobs-polish JP-17): the scene, centred, and the way back that fits
 * the visitor - their home when signed in, sign in when not. The old page hot-linked a GIF
 * from another site and was white in dark mode.
 */
export default async function NotFound() {
    let signedIn = false
    try {
        signedIn = Boolean((await getSession(await headers()))?.user?.id)
    } catch (error: unknown) {
        // A 404 must render even when the session can't be read.
        console.error("not-found session:", error instanceof Error ? error.message : error)
    }
    return (
        <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12 dark:bg-black">
            <div className="flex w-full max-w-xl flex-col items-center text-center">
                <LostAtSea className="w-full overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800" />
                <p className="mt-8 font-mono text-sm tracking-[0.3em] text-neutral-500 dark:text-neutral-400">404</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">This page drifted off</h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    The link may be old, or the page moved. The lighthouse is still looking; you can head back to harbour.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {signedIn ? (
                        <Button asChild className="gap-1.5"><Link href="/home">Go to your home <ArrowRight className="h-4 w-4" /></Link></Button>
                    ) : (
                        <>
                            <Button asChild className="gap-1.5"><Link href="/signin"><LogIn className="h-4 w-4" /> Sign in</Link></Button>
                            <Button asChild variant="outline"><Link href="/">ShipItHQ home</Link></Button>
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}
