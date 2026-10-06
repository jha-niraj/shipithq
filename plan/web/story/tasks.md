# The public site as stories - tasks

Derived from `overview.md`. In order. Each page is checked in Chrome (1440px and 390px, light) before
the next. `tsc` in the app being edited after each task; no lint or builds unless Niraj asks.

## Round 1: true, then the parts

### - [x] ST-1 Make every claim true
- **Status:** done 2026-10-06. Languages: 5 everywhere (the practice picker, `JudgeLanguage` in
  packages/db/src/practice-types.ts; the runner also has C, which a learner cannot pick). The product:
  no conflicting counts; the FAQ and About name the six parts (practice, projects, mocks, AI resume
  tools, a job's rounds, incidents); the modules section and /features carry no number. Removed: "AI
  agent in minutes", AES-256 and "Instant provisioning" on pricing (replaced by both currencies and
  credits on verification, from apps/main/app/api/payments/verify/route.ts), "engineering intelligence"
  everywhere (footer, keywords, llms.txt, four share images, legal descriptions, the author bio),
  "a portfolio builder", "Since 2024" (the repo starts 2025-12-19), About's vague cards. Counted, not
  typed: About's credits and guides (`publishedPosts`), compare's credits (`SIGNUP_GRANT_CREDITS`).
  Hiring: the contact form stores a message through `actions/contact.action.ts` (tested against the dev
  database: stored with "[Hiring]" and the company, test row deleted; a bad email is refused), the
  placeholder phone, address, hours and map box are gone; /help's cards all go somewhere real and its
  FAQ names the real screens. tsc 0 in web and hiring.
  **Left for Niraj:** the "Schedule a demo" card links to cal.com/coderzai (is that still the booking
  page?); privacy says "Last updated December 29, 2025" though the file changed 2026-08-27 (legal
  text, not changed); the privacy policy's "AES-256 at rest" is legal text and left as is.
- **Why:** DoD 4 and 5. A story page is only as believable as the worst sentence beside it.
- **Files:** `apps/web` (hero.tsx, pricing-client.tsx, AboutUsClient.tsx, feature-modules.ts,
  comparisons.ts, faq-data.ts, modules.ts, footer.tsx, blogs/[slug]/page.tsx, compare/page.tsx);
  `apps/hiring` (app/(legal)/contactus/page.tsx, app/(home)/help/page.tsx, privacy and terms dates).
- **Steps:** count the languages from the runner's code and use that number everywhere; one name for
  what the product is (count the modules in `content/modules.ts`) used on every page; remove "run your
  first AI agent in minutes", "AES-256 encryption on every transaction", "Instant provisioning",
  "engineering intelligence suite", "a portfolio builder"; "30 guides" from the posts list, not a
  literal; drop "Since 2024" and the vague mission cards unless Niraj gives a source; compare's
  "100" credits from the pricing constant. Hiring: the contact form sends through the app (or becomes
  email links), the placeholder phone, address, hours and map box go, dead `#` links go, "Live Chat"
  goes unless it exists, the legal dates agree.
- **Edge cases:** a number used in metadata or JSON-LD changes there too; keep URLs and titles.
- **Done when:** a grep for each listed phrase finds nothing; the language count is one number across
  the repo's public copy; hiring's contact form delivers a test message (or is email only).

### - [x] ST-2 The coming-soon marker
- **Status:** done 2026-10-06. `components/marketing/soon.tsx`: `Soon` (inline: dotted underline, a
  sand "Soon" label, a tooltip opening on hover and keyboard focus, no JavaScript), `SoonNote` (written
  out, for cards that are links and for feature pages), `SoonLabel`. `ModuleCardData.soon` and
  `FeatureDetailProps.soon`. The audit's /hire exception is retired: the round runners (HR-13 to HR-16,
  VO-11) are code-complete and every hiring plan feature is enforced in `apps/hiring/lib/plan.ts`
  (jobs, pipelines, members, custom roles, the applicant lock, monthly credits in `ensureGrants`), so
  /hire needs no marker. Checked in Chrome: the note under /uni/students' hero, the note on the
  Students card, and the hero's inline marker with its tooltip on focus.
- **Why:** DoD 4: unbuilt is marked, never stated.
- **Files:** `apps/web/components/marketing/soon.tsx`; the /hire and /uni copy that states unbuilt work.
- **Steps:** an inline dotted underline plus a small "Soon" label; a tooltip (keyboard focusable)
  "Coming soon to ShipItHQ: <what is not built>. Today, <what happens instead>."; apply to each unbuilt
  claim; list them below.
- **Done when:** each claim from the audit carries it, the tooltip opens on focus and hover, and the
  list below is complete.

### - [ ] ST-3 ScrollStory
- **Status:** built; first used by /incidents (2026-10-06). Steps down and up correctly at 1440px in Chrome, dimmed text neutral-500 (4.6:1). NOT yet checked at 390px: the Chrome window would not resize below desktop and the site refuses framing, so the phone pass is Niraj's.
- **Why:** DoD 2, 6, 7: one component for every story.
- **Files:** `apps/web/components/story/scroll-story.tsx` (client), `apps/web/components/story/use-nearest-step.ts`.
- **Steps:** the playbook's mechanics: steps really scroll; the panel is `position: sticky`; the active
  step is the one whose centre is nearest the viewport centre, read once per frame; ONE mounted panel
  whose contents change; inactive steps dimmed by colour tokens; `minmax(0,1fr)` grid; on phones the
  panel sits sticky on top (or inline per step); each step has an `id` and `scroll-margin-top`;
  reduced motion keeps the layout with transitions off. Rebuild ProductTour on it.
- **Edge cases:** a short viewport; a story at the very top or bottom of the page; resize.
- **Done when:** a test story steps correctly scrolling down and up at 1440px and 390px, no sideways
  scroll at 390px, and contrast of the dimmed step text passes on its background.

### - [x] ST-4 Share the incident diagrams
- **Status:** done 2026-10-06. `git mv` of kit, scrub, system-map, sequence, timeline, dashboard, causes, human and flow-chart to `packages/ui/src/components/incidents/`, layout.ts and the diagram types (SourceRef, Flow*, Sequence*, Timeline*, Dashboard, Cause, CausalChain, StateDiagram, IncidentRoles, StatusUpdates, System*) to `packages/ui/src/lib/incidents/`; `apps/main/content/incidents/types.ts` re-exports them, so no case file changed; the case player imports from `@repo/ui/components/incidents/*`. tsc: main 0, web 0, packages/ui 3, all three pre-existing in packages/pricing (the same 3 with these changes stashed). Both incident check scripts pass. The seed writes each case's `system` into `incident_case.meta` (preview: 4 cases, meta only, no step changes; applied). The player's map and before/after checked in Chrome.
- **Why:** DoD 1 and 9: the site draws the product with the product's own diagrams.
- **Files:** from `apps/main/components/incidents/diagrams/*` and `flow-chart.tsx` to
  `packages/ui/src/components/incidents/*`; the diagram types from `apps/main/content/incidents/types.ts`
  to `packages/ui/src/lib/incidents/types.ts` (re-exported from the old path so content files do not
  change); apps/main imports updated.
- **Steps:** move kit, layout, flow-chart, system-map, sequence, timeline, dashboard, causes, scrub;
  keep their props; the seed also writes the case's `system` map into `incident_case.meta` so web can
  read a case's full drawing data from the database.
- **Edge cases:** client components stay client; Sheet and Tabs are already in packages/ui; no
  behaviour change in the player.
- **Done when:** tsc clean in main, web and ui; both incident check scripts pass; the case player's
  map, sequence, timeline, dashboard and before/after look unchanged in Chrome.

### - [ ] ST-5 The drawing kit
- **Status:** partly built 2026-10-06, only what /incidents needs: `components/story/kit.tsx` with QuizCard, Chat and ReportBands (server-safe, no hooks). The rest (Scene, Log, Screen, Terminal, MarkedTimeline, CompareBars, Sum, Facts, BeforeAfter) waits for ST-7, which is the first page to need them.
- **Files:** `apps/web/components/story/kit/*`.
- **Steps:** in web's own style (monochrome lines, one accent, the TONE pastels as fills): Scene,
  Takeaway, Chat (the lead and the reader), Log (prompt, check, verdict lines), Screen, Terminal,
  MarkedTimeline, CompareBars, Sum, Facts, BeforeAfter; server-rendered where they don't animate;
  fixed sizes; trig rounded.
- **Done when:** each renders at 1440px and 390px in light, with no hydration warnings.

## Round 2: the Incidents launch

### - [ ] ST-6 shipithq.com/incidents
- **Status:** built 2026-10-06, not yet done.
  - `app/(home)/incidents/{page,layout,loading,opengraph-image}.tsx`, `_components/incident-story.tsx`, `lib/incidents.ts` (read-only, cached an hour, failures not cached; listed in apps/web/CLAUDE.md as the fifth DB use), sitemap entry, generated OG card.
  - Hero: the demo case's system map, broken part lit. Before: how it is learned today vs in a case. Story (ScrollStory, 6 steps, each panel the player's own diagram from the DB): the clock, the dashboard, the first check, the request dying (sequence), the lead (talk opening + closing probe), the fix (MapChange). The review's four bands. Every live case with its own map, minutes, steps, checks and XP from the DB. FAQ (limits from narration/mock/run actions). CTA.
  - Checked at 1440px in Chrome: every section renders with DB data, all six steps switch, no sideways scroll, no console errors from this page (the /uni hydration warnings are ST-11's).
  - Left out on purpose: "Being written" cases (none exist: all 4 are LIVE, none DRAFT).
  - Database at build: no snapshot fallback (Niraj, 2026-10-06: DATABASE_URL goes on web, so the build and the hourly refresh read the DB). If it is ever missing, the case sections hide; nothing invented is shown.
  - Remaining: the 390px pass.
- **Why:** DoD 1, 2, 3.
- **Files:** `apps/web/app/(home)/incidents/page.tsx` and `_components/*`; `lib/site.ts` links;
  sitemap; JSON-LD; an og image.
- **Steps (sections, one case throughout: the 30-second demo):** a hero whose drawing is the case's
  system map with the broken part lit and its clock; the before (how production is learned today);
  the case as a story (it lands, the map, you predict, the simulator, the talk with the lead, the
  postmortem, the run report), every panel drawn from that case's data read from the database; the
  lead as a story (it narrates, asks, pushes back, writes the review: Chat and Log); the catalogue of
  live cases with their own art, and the upcoming ones marked "Being written"; what you earn (XP values
  from the code); FAQ; a call to play the case in the app.
- **Edge cases:** the database unavailable at build (the page still renders, the case section falls
  back to a static snapshot); signed-out play is free to read, actions need sign-in: say so.
- **Done when:** DoD 1, 2, 3, 6, 7 hold for the page, and every number on it traces to a file.

### - [ ] ST-7 The landing
- **Status:** not started.
- **Steps:** the hero becomes one drawing of the product doing its job (no auto-advance); HeroWindow's
  four views become steps of a story with one example; StageTabs and ProductTour on ScrollStory;
  IncidentsBand becomes a short story into `/incidents`; EverythingElse and HowItWorks carry real
  drawings; numbers from ST-1.
- **Done when:** DoD 2, 3, 6, 7 hold for `/`, and the existing title, description and JSON-LD are
  unchanged.

## Round 3: after the launch pages

### - [ ] ST-8 Feature pages
- **Steps:** FeatureDetail's "How it works" as a ScrollStory with one example per module (a real
  problem, a real project, a real interview) and its own drawing per step; `/features` gains a drawing
  per module.

### - [ ] ST-9 /hire
- **Steps:** CandidateView as a story; the billing and currency toggles replaced by both prices shown;
  OldVsNew kept as the before; coming-soon markers from ST-2.

### - [ ] ST-10 Changelog, compare, pricing, blog
- **Steps:** each release as a story (before, now, where to find it); each compare page opens with the
  same job done both ways, counted; pricing gets a worked Sum; posts open with a short story from the
  post's own facts. Planned in detail when Round 2 ships.

### - [ ] ST-11 Verify
- **Done when:** every public URL returns 200, a crawl of internal links and assets finds none broken,
  share images load, and each story step is looked at in a 1440px and 390px contact sheet.

## Coming-soon markers (kept current by ST-2)

Re-read `apps/web/content/uni.ts` against apps/uni when its core screens land (plan/web/revamp REV-33).

| Where | Claim | Not built | Today |
|---|---|---|---|
| /uni card and /uni/students | Students | the Students screen: rosters, verification, readiness | set-up, faculty and assignments work; rosters have no screen |
| /uni card and /uni/placements | Placements | the Placements screen: campus jobs, applications, outcomes | companies hire through ShipItHQ Hiring; no Placements screen |
| /uni card and /uni/analytics | Analytics | the Analytics screen: readiness, completion, credit use | no Analytics screen |
| /uni hero (`components/uni/hero.tsx`) | "the placement cell sees each department's readiness in one place" | the Analytics screen | no Analytics screen |
