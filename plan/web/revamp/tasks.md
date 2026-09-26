# Web revamp - tasks

Derived from `overview.md`. Build in order within a group; groups B-F depend on A.
Every content task starts with a **research step**: read the product code for the claim
before writing it (`polish/01-content-truth.md`). Browser checks are Niraj's.

| ID | Task | Serves | Status |
|---|---|---|---|
| **A. Foundation** | | | |
| REV-1 | Light theme only | 1 | built 2026-09-25, browser check Niraj |
| REV-2 | Marketing primitives (eyebrow, buttons, surfaces, section) | 3, 5, 9 | done 2026-09-25 |
| REV-3 | `SiteNavbar` with the audience switcher | 2 | built 2026-09-25, browser check Niraj |
| REV-4 | Announcement bar | 3 | built 2026-09-25 (empty until content) |
| REV-5 | `SiteFooter` per audience | 2 | done 2026-09-25 |
| **B. Student landing** | | | |
| REV-10 | Hero with floating product fragments | 3 | built 2026-09-25, browser check Niraj |
| REV-11 | Pick your module: five cards | 3 | done 2026-09-25 (sources in content/modules.ts) |
| REV-12 | `/features/<module>` detail pages | 4 | built 2026-09-25, browser check Niraj |
| REV-13 | Everything else: numbered tiles | 3 | built 2026-09-25 |
| REV-14 | `TestimonialWall` and the three data files | 3, 5, 8 | built 2026-09-25; waits on real quotes |
| REV-15 | Pricing strip | 3 | done 2026-09-25 |
| REV-16 | Recompose `/` and propose deletions | 3, 8 | built 2026-09-25; deletions await Niraj |
| **C. Hire** | | | |
| REV-20 | Hiring prices to one source | 5 | done 2026-09-25 |
| REV-21 | Rebuild `/hire` on the system | 5, 8 | built 2026-09-25, browser check Niraj |
| **D. Uni** | | | |
| REV-30 | Uni pricing decision | 5 | deferred (Niraj: Universities stays Soon) |
| REV-31 | Build `/uni` on the system | 5, 8 | deferred |
| REV-32 | `apps/uni` root redirect, landing deletion proposal | 5 | deferred |
| **E. Ideas** | | | |
| REV-40 | Schema: categories, `is_public`, `idea_vote` | 6 | done 2026-09-25 (dev) |
| REV-41 | App `/ideas`: post and vote once | 6 | done 2026-09-25 (DB-verified; UI browser check Niraj) |
| REV-42 | Web `/ideas`: read-only board | 6 | built 2026-09-25 |
| REV-43 | Admin: board names and visibility | 6 | built 2026-09-25 |
| **F. What's new** | | | |
| REV-50 | `/changelog` and the navbar pill | 7 | done 2026-09-25 |
| **G. Finish** | | | |
| REV-60 | SEO wiring for new routes | 4, 6, 7 | done 2026-09-25 |
| REV-61 | Contrast and Lighthouse pass | 9 | contrast done; Lighthouse is Niraj's (needs a build) |

---

## A. Foundation

### REV-1 - Light theme only
**Why** Niraj: web is light only; keep the dark code, drop the switcher.
**Files** `apps/web/app/layout.tsx`, `components/landingpage/homepagenavbar.tsx`,
`app/hire/_components/navbar.tsx`.
**Steps** `ThemeProvider forcedTheme="light"` (keep `attribute="class"`); remove every
`ThemeToggle` render and import.
**Edge cases** A visitor with `theme=dark` in localStorage from before must still get
light (forcedTheme ignores storage). Sonner toasts follow light.
**Done when** `grep -rn ThemeToggle apps/web` is empty, `grep -c "dark:" apps/web -r`
is unchanged, and the page is light with the OS in dark mode.

### REV-2 - Marketing primitives
**Why** Fanout's calm comes from a few parts used everywhere; one file keeps the three
audiences identical.
**Files** `apps/web/components/marketing/{eyebrow,cta,surface,section,meta-line}.tsx`.
**Steps** `Eyebrow` (Geist Mono, uppercase, tracking-widest, 11px, neutral-500);
`PrimaryCta` (ink, raised, inset highlight, arrow that nudges on hover) and
`GhostCta` (text with underline, optional play icon); `Surface` with `tone:
paper|white|ink|stone|mist` setting background AND ink together; `Section` (max width,
vertical rhythm, eyebrow + heading slot); `MetaLine` ("12 TRACKS · 400+ PROBLEMS").
**Edge cases** A `Surface tone="ink"` child must not inherit dark text; buttons keep a
visible focus ring on every tone.
**Done when** the parts typecheck, each tone's text pair is measured >= 4.5:1 and
recorded here.

### REV-3 - `SiteNavbar` with the audience switcher
**Why** One navbar, three audiences (decision).
**Files** `apps/web/components/site/navbar.tsx`, `components/site/audiences.ts`
(replaces `landingpage/nav-links.ts`), `lib/site.ts` (add `UNI_URL`, `UNI_LINKS`),
`.env.example`, `.env.production.example`.
**Steps** Data: `AUDIENCES = { students, companies, universities }`, each with `home`,
`label`, `description`, `links` (with optional dropdown children, as today), `cta`,
`signin`. Audience from pathname (`/hire*`, `/uni*`, else students). Left: logo, the
switcher (`Students ⇅` opening a panel like fanout's "Learning spaces": icon, title,
one-line description), then that audience's links with hover dropdowns (existing
mechanics from WEB-12). Right: What's new pill (REV-50), Sign in (outline), primary CTA.
Sticky, white with a hairline border once scrolled. Mobile: sheet with switcher at top
and accordion links.
**Edge cases** Blog, pricing, compare, legal are shared pages: they show the students
audience. Keyboard: switcher and dropdowns open on Enter/Space, close on Escape, focus
returns. Sign-in goes to the right origin per audience (APP, HIRING, UNI).
**Done when** every web page renders `SiteNavbar`, the switcher lands on `/`, `/hire`,
`/uni`, and on `/hire` Sign in points at `HIRING_LINKS.signin`.

### REV-4 - Announcement bar
**Files** `apps/web/content/announcement.ts`, `components/site/announcement-bar.tsx`.
**Steps** `{ id, tag, text, href, cta } | null`. Mono tag, text, arrow link, close.
Dismissal stored by `id` in localStorage (try/catch), so a new announcement shows again.
**Edge cases** Rendered on the server visible, hidden after hydration if dismissed: use
a `data-` attribute and CSS so it does not flash (script in head reads the id).
**Done when** `null` renders nothing, a new `id` reappears after an old one was closed.

### REV-5 - `SiteFooter` per audience
**Files** `components/site/footer.tsx`; replaces `landingpage/footer.tsx` and
`app/hire/_components/footer.tsx`.
**Steps** Columns: Product (the audience's links), Company, Resources (Guides, Compare,
Ideas, What's new), Legal. The other two audiences linked as "ShipItHQ for companies /
universities". Newsletter stays.
**Done when** one footer file is imported by every page.

### Outcome, group A (2026-09-25)

- REV-1: `forcedTheme="light"` in `app/layout.tsx`; both `ThemeToggle`s removed; `dark:`
  count 1037 before, 1038 after (one is in the new comment). OS-dark check is Niraj's.
- REV-2: one file, `components/marketing/primitives.tsx` (`Eyebrow`, `MetaLine`,
  `PrimaryCta`, `GhostCta`, `OutlineCta`, `Surface`, `Section`, `TONE`, `MONO`). Ratios
  computed from hex: paper 17.2/7.5, white 17.9/7.8, stone 16.0/7.0, mist 16.4/7.2,
  ink 19.8/7.8 (body/muted). Eyebrows moved to neutral-600: neutral-500 is 4.35:1 on mist.
- REV-3: `components/site/{navbar,audiences,header}.tsx`. The bar is sticky and in the
  page flow, so the old clearances came out: `pt-20` on the blogs, legal and 404 mains,
  and PageHero's top padding (`pt-32/36/40` to `pt-16/20/24`, loading skeletons to
  match). Universities shows "Soon" with no link until REV-31. `lib/site.ts` gained
  `UNI_URL`/`UNI_LINKS`; `NEXT_PUBLIC_UNI_URL` added to `next.config.mjs` and both env
  examples. Every page renders `SiteHeader`.
- REV-4: `content/announcement.ts` (null for now) and `announcement-bar.tsx`; a head
  script hides a dismissed id before paint.
- REV-5: `components/site/footer.tsx`, audience prop; `/hire` passes `companies`.
- Now unused, for the REV-16/REV-21 deletion proposal: `landingpage/homepagenavbar.tsx`,
  `landingpage/footer.tsx`, `hire/_components/{navbar,footer}.tsx`.

## B. Student landing

### REV-10 - Hero with floating product fragments
**Research** Read the real UI for each fragment: practice run result, project sprint
card, mock interview score, resume ATS match. Copy labels from the product.
**Files** `components/home/hero.tsx`, `components/home/fragments/*.tsx`.
**Steps** Eyebrow pill ("NEW · <from announcement>"), headline in display sans with one
Geist Mono word, one-paragraph sub, PrimaryCta "Start free" to `APP_LINKS.signup`,
GhostCta "See how it works" to `#modules`. Four tilted fragment cards at the corners,
lg+ only, with a slow CSS float; `prefers-reduced-motion` stops it.
**Edge cases** Fragments are `aria-hidden` and hold no claim the product cannot show;
below lg the hero is text only, no layout shift.
**Done when** fragments match the product's own labels (listed here with their source
files), and CLS on `/` is 0.

### REV-11 - Pick your module
**Research** For each of Projects, Practice, AI tools, Jobs, Mock: three true bullets and
one meta line of real counts, each with its source (route, table, or
`actions/stats.action.ts`).
**Files** `components/home/modules.tsx`, `components/home/module-art.tsx`,
`content/modules.ts` (one record per module, reused by REV-12 and the navbar).
**Steps** Eyebrow "PICK YOUR MODULE", heading, five tall cards in a row (scroll-snap
carousel under lg): dithered stacked-card SVG with the module name in mono, eyebrow
("BUILD PATH"), mono title, three "+" bullets, meta line, "Explore" link to
`/features/<id>`. Tones alternate ink / white / stone / mist.
**Edge cases** A count that cannot be read at build time shows no number, never a
guess. Cards equal height.
**Done when** every bullet and number has a recorded source in `content/modules.ts`.

### REV-12 - `/features/<module>` detail pages
**Why** Niraj: "inside each some more detailed information".
**Files** `app/(home)/features/[module]/page.tsx`, `loading.tsx`; `features/page.tsx`
becomes an index of the five cards.
**Steps** Per module: hero (eyebrow, title, sub), what you do in it (3 to 5 steps),
what makes it different, honest limits, a fragment illustration, CTA to the app,
related modules. `generateStaticParams` from `content/modules.ts`; metadata and
canonical per page. Old `/features#id` anchors redirect to the new pages.
**Done when** five pages build statically, each linked from its card and the navbar.

### REV-13 - Everything else
**Research** Only surfaces that exist: Resume builder, Public profile, Pathfinder,
Credits, Guides, Compare, Ideas, What's new.
**Files** `components/home/everything-else.tsx`.
**Steps** Heading "Everything else on ShipItHQ", 4x2 numbered tiles (01 to 08): line
illustration, mono label, title, one-line sub, arrow. Tones as REV-11.
**Done when** every tile's link resolves (app links go to `APP_URL`).

### REV-14 - `TestimonialWall`
**Files** `components/site/testimonial-wall.tsx`,
`content/testimonials/{students,companies,universities}.ts`, `public/testimonials/`.
**Steps** Type `{ name, handle?, role, avatar, text, source: "x"|"linkedin"|"email",
url?, date }`. Two rows scrolling in opposite directions, pause on hover and focus,
edge fade; card like a post: avatar, name, handle, source mark, text, date, "Read on X"
when `url`. Renders nothing under 6 entries. Delete both placeholder arrays.
**Edge cases** Reduced motion: static grid. Avatars local (no hotlinks). Long text
clamps with a "Show more" that expands in place.
**Done when** `grep -rn randomuser apps/web` is empty, and each audience's file has a
header comment giving Niraj the format to fill.

### REV-15 - Pricing strip
**Files** `components/home/pricing-strip.tsx`, from `@repo/pricing`.
**Steps** Eyebrow "PLANS", three cards like fanout (plan, price, one line, action), a
top band of three true facts, "View full pricing" to `/pricing`.
**Done when** every number on the strip is imported, none typed.

### REV-16 - Recompose `/`
**Steps** Order per overview line 3. Keep FAQ. List the landing components no longer
rendered (problem, capabilities, proof, projects, compare, hero-slide-art, dockerfile
panel, old testimonials) as a deletion proposal for Niraj; delete only after approval.
**Done when** `/` matches the order and the proposal is answered.

### Outcome, group B (2026-09-25)

- Research first: every card bullet, step, difference and limit is in
  `apps/web/content/modules.ts` with the product file that proves it. Counts are static
  from seed files: 10 projects / 200 tasks, 76 DSA problems / 4 tracks / 5 languages,
  3 AI tools / 5 templates, 3 interview pipelines / 12 design prompts.
- Honest limits the research surfaced, now stated on the detail pages: project code
  runs in the browser (not the container) and only some projects run tests; the ATS
  score is a model's reading, not a real ATS; five resume templates share two PDF
  layouts; job matching compares skill names; mocks are voice only.
- REV-10: `components/home/{hero,fragments}.tsx`. Fragments carry the product's own
  labels (sources in the file header), are xl+ only at 90% (full at 2xl), float on CSS.
- REV-11/12: `components/home/{modules,module-art}.tsx`; `app/(home)/features/[module]`
  (static, `dynamicParams = false`, breadcrumb + WebPage JSON-LD, loading skeleton).
  `/features` stays the index and each section links to its detail page; module links
  across nav, footer, compare and changelog moved from `/features#id` to `/features/id`
  (`#credits` stays: credits has no detail page).
- REV-14: `components/site/testimonial-wall.tsx` plus `content/testimonials/*`
  (format in `types.ts`). Long quotes clamp at six lines with "Read on X" rather than an
  in-place "Show more" (keeps it a server component). `/hire`'s placeholder wall is off.
- REV-15: `SIGNUP_GRANT_CREDITS` moved into `@repo/pricing`; `apps/main/lib/credits/grant.ts`
  re-exports it, so the strip and the grant are one number.
- REV-16: `/` is hero, modules, everything else, pricing, testimonials, FAQ.

### Outcome, group E (2026-09-25)

- Migration `0043_idea_votes.sql` applied on dev (two enum values, `feedback.is_public`,
  `idea_vote` with a composite primary key). `pnpm script ideas-visibility`: 0 public bug
  reports on dev. **Production:** `pnpm db:migrations --apply`, then the script.
- `@repo/db/ideas` (queries, no user columns) and `@repo/db/ideas-types` (labels, safe
  for the browser). The web board imports only the first, on the server.
- Verified on dev with a temporary idea: vote, unvote, vote gives 1, 0, 1; a direct
  duplicate insert is rejected by the key; counter equals vote rows; row removed after.
- App: `app/(main)/ideas` + `actions/(main)/ideas/ideas.action.ts` (5 posts a day, BUG
  private, `?post=1` opens the sheet). Old `upvoteFeedback` now delegates to the toggle.
- Web: `app/(home)/ideas` (ISR 300s, client-side sort and tabs); web CLAUDE.md records
  it as the fourth DB use. Admin: `setFeedbackVisibility`, Public/Hidden toggle, new
  categories, board status names.
- Not in any nav yet inside the app; reachable from the site's tile and footer.

## C. Hire

### REV-20 - Hiring prices to one source
**Why** Web hard-codes Rs 3,999 / $49; `apps/hiring/lib/dodopayments.ts` holds the same
numbers separately.
**Files** `packages/pricing/src/hiring.ts`, `apps/hiring/lib/dodopayments.ts`,
`apps/web/app/hire/...`.
**Done when** both import one constant and `grep -rn 3999 apps/web` is empty.

### REV-21 - Rebuild `/hire`
**Research** Read `apps/hiring/app/(main)` routes; each claim names its route.
**Steps** Same system: hero with hiring fragments (a round config, a candidate card, a
funnel), module cards (Jobs, Rounds, Candidates, Universities, Team), testimonial wall
(companies), pricing, FAQ. Remove the hire navbar/footer (proposal).
**Done when** `/hire` uses `SiteNavbar`/`SiteFooter` and every claim lists its route.

### Research, groups C and D (2026-09-25)

- Hiring today: jobs (create, publish, pause, duplicate, attach a pipeline), applicants
  and a candidate board (Applied to Hired), take-home assignments scored by hand, team
  invites and custom roles, the pipeline builder (5 round types, hard or advisory gates,
  pass marks, AI drafts capped by `HIRING_AI_LIMITS`), company page, analytics, Dodo
  billing. Work email enforced at sign-up, onboarding and invites.
- Not yet: candidates cannot take rounds (HR-12 to HR-18); the plan limits are stored but
  not enforced (`checkSubscriptionLimit` is never called); most Pro/Enterprise feature
  lines (AI screening, SSO, API, SLA, white-label, account manager, integrations,
  priority support, advanced analytics) have no code. `candidates/universities` is mock
  data. Niraj kept the promise and the list (overview, second round).
- Uni today: faculty/team roles and assignments work; students, classes, departments,
  placements, university settings, analytics and billing are shells or TODOs. Prices in
  three places: `lib/dodopayments.ts` (Starter Rs 4,999/mo, Growth Rs 14,999/mo), the
  landing and billing page (Rs 49/Rs 39 per student per semester), and `(legal)/pricing`
  (USD tables at 83.21). Deferred.

### Outcome, groups C and G (2026-09-25)

- REV-20: `packages/pricing/src/hiring-plans.ts` (`HIRING_PLANS`, `HiringPlanKey`);
  `apps/hiring/lib/dodopayments.ts` spreads it and adds only `dodoProductId`, same export
  shape, so the in-flight billing files needed no edit. A separate file from
  `hiring.ts`, which another session owns.
- REV-21: `/hire` is hero (`components/hire/{hero,fragments}.tsx`, labels from the
  pipeline builder, gate copy and analytics funnel), five cards (`ModuleCardGrid`, now
  shared with `/`), four steps, pricing from `HIRING_PLANS` with INR/USD, testimonials
  (hidden until real), FAQ (rewritten: the old one was about universities), closing
  band. Copy and sources in `content/hire.ts`. Companies nav points at the new anchors.
  The FAQ band is one shared component (`landingpage/faqs.tsx`, props).
- Deleted with approval: 13 old landing and chrome files, 4 hire chrome and placeholder
  files, then the 11 old hire sections. `grep -rn randomuser apps/web` is empty.
- REV-60: sitemap lastmod bumped to 2026-09-25 (a real revamp), `ideas`, `changelog`
  and the five `/features/<id>` added; `llms.txt` features section generated from
  `content/modules.ts` (it still described Project Studio and an Open Source Tracker).
- REV-61: ratios computed for every new text/surface pair (primitives header and this
  file); two fixes (eyebrows to neutral-600, tab counts to neutral-600). Lighthouse needs
  a production build, which is Niraj's to run.

## D. Uni

### REV-30 - Uni pricing decision (blocked)
Niraj picks one table; it goes into this overview, then `packages/pricing/src/uni.ts`.

### REV-31 - Build `/uni`
**Research** `apps/uni/app/(main)` routes. **Steps** as REV-21 with uni modules
(Students, Classes, Faculty, Placements, Analytics). **Done when** built, priced from
REV-30, every claim sourced.

### REV-32 - `apps/uni` root redirect
**Steps** `apps/uni/app/page.tsx` redirects to `/signin`; `(legal)/pricing` redirects to
`${WEB}/uni#pricing`; `components/landingpage` and `SmoothScroll` proposed for deletion.
Legal pages stay (auth screens link them). **Done when** `/` on uni lands on sign-in.

## E. Ideas

### REV-40 - Schema
**Files** `packages/db/src/schema/schema.ts`, a migration, `src/scripts/ideas-visibility.ts`.
**Steps** Add `CONTENT`, `IMPROVEMENT` to `feedback_category`; `is_public boolean not
null default true`; `idea_vote (user_id, feedback_id, created_at, primary key both,
cascade)`. Script: preview then set `is_public=false` on every `BUG`, and seed nothing
else. Report migration SQL before applying.
**Done when** migration applied on dev, the script's re-plan shows nothing left.

### REV-41 - App `/ideas`
**Files** `apps/main/app/(main)/ideas/{page,loading}.tsx`, `_components/*`,
`actions/(main)/user/feedback.action.ts`.
**Steps** Board like web's, plus Post (a sheet: title, category, description) and a vote
toggle. `upvoteFeedback` becomes insert-or-delete on `idea_vote` with the counter kept in
step inside `withTransaction`. `?post=1` opens the sheet; `#<id>` scrolls to an idea.
**Edge cases** A double click cannot double count (primary key on the vote). New ideas
are public at once, except `BUG`, which only admins see. Signed-out visitors arriving
from web go through sign-in and come back to the same idea (`callbackUrl`).
**Done when** a second vote from one user leaves the count unchanged (checked by a DB read).

### REV-42 - Web `/ideas`
**Files** `apps/web/app/(home)/ideas/{page,loading}.tsx`, `actions/ideas.action.ts`,
`apps/web/CLAUDE.md` (the DB allowance gains a fourth, read-only use: public ideas).
**Steps** Header (eyebrow "FEATURE REQUESTS", title, sub, line illustration), sort
Top/New, status tabs with counts, cards (vote count box, TEAM/COMMUNITY, status, category
chips, age, title, description). Post and Vote are links into the app. No author names
or user ids leave the DB. `revalidate = 300`.
**Done when** the page is static with ISR, and its query selects no user column.

### REV-43 - Admin
**Files** `apps/admin/app/(console)/feedback/*`. Board names, `is_public` toggle, new
categories. **Done when** an admin can hide an idea and it leaves both boards.

## F. What's new

### REV-50 - `/changelog`
**Files** `content/changelog.ts`, `app/(home)/changelog/page.tsx`.
**Steps** Monthly entries (month, title, items with optional link). Pill "New in
<month> →" in `SiteNavbar` links to the newest. **Done when** adding an entry changes
the pill with no other edit.

## G. Finish

### REV-60 - SEO wiring
Sitemap, `llms.txt`, canonicals and OG for `/uni`, `/ideas`, `/changelog`,
`/features/*`. **Done when** each is in `sitemap.xml` with a fixed lastmod.

### REV-61 - Contrast and Lighthouse
**Done when** overview line 9 holds, measurements recorded here.

---

# Round 2 (Niraj's browser pass, 2026-09-25)

Decisions (AskUserQuestion, 2026-09-25): **soft pastel palette on web only** (blush, sage,
sand, coral, mint, butter, plus white and ink; never blue, brown or purple); **five
/hire feature pages and a hiring guides hub with five real posts**; **one hero style on
every public page** (the feature page's tinted panel with animated art); **new sections:
how it works, product tour tabs, a real-numbers band, a compare strip**, and a stronger
CTA; **Lenis removed from every app** ("remove it from the package locations").

| ID | Task | Status |
|---|---|---|
| REV-70 | Remove Lenis and SmoothScroll from web, main, uni, hiring (code and package.json) | done 2026-09-26 |
| REV-71 | Pastel tones in the web primitives; CLAUDE.md web-only palette exception | done 2026-09-26 |
| REV-72 | Navbar dropdowns: one column, anchored under their trigger | built 2026-09-26 |
| REV-73 | Header and footer on every page (blog posts had no footer) | done 2026-09-26 |
| REV-74 | Subtle section reveal on every landing section | built 2026-09-26 |
| REV-75 | Ten distinct animated card arts (5 student modules, 5 hire modules) | built 2026-09-26 |
| REV-76 | Module cards: titles aligned across the row, ink on alternate cards | built 2026-09-26 |
| REV-77 | Hero fragments move with scroll, plus a small live animation inside each | built 2026-09-26 |
| REV-78 | Everything else tiles: pastel tones, big centred animated icons | built 2026-09-26 |
| REV-79 | New landing sections: how it works, product tour, numbers band, compare strip, CTA | built 2026-09-26 |
| REV-80 | One `PageHero` for every public page (tinted panel + animated art) | built 2026-09-26 |
| REV-81 | Feature pages: animated art, illustrated steps, module cards in Keep exploring, costs and FAQ | built 2026-09-26 |
| REV-82 | `/hire/<feature>` pages for pipelines, questions, jobs, candidates, team | built 2026-09-26 |
| REV-83 | `/hire/guides` hub and five hiring posts; companies nav and footer point to it | built 2026-09-26 |
| REV-84 | /hire: matching new sections, pricing that animates on currency change, hiring footer | built 2026-09-26 |
| REV-85 | Changelog, second pass | built 2026-09-26 |
| REV-86 | Name and domain candidates (.com / .in availability) | done 2026-09-26 |

**Done when (round):** every item above verified by `tsc` in each touched app, a grep for
`lenis|SmoothScroll` returning nothing outside lockfiles, no blue/purple/brown classes
in `apps/web`, every `/hire/*` and `/features/*` page statically generated, and the
browser pass is Niraj's.

### Outcome, round 2 (2026-09-26)

"Built" means typechecked and read through; the browser pass is Niraj's.

- **REV-70** Lenis gone: `components/smoothscroll.tsx` and `lib/lenis` deleted from web,
  main and uni; `lenis` removed from web, main, uni and hiring `package.json`; lockfile
  updated. Web uses the browser's own `scroll-smooth` (off under reduced motion).
  `grep lenis|SmoothScroll` over apps is empty. main, uni, hiring typecheck.
- **REV-71** `Pastel` tones in `primitives.tsx` with measured ink (muted is neutral-700:
  neutral-600 is 4.47:1 on coral). Root CLAUDE.md records the web-only exception. No
  blue, indigo, purple, violet, amber, orange, yellow, sky or cyan class in apps/web.
- **REV-72** Dropdowns: one column, `left-0` under the trigger, scroll past 70vh.
- **REV-73** Blog posts and hubs had no footer; it moved into the blog layout (and out of
  the index, which had its own). `FooterForPath` gives hiring posts the hiring footer.
- **REV-74** `Section` puts `sh-reveal` on its heading and body; cards, steps and tiles
  stagger with `--sh-reveal-delay`. CSS only, one site-wide observer.
- **REV-75** `components/marketing/card-art.tsx`: sixteen CSS-animated SVG scenes (five
  student modules, five hire modules, six pages), dark and light inks, frozen under
  reduced motion. The old identical stacked-card art is deleted.
- **REV-76** Card art in a fixed `h-44` box, text from the top, meta and link pinned to
  the bottom: titles align across the row. Tones alternate ink and pastel.
- **REV-77** `ScrollVar` publishes `--scroll-y`; each fragment drifts at its own rate via
  the `translate` property (the float keeps `transform`). Fragments have live details:
  statuses flip, bars grow, results fade in.
- **REV-78** Tiles in eight tones, a large centred icon with its own motion each.
- **REV-79** `components/marketing/{sections,product-tour,count-up}.tsx`: how it works,
  product tour (ARIA tabs, arrow keys), numbers band (`lib/landing-numbers.ts`, cached an
  hour, hidden if unreadable or under two non-zero counts), compare strip, CTA band.
  The invented 95/94 success-rate fallbacks in `stats.action.ts` are now 0.
- **REV-80** `PageHero` rewritten (same props, `variant` ignored): tinted panel, crumbs,
  facts, animated scene. On about, pricing, features, compare, each comparison, blog
  index, ideas, changelog, /hire/guides and every feature page. `PageHeroSkeleton` in
  every matching loading file. Pricing's "6 languages" corrected to 5.
- **REV-81** `components/marketing/feature-detail.tsx`, shared with /hire: hero, steps
  timeline beside the scene, differences on pastels, credit costs (only real prices from
  `apps/main/lib/credits/pricing.ts`) beside honest limits, FAQ (with FAQPage JSON-LD),
  and the other modules as landing cards.
- **REV-82** `/hire/{pipelines,questions,jobs,candidates,team}`, static, in the sitemap;
  the companies Product menu and footer link to them. Claims from the hiring research.
- **REV-83** Blog category `hiring` with five posts (content/posts, 470 to 780 words, DOIs
  for Schmidt and Hunter 1998 and Sackett et al. 2022, eCFR for the four-fifths rule),
  a topic hub, `/hire/guides`, and `content/hiring-guides.ts` so the navbar treats those
  posts as the companies side. The student /blogs index leaves them out.
- **REV-84** /hire: hero, cards, steps with scenes, tour, numbers, guides strip, pricing
  (sliding currency thumb, numbers roll in on change), testimonials, FAQ, CTA band.
  Footer on the companies side is hiring only (product, guides, audiences, company).
- **REV-85** Changelog as a catalogue after fanout.sh/updates: wavy month dividers, one
  card per update with its scene, a button to the page, and the commit date.
- **REV-86** Names, checked 2026-09-26 against the registries' RDAP (Verisign for .com,
  NIXI for .in; 404 means unregistered). See the reply for the shortlist.

**Fix (2026-09-26):** `/hire` and `/` crashed with "No database connection string was
provided to neon()" because apps/web has no `.env` and the numbers band imported
`@repo/db` at module load. `lib/landing-numbers.ts` and the web Ideas page now import it
lazily and only when `DATABASE_URL` is set; without it the band hides and the board is
empty. No other page imports `@repo/db` at load (actions load on call).

---

# Round 3 (Niraj's browser pass, 2026-09-26)

| ID | Task | Status |
|---|---|---|
| REV-87 | Pages land below the hero after navigation: `data-scroll-behavior="smooth"` + `scroll-pt-16` | built 2026-09-26 |
| REV-88 | Guides dropdown in two columns; Features, Compare, Company stay one column | built 2026-09-26 |
| REV-89 | Compare strip cards get an animated scene each, like the module cards | built 2026-09-26 |
| REV-90 | Landing pricing strip: richer cards (what credits buy, per-card detail) | built 2026-09-26 |
| REV-91 | Product tour as a pinned horizontal scroll on / and /hire (title and tabs pinned, tab follows the card) | built 2026-09-26 |
| REV-92 | Feature pages (5 student, 5 hire): a closer look, who it is for, works with, more FAQs, closing CTA | built 2026-09-26 |
| REV-93 | Two-word combined name candidates (fanout style), 10 to 15, with availability | not started |

### Outcome, round 3 (2026-09-26)

- REV-87 `app/layout.tsx`: `data-scroll-behavior="smooth"` (Next turns smooth scrolling
  off while it scrolls a new page into view) and `scroll-pt-16` (the sticky navbar's
  height, so the page top is not tucked under it).
- REV-88 `NavItem.columns`; Guides is 2 (centred under its trigger), the rest 1.
- REV-89 Compare cards get a scene (`COMPARE_ART` in sections.tsx) and staggered reveal.
- REV-90 `components/home/pricing-strip.tsx`: toned cards with three lines each, the
  packs card raised, and a "What credits buy" row read from content/modules.ts costs.
- REV-91 `components/marketing/product-tour.tsx`: pinned at lg with no reduced motion
  (section `n*85+15` vh tall, sticky frame under the navbar, track translated by
  progress, active tab and a progress rail follow; tabs scroll the page to a card).
  Otherwise a swipeable snap row whose tabs scroll the row.
- REV-92 `content/feature-extras.ts` (keyed by art id, restating sourced facts only) and
  FeatureDetail sections: a closer look (three alternating rows), who it is for, works
  with (links onward), extra FAQs (also in FAQPage markup), and a closing CTA band.

**REV-94 (2026-09-26):** demo testimonials, by Niraj's request, to see the wall before
real quotes exist. `content/testimonials/demo.ts` holds 10 student and 8 company demo
quotes (not real people). `TestimonialWall` uses them only while a page's real list is
under six AND `showDemoTestimonials()` is true: development, or a build with
`NEXT_PUBLIC_DEMO_TESTIMONIALS="1"`. The eyebrow then reads "... · Demo content". A
production build without the flag never renders them, so overview line 8 (nothing
invented) still holds in production. Testimonials without a photo show initials on a
pastel circle. Hiring guide cards on /hire and /hire/guides get a scene each
(`HIRING_GUIDE_ART` in content/hiring-guides.ts).

---

# Round 4 (2026-09-26)

| ID | Task | Status |
|---|---|---|
| REV-95 | Hiring plan data: limits, credits, yearly prices in `@repo/pricing` | built 2026-09-26 |
| REV-96 | `/hire/pricing`, mirroring /pricing: hero, toggles, plans, compare table, credits, value, FAQ, CTA | built 2026-09-26 |
| REV-97 | /hire pricing section uses the same cards and links to /hire/pricing; nav and footer point there | built 2026-09-26 |
| REV-98 | Feature pages: steps as illustrated cards, scenes on "different" and "who it is for", plan limits beside honest limits for hire features | built 2026-09-26 |
| REV-99 | One FAQ component everywhere (the landing's), fed data per page | built 2026-09-26 |

### Outcome, round 4 (2026-09-26)

- REV-95 `packages/pricing/src/hiring-plans.ts`: the decided tiers (overview, "Hiring
  plans"), new fields `maxPipelines`, `maxCustomRoles`, `creditsOnSignup`,
  `creditsPerMonth`, `priceYearlyINR/USD`, `tagline`, and `HIRING_PLAN_LIMITS` for the
  comparison table. Old fields kept (apps/hiring reads them); hiring typechecks.
  Feature lists rewritten to what is real plus the limits. Enforcement and the company
  credit ledger: task in plan/hiring-app/tasks.md.
- REV-96 `/hire/pricing`: hero with facts, `HirePlanCards` (billing and currency toggles,
  numbers roll in on change), full comparison table, how company credits work (free
  daily AI allowance, credits beyond it, candidates pay their own attempts), what
  every plan includes, FAQ, CTA. Loading skeleton, sitemap.
- REV-97 /hire's pricing band uses the same cards and links to /hire/pricing; companies
  nav, footer and feature pages point there.
- REV-98 FeatureDetail: steps as four illustrated cards (no thin timeline), a scene on
  every "different" and "who it is for" card (drawn from the page's own scenes), and a
  By plan card on hire pages (per-feature limits from HIRING_PLANS).
- REV-99 The landing's FAQ band (`landingpage/faqs.tsx`) on feature pages, /hire/guides,
  /pricing and /hire/pricing. Topic hubs and comparisons keep the same accordion inside
  their article layouts.

---

# Round 5 (2026-09-26)

Decisions (AskUserQuestion): student hero = split with a live product window that cycles
Practice, Project, Mock, Resume; hire hero = ink band with candidates flowing through
gated rounds into a shortlist; hire gains four sections, the student page gains four,
each with a different look; nothing removed. FAQ items tightened.

| ID | Task | Status |
|---|---|---|
| REV-100 | FAQ item padding tightened (shared accordion) | built 2026-09-26 |
| REV-101 | Student hero: split, live product window with auto-advancing tabs | built 2026-09-26 |
| REV-102 | Hire hero: dark band, animated gate flow into a shortlist | built 2026-09-26 |
| REV-103 | Hire: old loop vs this loop | built 2026-09-26 |
| REV-104 | Hire: what the candidate sees (phone mock) | built 2026-09-26 |
| REV-105 | Hire: fair by design | built 2026-09-26 |
| REV-106 | Hire: for every team size (plans from HIRING_PLANS) | built 2026-09-26 |
| REV-107 | Student: what you walk away with (bento) | built 2026-09-26 |
| REV-108 | Student: built for your stage (tabs) | built 2026-09-26 |
| REV-109 | Student: practice tracks | built 2026-09-26 |
| REV-110 | Student: from the guides (latest posts) | built 2026-09-26 |

### Outcome, round 5 (2026-09-26)

- REV-100 `components/faq-accordion.tsx`: px-5 py-4, 16px question, 28px icon, 10px gap.
- REV-101 `components/home/hero.tsx` + `hero-window.tsx`: split hero; the window cycles
  Practice, Project, Mock, Resume every 4.8s with a progress tab, pauses on hover and
  focus, never auto-advances under reduced motion. The floating fragments and
  `ScrollVar` are gone (both files deleted; they were created this revamp).
- REV-102 `components/hire/hero.tsx` + `gate-flow.tsx`: ink band; ten candidate dots on
  one `offset-path`, three fates (pass, stop at gate 1, stop at gate 2), shortlist fills;
  a compact chip row below md. Old hire fragments deleted.
- REV-103..106 `components/hire/sections.tsx`: OldVsNew (process comparison, no
  statistics), CandidateView (phone mock cycling feed, rounds, shortlisted), FairByDesign
  (mint band), TeamSizes (rows read from HIRING_PLANS). /hire order: hero, cards, old vs
  new, how it works, candidate view, tour, numbers, fair, team sizes, guides, pricing,
  testimonials, FAQ, CTA.
- REV-107, 109, 110 `components/home/sections.tsx`: WalkAway bento, PracticeTracks
  (terminal-style cards; counts only for DSA, where they exist), FromTheGuides (newest
  three student posts with their generated covers). REV-108 `stage-tabs.tsx`: vertical
  tabs, a three-step path per stage. / order: hero, modules, walk away, how it works,
  tour, stage, tracks, numbers, everything else, compare, pricing, guides,
  testimonials, FAQ, CTA.

### Round 6 (2026-09-26), built

- REV-111 `OldVsNew` is one animated section: two rows start together; the usual loop
  lights a stage every 3s ("Still going"), the ShipItHQ loop every 0.9s and shows
  "Shortlist ready" while the other is on stage two. A dot travels each track. The
  instruction says what to watch; a caption says it is an illustration, not a measured
  time. Reduced motion shows the finished state.
- REV-112 `StageTabs`: the stage list is sticky at lg; the three panels (butter, mint,
  blush) scroll vertically; an IntersectionObserver on the middle band lights the tab;
  a tab scrolls its panel to centre; a progress bar under the tabs.
- REV-113 Hire hero tightened (pt-12/14, smaller gaps, no divider), the gate flow's
  viewBox cropped to its content so the pipeline sits higher; grid overlays removed from
  both heroes.

- REV-114 (2026-09-26) The product tour is a vertical sticky scroll on / and /hire: cards
  scroll on the left, title, tabs and progress stay sticky on the right (the mirror of
  "Built for your stage", sticky on the left). On / the order is tour, practice tracks,
  numbers band, stage, so the two sticky sections never meet. The pinned horizontal
  version is gone.

## Round 6 (Niraj, 2026-09-26)

Browser-pass feedback, then /uni. Decisions: uni prices are the billing table in
`apps/uni/lib/dodopayments.ts` (Free, Starter Rs 4,999 / $59, Growth Rs 14,999 / $179,
Enterprise custom; yearly 10x monthly); /uni is a full mirror of /hire; apps/uni's old
landing is redirected AND deleted (Niraj approved the deletion); the testimonial wall is
kept and enhanced.

| ID | Task | Status |
|---|---|---|
| REV-115 | Ideas: board as wide as the status row; counts move into the hero under the text; tabs read from the DB with a matching skeleton | built 2026-09-26, browser check Niraj |
| REV-116 | Navbar: remove the sound toggle | done 2026-09-26 |
| REV-117 | Testimonials: enhance the wall | built 2026-09-26, browser check Niraj |
| REV-30 | Uni prices into `@repo/pricing` (`uni-plans.ts`) and the overview | done 2026-09-26 |
| REV-31 | Build `/uni`: landing, 5 module pages, pricing, guides (5 posts), navbar and footer, Universities live | built 2026-09-26, browser check Niraj |
| REV-32 | apps/uni: root to /signin, pricing to web, delete the old landing | done 2026-09-26 |
| REV-33 | apps/uni core screens (Students, Classes, Placements, Analytics, Billing, assignment results) | next: plan in `plan/uni` |

### REV-115 - Ideas board
**Why** The board (max-w-3xl) is narrower than the tiles (max-w-5xl); the counts repeat
what the tabs show. **Files** `apps/web/app/(home)/ideas/{page,loading}.tsx`,
`_components/ideas-board.tsx`, `components/page-hero.tsx` if it needs a slot.
**Steps** Counts become a compact strip in the hero below the description (left);
the board takes the full content width, list shown directly; tabs and sort become
`?status=&sort=` search params read on the server through `listPublicIdeas({ sort, status })`
(still cached per combination); the skeleton matches hero + strip + tabs + list.
**Edge cases** unknown params fall back to all/top; DB down renders the empty board;
counts stay the totals, not the filtered list. **Done when** switching a tab changes the
URL and the server query (curl with params returns the filtered HTML) and loading.tsx
has the same widths as the page.

### REV-116 - Sound toggle
**Files** `apps/web/components/site/navbar.tsx`. **Done when** no SoundToggle in the
web navbar HTML; the component stays in packages/ui (the app uses it).

### REV-117 - Testimonials
**Files** `apps/web/components/site/testimonial-wall.tsx`. **Steps** Keep the two
drifting rows; add a featured quote lead (larger type, the headline claim), a subtle
stars-free "role" filter feel via tone, avatar tone per source, a hover lift, and a
count line ("From X, LinkedIn and email"). No invented ratings. **Done when** renders on
/ and /hire with demo content, reduced motion shows a static grid.

### REV-31 detail - /uni
**Research** apps/uni `(main)` routes for each module claim. **Files** `apps/web/app/uni/*`
(page, [feature], pricing, guides, loading), `content/uni.ts`, `content/uni-guides.ts`,
5 posts in `content/posts` + `content/blog.ts` (category `placements`), `components/uni/*`,
`components/site/audiences.ts` (available: true, links), `footer.tsx` (uni groups),
`app/sitemap.ts`. **Done when** every /uni route renders 200, the switcher lists
Universities as live, prices come from `@repo/pricing`, and every claim names its route.

- REV-115 (2026-09-26) Counts are the hero's `facts` row; the board is max-w-7xl with a
  two-column list at lg. Tabs and sort are links to `?status=&sort=` (optimistic pressed
  state), the page reads them and queries `listPublicIdeas({ sort, status })` inside a
  Suspense keyed on the params, so only the list shows its skeleton on a switch; counts
  come from the new `countPublicIdeas()`. The page is now dynamic (it reads search
  params), so `revalidate` is gone. `ideas-board.tsx` (this revamp's own file) replaced
  by `ideas-tabs.tsx` + `ideas-list.tsx`. Verified: curl `/ideas`, `?status=planned`,
  `?status=bogus` (falls back to All) all 200 with the right tab pressed; both queries
  run on dev. `PageHeroSkeleton` takes `facts` so loading matches.
- REV-116 SoundToggle removed from the web navbar (the component stays in packages/ui).
- REV-117 (2026-09-26) The wall opens with a spotlight quote (large type on butter; the
  `featured` entry, else the first), the Section's action slot counts the voices by
  source ("10 voices, 5 on X ..."), cards gain a quote mark that darkens on hover and a
  lift; rows drift as before, without the spotlight. `featured?` added to `Testimonial`;
  one demo entry marked. Renders on / and /hire (curl 200).

**Outcome, round 6 /uni (2026-09-26)**
- Finding before copy: in apps/uni only onboarding, faculty with roles and permissions,
  and assignments (AI projects, AI mocks, quizzes and code assessments) have working
  screens; students, classes, departments, placements, analytics and billing are UI with
  hardcoded values, their server actions unused. **Decision (Niraj, 2026-09-26):** the
  site describes the whole product; the missing screens are the uni core work (REV-33).
  `content/uni.ts` records, per module, what runs today.
- REV-30 `packages/pricing/src/uni-plans.ts` (`UNI_PLANS`, `UNI_PLAN_ORDER`, `UniPlanKey`)
  from the billing table; apps/uni's `lib/dodopayments.ts` spreads it and adds only the
  product ids; `@repo/pricing` added to apps/uni. The in-app billing page reads it too
  (the per-student prices retired). Decision recorded in overview.md, "University plans".
- REV-31 apps/web: `app/uni/{page,loading}` with `_components/{uni-landing,pricing-section,
  guides-strip}`; `app/uni/[feature]` (students, assignments, faculty, placements,
  analytics, each with plan limits from UNI_PLANS), `app/uni/pricing` (cards, comparison
  of limits and modules, credits, every plan, FAQ), `app/uni/guides`, each with a
  loading.tsx. `components/uni/hero.tsx` (blush split hero with an animated cohort
  readiness board, labelled an illustration) and `components/uni/sections.tsx`
  (SemesterPlan, CampusRoles, OneAccount, CampusSizes). Five new card-art scenes
  (`uni-*`). `FeatureDetail` takes `planNames` and `pricingHref` (hire unchanged).
  Five guides written (placement season, readiness beyond CGPA, mocks at scale, projects
  in coursework, what companies look for) with a `placements` category and topic hub,
  hidden from the student /blogs index like the hiring guides. Universities is live in
  the switcher with its own navbar (Product, Guides, Pricing) and footer (Universities,
  Placement guides). Demo testimonials for universities behind the demo gate. Sitemap
  lists /uni routes. Verified: `tsc` clean in web and uni; every /uni route, the guides
  and the topic hub render 200 on the dev server.
- REV-32 apps/uni: `/` redirects to /signin, `(legal)/pricing` to `${WEB_URL}/uni/pricing`;
  `components/landingpage` deleted (approved); legal and onboarding layouts use a new
  slim `components/public-header.tsx` like hiring's.
