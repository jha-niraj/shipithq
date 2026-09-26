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
