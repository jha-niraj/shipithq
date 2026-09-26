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
