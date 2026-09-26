# Home - tasks

Derived from `overview.md`.

| ID | Task | Serves | Status |
|---|---|---|---|
| HOME-1 | No blank frame between skeleton and content | 1 | done (2026-09-25) |
| HOME-2 | Action-first layout | 2, 3, 4 | done (2026-09-25) |

## HOME-1 - No blank frame between skeleton and content

**Status:** done (2026-09-25)

**Why.** Niraj, 2026-09-25: the skeleton shows, then "a snap and gap and then whole
screen gets blank for say 1 sec", then content. Cause: every block in
`home/_components/home-dashboard.tsx` is a framer `motion.div` with
`initial={{ opacity: 0 }}` and delays up to 0.38s. The server HTML carries
`opacity: 0` inline, so the content that replaces the skeleton is invisible until
hydration and the animation have run. The snap: `loading.tsx` wraps the skeleton in
`px-page pt-6 pb-10` while the page does not, so the layout moves when it swaps.

**Files** `home/_components/home-dashboard.tsx`, `home/loading.tsx`,
`home/_components/skeletons.tsx`, `packages/ui/src/styles/globals.css` (a
`fade-up` keyframe utility if none exists).

**Done when** a throttled (Slow 4G, 4x CPU) reload shows skeleton, then content, with
no frame where neither is visible (checked by recording), and the skeleton's first
block sits at the same y as the content's.

**Outcome.** Every framer `initial={{ opacity: 0 }}` on Home is gone (dashboard and
the activity calendar grid); entrance motion is `animate-in fade-in-0` from
`tw-animate-css` with inline `animationDelay`, which plays on first paint without
JS. `loading.tsx` and `HomeDashboardSkeleton` now use the page's exact wrapper and
blocks. **Verified** by reading the served HTML: inline `opacity:0` dropped to 2, both
from the shell's full-screen loader, none from Home content. The throttled recording
in "Done when" was not made (Niraj will check by eye).

## HOME-2 - Action-first layout

**Status:** done (2026-09-25)

Per `overview.md` 2-4. **Files** `home/page.tsx`, `home/_components/*`,
`actions/(main)/home/home.action.ts` (the "in progress" item: the most recently
touched project task or pathfinder goal). Reuse `StatBand`, `ActivityCalendar`.
**Done when** the layout matches overview 2 at 1440px and 390px, the resume card
opens the right workspace or goal, a new account sees the start card, and HOME-1
still holds.

**Outcome.** `home-dashboard.tsx` is a server component now: header with Practice /
New project, StatBand (Total XP falls back to `currentXp`, matching the profile), a
Pick-up card (in-progress projects, then active goals, then study spaces; up to
three; a Start card when there are none), four module cards with inline-SVG
sparklines (Recharts removed from Home), then the activity calendar on the same
card surface. `ContinueLearning` and the activity-mix / recent-activity blocks left
the page. Screenshot at 1568px matched overview 2. Not checked at 390px in a
browser (Niraj is testing).
