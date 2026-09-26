"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "../logo"
import { ThemeToggle } from "../themetoggle"
import { ScrollArea } from "../ui/scroll-area"
import { AuthVisual, type AuthVisualVariant } from "../auth-visual"

/**
 * The two-column shell every auth screen in main, hiring and uni sits in
 * (plan/auth AUTH-1). Moved here from apps/main so the three apps stop drifting.
 *
 * Render it from the auth LAYOUT, not from each page: a layout persists across
 * navigation, so going from /signin to /register swaps only the form column while
 * the photograph stays put and the panel's copy cross-fades in place.
 *
 * ── The brand panel ──
 * The forest photograph ("misty forest valley with mountains", Roberto Shumski,
 * Unsplash oYEGPZebzGw) is a CONSTANT surface: it looks the same in both themes,
 * so every ink on it is constant too, and no `dark:` variant belongs anywhere in
 * the aside. Measured on the shipped pixels:
 *
 *   top 41% (sky)        neutral-700 >= 4.5:1, neutral-900 >= 13.6:1
 *   middle (ridge, mist) fails in both inks - nothing is written straight on it
 *   bottom strip         white >= 14.5:1
 *
 * So the logo, headline and sub-line sit in the sky, the photo credit sits in the
 * bottom strip, and the animated artwork sits on a frosted plate between them. The
 * plate is its own constant surface (white at 78% over a 16px blur, which reads
 * >= 90% white over every part of the frame), so the art's near-black ink holds
 * its contrast whatever is behind it. The plate is hidden on panels too short to
 * fit it without crowding the headline.
 *
 * ── The artwork ──
 * `AuthVisual` motifs, one per screen, chosen in each app's `copy` map. They are
 * CSS-animated SVG (see auth-visual.tsx for why not framer), so the theme toggle
 * does not replay them. Keyed on the matched route so the art re-enters when the
 * screen changes.
 *
 * ── The form column ──
 * Full height with its own scroll, so a form changing height (sign-in's password,
 * magic-link and verify modes) never resizes the panel beside it. Below lg the
 * panel is hidden and the photograph becomes a banner above the form, in the flow,
 * so no form text ever lands on the image.
 */

export type AuthPanelCopy = {
    headline: ReactNode
    sub?: ReactNode
    art?: AuthVisualVariant
}

export const AUTH_PHOTO = {
    src: "/backdrop/auth-forest.webp",
    banner: "/backdrop/auth-forest-banner.webp",
    credit: { name: "Roberto Shumski", href: "https://unsplash.com/photos/oYEGPZebzGw" },
}

/** A muted run inside a headline: same ink, less weight of attention. Constant ink - see above. */
export function Muted({ children }: { children: ReactNode }) {
    return <span className="text-neutral-900/45">{children}</span>
}

/** The longest route prefix in `copy` that matches, so /signin/xyz still reads /signin. */
function match(pathname: string, copy: Record<string, AuthPanelCopy>): [string, AuthPanelCopy | undefined] {
    const key = Object.keys(copy)
        .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
        .sort((a, b) => b.length - a.length)[0]
    return key ? [key, copy[key]] : [pathname, undefined]
}

export function AuthShell({ children, copy, fallback, brand = "ShipItHQ", homeHref = "/" }: {
    children: ReactNode
    /** Panel copy per route, e.g. `{ "/signin": {...}, "/register": {...} }`. */
    copy: Record<string, AuthPanelCopy>
    /** Used for a route with no entry in `copy`. */
    fallback: AuthPanelCopy
    /** The word beside the logo: "ShipItHQ", "ShipItHQ Hiring". */
    brand?: string
    homeHref?: string
}) {
    const pathname = usePathname() ?? ""
    const [key, found] = match(pathname, copy)
    const { headline, sub, art } = found ?? fallback

    const mark = (
        <Link href={homeHref} className="flex w-fit items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-neutral-900 dark:bg-white">
                <Logo className="size-[17px] text-white dark:text-neutral-900" />
            </span>
            <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">{brand}</span>
        </Link>
    )

    return (
        <div className="relative flex h-dvh w-full justify-center overflow-hidden bg-neutral-50 dark:bg-black xl:p-6">
            <div className="relative flex h-full w-full max-w-7xl overflow-hidden bg-white ring-neutral-200 xl:rounded-2xl xl:shadow-2xl xl:shadow-neutral-900/10 xl:ring-1 dark:bg-neutral-950 dark:ring-neutral-800 dark:xl:shadow-black/40">
                {/* CONSTANT INK below: no `dark:` on anything inside this aside. */}
                <aside
                    data-constant-surface
                    className="relative hidden h-full w-1/2 flex-col overflow-hidden p-10 lg:flex xl:p-12"
                >
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-neutral-900 bg-cover bg-center"
                        style={{ backgroundImage: `url(${AUTH_PHOTO.src})` }}
                    />

                    <div className="relative z-10">
                        <Link href={homeHref} className="flex w-fit items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-neutral-900/10 ring-1 ring-neutral-900/15">
                                <Logo className="size-5 text-neutral-900" />
                            </span>
                            <span className="text-lg font-semibold tracking-tight text-neutral-900">{brand}</span>
                        </Link>

                        <div key={key} className="mt-8 max-w-md [@media(min-height:860px)]:mt-10">
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

                    <div className="relative z-10 mt-auto flex flex-col gap-4">
                        {art && (
                            <div
                                key={`art-${key}`}
                                className="auth-art-enter w-full rounded-2xl bg-white/78 p-5 text-neutral-900 shadow-xl shadow-black/20 ring-1 ring-white/70 backdrop-blur-lg [@media(max-height:720px)]:hidden"
                                style={{ ["--enter-delay" as string]: "140ms" }}
                            >
                                {/* Full panel width (AUTH-6); capped by height so a short window keeps the headline. */}
                                <AuthVisual variant={art} className="mx-auto aspect-[6/5] max-h-[38vh] w-full" />
                            </div>
                        )}
                        {/* White on the dark forest strip: >= 14.5:1 at every panel size. */}
                        <a
                            href={AUTH_PHOTO.credit.href}
                            target="_blank"
                            rel="noreferrer"
                            className="w-fit text-xs text-white/85 underline-offset-4 hover:underline"
                        >
                            Photo: {AUTH_PHOTO.credit.name}, Unsplash
                        </a>
                    </div>
                </aside>

                <ScrollArea className="relative flex h-full w-full flex-col lg:w-1/2" reflow>
                    <div
                        aria-hidden
                        className="h-32 w-full shrink-0 bg-neutral-900 bg-cover bg-center sm:h-40 lg:hidden"
                        style={{ backgroundImage: `url(${AUTH_PHOTO.banner})` }}
                    />

                    <div className="absolute right-6 top-6 z-10 hidden lg:block">
                        <ThemeToggle />
                    </div>

                    {/* Centred both ways. `min-h-full` does not resolve inside the scroll viewport, so
                        the height is the card's own: the viewport, less the xl frame. */}
                    <div className="relative flex min-h-[calc(100dvh-8rem)] items-center justify-center px-6 py-10 sm:min-h-[calc(100dvh-10rem)] sm:px-10 lg:min-h-dvh xl:min-h-[calc(100dvh-3rem)]">
                        <div className="w-full max-w-md">
                            <div className="mb-8 flex items-center justify-between lg:hidden">
                                {mark}
                                <ThemeToggle />
                            </div>
                            {/* Keyed on the route so the form fades in on navigation (.auth-enter). */}
                            <div key={pathname} className="auth-enter auth-form">{children}</div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

export default AuthShell
