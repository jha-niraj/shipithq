# UI pass (apps/main) - overview

## What this module is

One pass over `apps/main` for the things that make the product look like it was
built by several people: tab strips drawn six different ways, two page-padding
conventions, five heading scales, `gray` beside `neutral`, and stat rows that
are not `StatBand`.

It is NOT a redesign. Nothing here changes what a page does or what it says.
Every task replaces a hand-rolled thing with the shared thing that already
exists, or deletes a style that contradicts a rule already written down in
CLAUDE.md.

## The standard, which is not new

- **Tabs** come from `@repo/ui/components/ui/tabs` and are configured by PROPS:
  `variant` (`card` | `segmented`), `size` (`sm` | `default` | `lg`) and `fit`.
  Height lives on the trigger, so `h-9` on a `TabsList` does nothing. The
  active chip is an animated `layoutId` shared across triggers, so any
  `data-[state=active]:bg-*` on a trigger double-draws it. `TabsNav` is the
  link version, for tabs that are really routes.
- **Page padding** is `px-page`. Not `px-4`, not `px-6`, and the page supplies
  no `py-10` of its own.
- **Vertical rhythm** is ONE `space-y-*` on the page column, not `mb-*` on each
  child.
- **The page title** is `PageHeader` from `@repo/ui`, `text-xl`, with `tabs` and
  `actions` slots on the right.
- **Colour** is `neutral`, never `gray`, and never a hue used decoratively.
- **Stat rows** are `StatBand` with `StatBandSkeleton` in the loading state.
- **Loading** is `ShipItHQLoader` / `InlineLoader` / a skeleton that matches.

## What done looks like

Every tab strip in `apps/main` is the shared component configured by props;
every page column has one padding and one rhythm; no `gray`, no decorative
hue, no hand-rolled stat grid; and the audit that produced these tasks, re-run,
finds nothing.

## Where the list came from

A read of `apps/main` on 2026-09-23, after Niraj asked for "the full pass of
the main app for the ui/layout related things like tabs and all the things".
The findings are in the tasks below, each with its file and line.
