# Long-running work on Vercel - overview

**Prefix:** LJV. **Owner:** Niraj. **Planned:** 2026-10-01.

## What this is

One subject taught four ways, all pointing at each other: how to run work that takes longer
than a request on Vercel, and why the obvious fixes fail.

1. **An incident case**, "The export that finished after it failed": the Vercel twin of case 1
   ("The demo that died at 30 seconds", Cloudflare). A composite story in three wrong fixes and
   one right one: awaiting inline (504 at the limit), raising `maxDuration` (works until the
   biggest customer), moving it into `after()` (instant reply, same clock, now silent), then
   Vercel Workflow. Full visual kit, checks, simulator, postmortem, the how-to-run-it chapter.
2. **A Pathfinder path**, "Long-running work on Vercel": seven days, five of concepts and two of
   building, with the reference code readable in a code viewer on the days that need it.
3. **An official project**, "Long jobs on Vercel": the same app built with sprints and tasks in
   Projects, for learners who want to build it on their own with criteria to meet.
4. **A predefined mock interview**, "Background jobs on Vercel", usable from the Mocks page and
   from the path's Verify stage.

Under all four sits one small open-source app (`long-jobs-on-vercel`): one slow function (a
"weekly report" of 10 simulated steps), run two ways side by side. The inline route dies; the
Workflow route finishes. Niraj builds the real repo locally (LJV-16); everything ShipItHQ shows
is written now from the reference code in this plan.

## Definition of done

1. `/incidents` lists "The export that finished after it failed" under Serverless and edge, and
   under Queues and background jobs. Opening it plays every chapter with narration, the pinned
   system map, and every diagram drawn from the visual kit.
2. Every number in the case is either cited to a source in the case's `sources`, or marked as
   the story's own (example). Nothing claims a platform behaviour the sources do not state.
3. `npx tsx scripts/check-incident-diagrams.ts` and `check-incident-sims.ts` pass with the new
   case included, and `--planted` still fails.
4. The case's fix chapter shows the real code of both versions in the code viewer, with a
   Compare view that shows exactly what Workflow added.
5. The case ends with a "Build it" card linking the path and the project, and both links resolve
   for a signed-in learner.
6. "Adopt this path" on the case copies a 7-day path whose topic titles match the case's
   `learn` list. Days 6 and 7 each show the reference code for that day in the code viewer.
7. The code shown anywhere is read from the database (`code_sample`, `code_sample_file`),
   seeded by `pnpm script code-samples` (preview, then `--apply`). Re-running it with
   `--from <dir>` replaces the snapshot from Niraj's real repo, and the preview lists every
   file that would change.
8. Projects lists "Long jobs on Vercel" as an official project with a setup sprint and four
   sprints of tasks, each task with falsifiable criteria. Enrolling works like the other ten.
9. The Mocks page lists "Background jobs on Vercel" as a ShipItHQ mock, with a knowledge base
   drawn from the same sources, seeded by a preview-first script.
10. The code viewer works at phone width (the file tree becomes a picker), in light and dark
    themes, and loads with a skeleton shaped like itself.
11. Everything new passes `tsc --noEmit` in apps/main (and packages/db for the schema and
    scripts). No em or en dashes anywhere in it.

## Out of scope

- The real `long-jobs-on-vercel` repo, its deployment and its rate limit: Niraj builds it with
  help (LJV-16, LJV-17). Until then the live demo link is absent, not broken.
- Turning the projects workspace editor back on (`WORKSPACE_EDITOR` stays false).
- Running code in the browser. The viewer is read-only.
- Cloudflare Workflows as a subject. It gets one compare block in the fix chapter and a link to
  case 1, nothing more.
- Proof that a learner deployed it (URL check). Learners who want proof take the project, whose
  tasks have criteria.

## Decisions (Niraj, 2026-10-01, unless noted)

- **Story:** three wrong fixes and one right one; a composite, labelled as one, cited to Vercel
  and Next.js docs. Act 3's failure is the `maxDuration` clock and the missing record, not a
  deploy (the docs do not say a deploy stops `after()` work; corrected while planning).
- **Title:** "The export that finished after it failed". Topic `serverless`, also in `queues`.
- **The function:** simulated work with a real shape: a weekly report of 10 steps of about 15 s
  (about 2.5 min). No API keys, no cost, the same every run.
- **Budget:** the whole demo stays far inside Hobby's 300 s. The inline route sets
  `maxDuration = 60`, so it dies at 60 s; the page and the path say the 60 stands in for 300.
  Every Workflow step is about 15 s.
- **Two versions:** one app, two routes, one page with two Run buttons. The code viewer shows
  the app at two stages (`inline`: end of day 6; `workflow`: end of day 7); Compare diffs them.
- **Code home:** a public repo on Niraj's personal account (MIT, no ShipItHQ branding on the
  demo) is the deployable thing; ShipItHQ keeps a snapshot in its database. Until the repo
  exists, the snapshot is the reference code in `samples/long-jobs-on-vercel/`.
- **Demo guard (for LJV-17):** one run per visitor every 5 minutes, at most 3 runs at once.
  Hobby includes 50,000 Workflow events a month; a run is about 40, so about 1,200 runs.
- **Cloudflare:** one compare block (Niraj's mapping table) and a link to case 1.
- **Path:** 7 days, build on days 6 and 7.
- **Project:** an 11th official project, at Niraj's request. This widens the "keep the 10"
  decision of 2026-09-23 by one.
- **Mock:** the case's inline closing talk, plus a predefined mockvoice scenario (the first
  predefined mock with a seed script).
- **XP:** the case uses `INCIDENT_XP` unchanged.

## Sources (checked 2026-10-01)

- Vercel, Configuring maximum duration: https://vercel.com/docs/functions/configuring-functions/duration
  (Hobby 300 s default and max; Pro and Enterprise 300 s default, 800 s max, 1800 s beta.)
- Vercel, Functions limitations: https://vercel.com/docs/functions/limitations
  (over the limit: `504 FUNCTION_INVOCATION_TIMEOUT`; the limit covers the whole lifecycle,
  streaming included.)
- Next.js, `after`: https://nextjs.org/docs/app/api-reference/functions/after
  (runs for the route's default or configured max duration.)
- Vercel, Workflows: https://vercel.com/docs/workflows (resumable, durable across deploys and
  crashes, observability tab.)
- Vercel, Workflow concepts: https://vercel.com/docs/workflows/concepts (each step its own
  route; event log and replay; sleep; hooks; skew protection and cancelling after a rollback.)
- Vercel, Workflow pricing and limits: https://vercel.com/docs/workflows/pricing (step runtime
  bounded by function limits; no run duration limit; 240 s replay; 2,000-event guidance;
  Hobby 50,000 events.)
- Workflow SDK, Errors and retrying: https://workflow-sdk.dev/docs/foundations/errors-and-retries
  (3 retries by default; FatalError, RetryableError; a retried step restarts from the top;
  idempotent side effects.)
- Vercel KB, Background jobs in Next.js: https://vercel.com/kb/guide/how-to-run-background-jobs-in-nextjs-on-vercel
- Google SRE book (the how-to-run-it chapter), as in cases 1 and 2.
