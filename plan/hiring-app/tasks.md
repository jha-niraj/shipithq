# Hiring app - tasks

Derived from `overview.md`. IDs are `HA-n`, and each task names the
definition-of-done lines it serves (DoD n).

**Build order across both plans:**
1. HA-1 to HA-9, and HA-16 (this foundation, including removing the Mock
   page)
2. `plan/hiring-rounds` HR-1 to HR-9 (data and company profiles)
3. HR-10 to HR-12 (the company pipeline builder, on this shell)
4. HA-10, then HR-13 to HR-19, then HR-22 to HR-26 (My rounds, the company
   page, reporting, the notice on each send, closed jobs)
5. HA-11 to HA-13
6. HA-15 (Home, which needs the rounds data)
7. HR-20, HR-21, then HA-14 (the final audit)

Starting point, mapped 2026-09-25:
- **Landing:** `/` is a 12-section landing page (`apps/hiring/app/page.tsx`
  plus `components/landingpage/*`, about 1,400 lines).
- **Sign-in:** auth is the shared better-auth (`packages/auth/src/auth.ts`).
  Hiring shows email and password plus Google, and checks nothing about the
  email's domain.
- **Onboarding** (`actions/auth/onboarding.action.ts`) makes the creator
  FOUNDER only if their title is CEO, CTO and the like, and RECRUITER
  otherwise.
- **Invites:** they email a `/invite?code=` link, and that route does not
  exist.
- **Roles:** the enum is FOUNDER, ADMIN, HIRING_MANAGER, RECRUITER and
  INTERVIEWER.
  - Checks are ad hoc: `canManageInterviewConfig` is defined twice, and there
    are inline `role !== "FOUNDER"` checks.
  - Jobs, applications and candidates actions check nothing.
  - The `permissions` JSON on a member is shown but never enforced.
- **Shell:** its own sidebar (`components/navigation/sidebar.tsx`, a wrapper
  of `@repo/ui` app-sidebar), with no AI panel.
  - 72 `Loader2` and 51 `animate-spin` uses, and no `PageHeader`.
  - Pink is used in 4 files.
  - `lib/navigation.ts` links to 4 routes that don't exist.
  - `middleware.ts` leaves `/billing`, `/interview-config`, `/mock`,
    `/invoices` and `/transactions` unprotected.
- **Messages:** none to candidates. The `notifications` table exists
  (`schema.ts:470`) and hiring only reads it.

---

## HA-1 Move the shell into @repo/ui
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 8.
**Why.** "Sidebar needs to be the same as this one." A copy drifts, as the jobs sidebar did before JB-8.

**Files.** Moved into `packages/ui/src/components/shell/`:
- `apps/main/components/navigation/sidebar.tsx`
- `sidebar-hot-edge.tsx` and `sidebar-pin-cookie.ts`
- `apps/main/components/common/sidebarprovider.tsx`
- `apps/main/components/ai/ai-rail.tsx`
- the page column from `apps/main/app/(main)/_components/main-shell.tsx`

The app-specific parts become props:
- the navigation links
- the user menu
- the credits button (main only)
- the AI panel component
- the ⌘K sources

**Steps.**
- Move each file, then replace every app-specific import with a prop or a
  slot.
- `apps/main` renders the shared shell with its current links and `AIPanel`.

**Edge cases.**
- The pin cookie name stays the same, so no user's saved choice resets.
- `apps/main`'s `(jobs)` shell uses the same pieces.

**Done when.**
- `apps/main` looks and behaves identically at 1440 and 390, pinned and
  unpinned, with the AI rail open and closed. Screenshots match before and
  after.
- `tsc` is clean in `apps/main`, `apps/hiring` and `packages/ui`.

**Verified 2026-09-25.**
- **What moved into `packages/ui`:**
  - `components/shell/`: `shell-sidebar.tsx` (`ShellSidebar`, every
    app-specific part a prop), `sidebar-provider.tsx`, `sidebar-hot-edge.tsx`,
    `customize-sidebar-sheet.tsx` (presets passed in), `docked-rail.tsx`
    (`DockedRail`: open, width, content as props), `shell-frame.tsx`
    (`ShellFrame`: the hover strip, the sidebar, the page column, the rail
    slot)
  - `lib/`: `shell-navigation.ts` (types and pin logic), `shell-motion.ts`,
    `sidebar-pin-cookie.ts` (same cookie name)
- **What the main app keeps:** its links, presets, credits, AI store and
  panel, and thin wrappers. Its old import paths re-export the shared
  modules, so one React context serves both.
- **The jobs shell** now uses `ShellFrame` too, with a white surface.
- **Screenshots before and after,** in 9 states (1440 pinned, unpinned,
  hover-revealed, AI open, jobs pinned, jobs with AI, 390, 390 with the menu,
  dark): sidebar and page geometry are identical, and 5 are pixel-identical.
  The other 4 differ only in the dev badge text and the AI greeting's time of
  day.
- **Interactions:** unpin writes the cookie and slides the sidebar off, hover
  reveals it, leaving hides it, pin brings it back, ⌘K opens the palette, and
  the customize sheet shows the presets.
- **The AI rail:** it resizes (380 to 500 px), unpins the sidebar while open,
  and closing it restores the pinned sidebar.
- `tsc` is clean in `packages/ui`, `apps/hiring`, and `apps/main`, apart from
  in-progress profile files another session is editing.

## HA-2 The hiring shell
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 8, 9.
**Files.**
- `apps/hiring/app/(main)/layout.tsx`
- `apps/hiring/lib/navigation.ts`
- `apps/hiring/middleware.ts`
- delete the hiring-only sidebar and sidebar provider

**Steps.**
- Render the shared shell with the hiring links and a placeholder AI panel
  (HA-11 fills it in).
- Fix or remove the 4 dead links.
- Protect every `(main)` route on the server, using one list derived from the
  route groups rather than typed out by hand.
- Replace the layout's `Loader2` pending state with `ShipItHQLoader`.

**Edge cases.** The Razorpay script stays only where billing needs it.

**Done when.**
- Every sidebar link resolves (a script walks `navigation.ts` against
  `app/`).
- Opening `/billing` signed out redirects on the server.
- The hiring sidebar pins, unpins and reveals on hover like the main app's.

**Verified 2026-09-25.**
- **The shell:** the hiring app renders `ShellFrame` with `ShellSidebar`
  (`components/navigation/sidebar.tsx`) and a server `(main)/layout.tsx` that
  reads the pin cookie. The old collapse-style `AppSidebar` wrapper and
  `components/navigation/sidebarprovider.tsx` are gone. `AppSidebar` itself
  stays, because apps/admin and apps/uni still use it.
- **Navigation:** 10 top-level rows (the shared pin cap), with Team and Roles
  under Company and Billing, Transactions, Invoices and Help under Settings.
  The dead links and the unread `?status=` filters are removed.
  `node scripts/check-nav.mjs` reports every link resolving.
- **Sign-in gate:** `middleware.ts` now lists the PUBLIC pages, so everything
  else needs a session. Signed out, with JavaScript off, /billing,
  /interview-config, /mock, /invoices, /transactions and /home all redirect to
  /signin on the server. The client-side redirects and the Loader2
  "Initializing" screen are removed.
- **Notifications:** the bell is the shared panel fed by HIRING notifications
  only (it used to show MAIN ones too), with a new "mark all read".
- **In the browser** at 1440, signed in as `pnpm script e2e-hiring`'s account:
  pinned (sidebar x 0, page x 240), unpinned (sidebar off, page x 0), hover
  reveals it, Jobs expands, and "Create a job" navigates. At 390, the bottom
  bar shows.
- **No AI button yet,** on purpose: HA-11 adds it with the panel it opens.
- **Local setup found:** apps/hiring has no `.env`, only the examples, so its
  auth returned 500 on every request. The checks ran with apps/main's `.env`
  loaded through dotenv-cli.

## HA-3 The landing page moves to shipithq.com/hire; the app opens on sign-in
- [ ] Status: code done and verified locally 2026-09-25; waiting on the hire.shipithq.com domain (Niraj) for the last check.

**DoD** 1.
**Files.**
- `apps/hiring/app/page.tsx` (becomes a server redirect)
- `apps/hiring/components/landingpage/*` and `app/page.tsx`'s sections, which
  MOVE to `apps/web/app/hire/` (page plus `_components/`). They are not
  deleted (Niraj, 2026-09-25).
- `(home)/help`
- `(legal)/*` (legal pages stay, linked from sign-in)
- `apps/hiring/wrangler.jsonc` routes
- `.env.production.example` (`BETTER_AUTH_URL`, trusted origins)

**Steps.**
- `/` redirects: signed out to `/signin`, signed in to `/home`, not onboarded
  to `/onboarding`.
- Move the 12 sections to `apps/web/app/hire/`, unchanged apart from import
  paths:
  - their CTAs point at `hire.shipithq.com/signin` and `/register`, through a
    `HIRING_APP_URL` constant in apps/web
  - add the web app's dependencies they need (Lenis `SmoothScroll`, anything
    else they import)
  - add `/hire` to the web sitemap and nav
- Point the custom domain at `hire.shipithq.com`.

**Edge cases.**
- The auth cookie domain and trusted origins have to include the new host, or
  sign-in silently loops.
- The Dodo webhook URL has to be updated wherever it is registered.

**Done when.**
- `shipithq.com/hire` renders all 12 sections, with no console errors, in
  light and dark.
- Its "Get started" opens hiring sign-in.
- The hiring app's `/` never renders marketing, and nothing in `apps/hiring`
  imports `components/landingpage`.
- A sign-in on the new host lands on Home.

**Verified locally 2026-09-25.**
- **The move:** the 16 landing components moved with `git mv` to
  `apps/web/app/hire/_components/`, so history is kept. `app/hire/page.tsx` is
  a server page with canonical metadata and renders them.
- **No auth on the website** (apps/web/CLAUDE.md):
  - the navbar's signed-in branch and the pricing section's session read are
    removed
  - every product CTA is a plain `<a>` to `HIRING_URL` / `HIRING_LINKS`, new in
    `lib/site.ts` and read from `NEXT_PUBLIC_HIRING_URL`, which is added to
    `next.config.mjs` and both env examples
  - Privacy and Terms point at the website's own pages
  - the brand "Coder'z Hiring" is now "ShipItHQ Hiring"
  - `/hire` is in the sitemap
- **In the browser:** `localhost:6005/hire` returns 200 with all 12 sections
  in light and dark, and every CTA points at `localhost:6004` (signin,
  register, contactus, help). The one console error, a CSP block on dev-mode
  `eval`, appears on every page of the site (/features, /) and predates this.
- **The hiring app:**
  - `/` is a server redirect to /signin (middleware sends signed-in users to
    /home first)
  - the (auth) layout is children only, as in apps/main
  - help and legal get a slim `PublicHeader`
  - the three layouts' metadata described the student product; they now say
    Hiring and are `noindex`
  - `components/smoothscroll.tsx` and `lib/lenis` were only for the landing
    page and are removed. The website has its own copies. The `lenis` package
    entry in apps/hiring is now unused.
- **Left for Niraj:**
  - point `hire.shipithq.com` at the hiring worker
  - add the host to the auth trusted origins and `AUTH_COOKIE_DOMAIN`
  - re-register the Dodo webhook URL
  - set `NEXT_PUBLIC_HIRING_URL` in apps/web's `.env.production`
- **Content to fix when the page is improved:** the hero's stat band claims
  "10k+ Active Nodes", "500+ Enterprises" and the like, which are not real
  numbers.

## HA-4 Company-email sign-up, no Google
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 2.
**Files.**
- `packages/auth/src/work-email.ts` (new: the free-mail and disposable domain
  lists plus `isWorkEmail`)
- `apps/hiring/app/(auth)/register/page.tsx` and `signin/page.tsx` (remove
  Google)
- a server check in hiring's sign-up path and in `completeOnboarding`

**Steps.**
- Refuse non-work emails on the server, before the account is created and
  again at company creation, with the message: "Use your company email. Free
  and temporary addresses can't create or join a company."
- The client check is only for early feedback.

**Edge cases.**
- Sign-up is shared with the student app, so the block applies only to hiring
  sign-ups, which are identified by platform or origin, never to students.
- Subdomains of a free-mail provider are blocked too.
- An existing hiring user on free mail is not locked out: they are flagged
  for admin review.

**Done when.**
- `x@gmail.com` is refused by the server, even when the client is bypassed.
- `x@acme.io` signs up and receives the code.
- There is no Google button anywhere in hiring.

**Verified 2026-09-25.**
- **The check:** `packages/auth/src/work-email.ts` (`checkWorkEmail`,
  exported as `@repo/auth/work-email`). It has about 60 free-mail and 50
  disposable domains and matches subdomains too (`mail.yahoo.com`). A
  lookalike like `gmail.com.evil.io` passes, correctly.
- **The server gate:** it sits in `apps/hiring/app/api/auth/[...all]/route.ts`,
  in front of the shared handler. Probed on the server:

  | Request | Result |
  |---|---|
  | sign-up with gmail or mailinator | 400 `WORK_EMAIL_REQUIRED` |
  | sign-up with a work email | passes the gate, then better-auth's own rule answered `PASSWORD_TOO_SHORT`, so no account was created |
  | social, magic-link and email-OTP sign-in (each can create an account around the check) | 403 `SIGN_IN_METHOD_DISABLED` |
  | normal email sign-in | still reaches better-auth |
  | apps/main's sign-up with gmail | unaffected |

- **The second check:** `completeOnboarding` refuses a non-work email before
  any company is created. This is needed because a session made on apps/main
  (a student's gmail) is valid here through the shared cookie.
- **The pages:** Google is removed from /signin and /register, and neither
  page has a Google button now. The register page checks early, with the same
  message. Their spinners are now `InlineLoader` and `ShipItHQLoader`.
- **Content fixed on /register:** the "Coder'z Hiring" brand is now
  "ShipItHQ Hiring", and an invented testimonial ("Reduced our hiring cycle
  from 6 weeks to 2 weeks... Engineering Lead, Series B Startup") is removed.
- **Not built:** flagging existing free-mail hiring users for admin review.
  None can create or join a company now. If any exist, a review queue belongs
  with the admin work in hiring-rounds (HR-8, HR-24).
- **For HA-9:** /register's light-mode layout leaves a white gutter beside its
  dark panel (`max-w-7xl` on a split screen), and the copy still says "for
  founders, CEOs and executives only", which HA-5 makes untrue.

## HA-5 Onboarding: Owner, existing domains, claims
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 3, 4.
**Files.**
- `apps/hiring/actions/auth/onboarding.action.ts`
- `app/(auth)/onboarding/page.tsx`
- `company.websiteDomain` (unique) added here, with a preview-first backfill
  from existing companies' websites. HR-1 then reuses it rather than adding
  it again.

**Steps.**
- The creator always gets the Owner role (HA-6), whatever their job title.
- Before creating anything, look up the email's domain:
  - an active company: show "Your company is already on ShipItHQ. Ask an
    admin to invite you." and create nothing.
  - an unclaimed page: show hiring-rounds' claim flow (HR-8). Until HR-8
    exists there are no unclaimed pages, so this branch ships with HR-8.

**Edge cases.** Two people from a new domain onboarding at the same moment: a
unique index on `websiteDomain` lets one win, and the other is sent to "ask
for an invite".

**Done when.**
- A CTO and a recruiter each creating a new company both become Owner.
- A second `@acme.io` sign-up sees "ask for an invite".

**Verified 2026-09-25.**
- **Schema:** `company.website_domain` (unique) is migration
  `0033_company_website_domain`, applied together with the profile session's
  `0032` with Niraj's OK. `pnpm script company-domains` backfilled 6 seeded
  companies from their websites; its re-check is empty.
- **`completeOnboarding`:**
  - it refuses a person who already has a company
  - it refuses a domain that already has a company, matching the email domain
    and its parents (`mail.acme.io` finds `acme.io`), with "X is already on
    ShipItHQ. Ask an admin there to invite you."
  - the creator is always FOUNDER, whatever the job title
  - the company and membership are written in one `withTransaction`
  - a race on the unique domain returns the same "ask for an invite"
- **The onboarding page** asks `getOnboardingEligibility` first, and shows
  "Your company is already here" or "A company email is needed" (with sign
  out) instead of the form. Its three spinners are replaced.
- **Found and fixed on the way:** "onboarded" in hiring used
  `user.onboardingCompleted`. apps/main's STUDENT onboarding sets that flag,
  so a student signing in to hiring skipped company creation and landed on an
  empty Home. Onboarding also wrote the flag, which would make a hiring user
  skip the student onboarding in apps/main.
  - Now the `(main)` layout redirects to /onboarding when the person has no
    `company_member` row.
  - The middleware no longer reads the flag.
  - Hiring never writes it.
- **In the browser:**
  - The e2e STUDENT account (`shipithq.dev`, no membership) opening
    hiring /home lands on /onboarding with "E2E Hiring Co is already on
    ShipItHQ. Ask an admin there to invite you".
  - The hiring member opening /onboarding or /signin lands on /home.
  - A newcomer (`pnpm script e2e-hiring --newcomer`, `owner@e2e-newco.test`)
    completed onboarding choosing the title "Recruiter". The database shows
    `role FOUNDER`, `jobTitle RECRUITER`, the company `website_domain
    e2e-newco.test`, PENDING verification, and `onboardingCompleted`
    untouched (false).

## HA-6 Roles and permissions, enforced
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 5, 6.
**Files.**
- `packages/db/src/schema/hiring.ts`: a new `company_role` table (`companyId`,
  `name`, `permissions` text[], `isOwner`, `isPreset`) and
  `company_member.roleId`
- the migration, with a preview-first backfill script
- `apps/hiring/lib/permissions.ts` (new: the permission list and
  `requirePermission(action)`)
- every action in `apps/hiring/actions/*`

**Steps.**
- Create the Owner role and the three presets for every company. Map the old
  roles:
  - FOUNDER to Owner
  - ADMIN to Admin
  - HIRING_MANAGER and RECRUITER to Recruiter
  - INTERVIEWER to Interviewer
- Replace every inline role check with `requirePermission`, and add checks to
  jobs, applications and candidates.
- The UI hides controls using the same helper.

**Edge cases.**
- A company always keeps at least one Owner, so the last Owner can't leave,
  be demoted or be removed.
- "Delete company" belongs to the Owner role only and can't be ticked on
  another role.
- A member whose role is deleted falls back to the lowest preset, not no role.

**Done when.**
- The backfill preview lists every member's old role and new role, and the
  re-run after `--apply` is empty.
- A grep finds no `role !== "FOUNDER"` and no `canManageInterviewConfig` left.
- A Recruiter calling a team action directly gets "not allowed".

## HA-7 Roles editor
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 5.
**Files.** `apps/hiring/app/(main)/team/roles/*`.

**Steps.**
- List the roles and their member counts.
- Edit a role's name and permission ticks, or create a role from scratch or
  from a preset.
- The Owner role shows read-only.

**Done when.** A custom "Campus recruiter" role with 3 permissions can be
created and assigned, and its member sees exactly those controls.

**Verified 2026-09-25 (HA-6 and HA-7).**
- **Data:**
  - `packages/db/src/hiring-permissions.ts` holds the 12 permissions, the
    presets and the legacy mapping (a constants-only subpath,
    `@repo/db/hiring-permissions`, for client code)
  - migration `0034_company_roles` adds the `company_role` table and a
    `role_id` on members and on invitations. It is additive and was applied.
  - `pnpm script company-roles` created 32 roles (4 in each of 8 companies) and
    gave 8 members roles; its re-check is empty. The seed account
    flamingocool2@gmail.com, a recruiter of the 6 demo companies with no
    founder, became their Owner, as previewed and approved.
  - onboarding now creates the four roles and makes the creator Owner, in
    the same transaction
- **Enforcement:**
  - `apps/hiring/lib/permissions.ts` (`getCompanyContext`, cached per
    request, and `requirePermission`) replaced about 15 private
    `getUserCompany()` copies.
  - A subagent sweep put a permission on every exported action. My own check
    found none missing, no `role !== "FOUNDER"` and no
    `canManageInterviewConfig`. The table of which action needs which
    permission is in the session log.
  - The owner rules are in the team actions and in `assignMemberRole`.
- **Security fixes found by the sweep:**
  - `handlePaymentWebhook` was a PUBLIC server action anyone could call to
    upgrade a plan. It now lives in `lib/payment-webhook.ts` (server-only).
  - `createInvoiceForPayment` was unauthenticated and not scoped to the
    company.
  - `getPrepProgress` read any company's application.
- **UI:**
  - the roles editor (`team/roles/_components/roles-editor.tsx`) replaced the
    911-line page, with a matching `loading.tsx`
  - the team page's member badges and "Make <role>" menu use the company
    roles
  - the sidebar hides links the member can't use (`navigationFor`), and the
    shell shows "You don't have access to this page" for such a route
    (`permissionForPath`)
- **In the browser,** as the newcomer:
  - **As Owner:**
    - the list shows Owner (Fixed, 12), Admin (10), Recruiter (7),
      Interviewer (2)
    - "Campus recruiter" was created by copying Interviewer, given Message
      and Invite, and saved (4 permissions, confirmed in the database)
    - the Owner role's switches are all disabled
    - moving myself, the only Owner, to Recruiter was refused by the server
      with "A company must keep at least one Owner."
  - **Switched to Recruiter** (`pnpm script e2e-hiring --newcomer --role=RECRUITER`):
    - no "New role" button, and a role shows "changing them needs Manage
      roles"
    - /billing and /invoices show the no-access page
    - the sidebar has no Billing link, and /team has no Invite button
    - /jobs/new and /analytics open
- **Not shown in the browser:** giving a second person a custom role. The
  test company has one member until invites work (HA-8). The same
  `assignMemberRole` path served the refusal above, and HA-8's check covers it.
- **Left for later tasks, found by the sweep:**
  - the Dodo webhook route does not verify signatures
  - AI interview templates are saved `isPublic` with the company's prompt, and
    hard-code "gpt-4o" instead of `modelFor`
  - `createJob` does not check that `interviewProcessId` is the company's
  - `updateMockSession` passes client `data` straight to `.set()`

  Recorded as HA-18.

## HA-8 Invites that work
- [x] Status: done 2026-09-25, verified (notes below).

**DoD** 7.
**Files.**
- `apps/hiring/app/(auth)/invite/page.tsx` (new)
- `actions/team/team-invites.ts`
- `lib/emails/hiringemail.ts`

**Steps.**
- The page validates the code and shows the company and role, then offers
  sign-in or sign-up.
- The email used must match the invited address.
- On acceptance, create the member with the invited `roleId` and mark the
  invite used.

**Edge cases.**
- An expired, used or cancelled code gives a clear message and a "request a
  new invite" hint.
- A user who already belongs to another company can't accept (one company
  per user in v1).
- Invites follow the work-email rule too.

**Done when.** An invite goes all the way from the email to Home as the
invited role, and reusing the code fails.

**Verified 2026-09-25.**
- **Sending:** `inviteTeamMember` takes a company `roleId`.
  - Only an Owner can invite an Owner.
  - The email is lower-cased and must be a work email.
  - It refuses someone already in this or another company, and a duplicate
    pending invite.
  - Resend extends the expiry by 7 days, and its email names the company role.
- **Accepting:** `actions/team/invite.action.ts`.
  - `getInvitation` is public; the code is the secret.
  - `acceptInvitation` needs the invited email signed in and no existing
    company. It claims the invite conditionally, so it works once, then
    creates the member with the role, all in one transaction.
  - `getMyPendingInvitation` lets onboarding offer the invite.
- **The page:** `/invite?code=` (`app/(auth)/invite/page.tsx`).
- **Found and fixed:** sign-in defaulted to a nonexistent `/dashboard` after
  login and followed any `callbackUrl`, which was an open redirect. It now
  takes only in-app paths and defaults to /home.
- **In the browser** (the company E2E NewCo; invitees from
  `pnpm script e2e-hiring --user=<email>`):
  - **Sending:**
    - inviting someone@gmail.com was refused with the company-email message
    - member@ was invited as "Campus recruiter" and member2@ as Interviewer.
      Both are PENDING, expire 7 days out, and carry the right role in the
      database.
  - **The link:**
    - signed out, it shows "Join E2E NewCo, E2E Newcomer invited
      member@e2e-newco.test to join as Campus recruiter", with sign in or
      create account
    - signed in as another account, it says "You're signed in as
      e2e-hiring@shipithq.dev. This invitation is for member@..."
    - the invitee accepted and landed on /home
    - reusing the link says "This invitation has been used"
  - **As the Campus recruiter member:** no Billing link, no New role, no
    Invite button, exactly that role's controls. This closes HA-7's open
    check.
  - **member2** signed in, was sent to /onboarding, was offered "You've been
    invited to E2E NewCo", accepted, and landed on /home.
  - **The Owner's view:** the team menu offers "Make <role>" for the company's
    roles. It changed member2 to Campus recruiter, and that survived a reload.

## HA-9 UI rules sweep (existing pages)
- [ ] Status: not started.

**DoD** 9.
**Files.** Every page under `apps/hiring/app/(main)` and `(auth)`.

**Steps.**
- Replace all 72 `Loader2` and 51 `animate-spin` uses:
  - skeletons for blocks
  - `InlineLoader` in buttons
- Put page titles into `PageHeader`.
- Replace pink with the neutral palette.
- Check that each `loading.tsx` matches its page.
- Remove hand-rolled number cards (use `StatBand`).

**Edge cases.** Red stays only for destructive actions and errors.

**Done when.** A grep finds 0 `Loader2`, 0 `animate-spin` and 0 `pink-` in
`apps/hiring`, and every page's first paint matches its skeleton.

## HA-10 Messages: company to student
- [ ] Status: not started.

**DoD** 11.
**Files.**
- `packages/db/src/schema/hiring-messages.ts` (new: `message_thread` with
  `companyId`, `userId` and `sendId`; and `message` with `threadId`,
  `authorKind` COMPANY | STUDENT, `authorId`, `body`, `readAt`)
- `apps/main/app/(jobs)/jobs/messages/*` (new student inbox, plus a sidebar
  link with an unread count)
- the candidate detail in `apps/hiring/app/(main)/applications/[jobSlug]/*`
- a new `NEW_MESSAGE` email in `lib/emails` (both apps)
- `notifications` rows written for both sides

**Steps.**
- A thread exists per (company, student). It is opened by the company, only
  for a student who sent it results.
- The student can reply in the thread.
- The email notice links back to the thread.

**Edge cases.**
- A student who withdrew their send can still read the thread, but the
  company can't start new messages to them.
- Emails are batched, at most one per thread per hour.

**Done when.** A company message reaches the student's inbox and email, the
reply appears on the company side, and unread counts update on both.

## HA-11 Company AI panel: answers
- [ ] Status: not started.

**DoD** 12.
**Files.**
- `apps/hiring/app/api/ai/chat/route.ts`: inline and streamed, modelled on
  `apps/main/app/api/ai/chat/route.ts` (tool rounds, the stream protocol in
  `lib/ai/protocol.ts`), with a 25-second timeout. It is not a worker job
  (CLAUDE.md "Long-running work").
- `modelFor("hiringAi")`
- `apps/hiring/components/ai/hiring-ai-panel.tsx` (in the shared rail from
  HA-1)
- `actions/ai/hiring-ai.action.ts`
- a `hiring_ai_usage` counter (per company per month)

**Steps.**
- The model reads this company's roles, pipelines, sends and scores (never
  another company's), and answers citing the candidates and rounds it used.
- The panel shows how much of the 300-message cap is left.

**Edge cases.**
- The company scope is enforced in the route's data queries, not only in the
  prompt.
- Past the cap, the panel says so and nothing is dispatched.
- "use AI" is required.

**Done when.**
- "Who scored highest in DSA for Backend?" names the right candidate from
  seeded data.
- A second company's candidates never appear.
- Message 301 is refused.

## HA-12 AI actions: messages and pipelines
- [ ] Status: not started.

**DoD** 12.
**Steps.** Proposal cards, the same pattern as the Project AI:
- **A message:** the recipients (resolved from a filter such as "DSA > 80 on
  Backend") and the text, with Send and Cancel. Send goes through HA-10 and
  needs "message candidates".
- **A pipeline or rounds:** Add and Cancel. Add creates a template through
  HR-10's actions and needs "manage pipelines".

**Edge cases.**
- The recipients are fixed when the card is made. Send never re-evaluates the
  filter, so the company sends to exactly the people it saw.
- A group message creates one thread per student, never a group thread that
  shows other recipients.

**Done when.**
- A group message to 3 filtered students lands in 3 separate inboxes.
- Cancel sends nothing.
- A pipeline card's Add creates an editable template.

## HA-13 AI attachments
- [ ] Status: not started.

**DoD** 12.
**Steps.**
- Upload a PDF, DOCX or TXT (up to 10 MB) to R2, privately, under a
  per-company prefix.
- Extract the text in the worker, and give the panel the attached documents
  as context.
- A company can list and delete its attachments.

**Edge cases.**
- Never served through the public `/api/media`.
- A file that yields no text is refused with the reason.

**Done when.** A JD attached and used in "draft a pipeline from this JD"
produces rounds that reflect it, and the file can't be fetched without a
signed URL.

## HA-14 Final audit
- [ ] Status: not started.

**DoD** 9.
**Steps.**
- Screenshot every hiring route at 390, 768 and 1440, in light and dark.
- Check scroll width, contrast, skeleton match and dead links.
- Fix what fails, then record the pass in this file, as the ui-pass did.

**Done when.** Every route passes at the 3 widths and in both themes, and the
record lists them.

## HA-15 Home
- [ ] Status: not started.

**DoD** 10.
**Files.**
- `apps/hiring/app/(main)/home/*` (replaces `home-content.tsx`)
- its `loading.tsx`

**Steps.** Three parts:
- **Roles table:** role, pipeline, sends to review, pass rate per round.
- **Funnel per round:** for the role picked in the table, how many started
  and how many passed each round.
- **Needs attention:** a list of items, each with a link.

Before hiring-rounds data exists, the funnel uses application statuses and
says so.

**Edge cases.** A company with no roles sees one clear next step (create a
role), not an empty table and chart.

**Done when.** With seeded runs, the funnel's counts match a SQL count per
round, and each needs-attention item links to where it is resolved.


## HA-16 Remove the Mock page; keep the rest
- [ ] Status: Mock removed 2026-09-25 (verified: `app/(main)/mock` and `actions/mock` deleted, the sidebar entry gone, `/mock` returns 404, `scripts/check-nav.mjs` clean, tsc clean). The Candidates change waits on hiring-rounds sends (HR-2, HR-17): until sends exist, Candidates keeps listing applicants.

**Why.** Voice rounds (hiring-rounds HR-16) replace the company Mock page.
Assignments, Candidates, Universities and Analytics stay, and HA-9 applies the
UI rules to them.

**Files.**
- `apps/hiring/app/(main)/mock/*`
- `actions/mock/*`
- the sidebar entry

The deletion was approved by Niraj on 2026-09-25. List the files in the commit.

**Steps.**
- Remove the Mock page and its actions.
- Candidates becomes "everyone who sent to you", across roles, linking into
  each role's review workspace (HR-18).

**Done when.** `/mock` is gone from hiring, nothing imports `actions/mock`, and
Candidates lists every send.


## HA-17 Close the public user lookup
- [x] Status: done 2026-09-25 (deletion approved by Niraj). `curl /api/user/verify-status/<email>` now returns 404; the route and its middleware allow-list entry are removed, and nothing in the repo referenced it.

**Why.** `apps/hiring/app/api/user/verify-status/[email]/route.ts` is public
(the middleware lets `/api/user/verify-status` through). It answers any email
with that user's id, name, email-verified state and onboarding flag. Anyone can
use it to check whether an address has an account and learn the name behind
it. Nothing in the hiring app calls it.

**Files.** That route, and its entry in `middleware.ts`'s API allow-list.

**Steps.** Propose deleting it, which Niraj approves. If something outside
this repo turns out to use it, instead return only `{ exists, verified }` for
the signed-in user's own email.

**Done when.** `curl /api/user/verify-status/<any email>` no longer returns
another user's details.


## HA-18 Security fixes found in the HA-6 sweep
- [ ] Status: not started. Found 2026-09-25.

**Why.** The permission sweep found holes beyond its own scope.

**Steps.**
- **The Dodo webhook** (`app/api/webhooks/dodo/route.ts`): verify the
  webhook signature before `handlePaymentWebhook`, and reject unsigned
  requests.
- **AI templates** (`generateInterviewTemplate`):
  - save as private to the company, not `isPublic: true` with its `aiPrompt`
  - use `modelFor("interviewTemplate")`, not "gpt-4o"
  - `getInterviewTemplate` and `incrementTemplateUsage` must filter to
    public or own templates
- **Jobs:** `createJob` and `updateJob` must check that the
  `interviewProcessId` belongs to the company.
- **Mock sessions:**
  - `createMockSession` must check that the job and user relate to the
    company
  - `updateMockSession` must whitelist fields instead of `.set(data)`
  - this goes away with HA-16's removal of Mock; do it only if Mock outlives
    HA-16
- **Error typing:** `catch (error)` becomes `catch (error: unknown)` across
  apps/hiring/actions.

**Done when.** A forged webhook POST without a valid signature is refused, a
template made by company A can't be read by company B, and a job can't
reference another company's process.
