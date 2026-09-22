# Deletion candidates - RESOLVED 2026-08-20

**Groups A, B and D were approved for deletion by Niraj. Group C was left to my
judgment; 6 of 10 were deleted and 4 kept. Group E was approved on 2026-08-27.
The outcome of every ID is recorded at the bottom of this file.**

> **Correction, 2026-08-27.** The "Outcome" section below claimed Groups A, B and
> D were deleted. Fifteen of the sixteen were still on disk - the deletions never
> reached the tree. See *"The Group A/B/D deletions never reached the tree"* at
> the end of this file. Read that before trusting any past-tense claim here.

Original note, kept for context: *Nothing in this file has been deleted.* It is the second pass Niraj asked for
on 2026-08-20: *"have a pass and make a list of the things that you think should
be deleted and then I will let you know which ones we should delete."*

Tell me which IDs to remove and I will do those and only those.

## How this list was built

Every file below was checked by **import path**, not by symbol name - the
difference matters. `getResumeTemplates` is exported by two different files, so a
name-based search says "4 references" for a file that nothing actually imports.
Each entry here has **zero** importers matching `from '.../<file>'` or
`import('.../<file>')` across `apps/main`.

Next.js convention files (`page`, `layout`, `loading`, `route`, `error`, …) are
excluded: the router reaches them, not an import.

**26 files, ~3,460 lines.**

## Verified NOT dead - do not delete

Flagged by the naive scan, then cleared:

| File | Why it stays |
|---|---|
| `types/elevenlabs-client.d.ts` | Ambient module declaration. `.d.ts` files are never imported by design, and `lib/elevenlabs/patch-client-errors.ts` imports `@elevenlabs/client`, which only compiles because of it. Deleting it breaks the build. |
| `app/(main)/ai/resume/_components/projects-tab-form.tsx` | Looks like a sibling of the tab-forms deleted in RES-8, but `components/profile/sheets/add-project-sheet.tsx` still imports it. |

---

## Group A - superseded duplicates

A working version of the same thing exists elsewhere. Lowest risk.

| ID | File | Lines | Superseded by |
|---|---|---:|---|
| CLN-1 | `components/project/voice-standup-sheet.tsx` | 448 | `app/(main)/projects/[slug]/_components/daily-standup-sheet.tsx`, which is the one the workspace renders. **Note:** this file was edited in `f2fb2a2` during the worker migration, so it was touched recently - it looks like the migration updated both copies rather than noticing one was orphaned. Worth a glance before you say yes. |
| CLN-2 | `actions/(main)/ai/resume-template.action.ts` | 220 | `resume-draft.action.ts`, which exports its own `getResumeTemplates` and is the one the resume page calls. Same name-collision trap as `resume-scrape.action.ts` in RES-8. |
| CLN-3 | `components/kanbanboard.tsx` | 220 | The project workspace has its own task board under `app/(main)/projects/[slug]/tasks`. |

## Group B - orphaned by the RES-8 deletion

These only ever had one caller, and RES-8 removed it.

| ID | File | Lines | Note |
|---|---|---:|---|
| CLN-4 | `actions/(main)/ai/resume-ai.action.ts` | 100 | `polishWorkExperienceBullets` + the voice variant. Its only UI was `experience-tab-form.tsx`. **I just added credit charging to this in CR-7** - if you want bullet-polish as a feature, the right move is to re-wire it into the resume editor rather than delete it. Your call on which. |
| CLN-5 | `hooks/usePdfExtractor.ts` | 52 | Client-side PDF extraction. Superseded by server-side `unpdf` in `uploadResume`. |
| CLN-6 | `utils/pdfjs-init.ts` | 9 | Only existed to support CLN-5. |
| CLN-7 | `app/store/coverLetterStore.ts` | 70 | `cover-letter-client.tsx` holds its state locally with `useState`. |

## Group C - built, never wired up

Complete features with no entry point. Deleting these throws away working code;
that may still be the right call, as it was for the marketplace.

| ID | File | Lines | What it is |
|---|---|---:|---|
| CLN-8 | `components/projects/project-analytics.tsx` | 664 | A whole analytics dashboard for a project. The largest single item here. |
| CLN-9 | `components/profile/skills-certifications-sheet.tsx` | 337 | Skills/certifications editor. The profile has other paths to this data. |
| CLN-10 | `actions/(main)/projects/sprint-suggestions.action.ts` | 265 | Users suggesting sprints on a project. |
| CLN-11 | `lib/config/standup-agent.config.ts` | 236 | ElevenLabs agent config for voice standups. **Check against CLN-1** - if the live `daily-standup-sheet` needs this config, it is not dead. |
| CLN-12 | `app/store/feedbackStore.tsx` | 186 | Feedback widget state. |
| CLN-13 | `components/common/share-dialog.tsx` | 136 | Generic share dialog. Sharing is done inline in the resume hub and elsewhere. |
| CLN-14 | `components/studio/_components/create-studio-sheet.tsx` | 112 | Studio creation. |
| CLN-15 | `actions/(main)/user/newsletter.action.ts` | 84 | Newsletter signup. |
| CLN-16 | `actions/(main)/pathfinder/practice-mock.action.ts` | 72 | Pathfinder practice mock. |
| CLN-17 | `actions/(common)/agents/openai-bot.action.ts` | 29 | An OpenAI bot action. |

## Group D - small unused utilities

Cheap to delete, cheap to keep, trivial to rewrite if wanted later.

| ID | File | Lines |
|---|---|---:|
| CLN-18 | `utils/imageCompression.ts` | 78 |
| CLN-19 | `lib/generateusername.ts` | 31 |
| CLN-20 | `utils/mdutils.ts` | 22 |
| CLN-21 | `app/store/projectStore.ts` | 22 |
| CLN-22 | `hooks/use-mobile.tsx` | 18 |
| CLN-23 | `hooks/use-debounce.ts` | 16 |
| CLN-24 | `components/spinners.tsx` | 12 |
| CLN-25 | `components/quizresults.tsx` | 12 |
| CLN-26 | `components/auth/auth-dialog-wrapper.tsx` | 11 |

**On CLN-22 and CLN-23:** `use-mobile` and `use-debounce` are the kind of hook
that gets reached for the moment someone builds a responsive component. Neither
exists in `packages/ui` either. Keeping them costs 34 lines.

---

## My recommendation

**Delete Groups A, B and D** (CLN-1..7, CLN-18..26) - about 1,400 lines of
duplicates, orphans and stubs, with the two caveats flagged on CLN-1 and CLN-4.

**Decide Group C one by one.** Each is a feature someone built. `project-analytics`
at 664 lines in particular is either worth wiring up or worth cutting
deliberately, not by default.

**Do not delete** `types/elevenlabs-client.d.ts` or `projects-tab-form.tsx` - see
the table above.

## Not covered by this pass

- `apps/web`, `apps/uni`, `apps/hiring`, `apps/admin`, `packages/*`. Same scan
  can be run against them on request.
- Unused **exports within live files** (as opposed to whole dead files). A
  narrower and noisier problem; worth a separate pass if you want it.
- Orphaned database tables. There is a known set noted in
  `packages/db/drizzle.config.ts` awaiting a decision, unrelated to this list.


---

# Outcome

Groups A, B and D: **deleted**, all 16 files, on Niraj's instruction.

## Group C - my calls

The rule I applied: **keep it if deleting would orphan a live database table, or
if it is large, substantially designed, and plausibly on the roadmap. Delete it
if it is superseded, trivially recreatable, or has no product intent behind it.**

### Kept (4 files, ~1,085 lines)

| ID | File | Why it stayed |
|---|---|---|
| CLN-8 | `components/projects/project-analytics.tsx` | 664 lines of designed dashboard. No data source, so it is a shell - but the expensive part (deciding the metrics and the layout) is done, project analytics is a plausible thing to want, and recreating it is real work. |
| CLN-10 | `actions/(main)/projects/sprint-suggestions.action.ts` | ~~Kept~~ - **superseded 2026-08-20.** The reasoning was that deleting it would strand a live table. `PRJ-2` then dropped the table too, as third-party sprint suggestions are exactly the multi-user machinery being removed. Both are gone. |
| CLN-15 | `actions/(main)/user/newsletter.action.ts` | Same reason: sole bridge to the live `newsletter` table (`profile.ts:230`). Small, but deleting it orphans schema. |
| CLN-16 | `actions/(main)/pathfinder/practice-mock.action.ts` | Sits in `pathfinder`, a core module per `srs/core-modules/`. It is the join between `pathfinderSubGoals` and `mockInterviewVoice` and composes a live action - small, but the integration logic is not obvious to re-derive. |

### Deleted (6 files, ~820 lines)

| ID | File | Why it went |
|---|---|---|
| CLN-9 | `components/profile/skills-certifications-sheet.tsx` | Superseded - `components/profile/sheets/add-skills-sheet.tsx` is the live path. |
| CLN-11 | `lib/config/standup-agent.config.ts` | Confirmed the live `daily-standup-sheet.tsx` does not reference it. Belonged to the orphaned `voice-standup-sheet` (CLN-1). |
| CLN-12 | `app/store/feedbackStore.tsx` | A Zustand wrapper over `feedback.action.ts`. Trivially recreatable. `feedback.action.ts` itself was **kept** - it bridges the live `feedbacks` table (`schema.ts:442`), and is now unreferenced. |
| CLN-13 | `components/common/share-dialog.tsx` | Generic share dialog; every surface that shares does it inline. |
| CLN-14 | `components/studio/_components/create-studio-sheet.tsx` | There is no `app/(main)/studio` route at all - nothing to create into. |
| CLN-17 | `actions/(common)/agents/openai-bot.action.ts` | A bare `gpt-3.5-turbo` call, superseded by the tool-using assistant in `lib/ai/tools.ts`. |

## Consequences worth knowing

- **Bullet polish is gone as a feature.** `resume-ai.action.ts` (CLN-4, Group B)
  was deleted. Its only UI was `experience-tab-form.tsx`, already removed by
  `RES-8`, so it was unreachable - but this does undo the credit charging added
  in `CR-7`. The price was removed from `pricing.ts` rather than left as config
  nothing reads. See `plan/credits/tasks.md:CR-7`.
- **`actions/(main)/user/feedback.action.ts` is now unreferenced** but kept, as
  the only route to the `feedbacks` table.
- **Totals:** 22 files deleted across all groups, ~2,900 lines. Combined with
  `RES-8`, roughly **5,100 lines** removed from `apps/main`.


---

# Group E - the superseded profile generation (added 2026-08-20)

**Awaiting your decision. Nothing here has been deleted** - you said "I am not
telling you to delete anything", so this is a list, not an action.

`/profile` and `/profile/[username]` now render one shared component
(`components/profile/profile-view.tsx`). The files below are the older tabbed
generation that used to render the public profile: a header, a tab bar, a
sidebar and eight tab panels. They are no longer imported by anything, and the
barrel (`components/profile/index.ts`) no longer exports them.

| ID | File | Lines |
|---|---|---:|
| CLN-27 | `components/profile/tabs/about-tab.tsx` | 481 |
| CLN-28 | `components/profile/tabs/at-a-glance-tab.tsx` | 480 |
| CLN-29 | `components/profile/integrations-tab.tsx` | 397 |
| CLN-30 | `components/profile/tabs/activity-tab.tsx` | 378 |
| CLN-31 | `components/profile/tabs/skills-tab.tsx` | 371 |
| CLN-32 | `components/profile/profile-header.tsx` | 319 |
| CLN-33 | `components/profile/modals/endorse-skill-modal.tsx` | 307 |
| CLN-34 | `components/profile/tabs/work-experience-tab.tsx` | 265 |
| CLN-35 | `components/profile/profile-sidebar.tsx` | 247 |
| CLN-36 | `components/profile/profile-tabs.tsx` | 162 |
| CLN-37 | `components/profile/tabs/education-tab.tsx` | 140 |
| CLN-38 | `components/profile/tabs/projects-tab.tsx` | 534 |
| CLN-39 | `components/profile/tabs/resume-tab.tsx` | 555 |

**~4,636 lines.**

## Two notes before you decide

- **CLN-39 (`resume-tab.tsx`) carried the resume-upload control.** That control
  now lives in the shared `profile-view.tsx` (upload, view, replace, delete),
  wired to the same `uploadResume` pipeline as onboarding - see
  `plan/profile/tasks.md:PRF-6`. Nothing is lost by removing this file.

- **`components/profile/sheets/*` are all still live** and are NOT on this list:
  `add-skills-sheet`, `add-work-experience-sheet`, `add-education-sheet`,
  `add-project-sheet`, `profile-strength-sheet`. The shared view opens them.

---

# Group E - DECIDED 2026-08-27

**Niraj: "Do the Group E".** All 13 files approved for deletion.

Re-verified by import path immediately before deleting, not trusted from the
2026-08-20 scan: `components/profile/index.ts` exports none of them, and no file
under `app/` or `components/` imports any of the paths.

Two of them were still being edited by accident after they went dead, which is
the cost this deletion removes:

- `profile-tabs.tsx` was modified in `b3dc1209` (2026-08-25), 33 lines, in a
  commit about the resume module.
- `profile-header.tsx` was given `min-w-0` fixes during `SHL-6`'s responsiveness
  pass. That work is discarded here, correctly - it was markup nobody renders.

---

# The Group A/B/D deletions never reached the tree

**Found 2026-08-27 while working through this file. Recorded rather than quietly
fixed, because the outcome section above says something that is not true.**

The "Outcome" heading states *"Groups A, B and D: **deleted**, all 16 files, on
Niraj's instruction."* Checked against the filesystem, **15 of the 16 are still
present**. Only `CLN-4` (`resume-ai.action.ts`) actually went.

`git log --diff-filter=D` shows no deletion commit for any of the 15. They were
never removed and then restored - the deletion simply did not happen. The
likeliest moment it was lost is `1c1e7b02` (2026-08-20), *"Resolved the merge
conflicts from the remote and local changes"*, which is the commit that landed
this whole session's work; a merge that takes "theirs" on a delete-vs-modify
conflict silently keeps the file.

Group C is unaffected: all 6 of its approved deletions are genuinely gone. So the
loss is specific to the A/B/D batch, not to the pass as a whole.

**Still present, ~1,240 lines:**

| Group | IDs |
|---|---|
| A | CLN-1 `voice-standup-sheet.tsx`, CLN-2 `resume-template.action.ts`, CLN-3 `kanbanboard.tsx` |
| B | CLN-5 `usePdfExtractor.ts`, CLN-6 `pdfjs-init.ts`, CLN-7 `coverLetterStore.ts` |
| D | CLN-18..26, all nine |

The approval on record is Niraj's own, quoted at the top of the Outcome section,
and nothing about the reasoning has changed - so this is finishing approved work
that failed, not a new deletion decision. Re-verified by import path on
2026-08-27 before re-running it, because a week of commits sits between the
approval and now and a dead file can acquire a caller.

`CLN-2` is additionally covered by `plan/resume/tasks.md:RES-18`, which is where
it gets deleted, because it needs the same name-collision check as
`tailorResumeForJD` in that file.

**The lesson worth keeping:** a deletion is verified by `ls`, not by having
written the deletion. Every other task in `plan/` states a falsifiable "Done
when"; this file's outcome section stated an action instead, and that is exactly
the gap the convention exists to close.

## Outcome of both, 2026-08-27

**28 files, 5,896 lines**, all re-verified by import path immediately before
deletion and all clear.

| batch | files | note |
|---|---:|---|
| Group A | 3 | `CLN-2` also carries `plan/resume/tasks.md:RES-18` |
| Group B | 3 | `CLN-4` was already gone; the other three were not |
| Group D | 9 | all of them |
| Group E | 13 | the superseded tabbed profile generation |

`components/profile/tabs/` no longer exists. `components/profile/` is down to
`index.ts`, `profile-view.tsx`, `profile-view-skeleton.tsx`, `modals/` (two live
modals) and `sheets/` (five live sheets). The barrel's comment was rewritten -
it said the Group E files were "still on disk pending Niraj's call", which is no
longer true and would have misled the next reader in the opposite direction.

**One re-verification changed nothing but was worth running.** `projects-tab.tsx`
(CLN-38) looks like it has a caller: `add-project-sheet.tsx` imports
`projects-tab-**form**`, a different file in the resume module, and the one
RES-8 recorded as "must NOT be deleted". A substring match on `projects-tab`
finds it. The import specifier does not. Same trap, third time in this repo.

**Not touched:** the four Group C files kept in the 2026-08-20 pass
(`project-analytics.tsx`, `newsletter.action.ts`, `practice-mock.action.ts`, and
`feedback.action.ts` which that pass left unreferenced-but-kept as the only
bridge to the `feedbacks` table). Their reasoning is unchanged and no new
decision was asked for.

**Running total across `RES-8`, the 2026-08-20 pass and this one: roughly 11,000
lines removed from `apps/main`.**

**Verified:** `cd apps/main && npx tsc --noEmit` exits 0 after all 28 deletions.

---

# Group F - the KnowMe module (raised and DECIDED 2026-08-27)

> **Decided: KEEP and unpark.** Niraj: *"add this knowme link to the nav ... I
> want this to be the feature which should know all the things about the user."*
> KnowMe is back in the sidebar and now has its own plan directory,
> `plan/knowme/`. The recommendation below (leave parked, decide later) was
> overruled, and the "make it consistent" half happened anyway - the nav and the
> home page agree again, in the other direction.
>
> The delete option is off the table. The rest of this entry stays as the
> record of what the module costs.

**Originally raised as a decision. Nothing here was deleted.** Raised because
`apps/main/lib/navigation.ts:26` says *"KnowMe is parked (code kept, hidden from
nav)"*, and parked code that nobody has decided about is exactly what this file
exists to surface.

## What it is

| | |
|---|---:|
| Routes | 5 - `/knowme`, `/knowme/onboarding`, `/knowme/settings`, `/knowme/analytics`, `/knowme/[username]` |
| App components | 21 `.tsx` |
| Server actions | 7 files |
| **Total** | **~7,769 lines** |
| Database tables | **13** |
| **Live rows across all 13** | **0** |

Bigger than Group E (the superseded profile generation, ~4,636 lines) and bigger
than `RES-8` and the original A-D groups combined.

## The finding that makes this urgent rather than tidy

**It is hidden from the sidebar and still advertised on the home page.**

- `app/(main)/home/_components/feature-discovery.tsx:89` links to `/knowme`
- `app/(main)/home/_components/home-client-wrapper.tsx:22` mounts a KnowMe sheet

So a user cannot find KnowMe in navigation but is invited into it from the first
screen they land on. Whatever is decided, those two references and the nav
comment have to agree - right now they contradict each other, and the home page
is the one users actually see.

## The options, honestly

**Delete it.** 7,769 lines and 13 tables go. Nothing is destroyed: every table is
empty, so this is an ordinary migration rather than a data decision - the same
situation `PRJ-5` was in. It is recoverable from git history. This is consistent
with `srs/core-modules/README.md`, which says the product is being narrowed to
Projects and Pathfinder and lists `knowme` among the modules explicitly out of
scope.

**Revive it.** Put it back in the nav and finish it. Worth knowing what that
commits to: `knowme/embeddings.action.ts` is one of the 11 files doing raw SQL
credit math, it has its own `know_me_credit_transaction` table separate from the
main ledger, and it carries an embeddings pipeline against Upstash Vector -
`UPSTASH_VECTOR_REST_URL` and `_TOKEN` are already in the env. That is a second
credit system and a second vector store to maintain.

**Leave it parked, but make it consistent.** Cheapest: remove the two home-page
entry points so "parked" is actually true, and revisit later. Costs ~10 lines and
stops the product advertising a door that is not in the corridor.

## Recommendation

**Leave it parked and make it consistent, now** - the two home references are a
live inconsistency and cost almost nothing to fix. Then decide delete-or-revive
separately, when the narrowing to Projects and Pathfinder is further along and
the answer is obvious rather than a guess.

Deleting 7,769 lines and 13 tables is not reversible in practice even though it
is in git, and there is no cost to holding an empty module for another few weeks.

---

# Group G - pathfinder resource generation (raised 2026-08-27)

**A decision for Niraj. Nothing deleted.** Found while starting `PF-W5` in
`srs/core-modules/pathfinder/02-worker-migration.md` - the migration turned out
to have nothing to migrate.

| ID | File | Lines | Status |
|---|---|---:|---|
| CLN-40 | `actions/(main)/pathfinder/resources.action.ts` | 303 | **zero importers of the module path, anywhere in the repo** |

Its only function export, `generateSubGoalResources`, is called nowhere. The
symbol appears exactly twice in the repo: its own definition and its own
`console.error`.

## Three reasons it reads as alive

1. **A live sibling with the identical filename.**
   `actions/(main)/projects/resources.action.ts` is imported in three places. Any
   search for `resources.action` finds those.
2. **A duplicated type name.** `SubGoalResources` looks like it has 8 consumers -
   every one imports it from `app/store/pathfinderStore`, which declares its own
   copy. Same for `Flashcard`. The declarations in this file have no consumers.
3. It is a complete, plausible 303-line implementation: an Exa fetch and an
   OpenAI call in parallel, token accounting wired to `logPathfinderUsage`.

Third time in this repo (`RES-8`, `CLN-2`, now this). **Check the import
specifier, not the symbol.**

## The product question underneath

The feature was never wired up. `pathfinder-videos-tab.tsx` and
`pathfinder-flashcards-tab.tsx` read `aiResources` from the Zustand store, and
nothing populates it from this generator. So sub-goal learning resources are not
slow - they do not exist.

**Delete it**, or **wire it up** as a worker job per `PF-W5`. Recommend deciding
this when the narrowing to Projects and Pathfinder is settled: if Pathfinder is
core, generated resources per sub-goal is a plausible thing to want, and the
prompt here is already written.

**If deleting:** the two types worth keeping (`SubGoalResources`, `Flashcard`)
already exist independently in `app/store/pathfinderStore`, so nothing needs
moving first.

---

# CLN-41 - superseded by the PF-W2 migration (raised 2026-08-27)

| ID | File / symbol | Lines | Status |
|---|---|---:|---|
| CLN-41 | `generateAIContentForSubGoal` in `actions/(main)/pathfinder/subgoals.action.ts` | ~95 | superseded by `apps/worker/src/jobs/subgoal-generation.ts`, no callers |

Kept in place with a `SUPERSEDED` banner rather than deleted, per the "nothing is
deleted" rule in `srs/core-modules/README.md` - dead code in the two core modules
is listed for Niraj, never removed as a side effect of a migration.

The worker job runs the same prompt with the same model, temperature and token
cap, so this is a true duplicate. The risk of keeping it is the usual one: two
copies of a prompt drift, and the banner says so explicitly.

Delete it whenever the migration has been watched working end to end.

---

# CLN-42 / CLN-43 - superseded by the PF-W4 migration (2026-08-27)

| ID | File / symbol | Lines | Status |
|---|---|---:|---|
| CLN-42 | `generateAIStudyPlan` in `actions/(main)/pathfinder/goals.action.ts` | ~110 | superseded by `apps/worker/src/jobs/goal-creation.ts`, no callers |
| CLN-43 | `buildRequest` in `apps/main/lib/workers/client.ts` | ~15 | no callers - BOTH transports now pass `(url, init)` |

Both kept in place with `SUPERSEDED` banners rather than deleted, per the
"nothing is deleted" rule in `srs/core-modules/README.md`.

**CLN-43 is the one worth keeping visible.** Building a `Request` there was the
realm hazard that broke every background job in this product, and `RES-17`
removed only half of it - the HTTP path - leaving the service-binding path
broken for two more days. The banner exists so the next person understands why
the function must not come back, not merely that it is unused.

Delete both once the migrations have been exercised through the UI as well as by
direct dispatch.

---

# CLN-44 - `pathfinder-studio-tab.tsx`, never imported (2026-08-27)

| ID | File | Lines | Status |
|---|---|---:|---|
| CLN-44 | `apps/main/app/(main)/pathfinder/[slug]/_components/pathfinder-studio-tab.tsx` | ~105 | zero importers |

Found while fixing the right pane of `daily-practice-view`. Nothing imports it:

```bash
grep -rn 'pathfinder-studio-tab\|PathfinderStudioTab' apps/main/app apps/main/components
# (no output)
```

The tab actually rendered on that page is `pathfinder-notes-tab.tsx`, which
mounts `StudioPanel`. This file mounts `StudioContainer` instead, so it is not
merely unused, it is a second answer to the same question.

**Why it is worth a line here rather than a silent delete.** Its root was
`h-[calc(100dvh-200px)]` - the same viewport-height-inside-a-bounded-pane bug
that made the live panel overflow the page card. It went unnoticed because the
file never renders. Left in place per the "nothing is deleted" rule, and NOT
fixed: fixing dead code only makes it look maintained. Delete it, or wire it up
and delete `pathfinder-notes-tab`, but do not leave both.

This is the fourth name-collision trap in this repo (after `generateAIStudyPlan`,
`generateSubGoalResources` and `buildRequest`): the name reads alive, the file is
not.

**DONE 2026-08-27.** Deleted on Niraj's instruction, together with the
`@upstash/vector` dependency in `apps/main/package.json`, which the Vectorize
migration left with no importers. Both are recoverable from git history; the
dependency needs a `pnpm install` to drop out of the lockfile.

---

# CLN-45 - the zero-caller sweep (2026-08-28)

Niraj approved sweeping the zero-caller dead code after the Interview Assistant
retirement went cleanly. **Every item below was re-verified as having no call
sites immediately before deletion** - not trusted from this document, which was
already wrong once (Groups A/B/D were recorded as deleted while 15 of 16 files
were still on disk).

| What | Where | Lines | Why it was dead |
|---|---|---:|---|
| `generateAIStudyPlan` | `pathfinder/goals.action.ts` | 124 | superseded by the `goal_creation` job (PF-W4), now proven in use |
| `generateAIContentForSubGoal` | `pathfinder/subgoals.action.ts` | 127 | superseded by the `subgoal_generation` job (PF-W2) |
| `transcribeVoiceRecording` | `pathfinder/subgoals.action.ts` | 26 | zero callers - **PF-W3 is void** |
| `resources.action.ts` (whole file) | `pathfinder/` | ~300 | only export `generateSubGoalResources`, zero callers - **PF-W5 is void** |
| `generateNotesContent` | `pathfinder/studio-link.action.ts` | 67 | zero callers - **PF-W6 is void** |
| `getGoalStudioContent` | `pathfinder/studio-link.action.ts` | 61 | zero callers |
| `createOrGetStudioForGoal` | `pathfinder/studio-link.action.ts` | 80 | called only by `getGoalStudioContent`, which was itself dead |
| `buildRequest` | `lib/workers/client.ts` | 11 | CLN-43; both transports pass `(url, init)` now |
| 5 job types | `packages/db/src/schema/worker.ts` | 5 | `project_assessment`, `project_mock`, `resource_generation`, `task_details`, `voice_transcription` - declared, never bound, never dispatched |

Roughly **800 lines** removed. All three packages typecheck at zero errors, and
`JOB_TYPES` and `JOB_BINDINGS` now agree exactly: 16 declared, 16 bound, no
difference in either direction.

## The part worth reading

**Three of these were queued as WORK.** PF-W3, PF-W5 and PF-W6 were tasks to
carefully migrate code onto the worker - and all three turned out to have zero
callers. The tasks were written from a `grep` for
`openai.chat.completions.create`, which finds text, not reachability.

The two calls that WOULD have justified a migration on cost - the 4,000-token
resource generator and the notes generator with no `max_tokens` at all - were
both in that dead set. The two calls still LIVE are the two short ones, and both
stay inline. See the triage appended to
`srs/core-modules/pathfinder/02-worker-migration.md`.

**Check reachability before estimating cost.** That is the whole lesson, and it
would have saved three tasks.

## The declared-but-unbound job types deserve their own note

A type in `JOB_TYPES` with no entry in `JOB_BINDINGS` is not inert.
`startBackgroundJob` accepts it, inserts the row, and **holds the user's
credits** - and only then does `jobStub` fail to resolve a binding. The user pays
for a job that could never run. The two lists are now in exact agreement and
should be checked together whenever either changes.

---

# CLN-46 - the `any` sweep, and the one part of it that was reverted (2026-08-28)

`: any` in `apps/main` went from **174 to 33**, and `catch (x: any)` - which
`CLAUDE.md` names explicitly - from **5 to 0**. Zero typecheck errors throughout.

## What removing `any` actually found

The point of this was never tidiness. Four real defects were hiding behind it,
none of which any test or typecheck could have caught while the `any` was there:

| Where | Defect |
|---|---|
| `profile/[username]/public-profile-client.tsx` | read `user._count?.followers`. `_count` is a **Prisma** idiom and this repo uses Drizzle, so it never existed - **every profile in the product rendered "0 followers"**. The action computes a real `followersCount`; nothing read it. |
| `projects/categories.action.ts` | `orderBy: desc(ideas.upvotes)` - `project_idea` has **no `upvotes` column** (it has `buildCount`). The category grid was ordered by `undefined`. |
| `projects/AllProjectsClient.tsx` | state typed `ProjectV2Basic[]`, which declares `generationType`, `visibility`, `stacks`, `totalStarted`, `totalSubmissions` - **none of which the query selects**. Five fields permanently `undefined`. |
| `projects/project.action.ts` | `if (!result.success \|\| !result.data)` - an `\|\|` whose right side reads a success-only field defeats narrowing, so `result.data` stayed loose. Same trap as IP-4. |

## How the bulk of it was done

Most `any` annotations were not adding information, they were **discarding** it:
61 Drizzle relational-query callbacks (`(tbl: any, { desc }: any)`) and dozens of
array-method callbacks. Drizzle and TypeScript infer all of those - deleting the
annotation is the fix. `conditions: any[]` became `SQL[]`, or
`(SQL | undefined)[]` where an `or(...)` is pushed, since `or()` is typed as
possibly-undefined and `and()` accepts that.

Where a type was genuinely needed it was **derived, never hand-written**:
`typeof table.$inferSelect`, or
`Awaited<ReturnType<typeof someAction>>["data"]`. A hand-written mirror of a
query result is a copy that drifts, which is what caused two of the four defects
above.

## The part that was REVERTED, and why

Five files declare `interface ActionResponse { success: boolean; data?: any }`.
That single line makes every action in each file return `data: any`, and
`success: boolean` (rather than a discriminated union) means narrowing never
works either. It is the largest single source of `any` left.

Converting it to `<T = unknown>` was tried and **backed out**. It compiles fine
in the action files; it fails at the CALLERS, surfacing **~22 type mismatches
across ~10 client components** - each a hand-written state type that has drifted
from what its action returns, exactly like the `ProjectV2Basic` case above.

Several involve shared types (`ProjectV2Full`, `TasksColumns`, `StandupConfig`,
`EnrollmentData`) whose correction cascades further. That is a proper refactor
needing a judgement per site - narrow the client type, or widen the query - and
it is not a tail-end cleanup. Leaving the tree with 22 errors was not an option,
so it was reverted whole.

**One exception was kept:** `getAllPublicProjects` has no return annotation, so
callers get its real row type, and its one caller was fixed to match. That is the
template for the rest.

## What is left, and why

33, and most are legitimate:

- `types/elevenlabs-client.d.ts`, `excalidraw-canvas.tsx` - third-party surfaces
  with no shipped types. `any` at a foreign boundary is honest.
- `embeddings.action.ts` (6) - `portfolioProjects` is typed now; the remaining
  `chunks: any[]` need the chunk builders in `utils/knowme/` typed first.
- The `data?: any` interfaces - blocked behind the refactor above.

---

## CLN-47: pre-manual-testing sweep (2026-08-28) - DONE

A sweep for every defect class this product has actually shipped, run before
Niraj's manual pass. Each scan is the grep that would have caught the original
bug, so this section doubles as the regression check to re-run later.

| # | Class | Found | Fixed |
|---|-------|-------|-------|
| 1 | Text colour: tiny type, all-caps, low contrast, dark-on-dark | 5 bare greys | 0 - all sit on always-dark surfaces, correct as written |
| 2 | ScrollArea: `flex-1` with no `min-h-0`, `max-h` on the root | 16 | 16 |
| 3 | Sticky headers clipped by an ancestor `overflow-hidden` | 2 candidates | 0 - a nested ScrollArea is the scrollport in both |
| 4 | Emoji used as an icon | 1 stale category map | 1 |
| 5 | Spinners, competing tab active styles, `catch (e: any)` | 0 | 0 |
| 6 | Chart axes too narrow to hold their own ticks | 2 | 2 |
| 7 | Route with a page and no matching `loading.tsx` | 0 | 0 |

### Scan 2 was the one that mattered

Thirteen ScrollAreas carried `flex-1` without `min-h-0`. That is the exact pair
that stopped the transactions panel scrolling: a flex child's `min-height` is
`auto`, so it refuses to shrink below its content and the ScrollArea grows past
its parent instead of scrolling. Three more set `max-h` on the ScrollArea root,
where the viewport is `h-full` against an auto-height parent and resolves to
`auto` - content is clipped, not scrolled, and the overflow is unreachable with
no scrollbar to say so. The bound belongs on the viewport:

```
className="[&_[data-radix-scroll-area-viewport]]:max-h-72 min-w-0"
```

One of the three was `components/studio/ui/ai-input-panel.tsx`, written in this
same run - the pattern is easy to reintroduce, which is why the grep is recorded
here rather than the fix alone.

### Scan 4 found a fourth copy of one map

`home/_components/mock-voice-preview.tsx` held a private copy of the mock
category list carrying 7 of 10 categories. NEGOTIATION, CASE_STUDY and ALL fell
through to no icon at all. Replaced with a lookup against the shared
`MOCK_CATEGORIES` and a total fallback, so a new category can never again render
as a blank.

### Scan 6

Two pathfinder Y axes at `width={25}`, which holds two digits. This is the bug
that rendered `10000` as `0000` on the credits chart - a clipped axis shows a
*wrong* number, not a smaller one. Both to 44, and their 10px ticks to 12px to
meet the floor set for the rest of the product.

### Verification

`tsc --noEmit` clean across `apps/{main,worker,web}` and
`packages/{ui,db,pricing}`. `check-nav`: 36/36 navigation paths resolve. No
compile errors in the dev log. Route smoke test: `/purchase` 200 signed out,
`/home` `/mock` `/pathfinder` `/credits` all 307 to sign-in - which is CR-10's
deny-by-default rule doing its job.

## CLN-48: `transactions-panel` has a dead standalone mode

`app/(main)/credits/_components/transactions-panel.tsx` takes `embedded` and
branches on it 26 times. CR-15 deleted `/transactions`, so the only caller is the
credits History panel and it always passes `embedded` - every `embedded === false`
path (the page entrance animations, the full-page header, the wider tab bar) is
unreachable.

Collapse the prop and delete the dead half. Not urgent, and not something to do
in the same change as the route deletion: it touches the whole file, whereas the
deletion touched one import.

---

## CLN-49 - The KnowMe onboarding wizard exists twice - DONE 2026-08-29

**Found 2026-08-29 while doing KM-12; approved and collapsed the same day.**

`app/(main)/knowme/_components/knowme-landing.tsx` (1,055 lines) contains a
second, near-identical copy of `onboarding/_components/onboarding-wizard.tsx`
(~590 lines): the same `TOTAL_STEPS`, `privacyOptions`, `handleCreateAI`,
`WelcomeStep`, `DataSourcesStep`, `PlatformsStep` and `PrivacyStep`.

**How it announced itself.** KM-12 removed one privacy option and changed one
call site, and the identical edit had to be made in THREE files - the landing,
the wizard, and settings - each found only because `tsc` happened to reject the
type. A privacy control that has to be fixed in three places is one that will
eventually be fixed in two.

They have already drifted: the landing copy is reached when a profile is in
`SETUP` from `/knowme`, the wizard copy when the user lands on
`/knowme/onboarding` directly, and nothing guarantees the two ask the same
questions in the same order.

**Proposed:** the landing page renders `<OnboardingWizard>` rather than
reimplementing it, leaving `knowme-landing.tsx` to be the marketing panel it is
named after. Needs Niraj's approval - it deletes roughly 450 lines.

**DONE 2026-08-29.** Both copies now render
`components/knowme/knowme-onboarding.tsx`. `onboarding-wizard.tsx` went from 645
lines to 61 (a heading and a card); `knowme-landing.tsx` from 1,053 to 521 (the
marketing page it is named after, plus a Sheet).

**The drift was worse than styling, which is the part worth recording.** KM-5 cut
the platform list back to GitHub - the only platform with a real sync handler -
in the WIZARD copy only. The landing copy went on offering LeetCode,
StackOverflow and LinkedIn, all three of which hit a silent `break`, reported
success and wrote nothing. `/knowme` is the normal way in, so the copy most users
met was the one still carrying the bug that task had closed. A duplicate is not
just twice the code; it is a fix that looks applied and is not.

**Two defects fixed while merging**, both of which had survived in both copies:

- **Setup never resumed.** `updateOnboardingStep` has always written
  `know_me_profile.onboarding_step` and nothing has ever read it back, because
  the column was not in `KnowMeProfileFull`. Closing the wizard at step 3
  restarted it at step 1. The column is exposed now and seeds `currentStep`.
- **A state setter ran during render.** The wizard's platform step called
  `setIncludePlatformData(false)` inside its own render body - React warns about
  this, and it made the toggle beside it a no-op. Platforms are connected from
  Settings after the AI exists, so the step is informational now and the flag is
  written where the save happens.

---

## CLN-50 - `/knowme/onboarding` is a redirect wrapping three dead files

**Found 2026-08-29, while verifying CLN-49. Needs Niraj's approval to delete.**

`app/(main)/knowme/onboarding/page.tsx` is, in full:

    export default function KnowMeOnboardingPage() {
        redirect('/knowme');
    }

Setup is the Sheet on the KnowMe landing page. So the other three files in that
directory - `_components/onboarding-wizard.tsx`, `_components/onboarding-skeleton.tsx`
and `loading.tsx` - have no reachable caller. `loading.tsx` imports the skeleton,
but it only ever shows while `page.tsx` resolves, and `page.tsx` redirects
immediately.

**This is not cosmetic, and CLN-49 is the proof.** The wizard copy in that dead
directory is where KM-5's platform fix was applied - cutting the list back to the
one platform with a working sync handler. The copy users could actually reach
kept advertising LeetCode, StackOverflow and LinkedIn. The task was closed, the
fix was real, and every user still met the bug, because the fix landed in a file
nothing renders. An unreachable second copy does not merely sit there; it absorbs
maintenance that was meant for the live one.

**Proposed:** delete `app/(main)/knowme/onboarding/` entirely, and give
`/knowme/onboarding` a redirect in `next.config` or drop it - whichever suits the
existing convention. Roughly 4 files, ~130 lines after CLN-49 shrank the wizard.

**Before deleting, check:** nothing links to `/knowme/onboarding`. `pnpm
check-nav` covers the sidebar; the home page's feature-discovery card and any
email template are worth a grep too, since a link to a deleted route 404s rather
than redirecting.

---

## CLN-51 - Two orphans left by the projects hub rewrite

**Found 2026-08-29, while doing PRJ-7. Needs Niraj's approval to delete.**

The marketing hub was the only caller of both:

- `app/(main)/projects/_components/recent-submissions-grid.tsx` (201 lines) -
  the "Community Showcase" strip. Zero references now.
- `getProjectsPageStats` in `actions/(common)/stats/platform-stats.action.ts:151`
  - the platform-wide counts behind the stat band. Zero references now.

Both are left in place rather than deleted, because deletions get approved.

**Worth knowing before deleting `getProjectsPageStats`:** it is the action that
produced `0+ Projects Built · 0+ Active Builders · 0+ Tasks Completed` beside the
hardcoded `94% Success Rate`. It was not wrong - the three real numbers were
accurate. The fourth was never computed from anything, which is why the hub now
reads the user's own rows instead. If a platform-wide stat is ever wanted again
(a marketing page in `apps/web`, say), this is the action to reuse, and the 94%
is the thing not to.

## Practice problem generation still calls gpt-4o in server actions (2026-09-22)

Found while building `plan/practice-dsa` PD-12, not in its scope:
`generateProblemFromName` and `generateProblemFromURL` in
`apps/main/actions/(main)/practice/generate-problem.action.ts` each run a
2500-token gpt-4o completion (the URL one after an Exa fetch) inside the
server action, which the working agreement says belongs in `apps/worker`.
They are free and the user watches the sheet, so the harm is a killed request
rather than a lost charge. Candidate: move both to one
`practice_problem_draft` job. Not a deletion; listed for a decision.
