# Profile - tasks

Derived from `overview.md`.

| ID | Task | Serves | Status |
|---|---|---|---|
| PRF-1 | Extract the shared profile view | 1, 3 | done (2026-08-20) |
| PRF-2 | Rebuild `/profile` on it | 1, 2 | done (2026-08-20) |
| PRF-3 | Rebuild `/profile/[username]` on it | 1, 2, 5 | done (2026-08-20) |
| PRF-4 | Match the loading skeletons to the new layout | 4 | done (2026-08-20) |
| PRF-5 | List the superseded tabbed generation for Niraj | - | done (2026-08-20) |
| PRF-6 | Resume upload on the profile page | 2 | done (2026-08-20) |
| PRF-7 | Project status/visibility: one casing, labels map, data script | 8, 9 | done (2026-09-25) |
| PRF-8 | Profile actions: edit/delete wired, one stats source, privacy on read | 6, 8, 10 | done (2026-09-25) |
| PRF-9 | The four content sheets rebuilt (project, experience, education, skills) | 9 | done (2026-09-25) |
| PRF-10 | Edit Profile sheet rebuilt | 9 | done (2026-09-25) |
| PRF-11 | `/profile` becomes the workspace-style editor | 6 | done (2026-09-25) |
| PRF-12 | `/profile/[username]` becomes the public one-pager | 7, 8 | done (2026-09-25) |
| PRF-13 | Share dialog: base tabs, real QR, dead buttons gone | 9 | done (2026-09-25) |
| PRF-14 | Skeletons for both routes | 6, 7 | done (2026-09-25) |
| PRF-15 | Propose deleting the dead profile files | - | done (2026-09-25) |
| PRF-16 | Sheets lose their section labels ("ROLE", "DATES", ...) | 9 | done (2026-09-25) |
| PRF-17 | Several uploaded resumes, a primary, and a Resume pane with tabs | 6 | built (2026-09-25), awaiting Niraj's browser check |

---

## PRF-1 - Extract the shared profile view

**Status:** done (2026-08-20)
**Serves:** 1, 3

**Why.** One layout, rendered twice, is the whole simplification.

**Files**
- new: `components/profile/profile-view.tsx`

**Shape**
```
<ProfileView
  profile={...}        normalised, from either source
  stats={...}
  isOwn={boolean}
  isFollowing={...}    public only
  onEdit / onShare / onAddSkills / onAddExperience / onAddEducation /
  onAddProject / onFollow
/>
```
Every callback optional. A section renders its action only when both `isOwn` and
the callback are present, so the read-only page cannot accidentally show an
Add button by forgetting a prop.

**Edge cases**
- **The two pages have DIFFERENT data shapes.** `/profile` gets `getOwnProfile`;
  `/profile/[username]` gets a server query typed `any`. Normalise at the
  boundary, and give the shared component ONE explicit interface - passing `any`
  through would make every field silently optional.
- **A visitor must not see private fields.** `email` is behind
  `userProfile.showEmail`; credits, and the exact XP-to-next-level, are the
  owner's business. Gate on `isOwn`, not on whether the value happens to be set.
- **Empty states differ by viewer.** "No projects yet - add your first" is wrong
  on somebody else's page; it should read "No projects yet." with no action.
- **`dateRange` and the level maths already exist** in `ProfileClient`. Move
  them, do not rewrite them - a second rounding rule for XP would be a new bug.
- **Avatar can be a remote URL** (`unoptimized` is already set). Keep it, or
  Next's optimiser rejects unconfigured hosts at runtime.

**Done when**
The component renders a complete profile from props alone, with no data fetching
and no store access inside it.

---

## PRF-2 - Rebuild `/profile` on it

**Status:** done (2026-08-20)
**Serves:** 1, 2

**Files**
- edit: `app/(main)/profile/_components/ProfileClient.tsx`

**Steps**
Keep the fetching, the store wiring, the modals and the sheets. Replace the
inline markup with `<ProfileView isOwn ... />`.

**Edge cases**
- **The four sheets and two modals must keep their existing props.** They are
  shared with other surfaces; changing their contract is a different task.
- **`refresh()` after a sheet saves** must still run, or an added skill does not
  appear until reload.
- **The signed-out and error states** in this file are not profile layout and
  stay where they are.
- **`ProfileSkeleton` is imported here** - see PRF-4.

**Done when**
`/profile` looks the same or better, and every edit/add/share still works.

---

## PRF-3 - Rebuild `/profile/[username]` on it

**Status:** done (2026-08-20)
**Serves:** 1, 2, 5

**Files**
- edit: `app/(main)/profile/[username]/_components/public-profile-client.tsx`

**Steps**
Drop the tabbed composition. Render `<ProfileView isOwn={false} ... />` plus the
Follow button and the share modal.

**Edge cases**
- **`isOwnProfile` is already a prop** - someone visiting their OWN username URL
  must get the owner view, not a read-only copy of it.
- **`trackProfileView` must keep firing**, and must keep NOT firing on your own
  profile, or view counts inflate.
- **The server query may not select every field** the shared component reads.
  Check `page.tsx` and widen the select rather than letting fields render as
  undefined.
- **Follow state is optimistic today.** Preserve that; a button that waits on a
  round trip feels broken.
- **A private or missing user** must still 404 the way it does now.

**Done when**
Somebody else's profile is visually the same page as your own, minus the edit
controls, plus Follow.

---

## PRF-4 - Match the loading skeletons

**Status:** done (2026-08-20)
**Serves:** 4

**Why.** `CLAUDE.md`: a skeleton that does not match the real layout is worse
than none, because the page visibly reflows.

**Files**
- edit: `app/(main)/profile/_components/profile-skeleton.tsx`
- edit: `app/(main)/profile/[username]/loading.tsx`
- edit: `app/(main)/profile/loading.tsx`

**Edge cases**
- **Both routes now share a layout, so both skeletons should.**
- **The skeleton must not be taller than the real page**, or the content jumps up
  when it lands.

**Done when**
Loading and loaded states have the same silhouette on both routes.

---

## PRF-5 - List the superseded tabbed generation

**Status:** done (2026-08-20)

**Why.** Niraj said not to delete. So it gets written down instead.

**Files**
- edit: `plan/cleanup/candidates.md` - add a Group E

**To list** (~4,100 lines, all unreferenced once PRF-3 lands):
`profile-header.tsx`, `profile-tabs.tsx`, `profile-sidebar.tsx`,
`integrations-tab.tsx`, `tabs/at-a-glance-tab.tsx`, `tabs/about-tab.tsx`,
`tabs/activity-tab.tsx`, `tabs/education-tab.tsx`, `tabs/projects-tab.tsx`,
`tabs/resume-tab.tsx`, `tabs/skills-tab.tsx`, `tabs/work-experience-tab.tsx`,
`modals/endorse-skill-modal.tsx`

**Edge cases**
- **`components/profile/index.ts` re-exports all of them.** Trim the barrel to
  what is live, or the dead files stay reachable and `tsc` keeps checking them.
- **`tabs/resume-tab.tsx` was edited earlier this session** (upload wiring). It
  is still superseded; note that so the work is not assumed lost - it is in git.
- **Check nothing outside `components/profile` imports them** before listing.

**Done when**
Group E exists in `candidates.md` with an accurate line count, and the barrel
exports only what the live pages use.


---

## PRF-6 - Resume upload on the profile page

**Status:** done (2026-08-20)
**Serves:** definition-of-done 2 (nothing a user could do before is gone)

**Why.** The profile shows "Resume on file" and links to `/ai/resume`, but there
is no way to put a resume there from this page. The control existed in
`resume-tab.tsx`, which was already unreachable before this session - so the gap
predates the rewrite, but the rewrite is the moment to close it.

It must be the **same pipeline as onboarding**, not a second one: file ->
`uploadResume` -> R2 + `unpdf`/`mammoth` text extraction -> `resume_structure`
worker job -> structured draft, defaulted if the user has none.

**Files**
- edit: `components/profile/profile-view.tsx` - the control
- edit: `app/(main)/profile/_components/ProfileClient.tsx` - the handlers

**Steps**
1. `ProfileView` gains `onUploadResume(file)`, `onDeleteResume()`,
   `onViewResume()` and their pending flags. The view owns the input and the
   client-side validation; it does not call a server action itself.
2. `ProfileClient` implements them against the existing
   `uploadResume` / `deleteResume` / `getResumeSignedUrl` actions.

**Edge cases**
- **Exactly the onboarding call.** `uploadResume(file, undefined, { draftName })`
  - the third argument is what names the draft the worker creates. Omitting it
  silently produces "Imported resume" instead.
- **Validate before upload** with `validateResumeFile` (5MB, pdf/doc/docx). It is
  a pure client function, so it does not break the view's presentation-only rule.
- **A scanned PDF yields no text**, so `uploadResume` returns no
  `structureJobId`. Say so - the file is stored and viewable, but nothing will be
  parsed from it. Silently succeeding here is how a user ends up wondering why
  their AI resume never appeared.
- **The parse lands minutes later**, off the request path. The success toast has
  to set that expectation or the structured draft showing up at `/ai/resume`
  looks like something they did not ask for.
- **`hasResume` is on the profile row**, so the section only flips to "on file"
  after a refresh. Call the existing `refreshProfileData` on success.
- **Replacing** is the same call as uploading - no separate path. The worker is
  `singleFlight`, and it re-reads the newest text at alarm time, so a quick
  re-upload structures the latest file rather than racing two jobs.
- **Deleting must confirm.** It removes the R2 object and the extracted text, and
  it is not undoable.
- **`getResumeSignedUrl` is async and time-limited**; fetch it on click rather
  than holding a URL that expires while the page sits open.
- **Owner only.** The whole section is already behind `isOwn`; the upload control
  must not leak into the public view.

**Done when**
A user with no resume can upload one from `/profile`, sees it become "Resume on
file", can view and delete it, and the structured draft appears at `/ai/resume`
shortly after - the same outcome as uploading during onboarding.

**Outcome.** `ProfileClient` calls
`uploadResume(file, undefined, { draftName: "My resume" })` - byte-identical to
onboarding's call - so both go through the one pipeline: R2 + `unpdf`/`mammoth`
-> `resume_structure` Durable Object -> structured draft, defaulted if the user
has none. View and Delete use the existing `getResumeSignedUrl` / `deleteResume`.

**A production bug found while testing this.** `extractTextFromDOCXBuffer`
called `mammoth.extractRawText({ arrayBuffer })`. That is the BROWSER build's
input; the server build wants `{ buffer: Buffer }` and rejects an ArrayBuffer
with "Could not find file in options" - which the surrounding `catch { return "" }`
swallowed. So **every DOCX upload extracted nothing**, dispatched no structuring
job, and told the user their file was unreadable. It affected every upload
surface: onboarding, the resume hub, the interview assistant, and now this page.

Fixed to prefer `{ buffer }` with the arrayBuffer form as a browser fallback, and
the catch now logs instead of failing silently - an extractor returning `""` was
indistinguishable from a genuinely scanned PDF, which is exactly what hid this.

**Verified** by running both branches against a generated PDF and a generated
DOCX: 251 and 257 characters extracted, both over the worker's 200-character
floor, so both dispatch the structuring job.

---

## Outcome

The live profile is **1,095 lines** where the two generations together were about
**5,700**. Both routes render `components/profile/profile-view.tsx`; the tabbed
generation (~4,636 lines) is untouched on disk and listed as Group E in
`plan/cleanup/candidates.md`.

| | before | after |
|---|---:|---:|
| `ProfileClient.tsx` | 664 | 363 |
| `public-profile-client.tsx` | 202 | 135 |
| shared view + skeleton | - | 597 |
| tabbed generation in the live path | ~4,636 | 0 |

**A real bug found while wiring PRF-3.** `getProfileByUsername` fetched skills,
experiences, projects, certifications, achievements, social links and activity -
but never education. A public profile therefore said "No education listed" no
matter what the user had entered. Fixed in the same action.

That fix was nearly applied to the wrong function: `getOwnProfile` has a
near-identical `Promise.all` block and already fetched educations, so the first
attempt inserted a duplicate there and silently shifted its destructuring by one
position. Caught by the typechecker, then anchored on a string unique to the
right function.

**Behaviour notes for testing:**

- Visiting your own `/profile/<your-username>` gives the owner view, with Edit
  routing to `/profile` where the sheets live.
- A visitor sees no Edit, no Add and no Manage - absent, not disabled - plus
  Follow and Share.
- The resume section and the XP-to-next-level readout are owner-only.
- `trackProfileView` still fires once per mount and still never on your own
  profile.


---

# Round two (2026-09-25)

Derived from the round-two section of `overview.md`. Paths are under
`apps/main/` unless they start with `packages/`.

## PRF-7 - Project status/visibility: one casing, labels map, data script

**Status:** done (2026-09-25) - migration `0032` and the backfill are Niraj's to apply
**Serves:** 8, 9

**Why.** `components/profile/sheets/add-project-sheet.tsx:28-29` writes
`"PUBLIC"` / `"IN_PROGRESS"`; the columns default to `"Public"` / `"In Progress"`
(`packages/db/src/schema/profile.ts:85-86`); and `getProfileByUsername` filters
visitors on `eq(visibility, "Public")` (`actions/(main)/user/profile.action.ts:1378`).
So **every project added from the sheet is invisible to everyone else**. The UI
then prints the raw value (`profile-view.tsx:477`, the sheet's dropdowns).

**Files**
- new: `lib/profile/labels.ts` - `PROJECT_STATUS`, `PROJECT_VISIBILITY`,
  `PROJECT_TYPE`, `SKILL_CATEGORY`, `SKILL_LEVEL`, `LINK_TYPE`, `MEDIA_TYPE`:
  value list + `label(value)` for each. The only place a label is written.
- edit: `packages/db/src/schema/profile.ts` - defaults `IN_PROGRESS` / `PUBLIC`
- new: migration via `pnpm db:generate --name project_value_casing`
- new: `packages/db/src/scripts/profile-project-values.ts` + `db:profile-project-values`
- edit: `profile.action.ts` - every read/write of those columns uses the constants

**Steps**
1. Labels module; values are the enum-style strings.
2. Schema defaults, migration generated and shown to Niraj before applying.
3. Script: default prints DB host and, per row, `id  "Public" -> "PUBLIC"`
   for status, visibility, and link/media type; `--apply` writes, then re-plans and
   prints "nothing left".
4. Readers compare against constants; legacy values mapped in `label()` too, so
   the UI is right even before the script runs.

**Edge cases**
- Unknown legacy values (typos, free text in `project_type`): map what is
  known, print the rest as "left alone" - never guess.
- `projectType` is free text today; custom types stay allowed, labelled as typed.
- Resume sync (`resume-to-profile.action.ts`, `resume-profile-sync.action.ts`)
  also writes projects - grep for every writer of these columns.

**Done when** `pnpm db:profile-project-values` on the dev DB reports 0 rows to
change after `--apply`; a project added from the sheet appears on
`/profile/<username>` for a second account; no raw `IN_PROGRESS`, `PUBLIC` or
`FRAMEWORKS_LIBRARIES` is visible on either profile route.

**Outcome.**
- Stored values: `packages/db/src/profile-values.ts` (`@repo/db/profile-values`),
  shared by the app and the script so they cannot disagree. Labels:
  `apps/main/lib/profile/labels.ts`.
- Every writer normalises: `addPortfolioProject` (now one `withTransaction`,
  empty link/media rows dropped), `updatePortfolioProject`, and
  `resume-to-profile.action.ts`.
- **A second instance of the same bug, found here:** writers stored link type
  `"LIVE SITE"` but `resume-draft.action.ts` and `lib/resume/primary.ts` read
  `"LIVE_SITE"`, so a project's live URL never reached a resume built from the
  profile. Both readers now compare normalised values.
- The visitor filter is `upper(visibility) = 'PUBLIC'`, correct before and after
  the backfill.
- **Verified** on the dev DB (insert three rows, query, delete): the old filter
  returned only the legacy `"Public"` row; the new one returns `"PUBLIC"` and
  `"Public"` and hides `"PRIVATE"`. Normalisers checked against 11 spellings.
  `pnpm db:profile-project-values` on dev: 0 rows (dev has no portfolio projects).
  The browser half of "Done when" (a second account) is re-checked in PRF-12,
  when the page becomes readable by others.
- ~~Niraj to run~~ done 2026-09-25: `0032` was already applied (defaults read back
  as `'IN_PROGRESS'`/`'PUBLIC'` from `information_schema`); the backfill now runs as
  `pnpm script profile-project-values [--apply]` (0 rows on dev; also proved on
  three planted legacy rows: 7 values respelled, re-check clean, rows removed).

## PRF-8 - Profile actions: edit/delete wired, one stats source, privacy on read

**Status:** done (2026-09-25)
**Serves:** 6, 8, 10

**Why.** Update/delete actions exist for experience, education and projects but
no UI reaches them. Owner and visitor stats disagree (owner: `currentXp` labelled
"Total XP", project count includes platform projects; visitor: `totalXp`, visible
portfolio projects only). `getProfileByUsername` ignores `user_profile.visibility`;
`getPublicProfile` enforces it and has no callers. `getUserProfileStats` takes
any `userId` with no check.

**Files**
- edit: `actions/(main)/user/profile.action.ts`
- edit: `app/(main)/profile/_components/ProfileClient.tsx`,
  `app/(main)/profile/[username]/_components/public-profile-client.tsx`

**Steps**
1. One `profileStats(userId, { viewer })` used by both routes: `totalXp`,
   level, portfolio projects visible to that viewer, skills, followers.
2. `getProfileByUsername` works signed-out (viewer may be null) and applies
   visibility: PRIVATE -> `{ private: true }` with only name/username/avatar;
   FOLLOWERS -> same unless the viewer follows; owner always sees everything.
   Strip `email`/`phone` unless `showEmail`; resume only if `showResume`.
3. `getUserProfileStats` requires the session user to be the subject.
4. Owner mutations return the updated row so the editor updates in place.

**Edge cases**
- No `user_profile` row (older users): treat as PUBLIC, all show-flags default.
- `trackProfileView` must not crash or count for a signed-out viewer with no id -
  record with `viewerId` null, still never for the owner.
- `_count?.followers` fallback in `ProfileClient` is Prisma-era and always
  undefined - remove it.

**Done when** owner and visitor views of the same user show identical XP and
project counts; a PRIVATE user's page returns no bio, projects or experience in
the action payload (checked by logging the payload signed-out); a signed-out
fetch of the action for a PUBLIC user contains no email.

**Outcome.**
- **Worse than the task assumed: the visitor read leaked the whole `users` row.**
  `getProfileByUsername` returned `...user` - email, phone, resume text, credits,
  expected salary, notice period - and the client component hid the email AFTER
  the row was serialised into the page. Any signed-in user could read it from the
  RSC payload, and PRF-12 was about to make it public.
- New `lib/profile/read.ts` (`server-only`, deliberately not a server action):
  `loadPublicProfile(username, viewerId)` returns an explicit allow-list shape
  (`PublicProfile`), or `restricted` with only name/username/avatar, or
  `not_found`. The page reads it directly; `getProfileByUsername` is a thin
  wrapper for anything client-side.
- Access: `user_profile.visibility`, and `users.isPublicProfile = false` also
  means private. No `user_profile` row = PUBLIC with defaults. Owner sees all.
- `profileStats(userId, { includePrivateProjects })` is the one source.
  **XP was wrong on both routes**: the owner showed `currentXp`, the visitor
  `totalXp` (0 for the dev user), and the bar used `xp % 1000` when level 2 is at
  500. Now `lifetimeXp` + `LEVEL_CONFIG`, moved unchanged into `lib/levels.ts`
  (a `"use server"` file cannot export a const). The project count no longer adds
  platform enrolments, which is why the owner saw "Projects 2" over an empty
  Projects section.
- `getUserProfileStats()` takes no id and reads only the session user (it
  used to return anyone's credits). `trackProfileView(profileId, source)` takes
  the viewer from the session, not the caller; both writes in one `db.batch`.
- Update actions for experience, education and projects accept `endDate: null`
  so "currently working" can clear an old end date. All update/delete actions
  already checked ownership (read).
- **Verified** on the dev DB with a temporary `user_profile` row (deleted after):
  PRIVATE and FOLLOWERS -> signed-out `restricted`, payload has no bio, projects,
  experiences or email; owner `ok` in both. PUBLIC -> `ok`, no email unless
  `showEmail`, which then shows it. No `resumeText`/`credits`/`phone`/
  `expectedSalary` key in any payload. Owner and visitor stats identical
  (`xp 250, level 1, 250/500, projects 0`). Unknown username -> `not_found`.
- `getPublicProfile` (old, zero callers) left for PRF-15.

## PRF-9 - The four content sheets rebuilt

**Status:** done (2026-09-25)
**Serves:** 9

**Why.** Niraj, 2026-09-25: "All these sheets needs to be properly mapped out."
Add Project shows raw enums, labels dates to the LEFT of the picker, has one
left-aligned button and no Cancel, closes before the server answers, and
uppercases custom techs into `NEXT_JS`. Links and media start as a bare "+ Add"
button; Niraj wants them to **start with one empty row shown** (his image 4:
a link row and a media row). Experience/education have hand-styled buttons,
a footer that butts against its border, and edit modes nothing opens.

**Files**
- new: `components/profile/sheets/profile-sheet.tsx` - shared shell:
  `SheetContent scroll={false}`, header (title + one-line description),
  `min-h-0 flex-1` scroll body, `shrink-0 border-t` footer with Delete (edit
  mode, left) and Cancel + primary (right). Per UI-9.
- rewrite: `components/profile/sheets/add-project-sheet.tsx` -> `project-sheet.tsx`
- rewrite: `add-work-experience-sheet.tsx` -> `experience-sheet.tsx`
- rewrite: `add-education-sheet.tsx` -> `education-sheet.tsx`
- rewrite: `add-skills-sheet.tsx` -> `skills-sheet.tsx`

**Steps**
1. Shell first; every sheet uses it. Each takes `mode: "add" | "edit"` and an
   optional row; edit pre-fills and shows Delete (AlertDialog confirm).
2. Project: name; type / status / visibility from labels (status and visibility
   as segmented controls - 3 and 2 options, not dropdowns); description with
   one-point-per-line; technologies; links rows default to ONE empty row
   (GitHub), media rows default to ONE empty row (Image); each row is type
   select + URL + caption with a remove button that does not remove the last row
   (it clears it instead); start/end as `MonthPicker` with labels ABOVE, and a
   "Still working on it" check that clears end.
3. Experience and education: same shell, `MonthPicker`s, base `Button`s.
4. Skills: add row = name + category + level on one line, list below grouped
   by category with inline level change and remove. Categories via labels.
5. Submit awaits the action; button shows `InlineLoader sm` + verb; sheet closes
   only on success; on failure the form stays filled.

**Edge cases**
- Empty rows (no URL) are dropped on save, not stored as blank links.
- URLs validated (`https://` added if missing; reject non-http schemes).
- End before start: inline error, Save disabled.
- Custom tech keeps the user's casing.
- Unsaved changes + close: confirm discard.
- Below `sm`, the three-column rows stack.

**Done when** each sheet adds, edits and deletes against the dev DB; the
footer stays pinned while the body scrolls on a 700px-tall window; the project
sheet opens with one link row and one media row; no sheet shows an uppercase
enum; nothing in `components/profile/sheets` styles a `Button` by hand.

## PRF-10 - Edit Profile sheet rebuilt

**Status:** done (2026-09-25)
**Serves:** 9

**Why.** Niraj: "the worst of all of them". Underline tabs overriding the base
`Tabs` (and two conflicting `bg-*` on one element); a broken avatar
(`/default-avatar.png` does not exist); the camera button is a
`toast.info("coming soon")` while the page itself can upload; company and
occupation are in state with no inputs; dead `_THEME_OPTIONS`/`_SEMESTERS`.

**Files**
- rewrite: `components/profile/modals/edit-profile-modal.tsx` ->
  `components/profile/sheets/edit-profile-sheet.tsx` on the PRF-9 shell

**Steps**
1. Base `Tabs`, `TabsList variant="segmented" size="sm" fit` - props only.
   Tabs: Basic, Work, Career goals.
2. Basic: avatar (`Avatar` with initials fallback; upload through the same
   `uploadProfileImage` path the page uses), name, headline/tagline with
   counter, bio with counter, location, website.
3. Work: occupation, company, university, open-to-work switch.
4. Career goals: dream role, experience, expected salary, notice period,
   target companies (combobox, popover matches trigger width).
5. One Save for all tabs; errors shown on the tab that owns the field, and that
   tab's trigger marked.

**Edge cases** avatar upload failure keeps the old image; website normalised
like PRF-9 URLs; switching tabs never loses typed values.

**Done when** avatar upload works from inside the sheet; no `TabsList` or
`TabsTrigger` in the file has a className; every field in the form state has an
input; saving refreshes the identity strip without a reload.

## PRF-11 - `/profile` becomes the workspace-style editor

**Status:** done (2026-09-25)
**Serves:** 6

**Why.** Niraj's choice, 2026-09-25, from the preview: identity strip, section
list left, section rows right, in the workspace's language (study
`projects/[slug]/workspace/_components/task-panel.tsx`, `workspace-client.tsx`).

**Files**
- rewrite: `app/(main)/profile/_components/ProfileClient.tsx` (-> ~250 lines)
- new: `app/(main)/profile/_components/profile-editor/*` - `identity-strip.tsx`,
  `section-nav.tsx`, one `*-section.tsx` per section, `row.tsx`
- `components/profile/profile-view.tsx` stays for PRF-12's reuse of renderers only

**Steps**
1. Identity strip (`border-b`): avatar, name, @username, headline, level bar
   with `xp / next`, buttons: View public page (`<Link>` to `publicProfileUrl`),
   Share, Edit.
2. Left nav `w-56 border-r`: `h-9` strip header "PROFILE" in 11px uppercase;
   rows `h-8 text-[13px]` with count (tabular-nums) or a check; active row
   inverted per workspace. Section in URL (`?section=experience`) so it survives
   reload and is linkable.
3. Right pane: `h-9` strip header with section title + "+ Add"; rows are dense
   (`title - subtitle`, dates right in tabular-nums), actions (Edit, Delete)
   in a `...` DropdownMenu. Empty state: one line + one button.
4. Completion: a small "N of 8 complete" in the nav header driven by the same
   checks as the ticks.
5. Below `lg`, the nav becomes a segmented `Tabs` strip that scrolls horizontally.

**Edge cases** unknown `?section=` falls back to Identity; deleting the last row
shows the empty state without reflow; the AI rail open still leaves the editor
usable at `lg`.

**Done when** every section can be added to, edited and deleted from `/profile`
without leaving it; reload keeps the section; no rounded card wraps a section;
at 390px wide nothing scrolls horizontally except the tab strip.

**Outcome (PRF-9, PRF-10, PRF-11, built together because the editor hosts the sheets).**
- `components/profile/sheets/profile-sheet.tsx`: the shell (header, `ScrollArea`
  body, pinned footer; Delete left, Cancel + primary right; delete and
  discard-changes confirmations; `Field`, `FieldGroup`, `Segmented`,
  `toMonthValue`/`fromMonthValue`, `normalizeUrl`, `toBullets`). Header is compact
  (`py-3.5`) with an optional right slot, `pr-12` clear of the close button; the
  slot drops under the title and scrolls below sm (Niraj, 2026-09-25).
- `project-sheet.tsx`, `experience-sheet.tsx`, `education-sheet.tsx`,
  `skills-sheet.tsx`, `edit-profile-sheet.tsx`. The old `add-*-sheet.tsx` files and
  `modals/edit-profile-modal.tsx` are now unreferenced: PRF-15.
- **Bugs found and fixed on the way:**
  - Edit prefill used `toISOString().split("T")[0]`; in IST a stored 1 Sep is
    31 Aug UTC, so every edited date walked back a month. Local-part formatting now.
  - `updateUserSkills` updated by id alone: anyone could rewrite anyone's skill.
    Now scoped to the caller.
  - `updatePrivacySettings` passes client JSON straight to `.set()`. Not used by
    the new sheet; the new `saveProfileDetails` allow-lists every column, enforces
    lengths from `lib/profile/limits.ts`, normalises the website to http(s), and
    writes `users` + the `user_profile` upsert in one `db.batch`, keeping
    `users.isPublicProfile` in step with visibility.
  - `saveMyProfileLinks` can never clear a link; `setMyProfileLinks` (Links pane)
    can, with a LinkedIn host check.
  - `getOwnProfile` did not load project media, so editing a project would have
    dropped its media rows.
  - The delete confirmation claimed rows are removed from built resumes; drafts
    keep their own copy. Copy corrected.
- Editor: `app/(main)/profile/_components/ProfileClient.tsx` + `profile-editor/`
  (`parts.tsx`, `sections.tsx`, `skeleton.tsx`). Centred `max-w-5xl` frame with
  hairline sides (Niraj, 2026-09-25: edge to edge "is not looking great"). Section
  in `?section=`; below lg the nav is a `TabsNav` that scrolls the active item into
  view. Icons: Globe for the public page, Send for Share (Niraj asked for better ones).
- **Verified in the browser** (dev DB, Niraj's account): project added (stored
  `IN_PROGRESS`/`PUBLIC`/`PERSONAL`, `https://` added, empty media row dropped),
  edited (status to Completed), deleted through the row menu and its confirmation;
  empty state and "N of 8" update. Edit Profile saved a headline, which created the
  missing `user_profile` row. Project sheet opens with one link row and one media
  row. At 390px (iframe): no horizontal overflow, buttons fit, skeleton matches.
  Experience and education sheets share the verified shell and date helpers but
  were not clicked through; the Links pane was rendered, not saved.
- **Left on Niraj's dev profile by testing:** headline "Building ShipItHQ, a
  place to learn by shipping". The test project was deleted.

**Follow-up checks (2026-09-25, later).** Clicked through in the browser, each
with a DB read-back: Experience (add with a Sep 2026 start and "I work here now",
reopened as Sep 2026 / Present, deleted from the sheet with confirmation);
Education (add, delete from the row menu); Skills (add with Enter, which does not
submit the sheet; level to Expert, read back as `expert`; remove); Links (X handle
saved without the `@`, then cleared and saved empty, count back to 2). One fix: the
skills add row squeezed the name field to about 80px in the 512px sheet; the name
now has its own line. **Testing note:** the automation tab is `visibilityState:
hidden`, so Chrome runs no animation frames: Radix exit animations never finish
(closed overlays stay mounted and intercept the next click) and framer fade-ins
stay at opacity 0. Checks were run with animations disabled by an injected style;
a foreground browser is not affected.

## PRF-12 - `/profile/[username]` becomes the public one-pager

**Status:** done (2026-09-25)
**Serves:** 7, 8

**Why.** Niraj wants something users "can show and share to anyone", like his
portfolio. Today the route is behind login (`middleware.ts` PUBLIC_PREFIXES has
no `/profile/`), so OG previews and recruiters get a sign-in redirect.

**Files**
- edit: `middleware.ts` - `/profile/<username>` public (exactly two segments),
  same shape as `isPublicKnowMeProfile`
- rewrite: `app/(main)/profile/[username]/page.tsx` and client ->
  `components/profile/public/*` (`hero.tsx`, `section.tsx`, `timeline-item.tsx`,
  `project-card.tsx`, `skills-grid.tsx`, `contact.tsx`)
- consider: moving the route to a group without the app shell for signed-out
  visitors (see edge cases)

**Steps**
1. Single `mx-auto max-w-4xl px-4 sm:px-6` column. Hero: photo (initials
   fallback), name at display size, headline, `/` location, bio; pill CTAs
   (Email if `showEmail`, Resume if `showResume`, socials); open-to-work pill;
   a `divide-x` stat strip (projects, years, skills, followers) via `StatBand`.
2. Sections with one header style (hairline `border-b`, 11-12px uppercase
   tracked label, optional right action): About, Experience (timeline rail: dot +
   fading line, company, role, dates tabular-nums, bullets), Projects (grid 1/2
   cols, media or initials plate, dates, tech tags, link pills), Skills (by
   category), Education (timeline), Contact card.
3. Owner viewing their own page sees an "Edit profile" bar linking `/profile`;
   visitors see Follow (signed-in) or "Sign in to follow" (signed-out).
4. Metadata: title, description from headline/bio, OG image = avatar.
5. Empty sections are omitted entirely for visitors.

**Edge cases**
- Signed-out viewer must not mount session-only providers or the AI rail;
  render the page without the main shell when there is no session.
- Middleware must not open `/profile` itself or any owner sub-route.
- Private and followers-only states (PRF-8) render a small centred notice.
- Unknown username: `notFound()`.
- Text legible on any photo/plate (constant ink on constant surfaces).

**Done when** a signed-out `curl` of `/profile/<username>` returns 200 with the
name in `<title>` and `og:` tags; a private profile returns the notice and none
of its data; the page reads top to bottom in the portfolio's section order at
1440px and 390px.

**Outcome.**
- Decisions (Niraj, 2026-09-25): standalone for every viewer, like
  `/knowme/<username>`; hero stats are portfolio numbers (Projects, Experience in
  years from the roles with overlaps merged, Skills, Followers), no XP; the Resume
  button opens the default resume at `/r/<slug>` only when that draft is public and
  `showResume` is on (making `/r` itself public is RES-24).
- Route moved (`git mv`) from `app/(main)/profile/[username]` to
  `app/(public)/profile/[username]`; `middleware.ts` gains `isPublicProfilePage`
  (exactly two segments). `page.tsx` reads `lib/profile/read.ts` directly; top bar
  is the wordmark plus Edit profile (owner) / Back to ShipItHQ (signed in) / Join
  ShipItHQ (signed out). `_components/one-pager.tsx` is a server component;
  `interactive.tsx` holds ViewTracker, FollowButton, CopyLinkButton, FallbackImage.
- **Changed from the plan:** PRIVATE is now `not_found` to everyone but the owner,
  not a "this profile is private" notice - that notice confirms an account exists,
  the rule `/knowme` already follows. FOLLOWERS-only shows a face and Follow. The
  Privacy tab copy says so.
- `FallbackImage`: dead avatar URLs (Niraj's dev account has one) fail before
  hydration, so `onError` never fired and the alt text showed; it now also checks
  `complete && naturalWidth === 0` after mount.
- **Verified:** signed-out `curl` of `/profile/nirajjha` is 200 with the name in
  `<title>` and `og:title`/`og:description`/`og:image`; no email, `resumeText`,
  `credits` or `expectedSalary` in the HTML; `/profile` and `/profile/nirajjha/x`
  still redirect to sign-in. FOLLOWERS signed-out: the followers-only view, no role
  or bio in the HTML; PRIVATE signed-out: the not-found page, no data. Laid out and
  screenshotted with tagged sample rows (removed afterwards) at 1456px and 390px:
  no page overflow (the StatBand strip scrolls inside itself, by design).
  A missing username renders the not-found page with `noindex`, but with HTTP 200:
  `loading.tsx` starts the stream before `notFound()`. Accepted; noted here.
- PRF-14: `app/(main)/profile/loading.tsx` and the editor's own state share
  `profile-editor/skeleton.tsx`; the one-pager's `loading.tsx` is shaped like it.

## PRF-13 - Share dialog: base tabs, real QR, dead buttons gone

**Status:** done (2026-09-25)
**Serves:** 9

**Why.** "Generate QR" and "Download Card" have no `onClick`; Embed iframes a
login-gated page; `TabsList className="grid w-full grid-cols-3"` overrides the
base tabs. Niraj, 2026-09-25: make QR real, drop the rest.

**Files**
- edit: `components/profile/modals/share-profile-modal.tsx`
- add dependency: `qrcode.react` to `apps/main` (nothing QR exists today)

**Steps** tabs Link / Social / QR with `TabsList variant="segmented" size="sm"
fit`; Link = URL + copy + visibility hint; Social = intents; QR = `QRCodeCanvas`
of `publicProfileUrl(username)` in constant black-on-white, "Download PNG".

**Edge cases** URL from `lib/urls.ts`, never `window.location`; if the profile
is private, say the link will show "private" to others.

**Done when** the downloaded PNG scans to the public URL; no button in the
dialog is without a handler; no Embed or Download Card remains.

**QR, finished the same day.** Niraj added `packages/errors`, which unblocked the
install: `qrcode.react@^4.2.0` in `apps/main`. The QR tab draws `QRCodeCanvas` of
`publicProfileUrl(username)` (black on white on a constant white plate, `level="M"`,
`marginSize={4}`, a 512 canvas shown at 192px) with Download PNG via
`canvas.toDataURL`. **Verified** in the browser: Chrome's `BarcodeDetector` decodes
the rendered canvas to the profile URL (`http://localhost:6001/profile/nirajjha` on
dev, since `publicProfileUrl` resolves to the app's base URL); the PNG is 1024x1024
at devicePixelRatio 2, about 31 KB.

**Outcome (first pass).** Rewritten on base tabs with props only (Link, Social);
Embed and Download Card removed; the link comes from `publicProfileUrl()`; the
dialog says what others will see when the profile is followers-only or private
(the editor passes the visibility). **Blocked:** `pnpm add qrcode.react` fails for
the whole workspace because `packages/exa` (new, untracked, from the hiring
session) depends on `@repo/errors`, which does not exist yet
(`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). Once that package lands: add the dependency,
then a QR tab with `QRCodeCanvas` (value = the public URL, black on white,
`marginSize={4}`, `level="M"`) and a Download PNG via `canvas.toDataURL`, per the
library's docs (checked 2026-09-25).

## PRF-14 - Skeletons for both routes

**Status:** done (2026-09-25)
**Serves:** 6, 7

**Files** `app/(main)/profile/loading.tsx`, `app/(main)/profile/[username]/loading.tsx`
and their skeleton components, `Shimmer` from `@repo/ui/components/skeleton-kit`.

**Done when** swapping loading -> loaded on each route shows no layout shift
at 1440px and 390px (checked in the browser with throttling).

## PRF-15 - Propose deleting the dead profile files

**Status:** done (2026-09-25) - listed, approved by Niraj, and deleted the same day (see `plan/cleanup/candidates.md`)

**Why.** Unreferenced: `app/(main)/profile/_components/documentupload.tsx`
(229), `components/profile/sheets/profile-strength-sheet.tsx` (227, hotlinks a
Bing image), `app/(main)/profile/_components/profile-data-edit-sheet.tsx` (7),
the old sheet/modal files PRF-9/10/13 replace, and `getPublicProfile` in
`profile.action.ts` (superseded by `lib/profile/read.ts`, zero callers), and after
PRF-11/12: `components/profile/profile-view.tsx`, `profile-view-skeleton.tsx`
and `app/(public)/profile/[username]/_components/public-profile-client.tsx`. Listed in
`plan/cleanup/candidates.md` for Niraj; not deleted until approved.

**Done when** the list is in `candidates.md` with a grep showing zero importers
for each file.


## PRF-16 - Sheets lose their section labels

**Status:** done (2026-09-25)

**Why.** Niraj, 2026-09-25, pointing at "ROLE" under "Add a role": "we don't really
need these", and check the other sheets. The small uppercase `FieldGroup` titles
repeat what the field labels already say.

**Files** `components/profile/sheets/profile-sheet.tsx` (`FieldGroup`), and every
sheet using it (project, experience, education, skills, edit-profile, and the resume
import sheet). **Steps** `FieldGroup` keeps the spacing and drops the title row;
where a group's header held an action (project Links / Media "Add"), that action
moves to the field's own label row (`Field aside`).

**Done when** no sheet shows an uppercase section label, and Add link / Add media
still work.

**Outcome.** `FieldGroup` has no title row; groups that need a name pass `label`
(sentence case, like a field label): Links, Media, Your skills, the two Privacy
groups, What it builds. All other section titles removed across the project,
experience, education, skills, edit-profile and import sheets. Typechecked; not
opened in a browser after the change.

## PRF-17 - Several uploaded resumes, a primary, and a Resume pane with tabs

**Status:** built (2026-09-25), awaiting Niraj's browser check

**Why.** Niraj, 2026-09-25: upload as many resumes as wanted; show the uploaded
ones and the ones built on the platform in tabs; cards with a small SVG animation
instead of the two long border lines; Upload opens a dialog with an optional name;
no Replace. Decisions: one PRIMARY file chosen by the user, the newest upload
becoming primary by default; the dialog has "Also make an editable copy in the
Resume Builder", ticked.

**Model.** New table `resume_file` (id, user_id, name, r2_key, mime_type, size,
text, is_primary, created_at). `users.resume` / `users.resume_text` / `has_resume`
stay and always mirror the primary file, so every AI reader keeps working unchanged.
Migration via `pnpm db:generate`; the existing single file moves in as primary with
`pnpm script resume-files` (preview first).

**Files** `packages/db/src/schema/` (table), migration, `src/scripts/resume-files.ts`,
`actions/(main)/user/resume.action.ts` (upload adds a row; list; make primary;
delete, promoting the newest remaining; signed URL per file),
`profile-editor/sections.tsx` (ResumePane), a new upload dialog.

**Edge cases** deleting the primary promotes the newest other file, or clears the
mirror when none is left; a scanned PDF (no text) can be stored but, if made
primary, AI sees no text: say so on its card; a file row whose R2 object is gone
shows "File missing" instead of a broken View; the 5MB / pdf-doc-docx check stays.

**Done when** two uploads show as two cards with the newest primary; Make primary
switches `users.resume_text`; deleting the primary promotes the other; the Created
on platform tab lists the builder drafts with open links; the script moves the
existing file in and re-checks clean.

**Outcome.**
- `resume_file` table (migration `0038_resume_files`, additive, applied on dev;
  production is Niraj's `pnpm db:migrations --apply`). Backfill
  `pnpm script resume-files [--apply]`: on dev it moved 2 users' single resume in as
  primary (both "text only": R2 is not configured locally), re-check clean.
- Actions in `resume.action.ts`: `uploadResume` now adds a row that becomes
  primary (optional `name`, `buildDraft` default true) and returns `hasText`;
  `listResumeFiles`, `setPrimaryResumeFile`, `deleteResumeFile` (promotes the newest
  remaining), `getResumeFileUrl`; `deleteResume` deletes the primary through the new
  path. `syncPrimaryMirror` keeps `users.resume/resume_text/has_resume` equal to the
  primary, so AI readers are unchanged.
- `profile-editor/resume-pane.tsx`: tabs Uploaded / Created on ShipItHQ; cards with
  an animated page (`sh-art-draw` lines, a rising upload arrow or a twinkle) and
  details below; Primary / Text only / No text found tags; menu with View, Make
  primary, Delete (confirmed); upload dialog with drop zone, optional name and
  "Also make an editable copy" (ticked). No Replace.
- Seen rendering in the browser (the migrated file as Primary + Text only). **Not
  browser-verified** (Niraj asked to test himself): upload through the dialog,
  Make primary, Delete, the Created on ShipItHQ tab.
