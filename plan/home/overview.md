# Home - overview

## What this module is

`/home`, the first page after sign-in. It answers "what should I do next?" first
and "how am I doing?" second.

## Definition of done

1. **It paints once.** The skeleton is shaped like the page and the content replaces
   it in place: no snap, no blank frame between skeleton and content. Server-rendered
   content is visible before hydration; nothing starts at `opacity: 0` waiting for JS.
2. **Action-first** (Niraj, 2026-09-25): a header with the greeting and two quick
   actions; the headline `StatBand`; a "Pick up where you left off" card naming the
   one thing in progress with one button; four compact module cards in a 2x2 grid
   (Momentum, Projects, Career goals, Interview practice), each a number, a line of
   context and a small trend line, linking to its module; then the activity calendar.
3. **Honest when empty.** A new user sees a start card ("Start your first project"),
   not a resume button for nothing; zero trends draw flat, not as an error.
4. **Responsive**: 2x2 becomes one column below `md`; no horizontal page scroll at
   390px.

5. **Every module has a section** (Niraj, 2026-09-28), below the activity graph, in this
   order: Projects, Practice, Mock interviews, Pathfinder (with its notes), Incidents,
   Jobs and rounds, AI tools, KnowMe, Ideas. Each is full width: a header with the
   module's numbers and an "Open <module>" button, a line chart on the left, the
   latest items on the right (each a link to that item), and "See all" to the module's
   own list. Nothing already on the page is removed.
6. **Line charts** use the shared `LineChart` (packages/ui/src/components/charts,
   plan/ui-pass UI-19): one headline "XP over time" chart with the previous period as a
   lighter line, and one chart per module (table in `tasks.md` HOME-7). A range switch
   (30 days, 90 days, 1 year; default 90) sets every chart; it lives in the URL
   (`?range=`), so it survives a reload and a shared link.
7. **Honest per section.** A module the user has not touched shows a flat chart and one
   line saying how to start, with the Open button; never an error or an empty box.
8. **It stays fast.** Each section streams in its own `Suspense` with a skeleton shaped
   like it; one slow module never holds up the page. Every link on Home resolves (no
   `/studio/...` 404s: study spaces open through their Pathfinder goal).
9. **The AI panel opens by default on desktop** unless the person closed it themselves;
   code that closes it for them (signed out, leaving an incident case) is not remembered
   as their choice.

## Decisions

- **Entrance motion is CSS, not framer `initial`.** A server-rendered element with an
  inline `opacity: 0` is invisible until hydration finishes; on a heavy page that was
  a full second of blank screen (Niraj, 2026-09-25). A CSS keyframe plays on first
  paint without JS, and `motion-reduce` turns it off.
- The stat band and the activity calendar stay (both were right).
- **Sections, layout and charts** (Niraj, 2026-09-28): all nine modules; chart plus list,
  full width; one chart per module, the XP headline chart and the range switch.
- The activity graph, its day sheet and the streak read the ledger in `plan/progress`.
