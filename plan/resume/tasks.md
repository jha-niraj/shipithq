# Resume & cover letter - tasks

Derived from `overview.md`.

`RES-1` through `RES-7` were built on 2026-08-19 before this directory existed;
they are recorded here retroactively so the module has a complete history, and
each was verified before being marked done.

| ID | Task | Serves | Status |
|---|---|---|---|
| RES-1 | `isDefault` on `resume_draft` + auto-default + promote-on-delete | 4 | done (2026-08-19) |
| RES-2 | `resume_structure` worker job: extracted text -> structured draft | 2, 3 | done (2026-08-19) |
| RES-3 | Wire upload -> job, from profile and onboarding | 2, 7 | done (2026-08-19) |
| RES-4 | `get_my_resume` assistant tool with fallback chain | 5 | done (2026-08-19) |
| RES-5 | Cover letter reads the default resume | 5 | done (2026-08-19) |
| RES-6 | Upload path in the resume hub + set-default UI + real blank | 1, 4 | done (2026-08-19) |
| RES-7 | Tailor from a job URL, not only pasted text | 6 | done (2026-08-19) |
| RES-8 | Delete dead code | 9 | done (2026-08-20) |
| RES-9 | Move the last four inline LLM calls to the worker | 3 | done (2026-08-27) |
| RES-10 | Editor form: real components, real dates, real scrolling | - | done (2026-08-25) |
| RES-11 | Bullets are bullets, everywhere | - | done (2026-08-25) |
| RES-12 | Contact row and links on the rendered resume | - | done (2026-08-25) |
| RES-13 | Social links entered on the resume reach the profile | - | done (2026-08-25) |
| RES-14 | Preview hierarchy | - | done (2026-08-25) |
| RES-15 | AI Tools becomes a column; scrape refuses login walls | - | done (2026-08-25) |
| RES-16 | The generated PDF, and the profile write-back | - | done (2026-08-25) |
| RES-17 | Scrape quality, the worker dispatch, and the AI panel | - | done (2026-08-25) |
| RES-18 | Delete the two superseded resume files | 9 | done (2026-08-27) |
| RES-19 | Correct `docs/resume-system.md` against the shipped schema | - | done (2026-08-27) |
| RES-20 | New Resume sheet scrolls, footer pinned | - | done (2026-09-25) |
| RES-21 | Hub: card actions in a menu, bigger cards, base tabs | - | done (2026-09-25) |
| RES-22 | Origin filters, and duplicating keeps the origin | - | done (2026-09-25) |
| RES-23 | AI Import becomes a sheet on the hub | 1 | done (2026-09-25) |
| RES-24 | Public resume links (`/r/<slug>`) readable signed-out | - | done (2026-09-25) |
| RES-25 | `getPublicResumeByUsername` leaks private projects | - | done (2026-09-25) |

Credit charging for this module's operations is tracked in
`plan/credits/tasks.md` as `CR-4` through `CR-8`.

---

## RES-1 - Default resume

**Status:** done (2026-08-19)

`resume_draft.isDefault` + index (migration `0008`). First draft auto-defaults;
`setDefaultResumeDraft` swaps atomically via `db.batch`; deleting the default
promotes the most recently updated survivor.

**Edge cases handled**
- Two defaults or none is unreachable - both statements are in one batch.
- The worker decides whether to claim the default slot at write time, not
  dispatch time: minutes pass before the alarm, and the user may have set one by
  hand in between.
- Ownership is re-checked before the write; `id` arrives from the client.

**Verified:** column and index confirmed live in Postgres; `tsc` clean.

---

## RES-2 - `resume_structure` worker job

**Status:** done (2026-08-19)

Durable Object + Alarm, registered in all four required places (`JOB_TYPES`,
`JOB_BINDINGS`, `jobs/index.ts`, `wrangler.jsonc` binding + migration tag `v2`).

**Edge cases handled**
- Text under 200 chars is rejected as unreadable rather than spending a `gpt-4o`
  call to hallucinate a resume from a scanned PDF.
- Output normalised: all six sections guaranteed to be arrays.
- Name and email fall back to the account when the resume omits them.
- 4xx from OpenAI is non-retryable; transport and 5xx retry.

**Bug found while verifying:** `chatJSON` always sets
`response_format: json_object`, which OpenAI rejects with a 400 unless the prompt
contains the word "json". The prompt did not. Fixed by adding the explicit JSON
shape to the system prompt.

**Verified:** generated a real PDF, ran it through `unpdf` and the live OpenAI
API - correct dates, `current` flags, and all six sections.

---

## RES-3 - Upload wired to the job

**Status:** done (2026-08-19)

`uploadResume` dispatches `resume_structure` after persisting text, from all
three of its success paths. Onboarding passes a draft name.

**Edge cases handled**
- Extractor now dispatched on file type; a DOCX no longer runs through the PDF
  parser first.
- No text extracted (scanned PDF) means no job dispatched - no wasted call.
- `singleFlight: true`: re-uploading twice in a minute is a correction, not a
  request for two resumes, and the job re-reads the newest text at alarm time.
- Dispatch failure is best-effort and never fails an upload that succeeded.

---

## RES-4 - `get_my_resume` tool

**Status:** done (2026-08-19)

Fallback chain: default draft -> newest draft -> raw uploaded text -> honest
"none" with a suggestion to upload. Bullets and sections capped so a long resume
does not dominate context on every turn.

---

## RES-5 - Cover letter reads the resume

**Status:** done (2026-08-19)

Was building its "Applicant Profile" from hand-entered profile rows only, so a
user who had only uploaded a PDF got a letter written from nothing.

---

## RES-6 - Hub upload path, set-default UI, real blank

**Status:** done (2026-08-19)

Fourth create source (Upload), star button and Default badge per card, and
"Blank" now actually creates a blank resume - it previously called
`createDraftFromProfile` and returned a profile-filled resume while claiming
otherwise.

---

## RES-7 - Tailor from a job URL

**Status:** done (2026-08-19)

Reuses the Exa-backed `extractJobDescription` the cover letter flow already had.
Does not overwrite a job title the user has already typed.

---

## RES-8 - Delete dead code

**Status:** done (2026-08-20)
**Serves:** definition-of-done 9

**Why.** ~2,230 lines that nothing imports. Every one of them is a file a future
reader has to open, understand and rule out.

**Approved for deletion** (Niraj, 2026-08-20 - "delete the marketplace as well,
anything not directly related to the core features"):

| File | Lines | Why it is dead |
|---|---:|---|
| `app/(main)/ai/resume/_components/resume-hub-client.tsx` | 458 | superseded by `resume-hub.tsx`; the page renders `ResumeHub` |
| `app/(main)/ai/resume/_components/resume-creator-tabs.tsx` | 302 | superseded; `/ai/resume/create` now redirects to `/ai/resume` |
| `app/(main)/ai/resume/_components/experience-tab-form.tsx` | 519 | only imported by `resume-creator-tabs` |
| `app/(main)/ai/resume/_components/education-tab-form.tsx` | 294 | only imported by `resume-creator-tabs` |
| `app/(main)/ai/resume/_components/skills-tab-form.tsx` | 213 | only imported by `resume-creator-tabs` |
| `app/(main)/ai/resume/_components/socials-tab-form.tsx` | 188 | only imported by `resume-creator-tabs` |
| `app/store/resumeCreatorStore.ts` | - | only imported by `resume-creator-tabs` |
| `actions/(main)/ai/resume-scrape.action.ts` | 464 | duplicate of `resume-import.action.ts`, nothing imports the file |
| `actions/(main)/ai/resume-marketplace.action.ts` | 227 | marketplace, never wired up; cut as non-core |
| `lib/resume-extractor.ts` | 52 | superseded by `resume-extractor.client.ts`; no importers |
| 4 exports in `actions/(main)/ai/resume-import.action.ts` | - | `importFromText`, `importFromLinkedIn`, `importFromUrl`, `importFromGitHub` - no callers |

**Must NOT be deleted**
- `app/(main)/ai/resume/_components/projects-tab-form.tsx` - looks like a sibling
  of the other tab-forms but is still imported by
  `components/profile/sheets/add-project-sheet.tsx`.

**Edge cases**
- **Name collision.** `importProfileAndCreateDraft` is exported by BOTH
  `resume-scrape.action.ts` and `resume-import.action.ts`. The live callers
  import from `resume-import`. Confirm the import specifier, not the symbol, or
  the wrong file gets deleted.
- **The marketplace tab in `resume-hub.tsx`** renders community templates from
  `getResumeTemplates` (in `resume-draft.action.ts`), which stays. Only the
  purchase/list/delist actions go. Confirm the tab still renders.
- **`resumeTemplate` / `templatePurchase` tables stay.** Deleting actions is not
  deleting schema; a data-destroying migration is not part of this task.
- **`moduleEnum` in the credits schema references `RESUME_TEMPLATE`.** Untouched.
- **Delete in dependency order** and typecheck after, so a missed importer is a
  compile error rather than a runtime 500.

**Done when**
`tsc --noEmit` passes in `apps/main`, `/ai/resume` renders with all tabs, and
`grep -rn` finds no importer of any deleted path.

---

## RES-9 - Move the last four inline LLM calls to the worker

**Status:** done, verified 2026-08-27
**Serves:** definition-of-done 3 (parsing never blocks a request), generalised to
every model call in the module

**History.** This task was written on 2026-08-20 naming five functions and
deferred. Two of the five have since moved as part of other work and the task
text was never updated, so it overstated what is left. Corrected 2026-08-27
against the code:

| function | where it runs today |
|---|---|
| `generateAndSaveCoverLetter` | **worker** - `cover_letter` job |
| `tailorResumeForJD` | inline, but **dead** - no callers, deleted by RES-18 |
| `createTailoredResume` (its replacement) | **worker** - `resume_tailor` job |
| `scoreResumeAgainstJD` | **inline** - `gpt-4o-mini`, `resume-draft.action.ts:451` |
| `generateCoverLetterQuestions` | **inline** - `gpt-4o`, `cover-letter.action.ts:253` |
| `importAndCreateDraft` | **inline** - Exa + `gpt-4o`, `resume-import.action.ts:114` |
| `importProfileAndCreateDraft` | **inline** - Exa + GitHub + `gpt-4o`, `:253` |

So four functions remain, needing **three** new job types.

**Why.** `CLAUDE.md`: *anything that calls an LLM, or sleeps waiting on somebody
else's API, runs in `apps/worker`.* The two import actions are the worst
offenders in the whole product against that rule, and not marginally: before the
model is even called, `importProfileAndCreateDraft` makes up to four sequential
Exa `getContents` calls each carrying a `livecrawlTimeout: 10000`, plus three
GitHub REST round trips and three more for languages. That is up to 40 seconds of
someone else's API before an 8,000-character `gpt-4o` pass begins - on a request
Cloudflare kills long before it returns, after `withCredits` has already taken 20
credits. RES-17 proved this class of failure is not theoretical: `background_job`
had been recording `resume_tailor` failures for four days.

`scoreResumeAgainstJD` is the mildest of the four and still worth moving. It also
writes `jdSnapshot` onto the master resume, which pollutes a row that is supposed
to be job-agnostic - fixed in passing here.

**Files**
- new: `apps/worker/src/jobs/resume-ats-score.ts`
- new: `apps/worker/src/jobs/cover-letter-questions.ts`
- new: `apps/worker/src/jobs/resume-import.ts`
- edit: `packages/db/src/schema/worker.ts` - three entries in `JOB_TYPES`
- edit: `apps/worker/src/env.ts` - three entries in `JOB_BINDINGS`, plus
  `EXA_API_KEY` and `GITHUB_TOKEN` on `Env`
- edit: `apps/worker/src/jobs/index.ts` - three exports
- edit: `apps/worker/wrangler.jsonc` - three bindings + a `v4` migration tag
- edit: `apps/worker/.env.example`, `apps/worker/README.md`
- edit: `apps/main/actions/(main)/ai/resume-draft.action.ts`
- edit: `apps/main/actions/(main)/ai/cover-letter.action.ts`
- edit: `apps/main/actions/(main)/ai/resume-import.action.ts`
- edit: `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`
- edit: `apps/main/app/(main)/ai/resume/_components/cover-letter-client.tsx`
- edit: `apps/main/app/(main)/ai/resume/_components/resume-hub.tsx`
- edit: `apps/main/app/(main)/ai/resume/import/_components/import-client.tsx`

**Steps**
1. Three job classes extending `JobDurableObject`, each implementing `run()` and
   nothing else, following `resume-tailor.ts` as the model.
2. Register each in all four required places. All four or none - `jobStub` throws
   loudly on drift, which is the designed behaviour, but only after dispatch.
3. Each action pre-creates whatever row the client will poll and open, then
   dispatches with `startBackgroundJob(type, pointerInput, { cost })`. The
   `withCredits` wrapper comes out: the hold is taken by `startBackgroundJob` and
   settled or released by `getBackgroundJobStatus` on the first terminal status.
   Prices are unchanged and still read from `priceOf`.
4. Each call site swaps its `await` for `useBackgroundJob` / `awaitBackgroundJob`.

**Edge cases**
- **`input` must be a pointer, not a payload.** The README's rule. The import
  jobs therefore carry the URLs and the draft id, and do their own scraping
  inside the alarm - which is the point, since the scraping is most of the wait.
- **The imports need `EXA_API_KEY` and a GitHub token in the worker**, which it
  does not have today. Both go on `Env` and in `.env.example`. A missing key must
  fail the job loudly at the start of `run()`, not produce an empty scrape that
  looks like a private profile - `importProfileAndCreateDraft` already swallows
  every fetch error with `.catch(() => '')`, so an unset key would currently read
  as "could not extract data from any source" and refund, hiding a config error
  behind a user-facing message about their profile being private.
- **The two import actions charge on different rules and both must survive the
  move.** `importAndCreateDraft` returns before the hold when no source produced
  text (so a dead URL is free), and treats a failed draft insert as a refund
  because the saved draft IS the product. `importProfileAndCreateDraft` charges
  when only *some* sources succeed, because the model still ran. Neither rule is
  a hold-system default; both have to be written into the job's throw/return
  behaviour deliberately. See CR-6.
- **A pre-created row changes what a refund means.** `createTailoredResume`
  already sets the precedent: the row exists before the job so the user can open
  it immediately and a failure leaves something usable. For an import there is no
  useful partial - an empty draft is worse than no draft - so the import jobs
  create the draft at the END of `run()`, and a failed job leaves the list
  unchanged. This is the opposite call to tailoring and is deliberate.
- **`scoreResumeAgainstJD` must keep treating 0 as a valid score.** CR-5's edge
  case, and the reason the existing guard is `typeof === 'number'` rather than a
  truthiness test. It survives the move verbatim.
- **`jdSnapshot` stops being written to the master draft.** The score still
  persists to `atsScore`; the JD text belongs to the scoring attempt, not to a
  job-agnostic resume. Confirm nothing reads `jdSnapshot` before dropping the
  write.
- **The ATS score arrives asynchronously now**, into a panel RES-17 already had
  to fix for exactly this reason: the score used to land off-screen with nothing
  changing to say it had. A job makes the gap longer, so the panel needs a
  visible pending state, not just a result slot.
- **Do not change a prompt, a model or a temperature in this task.** The
  `cover_letter` and `resume_tailor` moves both state this explicitly and it is
  what made them reviewable - a move that also reworded a prompt cannot be told
  apart from a regression.
- **`extractJobDescription` stays inline, deliberately.** It is one Exa call with
  no model behind it, and it is interactive: the user pastes a URL and watches the
  JD box fill. Routing a ~5 second fetch through a Durable Object and a poll loop
  would make it slower and worse. The rule it is being measured against is about
  calls that do not fit in a request; this one does.
- **`wrangler.jsonc` needs a NEW migration tag** (`v4`), not an addition to `v3`.
  Editing a shipped tag is the failure mode that leaves the deployed classes and
  the declared ones disagreeing.

**Done when**
`grep -rn "openai\." "apps/main/actions/(main)/ai/"` returns nothing outside
`extractJobDescription`'s file-level import; each of the three new types appears
in `JOB_TYPES`, `JOB_BINDINGS`, `jobs/index.ts` and `wrangler.jsonc`; an import
run end to end produces a draft and one settled hold; and a forced failure in
each of the three leaves the balance unchanged with a refund row.

---

### Outcome

Three job classes, four actions turned into dispatchers, four call sites moved
onto `awaitBackgroundJob`. The prompts, models and temperatures are unchanged;
`resume_ats_score` additionally stops writing `jdSnapshot` to the master resume,
as the task specified. Confirmed first that nothing READS `jdSnapshot` - the only
other writers are the tailoring paths, where a JD snapshot on a job-specific
draft is correct.

**The registration list in `apps/worker/README.md` was wrong, and a shipped job
was broken by it.**

This is the finding worth keeping. The README said adding a job type is "four
edits, all four or none": `JOB_TYPES`, the class, `JOB_BINDINGS` +
`jobs/index.ts`, and the wrangler binding + migration tag. There is a **fifth**:
Wrangler binds a Durable Object by looking the class up on the **entry module's**
exports, and `src/index.ts` has its own export list.

`ResumeStructure` was correct in all four of the places the list named and absent
from the fifth. So `RESUME_STRUCTURE` has been bound, since RES-2, to a class the
entry point never exported - the binding has nothing behind it. That job is the
one behind every resume upload, onboarding included.

Nothing catches this. `tsc` passes, the binding type-checks, `jobStub` finds a
namespace, and the failure only surfaces at dispatch - after the app has inserted
the `background_job` row and put a hold on the user's credits. It is very likely a
second, still-live cause of the `resume_structure` failures RES-17 investigated
and attributed entirely to the `callWorker` realm bug.

Fixed three ways: the class is exported, the README now says five edits and
explains the fifth, and `CLAUDE.md`'s one-line summary was corrected to match. A
cross-check script run afterwards confirms **all 13 job types are present in all
five places**.

**Two more defects found in the call sites, both fixed here:**

1. **`resume-hub.tsx` would have navigated to `/ai/resume/draft/undefined`.** Its
   `result` is declared as a hand-written type with an optional `draft`, so
   assigning the new dispatch result compiled cleanly and then read `undefined`
   at runtime. `tsc` cannot see this - the annotation is wider than either shape.
   The import branch now follows its job and returns, the way the upload branch
   already did, instead of falling through to a shared success path that expects
   a draft id.
2. **The import page's progress bar was a timer, not progress.** Five invented
   captions advanced by `setInterval` every 4 seconds: on a fast import it
   claimed to be scraping LinkedIn after the resume was saved, and on a slow one
   it sat at "Finalising" for a minute. Replaced with the job's four real phases,
   thresholds mirroring the `progress()` calls in the job.

**Deliberately left inline, with reasons:**

- `extractJobDescription` - one Exa fetch, no model, and interactive: the user
  pastes a URL and watches the JD box fill. A ~5 second fetch behind a Durable
  Object and a poll loop is slower and worse. Named in the task.
- `whisperTranscribe` - `whisper-1` on a short voice answer in the cover letter
  form. A speech model rather than an LLM, free, sub-second on a clip that size,
  and interactive in the same way. Found during the final sweep and judged the
  same call; recorded here so the next reader does not have to re-derive it.

**Known consequence, not a defect.** The hub card's ATS badge now updates on the
next navigation rather than immediately, because the score is written by the
worker and the action no longer calls `revalidatePath`. A `router.refresh()`
after scoring was considered and rejected: it would remount the editor mid-session
and cost the user any unsaved form state, which is a worse trade than a badge
that is one navigation behind.

**Needs configuration before this works in production:** `EXA_API_KEY` and
`GITHUB_TOKEN` on the worker. Both are in `apps/worker/.env.production.example`
with what they are for. The import job fails loudly on a missing `EXA_API_KEY`
rather than scraping nothing - without that guard an unset key would reach the
user as "make sure your profiles are public", sending them to fix something that
is not broken.

**Verified:** `npx tsc --noEmit` clean in `apps/main`, `apps/worker` and
`packages/db`; all 13 job types confirmed present in all five registration points
by script; `grep -rn "openai" "apps/main/actions/(main)/ai/"` returns only
`whisper.action.ts`'s REST call; `grep -rn -e "-" -e "-"` (em/en dash check)
clean across `apps` and `packages`.

**Not verified:** an end-to-end run of any of the three jobs against the live
worker. That needs `EXA_API_KEY` on the worker and a `wrangler deploy` with the
`v4` migration tag, neither of which this pass did. The credit-refund path is
inherited unchanged from `startBackgroundJob` / `getBackgroundJobStatus`, which
`cover_letter` and `resume_tailor` already exercise in production.

---

## RES-10 - Editor form: real components, real dates, real scrolling

**Status:** done, verified 2026-08-25

**Why.** The editor form is built from primitives the rest of the product does
not use. A raw `<input type="checkbox">` renders the OS checkbox (Image #77); a
raw `<Input type="date">` renders the OS date picker, which on macOS Chrome is a
blue-accented calendar that ignores the monochrome palette entirely (Images #76,
#80); and both the summary and the bullets textareas scroll with a native
scrollbar in a product that uses `ScrollArea` everywhere else (Images #75, #78,
#79). None of these are cosmetic preferences - they are the four places the
editor stops looking like the app it is in.

**Files**
- `packages/ui/src/components/ui/textarea.tsx` - scrolling
- `packages/ui/src/components/ui/month-picker.tsx` - NEW
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx` - all call sites
- `apps/main/components/profile/sheets/add-work-experience-sheet.tsx`
- `apps/main/components/profile/sheets/add-education-sheet.tsx`
- `apps/hiring/app/(main)/applications/[jobSlug]/application-detail-sheet.tsx`

**Steps**
1. `Textarea` grows to fit its content and is wrapped in a `ScrollArea` that caps
   the height. A `<textarea>` is a leaf element - a `ScrollArea` cannot go inside
   one - so the only way to get a styled scrollbar is to stop the textarea
   scrolling at all and let a wrapper do it.
2. New `MonthPicker`: a `Popover` + `Calendar` + month/year dropdowns, controlled,
   emitting the same ISO string the callers already store.
3. Replace all 9 `type="date"` inputs and the 1 native checkbox.

**Edge cases**
- `Textarea` is used with `className="h-24"` / `h-20` / `resize-none` at several
  call sites. A fixed `h-*` on the wrapper must still cap the scroll area, and
  `resize-none` must not be silently dropped.
- The auto-grow must run on `value` change, not only on input, or a
  programmatic set (AI rewrite, profile sync) leaves the box the wrong height.
- Resume dates are stored as full ISO strings but only ever displayed as
  month + year. The picker must round-trip without shifting the day across a
  timezone boundary - `new Date('2026-08-01')` is UTC midnight, which is the
  previous month in any negative offset.
- `add-work-experience-sheet` binds through a `field()` helper that spreads
  `value`/`onChange`. A component with an `onValueChange` API cannot be spread
  into; those two call sites need explicit props.

**Done when**
`grep -rn '<input[^>]*type="\(date\|checkbox\)"' apps` returns nothing outside a
file input, `tsc --noEmit` passes in `apps/main`, `apps/hiring` and
`packages/ui`, and the editor's date fields open the app's own calendar.

---

## RES-11 - Bullets are bullets, everywhere

**Status:** done, verified 2026-08-25

**Why.** Image #78 and #79: a summary and a set of bullet points are being typed
as one run-on paragraph, and the preview renders them as one, because the only
affordance is a bare textarea whose label says "one per line". The rendered
resume then shows a single 6-line bullet (Image #81), which is the one shape a
resume must never have. Anything that reads as a list must be entered as a list
and rendered as a list.

**Files**
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`
- `packages/db/src/resume.ts` - `renderResumeText`, if it joins bullets

**Steps**
1. A `BulletsEditor` that shows one row per bullet with its own control, rather
   than a textarea the user is asked to format by hand.
2. The header summary stays prose - a summary IS a paragraph - but the preview
   must respect its line breaks instead of collapsing them.

**Edge cases**
- Existing drafts hold bullets that were split on `\n` from pasted prose, so a
  single 400-character "bullet" is real data. The editor must not truncate it.
- An empty row must not be persisted as an empty bullet, and must not be
  filtered while the user is still typing in it (the comma bug, again).

**Done when**
Pasting a paragraph into the summary keeps its line breaks in the preview, and
each bullet is a separate row in the form and a separate `•` line in the preview.

---

## RES-12 - Contact row and links on the rendered resume

**Status:** done, verified 2026-08-25

**Why.** Image #75: the header renders raw URLs as plain grey text -
`https://github.com/jha-niraj` and `https://linkedin.com/in/nirajjha31` - which
wrap onto two lines, dominate the contact row, and are not clickable. A resume
is read as a PDF and as a web page; on both, a link should be an icon plus the
handle. Companies also have official sites worth linking, and there is nowhere
to put one.

**Files**
- `packages/db/src/resume.ts` - add `companyUrl` to `ResumeExperienceEntry`
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`
- `apps/main/actions/(main)/ai/resume-profile-sync.action.ts`

**Steps**
1. Contact row renders an icon plus the handle (`jha-niraj`, not the URL), each
   an external link.
2. Add `companyUrl` to the experience entry, a field in the form, and a linked
   company name in the preview.
3. Project `github` / `liveUrl` get the same icon treatment.

**Edge cases**
- `companyUrl` is a NEW key on a jsonb column that `apps/worker` also reads.
  Optional only - every existing draft lacks it.
- A user may type `github.com/x`, `@x` or a bare handle. Deriving the display
  handle must not throw on a string that is not a URL.

**Done when**
The contact row is one line of icons and handles, every one opens in a new tab,
and a company with a URL renders as a link.

---

## RES-13 - Social links entered on the resume reach the profile

**Status:** done, verified 2026-08-25

**Why.** The import page already writes GitHub / LinkedIn / Twitter / website
back to `users` via `saveMyProfileLinks`. The editor's header form collects the
same four things and throws them away, so the profile stays empty and the next
sync has nothing to give - which is exactly why Sync Profile was a no-op on a
real account.

**Files**
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`
- `apps/main/actions/(main)/user/profile-links.action.ts`

**Steps** Save writes the header's link fields through `saveMyProfileLinks`
alongside the draft.

**Edge cases**
- `saveMyProfileLinks` only writes non-empty values, so clearing a link in the
  resume must not clear it on the profile. That is deliberate and stays.
- It must never fail the save. The draft is what the user asked to persist.

**Done when**
Typing a GitHub URL in the editor header and saving makes it appear on
`/profile`, and `select github_url from "user"` shows it.

---

## RES-14 - Preview hierarchy

**Status:** done, verified 2026-08-25

**Why.** Image #81: every section heading is the same size, weight and colour, so
EXPERIENCE, SKILLS, PROJECTS and EDUCATION all read at one level, and the entry
titles inside them compete with the headings. A resume is skimmed, and the
skimming depends entirely on that contrast.

**Files** `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`

**Done when** Section headings, entry titles, meta lines and body text are four
visibly distinct levels in the preview.

---

## RES-15 - AI Tools becomes a column; scrape refuses login walls

**Status:** done, verified 2026-08-25

**Why.** Four defects found together while tailoring a resume:

1. **Five toasts for one action.** `createDraftFromProfile` returns a
   `missingFields` array of six checks, and the hub did
   `missingFields.forEach(toast.warning)`. An empty profile therefore fired five
   warning toasts and then a success toast on top of them - a stack of red that
   reads as five failures when nothing had failed.
2. **A login wall returned as a job description.** Exa fetched a LinkedIn jobs
   URL and got LinkedIn's sign-in page back. It was not empty, so the only guard
   (`if (!jd)`) passed and the wall was pasted into the JD box, in front of a
   button offering to spend 20 credits tailoring against the words "Sign in".
3. **AI Tools was a Sheet**, so it covered the resume - the one thing you need to
   see while tailoring - and its `sm:max-w-md` cap clipped the
   "Tailor This Resume (20 credits)" button at the panel edge.
4. **Summary spacing.** `white-space: pre-line` rendered the blank line between
   paragraphs as a full empty line, so the preview's summary ran ~28px taller
   than the same text needs.

**Files**
- `apps/main/app/(main)/ai/resume/_components/resume-hub.tsx`
- `apps/main/actions/(main)/ai/cover-letter.action.ts`
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`

**Edge cases**
- A LinkedIn `/jobs/search-results/` URL is the wrong page even WITH a session -
  it lists jobs rather than being one - so it gets its own message.
- The wall check must not reject a short but real posting on length alone; a
  marker has to be present too.
- Three full-width columns do not fit at 1512px. The form pane narrows when the
  tools column opens, for the same reason `layout.tsx` collapses the sidebar
  when the AI rail opens.

**Done when**
Creating a resume shows one toast; fetching a LinkedIn search URL returns an
error naming the problem; the tools panel narrows the preview instead of
covering it; `tsc --noEmit` passes in all eight packages.

---

## RES-16 - The generated PDF, and the profile write-back

**Status:** done, verified 2026-08-25

**Why.** A downloaded PDF (`swe.pdf`) exposed seven defects, and Save was still a
one-way street.

**PDF, both templates**
1. `@react-pdf` renders `\n` literally, so each blank line between summary
   paragraphs became a full empty line. Three of them pushed a one-page resume
   onto two.
2. No `lineHeight` on the page style, so body leading was loose enough that a
   four-line bullet read as four separate sentences.
3. The contact row printed raw URLs (`https://github.com/jha-niraj`) as dead
   text. The file contained **zero** `/URI` annotations - nothing was clickable.
4. `minPresenceAhead` was absent, so "PROJECTS" printed alone at the bottom of
   page 1 with every project on page 2.
5. `formatDate` used `new Date(iso)`, which parses a bare ISO date as UTC
   midnight - the previous month in any negative offset.
6. `developer-pro`'s sidebar headings used `ACCENT` (`#171717`) on `SIDEBAR_BG`
   (`#171717`): **1.00:1**, invisible. "CONTACT", "SKILLS", "EDUCATION" and
   "CERTIFICATIONS" simply did not appear.
7. `developer-pro`'s contact glyphs (`✉ ✆ ⌖ ⌁ ⊕`) are outside the WinAnsi
   charset of the built-in Helvetica, so each rendered as nothing.

Also: project `liveUrl` was dropped by `clean-minimal` and `github` by
`developer-pro`; education `field` was collected and never printed.

**Save -> profile.** `syncProfileToResumeDraft` read the profile into a draft and
nothing went the other way, so the editor was write-only: a whole career typed
into a resume left the profile empty, which is what made Sync Profile a no-op.

**Files**
- `apps/main/lib/resume-links.ts` - NEW, shared by all three renderers
- `apps/main/lib/resume-pdf/{clean-minimal,developer-pro}.tsx`
- `apps/main/actions/(main)/ai/resume-to-profile.action.ts` - NEW
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`

**Edge cases**
- Write-back must NEVER delete: a resume is often a deliberately trimmed view of
  a career, and trimming one must not destroy the record.
- A draft entry's `id` is a DB id only when it came from a profile sync, so
  matching is on content. The key must include the START DATE and each matched
  row must be consumed - a real draft held two stints at one company under one
  title, and on (company, role) alone the second overwrote the first.
- Tailored drafts (`tailoredFor` set) are skipped: gpt-4o reworded them for one
  posting and that must not become the canonical history.
- `skills.category` is an 11-value pg enum; an unmapped group is skipped rather
  than guessed into the wrong bucket.
- `start_date` is NOT NULL on all three tables; an entry without one is skipped,
  never defaulted to today.
- Display type needs its own `lineHeight` once the page sets one, or a 22pt name
  inherits a line box shorter than its glyphs and the title rides up into it.

**Done when**
The rendered PDF is 1 page with 14 link annotations (was 2 pages, 0); sidebar
headings measure 7.11:1; saving twice inserts once and updates thereafter;
`tsc --noEmit` passes in all eight packages.

---

## RES-17 - Scrape quality, the worker dispatch, and the AI panel

**Status:** done, verified 2026-08-25 - **but finding 1 was only half fixed. See
the correction immediately below.**

> ### Correction, 2026-08-27: `callWorker` was fixed on one path of two
>
> This task diagnosed the `[object Request]` realm bug correctly and fixed the
> **HTTP fallback**. It left the **service-binding path** still building a
> `Request`, on the reasoning recorded below that "the binding path still builds
> a `Request` because a Fetcher's contract requires one".
>
> That reasoning is wrong. `Fetcher.fetch` takes the same `(input, init)`
> signature as global fetch and accepts a string URL. What made it look right was
> this repo's own `ServiceBinding` interface, which declared
> `fetch: (request: Request) => Promise<Response>` - a narrow local type standing
> in as evidence for a claim about Cloudflare's API.
>
> `apps/main/wrangler.jsonc` declares a `WORKER` service binding, so the binding
> path is the one taken whenever the Cloudflare context resolves. A
> `goal_creation` dispatch on 2026-08-27 failed with the identical
> `Failed to parse URL from [object Request]`, two days after this task was
> marked verified.
>
> Fixed in `srs/core-modules/pathfinder/02-worker-migration.md` under PF-W4, which
> also records the second cause this masked: `WORKER_API_URL` in the local env
> pointed at `:3004`, so even the corrected HTTP path dispatched to a port with
> nothing on it. **Three layered causes, one symptom.**
>
> **Why the verification did not catch it:** this task's "Done when" was
> *"`background_job` stops recording 'Failed to parse URL from [object Request]'"*
> - a check on the ABSENCE of new failures, which passes trivially if nobody
> dispatches a job. No job was run. The first job this product ever completed was
> on 2026-08-27.

**Why.** Four separate defects from one tailoring session.

1. **`callWorker` broke EVERY background job.** The HTTP fallback was
   `fetch(buildRequest(...))`, and `next dev` polyfills the global `Request` with
   its own class - so the object was not the `Request` undici recognises. undici
   treated a non-Request input as a URL, called `String()` on it, got
   `"[object Request]"` and failed to parse it. Reproduced exactly in node. The
   request never reached the network, so the message named a URL problem for what
   was a realm mismatch. `background_job` showed `resume_tailor`,
   `resume_structure` and `project_generation` all failed with that one string
   over four days. Fixed by passing `(url, init)`; the binding path still builds a
   `Request` because a Fetcher's contract requires one. `callExecutorWorker` had
   the same bug.

2. **The scrape returned the whole LinkedIn page.** The wall check let a real
   posting through, but what came back was the advert plus 25 "Similar jobs", 25
   "Similar Searches", "People also viewed" and a footer - roughly 90% furniture.
   That text was the INPUT to gpt-4o for both ATS scoring and tailoring, which is
   what returned `0/100` with "missing keywords" like *based in Bangalore* and
   *immediate joiners*. The user was charged 5 credits for an answer computed
   from noise and offered a 20-credit rewrite against the same noise.

3. **`res.title` went straight into the Job Title field**, so the job being
   applied for was recorded as "Founding Backend Engineer at Mopid <emdash>
   Bengaluru, Karnataka, India | LinkedIn Jobs".

4. **The AI panel showed its results below the fold**, and the ATS score arrived
   off-screen with nothing on screen changing to say it had.

Also: a duplicate React key (`w-20` appeared twice in a literal array in the
editor's `loading.tsx`) warned five times per render, and `key={g.category}` on
skill groups had the same hazard in four files - nothing stops a user creating
two groups with one name.

**Files**
- `apps/main/lib/workers/client.ts`
- `apps/main/actions/(main)/workers/jobs.action.ts`
- `apps/main/actions/(main)/ai/cover-letter.action.ts`
- `apps/main/app/(main)/ai/resume/_components/resume-editor.tsx`
- `apps/main/app/(main)/ai/resume/draft/[id]/loading.tsx`
- `apps/main/app/(main)/r/[slug]/page.tsx`, `lib/resume-pdf/*.tsx`
- `packages/ui/src/components/ui/textarea.tsx`

**Edge cases**
- The cleaner is CONSERVATIVE: an unrecognised layout keeps its text, and a clean
  that strips below 200 chars returns the raw text instead. Losing part of a real
  posting is worse than leaving boilerplate in - the user can see and delete
  boilerplate but cannot restore a requirement that was silently cut.
- Dash characters must be matched in scraped titles but are banned in this
  codebase's source, so those character classes are written `—–`.
- Radix `ScrollArea` defaults to `type="hover"`; on a text field that means the
  bar only appears once the pointer is already inside, so overflowing content
  just looks cut off. The shared `Textarea` now passes `type="auto"`.

**Done when**
`background_job` stops recording "Failed to parse URL from [object Request]", a
LinkedIn fetch yields the advert alone, the Job Title field reads
"Founding Backend Engineer", and no duplicate-key warning appears.

---

## RES-18 - Delete the two superseded resume files

**Status:** done, verified 2026-08-27
**Serves:** definition-of-done 9

**Why.** Two files in this module are dead in the way RES-8 was written to
prevent, and both are the *name-collision* shape that RES-8's own edge-case
section warned about - a symbol search says they are used, an import-path search
says nothing reaches them.

| File / symbol | Lines | Why it is dead |
|---|---:|---|
| `actions/(main)/ai/resume-template.action.ts` | 205 | Exports `getResumeTemplates`, and so does the live `resume-draft.action.ts:68`. Every caller imports from `resume-draft`. Zero importers of this path across `apps` and `packages`. Already listed as `CLN-2` and recorded as deleted on 2026-08-20; the deletion never reached the tree - see `plan/cleanup/candidates.md`. |
| `tailorResumeForJD` in `resume-draft.action.ts:535` | ~95 | Superseded by `createTailoredResume`. The only occurrence of the name anywhere outside its own definition is a comment in `resume-editor.tsx:531` explaining why it was replaced. |

**Steps**
1. Re-verify both by import path, not by symbol, immediately before deleting.
2. Delete the file; delete the function and the imports that only it used.
3. Typecheck `apps/main`.

**Edge cases**
- **The name collision is the whole risk.** `grep -rn getResumeTemplates` returns
  hits in live files. Confirm the import SPECIFIER (`from '.../resume-template'`)
  rather than the symbol, or the wrong file goes. This is the exact trap that
  RES-8 recorded for `resume-scrape.action.ts`.
- **`tailorResumeForJD` is charged.** It calls `withCredits` with
  `resume_tailor_jd`. That price is still live and still correct - it is what
  `createTailoredResume` charges through `startBackgroundJob`. Delete the
  function, **not** the price.
- **`resume-template.action.ts` writes to `resumeTemplate` and
  `templatePurchase`.** Deleting actions is not deleting schema; RES-8 already
  settled that those tables stay. No migration is part of this task.
- **The comment in `resume-editor.tsx:531` explains a live design decision** -
  why tailoring spins off a copy instead of rewriting in place. Rewrite it to
  stop naming a function that no longer exists; do not delete the reasoning.
- **`ResumeDraftContent` and the OpenAI import in `resume-draft.action.ts` may
  become unused** once the function goes, or may not - `scoreResumeAgainstJD`
  uses both until RES-9 lands. Check, do not assume; an unused import is a lint
  error and a wrongly-removed one is a compile error.

**Done when**
`grep -rn "resume-template\|tailorResumeForJD" apps packages` returns only the
rewritten comment, and `cd apps/main && npx tsc --noEmit` passes.

**Outcome.** 338 lines gone: `resume-template.action.ts` (205),
`tailorResumeForJD` and its banner (110), and one thing the plan did not
anticipate.

**Found while deleting:** `resume-draft.action.ts` carried its OWN
`isResumeDraftContent` type guard (23 lines, line 435), private to the file
because `"use server"` modules may only export async functions. Its only caller
was `tailorResumeForJD`. It duplicated the exported guard of the same name in
`packages/db/src/resume.ts`, which is the one the worker and every other consumer
already use - so this was a second copy of a shared invariant, kept alive by one
dead function. Removed with it; nothing else referenced it.

The three imports the plan flagged as *possibly* orphaned all survive:
`ResumeDraftContent` (7 uses), `openai` and `OperationFailed` are still needed by
`scoreResumeAgainstJD` until RES-9 moves it. Checked rather than assumed, as the
edge case required.

**Verified:** `grep -rn "resume-template\|tailorResumeForJD" apps packages`
returns only the rewritten comment in `resume-editor.tsx`;
`cd apps/main && npx tsc --noEmit` exits 0.

---

## RES-19 - Correct `docs/resume-system.md` against the shipped schema

**Status:** done, verified 2026-08-27

**Why.** The doc is the only prose description of how the resume system fits
together, and it describes a column that does not exist. It was written on
2026-08-20 from the branch that called the flag `is_primary`; what merged and
shipped calls it `is_default`. A reader following the doc writes a query that
returns nothing, or worse, adds a second flag.

| doc says | schema says |
|---|---|
| `resume_draft.is_primary` | `resume_draft.is_default` (`aitools.ts:348`) |
| "the draft marked `isPrimary`" | `isDefault` - which is what `lib/resume/primary.ts` already reads |
| migration `0008_big_rhino.sql` | `0008_supreme_supernaut.sql`; there is no `big_rhino` |

**Files** `docs/resume-system.md`

**Steps**
1. Rename the flag throughout. The *concept* - one authoritative resume per user,
   enforced by a partial unique index - is correct and stays; only the identifier
   is wrong.
2. Re-quote the migration from the file that actually exists.
3. Update the "Still to do" section: it says "nothing costs credits", which
   stopped being true when `CR-4`..`CR-6` shipped, and it names
   `tailorResumeForJD` as kept, which RES-18 removes.
4. Leave `PLATFORM_TEMPLATES`' palette note alone - still true, still unfixed.

**Edge cases**
- **`lib/resume/primary.ts` is already correct** and reads `isDefault`. This task
  changes documentation only; a "fix" that renamed the column to match the doc
  would need a migration and would break `setDefaultResumeDraft`, the partial
  unique index and RES-1's whole invariant.
- **The file name `primary.ts` and the type `ResumeSource` keep their names.**
  "Primary resume" is good product language even though the column is
  `is_default`; the doc should say so once rather than leaving the next reader to
  wonder whether they are two things.

**Done when**
`grep -n "is_primary\|isPrimary\|big_rhino" docs/resume-system.md` returns
nothing, and every SQL identifier the doc quotes exists in
`packages/db/drizzle/`.

**Outcome.** Four corrections, one of them bigger than the task expected.

1. `is_primary` -> `is_default` throughout, and `isPrimary` -> `isDefault`.
2. **The migration was not one file, it was two, four apart.** The doc quoted a
   single `0008_big_rhino.sql` containing six statements. What actually shipped:
   `0008_supreme_supernaut.sql` added the flag and a lookup index;
   `0012_aberrant_random.sql`, four migrations later, added `source_draft_id`,
   `tailored_for_company`, `cover_letter.resume_draft_id` and the partial unique
   index `resume_draft_one_default_per_user`. The doc now shows both, and says
   why the gap matters: for four migrations the flag existed with no constraint
   behind it, which is the reason `setDefaultResumeDraft` swaps inside a
   `db.batch` instead of trusting the index to reject a second write.
3. "Still to do" had gone stale in two of its four entries - it said *nothing
   costs credits* (CR-4..CR-8 shipped) and that `tailorResumeForJD` was kept
   (RES-18 deleted it two hours earlier). Both struck through with what replaced
   them rather than deleted, so a reader holding an older copy can tell what
   moved. The `scoreResumeAgainstJD` entry stays and now points at RES-9.
4. Added a short note on why the column is `is_default` while the file that
   reads it is `primary.ts` - the concept and the identifier genuinely differ,
   and leaving that unexplained is what invites a "fix" that renames the column.

**Deliberate exception to the Done-when line.** One `is_primary` remains, in the
sentence explaining that the name never shipped. Removing it would delete the
explanation for the mismatch, which is the thing this task exists to record.

**Verified:** `grep -n "isPrimary\|big_rhino"` returns nothing; both migration
filenames the doc now quotes exist in `packages/db/drizzle/`; no em or en dashes
introduced.


---

# Round two (2026-09-25)

Paths under `apps/main/app/(main)/ai/resume/` unless absolute.

## RES-20 - New Resume sheet scrolls, footer pinned

**Status:** done (2026-09-25)

**Why.** Niraj, 2026-09-25: the Create New Resume sheet "is not scrolling and
button should be sticky to the bottom". `_components/resume-hub.tsx:212` passes
`scroll={false}` (correct, per UI-9) but the body at `:218` is `flex-1 p-6`
with no `min-h-0 overflow-y-auto`, and the Create button lives inside that body.
With five templates the button falls below the fold and nothing scrolls to it.

**Files** `_components/resume-hub.tsx` (NewResumeSheet, lines 84-391).

**Steps** header `shrink-0`; body `min-h-0 flex-1 overflow-y-auto` (or
`ScrollArea`); Create moves to a `shrink-0 border-t` footer with Cancel beside it.
The four "Populate from" tiles become a `TabsList variant="segmented"` or stay
a card picker only if a picker is what reads right - decide in-file, say why.

**Done when** at a 700px-tall window the template list scrolls and the Create
button stays visible throughout.

**Outcome.** Body is `ScrollArea className="min-h-0 flex-1" reflow`; header and
footer are `shrink-0`; the footer is Cancel (ghost) + Create (base Button, the
hand-styled `bg-neutral-900 ... h-11` override removed), right-aligned, with real
padding instead of `pt-0` against the border. The source tiles stay a card
picker: each option carries a description, which a segmented tab cannot.
**Verified** in the browser at 1280x700: the template list scrolls to Modern
Creative and the footer stays on screen throughout.

## RES-21 - Hub: card actions in a menu, bigger cards, base tabs

**Status:** done (2026-09-25)

**Why.** Niraj, 2026-09-25: "the tabs are not perfect and card is also not
perfect so put all the options on the top right button on dropdown ... and
make this somewhat bigger". Today each card has a full-width Edit plus a row of
six unlabelled 28px icon buttons; the tabs are the full-width card variant, so
two tabs stretch across 1300px.

**Files** `_components/resume-hub.tsx` (ResumeCard 394-558, header 624-677),
`loading.tsx`.

**Steps**
1. Tabs: `TabsList variant="segmented" size="sm" fit`, sitting on the same row
   as the filters from RES-22.
2. Card: whole card is the Edit link; top-right `...` `DropdownMenu` with labelled
   items - Download PDF, Set as default, Make public/private, Copy link, Open
   public page (if public), Duplicate, separator, Delete (confirm).
3. Card body: name (2 lines max), tailored-for line, a small template thumbnail,
   badges (Default, origin from RES-22, ATS), updated date. Grid 1/2/3 with
   `min-h` so a card is a little larger than today, not dramatically.
4. The dashed "New" and "Import" tiles go - both live in the header (New Resume
   button + AI Import) and the empty state.
5. Skeleton rebuilt to match.

**Edge cases** menu item clicks must not trigger the card link
(`stopPropagation` on the trigger); keyboard: card focusable, menu reachable by Tab.

**Done when** no icon-only button remains on a card; every action works from
the menu; loading -> loaded has no shift.

## RES-22 - Origin filters, and duplicating keeps the origin

**Status:** done (2026-09-25)

**Why.** Niraj wants to tell imported, uploaded and hand-made resumes apart.
Chosen 2026-09-25: grouped by kind. No schema change - derived from
`imported_from` and `tailored_for`.

**Files** `_components/resume-hub.tsx`; new `lib/resume/origin.ts`;
`actions/(main)/ai/resume-draft.action.ts` (`duplicateResumeDraft`, 405-424).

**Steps**
1. `originOf(draft)`: `tailored_for` set -> Tailored; `imported_from` = `profile`
   -> From profile; `upload` -> Uploaded; any of linkedin/github/twitter/
   portfolio/text -> Imported (with the source list); null -> Created by you.
2. Filter strip: All / Created by you / From profile / Uploaded / Imported /
   Tailored, each with a count, hiding zero-count kinds except All. Filter in
   the URL (`?origin=imported`).
3. Card badge shows the origin; Imported shows small LinkedIn/GitHub/X icons.
4. `duplicateResumeDraft` copies `importedFrom`, `importedUrl`, `sourceDraftId`.

**Edge cases** tailored from an imported draft counts as Tailored only; unknown
`imported_from` values -> Imported with no icons; a filter that becomes empty
after a delete falls back to All.

**Done when** each of the dev account's drafts lands in the right bucket, the
counts sum to the total, and a duplicate shows the same origin as its source.

## RES-23 - AI Import becomes a sheet on the hub

**Status:** done (2026-09-25)
**Serves:** 1

**Why.** Niraj, 2026-09-25: the import page's only job is to start an import,
so it belongs in a sheet. Chosen: sheet on the hub, old URL redirects.

**Files** `import/_components/import-client.tsx` -> `_components/import-sheet.tsx`;
`import/page.tsx` -> `redirect('/ai/resume?import=1')`; `import/loading.tsx`
(delete with the route body); `resume-hub.tsx`, `page.tsx` (fetch
`getMyProfileLinks()` for the prefill).

**Steps**
1. Same form and 4-stage progress inside the PRF-9-style shell (pinned footer:
   cost + Import).
2. Opens from the header's AI Import, from New Resume's "Import" source (which
   today only links away), and from `?import=1`.
3. Job progress in `useResumeHubStore` so closing and reopening the sheet
   resumes the progress view; on success, go to the draft.
4. Remove the now-unreachable `importAndCreateDraft` branch in NewResumeSheet
   only after confirming no other caller (propose if it has none).

**Edge cases** closing mid-job must not cancel it or double-charge on reopen;
failure refunds (worker path unchanged) and puts the inputs back; `?import=1`
is stripped from the URL after opening so a reload does not reopen it.

**Done when** `/ai/resume/import` redirects and opens the sheet prefilled; an
import started, closed and reopened shows live progress and lands on the new
draft; the credit hold settles once.


**Outcome (RES-21, RES-22, RES-23, built together: one row holds the tabs and
the filters, and the card and the import sheet share the hub).**
- Card: the whole card is the Edit link (overlay `<Link>`; the menu sits above it
  at `z-10`); a template thumbnail band; name, "For <job>" when tailored, badges
  (Default, origin with source icons, Public with views, ATS); template and edit
  date. Every action is a labelled item in the `...` menu. Delete now confirms (it
  did not before). `min-h-64`: a little larger, as asked.
- The dashed "New" and "Import" tiles are gone; both live in the header and the
  empty state. The header's stats line went too: the filter counts say the same.
- Tabs: `TabsList variant="segmented" size="sm" fit` for My resumes / Templates,
  and the origin filter is a second segmented list on the same row, scrolling
  sideways on a phone. Kinds with no resumes are hidden; `?origin=` is written with
  `history.replaceState` and read by `page.tsx`.
- `lib/resume/origin.ts` derives the kind; `duplicateResumeDraft` now copies
  `importedFrom`, `importedUrl`, `sourceDraftId`, `tailoredForCompany`.
- Import: `_components/import-sheet.tsx` on the profile sheet shell, always
  mounted so its job state survives closing ("Hide" while running). Opens from the
  header, from New resume's Import tile, and from `?import=1`, which
  `/ai/resume/import` now redirects to; the flag is removed after opening.
- **Verified in the browser** on Niraj's dev account: three drafts classify as
  From profile 2 / Tailored 1; the Tailored filter shows one and writes
  `?origin=tailored`; the menu opens without following the card link; Duplicate
  made a copy that stayed Tailored (2, All 4); Delete asked and removed it (All 3);
  `/ai/resume/import` landed on the hub with the sheet open, links prefilled, URL
  cleaned. **Real import, run later the same day (Niraj approved):** the sheet
  dispatched the job and showed the stage checklist; the local job worker was not
  running, so the dispatch came back `Worker rejected the job (503)`, the sheet
  returned to the filled form with an error toast, the 20-credit hold was
  `released` ("Refund (failed)" in credit history) and the balance was unchanged.
  The success path needs `apps/worker` running with its keys (it has no
  `.dev.vars` locally) or the deployed worker. Phone width (390px): no overflow.
- The worker's unused "combined" import variant was removed (Niraj, 2026-09-25):
  `apps/worker/src/jobs/resume-import.ts` reads LinkedIn (capped at 5,000 chars),
  GitHub through the REST API, Twitter and a portfolio; a job queued with the old
  fields still runs and ignores them. Takes effect when the worker is deployed.
- Now unreferenced, for Niraj to approve deleting (with the profile list in
  `plan/cleanup/candidates.md`): `import/_components/import-client.tsx`,
  `import/loading.tsx`, and the unreachable `importAndCreateDraft` branch in
  NewResumeSheet's `handleCreate`.

## RES-24 - Public resume links (`/r/<slug>`) readable signed-out

**Status:** done (2026-09-25)

**Why.** Found 2026-09-25 while building PRF-12. The hub copies `/r/<slug>` as a
"share link", but `app/(main)/r/[slug]` is behind the session gate
(`middleware.ts` has no public entry for it), so everyone it is shared with gets
a sign-in page. Niraj, 2026-09-25: make it public, only for drafts marked public;
the profile one-pager's Resume button points at it.

**Files** `middleware.ts` (exactly `/r/<slug>`, one segment), move
`app/(main)/r/[slug]` to `app/(public)/r/[slug]`, its loader/action (check it
refuses `is_public = false` and a missing slug with `notFound()`).

**Edge cases** a private draft's slug must 404, not "sign in"; no owner-only data
(email, phone) on the page unless the draft's own contact block holds it, which
the owner typed into a document they chose to publish; `view_count` increments
once per view, never for the owner.

**Done when** a signed-out `curl` of a public draft's `/r/<slug>` returns 200 with
its name, and a private draft's returns 404.

**Outcome.** Route moved (`git mv`) to `app/(public)/r/[slug]`; `middleware.ts`
`isPublicResume` opens exactly `/r/<slug>` and `/api/resume/pdf/<id>` (the PDF
route already refused non-public drafts to strangers, but the gate bounced them
first, so Download PDF was broken for every visitor). New `lib/resume/public.ts`
(`server-only`): `loadPublicResume` behind React `cache`, so metadata and page
share one query, and `countResumeView`, which skips the owner.
**Two bugs fixed:** the page counted every view twice (the old action ran in
`generateMetadata` and in the page, and incremented each time), and that action,
being an exported server action, let anyone inflate a count by POSTing to it; it
no longer counts and has no callers (cleanup candidate).
**Verified** signed-out against Niraj's default draft, made public for the test
and restored after: private `/r` renders the 404 page with `noindex` and none of
the resume; public `/r` is 200, `<title>` "Niraj Jha's Resume"; the PDF is 200
`application/pdf`; one view counted once (reset to 0 after); private again, the
PDF is 404. As with the profile, a missing slug answers HTTP 200 with the
not-found page because `loading.tsx` starts the stream first.
**Left open:** an anonymous PDF request regenerates the PDF each time (and
re-uploads it to R2). Cheap today; worth a cache if `/r` links get traffic.

## RES-25 - `getPublicResumeByUsername` leaks private projects

**Status:** done (2026-09-25), with the caveat in its outcome

**Why.** Found 2026-09-25: it selects `portfolio_project` rows with no visibility
filter, so a project a user set to Private appears in `/ai/resume/<username>`.

**Files** `actions/(main)/user/profile.action.ts` (`getPublicResumeByUsername`).

**Steps** filter `upper(visibility) = 'PUBLIC'` unless the viewer is the owner,
the same rule as `lib/profile/read.ts`; consider whether the route should reuse
`loadPublicProfile` instead of a third reader.

**Done when** a private project is absent from that page for any other viewer.

**Outcome.** The projects query now filters `upper(visibility) = 'PUBLIC'` unless
the session user is the owner - the predicate verified on the dev DB in PRF-7/8.
**Caveat:** not exercised end to end: `/ai/resume/<username>` is behind the session
gate and there is one account on the dev DB, so "another viewer" was not
reproduced. Folding this reader into `loadPublicProfile` is left as a follow-up.
