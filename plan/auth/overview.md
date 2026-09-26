# Auth screens - overview

## What this module is

Every screen a person sees before they are signed in, in all three apps: sign in,
register, forgot password, reset password, verify email, and hiring's team invite.
Onboarding is out of scope here (its own module later).

## Definition of done

1. **One kit, three apps** (Niraj, 2026-09-25). `packages/ui/src/components/auth/`
   holds the shell, the brand panel, and the form parts; `apps/main`, `apps/hiring`
   and `apps/uni` compose their screens from it and pass only their own copy, art
   motif and providers.
2. **No styles on top of components.** Inputs, buttons, checkboxes and dividers are
   the base `@repo/ui` components with layout classes only - no `h-12`, no
   `bg-neutral-900`, no zinc borders, no boxed "or" labels. What looked "external"
   in Niraj's screenshots was exactly this.
3. **The photo stays, and moves** (Niraj's choice): the forest photograph remains the
   brand panel, with an animated monochrome SVG layer over it in the app's
   `sh-art-*` vocabulary, off under reduced motion. Constant ink on the photo, as
   before (CLAUDE.md: a constant surface needs constant ink).
4. **Social first** on sign in and register: Google and GitHub (only the providers the
   app has) with proper, correctly proportioned marks; then "or continue with
   email"; then the form; the magic link as a quiet secondary option.
5. **Legal links work**: Terms and Privacy open the marketing site's pages in a new
   tab (so a half-filled form survives), from the app's configured web URL. They
   went to `localhost:3000` because `apps/main/next.config.mjs` falls back to port
   3000 when `NEXT_PUBLIC_WEB_URL` is unset, and `apps/web` runs on 6005.
6. **Consistent everywhere**: same layout, spacing, type scale and states (loading
   with `InlineLoader`, errors inline under the field or form) across the three apps;
   no horizontal scroll at 390px; skeleton-free (the forms render on the server).

## Out of scope

Onboarding flows; auth logic (better-auth calls stay as they are, only the UI moves).
