# Practice UI and backdrop - tasks

## UI-1 Plain app backdrop, forest photo on auth
- [x] Status: done (2026-09-22). The shell is `bg-neutral-50 dark:bg-black` with no photo; the auth panel shows `auth-forest.webp` (176 KB) at full strength with a white photo credit, and a banner crop above the form below `lg`. Measured on the shipped pixels: the top 41% of the panel holds neutral-700 at >= 4.5:1 and neutral-900 at >= 13.6:1 at every panel size from 512x640 to 640x1036, the forest foot holds white at >= 14.5:1; the middle band fails both inks, so the quote, the illustration and the footer text were removed and the copy is sized to end inside the band on a 640px panel. `/signin` renders (200) with the new image and credit.
**Why.** Items 1 and 2. **Files.** `apps/main/components/common/app-backdrop.tsx`, `app/(main)/layout.tsx`, `app/(auth)/_components/auth-backdrop.tsx`, `auth-shell.tsx`, `public/backdrop/auth.webp`.
**Edge cases.** Auth text over the photo must be measured on the real pixels; the page surface must stay solid in both themes; `--page-h` math untouched.
**Done when.** No `backdrop/light.webp` or `dark.webp` reference remains in the app shell; the auth panel shows the new file; contrast of every auth-panel text measured and recorded here.

## UI-2 Practice tabs replace the practice sidebar
- [ ] Status: built (2026-09-22), typechecks; the tab row's final style waits for Niraj's reference. Not rendered in a browser.
**Why.** Items 3 and 4, and the sidebar that shrank on `/practice/memory`. **Files.** `practice/_components/practice-layout-wrapper.tsx`, new `practice-tabs.tsx`, `practice-sidebar.tsx` (deletion proposed here, see below).
**Edge cases.** Workspace routes (three path segments) get no tabs; `?topic=` still selects a category; active tab for nested routes.
**Done when.** No inner sidebar renders on any practice route; tabs absent on `/practice/dsa/two-sum`; `check-nav` passes.
**Deletion proposed:** `practice-sidebar.tsx` has no other importer once tabs land. Niraj decides.

## UI-3 Module pages and memory page share one layout
- [ ] Status: built (2026-09-22), typechecks; the four module loading screens use the matching `ModuleContentSkeleton`. Also removed: "2x XP" and "Higher XP rewards" from the mode dialog (XP does not depend on mode), the leaderboard avatar's unpositioned `fill` image. Not rendered in a browser.
**Done when.** The four module pages and `/practice/memory` render the same header block; problem rows show status, difficulty and Start or Continue; skeletons match.

## UI-4 Workspace follows the theme
- [ ] Status: built (2026-09-22), typechecks. Every dark-only class in the workspace files paired with its light value, then the unsafe results fixed by hand (user bubble, chat input, primary buttons, difficulty colours that were invisible before, `prose-invert` now `dark:` only); Monaco and the canvas follow `resolvedTheme`, so "system" works. Contrast of the new light pairs measured, all >= 4.5:1 after moving failing-output ink to red-700 (5.91:1). Not rendered in a browser.
**Done when.** No hardcoded `bg-neutral-950`/`text-white` surface remains in the workspace components; Monaco uses the matching theme; contrast measured in both themes.

## Proposed deletions (waiting on Niraj)

No longer imported anywhere after this work:
- `apps/main/app/(main)/practice/_components/practice-sidebar.tsx` - DELETED 2026-09-22 (approved)
- `apps/main/components/common/app-backdrop.tsx`
- `apps/main/public/backdrop/light.webp`, `dark.webp`, `dark-sharp.webp`
- `packages/ui/src/components/auth-visual.tsx` and the `variant` and `quote`
  fields of `app/(auth)/_components/auth-copy.tsx` (the panel no longer shows
  the illustration or the quote)

Also fixed on the way, not part of the plan: two client components imported a
value from the `@repo/db` root, which put the database client in the browser
bundle and raised "No database connection string was provided to neon()".
They now import from `@repo/db/onboarding` and `@repo/db/practice`, and the
client throws a plain explanation if it is ever evaluated in a browser again.

## UI-5 Form controls and tabs from gurukulhq
- [ ] Status: built (2026-09-22). All apps typecheck (main, web, uni, hiring, admin, ui); `/signin` renders with no error. Not checked by eye in a browser.

**What was taken, per component** (gurukul's `gray-*` mapped to `neutral-*` everywhere):
- `lib/motion.ts`: copied. The shared enter and exit motion for popper surfaces and modals.
- `input`, `checkbox`, `radio-group`, `select`, `dropdown-menu`, `tabs`: gurukul's versions. Keyboard-only focus rings with no white ring offset, the check and radio spring, select `size` and `emptyMessage`, menus that animate out as well as in and sit above dialogs, tabs with `size`, `fit` and a `segmented` variant and a highlight that slides via framer-motion (no pixel measuring).
- `textarea`: ShipItHQ's kept (auto-grow inside the app's scroll area; ~69 call sites rely on `className` sizing the box) with gurukul's focus fix. The old `ring-offset-2` painted a white band around every focused textarea, glaring in dark mode.
- `popover`: gurukul's motion, origin and radius, ShipItHQ's `portal={false}` kept (two popovers inside dialogs need it for wheel scrolling).
- `button`: gurukul's base (`cursor-pointer`, `rounded-xl`), ShipItHQ's variants kept.
- `dialog`: gains gurukul's `hideClose`; ShipItHQ's `scroll` kept.
- New in ShipItHQ: `TabsNav`, route tabs drawn with exactly the same classes as the Radix tabs (shared helpers), made of links.

**Fixed while copying:** gurukul's input and textarea placeholders were neutral-400 light (about 2.5:1) and neutral-500 dark (about 3.8:1); now neutral-500 and neutral-400 (4.74:1 and 7.1:1). Tab focus rings lost their offset for the same white-band reason.

**Used in:** practice tabs (`TabsNav`), the module page search (`Input`) and difficulty switch (segmented `Tabs`), the test case switcher in the workspace (segmented `Tabs` with pass and fail icons), both onboarding open-answer fields (`Textarea`).

**Visible elsewhere:** every `Select` trigger is 36px tall now instead of 44px, and buttons are rounder, across the app.

## UI-6 Sidebar from gurukulhq, flush shell, narrower AI rail
- [ ] Status: built (2026-09-22). `apps/main` typechecks and `check-nav` passes. Not checked by eye in a browser.

**Why:** Niraj asked for the sidebar to match gurukulhq's `apps/main/components/navigation` exactly, with no collapsed state. He also asked for the rounded borders and padding to go from the sidebar and the AI panel, and for a narrower default AI panel.

**Files:**
- New: `apps/main/components/navigation/{sidebar,notifications-panel,customize-sidebar-sheet}.tsx`, `packages/ui/src/components/ui/{nav-command-palette,notifications-panel}.tsx`.
- Changed: `apps/main/lib/navigation.ts` (flatten, locked paths, primary cap, presets), `components/common/sidebarprovider.tsx` (mobile open state only), `components/common/mainsidebar.tsx` (re-exports the new sidebar), `app/(main)/layout.tsx`, `app/(jobs)/layout.tsx`, `app/store/aiPanelStore.ts`, `pathfinder/explore/_components/goal-preview-content.tsx`.

**What it is:** a fixed, always-expanded `w-60` sidebar. It holds the brand, a search button with a Cmd+K palette, pinned rows with expanding modules, sidebar and bottom-bar customization stored in localStorage, credits, the AI toggle, the theme toggle, notifications and the user block. Below `lg` it becomes a bottom bar plus a Sheet. The page and AI rail sit edge to edge with borders, no gutters or rounded cards. The AI rail's default width is 380px instead of 460px, and a stored 460 migrates to 380 once.

**Edge cases:** the jobs shell passes its own `primary` nav and cannot be customized. A pin to a path that no longer exists is dropped. `/home` is always pinned.

**Done when:** at `lg+` the sidebar is 240px wide with no collapse control, the page starts exactly at its right border, the AI rail opens at 380px with only a left border, and the mobile bottom bar opens the Sheet.

**Proposed deletions (waiting on Niraj):** the old `AppSidebar` code that `mainsidebar.tsx` used to hold, plus anything only it imported.

## UI-7 Pin or unpin the sidebar, peek from the left edge
- [ ] Status: built (2026-09-22). `apps/main` typechecks and `check-nav` passes. Not checked by eye in a browser: the Chrome extension was not connected, and signed-out requests redirect before the shell renders.

**Why:** Niraj asked where the button to close the sidebar is, and for the closed sidebar to float open when the pointer reaches the left edge. gurukulhq has exactly this, and UI-6 left it out: UI-6 read "no collapsed state" as "no close button", but gurukul removed only the icon rail and kept pin and peek.

**Files:**
- New: `apps/main/components/navigation/sidebar-pin-cookie.ts`, `apps/main/components/navigation/sidebar-hot-edge.tsx`, `apps/main/lib/motion.ts`, `apps/main/app/(main)/_components/main-shell.tsx`, `apps/main/app/(jobs)/_components/jobs-shell.tsx`.
- Changed: `apps/main/components/common/sidebarprovider.tsx`, `apps/main/components/navigation/sidebar.tsx`, `apps/main/app/(main)/layout.tsx`, `apps/main/app/(jobs)/layout.tsx`.

**Steps:**
1. Port gurukul's provider: `isPinned` is the person's choice unless a docked panel is forcing the sidebar out, and only the choice is saved in a cookie. It also takes gurukul's peek state with a 180ms close grace, a 900ms lock after a click inside, and Escape to close.
2. Both layouts become server components that read the cookie and render a client shell, so the first frame is already right. The client code moves into the shell files unchanged apart from the pin wiring.
3. Add a pin/unpin button in the sidebar's header, desktop only, as in gurukul.
4. The desktop sidebar becomes a `motion.aside` that springs off-screen when unpinned and back in on peek. It floats at z-50 with a shadow when unpinned, and is `inert` and hidden from screen readers while off-screen.
5. A 12px strip at the left edge opens the peek. It exists only while unpinned and only at `lg+`.
6. The page's margin is `lg:ml-60` when pinned and `lg:ml-0` when unpinned, so a peek never reflows the page.
7. As in gurukul, the docked AI panel unpins the sidebar while it is open, without touching the saved choice.
8. Also missed in UI-6: close the mobile sheet on navigation, as gurukul does.

**Edge cases:** clicking the theme toggle inside a peeked sidebar must not close it. Tabbing into the peeked sidebar keeps it open. A pin click while the AI panel is open wins over the panel. Reduced motion moves the sidebar without a spring. Full-screen practice workspaces have no sidebar and no hot edge.

**Done when:** at `lg+` the header button unpins the sidebar and the page widens to the left edge. A reload keeps it unpinned with no flash of the pinned sidebar. Moving the pointer to the left edge floats the sidebar over the page without moving it, and moving away closes it. The same button pins it back. Opening the AI panel unpins it, and closing the panel restores the saved choice.

**Not carried over:** gurukul's guides sheet needs its `@repo/guides` package, and its "What's new" link needs a platform-updates page. ShipItHQ has neither.

## UI-8 The practice tab row
- [x] Status: done (2026-09-22). The selected chip is now lighter than the strip in dark mode (it was darker than both the strip and a hovered tab), and the row is 3rem instead of 3.5rem. Render check confirms the height; the contrast needs an eye.

**Why.** Niraj, 2026-09-22: the active tab "was showing really not visible" (the chip reads as the unselected one), and "reduce the gap between the tab and the below content".

**Files:** `packages/ui/src/components/ui/tabs.tsx` (the shared active chip), `app/(main)/practice/_components/practice-tabs.tsx`.

**Done when:** the active tab is unmistakable against both the strip and a hovered tab in light and dark, and the gap under the row is smaller.

## UI-9 The module page: heading first, and a list that scrolls on its own
- [ ] Status: built (2026-09-22). Render check 11/11: heading first, no summary card, Recommended and All both present, Recommended open when cached, All when not, the reason on the row, a dead slug dropped, the list in a scroll area and the page one screen. The no-page-scroll behaviour needs a browser.

**Why.** Niraj, 2026-09-22: "we are showing this on the top which needs to be removed ... this page should start with this data structure algorithm heading ... we need to wrap this questions list only inside the scroll area so that it doesn't really scroll the whole page itself", plus a Recommended tab beside All (PD-15).

**Files:** `app/(main)/practice/_components/{module-content,practice-module-page}.tsx`.

**Steps:** drop the summary widget from the top (it moves to the memory page, MO-11); the module name is the first thing on the page; the problems list card gets Recommended and All tabs and its own scroller sized to the page, so the page itself does not scroll; the leaderboard column keeps its place.

**Edge cases:** an empty Recommended list falls back to a line explaining why, never a blank card. The scroller is capped by the page height, so a short list does not leave a tall empty box.

**Done when:** on a 75-problem catalogue the page does not scroll, the list does, and switching Recommended and All keeps that true.

## UI-10 Mentor memory, per sub-module
- [ ] Status: built (2026-09-22). Render check: a tab per sub-module, a module without onboarding offers it, an empty memory says what fills it. Switching tabs needs a browser.

**Why.** Niraj, 2026-09-22: "in the mentor memory as well, we need to have like sections or tab base inside that. So for each sub modules we have a memory exactly like this." The page showed one module's memory with no way to reach the others.

**Files:** `app/(main)/practice/memory/{page,loading}.tsx`, `memory/_components/memory-view.tsx`, `actions/(main)/practice/memory.action.ts`.

**Steps:** a tab per practice sub-module; each tab shows that module's "Where you stand" summary (moved off the module page, MO-11) and what the mentor has recorded for it; the memory action takes a module.

**Edge cases:** a module with no memory says so plainly and says what fills it, rather than implying something is broken. A module the user has never onboarded shows the gate link instead of a summary.

**Done when:** each sub-module tab shows only its own memory and its own level, and the DSA tab still lists what it listed before.


## UI-11 Topic filter, the profile sheet, and the heading gap
- [x] Status: done (2026-09-22). Render check 15/15 (topics collapse to one control, it sits between search and difficulty, a URL topic opens selected, the profile is a sheet trigger with a count and no inline dump). `apps/main` typechecks.

**Why.** Niraj, 2026-09-22: topics should be "a dropdown ... beside the filters on the right ... so that it can be shown in one line", multi-select, with All topics clearing the rest; the memory page's "what you told us" text "looks scattered" and belongs in a sheet with badges; and there is "still so much gap between this title and this tag".

**What changed.**
- `module-content.tsx`: the wrapping field of topic chips is one dropdown of checkboxes on the filter line. Several topics can be ticked at once, All topics is the empty selection and clears the others, and the selection is filtered on the client and mirrored into `?topic=a,b` so a filtered list is still shareable. `CategoryChip` is gone.
- `onboarding-widget.tsx`: "What you told us" opens a sheet. Strengths, gaps and goals are badges; facts, which are sentences, are rows. The trigger carries the count.
- The module heading sits closer to the filter card (page gap 4 to 3, top padding 3 to 2, heading margin 1 to 0.5).
