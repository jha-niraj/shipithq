/**
 * The backdrop the whole product sits on.
 *
 * One layer behind every shell - the auth screens and the signed-in app both. It is
 * defined once here so the two cannot drift the first time either is touched;
 * the auth screens use the shared kit in `@repo/ui/components/auth` (plan/auth).
 *
 * ── What it is for ──
 * The cards FLOAT on this. The sidebar, page and AI rail are rounded surfaces with a
 * gutter between them, and the page surface itself is transparent, so this is what
 * reads through both.
 *
 * ── No scrim. That is the point, and it is why there are two photographs ──
 *
 * This layer used to be one photograph under a white/black gradient wash, tuned to
 * the brightest setting a bare `<h1>` could survive. That is a compromise with a
 * ceiling: a single image has to carry white type in dark mode AND near-black type
 * in light mode, and no image does both, so the wash had to be heavy enough for the
 * harder of the two. The photograph ended up a grey suggestion of itself in both.
 *
 * The fix is not a better wash, it is not asking one image to do two jobs. Each theme
 * gets a photograph whose OWN tonal range already suits the ink that lands on it -
 * a high-key one for dark type, a low-key one for light type - so both ship at full
 * strength with no overlay at all. There is nothing between you and the image.
 *
 * Measured on the shipped files, sampling every pixel through this exact stack:
 *
 *   light  arches      min 181  max 255   neutral-900 h1 worst case  8.74:1
 *   dark   interior    min  23  max 117   white h1        worst case  4.61:1
 *
 * Worst case means the single most hostile pixel in the frame, not the average, and
 * 4.5:1 is the WCAG floor for body text - so a heading anywhere on either backdrop
 * clears it. That is strictly better than the old scrimmed version, which measured
 * 4.06:1 dark and 4.48:1 light while showing far less of the photo.
 *
 * ── If either image is ever swapped ──
 *
 * Re-run the measurement. The contrast factor baked into each file was found by
 * search, not by eye: the largest boost that still clears 4.55:1 (x1.40 light,
 * x1.04 dark). Pick a photo with a wide tonal range and the numbers stop working,
 * which is exactly how this layer ended up scrimmed the first time.
 *
 * The light file also has a landscape crop baked in. Its source is a 3:4 portrait, and
 * `bg-cover` on a wide viewport cropped it to a flat middle band with the arches out of
 * frame - the photograph was there and invisible. Both files now share one aspect, so a
 * theme switch does not reframe the shot.
 *
 * BODY-SIZE grey text is not covered by any of this and must live in a card. Every
 * page under (main) already does. `text-neutral-500` directly on a backdrop measures
 * around 1.3:1 over a photo's darker regions.
 *
 * ── Theme ──
 * Pure CSS `dark:` variants, not a `useTheme()` read. Both files are referenced in
 * the markup, so the browser has each one decoded before a theme toggle rather than
 * fetching on switch - and a backdrop that is briefly the wrong colour on first paint
 * is more noticeable than one that never animates in at all.
 *
 * ── Cost ──
 * 3.7 KB each. The blur is baked into both rather than applied with a
 * CSS `filter`, which would be a real paint cost on an element the size of the
 * viewport. See `public/backdrop/CREDITS.md` for sources and the full pipeline.
 *
 * `aria-hidden` and `pointer-events-none`: it is decoration and must never sit
 * between a user and a control.
 */

const LIGHT = "/backdrop/light.webp"
const DARK = "/backdrop/dark.webp"

export function AppBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Full strength, both. No opacity, no gradient over the top - each image
                is already in the right tonal register for the ink of its own theme. */}
            <div
                className="absolute inset-0 bg-cover bg-center dark:hidden"
                style={{ backgroundImage: `url(${LIGHT})` }}
            />
            <div
                className="absolute inset-0 hidden bg-cover bg-center dark:block"
                style={{ backgroundImage: `url(${DARK})` }}
            />
        </div>
    )
}

export default AppBackdrop
