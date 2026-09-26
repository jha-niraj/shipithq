# AI models - tasks

| ID | Task | Status |
|---|---|---|
| AM-1 | Register every model in use; a task line per call site, keeping its model | done 2026-09-26 |
| AM-2 | Worker: `chatJSON` / `chatText` take a required `ModelId`; every job names a task | done 2026-09-26 |
| AM-3 | Main, admin and hiring call sites use `modelFor`; admin's env override removed | done 2026-09-26 |
| AM-4 | The sweep: nothing outside `packages/ai` names a model; typecheck everything | done 2026-09-26 |

## AM-1 - The registry
**Files** `packages/ai/src/models.ts`, `packages/ai/src/tasks.ts`.
**Steps** Register `gpt-4-turbo-preview` (the project quiz uses it today) and `whisper-1`
(transcription, priced per minute, so a `kind` of its own). One task line per call site
found by the grep in AM-4, each with the model it uses now and a one-line comment.
**Done when** the registry typechecks and names every model in use.

## AM-2 - The worker
**Files** `apps/worker/src/openai.ts`, every job calling it.
**Steps** `model: ModelId`, required, in both helpers (no fallback); each job passes
`modelFor(task)`.
**Done when** the worker typechecks and no job passes a literal.

## AM-3 - The apps
**Files** main (`actions/(main)/studios/ai-generation.actions.ts`, pathfinder goals and
subgoals, mockvoice, whisper, practice generate and assess, the mentor and score routes,
knowme reply and embeddings, the mentor check script), admin (`app/api/ai/chat`), hiring
(`lib/ai.ts` typed).
**Done when** each app typechecks and no call site passes a literal.

## AM-4 - The sweep
**Steps** The grep below returns only comments, `knowme.embedding_model`'s column default
and scripts that call no model; all five apps typecheck.

```bash
grep -rnE "[\"'\`](gpt-[0-9a-z.-]+|o[134]-?(mini)?|text-embedding-[a-z0-9-]+|whisper-1)[\"'\`]" apps packages \
  --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v packages/ai/src/models.ts
```
**Done when** that holds.

## Done 2026-09-26
- **AM-1:** `gpt-4-turbo-preview` and `whisper-1` (a `transcription` kind, priced per
  minute) registered; 34 task lines added, each with the model its call used before
  (gpt-4o for resume, cover letters, the project quiz's turbo, practice generation and
  assessment, the practice chat mentor, the older mock scorer and the check grader; mini
  elsewhere; `projectBlueprint` for the one worker call that relied on the fallback).
- **AM-2:** the worker's `chatJSON` / `chatText` take a required `ModelId`: no fallback;
  13 calls in 11 jobs and the blueprint pipeline pass `modelFor(task)`.
- **AM-3:** 20 call sites in main (studios, Pathfinder, mock voice, practice, the
  mentor and score routes, KnowMe reply and embeddings, whisper, the check script), the
  admin panel (the empty `OPENAI_CHAT_MODEL` fallback replaced; `@repo/ai` added to
  admin's dependencies, the lockfile gaining only that link), and hiring's `chatJSON`
  typed `ModelId`.
- **AM-4:** the grep finds only comments and `knowme.embedding_model`'s column default;
  main, admin, hiring, worker and web typecheck (main's only errors are the incidents
  files another session is editing).
- **Open, Niraj's call:** the project quiz still runs on `gpt-4-turbo-preview` (10/30 USD
  per million tokens, four times gpt-4o's input price). Moving it is one line in
  `tasks.ts` plus a re-check of the quiz.
- `OPENAI_CHAT_MODEL` in the apps' `.env*.example` files no longer does anything; the
  line can go when those files are next edited.
