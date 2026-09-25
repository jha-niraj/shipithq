# Profile - overview

## What this module is

One page that says who a developer is: who they are, what they have built, what
they know, where they have worked and studied. Their own version is editable.
Somebody else's is the same page, read-only.

That last sentence is the point, and it is the thing that is not true today.

## The actual problem

There are **two complete profile UIs in the repo**, built in different
generations, and which one you see depends on whose profile you open.

| | `/profile` (yours) | `/profile/[username]` (theirs) |
|---|---|---|
| Client | `ProfileClient.tsx`, 664 lines | `public-profile-client.tsx`, 202 lines |
| Layout | one page, stacked sections, two-column grid | header + tab bar + sidebar |
| Navigation | scroll | 5 tabs |
| Components | 2 modals, 4 sheets | `ProfileHeader`, `ProfileTabs`, `ProfileSidebar` + 5 tab components |

The second generation - the tabbed one - is about **4,100 lines** across 13
files. It exists only to render somebody else's profile, and it renders it as a
visibly different product from your own.

That is what "too complicated" means here. It is not that any one screen is
overbuilt; it is that there are two of everything.

## Definition of done

1. **Your profile and somebody else's are the same page.** One component, one
   layout, one set of sections. The only difference is that yours has edit
   controls and theirs has Follow and Share.

2. **Nothing a user could do before is gone.** Every section still renders:
   identity, level/XP, stats, about, work experience, education, projects,
   skills, resume, links. Editing, adding and sharing all still work.

3. **One place to change how a profile looks.** A section added to the shared
   component appears on both pages without being written twice.

4. **It looks finished.** The reference is the layout Niraj pointed at
   (`vidhica`, `gurukulhq`): a max-width column, a sticky identity card, quiet
   bordered section cards, honest empty states, no decorative noise.

5. **Read-only means read-only.** A visitor sees no Edit, no Add, no Manage - not
   disabled, absent.

## Decisions

### Keep the stacked-section layout, drop the tabbed one

The own-profile page was already rewritten into stacked sections and it is the
better of the two: a profile is something you scan top to bottom, and tabs hide
four fifths of it behind clicks that a recruiter will not make. It also matches
the reference layout.

So the public profile is rebuilt on the same component rather than the tabbed
generation being kept alive.

### `isOwn` is a prop, not a separate component

The alternative - two thin wrappers over shared sections - is how the repo got
here. One component that takes `isOwn` cannot drift, because there is nothing to
drift from.

### Nothing is deleted in this task

Niraj was explicit: *"I am not telling you to delete anything but just simplify."*
The tabbed generation is left on disk and listed in
`plan/cleanup/candidates.md` as a group awaiting his decision. Simplification
here means the live path has one implementation, not that the old files are
removed.

## Out of scope

- **Changing what the profile stores.** No schema work.
- **The settings page.** Account settings live at `/settings` and stay there.
- **`components/profile/sheets/*`.** The four add/edit sheets work and are reused
  as-is.
- **Follow mechanics.** `toggleFollow` is unchanged; only where the button sits.

---

# Round two (2026-09-25)

Niraj, 2026-09-25: the profile "needs to look professional", the sheets are not
"properly mapped out", and the Edit Profile sheet is "the worst of all of them".
The rest of a person's story should live on **a one-pager they can share, like
a resume but from our side**, modelled on his own portfolio
(`nirajjha.vercel.app/portfolio`, source in `~/Documents/nirajjha/niraj`).

Round one made both routes render one component. Round two splits them by
**job** instead of by owner: `/profile` is where you *maintain* your profile,
`/profile/[username]` is what other people *read*. They share data and section
renderers, not a layout.

## Definition of done (round two)

6. **`/profile` is a workspace-style editor** (Niraj's choice, 2026-09-25),
   drawn in the language of `projects/[slug]/workspace`: an identity strip on
   top; a left section list (Identity, Experience, Education, Projects, Skills,
   Links, Resume, Career goals) with counts and a completion tick; the selected
   section's rows on the right. Hairline borders, not floating cards. Every row
   can be edited and deleted from where it is shown.

7. **`/profile/[username]` is a shareable one-pager**, readable signed-out: a
   single `max-w-4xl` column in the portfolio's order - hero (photo, name,
   headline, location, links, CTAs, a stat strip), About, Experience timeline,
   Projects grid, Skills by category, Education, Contact. One hairline section
   header style. Link previews (OG) work because bots can read it.

8. **Privacy is enforced, public by default** (Niraj, 2026-09-25: opt-out).
   `user_profile.visibility` PUBLIC / FOLLOWERS / PRIVATE is honoured on the
   read path; email and phone never show unless `showEmail`; the resume only if
   `showResume`. A private profile renders "This profile is private", not a 404
   and not the data.

9. **Every sheet is complete.** Header, scrolling body, pinned footer with
   Cancel + primary on the right (UI-9's pattern). No raw enum values anywhere a
   user can read them. Tabs are the base `@repo/ui` `Tabs`, props only.

10. **One set of numbers.** Owner and visitor see the same XP and project count.

## Decisions (round two)

- **Project status and visibility are stored enum-style**: `IN_PROGRESS` /
  `COMPLETED` / `ARCHIVED`, `PUBLIC` / `PRIVATE`. Labels live in one map in
  `lib/profile/labels.ts`; nothing else formats them. (Niraj, 2026-09-25.)
- **Share = Link, Social, QR.** The QR is real and downloadable as PNG.
  "Download card" and "Embed" are removed from the UI, not stubbed. (Niraj,
  2026-09-25.)
- **Same URL.** The one-pager stays at `/profile/[username]`, which
  `publicProfileUrl()` already emits - every link shared so far keeps working.

## Superseded from round one

- "No schema work" - PRF-7 changes two column defaults.
- "`components/profile/sheets/*` reused as-is" - they are rebuilt (PRF-9).
