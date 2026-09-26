# AI models - every call names a task

## What the module is when it is done

Every call ShipItHQ makes to a model provider (chat, embeddings, transcription) takes
its model from `@repo/ai`: `modelFor("<task>")`, where each task is one line in
`packages/ai/src/tasks.ts` and each model id is registered, with its price, in
`packages/ai/src/models.ts`. No model id is written at a call site, and no environment
variable picks one. Choosing a model per task is that line: `gpt-4o` for a task that
needs it, `gpt-4o-mini` for the rest.

## Decisions

| Question | Decision |
|---|---|
| Per-task choice (Niraj, 2026-09-26) | **Each task picks its model** in `AI_TASKS` ("some task use gpt-4o, some mini"). The helpers that call a provider take a registered `ModelId`, never a free string, so a typo or an unregistered model fails the typecheck. |
| Moving the existing calls | **Each call keeps the model it uses today** (gpt-4o stays gpt-4o, mini stays mini). Changing a task's model is a separate decision that re-runs that task's check (CLAUDE.md, "AI models"). |
| Environment overrides | **None.** Admin's `OPENAI_CHAT_MODEL` (empty on dev, so mini) is replaced by its task line. |
| Other providers | Sarvam's models stay in `packages/sarvamai` (its own constants, one place). ElevenLabs runs agents, not model ids. |

## Done when

1. `grep` for a model id outside `packages/ai` finds only comments, a DB column default
   and check scripts.
2. Every app and the worker typecheck with `ModelId`-typed helpers.
