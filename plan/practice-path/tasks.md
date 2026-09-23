# The practice path - tasks

See `overview.md`. Built in order; each task ends with `tsc --noEmit` clean for the
app it touches, and a check script where there is logic worth proving.

## PP-1 The path, stored
- [x] Status: done (2026-09-22). Migration `0020_dapper_doctor_doom.sql`: one table, its foreign key and unique index. Applied to the dev database.

**Files.** `packages/db/src/schema/practice.ts` (a `practice_path` table), `packages/db/src/practice-types.ts`, a migration.

**Steps.** One row per user and module: `stages` (topic, goal, ordered problem slugs, checkpoint state per part), `generatedAt`, the onboarding version and level it came from. Results live in the stage's checkpoint: for each part, its status, score and when.

**Done when.** The migration creates one table with its foreign key and unique index, and is applied to the dev database.

## PP-2 Building a path
- [x] Status: done (2026-09-22). `scripts/practice-checks/path.ts` 16/16 against the dev database, the seeded 75 and the real model: 7 stages, 35 problems, every slug real and unique, goals within the cap, avoided topics first appearing at stage 3, cached second call, and a re-plan that kept a passed checkpoint.

**Files.** `apps/main/app/api/practice/path/route.ts`, `apps/main/lib/practice/path-prompt.ts`, `packages/ai/src/tasks.ts`.

**Steps.** The model gets the catalogue (slug, title, topic, difficulty), the onboarding profile and the mentor's memory, and returns stages: topic, goal line, ordered slugs. Everything is checked against the catalogue: unknown slugs dropped, duplicates dropped across stages, stage and problem counts capped. `force` re-plans, keeping every recorded checkpoint result and every solved problem.

**Done when.** A check script with a real profile gets 6 to 8 stages, every slug real and unique, gaps appearing before strengths, and a re-plan that keeps finished work.

## PP-3 The Path tab
- [ ] Status: built (2026-09-22). Render check 17/17: Path and All offered, Path selected when a path is stored, All when not, the stage's topic, goal and three checkpoint parts, and a next-up card. Needs a browser for the expand and scroll behaviour.

**Files.** `apps/main/app/(main)/practice/_components/{module-content,path-view}.tsx`, `practice-module-page.tsx`.

**Steps.** Tab one is Path: a "next up" card naming one problem and why, then the stages with progress, the current one open. Tab two stays All. The leaderboard column is unchanged.

**Done when.** The page opens on the path with the current stage expanded, and every problem row still opens the mode dialog.

## PP-4 Checkpoint, part one: the quiz
- [ ] Status: not started.

**Files.** `apps/main/app/api/practice/checkpoint/quiz/route.ts`, `apps/main/app/(main)/practice/_components/checkpoint-quiz.tsx`.

**Steps.** Six questions generated from the stage's concepts, on which structure or approach to choose and why. Free. Answers are graded in code against the stored key, and the result is written to the stage's checkpoint.

**Done when.** A generated quiz has six questions with one correct answer each, is scored without a second model call, and a weak score triggers PP-7.

## PP-5 Checkpoint, part two: the mock
- [ ] Status: not started.

**Files.** the mock module's entry points, `checkpoint` components.

**Steps.** The existing voice mock, seeded with the stage's topics, launched from the checkpoint and returning its result to the stage. It consumes a mock pack exactly as it does today, and says so before it starts.

**Done when.** A mock started from a checkpoint is recorded against that stage, and a user with no pack is told what it costs instead of failing.

## PP-6 Checkpoint, part three: the timed problem
- [ ] Status: not started.

**Files.** `apps/main/app/(main)/practice/_components/checkpoint-*.tsx`, the exam-mode session flow.

**Steps.** The stage's hardest unsolved problem, opened in the existing exam mode at the existing price, with its result recorded on the stage.

**Done when.** Passing it completes the stage, and the path moves to the next one.

## PP-7 When a checkpoint goes badly
- [ ] Status: not started.

**Steps.** A weak quiz or timed problem adds two or three catalogue problems to the stage, chosen for what was missed, and offers a retry. The stage stays open and the next stage is still reachable.

**Done when.** A deliberately failed quiz adds problems aimed at the missed concepts and the checkpoint can be retaken.

## PP-8 Verification
- [ ] Status: not started.

**Files.** `apps/main/scripts/practice-checks/path.ts`, render checks beside the existing ones.

**Done when.** The script covers PP-2 and PP-4 end to end against the dev database, and the render check covers the Path tab's states: no path yet, a path with a current stage, a stage mid-checkpoint.
