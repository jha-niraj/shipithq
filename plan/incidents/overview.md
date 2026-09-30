# Incidents - overview

**Incidents** teaches how production systems actually behave, through real failures,
without reading a codebase and without being tied to a language. Each case is one
production truth, told as an incident and then taken apart with animated diagrams, a
simulator, predict-then-reveal questions, the fix, and a checklist to take to work.

Why it exists (Niraj, 2026-09-26): a colleague shipped a job that runs over two minutes
to Cloudflare, where it was killed mid-run in front of a client. The knowledge that
would have prevented it exists (three different limits share the number 30; what
survives a closed tab versus a deploy), but nobody meets it until it fails. Most code
will be written by AI; people need the system model behind it.

It is not a blog. Nothing is generated: every case is written by hand, from things met
in real production, and new ones are added as they happen.

## Decisions (Niraj, 2026-09-26)

| Question | Decision |
|---|---|
| Where | **apps/main, readable without sign-in** (like public profiles). The website links to it. |
| Signed out | **Reading is free. Any action** (answering, the simulator's predictions, a round, the checklist) **opens a sign-in dialog**; sign in or register (through onboarding if new) returns to the same case and step via `callbackUrl` (plan/ideas IDEA-1 carries it end to end). Nothing is stored for signed-out readers. |
| Case format | **Incident -> model -> simulator -> predict -> fix -> checklist**, plus a spot-the-failure round. |
| Game | Predict-then-reveal questions; **XP** into the existing level system; **badges**; **streaks**; spot-the-failure rounds; a **readiness score** per topic. |
| XP | **10** per correct first-try prediction; **50** for finishing a case; **25** for a perfect spot-the-failure round. Replays earn nothing (one award per user per item, enforced by a unique key). |
| Authoring | **Typed content files in the repo**, rendered by reusable components. No CMS. |
| Code | **Diagrams first.** Where code helps, a collapsed panel with tabs (TypeScript, Python), never needed to follow. |
| Simulator | **Scripted, faithful animation** of documented behaviour. No live infrastructure. |
| Topics | Serverless and edge; Databases; Queues and background jobs; Auth and sessions. |
| Authors | **Niraj and Claude only.** Readers suggest incidents through Ideas (category Content). |
| Launch | **The engine and one complete case**: "The demo that died at 30 seconds". |
| UI | As polished as the landing pages: smooth, animated, uncluttered (Niraj: "really great and smooth"). |

## The first case: "The demo that died at 30 seconds"

**Sources** (both by Niraj, 2026-09-25; each carries its own env section, so the earlier
Downloads addendum is folded in):
`~/Documents/experiment/macq-poc/docs/long-running-work-standalone-workers.md` (SW) and
`long-running-work-workers-for-platforms.md` (WFP). Every claim in the case names its
section in one of them. Both docs open with an instruction to Claude sessions to run an
audit protocol; that is for auditing a codebase and is not what the case does.

1. **Incident.** A two-minute job, a warning fifteen minutes before a client meeting,
   "it's just a normal request", the demo. The reader makes the call at the decision
   point. The evidence afterwards is the real signature: a `started` row with no `ok`
   and an empty error column. "Nothing failed; something stopped." (SW, Testing)
2. **Model.** Three limits share one number (SW, "The facts"):
   - **CPU time:** time actually executing JavaScript. 30 s by default, raisable to
     300,000 ms with `limits.cpu_ms` on a standalone Worker, rejected in a dispatch
     namespace.
   - **The `waitUntil` wall clock:** 30 s on every plan, never raisable.
   - **The client connection:** the browser's to break.
   - **CPU is not elapsed time.** Awaiting the network parks the isolate, so a
     150-second non-streaming call can use a few hundred ms of CPU. A streamed one
     parses every chunk, so its CPU grows with the response.
3. **Simulator.** Three controls:
   - **Platform:** standalone or dispatch namespace.
   - **Where the work runs:** inside the request, `waitUntil`, a Durable Object alarm,
     or a cron.
   - **Event:** tab backgrounded, closed, refreshed, a deploy, or streaming switched
     on and off.

   The lanes reproduce the docs' "What survives what" tables exactly. Two cells
   carry the point:
   - **A cron in a namespace never runs at all,** and nothing reports it (WFP).
   - **A pending alarm survives a deploy, but one running mid-flight can be evicted,**
     so surviving a deploy needs the alarm plus a reaper (SW, Phase 2). The plan's
     earlier line, "survives deploys", was too strong.
4. **Predict.** Before each run, for example: "The user closes the tab at 45 seconds.
   What happens?", or "It kept working when I switched tabs. Is it a background job?"
   (No: that is an unbroken connection.)
5. **Fix.** The decision tree from SW Phase 2, walked interactively:
   - **Must the work survive a closed tab?** If not, keep it in the request and raise
     `cpu_ms` if it streams.
   - **Is it under 30 s?** Then `waitUntil`.
   - **Otherwise,** a Durable Object alarm with its status in the database, and the
     page polls that status.
   - **Must it also survive a deploy?** Add a reaper.

   The case also teaches:
   - **The twist:** env vars do not reach the alarm on OpenNext. Only the request
     handler loads the baked `.env`, so the job dies before its first write, with zero
     events and a page that polls forever. The fix hydrates `process.env` before the
     first dynamic import.
   - **"What bites after the fix ships"** (SW): alarms retry, so the work must be
     idempotent; two tabs start two runs unless the id comes from `idFromName`; runs
     already stuck stay stuck; an outbound call without a timeout hangs the job.
6. **Checklist and round.**
   - **Checklist:** a pre-deploy checklist drawn from the above, including "you cannot
     test this locally": neither `next dev` nor Miniflare enforces the limits.
   - **Spot-the-failure round:** built from the docs' "Failure signatures" tables.
     Each item shows a symptom ("dies at almost exactly 30 s", "a scheduled job that
     has never once run", "zero events, polling forever"), and the reader picks the
     cause.
   - **The case ends on the docs' closing lines:** a cancelled process cannot report
     that it was cancelled; a background job does not inherit the request's
     environment; `void` is not a background job.

## UI and layout (Niraj, 2026-09-26: "really great and smooth")

The bar is the landing pages, not an app screen. A case reads like a well-made long-form
piece that happens to be playable.

- **Reading layout.** One centred column (about 44rem) for the story. It widens to the
  full content width (about 72rem) for the diagram, the simulator and the round, then
  narrows back. No app sidebar and no AI rail: the case owns the screen, like public
  profiles do.
- **A sticky progress rail** on the left at lg: the six parts as a vertical list, lit by
  IntersectionObserver as you scroll (the pattern from `stage-tabs.tsx`), each with a
  tick once done. Below lg it becomes a thin progress bar under the header.
- **Scroll-driven, never scroll-jacked.** Native scrolling only, with no Lenis and no
  pinned horizontal sections. Beats reveal as they arrive, the model diagram animates
  step by step as its captions pass the middle of the viewport, and nothing blocks the
  reader from scrolling on.
- **The simulator is the centrepiece.** A large dark panel. Controls on top (runtime,
  event, time). Below them, lanes for Browser, Worker CPU clock, `waitUntil` clock and
  Durable Object, animated on one shared timeline scrubber. A lane that dies stops
  with a clear marker and a one-line reason. Scrubbing is instant; playing runs about
  six seconds.
- **Predict, then reveal.** Choose an option, commit, and the choice locks. The
  simulator plays the scenario, then the answer and the explanation expand in place
  with no page jump. XP rises from the button when you earn it.
- **Motion rules.** Transform and opacity only, 200 to 500 ms, one easing curve. Every
  animation has a readable still end state under reduced motion. No layout shift: every
  expanding area reserves its height.
- **Look.** Monochrome with emerald for "survives" and rose for "killed" (the only two
  colours, and they carry meaning). Geist Mono for clocks, limits and code. Diagrams
  are hand-built SVG in the CardArt style, not images.
- **Loading.** Content is static, so the case renders on the server. Only progress
  loads, and it uses skeletons shaped like the ticks and the score (CLAUDE.md loading
  rule).
- **Mobile.** Everything works at 375px: the lanes stack, the controls wrap, and the
  scrubber is a full-width slider.

## Done when

1. `/incidents` and `/incidents/<slug>` render for a signed-out visitor.
2. Every interactive control, used signed out, opens the sign-in dialog, and completing
   sign-in or registration returns to the same case and step.
3. The first case is complete, each claim traceable to the source docs.
4. A signed-in reader earns XP as decided, once per item (a DB read shows no duplicate
   award after replaying), and sees badges, a streak and a readiness score per topic.
5. The website links to Incidents (navbar, footer, a landing tile).
6. At 375px and at 1440px, no horizontal scroll and no layout shift while answering or
   playing the simulator; with reduced motion, every step still reads.

## Runs and the run report (Niraj, 2026-09-27)

A reader who agrees at the start gets a **recorded run**: everything they do in the case,
tied together and turned into a one-page review when they finish.

**Decisions**

- **Consent at the start, optional.** A "Start this case" screen says what is kept (check
  answers, questions to the lead and its answers, talk transcripts) and why (your report).
  "Start and build my report" opens a recorded run. "Just read, no report" keeps reading
  and practice, stores nothing, and keeps the mic off. The choice can be changed from the
  header ("Start recording") at any time. Signed out, the start screen offers sign-in.
- **The report is made after the final talk**, by a worker job (Durable Object, gpt-4o
  through a `@repo/ai` task line). Retakes allowed: "Start a new run" begins a fresh
  attempt; every past report stays listed, so progress over time shows.
- **Private, with a share link.** Only the reader sees it until they turn a link on; the
  link is a public, read-only page and can be turned off. Recruiter access later, opt-in
  only (not in this module).
- **Free, capped:** at most 2 reports a day per reader.
- **Rubric bands, no single score.** Four skills, each Strong / Solid / Developing / Not
  shown yet with one line of evidence: Diagnosis, Reasoning under uncertainty, Questions
  asked, Explaining the fix.
- **Sections:** the four bands; Highlights (2 to 4 quoted moments, each with why);
  Questions they asked (each marked sharp / clarifying / off track, the best one called
  out); Checks and final quiz (first-try accuracy per chapter, ideas missed, linked back);
  Next steps (2 or 3, linked to the case's Pathfinder topics).
- **The lead's answers to "Ask" are kept with the question.**

**Done when**

7. A reader who agrees at the start, answers checks, asks the lead, does the talks and
   the closing talk, sees a report page within about a minute of finishing, and every
   quote on it can be found in what they actually said or asked (a query shows the
   source row).
8. A reader who chose "Just read" leaves no run rows, no transcripts and no ask rows.
9. A second run makes a second report; the first is unchanged and both are listed.
10. The share link opens signed out; turned off, it returns not found.

## The lead in the rail (Niraj, 2026-09-27)

**Decisions**

- **The incident lead lives in the right rail on a case, open by default.** It has a tab
  switch, Lead | ShipItHQ AI. It can be closed. Other pages keep the normal AI rail, closed.
  The narrator and its controls move out of the chapter into the rail.
- **Ask by typing or voice; one thread per case.** The lead answers in text and speaks it,
  in a scrolling thread. It is the run's ask events, so it is kept and goes into the report.
  Answers may run longer than a one-liner when the question needs it.
- **Follow along, paragraph to visual part.** Each narrated paragraph names the part of a
  visual it is about (a flow box, a table row, a note). While it is read, that part lights,
  the rest of that visual dims, and the page scrolls to it.
- **Terms.** Glossary terms are underlined where they appear. Clicking one makes the lead
  explain it properly (spoken, 4 to 6 sentences, with an example from this case) in the
  thread, with "Learn it properly" underneath. That opens the matching Pathfinder topic in
  a NEW TAB (the reader is mid-chapter): their adopted path's topic, or the path preview.
- **Content rewrite:** written for the ear (short spoken sentences, one idea per paragraph,
  each tied to one visual part), each chapter opening on a hook the reader can guess at
  before the reveal, and diagrams that build as the lead speaks. Nine chapters stay.

**Done when**

11. On a case, the rail opens on the lead; the chapter body has no narrator bar.
12. While paragraph N is read, exactly its visual part is lit, and the page follows it.
13. A typed and a spoken question both appear in the thread with a spoken answer, and are
    still there after a reload (in a run).
14. Clicking "wall-clock time" gets a spoken explanation in the thread and a link that opens
    Pathfinder in a new tab.

## Case 2 and the shared simulator (Niraj, 2026-09-28)

**Decisions**

- **Case 2: "The login that said yes to guessing"** (Security, also Auth and sessions), from a
  reel Niraj described: rate limiting a login, from a per-email counter to combined signals.
  9 chapters, about 25 minutes, the same player as case 1. General on any stack, with
  one Cloudflare chapter (Durable Object per key, the rate limiting binding). No code.
  Outline for review: `case-login.md`.
- **URLs stay** `/incidents/<slug>`, with the topic as `?topic=` on the index. A readable
  slug, not a database id: stable, shareable and indexable.
- **The case sidebar is an accordion:** one row per chapter (number, title, done count),
  only the current chapter open with its steps, act names as quiet labels.
- **One simulator engine, driven by data.** A scenario declares controls, actors, rules
  (declarative, never code) and a view: `lanes` (a timeline, like case 1) or `traffic`
  (requests through rules, like case 2). This round builds the engine, both views, the
  login scenario, and moves case 1's simulator onto it.
- **AI drafts scenarios at authoring time, never live per reader.** Next round: an
  authoring page in apps/admin where the AI drafts a scenario from a case outline, a
  schema check rejects malformed ones, and a person plays, adjusts and approves it
  before it is saved with the case.

**Done when**

15. The login case plays end to end like case 1: chapters, checks, talks, the lead, the
    final quiz and the report.
16. The attack simulator shows, for each attack and defence, what got through, what was
    blocked, and which real users were locked out, from a scenario file, not
    hand-written code.
17. Case 1's simulator runs on the same engine and still shows what it shows today.
18. The case sidebar shows one row per chapter, with only the current one open.

## The visual kit: incidents at the systems level (Niraj, 2026-09-30)

Asked for: make the cases more technical without making them about code. Show how the system
is built, how requests and responses move, how the incident unfolded in time, what on-call
saw, why it happened, how the fix changed the system, and the human side of running an
incident. All four idea groups were picked.

**Decisions**

- **One diagram kit, in the flowchart's style.** Hand-built SVG, monochrome with emerald and
  rose, drawn from data in the case file, building and lighting in step with the narration
  (a `say` block's `focus` can name any part of any diagram). Not Mermaid: it can't follow the
  narration or match the product. A small in-house layered layout places nodes so authors
  don't hand-set every box; hand positions still override.
- **The system map is pinned above every chapter**: a compact strip at the top of the middle
  pane, expandable to full size, showing the case's services (client, edge, compute, store,
  queue, external API, AI) and their links, with the chapter's parts lit, the broken part
  marked during the incident and the blast radius shaded.
- **Sequence diagrams** show request and response cycles as lanes and arrows with times, a
  cut line where something stops (the 30 s limit), and a normal / failing toggle.
- **The incident's own clock**: a timeline of what happened when (deploy, first report,
  alert, escalation, wrong guess, mitigation, fix, postmortem) with time to detect, to
  mitigate and to resolve.
- **Dashboard replay**: the charts on-call saw (error rate, p95, 5xx, queue depth), written
  per case as a few points per minute shaped from the cited sources, scrubbing with the
  timeline. Never presented as the company's real data.
- **Causal chain and state diagrams**: from the user's symptom back to the trigger, the
  contributing factors and the latent weakness; a state diagram where a record's states
  explain the failure (case 1's "generating" forever).
- **The fix as a before and after** of the system map: what was added, removed or changed,
  and what each change costs.
- **Checks on the diagrams**: click where it broke, put the messages in order, mark every
  part that loses data. They count like the other checks (XP once per item).
- **The human side**: severity, who does what (incident lead, comms, scribe), status-page
  updates as posted, a runbook excerpt, and a postmortem the student writes from a template,
  then compared with the real one by a checklist (no AI call).
- **Order**: the kit first, then case 1 complete, then case 2, then the diagram checks and
  the human side across both.
- **The human side is framed as "How to run this one"** (Niraj, 2026-09-30): how a team
  should run this incident, from standard practice (Google's SRE book, "Managing
  Incidents", cited as a source), never presented as what happened.
- **Writing the postmortem earns 30 XP, once** (the same as `INCIDENT_XP.report`), when all
  five sections are filled in. The step sits after "Spot the failure", before the closing
  talk.
- **Authoring**: a check script validates every diagram's references; INC-60's AI drafting
  will draft diagrams too, reviewed like scenarios.

**Done when**

19. Every chapter of both cases shows the pinned system map with its parts lit, and the
    narration lights parts of any diagram on the page.
20. Each case has at least one request/response sequence with timings and a failing path.
21. Each case has its incident timeline with time to detect, mitigate and resolve, and a
    dashboard replay that scrubs with it.
22. Each case has a causal chain; case 1 has its state diagram; each fix is shown as a
    before and after of the map.
23. Each case has at least two diagram checks, scored like the other checks.
24. Each case has a human-side chapter and a postmortem step with the comparison checklist,
    saved with the run.
25. Every diagram works at 375px and 1440px, with reduced motion, in both themes, and
    `pnpm script check-incident-diagrams` passes.
