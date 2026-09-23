# ShipItHQ AI - tasks

Built in order. See `overview.md` for what done means. `apps/main` unless noted.

## AC-1 Monochrome two-spark mark, everywhere
- [x] Status: done (2026-09-22). No BrainCircuit or Sparkles is left in the AI panel, sidebar or trigger; the glyph is `currentColor` under ink classes on both themes. Verified by grep and render check, not yet by eye.

**Why:** Niraj asked for a new icon; he picked gurukul's two sparks without the gold.

**Files:** new `packages/ui/src/components/ui/ai-mark.tsx`; `components/navigation/sidebar.tsx`; `components/ai/ai-trigger-button.tsx`.

**Steps:**
1. Port `SaathiGlyph` as `AIGlyph` and `SaathiMark` as `AIMark`, with every gold fill and stroke changed to `currentColor` at varied opacity.
2. Replace BrainCircuit on the sidebar's AI button and Sparkles on the mobile bottom bar and trigger with `AIGlyph`.

**Edge cases:** two marks on one screen must not share gradient or keyframe ids (useId). Reduced motion stops `AIMark`.

**Done when:** no BrainCircuit or Sparkles is left on an AI control, and the glyph is visible on white and on neutral-950.

## AC-2 Chat tables
- [x] Status: done (2026-09-22). Migration `0018_curved_master_chief.sql` holds exactly two CREATE TABLEs, two foreign keys and two indexes; applied to the dev database.

**Why:** chats move from localStorage to the database (Niraj's choice).

**Files:** new `packages/db/src/schema/assistant.ts`, new `packages/db/src/assistant-types.ts` (client-safe types, exported as `@repo/db/assistant`); `packages/db/src/schema/index.ts`; `packages/db/package.json`; a generated migration.

**Steps:** define `assistant_chat_session` and `assistant_chat_message` as in the overview, with cascades from user to session to message and indexes on (user, updated) and (session, created). `pnpm db:generate`, read the SQL, `pnpm db:migrate` on the dev database.

**Edge cases:** the migration must only create; any drop or alter of an existing table means the snapshot drifted and it must not be applied.

**Done when:** the migration contains exactly two CREATE TABLEs, their foreign keys and indexes, and is applied.

## AC-3 The route owns the conversation
- [x] Status: done (2026-09-22). `scripts/practice-checks/ai-chat.ts`: two-turn context from the database, title, saved ids, attachments re-read, stop saved as partial, chart fence, foreign session 404. 25/25, three runs.

**Why:** with the server as the source of truth the route cannot trust a client-sent history any more.

**Files:** `app/api/ai/chat/route.ts`, new `lib/ai/chat-store.ts` (server-only DB helpers), `lib/ai/protocol.ts`, `packages/ai/src/tasks.ts`.

**Steps:**
1. Body becomes `{ sessionId?, content, attachments?, page, tags }`.
2. Unknown or foreign session id: 404. No id: create a session.
3. Load the last 20 messages, fold attachment text into their content as before, save the user turn, then run the existing tool rounds and stream.
4. New frames: `session {id}` first; `done {messageId, userMessageId}`; `title {v}`.
5. Save the assistant turn (content, finished steps, actions) in a `finally`, so a stop or a stream error keeps what streamed. A turn with neither text nor actions is not saved.
6. Title the session after its first exchange with `modelFor("assistantChatTitle")`; fall back to the first 60 characters of the question.
7. Tell the model about ```chart fences (JSON shape, when to use one).
8. Replace the model literal with `modelFor("assistantChat")`.

**Edge cases:** the stream is cancelled when the client aborts; nothing may throw after that. Title failure never fails the turn.

**Done when:** the check script (AC-9) sends two turns, sees both saved in order with the second reply aware of the first, sees a title, and gets 404 for another user's session id.

## AC-4 Server actions and a server-backed store
- [ ] Status: built (2026-09-22). Server side verified by the check script (load, list, delete, feedback, isolation). The reload-reopens-the-chat half needs a browser.

**Files:** new `actions/(main)/ai/assistant-chat.action.ts`; `app/store/aiPanelStore.ts`.

**Steps:**
1. Actions: `listAssistantChats`, `getAssistantChat(id)`, `deleteAssistantChat(id)`, `setAssistantMessageFeedback(messageId, 1 | -1 | null)`, all scoped to the session user.
2. Store keeps panel chrome (width, maximized) and the open chat id in localStorage; the list and the messages come from the server. Version 2 migration drops the old `sessions`.
3. Stream handlers: optimistic user turn and placeholder with temporary ids, swapped for server ids on `done`; `session` sets the open id; `title` updates the list.

**Edge cases:** a remembered chat id that was deleted elsewhere falls back to a new chat. Switching chats while one streams aborts the stream first.

**Done when:** a reload reopens the same chat with the same messages from the server, and a deleted chat disappears from the list.

## AC-5 Header and history dropdown
- [ ] Status: built (2026-09-22). Render check passes (grouping, open marker). Clicking through needs a browser.

**Files:** `components/ai/ai-panel.tsx`, new `components/ai/history-dropdown.tsx`.

**Done when:** the title button opens a grouped list of the user's chats; picking one loads it, delete removes it, outside click closes it, and new chat / maximize / close work.

## AC-6 Messages
- [ ] Status: built (2026-09-22). Render check passes (inline vs block code, table scroller, chart slot, bad chart JSON, steps, actions, feedback states, typing dots). The 380px width check needs a browser.

**Files:** new `components/ai/chat-message.tsx`, new `components/ai/chat-markdown.tsx`; `components/ai/tool-steps.tsx`.

**Steps:** bubbles, avatar, attachment chips, tool-step pill, action buttons, action row with copy / feedback / time, typing dots, markdown with sideways-scrolling tables and code, grey ```chart rendering.

**Edge cases:** feedback on a turn that has no server id yet is disabled. Invalid chart JSON falls back to a code block. No spinner (InlineLoader for running steps).

**Done when:** a reply with a table, a code block and a chart renders inside the bubble without widening a 380px panel.

## AC-7 Empty state
- [ ] Status: built (2026-09-22). Render check passes (docked and maximized). Needs a browser for the click-to-send.

**Files:** new `components/ai/chat-empty-state.tsx`.

**Done when:** a new chat shows the greeting with the user's first name, the page pill, the create cards and the ask rows; each sends its prompt; maximized uses the larger layout.

## AC-8 Composer, voice, drop and scroll
- [ ] Status: built (2026-09-22). Render check passes (send/stop swap, attach, record). Mic, drop and scroll behaviour need a browser.

**Files:** new `components/ai/chat-composer.tsx`; `components/ai/ai-panel.tsx`.

**Edge cases:** the mic stops when the panel unmounts or a message is sent. Dropping several files uploads each. Stop keeps the partial reply.

**Done when:** typing, recording, attaching, dropping, sending and stopping all work from the new box, and scrolling up during a reply is not yanked back down.

## AC-9 Verification
- [x] Status: done (2026-09-22). `ai-chat.ts` 25/25 on three runs; `ai-chat-render.tsx` 15/15; tsc clean for apps/main, apps/worker, packages/ui, packages/db, packages/ai.

**Files:** new `scripts/practice-checks/ai-chat.ts` (reuses the practice-checks shims to sign in as a test user).

**Done when:** the script passes against the dev database: two-turn conversation saved, context carried, title set, feedback set and cleared, foreign session 404, delete cascades. `tsc --noEmit` clean for `apps/main`, `packages/ui`, `packages/db`, `packages/ai`.

## Deletions (approved, 2026-09-22)
- `components/ai/chat-history-dialog.tsx`, replaced by the dropdown. Deleted.
- `AssistantMark` in `components/ai/ai-art.tsx`, replaced by `AIMark`. Deleted; the suggestion glyphs the empty state draws stay.
