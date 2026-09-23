# StatBand - the one way a screen shows its headline numbers

> **ShipItHQ copy** (2026-09-22, plan/stat-band). Ported from gurukulhq. The one change:
> `tone` is `neutral`, `emerald` or `rose` only, because the palette is monochrome with no
> orange, yellow or gold (CLAUDE.md). When migrating, a green "good" value becomes
> `emerald`, a red "bad" value `rose`, and an amber or orange warning value `neutral` - the
> number and its hint say it. Everything else below applies as written.

Two files are all you need. Copy them into a project and hand an agent this document:

| | |
|---|---|
| **The component** | `packages/ui/src/components/ui/stat-band.tsx` |
| **This document** | `packages/ui/src/components/ui/STAT-BAND.md` |

---

## 1. What it is

One connected band: a single rounded border around every figure, hairline dividers between them,
an icon chip beside each label and value.

```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ [ic] TOTAL    │ [ic] LIVE NOW │ [ic] ATTEMPTS │ [ic] AVG      │
│      12       │      1        │      44       │      81%      │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

Not a row of cards. Six bordered cards for six numbers spend a full row of card chrome on a
glance's worth of information and read as six unrelated things. One band reads as one summary and
takes about half the height.

This is worth making a rule rather than a preference because of what it replaces. In the codebase
it came out of there were **30 different local `StatCard` components**, no two alike, and every new
page invented a 31st. They disagreed on padding, radius, label case, icon size, whether the value
sat above or below the label, and which of six greens meant "good".

## 2. Dependencies

The component is deliberately self-contained. It imports exactly four things:

| Import | What it needs to be |
|---|---|
| `ScrollArea` | any horizontal scroll container. A Radix `ScrollArea` wrapper, or swap it for a plain `div` with `overflow-x-auto`. |
| `Skeleton` | any shimmering placeholder block. Used only by `StatBandSkeleton`. |
| `cn` | the usual `clsx` + `tailwind-merge` helper. |
| `next/link` | only for cells with `href`. On a non-Next project, replace with `<a>`. |

Plus Tailwind, and an icon set whose icons take a `className` (lucide, tabler, heroicons).

There is **no `"use client"` directive**, on purpose: a React Server Component can render it and
pass an icon component reference straight in. The client boundary is `ScrollArea` inside it.

## 3. Use it

```tsx
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Users, Activity, AlertCircle } from "lucide-react"

<StatBand
    items={[
        { icon: Users, label: "Students", value: 162 },
        { icon: Activity, label: "Present", value: "89%", hint: "144 of 162" },
        { icon: AlertCircle, label: "Overdue", value: 7, tone: "rose", href: "/billing?f=overdue" },
    ]}
/>
```

### Item fields

| Field | Meaning |
|---|---|
| `icon` | **required.** Any component taking `className`. Every cell has one - pick one. |
| `label` | short, plain. Rendered uppercase; write it in sentence case. |
| `value` | **already formatted.** Do the `toLocaleString`, the currency, the `%` yourself. |
| `hint` | small text beside the value - "3 published", "of 162", "+12 this week". A node, so a delta badge works. |
| `progress` | 0-100. A thin track under the value, only for a figure that IS a proportion. |
| `tone` | tints the VALUE. `neutral` `emerald` `rose`. |
| `href` | makes the cell a link. |
| `onClick` + `active` | makes the cell a filter button. Renders `aria-pressed`. |
| `disabled` | for a button cell that cannot be pressed now. |
| `key` | only when two labels repeat. |

### Band props

| Prop | Meaning |
|---|---|
| `items` | the list above. |
| `cols` | grid columns from `sm` up, `1`-`8`. Defaults to the item count, capped at 6. |
| `size` | `md` (default) for a page-level band, `sm` inside a header row or a panel. |
| `flush` | drops the outer border and background, for a band already inside a bordered card. |
| `className` | outer spacing only - `mb-4`, `shrink-0`. Never a background or a border. |

### Its skeleton

```tsx
<StatBandSkeleton count={4} cols={4} />
```

Pass the **same** `count`, `cols` and `size` as the live band. A skeleton of a different shape does
not remove the layout jump, it just moves it.

## 4. The rules that come with it

These are not style preferences. Each one is a bug that was shipped and then fixed.

1. **The value never truncates. The label does.** Clipping a label shortens a word; clipping a
   figure changes the number. "NPR 12,345,678" clipped reads as a smaller, different amount with
   nothing on screen saying it was cut.

2. **Colour is the datum, never the surface.** The chip and the band are neutral, always. `tone`
   tints the value, and only when the number itself carries a state - overdue, failed, at risk. A
   tinted card does not say "good", it says "this screen is a different colour from every other
   screen". When migrating, the old card's `bg-emerald-100` chip is **dropped**, not translated.

3. **Phone is one scrolling row.** Below `sm` the cells keep a fixed width inside a scroll
   container. Never a 2-up grid that stacks six numbers into three rows - that is 400px of screen
   before any actual content.

4. **Dividers are a box-shadow, not a border.** The obvious implementation - a right border on
   every cell, with the row pulled 1px past a clipped frame to hide the outer ones - makes the row
   exactly 1px wider than the scroll viewport. The scroll container then sees
   `scrollWidth > clientWidth` and shows a **horizontal scrollbar under a band that fits
   perfectly**, on every desktop screen. Measured: 1055 client against 1056 scroll on a page with
   nothing to scroll to. A box-shadow takes part in no layout, so the outer hairlines are painted
   past the edge and clipped, and the scrollbar appears only when the cells genuinely do not fit.
   It also needs no per-breakpoint "is this the last column" rule and survives a partial last row.

5. **A single figure is still a band.** Use `cols={1}`. Do not invent a second number to fill the
   row - that changes what the screen reports.

6. **Format the value before you pass it.** The band will not guess at currency, precision or
   locale, and a screen that shows `0.30000000000000004` is the caller's bug.

7. **Absence of data is not a zero.** Pass `'-'` when there is nothing to report. "No attendance
   marked yet" and "0% attendance" are different facts, and a band that confuses them is lying.

## 5. Migrating an existing project

Give an agent this section verbatim.

> Replace every headline-number display with `StatBand`. That means:
>
> - every local component named `StatCard` / `MiniStat` / `StatCell` / `StatTile` / `KpiCard` /
>   `MetricCard`, and every place they are rendered;
> - every inline grid of `rounded-xl border ... <p>{label}</p><p>{value}</p>` cards sitting at the
>   top of a page or panel as its summary;
> - then delete the local component.
>
> Mapping: reuse the icon the old card had, or pick a sensible one where it had none. Keep the
> value's **exact** existing formatting - never change what the number is. The old `sub` line
> becomes `hint`. Drop the icon-chip colours. Use `tone` only where the old card coloured the VALUE
> to mean a state. Cards that were links get `href`; cards that acted as filters get `onClick` plus
> `active`.
>
> Then fix the paired skeleton or loading file so it renders `StatBandSkeleton` with the same
> `count`, `cols` and `size`. Expect to find skeletons that were **already** out of sync with their
> screen - a stat row the page no longer has, or none where the page always shows one.
>
> Leave these alone, and say which you skipped and why:
> - option pickers, month checkboxes, package selectors, payment-method tiles - tiles that are
>   choices, not figures;
> - lists of text facts with no numbers (a profile field list, exam metadata);
> - quick-link and action tiles;
> - a deliberate hero result display (a big borderless score at `text-4xl`);
> - marketing and landing pages, which are allowed display typography;
> - any tile whose colour comes from a shared constant that something else also reads, where
>   collapsing it onto a named tone would create a second source of truth.

A useful pass order: migrate the screens, then re-scan for inline grids the name-based search
missed. A regex over `grid-cols-\d` blocks containing both a large bold value class and a small
label class finds the ones with no helper component to grep for.

## 6. Two things that will bite you

- **Typecheck at the end, not per file.** The mistakes this migration produces are a missing import
  and a shadowed identifier, and both are invisible until the compiler runs. Two real ones from the
  original sweep: a file that rendered `<StatBand>` with no import at all, and a module-level
  `transactions()` helper shadowed by the component's own `transactions` array, so both `hint`
  calls were "not callable".

- **Icons in a server component.** Because the file has no `"use client"`, a server page can pass
  `icon: Users` directly. If you add `"use client"` to the component, every server-rendered band
  breaks with a "functions cannot be passed to client components" error. Leave it off.
