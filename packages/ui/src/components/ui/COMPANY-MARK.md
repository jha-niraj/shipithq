# CompanyMark

`company-mark.tsx` (plan/jobs-polish JP-15). A company's logo when it may show one, otherwise
one of 16 small animated marks.

## Use

```tsx
import { CompanyMark } from "@repo/ui/components/ui/company-mark"

<CompanyMark seed={company.id} name={company.name} logoUrl={trust.showLogo ? company.logoUrl : null} size={48} />
// Inside an existing frame that sizes itself (responsive boxes, headers):
<CompanyMark seed={company.id} name={company.name} fill size={64} className="rounded-none border-0" />
```

- **`seed` is the company's id**, everywhere. A company request has no id: pass its name.
  The same seed always gives the same mark, so a company looks the same on the directory,
  its page, job cards and the hiring app. Seeding one place by name and another by id breaks
  that.
- **Pass `logoUrl` only when the logo may show** (`companyTrust(...).showLogo`): an unclaimed
  page never shows a logo.
- `fill` makes it fill its parent; `size` then only sets the corner radius.

## Motion

A slow loop, faster (`--cm-scale: .4`) while the mark or any `.group` ancestor is hovered,
none under `prefers-reduced-motion`. CSS keyframes only, injected once through React's
`<style href precedence>` (deduped however many marks render). Ink is `currentColor` on a
neutral tile, so it reads in both themes.

## The 16 marks (in index order)

orbit, grid pulse, waves, equaliser, rings, diamond, spiral, stack, radar, hexagon,
triangles, heartbeat, checker, arcs, plus, bounce. `companyMarkIndex(seed)` is FNV-1a mod 16.
Adding or reordering marks reassigns every company's mark: append only.
