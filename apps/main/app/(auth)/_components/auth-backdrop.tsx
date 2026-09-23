/**
 * The auth screens' imagery: one photograph, "misty forest valley with
 * mountains" by Roberto Shumski on Unsplash (oYEGPZebzGw), shown at full
 * strength with nothing over it (plan/practice-ui, UI-1).
 *
 * ── Why the copy sits where it does ──
 * The frame is bright, even sky over its top ~40% and dark forest below.
 * With `bg-cover` in the tall brand panel the whole height of the square crop
 * is visible, so that split holds at every panel size. Measured on the shipped
 * pixels, worst single pixel under the text column:
 *
 *   top 41% of the panel   neutral-700 >= 4.5:1, neutral-900 >= 13.6:1
 *   bottom strip           white >= 14.5:1
 *
 * So all copy lives in the top 41% (logo, headline, sub-line; sized to fit a
 * 640px-tall panel) and only white text may sit at the bottom. Text in the
 * middle band (ridge and mist) fails in both inks, which is why the panel no
 * longer carries a quote or footer there. If the image is swapped, re-run the
 * measurement before trusting any of this.
 *
 * The surface is the same in both themes, so every ink on it is constant: no
 * `dark:` variant on text inside the brand panel.
 */

export const AUTH_PHOTO = "/backdrop/auth-forest.webp"
export const AUTH_PHOTO_BANNER = "/backdrop/auth-forest-banner.webp"
export const AUTH_PHOTO_CREDIT = { name: "Roberto Shumski", href: "https://unsplash.com/photos/oYEGPZebzGw" }

/** Around the card at xl: the app's plain backdrop, so auth and app match. */
export function AuthBackdropSurround() {
    return null
}

/** The brand panel's photograph. `bg-neutral-900` underneath covers the fetch. */
export function AuthBackdropPanel() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-neutral-900 bg-cover bg-center"
            style={{ backgroundImage: `url(${AUTH_PHOTO})` }}
        />
    )
}

/**
 * Below lg the panel is hidden, so the photograph becomes a banner above the
 * form: in the flow, not behind it, so no form text ever lands on the image.
 */
export function AuthBackdropMobile() {
    return (
        <div
            aria-hidden
            className="h-36 w-full shrink-0 bg-neutral-900 bg-cover bg-center sm:h-44 lg:hidden"
            style={{ backgroundImage: `url(${AUTH_PHOTO_BANNER})` }}
        />
    )
}
