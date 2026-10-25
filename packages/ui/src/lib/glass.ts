/**
 * THE GLASS. One definition, because five hand-typed alphas is five chances to drift.
 *
 * ## Why light mode needed a different answer, not a different number
 *
 * Dark glass works and light glass did not, and tuning the alpha was never going to fix it,
 * because the two are not the same operation:
 *
 * - **Darkening PRESERVES contrast and chroma.** Near-black at 55% over a photograph reads as a
 *   shade - the picture's colour survives as tone, and white text sits cleanly on it. That is why
 *   the dark Deck looks like smoked glass.
 * - **Lightening DESTROYS both.** As a colour approaches white every hue converges on it, so white
 *   at 58% over the same photograph is not a shade, it is a wash: saturation collapses, contrast
 *   collapses, and what is left is a grey-pink milk that reads as fog or as an image that failed
 *   to load. That is the "white layer" complaint, and no alpha makes it stop being a wash.
 *
 * ## `backdrop-saturate` is the fix, and it is not decoration
 *
 * A `blur()` averages neighbouring pixels, and averaging colour is itself desaturating - so a
 * blurred photo is already duller than the photo, before any overlay. Pushing saturation back up
 * in the same filter is what every real "light material" does (iOS, macOS), and it is the single
 * change that makes a light panel read as FROSTED GLASS OVER SOMETHING COLOURFUL rather than as
 * haze. Dark mode gets it too - it has less to fix, and it comes out richer.
 *
 * ## The second half: give it something to sit on
 *
 * Light mode was double-washed - a cream scrim over the photo AND a white panel over that - so the
 * picture was already hazy before a panel touched it and there was nothing for the panel to
 * separate from. The light scrim in `app-backdrop.tsx` came down to match. The rule the two halves
 * express together:
 *
 * > **A light panel is a CLEAN surface floating on a VIVID photo. A dark panel is a translucent
 * > shade over one.** They are not the same effect at two brightnesses.
 *
 * ## Using these
 *
 * `GLASS_PANEL` is the default for anything a person reads text on. `GLASS_CHROME` is for small
 * floating furniture - the dock - which sits over the picture rather than over prose and can
 * afford to be lighter. Both already carry their own border colours; pass a radius and a shadow at
 * the call site, because those belong to the shape rather than to the material.
 */

/** Blur + saturation. Always together - see above. */
const FROST = 'backdrop-blur-2xl backdrop-saturate-150';

/**
 * A frosted surface with text on it. Still glass, and the AI side panel is what it is for.
 *
 * Light is `#fbfaf8`, a warm near-white rather than pure white: at this alpha pure white over a
 * colourful photo skews the result grey, and a hint of warmth is what keeps it reading as paper.
 * It is also more opaque than the dark value on purpose - dark can afford transparency because
 * darkening preserves the text contrast underneath it, and light cannot.
 *
 * **The Deck's windows no longer use this** - see `SURFACE_PANEL` below for why, and for when to
 * reach for which.
 */
export const GLASS_PANEL = [
    FROST,
    'bg-[#fbfaf8]/78 border-neutral-900/10',
    'dark:bg-neutral-950/55 dark:border-white/10',
].join(' ');

/**
 * An OPAQUE surface with text on it. The Deck's windows.
 *
 * ## Why the Deck's panels stopped being glass (2026-09-21)
 *
 * Niraj, looking at an attendance panel parked over the prayer-flag half of the backdrop: *"we
 * should stop making this card transparent. Because as you can see on the river as well, they have
 * not made and it's a good decision. So we don't really have to take care of the background
 * things."*
 *
 * He is right, and the reference makes the argument better than the tuning did. A macOS document
 * window is opaque on a wallpaper: the translucency is spent on the CHROME - the dock, the title
 * bar - and never on the page you read. Everything in `GLASS_PANEL`'s note about saturation and
 * washes was true, and it was all effort spent making a surface behave that should not have been
 * translucent in the first place. **A panel's contrast must not depend on which part of a
 * photograph it happens to be parked over, and with glass it always does.**
 *
 * ## So which do I use
 *
 * - `SURFACE_PANEL` - anything a person READS or WORKS IN that sits over the backdrop. Deck
 *   windows. If it holds a list, a form or a table, it is this.
 * - `GLASS_PANEL` - a frosted reading surface that is NOT over the Deck's photograph. The AI side
 *   panel, which slides over ordinary app pages and is meant to feel attached to them.
 * - `GLASS_CHROME` - furniture over the picture. The dock, the status card.
 *
 * Light stays the warm `#fbfaf8` - that was never about the alpha, it is what keeps the surface
 * reading as paper. Dark is `neutral-900`, which is the card colour the root CLAUDE.md sets for
 * every other surface in the app, so a Deck panel and a card on any page are the same object now.
 *
 * No `FROST`: blurring behind an opaque fill costs a compositor layer per panel and renders
 * nothing anybody can see.
 */
export const SURFACE_PANEL = [
    'bg-[#fbfaf8] border-neutral-200',
    'dark:bg-neutral-900 dark:border-neutral-800',
].join(' ');

/*
 * THERE IS NO PAGE TOKEN, and that is a decision rather than an omission.
 *
 * A `GLASS_PAGE` scrim lived here for one day. It existed because the photograph was behind the
 * WHOLE app and ordinary pages needed it muted; the photograph is now on `/deck` only, so there is
 * nothing for a page to be glassed against. Niraj: *"the image should only come on the deck. No
 * images everywhere. Remove this glass and transparent thing... just have black and white."*
 *
 * Ordinary pages are a plain opaque ground (`bg-white dark:bg-neutral-950`) set in
 * `main-layout-client.tsx`. If a page ever needs a material again, the question to answer first is
 * what it is being layered over - because the last time, the honest answer turned out to be
 * "nothing".
 */

/**
 * THE SHELL'S OWN FURNITURE - the sidebar and the AI panel. Opaque, and it FOLLOWS THE THEME.
 *
 * ## It was forced dark for about an hour, and the reason it stopped being right is worth keeping
 *
 * While the photograph sat behind the whole app, these two were frosted and pinned to dark in both
 * themes - Niraj: *"keep the sidebar and aichat color and background constant like the dark
 * mode."* That was a good answer to the question being asked then, because lightening destroys
 * contrast and chroma over a photograph (see `GLASS_PANEL`) and darkening does not.
 *
 * Then the photograph moved to `/deck` only and ordinary pages became plain white. A dark rail
 * against a white page is no longer a frame around a picture - it is just a dark rail against a
 * white page, and it was the first thing that looked wrong. *"Now need to update the theme of this
 * sidebar as well to match the theme with light mode."*
 *
 * The rule underneath both decisions is the same one, and it is the reason this is a token rather
 * than three copies of a class string: **chrome takes its cue from what it frames.** When that was
 * a photograph it went dark; now that it is a page, it matches the page.
 *
 * ## No blur and no alpha
 *
 * There is nothing behind these to sample any more. A `backdrop-blur` over a flat colour is a
 * compositor layer per surface rendering nothing.
 */
export const SHELL_SURFACE = [
    'bg-white border-neutral-200',
    /*
     * #1C1C1C - THE CARD STEP. Reversed from #0A0A0A on 2026-09-30, and the reversal is the note.
     *
     * This line used to pin #0A0A0A with the argument that *"a sidebar DARKER than the page recedes,
     * where one at the card colour competes with the content it is meant to be navigation for"* -
     * recorded as Niraj's own call at the time. He looked at it again with the app running and
     * asked for the opposite: *"update the sidebar and aichat bg color to match the rest of the app
     * as well please which is not deep black."*
     *
     * He is right for a reason the first version missed. #0A0A0A is not a step DOWN from the
     * ground, it is a different family: at 4% lightness against a 7% page it reads as a hole rather
     * than as chrome, and it is the only surface in the product at that value - every card, panel,
     * sheet and dock is at or above #1C1C1C. A rail that is the only thing of its colour does not
     * recede, it separates.
     *
     * So chrome now sits on the SAME three-step scale as everything else (#121314 ground ->
     * #1C1C1C surface -> #333333 tile, see globals.css). The sidebar is a surface at the card step.
     */
    'dark:bg-[#1C1C1C] dark:border-white/10',
].join(' ');

/**
 * The AI panel's surface.
 *
 * It took the page's #121314 on the argument that *"the page and the panel read as one surface
 * split in two"*. That was true of the ground and false of the feel: a panel flush with the page it
 * floats over has no edge of its own, so on 2026-09-30 it came up to #1C1C1C with the sidebar, in
 * the same pass and for the same reason (see `SHELL_SURFACE`).
 *
 * It is now identical to `SHELL_SURFACE`, which is correct rather than redundant: the sidebar and
 * the Saathi panel are the two pieces of chrome that flank the page, and they should be the same
 * surface. The two tokens stay separate so that the next time only ONE of them needs to move, it
 * can - which is exactly what happened the last time they were merged.
 */
export const PANEL_SURFACE = [
    'bg-white border-neutral-200',
    'dark:bg-[#1C1C1C] dark:border-white/10',
].join(' ');

/** Small floating furniture - the dock. Over the picture, not over prose, so it can be lighter. */
export const GLASS_CHROME = [
    FROST,
    'bg-[#fbfaf8]/68 border-white/50',
    'dark:bg-neutral-900/60 dark:border-white/10',
].join(' ');

/**
 * A full-height SHEET's ground - the page's, not `bg-background`.
 *
 * ## The bug this exists to remove
 *
 * `SheetContent` in `@repo/ui` defaults to `bg-background`, which resolves to `oklch(0.145 0 0)` -
 * roughly #0d0d0d. The dark ground of this product is **#121314** and its cards are **#1C1C1C**, so
 * every sheet was rendering DARKER than the surfaces it opened over, including the Deck panel that
 * launched it. Niraj, testing: *"update this sheet bg to the bg that we are using on all the
 * platform which is not deep black."*
 *
 * ## Why a token and not a fix inside `sheet.tsx`
 *
 * `bg-background` is the shadcn default and every app in the monorepo mounts sheets. Changing the
 * component's default repaints all of them at once, including the student portal's, which has its
 * own ground (`--pt-ground`). A named class the call site opts into is the change that is safe to
 * make now and easy to sweep later.
 *
 * It is the same colour pair as `PANEL_SURFACE` and deliberately so - a sheet and the AI panel are
 * both a page-sized surface over the page. It is separate only because a sheet must NOT take
 * `PANEL_SURFACE`'s border, which would draw a line down the edge that Radix already shadows.
 *
 * Cards INSIDE a sheet keep their own `bg-white dark:bg-neutral-900`, which is how the three-step
 * ground -> card -> tile system in `globals.css` is meant to stack.
 */
export const SURFACE_SHEET = 'bg-white dark:bg-[#121314]';
