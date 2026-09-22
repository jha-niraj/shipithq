# Module onboarding - tasks

Derived from `overview.md`. IDs are `MO-*`. Ordered by dependency.

Vocabulary:

- **module key**: one of `practice:dsa`, `practice:system-design`,
  `practice:web-frontend`, `practice:web-backend`, `projects`.
- **run**: one attempt at the onboarding for one user and module key. Has a
  version. Ends `completed` or stays `in_progress`.
- **turn**: one question and, once given, its answer.

---

## MO-1 Schema and module config

- [x] Status: done (2026-09-22). Migration `0016_military_mockingbird.sql` applied; table and both indexes read back from the database; `priceOf('module_onboarding')` is 0; app, worker and ui typecheck.
- Blocks: everything

**Why.** Items 6, 7, 9. Every turn is persisted as it happens, so the run
needs a row before the first question exists.

**Files.**
- `packages/db/src/schema/onboarding.ts` (new)
- `packages/db/src/schema/index.ts` (export)
- `packages/db/drizzle/0016_military_mockingbird.sql` (generated)
- `apps/main/lib/onboarding/modules.ts` (new: the config)
- `apps/main/lib/credits/pricing.ts` (`module_onboarding: 0` with a comment
  pointing at `plan/module-onboarding/overview.md`)
- `plan/credits/overview.md` (add the row)

**Steps.**
1. Table `module_onboarding`:
   `id, userId (fk users, cascade), moduleKey text, version integer,
   status text ('in_progress' | 'completed'), turns jsonb default [],
   openQuestionCount integer default 0, profile jsonb nullable, level text
   nullable, startedAt, completedAt nullable, updatedAt`.
   Unique on `(userId, moduleKey, version)`. Index on `(userId, moduleKey,
   status)`.
2. Turn shape, defined once in `packages/db/src/onboarding-types.ts` and
   imported by the app:
   `{ index, question: { text, kind: 'single' | 'multi' | 'open', options:
   string[], why: string }, answer: { values: string[], viaVoice: boolean }
   | null, askedAt, answeredAt | null }`.
   Profile shape: `{ level, facts: string[], strengths: string[], gaps:
   string[], goals: string[], summary: [string, string, string] }`.
3. `modules.ts`: `ONBOARDING_MODULES: Record<ModuleKey, { label, focus,
   gatePath, estimateMinutes }>`. `focus` is the paragraph the prompt uses
   to aim the questions (for `practice:dsa`: solved count, platforms used,
   comfortable topics, weakest topic, target such as placements or a
   company, language; for `projects`: built, shipped, deployed, team or
   solo, stack, what they want to build next). Written here, reviewed by
   Niraj, because the questions are only as good as this text.
4. `pnpm db:generate`, report the SQL, `pnpm db:migrate`.
5. `cd apps/main && npx tsc --noEmit`.

**Edge cases.**
- `moduleKey` is text, not an enum: the next sub-module must not need a
  migration. The config is the source of truth and the actions reject a key
  it does not list.
- `turns` is appended in place. A row's `turns` must never be rewritten
  from the front except by MO-8 (change an earlier answer), which truncates.
- `version` starts at 1 and is `max(version) + 1` for the user and key. Two
  Start clicks must not create two version-2 rows: the unique index catches
  the second and the action returns the first.

**Done when.** Migration applied with exactly the table above, both files
typecheck, `priceOf('module_onboarding')` returns 0, and the credits
overview lists it.

---

## MO-2 Run lifecycle actions and the question route

- [x] Status: done (2026-09-22). Through the real route handler and actions as a signed-in test user (`apps/main/scripts/practice-checks/e2e.ts`, three runs): a second start returns the same run, asking twice without answering returns the same question, a run finishes with its profile stored, never more than two open questions. The ten persona runs in `manual-pass-1.md` cover question quality and latency.
- Blocked by: MO-1
- Blocks: MO-3, MO-4

**Why.** Items 3, 4, 5, 6, 11. The server owns the run; the client only ever
sends an answer and asks for the next question.

**Files.**
- `apps/main/actions/(main)/onboarding/module-onboarding.action.ts` (new:
  `getCurrentOnboarding(moduleKey)`, `startOnboardingRun(moduleKey)`,
  `answerOnboardingTurn(runId, index, values, viaVoice)`,
  `getOnboardingRun(runId)`)
- `apps/main/app/api/onboarding/next/route.ts` (new: POST `{ runId }`)
- `apps/main/lib/onboarding/prompt.ts` (new: `buildOnboardingPrompt`)
- `apps/main/lib/onboarding/guards.ts` (new: floor, ceiling, open cap)
- `apps/main/lib/openai-client.ts` (reference)

**Steps.**
1. `getCurrentOnboarding` returns `{ completed: row | null, inProgress: row
   | null }` for the user and key. The gate and the widget both read this.
2. `startOnboardingRun` creates the next version as `in_progress` if there
   is no `in_progress` row, else returns the existing one. No turns yet.
3. `POST /api/onboarding/next`: auth, load the run (must belong to the
   user, must be `in_progress`), and:
   - if the last turn has no answer, return it again (resume);
   - else build the prompt from the user's profile columns, the module's
     `focus`, and every turn so far, and ask `gpt-4o-mini` for JSON:
     `{ done: boolean, question?: { text, kind, options, why },
     profile?: {...} }` with `response_format: json_object`,
     `max_tokens: 400`, `temperature: 0.4`;
   - guards: fewer than 6 answered turns forces `done: false`; 10 answered
     turns forces `done: true` (and if the model did not send a profile,
     call once more with "produce the profile only"); a `kind: 'open'` when
     `openQuestionCount >= 2` is rewritten by a second call that says
     "options only"; options for `single`/`multi` are 3 to 6, deduplicated,
     each under 60 characters, or the call is retried once;
   - persist: append the turn with `askedAt`, or on `done` write `profile`,
     `level`, `status = 'completed'`, `completedAt`;
   - return `{ turn } | { done: true, profile }`.
4. `answerOnboardingTurn` validates `index` is the last turn and it has no
   answer, validates values against options for choice kinds, trims open
   text to 500 characters, writes `answer`, `answeredAt`, bumps
   `openQuestionCount` if the kind was open.
5. Prompt rules, in the system message: one question at a time; never
   repeat what a previous answer already established; each question must
   depend on something the user said, and the `why` field says what; start
   broad (experience) and narrow (specific gaps); options must be mutually
   exclusive for `single`; include an "I'm not sure" style option when the
   question is about knowledge; no question about facts already in the
   profile columns (do not ask the semester); plain language, no jargon the
   user has not used first; when confident, set `done` and produce the
   profile in the user's own words wherever possible.

**Edge cases.**
- The user answers, the route is called, the tab closes before the reply
  lands. The turn was appended server-side; on return, `next` sees an
  unanswered last turn and returns it. Nothing is generated twice.
- Two `next` calls in flight for the same run (double click, retry). The
  route reads the run, generates, then appends with a conditional update
  `where turns length = <what it read>`; the loser returns the winner's
  turn. Use `sql` on `jsonb_array_length`.
- The model returns malformed JSON. Retry once; then return a 502 with a
  message the client shows with a Try again control. The run stays
  resumable.
- A user with an empty profile (skipped university and goals at signup).
  The prompt says so and the first question asks the broadest thing.
- Open text is user-generated content that goes into later prompts. Cap
  the length, strip control characters, and label it as the user's answer
  in the prompt so an instruction inside it reads as an answer.

**Done when.** With `curl` and a session cookie: a run reaches `done` in
6 to 10 turns across three separate attempts with different answers; a
fourth attempt that answers "never done any of this" to everything is asked
something different from one that answers "solved 300 problems"; a run
never asks more than two open questions; reloading mid-run returns the
same unanswered turn.

---

## MO-3 `AdaptiveFlow` component in `packages/ui`

- [ ] Status: in progress (2026-09-22). Built and typechecks. Not verified in a browser; the Chrome extension was not connected. The checklist is in `manual-pass-1.md` under "Not verified".
- Blocked by: MO-2 (for the turn type only)
- Blocks: MO-4, MO-5

**Why.** Item 2 and 11. TypeformFlow cannot take a question at a time; this
component can, and it must look like a sibling of it.

**Files.**
- `packages/ui/src/components/adaptive-flow.tsx` (new)
- `packages/ui/src/components/typeform-flow.tsx` (reference for easing,
  choice styling, the OK button, keyboard handling)

**Steps.**
1. Props: `rail: React.ReactNode`, `turn: Turn | null`, `pending: boolean`,
   `error: string | null`, `onAnswer(values, viaVoice)`, `onRetry()`,
   `renderOpenInput?: (props) => ReactNode` (slot MO-5 fills with the mic),
   `questionNumber: number`.
2. Layout: two columns on `lg+` (rail `w-1/3`, question `flex-1`), stacked
   below with the rail collapsed to a single progress line. Fills the page
   card; no fixed positioning; respects `--page-h`.
3. Question slot: question text, optional `why` as a muted line, then
   options as the same choice buttons TypeformFlow uses (single: pick and
   auto-advance after 250ms; multi: toggle plus an OK button), or the open
   input. Keyboard: 1 to 9 select options, Enter confirms multi and open.
4. Transitions: the outgoing question slides up and fades, the incoming
   slides in, same easing as TypeformFlow. While `pending`, the slot shows a
   skeleton of a question line and four option bars, not a loader.
5. Error state: the message and a Try again button in the slot.

**Edge cases.**
- Auto-advance on single choice must be cancellable: a second click within
  the 250ms changes the selection instead of sending the first.
- `turn` changes identity on every question; keys on `turn.index` so
  framer-motion animates the swap and not a re-render.
- Text and option ink on the page card surface in both themes: 4.5:1. The
  muted `why` line is body text, so it is 4.5:1 too, not 3:1.
- Reduced motion: honour `prefers-reduced-motion` by dropping the slide.

**Done when.** A storybook-free check: a throwaway page under
`apps/main/app/(main)/design/` (the existing design sandbox route) renders
the component through single, multi, open, pending and error states, and is
removed before commit.

---

## MO-4 Gate, rail widgets and wiring into the four practice pages

- [ ] Status: in progress (2026-09-22). Built and typechecks. Not verified in a browser; the Chrome extension was not connected. The checklist is in `manual-pass-1.md` under "Not verified".
- Blocked by: MO-2, MO-3
- Blocks: MO-6, MO-7, MO-9

**Why.** Items 1, 2, 6. This is what the user meets.

**Files.**
- `apps/main/components/onboarding/module-gate.tsx` (new: the pre-run
  screen)
- `apps/main/components/onboarding/module-onboarding.tsx` (new: client
  orchestration, owns the run state and calls the actions and the route)
- `apps/main/components/onboarding/onboarding-rail.tsx` (new: widgets)
- `apps/main/app/(main)/practice/dsa/page.tsx`,
  `.../system-design/page.tsx`, `.../web-frontend/page.tsx`,
  `.../web-backend/page.tsx` (server-side branch on
  `getCurrentOnboarding`)
- `apps/main/app/(main)/practice/_components/practice-layout-wrapper.tsx`
  (no change expected; confirm the sidebar stays)

**Steps.**
1. Each practice page: `const ob = await getCurrentOnboarding(key)`. If
   `ob.completed` is null, render `ModuleGate` (or `ModuleOnboarding`
   directly when `ob.inProgress` exists and `?resume=1`, so a returning
   user skips the gate). Else render the existing content plus the widget
   from MO-6.
2. `ModuleGate`: module label, one paragraph on why, "about N minutes",
   Start (or Resume when a run is in progress). Start calls
   `startOnboardingRun` then swaps to `ModuleOnboarding` without a
   navigation.
3. `ModuleOnboarding`: on mount calls `/api/onboarding/next`; on answer
   calls `answerOnboardingTurn` then `next`; on `done` calls
   `router.refresh()` so the server page re-renders into the dashboard with
   the summary card (MO-6) mounted open.
4. Rail widgets, top to bottom:
   - module heading and the "why" paragraph;
   - **answered so far**: each answered turn as a row with the question
     shortened and the answer as caption, clickable (MO-8);
   - **question N**: the current index, no total;
   - **what happens next**: two lines on the card and the dashboard.
5. Smoothness: the answer is shown as selected immediately, the slot goes
   to skeleton, and the rail row for the just-answered turn animates in
   before the next question arrives.

**Edge cases.**
- Prefetching the next question is impossible (it depends on the answer),
  so the only latency levers are the model, `max_tokens` and keeping the
  route warm. Measure p50 in MO-9.
- The four pages fetch problems, categories and leaderboard before
  rendering. Behind the gate that data is unused; branch before fetching so
  the gated page is not slower than the dashboard.
- The existing `loading.tsx` for each page matches the dashboard. It is
  also what shows before the gate. Accept the mismatch for first-time
  users once, note it in MO-9, and do not build a second skeleton unless
  the reflow is measurable.
- Sign-out mid-run: the run row stays `in_progress`; nothing client-side
  needs clearing because nothing is stored client-side.

**Done when.** A fresh user opening `/practice/dsa` sees the gate, cannot
reach the problem list by URL tricks (`?topic=` still gates), completes a
run, and lands on the dashboard; a second sub-module shows its own gate
with questions that read as that module's.

---

## MO-5 Voice input for open questions

- [ ] Status: in progress (2026-09-22). Built and typechecks. Not verified in a browser; the Chrome extension was not connected. The checklist is in `manual-pass-1.md` under "Not verified".
- Blocked by: MO-3

**Why.** Item 4. Open questions get a mic, using what the product already
has.

**Files.**
- `apps/main/components/onboarding/open-answer-input.tsx` (new: text field
  plus mic, fills `renderOpenInput`)
- `apps/main/actions/(main)/practice/voice.action.ts` (`getScribeToken`,
  reference; propose moving to `actions/(common)/voice/` in a later cleanup
  task, not here)
- `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
  (reference for the `useScribe` wiring)

**Steps.**
1. Same pattern as the mentor: `useScribe` with partial transcripts into
   the field, committed transcript replaces it, stop sends nothing by
   itself; the user reviews the text and presses OK.
2. `viaVoice: true` on the answer when any part came from the mic.
3. Mic permission denied or token failure: the field stays usable and a
   one-line notice explains the mic is unavailable.

**Edge cases.**
- The mic must stop when the question changes or the component unmounts,
  or the next question's field fills with speech meant for the last one.
- The transcript may exceed the 500 character cap; truncate visibly with a
  counter, do not fail on submit.

**Done when.** An open question answered by voice arrives on the run with
`viaVoice: true` and the exact reviewed text; denying the mic permission
leaves the text path working.

---

## MO-6 Completion: summary card, dashboard widget, retake

- [ ] Status: in progress (2026-09-22). Built and typechecks. Not verified in a browser; the Chrome extension was not connected. The checklist is in `manual-pass-1.md` under "Not verified".
- Blocked by: MO-4

**Why.** Items 7, 8, 9.

**Files.**
- `apps/main/components/onboarding/onboarding-summary-card.tsx` (new)
- `apps/main/components/onboarding/onboarding-widget.tsx` (new)
- `apps/main/actions/(main)/onboarding/module-onboarding.action.ts`
  (`retakeOnboarding(moduleKey)`)
- the four practice pages and `module-content.tsx` (mount the widget at
  the top of the dashboard)

**Steps.**
1. On `done`, the flow shows the summary card in place of the question
   slot: level as a badge, the three lines, a Continue button. Continue
   refreshes into the dashboard.
2. The widget on the dashboard: level, three lines, "Retake" and a
   collapsed "what you told us" listing facts, strengths, gaps, goals.
3. `retakeOnboarding` creates version `max + 1` as `in_progress` and the
   page renders the flow. The widget keeps showing the last completed
   version until the new one completes.
4. An abandoned retake shows a "Resume retake" link on the widget rather
   than gating the dashboard again.

**Edge cases.**
- The level badge is monochrome. Four levels distinguished by label and a
  filled-segment meter, not colour.
- The three summary lines are model output about the user; render as
  text, never as markdown.
- A completed run with a missing or malformed `profile` (a bad model
  reply that slipped past MO-2's guard) must not crash the page: render
  the widget with "We could not summarise this run" and a Retake.

**Done when.** After a run, the dashboard shows the card with the stored
level; Retake starts version 2 while the widget still shows version 1;
completing version 2 swaps the widget; abandoning version 2 leaves the
dashboard usable with a Resume link.

---

## MO-7 Projects gate

- [ ] Status: in progress (2026-09-22). Built and typechecks. Not verified in a browser; the Chrome extension was not connected. The checklist is in `manual-pass-1.md` under "Not verified".
- Blocked by: MO-4, MO-6

**Why.** Item 1 for the fifth key. Projects has a different hub page.

**Files.**
- `apps/main/app/(main)/projects/page.tsx` (`HubContent` branches on
  `getCurrentOnboarding('projects')`)
- `apps/main/app/(main)/projects/_components/ProjectsHubClient.tsx` (mount
  the widget)
- `apps/main/lib/onboarding/modules.ts` (the `projects` focus text)

**Steps.**
1. Branch before `getMyProjectsOverview` and `getModuleActivity` so the
   gated page does not pay for data it will not show.
2. Focus text for projects: built, shipped, deployed, team or solo, stack,
   what they want to build next, how much time per week.
3. Widget at the top of the hub.

**Edge cases.**
- `/projects/[slug]`, `/projects/myprojects`, `/projects/allprojects` and
  `/projects/ideas` are not gated. A user with a project link from a
  teammate must still open it. Only the hub is gated.
- `pnpm check-nav` after touching the hub.

**Done when.** A fresh user sees the gate at `/projects`, can still open
`/projects/myprojects` directly, and the questions asked are about building
and shipping rather than solving problems.

---

## MO-8 Change an earlier answer

- [ ] Status: in progress (2026-09-22). Server side verified end to end: reopening question 2 truncates the later turns and clears its answer, and the run continues to a completed profile. The rail click and confirm dialog in a browser still owed.
- Blocked by: MO-4

**Why.** Item 10. The rail lists answered questions; clicking one must do
something honest.

**Files.**
- `apps/main/actions/(main)/onboarding/module-onboarding.action.ts`
  (`reopenOnboardingTurn(runId, index)`)
- `apps/main/components/onboarding/onboarding-rail.tsx`
- `apps/main/components/onboarding/module-onboarding.tsx`

**Steps.**
1. Clicking an answered row shows a confirm: "Changing this discards the N
   questions after it." On confirm, `reopenOnboardingTurn` truncates
   `turns` to `index + 1`, clears that turn's answer, recomputes
   `openQuestionCount` from the remaining turns, and returns the run.
2. The flow shows that turn again with the previous answer preselected.
3. On answer, `next` generates from the truncated history as usual.

**Edge cases.**
- Reopening the current unanswered turn is a no-op.
- Reopening on a completed run is refused; the user retakes instead.
- The conditional append in MO-2 must use the truncated length, which it
  does automatically because it reads the row first.

**Done when.** Changing answer 2 in a 7-turn run leaves 2 turns, shows
question 2 with the old answer selected, and the regenerated question 3
differs from the original when the answer differs.

---

## MO-9 Question quality pass, skeletons, contrast, browser run

- [ ] Status: in progress (2026-09-22). Persona pass (ten runs, verdicts), latency (p50 1308 ms, p95 2809 ms) and the contrast table are in `manual-pass-1.md`; two prompt fixes came out of it. The browser run and the below-lg check remain.
- Blocked by: MO-5, MO-6, MO-7, MO-8

**Why.** Item 14. The prompt is judged by the questions it produces, per
module.

**Files.**
- `plan/module-onboarding/manual-pass-1.md` (new)
- `apps/main/lib/onboarding/modules.ts` (focus text edits from the pass)
- `apps/main/lib/onboarding/prompt.ts` (rule edits from the pass)

**Steps.**
1. For each of the five keys, run the flow twice as two personas (a
   first-semester student who has done nothing; a final-year student with
   internships). Paste every question and answer into the pass file with a
   one-line verdict: specific to the module, specific to the answers,
   options sensible, no repeats, ended at a sensible count.
2. Fix focus text and rules until every run passes, then rerun the failing
   ones.
3. Record p50 and p95 of the wait between answer and next question over
   twenty questions on the deployed route.
4. Contrast: measure the rail, the options, the `why` line, the summary
   card and the widget in both themes.
5. `cd apps/main && npx tsc --noEmit`, `pnpm check-nav`, and the two `-e`
   dash greps from `CLAUDE.md` over `apps/main`, `packages/ui`,
   `packages/db`, `plan/module-onboarding`.

**Edge cases.**
- Reused answers across personas can hide repetition bugs. Vary the open
  answers.
- If p50 is over two seconds, the levers in order: `max_tokens`, trimming
  the turns sent (keep all answers, shorten option lists in history),
  model. Record what was changed.

**Done when.** `manual-pass-1.md` holds ten runs with verdicts, the
latency numbers, and the contrast table; both checks pass; the dash grep
returns nothing.
