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

## AUTH-8 Onboarding: optional resume, compact goals, a real icon per step (Niraj, 2026-09-28)
- [ ] Status: built 2026-09-28, waiting on Niraj's browser check.
- **Why:** readers who stopped on the optional resume step were sent back to onboarding on every visit, because the profile, and `onboardingCompleted`, were only saved by the last step's submit. The learning-goal cards were oversized, and every step showed the same "↗".
- **Files:** `apps/main/app/(auth)/onboarding/_components/OnboardingClient.tsx`, `packages/ui/src/components/typeform-flow.tsx` (only onboarding uses it).
- **Built:**
  - `saveProfile` (photo, `completeOnboarding` with its session-cookie refresh, `finalizeSignup`, `refetch`; runs once) now runs from the learning-goals step's `validateAsync`, so pressing OK there finishes onboarding. A failed save shows as that step's error.
  - The resume step only uploads a file if one was added, and says the profile is already saved. Closing the flow after the save goes into the app.
  - `validateAsync(value, answers)` now receives every answer (a restored draft included).
  - Choice cards are compact: 1px border, `px-3 py-2`, a 24px letter box, 14px text, no scale-up. `columns: 3` gives 2 columns on phones and 3 from `sm`; learning goals use 3.
  - `FlowStep.icon` replaces the fixed "↗": @ username, camera photo, graduation cap university, calendar semester, target goals, file resume.
- **Done when:** a new account that presses OK on learning goals and closes the tab lands in the app on its next visit, not on /onboarding (Niraj's browser).
- **Wider (Niraj, 2026-09-28):** the step column in `TypeformFlow` is `max-w-3xl` (768px), up from `max-w-xl` (576px). It applies to every onboarding step; the footer already spans the full width.

## AUTH-9 Full-screen shell, darkened photo, the reference's form (Niraj, 2026-10-01)
- [x] Status: done 2026-10-01. Checked in Chrome: main /signin (light and dark), /register,
  /forgotpassword; hiring and uni /signin. tsc clean in main, hiring, uni. Contrast at the photo's
  lightest top-band pixel under the 70% black: white 8.5:1, the muted run (white/70) 5.2:1, the
  sub-line (white/75) 5.7:1; the credit on the black bottom 10.5:1. Added on the way at Niraj's
  request: no icon tile above the title; quiet actions (Back to sign in, Create one, Forgot
  password) hover as a soft filled pill instead of an underline; each sign-in panel has its own
  line instead of repeating the form's. The theme toggle no longer throws in a hidden tab.
- **Why:** the framed card and frosted art plate read busy, "like trying to prove something". Niraj's reference (TypeSafe's login): full screen, edge to edge, a dark image half and a calm form half.
- **Files:** `packages/ui/src/components/auth/auth-shell.tsx`, `auth-form.tsx`, `social-buttons.tsx`, `packages/ui/src/styles/globals.css` (`.auth-form`), each app's `auth-copy.tsx` only if copy needs trimming.
- **Decisions (Niraj, 2026-10-01):** left panel is the forest photo full-bleed under a black gradient, white headline and one line top-left, the animated SVG straight on the dark bottom (no plate); a hairline between the halves; a large two-line title with the logo above, taller squarer inputs and buttons, a full-width black primary, the terms line underneath; main, hiring and uni (one shared shell).
- **Steps:** drop the xl frame (no padding, ring, radius or max width); the aside is `w-1/2` full height with the gradient over the photo and constant white ink; the art keyed per route at the bottom, faded into the gradient; a 1px divider; the form column centred, max-w ~26rem; title per route from each form's existing heading, enlarged in `.auth-form`; theme toggle kept top-right.
- **Edge cases:** the photo is a constant surface, so ink on it never takes `dark:`; contrast of white on the gradient's lightest point >= 4.5:1 (measure); short windows (< 720px) hide the art before crowding the headline; below lg the panel goes and a short dark banner stays above the form; the route cross-fade still works; hiring and uni pass their own copy.
- **Done when:** /signin, /register, /forgotpassword in main, and the sign-in pages of hiring and uni, render full screen in Chrome in light and dark with the measured contrast noted here; `tsc` clean in main, hiring, uni.

## AUTH-10 A second onboarding in the split layout, to compare (Niraj, 2026-10-01)
- [x] Status: done 2026-10-01. A fresh test student (`pnpm script e2e-hiring --user=<email> --student`,
  a new flag) walked /onboarding?v=2 in Chrome to /home with the profile saved; /onboarding still
  shows the current flow. Found on the way and fixed in `middleware.ts`: the onboarded-user redirect
  on /onboarding now applies to GET only. It was also redirecting onboarding's own server-action
  POSTs, so the call after `completeOnboarding` failed with "An unexpected response was received
  from the server" (this affected the current flow too). The shared ThemeToggle is now one 36px
  control with padding and a small radius, used everywhere (Niraj, 2026-10-01).
- **Why:** Niraj's reference (TypeSafe's setup survey): the same dark panel on the left as auth, one question at a time on the right, dash progress at the top, a big title, chips, Skip and Continue. "Try something new at onboarding just to see how it looks, and keep the previous one intact."
- **Files:** `packages/ui/src/components/auth/auth-shell.tsx` (export the panel as `AuthBrandPanel`), `apps/main/app/(auth)/onboarding/page.tsx` (pick the version), `apps/main/app/(auth)/onboarding/_components/OnboardingSplit.tsx` (new).
- **Steps:** `/onboarding?v=2` renders the split version; `/onboarding` is unchanged. Same steps and the same save path as today: username (format and availability checked), photo (optional), university (suggestions), semester, learning goals (saves the profile, as today), resume (optional, uploaded on finish). The panel's headline changes per step. Log out top-right.
- **Edge cases:** saving happens at learning goals exactly as in the current flow, so leaving on the resume step still leaves a finished profile; the exit is a full navigation to the callback or /home; a failed save keeps the reader on the step with the message; below lg the panel goes.
- **Done when:** as a fresh test account, `/onboarding?v=2` walks every step in Chrome and lands on /home with the profile saved; `/onboarding` still shows the current flow; tsc clean in main.

## Round: one onboarding for every app, the code on the register page (Niraj, 2026-10-01)
Decisions (Niraj, 2026-10-01): the split onboarding replaces main's old one, whose files are
deleted; it gains a photo preview and size check, jumping back through the done dashes, Enter
and Escape, and a phone layout. Hiring and uni move to the same layout, built from one shared
kit in packages/ui. Uni's departments, student count, city and state are saved, not just asked.
Hiring's and uni's code step moves onto their register pages and their /verify pages go.

### AUTH-11 The shared onboarding kit
- [x] Status: Done 2026-10-01. `packages/ui/src/components/onboarding/split-onboarding.tsx`; used by all three apps. Jump back via done dashes, Enter/Escape, phone banner, photo preview with type and size checks.
- **Files:** `packages/ui/src/components/onboarding/split-onboarding.tsx` (new).
- **Steps:** `OnboardingFrame` (the auth brand panel per step, dash progress with done dashes clickable, theme toggle and log out, a phone header with a short photo banner below lg, Enter continues and Escape goes back), `OnboardingStep` (big title, hint, body, error), `Chip`, `FilePick` (image preview, size and type checked before upload), `StepFooter` (Back, Skip, Continue).
- **Edge cases:** Enter inside a textarea never continues; Escape never leaves the first step; future dashes are not buttons.
- **Done when:** main, hiring and uni render their onboarding with it; tsc clean in all three.

### AUTH-12 Main: the split onboarding is the onboarding
- [x] Status: Done 2026-10-01. Old OnboardingClient, side panel and shader deleted; walked register -> code -> onboarding in Chrome.
- **Files:** `apps/main/app/(auth)/onboarding/page.tsx`, `_components/OnboardingSplit.tsx`; delete `OnboardingClient.tsx`, `onboarding-side-panel.tsx`, `onboarding-shader-bg.tsx` (approved 2026-10-01).
- **Done when:** a fresh student walks /onboarding to /home with the photo previewed and saved; no `?v=` switch left.

### AUTH-13 Hiring: onboarding in the split layout
- [x] Status: Done 2026-10-01. Website, company, about, goals in the frame; invited, blocked, claim and claim-pending as frame notices. Walked a new founder from register to /home in Chrome; the blocked notice checked too.
- **Files:** `apps/hiring/app/(auth)/onboarding/page.tsx`, `website-step.tsx`.
- **Steps:** the invite, blocked, claim and claim-pending states as single screens in the frame; the form as four steps: website (optional), company (name, page address with its check, title, industry, size, website), about (description, location, tech, benefits, culture), what you hire for. Same save call.
- **Done when:** the form and one blocked state render in Chrome; tsc clean.

### AUTH-14 Uni: onboarding in the split layout, saving everything it asks
- [x] Status: Done 2026-10-01. Migration 0080 adds `university.student_count`; city, state, band and department rows saved; Placement Head -> PLACEMENT_COORDINATOR, Administrative Staff -> OTHER + custom title. Verified in the DB. Also found: the action never refreshed the cached session, so /home bounced back to onboarding; now calls `refreshSession` (and on invite accept).
- **Files:** `apps/uni/app/(auth)/onboarding/page.tsx`, `apps/uni/actions/auth/onboarding.action.ts`, `packages/db/src/schema/university.ts` (+ `student_count`), a migration.
- **Steps:** steps: institution (name, email domain), type, your role, about (website, description), departments, campus (city, state, student count). The action saves city, state and student count on the university and one department row per pick. Roles map onto the job-title enum: Placement Head -> PLACEMENT_COORDINATOR, Administrative Staff -> OTHER with its label in `job_title_custom` (today both break the save).
- **Done when:** the migration is reported and applied; a uni onboarding saves all of it (checked in the DB); tsc clean.

### AUTH-15 The code on hiring's and uni's register pages
- [x] Status: Done 2026-10-01. `EmailCodeStep` in @repo/ui; /verify pages, VerifyEmailForm, their copy and middleware entries deleted. Also found: `emailVerification.autoSignInAfterVerification` was never set, so verifying minted no session in any app (landed on sign-in); set in packages/auth.
- **Files:** `apps/{hiring,uni}/app/(auth)/(shell)/register/page.tsx`; delete `apps/{hiring,uni}/app/(auth)/(shell)/verify/` and `/verify` in their layouts' copy and middleware; delete `packages/ui/src/components/auth/verify-email.tsx` if nothing else uses it (approved 2026-10-01).
- **Steps:** after the details are sent, the same page shows the six-digit code (OtpInput), verify and resend, as main's register does; then onboarding, keeping hiring's `inviteBy`.
- **Done when:** registering in hiring and uni reaches onboarding without leaving /register; tsc clean.

### AUTH-16 A dev-only way to read a sign-up code
- [x] Status: Done 2026-10-01. In development, `sendVerificationOTP` logs `[dev] <type> code for <email>: <otp>` to the app's dev server.
- **Files:** `packages/auth/src/auth.ts`.
- **Steps:** codes are stored hashed (`storeOTP: "hashed"`), so no script can read them back. Instead, when `NODE_ENV` is `development`, the email-code sender also prints `[dev] <type> code for <email>: <code>` to the dev server's console. Production never logs it.
- **Done when:** registering a test address in dev prints a code that verifies it.
