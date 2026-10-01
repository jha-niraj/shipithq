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
 * (plan/auth AUTH-1, redesigned in AUTH-9). Moved here from apps/main so the three
 * apps stop drifting.
 *
 * Render it from the auth LAYOUT, not from each page: a layout persists across
 * navigation, so going from /signin to /register swaps only the form column while
 * the photograph stays put and the panel's copy cross-fades in place.
 *
 * ── Full screen (AUTH-9, Niraj, 2026-10-01) ──
 * Edge to edge, no frame: the brand panel is the left half, the form the right, a
 * hairline between them. Calm on purpose: one image, one line of copy, one form.
 *
 * ── The brand panel ──
 * The forest photograph ("misty forest valley with mountains", Roberto Shumski,
 * Unsplash oYEGPZebzGw) under a black gradient: lightest at the top (black at 70%
 * over the sky) and solid at the bottom. It is a CONSTANT surface in both themes, so
 * every ink on it is constant white, and no `dark:` variant belongs in the aside.
 * The headline sits in the top band, the animated art straight on the near-black
 * bottom, the photo credit at the very bottom. Contrast is noted in AUTH-9.
 *
 * ── The artwork ──
 * `AuthVisual` motifs, one per screen, chosen in each app's `copy` map, in white
 * ink. CSS-animated SVG (see auth-visual.tsx for why not framer), so the theme
 * toggle does not replay them. Keyed on the matched route so the art re-enters when
 * the screen changes. Hidden on windows too short to hold it beside the headline.
 *
 * ── The form column ──
 * Full height with its own scroll, so a form changing height never resizes the
 * panel. Below lg the panel goes and a short dark banner of the same photo sits
 * above the form, in the flow, so no form text ever lands on the image.
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
    return <span className="text-white/70">{children}</span>
}

/** The longest route prefix in `copy` that matches, so /signin/xyz still reads /signin. */
function match(pathname: string, copy: Record<string, AuthPanelCopy>): [string, AuthPanelCopy | undefined] {
    const key = Object.keys(copy)
        .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
        .sort((a, b) => b.length - a.length)[0]
    return key ? [key, copy[key]] : [pathname, undefined]
}

/**
 * The left half of every auth screen (AUTH-9), exported so onboarding's split layout
 * (AUTH-10) shows the same panel. `copyKey` keys the copy and the art, so they re-enter
 * when it changes.
 */
export function AuthBrandPanel({ brand = "ShipItHQ", homeHref = "/", copyKey, headline, sub, art }: {
    brand?: string
    homeHref?: string
    copyKey: string
    headline: ReactNode
    sub?: ReactNode
    art?: AuthVisualVariant
}) {
    const key = copyKey
    // CONSTANT INK below: no `dark:` on anything inside this aside.
    return (
        <aside data-constant-surface className="relative hidden h-full w-1/2 flex-col overflow-hidden bg-black lg:flex">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${AUTH_PHOTO.src})` }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black" />

            <div className="relative z-10 p-10 xl:p-14">
                <Link href={homeHref} className="flex w-fit items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                        <Logo className="size-5 text-white" />
                    </span>
                    <span className="text-lg font-semibold tracking-tight text-white">{brand}</span>
                </Link>

                <div key={key} className="mt-12 max-w-md">
                    <h2
                        className="auth-copy-enter text-3xl font-semibold leading-[1.1] tracking-tight text-white [@media(min-height:860px)]:text-4xl"
                        style={{ ["--enter-delay" as string]: "0ms" }}
                    >
                        {headline}
                    </h2>
                    {sub && (
                        <p
                            className="auth-copy-enter mt-4 line-clamp-2 text-[15px] leading-6 text-white/75"
                            style={{ ["--enter-delay" as string]: "70ms" }}
                        >
                            {sub}
                        </p>
                    )}
                </div>
            </div>

            <div className="relative z-10 mt-auto flex flex-col gap-8 px-10 pb-8 xl:px-14">
                {art && (
                    <div
                        key={`art-${key}`}
                        className="auth-art-enter w-full text-white/85 [@media(max-height:720px)]:hidden"
                        style={{ ["--enter-delay" as string]: "140ms" }}
                    >
                        <AuthVisual variant={art} className="aspect-[6/5] max-h-[42vh] w-full" />
                    </div>
                )}
                <a
                    href={AUTH_PHOTO.credit.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit text-xs text-white/60 underline-offset-4 hover:text-white/85 hover:underline"
                >
                    Photo: {AUTH_PHOTO.credit.name}, Unsplash
                </a>
            </div>
        </aside>
    )
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
        <div className="relative flex h-dvh w-full overflow-hidden bg-white dark:bg-neutral-950">
            <AuthBrandPanel brand={brand} homeHref={homeHref} copyKey={key} headline={headline} sub={sub} art={art} />

            {/* The hairline between the halves (AUTH-9). */}
            <div aria-hidden className="hidden w-px shrink-0 bg-neutral-200 lg:block dark:bg-neutral-800" />

            <ScrollArea className="relative flex h-full w-full flex-col bg-neutral-50 lg:w-1/2 dark:bg-neutral-950" reflow>
                <div
                    aria-hidden
                    className="relative h-28 w-full shrink-0 bg-black bg-cover bg-center sm:h-36 lg:hidden"
                    style={{ backgroundImage: `url(${AUTH_PHOTO.banner})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/85" />
                </div>

                <div className="absolute right-6 top-6 z-10 hidden lg:block">
                    <ThemeToggle />
                </div>

                {/* Centred both ways; the column's min height is the viewport (less the banner below lg). */}
                <div className="relative flex min-h-[calc(100dvh-7rem)] items-center justify-center px-6 py-12 sm:min-h-[calc(100dvh-9rem)] sm:px-10 lg:min-h-dvh">
                    <div className="w-full max-w-[26rem]">
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
    )
}

export default AuthShell
