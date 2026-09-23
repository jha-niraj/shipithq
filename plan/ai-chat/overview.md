# ShipItHQ AI - the chat panel

The assistant that sits in the right-hand rail on every page of `apps/main`
(and in a sheet below `lg`). This file defines what it is when it is done.
Tasks are in `tasks.md`.

Asked for by Niraj on 2026-09-22: "work on the aichat ... update the icon ...
inner ui is really bad ... check the gurukul main app ... revamp this". The
reference is gurukulhq's Saathi panel (`gurukulhq/apps/main/components/ai/`).

## Decisions (Niraj, 2026-09-22)

| Question | Answer |
|---|---|
| Icon | Gurukul's two four-point sparks, drawn monochrome (ink colour, no gold) |
| Reply style | Gurukul's bubbles: grey assistant bubble with a round icon avatar, black user bubble, action row under replies |
| Extra features | Voice input, thumbs up/down feedback, inline charts, history dropdown from the title |
| Where chats live | In the database, like gurukul (they were in localStorage) |

## When it is done

**Icon.** One mark for the assistant everywhere: the sidebar's AI button, the
mobile bottom bar's centre button, the panel header, each reply's avatar, the
empty state (an animated, larger version) and the floating trigger. It is
`currentColor`, so it is black on light and white on dark. No gold, no lucide
sparkle, no brain.

**Header.** The glyph and the conversation's title, as one button that opens
the history dropdown. On the right: new chat, maximize or restore, close.

**History.** A dropdown under the title listing the user's chats from the
database, grouped Today / Previous 7 days / Previous 30 days / Older, newest
first. Selecting one loads it; each row can be deleted. The active chat has a
check.

**Messages.**
- User turns: a black bubble on the right (white in dark), attached files as
  chips above it, copy and time below.
- Assistant turns: a round avatar with the glyph, then a grey bubble with the
  reply rendered as markdown. Above it, the agent's tool steps as a small pill
  (running / done / failed). Below it, the buttons a tool produced (open the
  cover letter, go to DSA practice), then an action row: copy, thumbs up,
  thumbs down, time.
- While waiting for the first token: three bouncing dots in the bubble.
- Markdown: headings, lists, tables and code scroll sideways inside the
  bubble instead of widening the panel. A ```chart fence holding JSON renders
  a small bar, line or pie chart in greys.

**Feedback.** Thumbs up or down is saved on the message row. Pressing the
same thumb again clears it. It never blocks the UI.

**Empty state.** "Good morning/afternoon/evening, {first name}", a pill saying
which page the assistant can see, a "Start something" section of cards for the
things the assistant can make (project, goal, cover letter, DSA plan), and an
"Or ask a question" list whose first row is always "Explain this page".
Maximized, the greeting is larger and the cards sit two across.

**Composer.** One rounded box: attached-file chips, then an auto-growing text
field (Enter sends, Shift+Enter is a new line, stays usable while a reply
streams), then a toolbar: attach, record (live transcription into the field),
and a round send button that becomes stop while streaming. Context chips (the
page, pinned items) sit above the box. Dropping a file anywhere on the panel
attaches it, with a full-panel overlay while dragging. A hint line below.

**Scrolling.** New tokens keep the view at the bottom only if the reader was
already near the bottom (120px). Scrolling up to read stops the auto-scroll.

**Persistence.** The server owns the conversation:
- `assistant_chat_session` (id, user, title, created, updated).
- `assistant_chat_message` (id, session, role, content, metadata JSON with
  the tool steps, action buttons and attachments, feedback, created).
- The route receives only the new turn plus a session id, loads the history
  itself (last 20 messages), saves the user turn before answering and the
  assistant turn after, including a partial reply if the user pressed stop.
- The first exchange gets a short title from the model, pushed to the panel
  as it is made.
- Every read and write is scoped to the signed-in user; a session id that
  belongs to someone else is treated as not found.
- The panel remembers the open conversation id across reloads and fetches its
  messages from the server.

**Limits** (decisions, referenced from the code):
- History sent to the model: last 20 messages, each capped at 8000 characters.
- Title: at most 60 characters, from the first user turn and the reply.
- Attachment text: capped at 20k characters by `/api/ai/upload-doc`, stored
  with the message so the model can re-read it on later turns.
- Chat model and title model: `modelFor("assistantChat")`,
  `modelFor("assistantChatTitle")`, both gpt-4o-mini.

## Not in scope

- An admin view of feedback (the data is stored; reading it is a later task).
- Gurukul's in-chat forms, confirm cards, askUser questions, language picker,
  platform documents and deck panels. They are tied to Saathi's school tools.
- Importing chats from the old localStorage store. The app is not in
  production; old local chats are dropped on upgrade.
