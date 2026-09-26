# Ideas - tasks

| ID | Task | Status |
|---|---|---|
| IDEA-1 | Callback URL survives every sign-in, register and onboarding path | built 2026-09-26, browser check Niraj |
| IDEA-2 | Schema: `IN_PROGRESS`, `team_update`, `shipped_href`, stage timestamps | done 2026-09-26 |
| IDEA-3 | Queries: authors (first name, avatar, anonymous, team), one idea, four statuses | done 2026-09-26 |
| IDEA-4 | Admin: Building, team update, changelog link, timestamps set on status change | built 2026-09-26, browser check Niraj |
| IDEA-5 | App: detail page, anonymous option, richer cards, sidebar entry | built 2026-09-26, browser check Niraj |
| IDEA-6 | Web: four-status board, cooler cards, /ideas/<id> detail | built 2026-09-26, browser check Niraj |

## IDEA-1 - Callback survives sign-in
**Why** A new user who signs in with Google, GitHub or a magic link from
/signin?callbackUrl=/ideas lands on /home after onboarding: only /register parks the
destination, and only in sessionStorage (lost on a new tab or device). A signed-in user
sent to /signin?callbackUrl=... is redirected to /home by middleware.
**Files** `apps/main/app/(auth)/(shell)/signin/_components/SignInClient.tsx`,
`register/_components/RegisterClient.tsx`, `apps/main/middleware.ts`.
**Steps** Build `newUserCallbackURL` as `/onboarding?callbackUrl=<safe>` whenever the
callback is not /home (social and magic link, both pages); email register pushes to the
same URL after OTP; middleware honours a safe `callbackUrl` on /signin and /register for
signed-in users (onboarding first if not completed, carrying it).
**Done when** each path in overview line 4 lands on /ideas?post=1 (checked by reading the
URLs each step builds; the browser pass is Niraj's).

## IDEA-2 - Schema
`feedback_status` + `IN_PROGRESS`; `feedback.team_update text`, `shipped_href text`,
`planned_at`, `started_at`, `shipped_at timestamp`. Migration previewed, applied on dev.
**Done when** the migration is applied on dev and the enum lists four values.

## IDEA-3 - Queries
`@repo/db/ideas`: authors resolved server-side (first name, image, or null for anonymous;
`byTeam` for admins), `getPublicIdea(id)`, statuses open/planned/building/shipped.
**Done when** the web page's query selects no id or email column.

## IDEA-4 - Admin
Status select with Building; a Team update textarea and a changelog link on each idea;
entering a status stamps its timestamp once.

## IDEA-5 - App
`/ideas/[id]`; cards link to it; "Post anonymously"; Ideas in the sidebar.

## IDEA-6 - Web
Tabs All / Open / Planned / Building / Shipped with counts; cards with author, status
accent, vote box; `/ideas/[id]` with the timeline, team update and changelog link.

## Outcome (2026-09-26)

- IDEA-1 `lib/urls.ts` `onboardingUrlFor(callback)`; sign-in (Google, GitHub, magic
  link) and register (email OTP, Google, GitHub, magic link) send new accounts to
  `/onboarding?callbackUrl=<where they started>`, so the destination survives OAuth, a
  new tab and another device (sessionStorage stays as a fallback). Middleware: a
  signed-in visitor on /signin or /register with a safe callbackUrl goes there (via
  onboarding, carrying it, if unfinished). Onboarding already honoured `?callbackUrl`.
  Path from the site: shipithq.com/ideas "Post an idea" -> app /ideas?post=1 ->
  middleware -> /signin?callbackUrl=/ideas?post=1 -> (register / social / magic) ->
  /onboarding?callbackUrl=/ideas?post=1 -> /ideas?post=1.
- IDEA-2 migration `0050_idea_timeline.sql` applied on dev (`IN_PROGRESS`, `team_update`,
  `shipped_href`, `planned_at`, `started_at`, `shipped_at`). Production:
  `pnpm db:migrations --apply`.
- IDEA-3 `@repo/db/ideas`: author resolved in SQL (first name via split_part, avatar,
  "Community" when anonymous, "ShipItHQ team" for admins), `getPublicIdea`, four-status
  counts. Verified on dev with two temporary ideas (counts, author kinds, detail), then
  removed.
- IDEA-4 admin: Building in both selects; stage timestamps set once with coalesce; a
  Team update sheet (public note, shipped link, validated) via `setIdeaPublicInfo`.
- IDEA-5 app: `/ideas/[id]` (vote, timeline, team update), cards link there, "Post
  anonymously", Ideas in the sidebar (`lib/navigation.ts`, after Purchase).
- IDEA-6 web: status strip (four pastel tiles with counts), five tabs, the new shared
  card (author, status pill with a live dot for Building, Team update marker), and
  `/ideas/[id]` (ISR 300s) whose vote goes to the same idea in the app.
- Shared: `packages/ui/src/components/ideas/{idea-card,idea-detail}.tsx`.
