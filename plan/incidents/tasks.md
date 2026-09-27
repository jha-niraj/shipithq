# Incidents - tasks

Build in order. Browser checks are Niraj's.

| ID | Task | Status |
|---|---|---|
| INC-1 | Routes, public access, page shell, sign-in dialog with callbackUrl | built 2026-09-26 (routes verified; the dialog round trip is in "Left for Niraj") |
| INC-2 | Content model (types) and the first case's content, from the source docs | built 2026-09-26 (awaiting Niraj's read) |
| INC-3 | Engine components: story, animated model, simulator, predict, fix, code tabs, checklist, round | built 2026-09-26 (awaiting Niraj's browser pass) |
| INC-4 | Progress schema, actions, XP once per item | done 2026-09-26 |
| INC-5 | Badges, streaks, readiness score; the /incidents index | done 2026-09-26 |
| INC-6 | Website links (navbar, footer, landing section), metadata | done 2026-09-26 |
| INC-7 | Move Incidents into the app shell (sidebar for everyone, still public) | built 2026-09-26, browser check Niraj |
| INC-8 | Index redesign: a real page header, stats in the top bar | built 2026-09-26, browser check Niraj |
| INC-9 | Case page redesign: the parts index on the right | built 2026-09-26, browser check Niraj |
| INC-10 | Case one content: a vivid story, more depth, a conversational tone | built 2026-09-26 (awaiting Niraj's read) |
| INC-11 | Database: cases and steps in the DB, mock sessions; `pnpm script incidents-seed` | done 2026-09-26 |
| INC-12 | Index: Cases and Badges tabs, topic tabs, a scene per case, animated badges | built 2026-09-26, browser check Niraj |
| INC-13 | Topics for the next cases: AI and LLMs, Frontend, Security | done 2026-09-26 |
| INC-14 | The case player: full page, steps on the left, one step at a time | built 2026-09-26, browser check Niraj |
| INC-15 | Talk it through: a live Sarvam conversation step, free 3 a day | built 2026-09-26 (typed path verified on dev; spoken path needs Niraj's mic) |
| INC-16 | Case one re-cut into steps | done 2026-09-26 (34 steps) |
| INC-17 | Prove it end to end on dev | superseded by round 4 |
| INC-18 | Player in the app shell: sidebar and AI rail, resizable panels, ScrollArea, monochrome, pointer cursors | built 2026-09-26, browser check Niraj |
| INC-19 | A shared quiz runner in packages/ui: single, true/false, buckets, order; one page, results at the end | built 2026-09-26 |
| INC-20 | "Got it, continue": steps done only when the reader says so, saved | done 2026-09-26 |
| INC-21 | Narration: Sarvam TTS with the ElevenLabs orb | built 2026-09-26 (Sarvam call verified; listen in the browser) |
| INC-22 | Chapters: the case model as explain, check, talk, with flowcharts and a glossary | done 2026-09-26 |
| INC-23 | Case one rewritten into chapters, with a same-bug-elsewhere chapter | built 2026-09-26 (awaiting Niraj's read) |
| INC-24 | Midway talks (short, free) and the closing talk | built 2026-09-26 |
| INC-25 | Seed and prove it on dev | done 2026-09-26 |
| INC-26 | Sidebar: clear chapter groups, titles truncate with the XP always visible, a "What you'll learn" section | built 2026-09-27, browser check Niraj |
| INC-27 | Gating: reading free; a chapter's check or talk opens when the previous one is passed; finals after all | built 2026-09-27 |
| INC-28 | Footer: previous and next name the chapter too | built 2026-09-27 |
| INC-29 | Signed out, the AI button opens the sign-in dialog, not the sign-in page | built 2026-09-27 |
| INC-30 | Transcript: visuals first, a remembered toggle, a live caption, auto-scroll while reading | built 2026-09-27 |
| INC-31 | Voice: auto-play (remembered), playback speed, ask the lead by voice, read the check aloud (opt-in) | built 2026-09-27, browser check Niraj (mic) |
| INC-32 | The learning path: one hand-written Pathfinder goal per incident, adopt from the case | done 2026-09-27 as plan/pathfinder PF-13 |
| INC-33 | Runs: `incident_run` + `incident_run_event`, consent, and every action writes to the active run | done 2026-09-27 |
| INC-34 | The start screen: consent, "Just read", and the mic gated on a recorded run | built 2026-09-27, browser check Niraj |
| INC-35 | Ask keeps the lead's answer | done 2026-09-27 |
| INC-36 | The `incident_report` worker job (Durable Object, gpt-4o) | built 2026-09-27; live model run blocked (dev OpenAI account out of credits) |
| INC-37 | Trigger and follow: the report starts after the closing talk; 2 a day | built 2026-09-27; needs the worker deployed or local |
| INC-38 | The report page | done 2026-09-27 |
| INC-39 | Share link and the public report page | done 2026-09-27 |
| INC-40 | Runs list and "Start a new run" | built 2026-09-27, browser check Niraj |
| INC-41 | Compare with the last run: each band shows its change | built 2026-09-27 (in the job) |
| INC-42 | Report XP: once per case, the first report | done 2026-09-27 |
| INC-43 | Next steps mark topics in the reader's adopted path | built 2026-09-27 |
| INC-44 | Delete a run and its transcripts | done 2026-09-27 |
| INC-45 | Player fixes: audio played twice, auto-play off, narrower steps panel, sticky "speaking" bar, sentence case, AI rail open on cases | built 2026-09-27, browser check Niraj |
| INC-46 | Flow chart: edge labels no longer drawn over the arrows | built 2026-09-27, browser check Niraj |
| INC-47 | The lead store: one audio controller the rail and the chapter share | done 2026-09-27 |
| INC-48 | The lead in the rail: Lead / AI tabs, a conversation (type, speak, justify); listening stays on the page | built 2026-09-27, browser check Niraj |
| INC-49 | Follow along: paragraph to visual part, lit and scrolled to | built 2026-09-27, browser check Niraj |
| INC-50 | Terms: underlined, explained by the lead, Pathfinder in a new tab | built 2026-09-27; model call blocked by dev OpenAI credits |
| INC-51 | Rewrite the case: for the ear, hook then reveal, visuals that build | done 2026-09-27, listen-through Niraj |
| INC-52 | Put the sign-in barrier back on asking the lead (removed for testing, 2026-09-27) | not started, before launch |
| INC-53 | Case sidebar: an accordion, one row per chapter, the current one open | built 2026-09-28, browser check Niraj |
| INC-54 | Index: topic filter in the URL, easy to find a case by topic | built 2026-09-28 (a case shows under `topic` + `alsoIn`) |
| INC-55 | Simulator engine: scenario schema, rules, `lanes` and `traffic` views | done 2026-09-28 |
| INC-56 | Move case 1's simulator onto the engine (wrapped, code kept: Niraj 2026-09-28) | done 2026-09-28 |
| INC-57 | Case 2 content: "The login that said yes to guessing", 9 chapters, sourced | built and seeded 2026-09-28, listen-through Niraj |
| INC-58 | Case 2's attack-vs-defence scenario | done 2026-09-28 (all 15 combinations checked) |
| INC-59 | Case 2's Pathfinder path, "Protecting logins", and its seed | done 2026-09-28 |
| INC-60 | AI-drafted scenarios, reviewed in apps/admin | next round |

## INC-1 - Routes and the sign-in dialog
**Files** `apps/main/app/(public)/incidents/{page,layout,loading}.tsx`,
`[slug]/{page,loading}.tsx`, `apps/main/middleware.ts` (public prefix `/incidents`),
`components/incidents/sign-in-gate.tsx`.
**Steps** A reading layout (own header, not the app shell, like public profiles); a
`useGate()` hook every control calls first: signed out -> dialog -> `/signin?callbackUrl=
/incidents/<slug>#<step>`.
**Done when** a signed-out visit renders, and each control opens the dialog with that URL.
**Outcome (2026-09-26)** Signed out, over curl on `next dev`: `/incidents` 200,
`/incidents/the-demo-that-died-at-30-seconds` 200 with its title and a
`/register?callbackUrl=%2Fincidents%2F...` link, an unknown slug 404, `/incidentsx`
and `/home` still 307 to sign-in (the prefix opens nothing else). `tsc` clean. The gate
is `useGate().gate(action, step)` with the dialog linking to `/signin` and `/register`
with `callbackUrl=<path>#<step>`; the existing `AuthDialog` (a password form) was not
reused because the decision was to send readers to the real pages. Half of "Done when"
waits for INC-3: no control exists yet to open the dialog.

## INC-2 - Content model and case one
**Files** `apps/main/content/incidents/{types,index,cloudflare-30-seconds}.ts`.
**Steps** Types for meta (slug, title, topic, minutes, sources), story beats (with a
fork), model steps, simulator scenarios (runtime x event -> outcome + reason), predict
questions (id, prompt, options, answer, explanation, scenario), fix patterns (with
optional code tabs), checklist items, round items. Write case one from SW and WFP
(see overview); each claim carries its source section (e.g. `SW#what-survives-what`).
The simulator's outcome table is a literal copy of the two "What survives what" tables;
the round's items are the "Failure signatures" rows.
**Done when** Niraj has read case one and every claim has a source.
**Outcome (2026-09-26)** `content/incidents/{types,index,cases,the-demo-that-died-at-30-seconds}.ts`.
The story follows Niraj's answers (2026-09-26): a dispatch namespace, the work inside the
request, killed when the connection dropped, and blamed on "the 30-second limit"; roles
only, no names. **To confirm:** the minute-by-minute of the call (a refresh at about
30 s) is a dramatisation of that account. Every model step, simulator outcome,
prediction, pattern and round item names its section in SW or WFP; each cited section
heading was checked against the documents. A scratch check ran the simulator over all
480 control combinations (every lane inside the timeline), each of the 8 predictions
against the run it plays (the answer agrees), and the "What survives what" cells
(request, waitUntil, alarm, cron; namespace and standalone): 0 failures. XP values live
in `INCIDENT_XP`, pointing at the overview.

## INC-3 - Engine components
**Files** `apps/main/components/incidents/*`.
**Steps** StoryTimeline (scroll-revealed beats, the fork), ModelDiagram (animated SVG:
browser, Worker, CPU clock vs wall clock, database), Simulator (platform, runtime and event
controls, a timeline scrubber, lanes that survive or die; a namespace cron shows as
"never ran", not as dying), DecisionTree (the SW Phase 2 flow, clickable), PredictQuestion (commit, then play,
then explain), FixPatterns, CodeTabs, Checklist, SpotTheFailure (timed round).
Reduced motion: every animation has a still, readable end state.
**Outcome (2026-09-26)** `components/incidents/`: `case-view` (rail plus six sections),
`progress-rail` (sticky at lg, a bar under the header below it), `story` (timeline, chat
beats, a terminal log whose lines stagger in, the evidence row, the gated fork), `model` +
`diagrams/worker-limits` (sticky diagram lit per step; per-step diagrams below lg; CPU
ticking idle vs filling while streaming, the waitUntil clock sweeping, the connection
cut, the poll), `simulator` (dark panel, controls with cpu_ms disabled in a namespace,
lanes drawn to a playhead, event marks, the CPU meter, a verdict box that keeps its
height), `predict` (lock, then a compact replay, then the reveal), `fix` (tree walker
plus every leaf listed, patterns with "Does not fix", the twist, after-ship), and
`checklist-round`. Verified: `tsc` clean; the page renders all six sections on `next
dev` with no server errors. Not verified: how it looks and moves in a browser (Niraj's
pass). Every action goes through `useGate`, which completes INC-1's "Done when" once
clicked signed out.

## INC-4 - Progress and XP
**Files** `packages/db/src/schema/incidents.ts` (+ migration, preview first):
`incident_answer (user_id, case_slug, question_id, correct, first_try, created_at,
unique(user_id, case_slug, question_id))`, `incident_completion (user_id, case_slug,
completed_at, perfect_round, unique(user_id, case_slug))`;
`apps/main/actions/(main)/incidents/*.action.ts`; XP through the existing `addXpToUser`.
**Done when** replaying a case adds no second XP row (DB read).
**Outcome (2026-09-26)** Migration `0054_incidents.sql` (two new tables only:
`incident_progress` with the unique key, and `incident_badge` for INC-5, made here so there
is one migration), applied on dev. The logic is `lib/incidents/record.ts`
(`recordProgressFor`), with a thin action `recordIncidentProgress` that resolves the
session; the page loads saved progress (`lib/incidents/progress.ts`), so answered
questions arrive answered. Correctness is judged on the server from the case file. On
dev, with a throwaway user: a first pass with 7 of 8 predictions right and a perfect
round earned 145 XP (70 + 25 + 50, 9 ledger rows); a full replay earned 0; a forged
option was rejected; the user and its rows were then deleted. **Production:** `pnpm
script migrations --apply`.

## INC-5 - Badges, streaks, readiness
`user_badge (user_id, badge_key, earned_at, unique)`; badges defined in the content
index; streak = consecutive days with a completed case; readiness per topic = first-try
correct / questions in that topic. The index page shows topics, cases, and your score.
**Outcome (2026-09-26)** Badges in `content/incidents/badges.ts` (First responder, Called it,
Sharp eye, On call, and one per topic for finishing all its cases), awarded in
`lib/incidents/record.ts` after any new row and announced as toasts. Stats in
`lib/incidents/stats.ts`. **Changed from the line above (Claude's call, easy to
reverse):** the streak counts days with at least one answer, not days with a completed
case, because with one case a completion streak can never pass 1. Readiness counts right
predictions and round answers over every question in the topic's cases, and is '-' until
something in the topic is answered. The index shows a StatBand (XP earned here, cases
done, streak, badges; '-' when signed out, so one skeleton fits both), readiness per
topic, each case's status, and all badges with locked ones dashed. Verified on dev with
a throwaway user: 130 XP from 8 right predictions plus completion with one wrong round
answer, exactly the three badges due, readiness 94% (15 of 16), `-` for an untouched
topic; `streakFrom` gives 3, 1, 2 and 0 for a run, a gap, a run ending yesterday and a
stale day.

## INC-6 - Website
Navbar (Guides panel or its own item), footer, an Everything-else tile, metadata.
**Decided (Niraj, 2026-09-26):** a top-level navbar item, and its own landing section
rather than a ninth tile (the tile grid stays 8).
**Outcome (2026-09-26)** `APP_LINKS.incidents` in apps/web `lib/site.ts`; "Incidents" after
Guides in `nav-links.ts`, which the navbar now renders as a plain `<a>` for any absolute
href (desktop and mobile), per the separation rule; a footer entry under Guides
(`external`); `components/home/incidents-band.tsx` after "Built for your stage": case one's
failure as a CSS-only looping timeline (reduced motion shows the end state), with "Open the
case" and "All incidents". The app pages carry canonical and OpenGraph metadata from
INC-1. Verified over curl on the running web dev server: all four app-origin links in the
HTML, the band rendered; the app's `/incidents` renders signed out with the '-' record band,
readiness, topics and badges. Contrast: small labels on the dark panels (app simulator,
log, round, code, landing band) moved from neutral-500 (about 4.2:1 on neutral-950) to
neutral-400 (about 7:1).

## Left for Niraj

1. **Browser pass** on `/incidents` and the case, signed out and signed in, at 375px and
   1440px, light and dark, and with reduced motion. Signed out, every control should
   open the dialog and sign-in should come back to the same step (INC-1's last check).
2. **Read case one** (INC-2's "Done when"), and confirm the one dramatised detail: the
   refresh at about 30 seconds during the call.
3. **Production:** `pnpm script migrations --apply` from `packages/db` (0054_incidents),
   then release apps/main and apps/web.

## Round 2 (Niraj, 2026-09-26)

Decisions: Incidents lives in the app shell with the sidebar, for signed-in AND
signed-out readers (one layout, one skeleton); it stays public. Case one's content needs
a more vivid story, more depth and a more conversational tone.

### INC-7 - Into the app shell
**Why** The sidebar should be reachable from Incidents. **Files** move
`app/(public)/incidents` to `app/(main)/incidents`; `lib/navigation.ts` (an Incidents
item); the sidebar's footer for a signed-out reader (Sign in); middleware keeps the
public prefix. **Edge cases** signed out, sidebar links needing an account go through
sign-in and back; the AI rail must not open for a signed-out reader. **Done when** both
routes render inside the shell signed out (curl) and signed in.

### INC-8 - Index redesign
**Files** `app/(main)/incidents/{page,loading}.tsx`, a `components/incidents/index-header.tsx`.
**Steps** A page header in the app's style with the title, one line and the record
(XP, cases, streak, badges) as a compact stat row in the top bar; topics as sections
with readiness; case cards with art. **Done when** skeleton matches, typecheck clean.

### INC-9 - Case page redesign
**Files** `components/incidents/case-view.tsx`, `progress-rail.tsx`, sections.
**Steps** The parts index moves to a sticky right column; a compact case header with
topic, time and progress; widths tuned for the narrower page inside the shell.
**Done when** at 1440px with the sidebar pinned, no horizontal scroll and the rail sits
right.

### INC-10 - Content
**Files** `content/incidents/the-demo-that-died-at-30-seconds.ts`.
**Steps** The story as the real thread and call (messages, timestamps, the client's
line, the silence), a postmortem timeline, the request lifecycle in numbers, real-looking
logs; plainer, conversational wording throughout; every new claim still sourced; the
simulator check re-run. **Done when** Niraj reads it; the scratch check passes.

**Outcome, round 2 (2026-09-26)**
- INC-7 Routes moved to `app/(main)/incidents` (the standalone header is gone); an
  Incidents item (Siren) in the sidebar after Pathfinder. Signed out, the sidebar's AI
  button goes to sign-in and back, and a rail left open by an earlier session closes.
- INC-8 Index: one header row (icon, title, line; the record as a small StatBand on the
  right, '-' signed out with a sign-in link), the newest case as a dark featured card
  with `CaseArt` (the failure in miniature, CSS only), topics as a 2x2 of cards with a
  readiness ring and their cases, badges. Skeleton matches.
- INC-9 Case: a dark cover (breadcrumb, title, summary, length, calls, XP available,
  the miniature); the parts index sticky on the right from xl with progress, calls right
  and the round score; a sticky bar under the cover below xl. The model's two columns
  moved to xl (the shell takes 240px). Sticky offsets and scroll margins suit the
  shell's scroll container.
- INC-10 Story rewritten as it happened: Monday, Tuesday, the #eng thread at 3:45, the
  fork at 3:47, the call minute by minute, the row the next day, Friday's thread ("Which
  one?" "It's the whole fix."). Model steps in plain second person. A blameless
  postmortem (root cause, why nobody saw it, what changed) after the twist, sourced.
  New beat kind `thread` and a `postmortem` block. The simulator check still passes (480
  combinations, 0 failures). **To confirm with Niraj:** the #eng messages and the call's
  lines are dramatised from his account.
- Verified: `tsc` clean for these files; `/incidents` and the case render 200 inside the
  shell signed out (sidebar present, right index, threads, postmortem).

## Round 3 (Niraj, 2026-09-26)

Decisions: the index gets two tabs on the right of its header, **Cases** (the featured
case, then topic tabs, the first topic open) and **Badges** (badges with an animated
SVG each); every case card gets its own scene. The case page becomes a **full-page
player** like the project workspace: every step listed on the left, one step at a time,
quizzes are steps of their own. A **talk it through** step uses the Sarvam live
conversation already built for mocks, rounds and standups (typed as a fallback);
**free, 3 a day**. **Diagrams only, no code** (code stays in the collapsed panels).
Cases and steps live **in the database**, authored in the repo's TypeScript files and
written by a preview-first script; answers, mock transcripts and feedback are stored
against the user. The next cases come from Niraj's posts (the semantic cache, the
optimistic like button, the 32 MB login, loading.tsx, the lagging pending flag, the
three layers of a server action, the prefetch, the zero-downtime column), so topics
grow to include AI and LLMs, Frontend and Security, and the index gets filters when
there are enough cases.

### INC-11 - Database
**Files** `packages/db/src/schema/incidents.ts`, a migration,
`packages/db/src/scripts/incidents-seed.ts`.
**Steps** `incident_case` (slug, title, summary, topic, minutes, status DRAFT or LIVE,
content version, published at), `incident_step` (case, ordinal, key, kind, title,
content jsonb, xp), `incident_mock_session` (the voice session columns the Sarvam
interview needs: status, ends at, mode, interaction id, consent, turns, signed url
count, plus feedback and score). The seed script imports `apps/main/content/incidents`,
previews per case what it would insert, update or delete, and writes with `--apply`,
then plans again showing nothing left.
**Done when** the migration applies on dev and `pnpm script incidents-seed --apply`
writes case one and a second run shows "Nothing to change".

### INC-12 - Index
**Done when** the tabs switch without a reload, the topic tabs show only their cases,
each card has its own scene, and each badge animates (still under reduced motion).

### INC-14 - The player
**Files** `app/(main)/incidents/[slug]/*`, `components/incidents/player/*`,
`app/(main)/_components/main-shell.tsx` (full-page path).
**Steps** Steps read from the DB; left: the step list grouped by part, ticks, locks
none; centre: the step; footer: previous, next, arrow keys; the URL keeps the step
(`?step=`); answers persist through the existing progress action.
**Done when** every step of case one renders and a reload lands on the same step.

### INC-15 - Talk it through
**Files** `lib/voice/session.ts` (a fourth kind, "incident"), `actions/voice/*`,
`actions/(main)/incidents/mock.action.ts`, the step component reusing `LiveInterview`.
**Steps** Start a session (free, 3 a day per user), the agent briefed with the case and
the student's answers so far, spoken or typed, transcript saved, feedback at the end.
**Done when** a typed session on dev runs, saves turns and returns feedback; the fourth
start in a day is refused.

**Outcome, round 3 (2026-09-26)**
- INC-11 Migration `0059_incident_player.sql` (three tables only: `incident_case`,
  `incident_step`, `incident_mock_session`), applied on dev. `pnpm script incidents-seed`
  previews per case (new case, steps added, changed, removed, reordered; a case missing
  from content is listed and left alone), writes with `--apply` and re-plans: case one
  written with 34 steps, a second run says "Nothing to change". Content hashes are
  key-sorted, because jsonb returns keys in its own order (the first run reported every
  step as changed for that reason). **Production:** `pnpm script migrations --apply`, then
  `pnpm script incidents-seed --apply`.
- INC-12, INC-13 Index: Cases and Badges tabs on the right of the header (`?tab=`), the
  record band under it; Cases holds the featured case and topic tabs (`?topic=`, the
  featured case's topic open first), each with its cases (a scene per case: case one's
  failure lane, otherwise the topic's own animated scene) and the cases being written
  (Niraj's eight posts, `INCIDENT_UPCOMING`); Badges shows hexagon medals whose ring
  draws, glyph settles and face shines when earned, dashed and still when locked. Topics
  grew by AI and LLMs, Frontend, Security (each gets a completion badge). Cases are read
  from the database (`lib/incidents/catalog.ts`).
- INC-14, INC-16 `components/incidents/player/case-player.tsx`: full page (in the shell's
  full-screen list), top bar with progress, the step list grouped by part with an icon
  per kind and ticks, one step in the middle (wide for diagrams, simulator, fix), footer
  with previous and next (arrow keys; a step picker below lg), `?step=` in the URL.
  `content/incidents/steps.ts` cuts a case into steps (each beat, each model focus, the
  simulator, each prediction as its own quiz step, the fix in five, the conversation,
  checklist, round, closing). The existing section components are reused.
- INC-15 A fourth voice-session kind, "incident", through `lib/voice/session.ts`, the
  ref check and the proxy header; `actions/(main)/incidents/mock.action.ts` (start or
  resume, 3 new a day per reader, finish with inline feedback: summary, strengths, gaps,
  score, 25 s timeout); the step (`player/mock-step.tsx`) reuses `LiveInterview` (spoken
  or typed) and shows past feedback with the transcript. Verified on dev with a
  throwaway user: the session loads for its owner only, consent sets typed mode, the
  lead's brief is built, the typed interviewer opens with the case's opening, turns save;
  user and session deleted. The shared typed interviewer introduces itself as "the
  interviewer for ShipItHQ" before the lead's opening; a small follow-up if that jars.
- Render check (dev, signed out): /incidents, ?tab=badges, ?topic=ai, the player at its
  first step and at ?step=predict-refresh, ?step=simulator, ?step=mock all 200 with no
  new server errors; an unknown slug shows the 404 page.
- **Deleted (Niraj approved, 2026-09-26):** the long-page view the player replaced:
  `components/incidents/{case-view,progress-rail,model}.tsx`, the `Predict` list and the
  `Section` helper. `tsc` clean after.
- **The lead speaks as the lead (Niraj, 2026-09-26):** incident briefs carry
  `persona: "incident"`, and the typed interviewer uses its own instructions for them: no
  interview framing, opens with the case's line. Mocks and rounds unchanged. Verified on
  dev: it opened "We lost the demo in front of the client. Walk me through what happened,
  in your own words." and answered "Cloudflare killed it at 30 seconds" with "Which of the
  three 30-second limits was it, and how can you tell them apart?"

## Round 4 (Niraj, 2026-09-26)

Feedback on the player: "the UI is okay-ish, the content needs to be really great". Decisions:
- **Inside the app shell**: the sidebar opens on the case page too, and the AI rail is there
  to ask questions (it gets an "Incidents" page tag with the case and step). Panels resize
  like the project workspace (`react-resizable-panels`); every scroll is the shared
  `ScrollArea`. **No green**: monochrome. **Pointer cursor on every button and tab, in the
  base** (`packages/ui` globals), so all apps pick it up.
- **No code**: flowcharts and plain explanations only; code panels go.
- **Done is the reader's call**: a "Got it, continue" button marks a step done and moves on;
  Next alone only moves. Quizzes and talks are done when finished. Saved to the database.
- **Case shape: chapters of explain, check, talk.** Each chapter explains one idea with a
  narrated flowchart, then a short check (2-3 questions), and some end in a short talk.
  Final: a quiz over everything, spot the failure, and the closing talk. **20-25 minutes.**
- **Quizzes run on one page**: answer, Next, Next, results and explanations at the end.
  Question kinds: single choice, true or false, sort into buckets, put in order. **One
  shared quiz runner in packages/ui**, usable anywhere in main.
- **Narration**: the incident lead narrates each chapter with **Sarvam TTS**, shown as the
  **ElevenLabs UI orb** reacting to the audio; the text is always on screen, with play and
  pause. The lead is one voice for narration and talks.
- **Talks**: short midway talks (2-3 minutes, 2-3 turns) are **free and uncapped**; the
  closing talk counts toward 3 a day.
- **Writing**: for readers who know HTTP and are new to serverless; every serverless term
  defined on first use (a tap-to-read glossary). A **"same bug elsewhere"** chapter maps the
  lesson to AWS API Gateway, Heroku and Vercel, every number linked to the vendor's docs.

**Outcome, round 4 (2026-09-26)**
- INC-18 The player is back inside the app shell (removed from the full-screen list), so
  the sidebar and the AI rail are there; two resizable panes (`react-resizable-panels`, as
  the workspace), both in the shared `ScrollArea`. No green anywhere in Incidents (every
  emerald class mapped to monochrome; rose stays for failure). A pointer cursor on every
  button, tab, radio, checkbox, option, select and summary, in `packages/ui` globals (base
  layer, so utilities still win; disabled shows not-allowed). ShipItHQ AI: a new "incident"
  context tag (case and step), and the chat route adds a capped brief of the case
  (`lib/incidents/brief.ts`) so answers are grounded in it and never hand out quiz answers.
- INC-19 `packages/ui/src/lib/quiz.ts` (types, `isAnswered`, `grade`, a stable `scrambled`)
  and `components/quiz/quiz-runner.tsx`: single, true/false, buckets, order; one question at
  a time, Next, results with every answer and explanation at the end; retake. Server
  grading uses the same `grade`.
- INC-20 "Got it, continue" (`step` rows) is the only thing that marks a reading step done;
  checks are done when answered, talks when handed in. Next only moves.
- INC-21 `narration.action.ts`: Sarvam TTS per paragraph, cached in R2 keyed by a hash of
  the text (private, signed URL); without R2 (local placeholder keys) it returns the audio
  inline. The ElevenLabs UI orb vendored at `components/ui/orb.tsx` (MIT, its noise texture
  served from `public/incidents/`), animated by state while the lead reads; the paragraph
  being read is highlighted. Verified: a real Sarvam call returned 606 KB of audio in 3.3 s.
- INC-22, INC-23 `Chapter` model (say, flow, see, note, compare, simulator blocks; terms;
  check; talk; sources; links) and `FlowChart` (flowcharts as data, animated edges).
  `content/incidents/the-demo-chapters.ts`: nine chapters (the incident, how a request
  lives, three limits, what survives what, why nothing was saved, the fix, the env twist,
  running it, the same bug elsewhere), a 16-term glossary, 16 check questions across all
  four kinds, two midway talks. Chapter 9 is sourced from AWS (API Gateway quotas: 29 s,
  raisable only for Regional and private APIs), Heroku (router timeout 30 s, H12, the app
  keeps working) and Vercel (duration per plan, no numbers quoted as they change). No code
  anywhere in the case.
- INC-24 Talks per step: chapter talks (3 minutes, free, uncapped) and the closing talk (3
  a day), briefed from the chapter; handing in marks the step done.
- INC-25 Re-seeded: 22 steps (9 chapters, 7 checks, 2 talks, final quiz, round, closing
  talk, closing); the re-check says nothing to change. Verified on dev with a throwaway
  user: a correct order check earned 10 XP once (a repeat earned 0), a wrong answer saved
  with 0, a bucket check graded correct, a made-up question and step rejected, "Got it"
  saved and loaded back. Every step renders inside the shell, no new server errors.
- **Now unused (proposed deletion):** `story.tsx`, `predict.tsx`, `fix.tsx`, `case-cover.tsx`,
  `diagrams/worker-limits.tsx` (the old long-form pieces the chapters replaced).

## Round 5 (Niraj, 2026-09-27)

"This is literally good ... the voice that talks about this, it's way easier to
understand than reading a text." Decisions:
- **Transcript**: visuals first; the spoken script behind a remembered "Show transcript"
  toggle; the current paragraph as a live caption under the orb; auto-scroll to it when the
  transcript is shown.
- **Gating**: reading is never blocked. A chapter's check or talk opens once the previous
  chapter's check or talk is passed; the final quiz, round and closing talk open after all
  chapters' checks and talks.
- **Sidebar**: clearer chapter grouping; titles truncate with an ellipsis so the XP stays
  visible at any width; a "What you'll learn" section.
- **Footer**: previous and next say which chapter, so two "Check yourself" never meet.
- **Signed out**: the AI button opens the sign-in dialog, not the sign-in page.
- **Voice**: auto-play on each chapter (a remembered switch), playback speed (1x, 1.25x,
  1.5x), "Ask the lead" by voice (ask out loud, answered from the case, spoken back), and
  "read the check aloud", **off by default**, for those who want it.
- **Learning**: one hand-written Pathfinder goal per incident (topics, quizzes, a mock, a
  project), seeded by a script and adoptable from the case. **First**: a scan and sweep of
  the Pathfinder module (screens that no longer make sense), its UI brought to the
  workspace and Incidents standard (clean, tab-based like projects), and the two empty
  goals removed with a preview-first script. Then Niraj's Pathfinder questions.

**Outcome, round 5 (2026-09-27)**
- INC-26 The step list groups by act (What happened, How it was fixed, Beyond this case,
  Final), then chapter with a done count; the list's ScrollArea uses `reflow`, which is
  what let titles push the XP out of view (its viewport sized to content). Titles truncate,
  the XP stays. "What you'll learn" lists the case's `learn` topics.
- INC-27 `lockedBy`: chapters always open; a check or talk opens once every earlier
  chapter's check and talk is done; the finals after all of them. A locked step shows a
  panel naming the step to pass, with Go to it.
- INC-28 Footer labels carry the chapter above the title.
- INC-29 `components/auth/sign-in-prompt.tsx`: the dialog is shared, openable from anywhere
  (`openSignInPrompt`) and mounted once in the shell; the sidebar's AI button uses it
  signed out; the Incidents gate uses the same dialog with its own wording.
- INC-30 Visuals first: narrated paragraphs are hidden unless "Show the transcript" (a
  remembered choice) or the voice is unavailable; the paragraph being read is a caption
  under the orb; with the transcript on, the page scrolls to it.
- INC-31 Narrator: Auto (remembered, on by default; a blocked autoplay falls back to
  Listen), speed 1x, 1.25x, 1.5x (remembered), Ask (records with the Sarvam dictation hook,
  `askLead` answers from the case brief in 2-4 spoken sentences, signed in, 20 a day,
  logged as `ask` rows), the answer as a caption and spoken. `lib/incidents/speech.ts`
  caches any case text in R2 by hash (inline without R2). The shared QuizRunner gains an
  opt-in "Read aloud" switch (off by default, remembered) fed by `speakQuestion`.
- Verified: `tsc` clean; re-seeded (the chapters now carry their act); the player renders
  the acts, What you'll learn, the voice controls and the transcript toggle; a fresh reader
  sees chapter 7's talk and the final quiz locked; no new server errors. The mic and ask
  path need Niraj's browser.


## Runs and the run report (INC-33 to INC-40)

Decisions and "done when" (7 to 10) are in `overview.md`, "Runs and the run report".

### INC-33 Runs: tables, consent, and recording into the active run
- [x] Status: done (2026-09-27).
  - Migration `0068_incident_runs` adds the two tables, their foreign keys and indexes, including the partial unique ACTIVE index. It is applied on dev.
  - `lib/incidents/run.ts` has `activeRun`, `addRunEvent` (a no-op without a run; never throws), `startRunFor` (returns the open run, and is race-safe on the index), `endRunFor`, `runStateFor` and `withRun`.
  - `recordProgressFor` writes check, prediction, round and step events from the server's own grading, including answers the ledger already had from an earlier attempt.
  - `askLead` and `startIncidentMock` refuse without a run (code `RUN`) and write ask and talk events. `actions/(main)/incidents/run.action.ts` adds startRun, endRun and getRunState.
  - Checked on dev as a throwaway user: with no run, a check answer saved but no run or event was created. With a run, starting twice returned the same run; the same check again, an ask and a talk gave 3 events of kinds check, ask and talk. The user was deleted.
- **Why:** the report needs everything one attempt did, tied together. `incident_progress`
  is the XP and unlock ledger, unique per (user, case, kind, item), so a retake cannot
  record a second answer there; it stays as it is.
- **Files:** `packages/db/src/schema/incidents.ts` (a migration), `lib/incidents/run.ts`
  (new), `lib/incidents/record.ts`, `actions/(main)/incidents/mock.action.ts`,
  `actions/(main)/incidents/narration.action.ts`.
- **Steps:**
  1. `incident_run`: id, userId, caseSlug, status (`ACTIVE`, `REPORTING`, `REPORTED`,
     `FAILED`, `ENDED`), consentText, consentedAt, startedAt, endedAt, reportJobId,
     report jsonb, shareToken (unique, nullable), sharedAt. One ACTIVE run per user and
     case (partial unique index).
  2. `incident_run_event`: id, runId, kind (`check`, `quiz`, `ask`, `talk`, `step`),
     itemId, payload jsonb, createdAt. Check: the response and the grade. Ask: question
     and answer. Talk: the mock session id (the transcript stays on the session).
  3. `activeRun(userId, slug)` in `lib/incidents/run.ts`; `recordProgressFor`, `askLead`
     and `startIncidentMock` add an event when one exists, and do nothing extra when not.
  4. `startRun(slug)` (consent text stored verbatim) and `endRun`.
- **Edge cases:** a check answered twice in one run keeps both (first try is what the
  report grades); events are written only by the server from graded results, never
  from client-sent grades; deleting a user cascades.
- **Done when:** on dev, a throwaway user with a run answers a check, asks, and starts a
  talk: three events; without a run, none; the migration preview shows only these two
  tables and the index.

### INC-34 The start screen and the gated mic
- [ ] Status: built (2026-09-27), waiting on Niraj's browser check.
  - `run-context.tsx` has the modes recording, reading ("Just read", remembered per case) and deciding, plus `requireRun()`. `start-screen.tsx` has the screen and a header badge ("Recording", which stops the run, or "Start recording").
  - The page overlays the run's own answers on the progress (`withRun`), and the progress provider is keyed by run id, so starting a run begins it blank.
  - The narrator's Ask and the talk step call `requireRun()` first, and handle the server's `RUN` code the same way.
  - Signed out, the start screen does not cover the public page; the badge offers the run through sign-in.
  - Rendered on dev: no run shows "Start recording"; with a run, "Recording"; signed out, the page renders with the badge. The dev log had no errors.
- **Why:** consent comes before anything is kept (decision: at the start, optional).
- **Files:** `components/incidents/player/start-screen.tsx` (new), `case-player.tsx`,
  `narrator.tsx`, `mock-step.tsx`.
- **Steps:** signed in with no active run and no remembered "Just read" for this case:
  the start screen (the mockup in the decision). "Just read" is remembered per case in
  localStorage; the header shows "Recording" or "Start recording". Ask and the talks
  require a run: without one they open the start screen instead.
- **Edge cases:** signed out: the start screen's button opens the sign-in prompt and
  returns here; a reader mid-case when this ships starts with no run and sees "Start
  recording" (their earlier answers are not in the run).
- **Done when:** a fresh signed-in reader sees the start screen; "Just read" leaves no
  run row; the mic buttons open the start screen until a run exists.

### INC-35 Ask keeps the answer
- [x] Status: done (2026-09-27). The ask event stores `{ question, answer, stepTitle }` (see INC-33). The live model path needs a signed-in browser.
- **Why:** the report judges whether they understood the answer and followed up.
- **Files:** `actions/(main)/incidents/narration.action.ts`.
- **Steps:** the `ask` run event stores `{ question, answer, stepTitle }`.
- **Done when:** an ask in a run shows both in its event row.

### INC-36 The `incident_report` job
- [ ] Status: built (2026-09-27). The live gpt-4o run is not done yet: the dev OpenAI account is out of credits ("You have no credits remaining").
  - `apps/worker/src/jobs/incident-report-core.ts` (`buildIncidentReport`) reads the run, the case's steps from the DB, talk transcripts and the ShipItHQ path topics. Check accuracy is counted in code; gpt-4o writes the rest.
  - Validation: known skills and bands only; questions NOT_SHOWN when nothing was asked; highlights kept only if the quote is found verbatim in the reader's own words at the cited source (never the lead's); marks default to clarifying; path topics must match exactly.
  - `incident-report.ts` is the DO wrapper that saves it. The five edits are done: `JOB_TYPES`, `JOB_BINDINGS`, `jobs/index`, wrangler binding plus the NEW tag `v19`, and the `src/index.ts` export. The `incidentRunReport: "gpt-4o"` task line is added.
  - Checked with a canned model reply against a seeded run: the invented quote, the lead's quote and the bad event id were dropped; the bogus band became NOT_SHOWN; the checks were counted per chapter; an unknown path topic was nulled. tsc is clean in worker and main.
- **Why:** reading a whole run and writing a careful review can take more than 30
  seconds (CLAUDE.md: worker).
- **Files:** `packages/db/src/schema/worker.ts` (`JOB_TYPES`), `apps/worker/src/jobs/
  incident-report.ts` (new), `src/env.ts`, `src/jobs/index.ts`, `wrangler.jsonc` (a new
  migration tag), `src/index.ts` (export: the fifth edit), `packages/ai/src/tasks.ts`
  (`incidentRunReport: "gpt-4o"`).
- **Steps:** input `{ runId }` only; re-read the run, its events, each talk's transcript
  and feedback, and the case brief; one JSON-mode call returning the bands, highlights
  (each with `quote` and `sourceEventId` or `sourceSessionId`), question marks, check
  summary and next steps; validate that every quote occurs in its source (drop any that
  do not); write `report`, status `REPORTED`.
- **Edge cases:** a run with no talks or no asks: the band says "Not shown yet" rather
  than guessing; model output that fails validation twice: status `FAILED` with a retry;
  the owner check re-done in the job.
- **Done when:** a seeded run on the local worker produces a report whose every quote is
  found verbatim in the run's rows.

### INC-37 Trigger, follow, cap
- [ ] Status: built (2026-09-27); the end-to-end run needs the worker (`pnpm release`, or local) and model credits.
  - Actions: `requestRunReport` (needs a COMPLETED closing-talk session in the run; 2 a day; singleFlight on the run; sets REPORTING and endedAt), `retryRunReport` and `followRunReport` (a failed job marks the run FAILED).
  - `report-card.tsx` on the closing-talk and closing steps: requests when the closing talk is handed in, follows the job with `awaitBackgroundJob`, then links, retries or shows the cap message.
- **Files:** `mock.action.ts` (`finishIncidentMock`), `actions/(main)/incidents/run.action.ts`
  (new), `case-player.tsx`.
- **Steps:** when the closing talk finishes inside a run, dispatch the job
  (`startBackgroundJob`, no cost, singleFlight on the run id), set `REPORTING`; the
  closing step follows it and links to the report. A 3rd report in a day is refused with
  the time it frees up; the run stays finished and can be reported later.
- **Done when:** finishing the closing talk on dev starts one job and the page links to the
  report when it lands; a third that day is refused.

### INC-38 The report page
- [x] Status: done (2026-09-27). `components/incidents/report/report-view.tsx` has the four band cards with evidence and the last-run change, best moments (quoted, with where each was said), questions with verdicts and the best one marked, checks per chapter linking back to the check step, and next steps. It is printable.
  - Rendered on dev with a seeded report: every section showed for the owner; another signed-in user saw none of it (not found). The skeleton matches.
- **Files:** `app/(main)/incidents/[slug]/report/[runId]/{page,loading}.tsx`,
  `components/incidents/report/*`.
- **Steps:** one page: header (case, date, time taken), the four bands with evidence,
  Highlights, Questions asked, Checks and final quiz (linked to chapters), Next steps
  (linked to the path's topics, with Adopt). Owner only. Printable.
- **Done when:** renders for the owner with a seeded report, 404 for anyone else; skeleton
  matches; no horizontal scroll at 375px (Niraj).

### INC-39 Share link
- [x] Status: done (2026-09-27). `setRunShared` sets a random token or clears it; the page is `/incidents/report/[token]` (public by the `/incidents/` prefix, noindex); `incidentReportShareUrl`. Rendered signed out: the report showed without the owner's controls. After turning it off, the same link showed nothing.
- **Files:** `run.action.ts` (`setRunShared`), `app/(public)/incidents/report/[token]/page.tsx`,
  `middleware.ts` (public prefix), `lib/urls.ts`.
- **Steps:** a random token; the public page is the same report without the reader's
  email; off clears the token.
- **Done when:** the link opens signed out; after turning it off it 404s.

### INC-40 Runs list and a new run
- [ ] Status: built (2026-09-27). "Your runs" in the sidebar lists each run (date, status, band counts), links reported ones, and has "Start a new run" (ends the open one) or "Start a recorded run". Rendered on dev: "Your runs", "Report ready". The click-through is Niraj's.
- **Files:** `case-player.tsx` (sidebar "Your runs"), `run.action.ts`.
- **Steps:** each past run with its date and bands, linking to its report; "Start a new
  run" ends the active one (status `ENDED` if unreported) and opens the start screen.
- **Done when:** a second run makes a second report and both are listed; the first is
  unchanged.

### INC-41 Compare with the last run
- [ ] Status: built (2026-09-27). The job sets each band's `previous` from the reader's last REPORTED run on the case; the view shows "Last run: X -> Y". Not yet seen with two real reports.
- **Files:** the report job (reads the previous REPORTED run's bands), `components/incidents/report/*`.
- **Steps:** from the second report on, each band carries `previous` and shows "Developing -> Solid".
- **Done when:** a second seeded report shows the change for each band.

### INC-42 Report XP
- [x] Status: done (2026-09-27). `INCIDENT_XP.report = 30` (a default). `awardReportXp` runs on the owner's report page, and the ledger key makes it once. Checked: two page loads gave one row with 30 XP.
- **Files:** the report job's settle step in main (`run.action.ts`), `INCIDENT_XP` in `content/incidents/index.ts` (the amount is a decision in the overview).
- **Steps:** an `incident_progress` row `kind: "report"`, itemId `report`, so the unique key makes it once per case.
- **Done when:** the first report awards XP once; a second run awards none.

### INC-43 Next steps into the adopted path
- [ ] Status: built (2026-09-27). The report links each next step to `/pathfinder/<copy>?tab=plan&topic=<id>` when the reader has adopted the path; the workspace opens with `?topic=` selected. Without the path, "Adopt the learning path to follow these" appears (seen on dev).
- **Files:** the report page, `lib/pathfinder/copy.ts` callers, the report's next steps (each names a path topic title).
- **Steps:** if the reader has adopted the path, "Next steps" links straight to those topics (`/pathfinder/<slug>?tab=plan`, topic selected) and lists them first in Today; if not, it offers Adopt.
- **Done when:** with an adopted path, each next step opens its topic.

### INC-44 Delete a run
- [x] Status: done (2026-09-27). `deleteRun` deletes the run's talk sessions and the run in one batch (events cascade), behind a confirm on the report. Checked: 0 runs and 0 events left.
- **Files:** `run.action.ts` (`deleteRun`), the report page.
- **Steps:** a confirm naming what goes (the run, its events, its talk transcripts, its share link); XP already earned stays.
- **Done when:** after deleting, the run's rows and its sessions are gone and the share link 404s.

### INC-45 Player fixes (Niraj, 2026-09-27)
- [ ] Status: built (2026-09-27), waiting on Niraj's browser check.
  - **Audio twice:** the player rendered the step body in both layouts (desktop panes plus a CSS-hidden mobile copy), so two narrators auto-played every clip, and every talk and start screen was mounted twice. The body now mounts once (`useIsDesktop`). Checked: a rendered chapter has one narrator.
  - **Auto-play off by default:** nothing speaks when a page opens; the Auto switch still turns it on (remembered).
  - **Steps panel narrower:** 18% by default (13 to 32%), was 24%.
  - **"The voice is on":** while the lead speaks or listens, the narrator bar sticks to the top of the step with moving bars beside the name, so it follows the reader down the page.
  - **Sentence case:** every all-caps label in the player and the shared case components is normal case.
  - **AI rail:** opens by default on a case, desktop and signed in only. It closes again on leaving if the case opened it (its open state is never persisted, so no other page changes). Closing it on a case is remembered for the browser session.

### INC-46 Flow chart labels
- [ ] Status: not started
- **Why:** "no" and "yes or no" sat on top of the arrow lines (Niraj's screenshot).
- **Files:** `components/incidents/flow-chart.tsx`.
- **Done when:** edge labels sit beside their line, on a background, never crossed by it.

### INC-47 The lead store
- [ ] Status: not started
- **Why:** the rail (in the shell) and the chapter (in the player) must share one voice: its
  paragraph, its state and its thread. Two narrators were the double-audio bug.
- **Files:** `components/incidents/lead/store.ts` (new zustand store + one Audio element),
  `narrator.tsx` (retired into it).
- **Steps:** the player registers `{ slug, chapterId, paragraphs, stepTitle }` on each chapter and
  clears it on leave; the store plays, pauses, sets speed, tracks the paragraph, holds the
  thread; leaving the case stops audio.
- **Done when:** only one Audio element exists; the chapter reads the index from the store.

### INC-48 The lead in the rail
- [ ] Status: not started
- **Files:** `components/ai/ai-rail.tsx`, `components/incidents/lead/lead-panel.tsx` (new),
  `actions/(main)/incidents/narration.action.ts` (`askLead` accepts typed text, longer answers).
- **Steps:** when a case is registered the rail shows tabs Lead | ShipItHQ AI (Lead first) and
  opens by default (INC-45's rule: closes on leaving if the case opened it); the Lead tab has
  the orb, Listen / Pause, speed, Auto, the current paragraph, the thread (loaded from the
  run's ask events), and a composer with a text box and a mic. Signed out or without a run,
  the composer offers the start screen.
- **Edge cases:** the rail closed: a small "Listen" stays in the chapter header so the voice
  is never out of reach; mobile (no rail): the lead opens as a bottom sheet.
- **Done when:** DoD 11 and 13.

### INC-49 Follow along
- [ ] Status: not started
- **Files:** `content/incidents/types.ts` (`say.focus`: `"<blockId>"` or `"<blockId>:<part>"`,
  and ids on flow/compare/note blocks), `case-player.tsx` (ChapterView), `flow-chart.tsx`
  (`lit` node, the rest dimmed), the compare table (lit row).
- **Done when:** DoD 12; with nothing playing, nothing is dimmed.

### INC-50 Terms
- [ ] Status: not started
- **Files:** glossary entries gain `pathTopic`; `narration.action.ts` (`explainTerm`),
  ChapterView (term underline), `lead-panel.tsx` (the explanation and its link).
- **Steps:** the link is the reader's adopted-path topic (`/pathfinder/<copy>?tab=plan&topic=`)
  or the ShipItHQ path preview (`/pathfinder/explore/<id>`), `target="_blank"`
  (memory: new-tab rule). Explanations are cached per term (they are about the case, not
  the reader) so a second reader does not pay again.
- **Done when:** DoD 14.

### INC-51 Rewrite the case
- [ ] Status: not started
- **Files:** `content/incidents/the-demo-chapters.ts`, then `pnpm script incidents-seed --apply`.
- **Steps:** per chapter: a hook question first; narration in short spoken sentences, one idea per
  paragraph, each with a `focus`; flow nodes get an order so the diagram builds as the lead
  reaches them; notes stay one line. Facts unchanged (sources as today).
- **Done when:** every `say` has a `focus` that exists; the seed applies and a second run is
  "Nothing to do"; Niraj listens through.

**INC-46 to INC-51 as built (2026-09-27).**
- **INC-46:** each edge label sits beside the middle stretch of its line, to the right of a vertical stretch or above a horizontal one, with a halo in the chart's background colour.
- **INC-47:** `components/incidents/lead/store.ts` holds the one Audio element, the chapter, the paragraph index, speed, Auto and the thread. `narrator.tsx` is deleted.
- **INC-48 (changed mid-build by Niraj: "keep the listen thing on the current page ... the AI panel side, there the user can talk and ask and justify"):**
  - The rail opens on every case (desktop, signed in) on the lead, and closes on leaving if the case opened it. There is no session memory of a close.
  - The rail is a conversation only: the orb, the thread (the run's asks, kept across reloads), and a composer with a text box and mic ("Ask, or explain your thinking").
  - `askLead` answers longer when needed, and pushes back on a justification: what is right, what is missing, one follow-up question. The ShipItHQ AI tab keeps the case as context through the page's auto-tag.
  - Listening is the page's ListenBar: play, speed, Auto, transcript and the line being read. It is sticky while speaking, with the moving bars.
- **INC-49:** `say.focus` plus ids on blocks. The part being read lights (a flow node ringed, a compare row, a see line), the rest of the chapter dims, and the page scrolls to it. With nothing playing, nothing dims.
- **INC-50:**
  - Glossary terms are underlined in the transcript, notes and tables; the "Words in this chapter" chips can "Ask the lead to explain".
  - `explainTerm` gives 4 to 6 spoken sentences with an example from the case (cached in R2 per term; without the model it falls back to the glossary line), written to the run.
  - "Learn it properly" goes to the adopted path's topic, or else the path preview, in a new tab.
- **INC-51:**
  - All 9 chapters rewritten: a hook question first, short spoken sentences, and 72 paragraphs each with a `focus`. The flows build by node `order`. Facts, checks, talks and sources are unchanged.
  - A script checked that all 72 focuses resolve. The seed applied 9 steps, and a second run was "Nothing to change". Every chapter renders 200.
- **INC-48 follow-up (Niraj, 2026-09-27, signed out, from screenshots):**
  - The sidebar closed the rail for any signed-out visitor, so "Ask the lead" opened it and it shut at once. On a case it now stays open.
  - The case opens the rail signed in or out. Signed out, both tabs show "Talk to the incident lead" / "ShipItHQ AI" with "Sign in to ask" (the shared sign-in dialog). The header's "Ask the lead" also opens the dialog when signed out.
  - Listening moved into the player's bottom bar (play, the moving bars, the line being read on xl, speed, Auto, Transcript), in place of the "Arrow keys" hint on chapter steps. Nothing floats over the text any more. The transcript switch lives in the lead store (remembered).

- **INC-48 second follow-up (Niraj, 2026-09-27, screenshot of the tab bar):**
  - On a case the rail is the lead only: the Lead / ShipItHQ AI tab bar is gone.
  - The panel header is h-14, like the player's, so the two lines up. It has "Turn off" (remembered in `incidents:rail-off`; the rail stops opening by itself on cases, and "Ask the lead" still opens it) and close.
  - Answers play in the thread as audio with a small waveform; each has a "Transcript" toggle (shown when there is no audio). There is no uploader.
  - The page transcript is hidden by default under a new key (`incidents:transcript-shown`).
  - TEMPORARY: `askLead` and `explainTerm` work signed out and without a run, not kept and not capped, so Niraj can test by typing. Signed in, the cap and the run still apply. See INC-52.

### INC-52 Sign-in barrier back on asking
- [ ] Status: not started. Removed on purpose for testing (2026-09-27).
- **Why:** signed out, asking is uncapped, so anyone can spend model calls.
- **Files:** `actions/(main)/incidents/narration.action.ts` (`askLead`, `explainTerm`), `lead-panel.tsx` (the signed-out composer: a "Sign in to ask" card).
- **Done when:** signed out, a direct `askLead` call returns code AUTH, and the panel shows the sign-in card.
- **INC-48 third follow-up (Niraj, 2026-09-27):**
  - **Mic fixed.** The lead used `/api/practice/voice/transcribe`, which needs a session; signed out, the middleware redirected the POST to /signin (the "Failed to find Server Action" 500s).
    - New `app/api/incidents/transcribe` (listed in the middleware's API pass-through; no session for now, see INC-52), and `useDictation` takes an `endpoint`.
    - The panel now waits for the final transcription (no guessed delay) and shows it happening: a loader on the mic, "Transcribing..." in the thread and the header, and the orb thinking. Errors are toasted ("I didn't catch that").
    - Checked: POSTs to the new route return 200 or 400, never a redirect.
  - **Bottom bar: two controls.** Listen (with the moving bars inside it), and one menu with speed (1x, 1.25x, 1.5x), "Play when a chapter opens" and "Show the transcript".
- **Footer (Niraj, 2026-09-27):** "Done with this step? / Got it, continue" left the content. On a hand-marked step not yet done (and not locked), the footer's Next is the filled "Got it, continue" ("Got it, finish" on the last step), with the next step's chapter as its small line. Once the step is done, it is the plain Next.
- **Skeleton (Niraj, 2026-09-27):** `[slug]/loading.tsx` now has the right panel (380px, lg and up: an h-14 header with the orb, title, Turn off and close; the thread; the composer) beside the page column. The page column has the new top bar, an 18% steps list and the bottom bar (Previous, Listen with its settings, Next).

### INC-53 Case sidebar accordion
- [ ] Status: not started
- **Why:** nine chapters times two or three rows is about 30 rows of noise (Niraj, 2026-09-28).
- **Files:** `components/incidents/player/case-player.tsx` (the `list`).
- **Steps:** one row per chapter (number, title, done count); the chapter holding the current
  step is open with its steps; opening another closes the open one; act names stay as labels.
- **Done when:** on load only the current chapter shows step rows; moving to a step in another
  chapter opens that one.

### INC-54 Index filters
- **Files:** `app/(main)/incidents/page.tsx`, `components/incidents/index-tabs.tsx`.
- **Steps:** topics as the filter, in the URL (`?topic=`); a case with two topics shows under
  both (a case gains `topics: string[]`, first is primary).
- **Done when:** `/incidents?topic=security` lists case 2 and the link is shareable.

### INC-55 Simulator engine
- **Files:** `components/incidents/sim/` (new: `schema.ts`, `engine.ts`, `lanes-view.tsx`,
  `traffic-view.tsx`), `content/incidents/types.ts` (`simulator: Scenario`).
- **Steps:** a zod schema for a scenario (controls, actors, rules, view); a pure, tick-based
  engine (same inputs, same result, so it is testable); two views. Rules are a closed set
  (counter per key in a window, token bucket, score threshold, dies-on-event), never eval.
- **Done when:** the engine is pure and a script runs both scenarios to their expected
  outcomes without a browser.

### INC-56 Case 1 on the engine
- **Done when:** case 1's "What survives what" shows the same survivals for every choice as the
  hand-written simulator does today; the old `simulator.tsx` is deleted.

### INC-57 Case 2 content
- **Files:** `content/incidents/the-login-*.ts`, `cases.ts`, then `pnpm script incidents-seed --apply`.
- **Steps:** write from `case-login.md` once Niraj approves it: hooks first, for the ear, a
  `focus` on every paragraph, flows that build, glossary with `pathTopic`, checks, talks,
  final quiz, round, closing. Every fact checked against the sources listed there.
- **Done when:** the seed applies; every focus resolves (the focus check script); Niraj listens through.

### INC-58 Case 2's scenario
- **Done when:** for each attack (one email, spray, botnet) and defence (per email, per IP,
  combined), the simulator shows attempts let through, blocked, and real users locked out.

### INC-59 "Protecting logins" path
- **Files:** `content/incidents/paths.ts`, `path-cases.ts`; `pnpm script incident-paths --apply`.

### INC-60 AI-drafted scenarios (next round)
- apps/admin authoring page: outline in, AI drafts a scenario, schema check, play, adjust, approve.

**INC-53 to INC-58 as built (2026-09-28).**
- **INC-53:** each chapter is one row (chevron, number, title, done count). Only the chapter holding the current step is open; opening another closes it. The act names are quiet labels. Rendered on dev: on "What survives what" 1 row open and 15 closed, no errors.
- **INC-54:** `IncidentMeta.alsoIn` holds extra topics. `CaseSummary.topics` is the main topic plus `alsoIn` (from the content file), and the index counts and filters on it. `?topic=` was already in the URL.
- **INC-55:** `components/incidents/sim/`:
  - `schema.ts` (zod `TrafficScenario`: controls, actors, a closed set of rules, which are a counter per email and/or IP with block or lock, and a score from email, IP, service and new-device signals graded into slow, challenge or block, plus verdicts)
  - `traffic-engine.ts`: pure and deterministic
  - `traffic-view.tsx`: four numbers, a minute-by-minute chart, the verdict, behind the sign-in gate like the timeline
  - `case-simulator.tsx`: picks the view
  - A simulator block can take a `preset`.
- **INC-56:** case 1 keeps its reviewed `simulate` code and runs through `CaseSimulator` (Niraj: "wrap it, keep its code"). `IncidentCase.simulator` is `SimulatorSpec | TrafficScenario`. Case 1 renders as before.
- **INC-58:** `content/incidents/sims/login-traffic.ts` has 3 attacks, 5 defences, Sam, 30 office staff and 8 verdicts. `apps/main/scripts/check-incident-sims.ts` runs all 15 combinations against the outcomes the chapters rely on: bad 0, and the 30 office staff get in every time.
  - Engine semantics settled by the check: a failed challenge counts against the address and the service, not the account. The service-wide spike weighs only on new devices. A slow-down holds back one machine, not a botnet. A group of users keeps going after one of them gets in.

**INC-57 and INC-59 as built (2026-09-28).**
- **INC-57:** `content/incidents/the-login-chapters.ts` holds 9 chapters (acts: What happened, How it was fixed, Running it), each opening on a hook, with 59 narrated paragraphs each with a `focus`. There are four simulator blocks with presets (chapters 4 to 7), 12 checks, talks at chapters 3, 5 and 8, a 17-term glossary with path topics, and the composite-incident line in chapter 1.
  - `the-login-that-said-yes-to-guessing.ts` holds the sources, the model steps and fix for the lead's brief, 4 predictions (the final quiz, with simulator scenarios), a 4-item "Spot the hole" round, a 7-item checklist, the closing and the closing talk.
  - Its index meta is topic `security` with `alsoIn: ["auth"]`, about 25 min.
  - Facts checked 2026-09-28:
    - RFC 6585 section 4 (429; SHOULD explain; MAY carry Retry-After; MUST NOT be cached; counting is left to the server)
    - NIST 800-63B 3.2.2 (at most 100 consecutive failures; bot challenge, growing waits, risk signals)
    - OWASP credential stuffing (the attack types; IP limits easy to get round; fingerprints can be spoofed)
    - OWASP authentication (the same message and timing; a lockout can become a denial of service)
    - Cloudflare's rate limiting binding (per location, eventually consistent, not an accounting system, 10 or 60 s windows)
  - `apps/main/scripts/check-incident-focus.ts` (new): every focus in both cases resolves and every term is in its glossary (131 paragraphs, bad 0).
  - Seeded as a new case, 22 steps; the second run was "Nothing to change". Every step renders 200 on dev, the simulator shows on chapters 4 to 7, and there were no server errors.
- **INC-59:** "Protecting logins" has 5 topics, each with hand-written notes, owned by the ShipItHQ account. `pnpm script incident-paths --apply` created it and the next check matched. "Adopt this path" and the terms' "Learn it properly" now cover case 2.
- **INC-48 fourth follow-up (Niraj, 2026-09-28):**
  - **Mic stayed red:** sending (Enter or the arrow) while recording sent the text but never stopped the recorder. `send` now stops dictation first and uses the final transcription. Send is disabled while transcribing.
  - **Text box:** grows with its text up to about six lines (168px), then scrolls.
  - **Answers:**
    - a "The incident lead" label
    - a round play/pause button
    - a waveform that fills as the answer plays (the store tracks `elapsed` / `duration`), with the time "0:08 / 0:21"
    - "Transcript" / "Hide transcript"
    - "Learn it properly" as a link chip
  - While waiting, a bubble says "The lead is thinking...". The "Transcribing..." bubble is a `div`, no longer a `<p>`.
  - **The "<p> cannot contain a nested <div>" error:** `InlineLoader` is a `<span>`, but its dots (`DotMatrixBase` in `packages/ui/src/lib/dotmatrix-core.tsx`) are `<div>`s. So any loader inside a `<p>` is invalid. The server HTML of the case pages was clean, which pointed at browser-only UI.
    - Fixed app-wide, 6 paragraphs that held an `InlineLoader` are now `div`s. On the case page these were `live-interview.tsx` (the talk steps) and `report-card.tsx`, plus the lead panel's "Transcribing..." bubble.
    - Elsewhere: `settings/account/delete-account.tsx`, `ideas/ideas-client.tsx`, and in apps/hiring `results/decide-panel.tsx` and `onboarding/website-step.tsx`.
    - tsc is clean in main and hiring.

### INC-61 Start page, the learn step, and the last UI sweep (Niraj, 2026-09-28)
- [ ] Status: built 2026-09-28, waiting on Niraj's test pass.
- **Start step (the front page):** `stepsFor` puts a `start` step first (summary, minutes, counts of chapters, checks and talks).
  - `StartScreen variant="step"` shows the case at a glance, how it works (listen or read, check yourself, talk it through), what a recorded run keeps, "Start the case" (signed out: "Sign in to start", which opens the sign-in dialog) and "Just read, no review".
  - When recording, it says so and offers "Go to chapter 1".
  - The automatic start overlay is gone. The short prompt appears only when asking or a talk needs a run.
- **The learn step:** "What you'll learn" is the last step (`learn`, part "Keep learning"): the topics as cards and "Adopt this path". It is no longer in the sidebar. Start and learn are never locked; learn gets "Got it, finish".
- **The chat box** sits in the styled ScrollArea (`viewportClassName="max-h-[168px]"`), not the browser's scrollbar. It grows, then the ScrollArea scrolls.
- **Sweep:**
  - The last all-caps labels are now normal case (the report page, the Incidents index, one case illustration).
  - The index's topic tabs use the horizontal ScrollArea instead of `overflow-x-auto`.
  - At phone width, the header's back link, "Ask the lead" and the recording badge shrink to icons, and the bottom bar's listen controls take only their width (the settings button hides) beside the step picker.
  - No off-palette colours, no dashes.
- **Seed:** both cases gained `start` and `learn` (existing keys unchanged). Applied; the next check was "Nothing to change".
- **Checked on dev:** both cases open on Start ("Sign in to start" signed out), `?step=learn` shows "Adopt this path", chapters and the index return 200, and tsc is clean.
