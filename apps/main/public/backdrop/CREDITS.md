# Backdrop artwork

**Current (2026-09-22, plan/practice-ui UI-1):** the signed-in app has no
photograph (a plain `neutral-50` / black backdrop). The auth screens use one:

| File | Built from | Used by |
|---|---|---|
| `auth-forest.webp` | "Misty forest valley with mountains in background", Roberto Shumski, Unsplash `oYEGPZebzGw` | auth brand panel, both themes, no layer; 2000px square centre crop, WebP q72, 176 KB |
| `auth-forest-banner.webp` | same photo | auth banner above the form below `lg`; 1500x500 strip from 18% down, WebP q72, 32 KB |

Unsplash licence: free for commercial use, no attribution required; the
photographer is credited on the panel anyway. Contrast of the panel copy was
measured on these exact pixels (see `app/(auth)/_components/auth-backdrop.tsx`);
re-measure if either file is replaced.

**No longer referenced, proposed for deletion** (plan/practice-ui): `light.webp`,
`dark.webp`, `dark-sharp.webp`. The history below documents them.

---

# Backdrop artwork

Three files from two photographs. See `components/common/app-backdrop.tsx` for why
there are two rather than one, and why neither ships under a scrim.

| File | Built from | Used by |
|---|---|---|
| `light.webp` | the arches | shell backdrop in light mode, auth mobile wash in light mode |
| `dark.webp` | the interior | shell backdrop in dark mode, auth mobile wash in dark mode |
| `dark-sharp.webp` | the interior | auth brand panel at 22% over `bg-neutral-950`, in both themes |

## Sources

Both are Unsplash, whose licence grants commercial use outright with no permission
or attribution required. Attribution is not required but crediting the photographer
is the norm and costs nothing.

### Light - vaulted arches

| | |
|---|---|
| Photographer | Robin Schreiner |
| Original | `https://images.unsplash.com/photo-1524230572899-a752b3835840` |
| Photo page | `https://unsplash.com/photos/1524230572899-a752b3835840` |
| Subject | White vaulted arches receding down a stair |

### Dark - minimal interior

| | |
|---|---|
| Photographer | Boris Stefanik |
| Original | `https://images.unsplash.com/photo-1472803828399-39d4ac53c6e5` |
| Photo page | `https://unsplash.com/photos/1472803828399-39d4ac53c6e5` |
| Subject | Dark minimal interior, structural lines and steps |

They are deliberately the same kind of picture: minimal monochrome architecture with
receding depth. The shell swaps between them on theme, and two unrelated subjects
would read as two different products.

## Processing

From the 2400px original, in this order:

1. **Fully desaturated.** `CLAUDE.md` pins the palette to monochrome black/neutral. A
   partial desaturation still reads as a colour cast behind a monochrome UI.
2. **The light source is cropped to landscape first.** It is a 3:4 portrait, and
   `background-size: cover` on a wide viewport would crop it to a flat middle band and
   lose the arches entirely - which are the reason it was chosen. The crop is centred
   on the vanishing point at 50% of the frame height and matches the dark file's
   aspect, so switching theme does not reframe the shot. The dark source is already
   landscape and is not cropped.
3. **Contrast boost, chosen by search rather than by eye** - the largest factor that
   still clears **4.55:1** for a bare `<h1>` against the single worst pixel in the
   frame. That came out at **x1.40 light** and **x1.04 dark**. The dark image has the
   wider native range, so it has almost no room; an earlier x1.06 pass measured
   4.48:1 and was rejected for being under the 4.5 floor by that much.
4. **`light.webp` / `dark.webp`**: resized to 1000px, Gaussian blur 13px, WebP q82 -
   3.7 KB each, 1000x610 and 1000x609. Blurred pixels carry almost no high-frequency detail, so the
   hard downscale is invisible once the browser scales it back up. The blur is baked
   in rather than applied with a CSS filter, which would be a real paint cost on an
   element the size of the viewport.
5. **`dark-sharp.webp`**: resized to 1400px, WebP q66 - 46 KB. It sits at 22% opacity
   over black, so it is texture rather than a picture, and quality can be spent
   accordingly. At 2000px/q76 the same frame was 156 KB for no visible gain.

## Measured result

Every pixel sampled through the exact stack the browser composites:

| | min | max | worst-case `<h1>` |
|---|---|---|---|
| `light.webp` under `neutral-900` ink | 181 | 255 | **8.74:1** |
| `dark.webp` under white ink | 23 | 117 | **4.61:1** |

Worst case is the single most hostile pixel, not the average. 4.5:1 is the WCAG floor
for body text, so a heading anywhere on either backdrop clears it.

**If either image is swapped, re-run this.** A photo with a wide tonal range breaks
the numbers, and that is exactly how this layer ended up scrimmed the first time.

## What was NOT used, and why

The request was for an image from Pinterest. Pinterest is an index of other people's
work: the overwhelming majority of pins are copyrighted photographs re-pinned without
a licence, with no reliable way to trace the owner from the pin. Shipping one as the
background of a commercial product is a real infringement risk - hero and background
images are exactly what stock agencies pursue - so the same look was sourced from
Unsplash instead, where the licence grants commercial use outright.

## Superseded

`public/auth/auth-bg.webp` and `public/auth/auth-bg-blur.webp` (a hazy mountain
ridge) are no longer referenced by anything. They were left on disk rather than
deleted, per the working agreement that deletions are proposed and approved rather
than assumed. Safe to remove.
