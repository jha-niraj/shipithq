# The DSA workspace - tasks

See `overview.md`. Each task ends with `tsc --noEmit` clean, and a check where
there is logic worth proving.

## PW-1 Opening a problem twice must not crash
- [x] Status: done (2026-09-22). `scripts/practice-checks/session-race.ts` 5/5: four simultaneous opens return one session, one row exists, the other mode still gets its own, reopening returns the same row.

**Why.** Opening a problem raised `duplicate key value violates unique constraint "uq_practice_user_session_user_id_problem_id_mode"` and the page died; a reload "fixed" it, which is what a race looks like from outside. `getOrCreateSession` checked for a row and then inserted, and two renders of the same page both passed the check.

**What changed.** The insert is `on conflict do nothing`; the loser reads the winner's row. The unique index stays the guard.

## PW-2 The workspace's surfaces and readings
- [ ] Status: built (2026-09-22). Typechecks. Needs a browser for the colour and the countdown.

**What changed.**
- Monaco gets a `shipithq-dark` theme: black editor, gutter and widgets, `vs-dark` token colours.
- The `WRITE class Solution { ... }` strip above the editor is gone. The "no tests for this language yet" notice stays, because that one says something the editor does not.
- The exam clock counts down from 20, 35 or 50 minutes by difficulty, derived from the session's `startedAt`, and reads "over by N" past zero. Assist has no clock.
- The problem statement's bullets were `text-neutral-600` with no dark variant, about 2.8:1 on black. Body and bullets are now neutral-800 on light and neutral-200 on dark.

## PW-3 The mentor panel
- [ ] Status: built (2026-09-22). Typechecks. Needs a browser for the composer's growth and the stage switch.

**What changed.**
- The composer is one bordered box with the field filling it, 76px tall, growing to 224px. The mic and send sit under the text.
- Each stage opens with the mentor asking its question, written into the transcript once, saved like any turn.
- The panel shows the open stage's turns only. Turns saved before this have no stage and are treated as belonging to whatever stage is open.
- Every new turn records its stage.

## PW-4 Sarvam AI, in `packages/ai/src/sarvam`
- [x] Status: done (2026-09-22). `scripts/practice-checks/sarvam.ts` 7/7 against the real API: bulbul:v3 returns 165 KB of WAV as shubh, saarika transcribes it back word for word, an empty line is refused and an empty clip transcribes to nothing rather than erroring.

**Why.** Niraj, 2026-09-22: ElevenLabs is replaced by Sarvam AI, its code kept in the repo. `SARVAM_API_KEY` is already in `apps/main/.env` and the production example.

**Files.** New `packages/ai/src/sarvam/{client,stt,tts,index}.ts`; `packages/ai/package.json` (a `./sarvam` export); `apps/main/actions/(main)/practice/voice.action.ts`.

**Steps.**
1. A thin client over Sarvam's REST and streaming endpoints, with the key read on the server only.
2. Speech to text: a short-lived credential or a server proxy for the browser, and a streaming reader that yields partial text.
3. Text to speech: one call returning audio for a finished reply.
4. The app's `getScribeToken` and `generateTTSAudio` keep their names and change provider underneath, so nothing else moves.

**Edge cases.** A missing key means voice is unavailable and the panel says so; it never fails a turn. A stream that dies mid-sentence keeps the words already in the box.

**Done when.** A check script transcribes a known audio file and gets the expected words back, and synthesises a line and gets audio of a plausible length.

## PW-5 Voice in the workspace, on Sarvam
- [ ] Status: built (2026-09-22). Typechecks; the round trip is proven by PW-4. The microphone itself needs a browser: recording, the words landing every couple of seconds, and the reply being read out.
- Blocked by: PW-4

**Steps.** The mic streams words into the composer as they are recognised and the user presses send. The mentor's reply is spoken only when the turn was spoken, with a mute control in the panel header. The ElevenLabs `useScribe` path is removed from the workspace; the package and its old action stay in the repo, unused.

**Done when.** Speaking fills the box, sending works, the reply is spoken, typing is silent, and mute holds across turns.

## PW-6 The phase's browser pass
- [ ] Status: not started.

**Done when.** Niraj walks one problem end to end: understand, approach, brute force, optimise, reflect, with voice, and every reading on the screen is right.

## PW-7 The other two microphones
- [ ] Status: not started.

**Why.** The workspace is on Sarvam. Two other places still open an ElevenLabs socket: the AI chat composer (`components/ai/chat-composer.tsx`) and the onboarding's open answer (`components/onboarding/open-answer-input.tsx`). Leaving them is two providers, two bills and two different behaviours for the same button.

**Steps.** Move both onto `useDictation`, which already does the recording, the two-second transcription and the "voice is unavailable" state. Keep the ElevenLabs code in the repo, unused, as with the workspace.

**Done when.** Nothing in `apps/main` imports `@elevenlabs/react`, and the mic behaves the same in all three places.

## PW-8 The composer is one row: field, mic, send
- [ ] Status: built (2026-09-23). Typecheck clean; the practice render check still 18/18. One row, `items-end`, field `min-h-[38px]` growing to `max-h-40`, both buttons `h-8 w-8` pinned to the last line. Needs a browser for the growth and the narrowest width.

**Why.** Niraj, 2026-09-23: "on the practice/dsa/problemdetails page the mentor
input box is looking very bad, I told you to keep the input, mic and send in one
row". PW-3 moved the buttons UNDER the text to fix the caret landing in a corner
of a tall box, which fixed the caret and made the composer a 120px slab with two
icons floating under it. The instruction was one row all along.

**Files.** `apps/main/app/(main)/practice/_components/workspace/practice-workspace.tsx`
(the composer block under the transcript ScrollArea).

**Steps.**
1. One bordered container, `flex items-end gap-1`, holding the textarea and the
   two icon buttons side by side. The border belongs to the container and the
   field keeps `border-0 bg-transparent focus-visible:ring-0`, so the whole box
   still lights up on focus and the caret still starts at the left edge.
2. The field starts at one row (`rows={1}`, `min-h-[40px]`) and grows to
   `max-h-40`; the buttons stay `h-9 w-9` and pinned to the bottom of the row,
   so they sit beside the LAST line as it grows rather than drifting.
3. The listening transcript line stays above the box, unchanged.
4. Keep Enter to send and Shift+Enter for a newline, and keep both titles.

**Edge cases.**
- Two icon buttons plus padding is about 90px: the placeholder must not run
  under them at the panel's narrowest, so the field is `min-w-0 flex-1`.
- The mic is disabled when dictation is unavailable and while transcribing; in
  one row that disabled state has to stay legible rather than vanish.
- The panel is also mounted in the mobile sheet, where the row is narrowest.

**Done when.** In a browser the composer is one line high with the mic and send
to the right of the text, the caret starts at the left, typing four lines grows
the box downward with the buttons staying beside the last line, and nothing
overlaps at the panel's minimum width.

