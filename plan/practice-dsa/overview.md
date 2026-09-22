# Practice DSA - overview

## What this module is

The place a user solves a DSA problem the way they would with a good mentor
sitting next to them: they explain the problem back, propose an approach, get it
checked point by point, write brute force, prove it against real tests, and are
then pushed toward the optimal solution with questions rather than answers. The
mentor never writes the solution. It answers concept questions in full, gives a
worked example when the user is stuck, and remembers what this user has shown it,
on this problem and across problems.

Today the DSA workspace has a free-form "AI Mentor" chat, a Run button that
prints stdout with no test cases, and a Submit button that asks gpt-4o for a
score inside a server action. Niraj solves problems on takeUforward and then
opens ChatGPT in another tab to get the Socratic conversation he actually wants.
This module is that conversation, in the workspace, with real tests underneath
it, so there is no other tab.

## Definition of done

1. Opening a DSA problem in ASSIST mode starts a **guided session**. The
   mentor speaks first: it asks the user to restate the problem and walk one
   example. A returning user is greeted with where they left off, not a blank
   chat.
2. The session moves through five visible stages: **Understand, Approach,
   Brute force, Optimise, Reflect**. The current stage is shown in the mentor
   panel, the mentor's questions belong to the stage it is in, and the stage
   advances when the stage's own signal is met, not when the user asks.
3. The mentor **never emits a complete solution** to the problem, in any
   language, at any stage, on any number of attempts. It may explain a concept
   fully, show a worked example on a tiny input, and check the user's stated
   approach point by point. This is verified with a written adversarial set of
   prompts, not assumed from the system prompt.
4. A user can ask a free question at any stage ("what is a hash map",
   "why sqrt(n)") and get a full answer without the stage changing.
5. Every seeded DSA problem has a **function signature, a per-language hidden
   harness, sample tests and hidden tests**, and a reference solution that
   passes all of them. The reference solution and hidden tests never reach the
   browser.
6. In the C++ editor the user writes only the `class Solution` block. **Run**
   executes the sample tests. **Submit** executes sample plus hidden tests. Each
   case shows pass or fail with input, expected and actual output.
7. Languages other than C++ remain selectable. They run as a full program and
   show stdout only, and the workspace says so before the user starts typing.
   No test verdicts are shown for them.
8. **Brute force** completes when all tests pass. **Optimise** completes when
   all tests pass and the mentor has recorded that the user stated the optimal
   time and space complexity and why. **Reflect** ends the problem with a short
   summary the user wrote, not one the model wrote.
9. Each problem session carries a **structured memory** (stage, the user's
   approach in their words, claimed complexity, which tests passed at which
   stage, concepts explained, misconceptions seen) on its own row. It is
   consolidated by a worker job, not written on every chat turn.
10. Each user has a **learner profile** per module: concept entries with a
    status of introduced, shaky, understood or mastered, each with the problem
    and date as evidence, plus recurring mistakes. Every mentor turn on any DSA
    problem reads the entries matching the problem's tags and category, plus
    anything shaky.
11. The user can **see and delete** what the mentor knows about them, on a page
    under practice. Deleting an entry removes it from the next mentor turn.
12. Opening a guided session for a problem for the first time **charges
    `practice_set` (5 credits)**. Reopening the same problem is free. Runs,
    submits and mentor turns inside a session are not metered. A user without
    enough credits sees the price and a way to buy, and the session is not
    created.
13. A **curated catalogue of 75 DSA problems** is seeded across the 16
    categories, each with generated and reviewed judge assets. "Add problem"
    still works and now also produces judge assets; a problem shows "Preparing
    tests" until they exist and cannot start a guided session before then.
14. **No LLM call runs inside a server action** on the DSA path. The mentor
    streams from a route handler; test generation, memory consolidation and the
    final reflection run in `apps/worker`.
15. EXAM mode is unchanged in behaviour except that Submit now runs the hidden
    tests. The other three practice modules are untouched.
16. `apps/main` and `apps/worker` typecheck, `pnpm check-nav` passes, every new
    route has a matching `loading.tsx`, every text clears AA on its surface, and
    the whole flow (charge, open, understand, approach, brute force, optimise,
    reflect, profile page) has been driven end to end in a real browser.

## Out of scope

- **Harnesses for JavaScript, TypeScript, Python and Java.** The judge column
  is keyed by language so they slot in later. Until then those languages run as
  full programs with stdout (item 7).
- **Mentor annotations inside Monaco** (highlighting a line, proposing a diff).
  The ask was that the conversation happens here instead of in another tab, not
  that the mentor touches the editor.
- **The other three practice modules.** System design does not have a
  brute-force-to-optimal shape. They keep the current mentor chat and the
  current assessment path.
- **Charging for EXAM mode.** `exam_set` (10) stays in the pricing table and
  stays uncharged. Separate decision.
- **Embeddings or vector retrieval for memory.** See Decisions.
- **Leaderboard and XP redesign.** XP is still awarded on completion through
  the existing `updateModuleProgress` path.
- **Voice.** Scribe input and TTS playback stay exactly as they are.

## Decisions

**Rework ASSIST for DSA rather than add a third mode.** (Niraj, 2026-09-22.)
One session row per problem and mode already exists; a third mode would mean a
third row, a third badge and a third set of empty states. The guided flow *is*
what assist should have meant.

**Visible stages, mentor drives.** (Niraj, 2026-09-22.) Understand, Approach,
Brute force, Optimise, Reflect. Not skippable in v1. A user who already knows
the problem still restates it and states their approach, because that is the
part an interview tests.

**Function-only editor with a hidden harness, C++ first.** (Niraj, 2026-09-22.)
Matches what he practises on (takeUforward, LeetCode) and gives a hard signal
for the brute-force-to-optimise handoff. Other languages stay selectable but
verdict-less until their harness exists. The workspace must make that
difference visible before the user writes code, so nobody submits Python and
wonders why there is no pass/fail.

**Judge assets live on the problem row, generated by a job, validated by
execution.** Signature, harness per language, sample tests, hidden tests and
reference solution are generated once per problem by `practice_tests_generate`
and are only marked ready after the reference solution passes every test in the
real container. An unvalidated test set is worse than none, because it fails
correct code and the mentor then argues with the user about it.

**Hidden tests and the reference solution never leave the server.** The
problem detail sent to the client carries sample tests only. Run and Submit
are server actions that read the hidden tests themselves. This is why
`getProblemBySlug` grows a client-safe projection instead of a flag.

**Test budget per problem: 3 to 5 sample, 8 to 12 hidden.** The container runs
one process per case after a single compile, and the app-side ceiling is 15
seconds. Twelve C++ runs on small inputs fit with room; fifty would not.

**Stage transitions use two signals, never the user's say-so.** Test results
are the hard signal (Brute force, and half of Optimise). A cheap verdict call
(`gpt-4o-mini`, JSON, last few turns) appended after each streamed mentor reply
is the soft signal (Understand, Approach, the complexity half of Optimise,
Reflect). The verdict is written to the session by the route handler. The
mentor's streamed text is never parsed for markers.

**The mentor stream stays in a route handler.** The working agreement puts LLM
calls in the worker because a server action has a hard budget and the user is
charged before it dies. A streaming reply is different in kind: the user is
watching it, it is not charged per turn, and the Worker limit is CPU time, not
wall time, which a streamed upstream response barely uses. Moving it to a job
would put a poll loop behind every message. Everything that is not a live reply
(test generation, memory consolidation, final reflection) is a job.

**Memory is stored facts, not embeddings.** (Niraj, 2026-09-22, after the
trade-off was laid out.) We always know exactly what to load: this problem's
record and the profile entries for this problem's concepts. That is a few
kilobytes in one query. A vector store adds an embedding job and fuzzy
retrieval for no gain at this size. If profiles ever grow to thousands of
entries, retrieval can be added on top of the same rows.

**Memory is consolidated by a job at stage boundaries, not on every turn.**
The chat turn stays fast. `practice_memory_update` reads the transcript since
its last watermark and rewrites the problem record and the profile. The
watermark makes a re-run idempotent, which matters because the job is fired on
events that can repeat (a stage can be re-entered after a failing submit).

**The profile is visible and deletable.** A memory the user cannot see is a
memory they cannot trust. A deleted entry is gone, not hidden, so it does not
come back on the next consolidation: the job only ever writes entries it has
evidence for in the transcript it just read.

**Price: `practice_set` = 5 credits per problem, charged once on first guided
open.** (Niraj, 2026-09-22.) Per-turn pricing punishes asking questions, which
is the behaviour the module exists to encourage. The price itself is recorded
in `plan/credits/overview.md`; `lib/credits/pricing.ts` references that file.
Reopening is free because the hold is keyed on the session row, which is unique
per user, problem and mode.

**Catalogue: 75 seeded problems.** (Niraj chose "roughly 60 to 100"; 75 is the
number, so it stops being a range.) Spread across the 16 DSA categories, four
to five each, classic interview problems. The seed inserts descriptions and
signatures; judge assets are generated per problem by the job and reviewed
before the row is marked ready. The seed is idempotent on slug and never
deletes.

**DSA Submit no longer asks a model for a score.** Completion is decided by
tests plus the recorded Optimise verdict. The reflection and XP award run in
`practice_reflect`, a job, which replaces the DSA branch of
`assessPracticeWork`. The other modules keep `assessPracticeWork` unchanged.
