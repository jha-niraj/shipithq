# Practice DSA - manual pass 1 (2026-09-22)

What was verified without a browser, and the browser run still owed before
PD-4 to PD-14 can be ticked. No Chrome extension was connected in this
session and no signed-in session was available to the agent.

## Verified

| area | how | result |
|---|---|---|
| Schema (PD-1) | migration 0017 applied, columns read back | all present |
| Judge helpers and executor link (PD-2) | Two Sum through `runJudge` on the container server run locally | good 3/3, wrong fails all, tampered case fails alone, syntax error reported as compile error |
| Test generation (PD-3) | `generateJudgeAssets` on gpt-4o and the local executor | Two Sum ready (3 samples, 8 to 10 hidden, cross-checked by a brute-force solution); a one-word statement fails with a readable reason |
| Run and Submit (PD-4) | `runAgainstTests` on the stored Two Sum row | optimal and brute force 13/13; wrong, compile error and infinite loop each reported correctly; compiler lines mapped to the user's own code |
| No hidden leak (PD-4) | search of `getProblemBySlug` output for all 10 hidden inputs, the reference code and the harness | none found |
| Mentor never solves (PD-6) | `mentor-adversarial.md`, two recorded runs | run 2: 0 of 20 leaked, 5 of 5 concept questions answered, 4 of 4 verdicts right |
| Memory (PD-8) | merge rules exercised directly; extraction on a realistic transcript | idempotent, deletions stick, mastery promotion works; gpt-4o extraction stable across runs |
| Closing feedback (PD-13) | reflect prompt, optimal and brute-force finishes | quotes the reflection, no code, brute-force note does not name the technique |
| Types and nav | `tsc --noEmit` in apps/main, apps/worker, packages/ui; `pnpm check-nav` | clean |

## Contrast (computed from resolved values)

The workspace surface is a constant dark in both themes, so its ink is
constant. Body text is AA 4.5:1.

| text | surface | ratio |
|---|---|---:|
| cases panel labels, editor strip notice (neutral-300/400) | neutral-950 / neutral-900 | 13.1 / 7.1 |
| failing output (red-300) | neutral-950 | 9.4 |
| stage goal line (neutral-300) | neutral-950 | 13.1 |
| upcoming stage pill (neutral-400) | neutral-950 | 7.9 |
| start card and memory page dim text (neutral-600 / neutral-400) | white / neutral-900 | 7.8 / 7.1 |
| start card error (red-600 / red-400) | white / neutral-900 | 4.8 / 6.0 |

## End-to-end run (2026-09-22, all AI tasks on gpt-4o-mini)

`apps/main/scripts/practice-checks/e2e.ts` drives onboarding and the guided
DSA flow as a real test user through the actual server actions and route
handlers, against the development database, the job worker under `wrangler
dev` (real Durable Objects and alarms) and the code executor running locally.
It creates one user with 4 credits, raises it to 5 at the right step, and
deletes everything it created. Three consecutive runs: **40 of 40** each
(runs B and C after the last fix). Run C:

```
test user e2e-dsa-1790065094050@shipithq.test

## Onboarding: practice:dsa
PASS  start run
PASS  second start returns the same in-progress run
PASS  resume returns the same unanswered question
  Q1 [single] How many data structures and algorithms problems have you solved?
  Q2 [multi] Which platforms have you used for DSA practice?
  Q3 [single] Which programming language do you use for solving DSA problems?
PASS  reopen Q2 truncates later turns
  Q2 [multi] Which platforms have you used for DSA practice?
  Q3 [single] Which programming language do you use for solving problems?
  Q4 [multi] Which topics are you comfortable with? Pick all that apply.
  Q5 [single] Which topics do you avoid or fear the most? Pick one.
  Q6 [single] Can you usually get a brute force solution working?
  Q7 [multi] Where do you usually get stuck after a brute force solution?
  Q8 [single] Have you done any timed contests or mock interviews? Pick one.
  Q9 [single] What are you preparing for? Pick one.
  Q10 [single] How many hours a week can you dedicate to DSA practice?
PASS  run finishes between 6 and 10 answers  (12 answered after the reopen)
PASS  at most two open questions  (0)
PASS  completed profile stored  (beginner)

## Guided session: Two Sum
PASS  no guided session before start
PASS  4 credits: refused with INSUFFICIENT_CREDITS  (Insufficient credits. This needs 5 credits and you have 4.)
PASS  5 credits: started and charged 5
PASS  balance is 0 after the charge
PASS  reopening is free
  ledger rows: 1
PASS  opens in C++ on the class Solution starter
  > 
  < Welcome to the Two Sum problem! Can you explain the problem back to me in your own words?
PASS  mentor speaks first and asks for a restatement
  > I get an array and a target, and I must return the indices of the two numbers that add up 
  < That's a clear restatement! Now, let's walk through that example step by step. What do you get when you look at the array [1, 6, 2, 10, 3] with the target 7? Wh
  [stage -> approach]
PASS  understand -> approach on a correct restatement with an example
  > My plan: check every pair i<j and return [i,j] as soon as nums[i]+nums[j] equals the targe
  < Great plan! Let's evaluate it: 1. **Right**: You're checking pairs of indices to find two numbers that add up to the target. 2. **Right**: You correctly return 
  [stage -> brute_force]
PASS  approach -> brute_force on a working plan
PASS  Run: brute force passes samples
PASS  Submit: brute force passes all tests  (13/13)
PASS  submit recorded on mentor state and saved the code
  > I submitted: all 13 tests passed, including 10 hidden ones.
  < Well done on passing all the tests! Now, let's look at the complexity of your approach. Can you explain how many pairs you are checking with your nested loops? 
  [stage -> optimise]
PASS  brute_force -> optimise when all tests pass
PASS  memory job dispatched to the local worker
PASS  memory job completed  ({"window":7,"applied":true,"concepts":1,"mistakes":0,"phaseLabel":"Complete"})
PASS  watermark advanced to the saved transcript  (7/7)
PASS  re-running consolidation with nothing new is a no-op
  > It is O(n^2) time because for every i the inner loop scans the rest, and O(1) space.
  < That's correct! Your current solution has a time complexity of O(n^2) due to the nested loops, and O(1) space since you're not using any additional data structu
PASS  optimise does not advance on a correct but non-optimal claim
PASS  mentor does not name the technique unprompted  (That's correct! Your current solution has a time complexity of O(n^2) due to the)
PASS  Submit: optimal passes all tests
  > I submitted: all 13 tests passed, including 10 hidden ones.
  < Good to hear that all tests passed! Since you've already optimized your approach, can you explain how your new solution achieves O(n) time complexity? What chan
  > With the map, each lookup of target - nums[i] is O(1) on average and I pass over the array
  < Exactly! You've effectively reduced the time complexity to O(n) by using the map for constant-time lookups. The space complexity is O(n) due to the storage of e
  [stage -> reflect]
PASS  optimise -> reflect once optimal is justified and tests pass
  > Reflection: the key was remembering numbers I've already seen with their index, so each co
  < That's a thoughtful reflection! Recognizing the importance of tracking seen numbers was key to your success. For your next practice, you might want to explore p
  [stage -> done]
PASS  reflect -> done on a written reflection
PASS  finish dispatched the review
PASS  review job completed
PASS  completion applied with score 100
  feedback: You did a great job recognizing that tracking previously seen numbers was crucial for optimizing your solution. Your reflection highlighted this well: 'the key was remembering numbers I've already seen with their index.' Although you reache
PASS  XP awarded once (second apply is not a first completion)  (+25)
PASS  session COMPLETED at stage done
  profile concepts: brute-force-pair-search=understood, big-o-nested-loops=shaky, big-o-map-lookup=understood
PASS  learner profile has concepts from the session
PASS  deleted concept is gone from the profile and the mentor's context  (brute-force-pair-search)
PASS  exam mode opens free
PASS  client problem carries no hidden input or reference code

## Add problem
PASS  problem saved and test generation dispatched
PASS  worker job made the new problem ready  (completed / ready )

RESULT: 40 passed, 0 failed
```

Fixes this run forced, all in the product, none in the test:
- The code executor was reached through the service binding even under
  `wrangler dev`, where it points at a worker that is not running: every test
  generation job failed with 503. `EXECUTOR_URL` now wins when set.
- A generation job that threw left the problem at `generating` forever. It
  now records `failed` with the reason before the job fails.
- The judge failed correct output with a trailing space at a line end; the
  canonical per-line comparison now decides pass or fail in both judges.
- gpt-4o-mini advanced Optimise on the mentor's own "why is it O(n)?". The
  Optimise verdict now only sees messages after the latest test result.

## Catalogue generation (PD-11)

75 problems seeded; all 75 `ready`. Re-verified independently afterwards:
every stored reference solution was run against every stored test in the
executor (1,226 tests; one transient timeout, which passed on two reruns).
72 were generated on gpt-4o-mini or earlier gpt-4o runs; Three Sum and
Non-overlapping Intervals needed a one-off gpt-4o run after mini kept failing
them (see the overview's decisions).

## Owed: rendering in a browser

The flow, the charges, the jobs and the data are verified. What only a
browser can show is still owed, because no browser session was available to
the agent:

1. The gate, the adaptive onboarding flow (option buttons, keyboard, skeleton between questions, the mic), the summary card and the dashboard widget.
2. The start card, then the workspace: C++ on the class starter, the signature strip, the cases panel before and after Run and Submit, the notice when switching to Python.
3. The stage tracker moving, the "Moved to" dividers, the welcome-back line not being saved on reload.
4. Finish, the feedback message, `/practice/memory` and its delete dialog.
5. Add problem: "Preparing tests", then "Open the problem".
6. The workspace and memory-page skeletons matching the loaded layout; phone width.

## Not built

Nothing from the plan. Everything in PD-1 to PD-14 is built.
