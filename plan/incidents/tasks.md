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
| INC-33 | Runs: `incident_run` + `incident_run_event`, consent, and every action writes to the active run | not started |
| INC-34 | The start screen: consent, "Just read", and the mic gated on a recorded run | not started |
| INC-35 | Ask keeps the lead's answer | not started |
| INC-36 | The `incident_report` worker job (Durable Object, gpt-4o) | not started |
| INC-37 | Trigger and follow: the report starts after the closing talk; 2 a day | not started |
| INC-38 | The report page | not started |
| INC-39 | Share link and the public report page | not started |
| INC-40 | Runs list and "Start a new run" | not started |
| INC-41 | Compare with the last run: each band shows its change | not started |
| INC-42 | Report XP: once per case, the first report | not started |
| INC-43 | Next steps mark topics in the reader's adopted path | not started |
| INC-44 | Delete a run and its transcripts | not started |

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
- [ ] Status: not started
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
- [ ] Status: not started
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
- [ ] Status: not started
- **Why:** the report judges whether they understood the answer and followed up.
- **Files:** `actions/(main)/incidents/narration.action.ts`.
- **Steps:** the `ask` run event stores `{ question, answer, stepTitle }`.
- **Done when:** an ask in a run shows both in its event row.

### INC-36 The `incident_report` job
- [ ] Status: not started
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
- [ ] Status: not started
- **Files:** `mock.action.ts` (`finishIncidentMock`), `actions/(main)/incidents/run.action.ts`
  (new), `case-player.tsx`.
- **Steps:** when the closing talk finishes inside a run, dispatch the job
  (`startBackgroundJob`, no cost, singleFlight on the run id), set `REPORTING`; the
  closing step follows it and links to the report. A 3rd report in a day is refused with
  the time it frees up; the run stays finished and can be reported later.
- **Done when:** finishing the closing talk on dev starts one job and the page links to the
  report when it lands; a third that day is refused.

### INC-38 The report page
- [ ] Status: not started
- **Files:** `app/(main)/incidents/[slug]/report/[runId]/{page,loading}.tsx`,
  `components/incidents/report/*`.
- **Steps:** one page: header (case, date, time taken), the four bands with evidence,
  Highlights, Questions asked, Checks and final quiz (linked to chapters), Next steps
  (linked to the path's topics, with Adopt). Owner only. Printable.
- **Done when:** renders for the owner with a seeded report, 404 for anyone else; skeleton
  matches; no horizontal scroll at 375px (Niraj).

### INC-39 Share link
- [ ] Status: not started
- **Files:** `run.action.ts` (`setRunShared`), `app/(public)/incidents/report/[token]/page.tsx`,
  `middleware.ts` (public prefix), `lib/urls.ts`.
- **Steps:** a random token; the public page is the same report without the reader's
  email; off clears the token.
- **Done when:** the link opens signed out; after turning it off it 404s.

### INC-40 Runs list and a new run
- [ ] Status: not started
- **Files:** `case-player.tsx` (sidebar "Your runs"), `run.action.ts`.
- **Steps:** each past run with its date and bands, linking to its report; "Start a new
  run" ends the active one (status `ENDED` if unreported) and opens the start screen.
- **Done when:** a second run makes a second report and both are listed; the first is
  unchanged.

### INC-41 Compare with the last run
- [ ] Status: not started
- **Files:** the report job (reads the previous REPORTED run's bands), `components/incidents/report/*`.
- **Steps:** from the second report on, each band carries `previous` and shows "Developing -> Solid".
- **Done when:** a second seeded report shows the change for each band.

### INC-42 Report XP
- [ ] Status: not started
- **Files:** the report job's settle step in main (`run.action.ts`), `INCIDENT_XP` in `content/incidents/index.ts` (the amount is a decision in the overview).
- **Steps:** an `incident_progress` row `kind: "report"`, itemId `report`, so the unique key makes it once per case.
- **Done when:** the first report awards XP once; a second run awards none.

### INC-43 Next steps into the adopted path
- [ ] Status: not started
- **Files:** the report page, `lib/pathfinder/copy.ts` callers, the report's next steps (each names a path topic title).
- **Steps:** if the reader has adopted the path, "Next steps" links straight to those topics (`/pathfinder/<slug>?tab=plan`, topic selected) and lists them first in Today; if not, it offers Adopt.
- **Done when:** with an adopted path, each next step opens its topic.

### INC-44 Delete a run
- [ ] Status: not started
- **Files:** `run.action.ts` (`deleteRun`), the report page.
- **Steps:** a confirm naming what goes (the run, its events, its talk transcripts, its share link); XP already earned stays.
- **Done when:** after deleting, the run's rows and its sessions are gone and the share link 404s.
