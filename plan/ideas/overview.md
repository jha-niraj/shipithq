# Ideas - overview

The public feature-request board: people ask for features, content and improvements,
vote, and watch what the team is planning, building and has shipped. It lives in three
places, reading one database:

- **app.shipithq.com/ideas** (apps/main): signed in; post, vote, read.
- **shipithq.com/ideas** (apps/web): read-only, static with ISR; Post and Vote link into
  the app. No user ids or emails ever reach the web.
- **admin** (apps/admin): status, visibility, team updates.

First built in plan/web/revamp (REV-40 to REV-43). This module is the second pass.

## Decisions (Niraj, 2026-09-26)

| Question | Decision |
|---|---|
| Statuses | **Open, Planned, Building, Shipped.** `feedback_status` gains `IN_PROGRESS` ("Building"). |
| Moderation | **Public immediately**; 5 posts a day per user; admins can hide anything. Bug reports are never public. |
| Detail | **A detail page** on web and app: full text, a status timeline (posted, planned, building, shipped), a public **Team update** written in admin, and a link to the changelog once shipped. No user comments yet. |
| Authors | **First name and avatar**, or "ShipItHQ team" for admins; a **Post anonymously** option shows "Community". |
| Sign-in | Every path to /ideas (sign in, register, Google, GitHub, magic link, onboarding) returns the user to where they started. |

## Done when

1. An idea can move Open, Planned, Building, Shipped in admin, and both boards show the
   status, its count on the tabs, and the date each stage was reached.
2. /ideas/<id> exists on web and app; a Team update and a changelog link set in admin
   appear on both.
3. Cards show first name and avatar, or Community when posted anonymously, or the team.
4. From shipithq.com/ideas, "Post an idea" as a signed-out visitor, through sign-in,
   register (email, Google, GitHub, magic link) and onboarding, lands on
   app.shipithq.com/ideas?post=1. An already signed-in visitor sent to /signin with a
   callbackUrl goes straight there.
5. Ideas is in the app's navigation.
