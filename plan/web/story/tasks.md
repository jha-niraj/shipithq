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

### - [x] ST-3 ScrollStory
- **Status:** done 2026-10-07. Used by /incidents. Headless Chrome (playwright-core driving the installed Chrome, since the window will not resize below desktop) stepped all six steps at 1440px, each the active one in turn; dimmed text neutral-500 (4.6:1); no sideways scroll at 390px. Changed on the way: below md each step carries its own drawing inline and nothing dims, because the sticky panel above the steps could not stick (a sticky element cannot leave its grid cell) and the tallest panels fill more than half a phone screen.
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
- **Status:** built as pages need it (2026-10-07): `components/story/kit.tsx` (QuizCard, Chat, ReportBands) and `components/home/posting-card.tsx`; the landing story panels live in `job-story.tsx`. The other planned pieces (Sum, CompareBars, BeforeAfter, Terminal, MarkedTimeline) are built with ST-8 to ST-10, the pages that use them; none is made ahead of a page.
- **Files:** `apps/web/components/story/kit/*`.
- **Steps:** in web's own style (monochrome lines, one accent, the TONE pastels as fills): Scene,
  Takeaway, Chat (the lead and the reader), Log (prompt, check, verdict lines), Screen, Terminal,
  MarkedTimeline, CompareBars, Sum, Facts, BeforeAfter; server-rendered where they don't animate;
  fixed sizes; trig rounded.
- **Done when:** each renders at 1440px and 390px in light, with no hydration warnings.

## Round 2: the Incidents launch

### - [x] ST-6 shipithq.com/incidents
- **Status:** done 2026-10-07.
  - `app/(home)/incidents/{page,layout,loading,opengraph-image}.tsx`, `_components/incident-story.tsx`, `lib/incidents.ts` (read-only, cached an hour, failures not cached; the fifth DB use in apps/web/CLAUDE.md), sitemap entry, generated OG card (checked: 200 image/png).
  - Hero: the demo case's system map, broken part lit (scrolls inside its frame at phone width rather than shrinking its labels to ~6px). Before: how it is learned today vs in a case. Story, 6 steps, each panel the player's own diagram from the DB: the clock, the dashboard, the first check, the request dying, the lead (talk opening + closing probe), the fix. The review's four bands. Every live case with its own map, minutes, steps, checks and XP from the DB. FAQ (limits from narration/mock/run actions). CTA.
  - DoD 2: SequenceDiagram gained `path` and MapChange `view`, each fixing one view and dropping its switch; DashboardView gained `hint` (its default names a timeline the web panel does not have). The player passes none, so it is unchanged (main tsc clean).
  - Left out on purpose: "Being written" cases (none exist: all 4 are LIVE). No snapshot fallback (Niraj, 2026-10-07: DATABASE_URL goes on web); without it the case sections hide and nothing invented shows.
  - Checked at 1440px and 390px: every section renders from the DB, every step activates, no sideways scroll, no console errors.
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

### - [x] ST-7 The landing
- **Status:** done 2026-10-07.
  - Hero: same copy and stats; the drawing is a still `PostingCard` (one pasted job, its four rounds).
    "See how it works" jumps to the story. The hero grid gained `minmax(0,1fr)`: at 390px its one
    implicit column grew to its widest child and the section's overflow-hidden clipped the copy.
  - `components/home/job-story.tsx`, under "How it works" (the wedge's title and sub, "Paste a job"):
    six steps over one posting: paste, Aptitude, Coding (DSA), System design, Behavioural interview,
    then the resume. Panels use the round runner's own labels, marked "Example session". Checked against
    apps/main (sources in the file's header). Projects are NOT in it: nothing matches a project to a
    job. The resume step says you paste the posting in: the tailor is not linked to an import.
  - IncidentsBand: three beats of case one beside its own system map from the DB; the old lane drawing
    is the still fallback (its 8s loop is gone).
  - Removed from `/`: PasteJobBand, WalkAway, HowItWorks, ProductTour, StageTabs (one tour told five
    ways, mostly behind tabs and timers). 17 sections to 12, FAQ and CTA included.
  - Checked headless at 1440px (all six steps activate in turn) and 390px (drawings inline, nothing
    clipped but the hero's decorative wash, no sideways scroll); no console errors but the dev-only
    eval notice from web's CSP. Title, description and JSON-LD unchanged.
- **Why:** DoD 2, 3, 6, 7 for `/`.
- **Decisions (Niraj, 2026-10-07, AskUserQuestion):** the hero is one still drawing (a pasted job and
  the rounds it becomes), with the four product views as a scroll story right under it; merge to about
  11 sections; the story's one example is one pasted job, carried through practice, a project, a mock
  and the resume.
- **Files:** `app/page.tsx`; `components/home/{hero,hero-window,stage-tabs,incidents-band,everything-else}.tsx`;
  `components/marketing/{product-tour,sections}.tsx`; a new `components/home/job-story.tsx`.
- **Steps:**
  1. Hero: copy and CTAs as now; the drawing is a still: one job pasted, the rounds it becomes. No timer.
  2. The product story (ScrollStory): the same job through Practice, Project, Mock, Resume, each panel
     the product's own labels (as HeroWindow's sources list). Replaces HeroWindow's cycling,
     StageTabs, ProductTour and HowItWorks, which told the same tour four times.
  3. IncidentsBand: a short story into `/incidents` (the 30-second case's map and one line).
  4. EverythingElse: no hidden content; a real drawing per item where it explains something.
  5. Numbers from ST-1 as now. The other sections stay.
- **Edge cases:** the existing title, description and JSON-LD unchanged; reduced motion; 390px; the
  pasted-job example must use only round types and labels the app has.
- **Done when:** DoD 2, 3, 6, 7 hold for `/` at 1440px and 390px (headless check), no console errors,
  about 11 sections, and the existing title, description and JSON-LD are unchanged.

## Round 3: after the launch pages

### - [x] ST-8 Feature pages
- **Status:** done 2026-10-07.
  - `components/features/stories.tsx` (client) and `story-subs.ts` (server-safe sub-headings);
    FeatureDetail gained `story` (it replaces the step cards; /hire passes none until ST-9).
  - Five stories, each one real item, every label checked in apps/main (sources in the file header):
    Practice "Two Sum" (mentor or on your own, the five mentor stages, Run, Submit, the verdicts, Mentor
    memory); Projects "URL Shortener with Click Analytics" (the four real sprint names, task 3's brief and
    Done when, marking done with a note, the sprint quiz and mock with their 50% / 75% gates); Mock (the
    three setup steps, speak or type, live labels, the three scores); AI tools (populate, import, tailor,
    ATS score, share); Jobs "Backend Engineer, Trace Ingestion" (match, the fit and gap, take the rounds,
    send your results).
  - Corrected against the code on the way: no task approval exists (the learner marks a task done), no
    Apply button (you take the rounds and send results), no job-description field in a mock.
  - Credits has no detail page, so no story; its section on /features is unchanged.
  - `/features`: an Incidents section after the six modules (not in FEATURE_MODULES, so the ItemList
    JSON-LD keeps six), its map drawn from the DB and scrolling at phone width; "100 credits" in the
    closing band now reads SIGNUP_GRANT_CREDITS.
  - Checked headless: every step activates in turn at 1440px on all five pages; nothing clipped and no
    sideways scroll at 390px on all five and on /features; no console errors but the dev-only eval notice.
- **Why:** DoD 2, 3, 6, 7 on `/features` and `/features/[module]`.
- **Decisions (Niraj, 2026-10-07, AskUserQuestion):** one real item per module, its own story:
  Practice one DSA problem run to its verdict; Projects one real blueprint, task by task; Mock one
  interview from setup to its scores; AI tools one resume from import to tailored; Jobs one listing
  to its match; Credits one balance spent across a week. `/features` gains a seventh card, Incidents,
  drawn with its own system map, linking to `/incidents` (no `/features/incidents`).
- **Files:** `components/marketing/feature-detail.tsx`; `app/(home)/features/_components/feature-modules.ts`;
  a new `components/features/stories.tsx`; `app/(home)/features/page.tsx`.
- **Steps:** FeatureDetail's "How it works" cards become a ScrollStory fed by the module's story; each
  panel uses that item's real labels, checked against apps/main and listed in the file's header;
  examples are labelled "Example session"; `/features` adds the Incidents card from the DB.
- **Edge cases:** a claim the code does not back is cut, not softened; 390px; no tabs or timers.
- **Done when:** each of the six pages' stories steps correctly at 1440px and nothing clips at 390px
  (headless), `/features` shows the Incidents card, no console errors, titles and JSON-LD unchanged.

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

### - [ ] ST-12 Credit pack prices before launch (Niraj decides)
- **Status:** open. Found 2026-10-07; Niraj confirmed they are test values.
- **Why:** `creditPackages` in `packages/pricing/src/index.ts` (Free 20 credits for ₹1, Starter 25 for
  ₹12, 50 for ₹22, Pro 75 for ₹30, Max 100 for ₹35; $0.012 to $0.42) feeds the landing's pricing strip
  (`apps/web/components/home/pricing-strip.tsx`), `packages/ui` pricing-bento, and the charge in
  `apps/main/app/api/payments/create-order/route.ts`. Launching with them sells credits at test prices.
- **Steps:** Niraj sets the launch prices in `plan/pricing` (or the module that owns them); the
  constants follow and reference that doc; web and the payment route read them unchanged.
- **Done when:** the constants match the decided prices, and /pricing, the landing strip and a test
  order (Razorpay test mode) all show and charge the same amounts.

## Coming-soon markers (kept current by ST-2)

Re-read `apps/web/content/uni.ts` against apps/uni when its core screens land (plan/web/revamp REV-33).

| Where | Claim | Not built | Today |
|---|---|---|---|
| /uni card and /uni/students | Students | the Students screen: rosters, verification, readiness | set-up, faculty and assignments work; rosters have no screen |
| /uni card and /uni/placements | Placements | the Placements screen: campus jobs, applications, outcomes | companies hire through ShipItHQ Hiring; no Placements screen |
| /uni card and /uni/analytics | Analytics | the Analytics screen: readiness, completion, credit use | no Analytics screen |
| /uni hero (`components/uni/hero.tsx`) | "the placement cell sees each department's readiness in one place" | the Analytics screen | no Analytics screen |
