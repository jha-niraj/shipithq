"use client"

import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Logo } from "@repo/ui/components/logo"
import Link from "next/link"
import { ThemeToggle } from "@repo/ui/components/themetoggle"
import { AUTH_PHOTO_CREDIT, AuthBackdropMobile, AuthBackdropPanel, AuthBackdropSurround } from "./auth-backdrop"
import { copyForPath } from "./auth-copy"

/**
 * The two-column shell every auth screen sits in.
 *
 * Rendered by `(auth)/layout.tsx`, NOT by each page. That is deliberate and it is
 * the fix for the flicker: a layout persists across navigation inside its segment,
 * a page does not. Going from /signin to /register used to unmount the brand
 * panel, its background image and its entrance animation and mount a fresh one -
 * so the artwork blinked, the photo re-decoded and the stagger replayed on every
 * link. Now only the form column swaps, and the panel's copy cross-fades in place.
 *
 * Capped at `max-w-7xl` and centred, so on a wide monitor the form does not sit
 * a third of a metre from the brand panel. Below xl the card goes full-bleed -
 * rounding and insetting a shell that already fills the viewport just wastes
 * vertical space on the screens with least of it.
 *
 * Both columns are full height and the right column scrolls internally. That is
 * the point: sign-in swaps between password / magic-link / verify modes, and
 * those three have different heights. With an auto-height shell the panels
 * resized on every switch and the brand column visibly jumped.
 *
 * ── The brand panel is LIGHT in both themes ──
 * It was `bg-neutral-950` with white type. The photographic panel behind it reads
 * light, so white-on-light left the headline all but invisible - see the
 * screenshot that prompted this. The panel is now explicitly a light surface in
 * BOTH themes and every piece of type on it is near-black. A constant surface
 * needs constant ink; `dark:` variants on text sitting over a theme-independent
 * photo is what produced the invisible text in the first place.
 *
 * ── Backdrop ──
 * See `auth-backdrop.tsx` for why it is three layers. The form card stays OPAQUE:
 * frosting it over the photo drops `text-neutral-500` help text under 4.5:1
 * against the light parts of the image, and it fails exactly where reading matters
 * most.
 */
export function AuthShell({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const { headline, sub } = copyForPath(pathname)

    return (
        <div className="relative flex h-dvh w-full justify-center overflow-hidden bg-neutral-50 dark:bg-black xl:p-6">
            <AuthBackdropSurround />

            {/* The card floats on the app's plain backdrop at xl, as the app's own
                cards do. */}
            <div className="relative flex h-full w-full max-w-7xl overflow-hidden bg-white ring-neutral-200 xl:rounded-3xl xl:shadow-2xl xl:shadow-neutral-900/10 xl:ring-1 dark:bg-neutral-950 dark:ring-neutral-800 dark:xl:shadow-black/40">
                {/* ── Brand column: the forest photograph, identical in both themes. ── */}
                {/* CONSTANT INK. Every `dark:text-*` inside this panel is a bug, and they have been
                    removed twice before. The surface is a photograph that does not change with
                    the theme, so the ink cannot either: dark ink on the sky band at the top,
                    white on the forest at the foot, each measured (see auth-backdrop.tsx). The
                    rule from CLAUDE.md: if a surface is constant across themes, its ink must be
                    constant too.

                    A sweep that reads only the element's own className cannot see this,
                    because the background lives on this aside and the text lives on its
                    descendants. Anything automated touching ink needs to skip this subtree. */}
                <aside
                    data-constant-surface
                    className="relative hidden h-full w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12"
                >
                    <AuthBackdropPanel />

                    {/* Copy in the sky band only: the top 41% of the panel measures
                        >= 4.5:1 for every ink used here (auth-backdrop.tsx). Sized to
                        end by ~250px so it fits a 640px-tall panel; the larger
                        headline only appears once the viewport is tall enough. */}
                    <div className="relative z-10">
                        <Link href="/" className="flex w-fit items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900/10 ring-1 ring-neutral-900/15">
                                <Logo className="h-5 w-5 text-neutral-900" />
                            </span>
                            <span className="text-lg font-semibold tracking-tight text-neutral-900">ShipItHQ</span>
                        </Link>

                        {/* Keyed on the pathname so the copy cross-fades between routes. */}
                        <div key={pathname} className="mt-8 max-w-md [@media(min-height:860px)]:mt-10">
                            <h2
                                className="auth-copy-enter text-3xl font-bold leading-tight tracking-tight text-neutral-900 [@media(min-height:860px)]:text-4xl"
                                style={{ ["--enter-delay" as string]: "0ms" }}
                            >
                                {headline}
                            </h2>
                            {sub && (
                                <p
                                    className="auth-copy-enter mt-3 line-clamp-2 text-[15px] leading-6 text-neutral-800"
                                    style={{ ["--enter-delay" as string]: "70ms" }}
                                >
                                    {sub}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* White on the dark forest: >= 14.5:1 at every panel size. */}
                    <a
                        href={AUTH_PHOTO_CREDIT.href}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 w-fit text-xs text-white/85 underline-offset-4 hover:underline"
                    >
                        Photo: {AUTH_PHOTO_CREDIT.name}, Unsplash
                    </a>
                </aside>

                {/* ── Form column. Scrolls internally so the shell never grows. ── */}
                <ScrollArea className="relative flex h-full w-full flex-col lg:w-1/2" reflow>
                    <AuthBackdropMobile />

                    {/* The theme toggle lives here at every width now: the brand panel
                        carries no footer (its middle band cannot hold text). */}
                    <div className="absolute right-6 top-6 z-10 hidden lg:block">
                        <ThemeToggle />
                    </div>

                    <div className="relative flex min-h-[calc(100%-9rem)] items-center justify-center px-6 py-10 sm:min-h-[calc(100%-11rem)] sm:px-10 lg:min-h-full">
                        <div className="w-full max-w-md">
                            {/* Mobile brand + theme toggle - the aside is hidden below lg. */}
                            <div className="mb-8 flex items-center justify-between lg:hidden">
                                <Link href="/" className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
                                        <Logo className="h-[17px] w-[17px] text-white dark:text-neutral-900" />
                                    </span>
                                    <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                                        ShipItHQ
                                    </span>
                                </Link>
                                <ThemeToggle />
                            </div>

                            {/* Keyed on the route so the form fades in on navigation.
                                Done in CSS so a screen does not pull framer-motion in
                                just to fade its form - see .auth-enter in globals.css. */}
                            <div key={pathname} className="auth-enter">{children}</div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

export default AuthShell
