# StatBand - one way to show headline numbers

Asked for by Niraj on 2026-09-22: copy gurukulhq's `StatBand` into `packages/ui`, move
every stat display in the codebase onto it, and use it from now on.

Source: `gurukulhq/packages/ui/src/components/ui/stat-band.tsx` and `STAT-BAND.md`.
The ShipItHQ copies live beside our other primitives:
`packages/ui/src/components/ui/stat-band.tsx` and `STAT-BAND.md`.

## When it is done

- `StatBand` and `StatBandSkeleton` exist in `packages/ui`, identical in behaviour to
  gurukul's apart from the palette changes below.
- Every headline-number display in `apps/main`, `apps/admin`, `apps/uni` and `apps/hiring`
  renders through `StatBand`. No local `StatCard`, `StatTile`, `Stat`, `MiniStat` or similar
  component is left.
- Every screen that got a band has a loading state or `loading.tsx` whose stat row is a
  `StatBandSkeleton` with the same `count`, `cols` and `size`.
- Values keep their exact existing formatting. No number changes.
- `CLAUDE.md` says headline numbers use `StatBand`.
- Anything deliberately left alone is listed in `tasks.md` with the reason.

## ShipItHQ differences from gurukul (decisions)

| | gurukul | ShipItHQ | Why |
|---|---|---|---|
| Tones | neutral, emerald, teal, lime, amber, orange, rose, gold | neutral, emerald, rose | CLAUDE.md: monochrome palette, no orange or yellow; gold is gurukul's brand. Teal and lime were only shades of "good" |
| `ScrollArea` | has `orientation="horizontal"` | same prop added to ours | the band scrolls sideways on phones only |
| `Skeleton` | takes `delay` | same prop added to ours | staggered shimmer across cells |

Mapping when migrating: a green "good" value is `emerald`, a red "bad" value is `rose`,
an amber or orange warning value becomes `neutral` (the number and its hint carry it).

## Not in scope

- `apps/web` (marketing pages are allowed display typography).
- Legal and contact pages, pickers, quick-link tiles, hero result displays, text-fact
  lists - the categories STAT-BAND.md section 5 says to leave.
