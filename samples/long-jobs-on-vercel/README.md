# long-jobs-on-vercel (reference snapshot)

The reference code for ShipItHQ's "Long-running work on Vercel": the incident "The export
that finished after it failed", the Pathfinder path and the project "Long jobs on Vercel".
One slow function (a weekly report, 10 steps of 15 seconds) run two ways.

- `inline/` - the app at the end of build day 6: one route awaits every step and is
  stopped at 60 seconds (`maxDuration = 60`, standing in for Hobby's 300).
- `workflow/` - the app at the end of build day 7: the same steps as a Vercel Workflow,
  each step its own function, with status and progress the page can come back to.

Checked against `workflow@4.8.10` and `next@16.3.8` (tsc clean, 2026-10-01). Not a
workspace package: nothing in the monorepo builds or typechecks it. ShipItHQ reads it into
the database with `pnpm script code-samples` (from packages/db); when the real repo exists,
`pnpm script code-samples --from <repo>` replaces it.

To run either stage: `npm install`, then `npm run dev`. `next dev` does not enforce
`maxDuration`; deploy to Vercel to see the inline route's 504.
