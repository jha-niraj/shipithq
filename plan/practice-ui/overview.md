# Practice UI and backdrop - overview

## What this is

A cleanup of how the signed-in app looks and how practice is navigated, asked
for by Niraj on 2026-09-22: the practice area had a second sidebar holding a
tree of every module's categories, the sidebar shrank on short pages, the
problem workspace ignored the theme, and the app sat on a photograph that
made the whole product read busier than it is.

## Definition of done

1. The signed-in app sits on a plain background by theme: near-white in
   light, near-black in dark. No photograph behind any page. The page surface
   is solid, so a heading never sits on an image.
2. The auth pages carry the misty forest photograph (Unsplash `oYEGPZebzGw`)
   in their brand panel, at full strength with no layer over it, stored in
   the repo as an optimized WebP. Text on it stays legible because it sits on
   its own surface, measured.
3. Practice has no second sidebar. A small tab row under the practice header
   links Overview, DSA, System Design, Frontend, Backend and Mentor memory.
   The row is absent on a problem page (the workspace).
4. Categories are chips inside each module page, not a sidebar tree.
5. The four module pages share one layout: header with count, the onboarding
   widget, category chips, a problem list whose rows show status, difficulty
   and a clear action. The memory page uses the same header.
6. The problem workspace follows the theme: light surfaces in light mode,
   dark in dark, the editor theme matching, every text clearing AA on the
   surface it lands on.
7. Every changed route keeps a `loading.tsx` that matches it; `apps/main`
   typechecks and `pnpm check-nav` passes.

## Out of scope

- The final visual style of the tab row: Niraj is sending a reference from
  another codebase; the row is built to be restyled from one component.
- Other modules' layouts (projects, mock, pathfinder).

## Decisions

**Plain backdrop in the app, photo on auth only.** (Niraj, 2026-09-22, after
the trade-off was laid out.) A mid-tone photograph with no layer cannot carry
both near-black and white type, and content lives in cards, so a photo in the
app mostly adds noise and weight. On the auth panel it can be large and
decorative, with the form on its own surface.

**Tabs, not a second sidebar, and none on the problem page.** (Niraj,
2026-09-22.) The workspace needs every pixel and no distraction.

**The workspace follows the theme.** (Niraj, 2026-09-22.) It was the only
surface in the product hardcoded dark.
