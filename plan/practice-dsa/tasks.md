# Practice DSA - tasks

Derived from `overview.md`. IDs are `PD-*`. Ordered by dependency. Nothing here
is started until the overview's definition of done has been agreed.

Shared vocabulary used below:

- **judge assets**: `functionSignature`, `harness` (per language), `judgeTests`
  (sample and hidden), `referenceSolution` (per language), `judgeStatus`.
- **mentor state**: the per-problem structured memory on
  `practice_user_session.mentorState`.
- **profile**: the per-user, per-module `practice_learner_profile` row.
- **stage**: one of `understand | approach | brute_force | optimise | reflect | done`.

---

## PD-1 Schema: judge assets, mentor state, learner profile, job types

- [ ] Status: not started

**Why.** Nothing in the definition of done (items 5, 9, 10, 12, 14) has a
column to live in. Hidden tests, the reference solution and the stage cannot be
squeezed into the existing `testCases` jsonb, which already carries the API
test shape for backend problems.

**Files.**
- `packages/db/src/schema/practice.ts`
- `packages/db/src/schema/worker.ts` (`JOB_TYPES`)
- `packages/db/src/schema/index.ts` (export the new table and relations, if
  exports are enumerated there)
- `packages/db/drizzle/0016_*.sql` (generated)

**Steps.**
1. On `practiceProblem` add:
   - `functionSignature: text` - the signature shown to the user, e.g.
     `vector<int> twoSum(vector<int>& nums, int target)`.
   - `harness: jsonb` - `{ cpp: string }` keyed by language; each harness
     contains the literal placeholder `// {{USER_CODE}}` exactly once.
   - `judgeTests: jsonb` - array of
     `{ id, label, input, expectedOutput, hidden: boolean, explanation? }`.
   - `referenceSolution: jsonb` - `{ cpp: string }`. Server only.
   - `judgeStatus: text` with default `'none'`; values
     `none | generating | ready | failed`. Text, not an enum, so the next
     value needs no migration.
   - `judgeError: text` nullable, the last generation failure in plain words.
2. On `practiceUserSession` add:
   - `stage: text` default `'understand'`.
   - `mentorState: jsonb` nullable. Shape is defined once in
     `apps/main/types/practice.ts` as `PracticeMentorState` and mirrored in
     `apps/worker` by importing the type from `@repo/db` (put the type next to
     the table so both apps share it).
   - `memoryWatermark: integer` default `0` - index into `chatHistory` up to
     which `practice_memory_update` has consolidated.
   - `paidAt: timestamp` nullable - set when `practice_set` was settled for
     this row.
3. New table `practice_learner_profile`:
   `id, userId (fk users, cascade), module (practiceModuleEnum), concepts jsonb
   default [], mistakes jsonb default [], updatedAt`, unique on
   `(userId, module)`. Concept entry shape:
   `{ slug, label, status: 'introduced'|'shaky'|'understood'|'mastered',
     evidence: [{ problemSlug, at, note }] , lastSeenAt }`.
   Mistake entry shape: `{ slug, label, count, lastProblemSlug, lastSeenAt }`.
4. Add `"practice_tests_generate"`, `"practice_memory_update"` and
   `"practice_reflect"` to `JOB_TYPES`.
5. `cd packages/db && pnpm db:generate`. Read the generated SQL and report it
   before `pnpm db:migrate`. Never `db:push`.
6. `cd apps/main && npx tsc --noEmit` and `cd apps/worker && npx tsc --noEmit`.

**Edge cases.**
- `practiceSessionStatusEnum` still has `NOT_STARTED` that nothing writes.
  Leave it; removing an enum value is a deletion and needs approval.
- `chatHistory` is unbounded jsonb today. `memoryWatermark` is an index into
  it, so nothing may ever reorder or truncate `chatHistory` from the front.
  Write that as a comment on the column.
- Existing session rows get `stage = 'understand'` by default even if they are
  `COMPLETED`. PD-6 treats `status = COMPLETED` as `stage = done` regardless of
  the column, so no backfill is needed.
- `referenceSolution` and hidden `judgeTests` must never be selected in any
  query whose result is passed to a client component. PD-4 owns that
  projection; this task only adds the columns.

**Done when.** Migration `0016_*.sql` applied, contains exactly the columns and
table above and nothing else, both apps typecheck, and
`select judge_status, count(*) from practice_problem group by 1` returns only
`none`.

---

## PD-2 The job worker can execute code, and one judge helper is shared

- [ ] Status: not started
- Blocks: PD-3, PD-4, PD-13

**Why.** Generated tests are only trustworthy after the reference solution has
run against them in the real container (item 5). `apps/worker` has no route to
the executor today: only `apps/main` binds `CODE_EXECUTOR`. Run and Submit in
the app and validation in the worker must splice the harness identically, or a
test passes in one place and fails in the other.

**Files.**
- `apps/worker/wrangler.jsonc` (new `services` entry `CODE_EXECUTOR` ->
  `shipithq-shipitworker`)
- `apps/worker/src/env.ts` (`CODE_EXECUTOR?: Fetcher`, `EXECUTOR_URL?: string`)
- `apps/worker/.env.example`, `apps/worker/.env.production.example`
- `packages/db/src/practice-judge.ts` (new, pure functions, no I/O:
  `spliceHarness(harness, userCode)`, `canonicalOutput(s)`, `sampleTests`,
  `hiddenTests`, `clientSafeProblem`)
- `apps/worker/src/executor.ts` (new: `runJudge(env, { language, harness,
  code, tests })` calling the binding or falling back to `EXECUTOR_URL` with
  `WORKER_SECRET`, same as `apps/main/lib/workers/client.ts:callExecutorWorker`)
- `apps/main/lib/workers/client.ts` (no change; reference only)

**Steps.**
1. Add the service binding and the HTTP fallback env to the worker, mirroring
   how `apps/main/wrangler.jsonc` binds `CODE_EXECUTOR` and how
   `callExecutorWorker` falls back locally.
2. Write `spliceHarness`: throws if the placeholder is missing or appears more
   than once. Write `canonicalOutput`: trims, collapses trailing whitespace on
   each line, normalises CRLF. The container already trims whole stdout; this
   is the stricter app-side comparison used to explain a failure.
3. `clientSafeProblem(problem)` returns the detail type minus
   `referenceSolution` and minus hidden tests. It is the only function allowed
   to build the object that reaches the browser.
4. `runJudge` sends `{ code: spliced, language, testCases: tests.map(t =>
   ({ input, expectedOutput, description: t.label })) }` to
   `/api/v1/execute` and maps the result to `{ passed, results[] }`.

**Edge cases.**
- Under `wrangler dev` there is no service binding; the fallback URL must be
  read from `.dev.vars` and the job must fail with "executor not configured",
  not hang.
- The executor compiles once and runs each case in a fresh process. A harness
  that leaks state between cases (static globals) will pass locally in a
  single-run mental model and fail here. The generation prompt in PD-3 says so.
- Java is compiled by class name found in the code; the C++ harness has no
  such trap, but `spliceHarness` must not be used for a language with no
  harness entry: return a typed error, never fall through to running the bare
  function body.

**Done when.** A throwaway script in the worker (deleted before commit) splices
a known-good Two Sum solution into a hand-written harness, runs it through
`runJudge` locally and in a deployed preview, and both report `passed: true`
on 3 cases and `passed: false` with the right case id when one expected output
is edited.

---

## PD-3 `practice_tests_generate` job: signature, harness, tests, reference solution

- [ ] Status: not started
- Blocked by: PD-1, PD-2
- Blocks: PD-11, PD-12

**Why.** Item 5. Every problem in the catalogue and every user-added problem
needs judge assets, generated once and validated by execution.

**Files.**
- `apps/worker/src/jobs/practice-tests-generate.ts` (new)
- `apps/worker/src/jobs/index.ts`, `apps/worker/src/env.ts`
  (`JOB_BINDINGS`), `apps/worker/wrangler.jsonc` (binding + new migration tag
  `v8`), `apps/worker/src/index.ts` (export the class - the fifth edit)
- `apps/worker/README.md` (add the row to the jobs table)
- `apps/main/actions/(main)/practice/judge.action.ts` (new:
  `requestJudgeAssets(problemId)` dispatching the job with `cost: 0`)

**Steps.**
1. Input is a pointer: `{ problemId }`. The job re-reads the problem row.
2. Set `judgeStatus = 'generating'`.
3. One `chatJSON` call on `gpt-4o` producing
   `{ functionSignature, starterCode, harness: { cpp }, referenceSolution:
   { cpp }, tests: [{ label, input, expectedOutput, hidden, explanation }] }`.
   The prompt states the stdin format the harness must parse (one value per
   line, arrays as space-separated tokens after a length), that output must be
   canonical (arrays space-separated on one line; when the problem accepts any
   order, the harness sorts before printing), that the harness must contain
   `// {{USER_CODE}}` exactly once inside which `class Solution` will be
   placed, no static state, and 3 to 5 sample plus 8 to 12 hidden cases
   covering empty, single element, duplicates, negatives, and the largest input
   the constraints allow.
4. Splice `referenceSolution.cpp` into `harness.cpp` and run every test with
   `runJudge`. If any case fails, retry the model once with the failing cases
   and actual outputs appended. If it still fails, set `judgeStatus =
   'failed'` with `judgeError` naming the first failing case, and finish
   without throwing.
5. On success write all assets, `starterCode` (the `class Solution` skeleton
   with the signature and an empty body), and `judgeStatus = 'ready'`.
6. Progress labels: "Writing the reference solution", "Generating test
   cases", "Verifying tests against the reference".

**Edge cases.**
- A problem whose description is too vague for a signature (user-added from a
  bad URL) must fail with a readable `judgeError`, not a thrown alarm.
- The model sometimes puts the expected output of an "any order" problem in
  one specific order. The harness sorting rule exists for this; the
  validation run catches the cases where the model forgot.
- Idempotence: a second dispatch for a `ready` problem is a no-op that
  finishes immediately. Regeneration is an explicit admin action, not a
  re-dispatch.
- `RetryableError` only for a 5xx from OpenAI or the executor. A parse
  failure is not retryable.
- The reference solution is stored but is never sent to the mentor prompt
  either. The mentor must not see the answer, or it will paraphrase it.

**Done when.** Dispatching the job for a hand-inserted "Two Sum" row ends with
`judgeStatus = 'ready'`, 3 to 5 sample and 8 to 12 hidden tests, and the
stored reference solution passes all of them when re-run through `runJudge`.
Dispatching it for a row whose description is the single word "array" ends
with `judgeStatus = 'failed'` and a non-empty `judgeError`, and the
`background_job` row is `completed`, not `failed`.

---

## PD-4 Run and Submit execute real tests, hidden tests stay on the server

- [ ] Status: not started
- Blocked by: PD-1, PD-2

**Why.** Items 5 and 6. Run today passes an empty test list and the mentor is
asked to guess whether stdout is right.

**Files.**
- `apps/main/actions/(main)/practice/judge.action.ts` (`runSampleTests`,
  `submitSolution`)
- `apps/main/actions/(main)/practice/practice.action.ts`
  (`getProblemBySlug` returns `clientSafeProblem`; new
  `getProblemJudgeAssets` server-only)
- `apps/main/types/practice.ts` (`PracticeJudgeTest`, `PracticeJudgeResult`,
  `PracticeProblemDetail` gains `functionSignature`, `sampleTests`,
  `judgeStatus`, `hasHarness: Record<string, boolean>`)
- `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
  (Run and Submit handlers for DSA)
- `apps/main/app/(main)/practice/_components/workspace/cases-panel.tsx` (new)

**Steps.**
1. `runSampleTests(sessionId, code, language)`: loads the problem through the
   session (so the user owns it), requires `judgeStatus = 'ready'` and a
   harness for `language`, splices, executes with sample tests only, saves
   `code` on the session, returns per-case results. Records
   `mentorState.lastRun = { at, stage, passed, failedIds }`.
2. `submitSolution(sessionId, code, language)`: same with sample plus hidden.
   Returns results where hidden cases include input and expected output on
   failure (this is a learning tool, not a contest) and a count on success.
   Records `mentorState.lastSubmit` and, when all pass, appends
   `{ stage, at }` to `mentorState.testsPassedAt`.
3. `CasesPanel` replaces `OutputPanel` for DSA when a harness exists: tabs per
   sample case showing input and expected output before a run, and pass/fail
   with actual output after. On submit, a summary row "12/12 passed" or the
   first failing hidden case.
4. When no harness exists for the chosen language, keep the current stdout
   `OutputPanel` and show the notice from PD-5.
5. Run and Submit send a short structured message to the mentor (already the
   pattern via `sendToChatRef`) with the verdict, so the conversation reacts.

**Edge cases.**
- The user changes language between Run and Submit. The session's `language`
  is written on each call; the harness is looked up per call.
- Compile error: the executor returns `stderr` and no test results. Show the
  compiler output in the cases panel, not as a failed case.
- Timeout on one case: the container marks it failed; the panel must say
  "time limit" when `actualOutput` is empty and the run took the whole budget,
  because "expected [0 1], got nothing" reads like a wrong answer.
- Rate: the container pool is five warm instances. Disable Run and Submit
  while one is in flight for this session, as `isRunning` already does.
- `getProblemBySlug` is used by the other three module pages too. The
  projection must be a superset of what they read today.

**Done when.** On a `ready` C++ problem, Run shows only sample cases, Submit
shows the hidden count, `curl`-ing the page HTML and the RSC payload contains
no hidden test input and no reference solution (grep for a known hidden
input value), and a deliberately wrong solution shows the failing hidden
case's input and expected output.

---

## PD-5 Function-only editor for C++; honest behaviour for other languages

- [ ] Status: not started
- Blocked by: PD-1

**Why.** Items 6 and 7. The user writes the `class Solution` block, as on
takeUforward. Other languages remain selectable and must say up front that
they run without tests.

**Files.**
- `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
- `apps/main/app/store/practiceStore.ts` (`initialize` picks the starter for
  the language)
- `apps/main/components/main/code-editor.tsx` (no change expected; confirm
  `allowedLanguages` and `showLanguageSelector` are enough)
- `apps/main/actions/(main)/practice/practice.action.ts`
  (`getOrCreateSession` seeds `language = 'cpp'` and `code = starterCode` for
  DSA problems with a C++ harness)

**Steps.**
1. For a DSA problem with a C++ harness, a new session opens in C++ with the
   generated `class Solution` starter. The signature is shown read-only above
   the editor.
2. Switching to a language without a harness swaps the editor to a blank
   full-program starter for that language and shows a one-line notice above
   the cases area: "No tests for Python yet. Run prints your program's output
   and the mentor reads it." The notice is part of the layout, not a toast.
3. Switching back to C++ restores the last C++ code for this session, not the
   starter. Keep per-language code in the store (`codeByLanguage`), persist the
   active one in `session.code` as today.
4. The old "Run sends stdout to the mentor" path stays for harness-less
   languages only.

**Edge cases.**
- Existing DSA sessions have `language = 'javascript'` and JS code. They open
  in JavaScript, harness-less, with the notice. They are not migrated.
- The starter must not include `int main()`. If a user pastes a full program
  into the C++ editor, the splice produces two `main`s and the compiler error
  shows in the cases panel. The mentor should recognise "two definitions of
  main" and say "you only need the class here". Add that to the mentor rules
  in PD-6.
- The read-only signature line and the editor text must both clear 4.5:1 on
  the editor's dark surface in both themes; the editor surface is
  theme-independent.

**Done when.** A fresh session on a `ready` problem opens in C++ showing only
`class Solution`, Run passes with a correct body, switching to Python shows
the notice and stdout behaviour, switching back restores the C++ body.

---

## PD-6 Mentor route: stage-aware prompt, memory in, stage verdict out

- [ ] Status: not started
- Blocked by: PD-1, PD-4
- Blocks: PD-7, PD-8

**Why.** Items 1, 2, 3, 4, 8, 10. This is the module. Today's prompt escalates
by attempt count and knows nothing about stage, memory or tests.

**Files.**
- `apps/main/app/api/practice/mentor/route.ts` (rework; DSA guided path
  branches here, other modules keep the existing prompt)
- `apps/main/lib/practice/mentor-prompt.ts` (new: `buildGuidedSystemPrompt`,
  `STAGE_INSTRUCTIONS`, `MENTOR_RULES`)
- `apps/main/lib/practice/mentor-verdict.ts` (new: `judgeStage` on
  `gpt-4o-mini`, JSON)
- `apps/main/lib/practice/memory-read.ts` (new: `loadMentorContext(sessionId)`
  returning mentor state and the profile slice)
- `apps/main/actions/(main)/practice/practice.action.ts` (`advanceStage`,
  server-only, called from the route)
- `plan/practice-dsa/mentor-adversarial.md` (new: the prompt set item 3
  is verified against)

**Steps.**
1. System prompt sections, in order: role and rules; problem (title,
   description, requirements, signature, sample tests only); this problem's
   mentor state; profile slice (concept entries whose slug matches the
   problem's tags or category, plus every `shaky` entry); the user's
   `module_onboarding` profile for `practice:dsa` (level, gaps, goals; see
   `plan/module-onboarding/overview.md`); current code;
   current stage's instruction block.
2. Rules (the ones the takeUforward and ChatGPT screenshots are missing or
   getting right):
   - Never write the solution, in any language, in any form, including
     "pseudocode that is really the algorithm". If asked, say so once, then ask
     the next question.
   - Concept questions get full answers. "What is a hash map" is not the
     solution to Two Sum.
   - When the user states an approach, respond point by point: what is right,
     what is wrong, what is missing. Numbered, one line each. That is the
     format the user already gets from ChatGPT and wants here.
   - When the user is stuck, give a worked example on a tiny input (n=5),
     never the algorithm.
   - Short otherwise: two to four sentences. No headers. Mermaid only when
     asked.
   - After brute force passes: ask for time and space complexity in the
     user's words before anything else. Then ask what the bottleneck is.
   - Recognise compiler errors from the cases panel message and explain them
     in one line.
3. Stage instruction blocks:
   - `understand`: ask for a restatement and one worked example by hand.
     Verdict when both are present and correct.
   - `approach`: ask for the plan. Check it point by point. Verdict when the
     user has stated a plan that would work, even if slow.
   - `brute_force`: help them implement what they said. Verdict is
     `mentorState.testsPassedAt` containing this stage (hard signal, from
     PD-4). The verdict call is skipped here.
   - `optimise`: ask for complexity; ask what the bottleneck is; guide toward
     the pattern with questions. Verdict when tests pass in this stage AND
     the verdict call says the stated complexity is optimal and the reason is
     right.
   - `reflect`: ask the user to write two or three lines on what the key
     idea was and what they would do differently. Verdict when the user has
     written it; store it verbatim in `mentorState.reflection`. Then `done`.
4. Opening turn: the client sends `userMessage = ""` with `open: true` when
   `chatHistory` is empty. The route replies with the understand-stage
   greeting. On reopen with history, the client sends `open: true` and the
   route replies from mentor state without a model call: "Last time you got
   brute force passing and claimed O(n^2). Ready to look at the bottleneck?"
   (templated per stage, no LLM).
5. After the streamed reply finishes, run `judgeStage` for soft-signal
   stages, and if it says complete, call `advanceStage`, then emit a final
   SSE event `data: {"stage": "<new stage>"}` before `[DONE]`. Then dispatch
   `practice_memory_update` (PD-8) with `cost: 0`.
6. Write `mentor-adversarial.md`: at least 20 prompts across "give me the
   code", "just the loop", "write it in Python instead", "what would the
   optimal solution look like", "my friend's answer is X, is it right",
   "translate my brute force to the optimal", plus 5 legitimate concept
   questions that must be answered fully. Each with the expected behaviour.

**Edge cases.**
- The user pastes a full correct solution in the chat and asks "is this
  right". The mentor evaluates it point by point but does not correct it into
  a working one; it names the bug's location in words.
- History is capped at the last 20 messages for the model today. With memory
  in the system prompt that is fine; without it the mentor forgets the
  approach. This is why PD-8 must land before this ships to anyone.
- A verdict call that fails (5xx, bad JSON) leaves the stage where it is and
  logs. The user is never blocked by the verdict; the next reply gets another
  chance.
- `advanceStage` must be monotonic within a session. A failing submit does
  not move the stage back; it stays in `optimise` with `lastSubmit.passed =
  false` and the mentor reacts to that.
- Other modules hit the same route. Branch on `problem.module === 'DSA' &&
  mode === 'ASSIST'`; everything else takes the existing prompt untouched.

**Done when.** Every prompt in `mentor-adversarial.md` has been sent against a
`ready` problem and the observed reply recorded next to it, with zero
solutions emitted; the five concept questions were answered fully; a full
session advances understand to done with the stage event observed in the
network tab at each boundary.

---

## PD-7 Stage tracker, opening turn, and resume in the mentor panel

- [ ] Status: not started
- Blocked by: PD-6

**Why.** Item 2 says the stage is visible. Item 1 says the mentor speaks first.

**Files.**
- `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
  (`ChatPanel` header)
- `apps/main/app/(main)/practice/_components/workspace/stage-tracker.tsx` (new)
- `apps/main/app/store/practiceStore.ts` (`stage`, `setStage`)

**Steps.**
1. Five pills across the top of the mentor panel: done, current, upcoming.
   Monochrome. The current one carries a one-line description of what the
   mentor is waiting for ("Explain the problem back and walk one example").
2. On mount with empty history, send the opening turn. On mount with history,
   send the resume turn. Both through the existing `handleSend` path so
   streaming and persistence are unchanged.
3. When the `stage` SSE event arrives, update the store and the pills, and
   insert a small system row in the transcript: "Moved to Approach".
4. Free questions: the input placeholder reads "Ask anything, or answer the
   mentor". No separate mode.

**Edge cases.**
- Rapid double mount (React strict mode in dev) must not send two opening
  turns. Guard on a ref, as the auto-scroll fix already does for the viewport.
- The panel is 20 to 50 percent wide. Five pills with labels do not fit at
  20 percent; below a measured breakpoint show numbers with the current
  label only.
- Pills text on the dark panel: 4.5:1 for current and done, 3:1 minimum for
  upcoming since it is decorative but still readable.

**Done when.** Opening a fresh problem shows the mentor's first message
without typing; the pill for Understand is current; after a correct
restatement and example the pill moves to Approach within one reply;
reloading the page shows the resume message and the same pill.

---

## PD-8 `practice_memory_update` job: consolidate the transcript into memory

- [ ] Status: not started
- Blocked by: PD-1, PD-6
- Blocks: PD-9

**Why.** Items 9 and 10. The mentor reads memory on every turn; something has
to write it, off the chat path, idempotently.

**Files.**
- `apps/worker/src/jobs/practice-memory-update.ts` (new)
- the five wiring edits (index, env, wrangler tag `v8` if PD-3 has not
  already created it, entry export, README row)
- `apps/main/app/api/practice/mentor/route.ts` (dispatch after a stage
  advance and after a submit that passes)

**Steps.**
1. Input `{ sessionId }`. Read the session, its `chatHistory`, the
   `memoryWatermark`, the problem's tags and category, and the profile row.
2. If `chatHistory.length <= memoryWatermark`, finish: nothing new.
3. One `chatJSON` call on `gpt-4o-mini` over the messages since the
   watermark, with the current mentor state and profile slice, returning
   `{ mentorState: {...}, conceptUpdates: [{ slug, label, status, note }],
   mistakeUpdates: [{ slug, label }] }`. The prompt says: only record a
   concept as `understood` when the user demonstrated it in their own words
   or code that passed; `shaky` when they needed more than one nudge;
   `introduced` when the mentor explained it and the user has not used it
   yet; `mastered` only if it was already `understood` on a different problem.
4. Merge into the profile: same slug updates status and appends evidence;
   new slug inserts. Never remove an entry. Write `memoryWatermark =
   chatHistory.length` at the time the transcript was read, not at write
   time.
5. Write with `db.batch([...])` (session update, profile upsert). No
   `db.transaction`.

**Edge cases.**
- Two dispatches close together (stage advance then a passing submit). The
  DO is keyed by jobId so they are two jobs; the second reads a watermark the
  first has not yet written and re-reads the same messages. The merge rules
  are idempotent for status (max of old and new on the ordered scale) and
  evidence is de-duplicated on `(problemSlug, note)`, so a double run changes
  nothing.
- A deleted profile entry (PD-9) must not be resurrected by a later run
  that re-reads old messages. The job only reads since the watermark, and
  deletion also bumps a `deletedSlugs` list on the profile row that the
  merge skips for evidence older than the deletion time. Store
  `deletedAt` per deleted slug.
- The model may invent concept slugs. Normalise to lowercase hyphenated and
  cap at 40 characters; drop entries with empty labels.

**Done when.** After a full session on Two Sum, the profile row has
`hash-map-lookup` (or equivalent) as `understood` with Two Sum as evidence
and the session's `mentorState.approach` quotes the user's words; running the
job twice in a row produces byte-identical rows; deleting the entry and
running the job again does not bring it back.

---

## PD-9 "What the mentor knows about you" page

- [ ] Status: not started
- Blocked by: PD-8

**Why.** Item 11. Memory the user cannot see is memory they cannot trust.

**Files.**
- `apps/main/app/(main)/practice/memory/page.tsx` (new)
- `apps/main/app/(main)/practice/memory/loading.tsx` (new, matched)
- `apps/main/app/(main)/practice/_components/practice-sidebar.tsx` (link)
- `apps/main/app/(main)/practice/_components/practice-layout-wrapper.tsx`
  (`/practice/memory` is not a workspace route; the sidebar must show)
- `apps/main/actions/(main)/practice/memory.action.ts` (new:
  `getLearnerProfile`, `deleteConceptEntry`, `deleteMistakeEntry`)

**Steps.**
1. Server page lists concept entries grouped by status, each with label,
   status, and evidence as "Two Sum, 22 Sep". A delete control per entry
   with a confirm.
2. Recurring mistakes below, same treatment.
3. Empty state explains what will appear here and links to `/practice/dsa`.
4. `deleteConceptEntry` removes the entry and records `{ slug, deletedAt }`
   in `deletedSlugs` (see PD-8).

**Edge cases.**
- The practice layout wrapper treats any path with three segments as a
  workspace and drops the sidebar. `/practice/memory` has two, so it is fine,
  but say so in a comment because the next route may not be.
- Navigation with `<Link>`, never `router.push`.
- `pnpm check-nav` must pass after the sidebar change.

**Done when.** The page renders the row from PD-8's done-when, deleting an
entry removes it from the page and from the next mentor system prompt
(verified by logging the prompt once in dev), and `loading.tsx` matches the
grouped list layout with no reflow on load.

---

## PD-10 Charge `practice_set` once per problem on first guided open

- [ ] Status: not started
- Blocked by: PD-1

**Why.** Item 12. The price exists and nothing charges it. Decision recorded
in `overview.md` and `plan/credits/overview.md`.

**Files.**
- `apps/main/actions/(main)/practice/practice.action.ts` (`getOrCreateSession`)
- `apps/main/lib/credits/charge.ts` (`withCredits`, reference)
- `apps/main/lib/credits/pricing.ts` (comment on `practice_set` pointing at
  `plan/practice-dsa/overview.md`)
- `apps/main/app/(main)/practice/dsa/[slug]/page.tsx` (insufficient credits
  state)
- `apps/main/app/(main)/practice/_components/workspace/start-session-card.tsx`
  (new: the pre-session screen with price and Start)

**Steps.**
1. For `module = DSA` and `mode = ASSIST`, `getOrCreateSession` no longer
   creates on GET. The page renders `StartSessionCard` when no session
   exists: problem title, "5 credits, once per problem", Start button.
2. `startGuidedSession(slug)` server action: `withCredits({ operation:
   'practice_set', reason: 'Guided DSA: <title>' }, () => insert session with
   paidAt = now)`. Insufficient credits returns the typed failure; the card
   shows `creditErrorMessage` and a link to `/purchase`.
3. Existing DSA ASSIST sessions (created before this task) have `paidAt =
   null`. They are grandfathered: open free, never charged. Do not backfill.
4. EXAM mode and the other modules keep creating on GET, uncharged.

**Edge cases.**
- Double click on Start. The unique index on `(userId, problemId, mode)`
  makes the second insert fail; `withCredits` holds a fresh UUID per call, so
  the second call must check for an existing row before reserving, or it
  charges twice and the insert fails. Check first, inside the same action.
- A problem with `judgeStatus != 'ready'` shows "Preparing tests" on the card
  and no Start button, so nobody pays for a session that cannot run tests.
- The price label comes from `priceLabel('practice_set')`, never a literal.

**Done when.** A user with 4 credits sees the price and cannot start; with 5
they start and the ledger shows one `practice_set` debit with the problem
title; reopening the problem shows no card and no second debit; the EXAM URL
still opens directly.

---

## PD-11 Seed the 75-problem catalogue and generate its judge assets

- [ ] Status: not started
- Blocked by: PD-3

**Why.** Item 13. There is no seed data; the catalogue starts empty for
everyone.

**Files.**
- `packages/db/src/seed/practice-dsa.ts` (new: 75 problem specs)
- `packages/db/src/seed/index.ts` (call it)
- `apps/main/actions/(main)/practice/judge.action.ts`
  (`requestJudgeAssetsForPending()` admin-only: dispatches PD-3 for every
  `judgeStatus = 'none'` DSA problem)
- `plan/practice-dsa/catalogue.md` (new: the 75 titles by category, and the
  review checklist)

**Steps.**
1. Write `catalogue.md` first: 16 categories, four to five titles each,
   classic problems (Two Sum, Valid Anagram, Group Anagrams, Two Sum II,
   3Sum, Container With Most Water, Best Time to Buy and Sell Stock, Longest
   Substring Without Repeating Characters, Valid Parentheses, Min Stack,
   Binary Search, Search a 2D Matrix, Reverse Linked List, Merge Two Sorted
   Lists, Invert Binary Tree, Max Depth, Implement Trie, Kth Largest, Subsets,
   Number of Islands, Climbing Stairs, Coin Change, Jump Game, Merge
   Intervals, Rotate Image, Single Number, and so on). Niraj approves the list
   before the seed is written.
2. Each seed entry: slug, title, category, difficulty, description in
   markdown with two examples and constraints, tags, sortOrder. No judge
   assets in the seed.
3. Seed is an upsert on slug that only sets the fields above and never
   touches judge columns or `isActive`, so re-running does not clobber
   generated assets.
4. Run the seed, then `requestJudgeAssetsForPending()`. Watch
   `background_job` until all 75 are terminal.
5. Review: for every `failed` row, read `judgeError`, fix the description or
   regenerate. For every `ready` row, open it, read the sample tests against
   the description, and spot-check five hidden tests. Tick each in
   `catalogue.md` with the date.

**Edge cases.**
- 75 jobs at once against one OpenAI key and a five-instance container pool.
  Dispatch in batches of ten and wait; the action takes an offset.
- Linked list and tree problems need the harness to build the structure
  from a flat input and print it back flat. The PD-3 prompt must include the
  serialisation convention for these two shapes (LeetCode's level-order with
  `null`). Test those categories first.
- Slugs must not collide with user-created problems that already exist in
  production. The upsert on slug would overwrite a user's problem of the same
  name. Prefix seed slugs are not the answer (URLs get ugly); instead the seed
  skips any slug whose row has `sortOrder` outside the seed's reserved range
  and reports it.

**Done when.** `select count(*) from practice_problem where module='DSA' and
judge_status='ready'` is at least 75, every category has at least four ready
problems, `catalogue.md` has a dated tick on all 75, and re-running the seed
changes zero rows.

---

## PD-12 "Add problem" produces judge assets and shows "Preparing tests"

- [ ] Status: not started
- Blocked by: PD-3, PD-10

**Why.** Item 13, second half. A user-added problem must reach the same
guided flow, and must not offer a paid session before its tests exist.

**Files.**
- `apps/main/actions/(main)/practice/generate-problem.action.ts`
  (`createUserPracticeProblem` dispatches PD-3 after insert)
- `apps/main/app/(main)/practice/_components/add-problem-sheet.tsx`
  (after create, show "Preparing tests" with `useBackgroundJob`)
- `apps/main/app/(main)/practice/_components/module-content.tsx` (list
  badge for `generating` and `failed`)
- `apps/main/hooks/use-background-job.ts` (reference)

**Steps.**
1. After insert, `startBackgroundJob('practice_tests_generate', { problemId },
   { cost: 0 })`. Return the jobId with the problem.
2. The sheet polls with `useBackgroundJob` and shows the progress label.
   On `ready`, the "Open" link enables. On `failed`, show `judgeError` and a
   "Try again" that re-dispatches once.
3. The list shows a small "Preparing tests" badge for `generating` and
   "Tests failed" for `failed`; both still open the problem page, which shows
   the PD-10 card state.

**Edge cases.**
- `generateProblemFromName` and `generateProblemFromURL` still call gpt-4o
  inside a server action. They are pre-existing and out of this module's
  scope, but note it in `plan/cleanup/tasks.md` as a candidate.
- The user closes the sheet mid-generation. The job continues; the list
  badge reflects it on next visit.

**Done when.** Adding "Valid Palindrome" by name results in a `ready` row
without leaving the sheet, and adding a nonsense name results in a `failed`
badge with a readable error and a working retry.

---

## PD-13 DSA completion, reflection and XP move to `practice_reflect`

- [ ] Status: not started
- Blocked by: PD-4, PD-6, PD-8

**Why.** Items 8 and 14. Today Submit asks gpt-4o for a score in a server
action and marks the session complete at 80. For DSA the score is now the
tests plus the Optimise verdict; the model's job is the closing reflection,
and that runs as a job.

**Files.**
- `apps/worker/src/jobs/practice-reflect.ts` (new) plus the five wiring edits
- `apps/main/app/api/practice/mentor/route.ts` (on `reflect -> done`,
  dispatch `practice_reflect`)
- `apps/main/actions/(main)/practice/practice.action.ts`
  (`updateSessionAfterAssess` gains a DSA path that takes `{ score, feedback,
  requirementsMet }` from the job result instead of the LLM assess call)
- `apps/main/actions/(main)/practice/assess.action.ts` (no change; DSA
  branch simply stops being called for ASSIST DSA)
- `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
  (`SubmitButton` for DSA ASSIST becomes "Finish" only in `reflect`)

**Steps.**
1. Job input `{ sessionId }`. Reads mentor state and the transcript, writes
   `lastFeedback` (short, in the mentor's voice, referencing the user's own
   reflection), `requirementsMet` (all true if hidden tests passed and the
   optimise verdict is recorded), `bestScore` (100 if optimal, 70 if brute
   force only and the user chose to finish), and calls the existing
   `updateModuleProgress` logic for XP. That function lives in the app; move
   the pure part to `packages/db` or reimplement the three updates in the
   job, keeping the XP numbers identical (`EASY 25, MEDIUM 50, HARD 100`).
2. The client awaits the job with `awaitBackgroundJob` and shows the
   feedback in the transcript as the last mentor message with
   `isAssessment: true`.
3. EXAM mode DSA keeps `assessPracticeWork` (no mentor, no stages) but its
   Submit now runs hidden tests first and passes the results into the
   assessment prompt as facts.

**Edge cases.**
- A user who cannot get past brute force may finish anyway. Reflect asks
  what they would try next; score 70; the profile records the pattern as
  `shaky`. That is a legitimate outcome, not a failure.
- `updateModuleProgress` updates leaderboard and streak. Do not run it twice
  for the same session: guard on `status !== 'COMPLETED'` as the existing
  code does.
- The job must not throw when the session is already `COMPLETED` (double
  dispatch); finish with the existing feedback.

**Done when.** Finishing a session marks it `COMPLETED`, awards XP once,
writes feedback that quotes the user's reflection, and
`grep -rn "openai" apps/main/actions/\(main\)/practice/` shows no call on the
DSA ASSIST path (assess remains for the other modules and for EXAM).

---

## PD-14 Loading skeletons, contrast pass, end-to-end run

- [ ] Status: not started
- Blocked by: PD-5, PD-7, PD-9, PD-10

**Why.** Item 16. The workspace layout changes (stage tracker, cases panel,
signature line, start card) and the existing `loading.tsx` was hand-matched
to the old one.

**Files.**
- `apps/main/app/(main)/practice/dsa/[slug]/loading.tsx`
- `apps/main/app/(main)/practice/memory/loading.tsx` (from PD-9, verified
  here)
- `plan/practice-dsa/manual-pass-1.md` (new: the browser run, dated)

**Steps.**
1. Rework the DSA skeleton to three columns matching problem, editor with
   cases, mentor with five pill placeholders. The start card state gets its
   own branch of the skeleton only if it reflows measurably; otherwise the
   workspace skeleton stands.
2. Contrast: measure every new text on its rendered surface in both themes,
   including the editor's theme-independent surface, the pills, the notice
   for harness-less languages, and the cases panel pass/fail rows. Record
   the ratios in `manual-pass-1.md`.
3. Full run in a real browser as a user with exactly 5 credits: start, be
   charged, open, restate, approach checked point by point, brute force
   written and passing, asked for complexity, pushed to optimal, tests pass,
   reflect, finish, XP awarded, profile page shows the concept, delete it,
   reopen the problem and confirm the resume message.
4. `cd apps/main && npx tsc --noEmit`, `cd apps/worker && npx tsc --noEmit`,
   `pnpm check-nav`. Search for em and en dashes with the two `-e` greps from
   `CLAUDE.md`.

**Edge cases.**
- Below `lg` the three panels stack. The stage tracker must not be the thing
  that pushes the editor below the fold; put it inside the mentor panel, not
  above the whole workspace.
- The skeleton for a returning user (resume message) and a new user (opening
  message) is the same; the transcript area is one block either way.

**Done when.** `manual-pass-1.md` exists with the dated run, every measured
ratio meets AA, both typechecks and `check-nav` pass, and the dash grep
returns nothing under `apps/main`, `apps/worker`, `packages/db` and
`plan/practice-dsa`.
