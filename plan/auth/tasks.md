# Auth screens - tasks

Derived from `overview.md`. Build in order; AUTH-3 and AUTH-4 can run in parallel.

| ID | Task | Serves | Status |
|---|---|---|---|
| AUTH-1 | The shared kit in `packages/ui` | 1, 2, 3, 4, 5 | done 2026-09-25 |
| AUTH-2 | `apps/main` auth screens on the kit | 1-6 | built 2026-09-25, awaiting Niraj's browser pass |
| AUTH-3 | `apps/hiring` auth screens on the kit | 1-6 | built 2026-09-25, awaiting Niraj's browser pass |
| AUTH-4 | `apps/uni` auth screens on the kit | 1-6 | built 2026-09-25, awaiting Niraj's browser pass |
| AUTH-5 | Legal links and the web URL fallback | 5 | done 2026-09-25 |
| AUTH-6 | Shell polish: art fills the left panel, premium inputs and buttons, centred form, smooth switches | - | built 2026-09-26, browser check Niraj |
| AUTH-7 | Onboarding audit: callbackUrl honoured on every exit | - | done 2026-09-26 |

## AUTH-1 - The shared kit

**Files** `packages/ui/src/components/auth/{auth-shell,auth-art,auth-form,social-buttons,brand-marks}.tsx`.

**Parts** `AuthShell` (two columns, photo panel with the animated overlay, headline and
sub props, mobile banner, theme toggle, scrolling form column, `max-w-7xl` card at
xl); `AuthHeader` (title, sub); `SocialButtons` (providers prop, loading per
provider); `AuthDivider` (a hairline with text, no box); `AuthField` (label above,
hint, error); `PasswordInput` (show/hide); `AuthLegal` (checkbox + two links, new
tab); `AuthFootnote` ("Already have an account? Sign in"); `GoogleMark`,
`GitHubMark` (official geometry, 18px, GitHub in currentColor).

**Done when** the kit typechecks in `packages/ui`, uses only base components with
layout classes, and the overlay animation stops under reduced motion.

## AUTH-2 - `apps/main` on the kit

Sign in, register, forgot, reset in `app/(auth)/(shell)`, plus `error`. Social first.
Auth calls untouched. **Done when** each page renders from the kit with no per-field
styling, typechecks, and a grep for `h-12|bg-zinc|border-zinc` under `app/(auth)`
is empty. Browser pass is Niraj's.

## AUTH-3 - `apps/hiring` on the kit

Sign in, register, forgot, reset, verify, invite. Email only (hiring has no social
provider configured). Copy for employers. Photo copied into `apps/hiring/public/backdrop`.

## AUTH-4 - `apps/uni` on the kit

Sign in, register, forgot, reset, verify. Google + email. The marketing navbar/footer
leave the auth layout (the shell is the page). Photo copied into `apps/uni/public/backdrop`.

## AUTH-5 - Legal links and the web URL fallback

`apps/main/next.config.mjs` falls back to `http://localhost:3000` for
`NEXT_PUBLIC_WEB_URL`; `apps/web` runs on 6005. Fallback to 6005, add the key to
`.env.example` files, and have `AuthLegal` link to `${webUrl}/termsofservice` and
`/privacypolicy` in a new tab.

## Outcome (2026-09-25)

**AUTH-1, done.** `packages/ui/src/components/auth/`:

- `auth-shell.tsx` - `AuthShell` (copy map per route, fallback, brand), `Muted`,
  `AUTH_PHOTO`. The animated `AuthVisual` sits on a frosted white plate between the
  sky-band copy and the photo credit, hidden on panels under 720px tall. No separate
  `auth-art.tsx`: `AuthVisual` already was the art.
- `auth-form.tsx` - `AuthHeader`, `AuthDivider`, `AuthField`, `PasswordInput`,
  `AuthLegal` / `AuthLegalNote` (with `hrefs`), `AuthFootnote`, `authLinkClass`,
  `OtpInput`, `AuthAlert`, `AuthNotice`, `PasswordRules` / `passwordIsStrong`,
  `AuthFormSkeleton`, `WEB_URL`.
- `social-buttons.tsx`, `brand-marks.tsx` (Google's four-colour G on its own 48px
  grid; GitHub in currentColor). The old inline Google path in main's register was
  malformed (a broken arc in the yellow segment), which is why it looked wrong.
- Added mid-task, since the same flow was copied three times:
  `password-reset.tsx` (`ForgotPasswordForm`, `ResetPasswordForm`) and
  `verify-email.tsx` (`VerifyEmailForm`), with the auth calls passed in as props so
  `packages/ui` still does not depend on `@repo/auth`.
- Reduced motion: the `av-*` rules and `.auth-copy-enter` / `.auth-art-enter` already
  stop under `prefers-reduced-motion` (globals.css).

**AUTH-2, built.** Sign in, register, forgot, reset and `/error` on the kit, social
first. `/error` moved into `(shell)` (URL unchanged) and its `error.tsx`, a Pages
Router component that would itself have crashed, was rewritten as an App Router
boundary. framer-motion is gone from the auth screens; mode switches use `.auth-enter`.
In-shell `loading.tsx` files are form skeletons, so only the form column waits.
`grep -E "h-12|bg-zinc|border-zinc" app/(auth)` is empty. `tsc` clean. The old
`_components/auth-shell.tsx` and `auth-backdrop.tsx` were deleted (approved by Niraj,
2026-09-25).

**AUTH-3, built.** Hiring's routes moved into `app/(auth)/(shell)` (onboarding stays
out, URLs unchanged). Email only; legal links go to hiring's own `/terms` and
`/privacy`. `tsc` clean.

**AUTH-4, built.** Same for uni; marketing navbar and footer moved to
`onboarding/layout.tsx`, the one page that still wants them. Google first. The
institution-name and role fields on register were dropped: they were never sent
(the old comment said so) and onboarding collects them. Sign-in's `callbackUrl` is
now same-origin only (it was an open redirect). `tsc` clean.

**AUTH-5, done.** Fallback and env examples as above; main's legal links go to
`${NEXT_PUBLIC_WEB_URL}/termsofservice` and `/privacypolicy` in a new tab, falling
back to production, never a localhost port.

**Not browser-verified** (Niraj's pass): every screen in both themes, the plate's
contrast over the ridge, the mobile banner, OTP typing and paste, social redirects.

### AUTH-6 - Shell polish (Niraj, 2026-09-26)
**Why** The art card leaves empty photo on its right; inputs and buttons read plain next
to the website's navbar buttons; the form should sit centred; switching screens should be
smooth. **Files** `packages/ui/src/components/auth/{auth-shell,auth-form,social-buttons}.tsx`,
`packages/ui/src/styles/globals.css`, the magic-link button in main's Register/SignIn clients.
**Steps** The art card spans the panel's width (aspect kept); inputs h-11 rounded-lg with a
soft inset and focus ring; the primary button uses the web PrimaryCta recipe (inset
highlight, shadow, press), secondary buttons the OutlineCta recipe; the form centred both
ways; a cross-fade on route change. Shared, so hiring and uni get it too. **Done when**
typecheck clean in main, hiring, uni.

### AUTH-7 - Onboarding audit
**Steps** An onboarded user hitting `/onboarding?callbackUrl=X` goes to X, not /home;
the middleware uses `isSafeCallback`. **Done when** curl-level middleware behaviour
matches.

**Outcome (2026-09-26)**
- AUTH-6 One scoped stylesheet, `.auth-form` in `packages/ui/src/styles/globals.css`, on
  AuthShell's form column: primary Buttons take the web PrimaryCta recipe (inset
  highlight, bottom edge, shadow, 1px press; inverted in dark), outline Buttons (social,
  secondary) the OutlineCta recipe, disabled is a clear inactive fill instead of the
  primary at 50% (the muddy grey in the screenshot), inputs get a faint shadow and a
  soft focus ring. The art card spans the panel's width (the SVG centred, capped at 38vh).
  The form is centred both ways: `min-h-full` never resolved inside the scroll viewport,
  so the column's min height is now the card's own (100dvh, less the xl frame). The
  switch between screens is a shorter fade-up with a 2px blur settle. Applies to main,
  hiring and uni; `tsc` clean in all three.
- AUTH-7 Onboarding was already right on the way in (middleware and `onboardingUrlFor`
  carry the destination; the client exits to it). One gap fixed: an onboarded user on
  `/onboarding?callbackUrl=X` now goes to X, not /home. The middleware's inline callback
  check is replaced by `isSafeCallback` from `lib/urls`.
