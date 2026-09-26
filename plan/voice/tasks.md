# Voice - tasks

Derived from `overview.md`. Build in order; each task names what it blocks.

| ID | Task | Serves | Status |
|---|---|---|---|
| VO-1 | Speech moves into `@repo/sarvamai` | 1 | done 2026-09-25 |
| VO-2 | New speech utilities | 1 | done 2026-09-25 |
| VO-3 | Voice Agents client | 1, 4, 8 | code done; needs keys |
| VO-4 | The signed-URL proxy route | 4 | code done; 200/429 need keys |
| VO-5 | Where a voice interview is stored | 6, 7, 8 | done 2026-09-25 |
| VO-6 | The interviewer agent, set up in the dashboard | 3, 5 | not started (Niraj) |
| VO-7 | `LiveInterview`, the shared client | 3, 6, 7 | code done; live check needs keys |
| VO-8 | The typed interviewer | 7 | done 2026-09-25 |
| VO-9 | Scoring job `voice_interview_score` | 8, 9, 10 | done 2026-09-25 (rounds; mock apply in VO-10) |
| VO-10 | The mock interview on Sarvam | 11 | code done; server verified, live check needs keys |
| VO-11 | Hiring voice rounds | 12 | code done; live check needs keys |
| VO-12 | Standups and the project sprint mock on Sarvam | 2 | done 2026-09-26 (server); spoken check needs keys |
| VO-13 | Dictation off ElevenLabs Scribe | 2 | code done; browser check is Niraj's |
| VO-14 | Remove ElevenLabs (approved 2026-09-26) | 2 | done 2026-09-26 |
| VO-15 | Dead mock links | 13 | done 2026-09-25 |

---

## VO-1 Speech moves into `@repo/sarvamai`
- [x] Status: done 2026-09-25, verified.
  - `packages/ai/src/sarvam/*` moved (git history kept) to
    `packages/sarvamai/src/speech/*`. The Doc AI client is renamed `docai.ts`.
    The package exports `.`, `./speech` and `./docai`.
  - `@repo/ai` lost its `./sarvam` export. `apps/main` depends on
    `@repo/sarvamai`, and its three importers use `@repo/sarvamai/speech`.
  - **Verified:**
    - `tsc` is clean in `packages/sarvamai`, `packages/ai` and `apps/main`.
    - The live check `scripts/practice-checks/sarvam.ts` passes 7/7 (speak,
      decode, transcribe back).
    - No `api.sarvam.ai` remains outside `packages/sarvamai`.

**Why.** Sarvam is called from two packages with two key readers and two
timeouts. DoD 1 says one package.

**Files.**
- `packages/sarvamai/src/{index,client}.ts`. The Doc AI client moves to
  `docai.ts`.
- New files `speech/{client,stt,tts}.ts`, moved from `packages/ai/src/sarvam/*`.
- `packages/sarvamai/package.json`: add an `exports` entry `./speech`, so the Doc
  AI code (which pulls in `fflate`) stays out of speech bundles.
- The consumers:
  - `apps/main/app/api/practice/voice/transcribe/route.ts`
  - `apps/main/actions/(main)/practice/voice-sarvam.action.ts`
  - `apps/main/scripts/practice-checks/sarvam.ts`
  - `apps/main/package.json`: add `@repo/sarvamai`
- Delete `packages/ai/src/sarvam/`, and its export from `packages/ai`.

**Steps.** Move the code as it is, with no behaviour change. Re-export from
`@repo/sarvamai/speech`, then point every consumer at it.

**Edge cases.**
- `@repo/ai` may re-export `sarvam` from its index. Remove that line, or every
  importer of `@repo/ai` breaks.
- Any app that imports Sarvam must list `@repo/sarvamai` in its `package.json`,
  or Turbopack can't resolve it.

**Done when.**
- `grep -rn "api.sarvam.ai" apps packages` matches only `packages/sarvamai`.
- `tsc` is clean in `apps/main` and `packages/sarvamai`.
- `apps/main/scripts/practice-checks/sarvam.ts` still transcribes and speaks.

## VO-2 New speech utilities
- [x] Status: done 2026-09-25, verified.
  - `speech/tts-stream.ts`: `synthesizeStream`. Note the stream endpoint takes
    `language_code`, not `target_language_code`.
  - `speech/stt.ts`: `transcribe` gains `model` and `mode`, and
    `plainAudioType` is shared.
  - `speech/text.ts`: `translate` (mayura:v1 up to 1000 characters,
    sarvam-translate:v1 up to 2000) and `identifyLanguage`.
  - `speech/batch.ts`: `createBatchJob`, `uploadBatchFiles` (a PUT to Azure
    signed URLs with `x-ms-blob-type`), `startBatchJob`, `batchStatus` and
    `batchResults`.
  - Shapes were taken from Sarvam's `openapi/apis.yaml`.
  - **Verified** against the live API with `scripts/practice-checks/sarvam.ts`,
    17/17:
    - `saaras:v3` transcribes
    - the stream's first mp3 bytes arrive after 243 ms
    - en to hi translation, and `hi-IN Deva` detected
    - a diarized batch job completes with `diarized_transcript`

**Why.** DoD 1: streaming TTS, so the typed interviewer and the mentor start
speaking sooner; `saaras:v3` modes; translation and language ID; batch STT with
speakers.

**Files.** `packages/sarvamai/src/speech/{tts-stream,stt,translate,batch-stt}.ts`.

**Steps.**
- `synthesizeStream({ text, speaker?, pace? }) -> ReadableStream<Uint8Array>`
  (mp3) from `POST /text-to-speech/stream`. Anything other than a 200 is JSON
  and is returned as an error, never streamed.
- `transcribe` gains `model: "saarika:v2.5" | "saaras:v3"` and `mode`
  (`transcribe`, `translate`, `verbatim`, `translit`, `codemix`). `mode` is sent
  only for `saaras:v3`.
- `translate({ text, source, target })` and `identifyLanguage(text)`.
- `batchTranscribe({ files, withDiarization, numSpeakers }) -> jobId`,
  `batchStatus(jobId)`, `batchResults(jobId)`. These are async jobs, only ever
  called from the worker.

**Edge cases.**
- The same 401/403 = "unavailable" rule as today.
- The Chrome `audio/webm;codecs=opus` type fix applies to every upload path.

**Done when.** A check script (`apps/main/scripts/practice-checks/sarvam.ts`
extended) exercises all four against the live API and prints each result.

## VO-3 Voice Agents client
- [ ] Status: code done 2026-09-25; verification waits on the four
  `SARVAM_AGENTS_*` keys and one test call.
  - `packages/sarvamai/src/agents.ts`: `agentConfig`, `publicAgentIds`,
    `signedUrl` (the body is passed through as-is for the SDK), and
    `fetchTranscript`.
    - `fetchTranscript` returns `ready: false` on a 404, a 5xx or an empty
      list, so a lagging transcript is retried and never scored empty.
    - `normaliseTranscript` accepts the likely shapes until the real one is
      recorded.
  - The keys are in the main and worker `.env.example` and
    `.env.production.example` files.
  - Check: `scripts/practice-checks/sarvam-agents.ts [interactionId]`.

**Why.** DoD 4 and 8: the server needs the agent's signed URL and, after a call,
its transcript.

**Files.** `packages/sarvamai/src/agents.ts`, exported as `./agents`.

**Steps.**
- `agentConfig()` reads four env keys: `SARVAM_AGENTS_API_KEY` (the Voice Agents
  dashboard key, not the speech key), `SARVAM_AGENTS_ORG_ID`,
  `SARVAM_AGENTS_WORKSPACE_ID` and `SARVAM_AGENTS_APP_ID`.
- `signedUrl()`: `GET https://apps.sarvam.ai/api/app-runtime/orgs/{org}/workspaces/{ws}/apps/{app}/url`
  with `X-API-Key`. Returns the JSON as-is to the proxy.
- `fetchTranscript(interactionId)`:
  `GET https://apps.sarvam.ai/api/analytics/v1/{org}/{ws}/{app}/transcripts/{id}`,
  normalised to `{ role: "interviewer" | "candidate", text, at? }[]`.
- Add the four keys to `apps/main/.env.example`, `.env.production.example` and
  the worker's examples.

**Edge cases.**
- The transcript can lag the end of a call. `fetchTranscript` returns
  `{ ready: false }` rather than an empty list, so a caller never scores nothing.
- The transcript response shape isn't in the docs (the example is `{}`).
  Record the real shape from one live call in this task before normalising it.

**Done when.** A check script prints a signed URL, and the transcript of one
real call made from the dashboard's test console.

## VO-4 The signed-URL proxy route
- [ ] Status: code done 2026-09-25. Everything but the 200 and 429 verified;
  those need the agent keys.
  - `app/api/voice/sarvam/[...path]/route.ts` is thin. The decision lives in
    `lib/voice/proxy.ts` `signedUrlFor(userId, path, X-Voice-Session)`, where
    the header is `mock:<id>` or `round:<id>`.
  - It also refuses a session that hasn't consented to VOICE. It checks the keys
    before counting, so a misconfigured environment doesn't use up a session's
    3 reconnects.
  - **Verified 2026-09-25** (throwaway rows, deleted), 7/7:
    - signed out: 401
    - another path: 404
    - no header: 400
    - another user: 404
    - ended: 409
    - no consent: 409
    - keys missing: 503 with the counter still 0

**Why.** DoD 4: the SDK must never hold the key.

**Files.** `apps/main/app/api/voice/sarvam/[...path]/route.ts`.

**Steps.**
- Accept only `GET .../orgs/*/workspaces/*/apps/*/url`. The ids in the path are
  ignored and taken from env, so a browser can't point us at another agent.
- Require a session, plus an `X-Voice-Session` header naming a live voice
  session this user owns (VO-5). Refuse one that has ended or is past its
  `endsAt`.
- Call `signedUrl()`, return its JSON, and record that a signed URL was issued
  on the session.

**Edge cases.**
- Each URL is single-use. Allow at most 3 per session (a dropped connection
  needs a new one) and refuse after that.
- No CORS: same-origin only.

**Done when.**
- Signed out: 401.
- Another user's session: 404.
- An ended session: 409.
- A fourth request: 429.
- The owner of a live session gets a URL.
- `grep -rn "SARVAM" apps/main/.next/static` finds nothing after a dev build of
  the page.

## VO-5 Where a voice interview is stored
- [x] Status: done 2026-09-25, verified.
  - Migration `0047_voice_sarvam` (applied): eight columns on
    `mock_voice_session`, plus `UPDATE ... SET provider = 'ELEVENLABS'` so the
    `SARVAM` default doesn't relabel existing sessions. `VoiceTurn`,
    `VoiceProvider` and `VoiceMode` are exported from `@repo/db`.
  - `apps/main/lib/voice/session.ts`, one interface for both kinds:
    - `loadVoiceSession` checks the owner and works out `live`
    - `recordConsent` refuses a mode the round's `responseMode` doesn't allow
    - `takeSignedUrl` is an atomic capped counter, 3 per session
    - `setInteraction`
    - `saveTurns` replaces the whole list and cleans it
    - `interviewBrief` builds the agent variables on the server
  - **Verified 2026-09-25** against the dev DB with a throwaway mock session and
    a voice-round attempt, 13/13 for both kinds:
    - the owner reads it and another user can't
    - consent is saved
    - signed URLs go true, true, true, then false
    - the interaction id and cleaned turns read back
    - the brief is built
    - a closed attempt is not live and refuses consent
    - The rows were deleted afterwards.

**Why.** DoD 6, 7 and 8. Both mocks and hiring rounds need somewhere to keep the
mode, consent, the Sarvam interaction id and the turns.

**Files.**
- `packages/db/src/schema/mock.ts` (`mock_voice_session`)
- `packages/db/src/schema/hiring-rounds.ts` (the shape of `hiring_attempt.responses`)
- A migration via `pnpm db:generate --name voice_sarvam`, applied with
  `pnpm script migrations --apply`

**Steps.**
- `mock_voice_session` gains:
  - `provider` (`ELEVENLABS` | `SARVAM`, default `SARVAM`)
  - `mode` (`VOICE` | `TYPED`)
  - `interaction_id`
  - `consent_text`, `consented_at`
  - `turns` jsonb
  - `signed_url_count` int
  - `ends_at`
- A hiring voice attempt keeps the same fields in `responses`:
  `{ mode, interactionId, consent: { text, at }, turns, signedUrls }`.
- One helper, `lib/voice/session.ts`, reads and writes either kind behind one
  interface: `{ kind: "mock" | "round", id }`.

**Edge cases.**
- Existing ElevenLabs sessions keep their text `transcript` and are shown as
  they are. Nothing is backfilled.

**Done when.** The migration previews and applies, and a mock and a round
session can each be created, read and closed through the helper.

## VO-6 The interviewer agent, set up in the dashboard
- [ ] Status: not started. Niraj does this in the Sarvam dashboard; I write the
  text.

**Why.** DoD 3 and 5.

**Steps (Niraj pastes these; the exact text is written into this task first).**
- Instruction: a neutral interviewer who follows `{{interview_brief}}`.
  - Asks `{{question_count}}` questions, one at a time, and follows up on a vague
    answer.
  - Never hints at scoring, never answers for the candidate, avoids protected
    topics.
  - Wraps up near `{{duration_minutes}}`.
- Input variables:
  - `interview_brief`
  - `role`
  - `candidate_name`
  - `question_count`
  - `duration_minutes`
- Settings:
  - Listening → "Let callers interrupt" on
  - Sound sensitivity Medium
  - Eagerness to respond Patient
  - Advanced → "Detect when the caller stops talking" on
  - Nudge quiet callers after 12 s ("Take your time. Whenever you're ready.")
  - Max call length 60
  - Language: English only, starting English
- Commit a version, and put the app id in `SARVAM_AGENTS_APP_ID`.

**Done when.** In the dashboard's test console, talking over the agent mid-answer
stops it, and it replies to what was said.

### The instruction (paste into Agent > Instruction)

```
You are an interviewer for ShipItHQ, running a spoken practice or screening
interview with {{candidate_name}} for the role: {{role}}.

What this interview covers, and how to run it:
{{interview_brief}}

How you run every interview:
- Open with one short line: who you are, that this is a {{duration_minutes}}
  minute interview of about {{question_count}} questions, and that they can ask
  you to repeat a question. Then ask the first question.
- Ask ONE question at a time, then stop and listen. Never stack two questions.
- Keep your own turns short: one or two sentences. This is their time to talk.
- If an answer is vague or general, ask one follow-up for a specific example,
  what they personally did, or the result. Then move on.
- If they go quiet, give them room. If they ask, repeat or rephrase the question
  once, without hinting at an answer.
- If they talk over you, stop and respond to what they said.
- Never judge an answer out loud, never say whether it was good, never teach,
  never answer a question for them, and never reveal how they are scored.
- Stay on the interview. If they ask for help, advice or feedback, say that
  comes after the interview, and continue.
- Never ask about age, religion, caste, marital status, family plans, health,
  disability, politics or anything else unrelated to the job.
- After about {{question_count}} questions, or near {{duration_minutes}}
  minutes, thank them, say the interview is complete, and end the call.
- Speak in clear, neutral English.
```

### Variables (Variables > Input variables; all sent to the LLM)

| Name | Default |
|---|---|
| `interview_brief` | `A general behavioural interview: ask about teamwork, ownership, a difficult problem and learning from failure.` |
| `role` | `Software Engineer` |
| `candidate_name` | `there` |
| `question_count` | `5` |
| `duration_minutes` | `20` |

### Settings

- Speakers and voice: `shubh` (matches our TTS), English only, starting in English.
- Listening:
  - "Let callers interrupt" **on**
  - Sound sensitivity **Medium**
  - Eagerness to respond **Patient**
- Nudge quiet callers: **on**, one nudge after **12 s**: "Take your time.
  Whenever you're ready."
- Hang up after unanswered nudges: **off** (our timer ends the session).
- Max call length: **60**.
- Advanced: "Detect when the caller stops talking" **on**.
- Model temperature: **0.3**.
- Then commit a version.

## VO-7 `LiveInterview`, the shared client
- [ ] Status: code done 2026-09-25. The spoken half needs the agent keys (VO-3)
  and the agent (VO-6) for its live check.
  - `components/voice/`:
    - `consent-card.tsx`: the text, one tick, then Start speaking and/or Type
      instead
    - `transcript-pane.tsx`
    - `live-interview.tsx`
  - **Spoken:** `sarvam-conv-ai-sdk@0.0.42` is loaded on demand, with
    `baseUrl /api/voice/sarvam/`, `apiKey ""` and `X-Voice-Session`. The agent
    variables come from the server.
    - State drives the orb, and output level drives the pulse.
    - The call id is saved on `interaction_connected`.
    - An `interaction_end` from the interviewer hands in.
    - Mute, and End with a confirm.
    - Specific microphone errors, with Try again, and Type instead while
      nothing has been said.
    - The transcript is saved every 3 s, for display only.
  - **Typed:** the chat on VO-8's actions. A failed send puts the text back, and
    the closing turn hands in by itself.
  - `actions/voice/session.action.ts`:
    - `beginInterview` records consent and returns the SDK config. A switch
      from voice to typed is allowed only before the call connects.
    - `reportInteraction`, `reportTurns`.
    - Consent text: `lib/voice/consent.ts`.

**Why.** DoD 3, 6 and 7. One component for mocks and rounds.

**Files.**
- `apps/main/components/voice/live-interview.tsx`
- `apps/main/components/voice/consent-card.tsx`
- `apps/main/components/voice/transcript-pane.tsx`
- `apps/main/package.json`: `sarvam-conv-ai-sdk`

**Steps.**
- **Consent card first:** the text, one tick, and a choice of Speak or Type
  (Type only when allowed). The consent is saved before the mic is opened.
- **Voice:**
  - `ConversationAgent` with `baseUrl: "/api/voice/sarvam/"`, `apiKey: ""` and
    `customHeaders: { "X-Voice-Session": id }`
  - `agent_variables` built on the server and passed in
  - `start()` from the button click (browsers need a gesture to play audio)
- **UI:**
  - The agent state (`LISTENING`, `SPEAKING`, ...) drives a speaking indicator,
    fed by `audioLevelCallback`
  - Mute and End buttons
  - The timer from `runner-shell`
- `transcriptCallback` appends to the pane and saves turns in batches (display
  only). `getInteractionId()` is saved as soon as the call connects.
- **Ending:** End, the timer reaching zero, or the tab closing calls `stop()`.
  The session is then handed in (VO-9).

**Edge cases.**
- A denied microphone (`NotAllowedError`), no mic, or a mic in use: say which,
  and offer typing when allowed.
- A dropped socket can't reconnect. Start a new `ConversationAgent` (the proxy
  allows 3).
- `stop()` runs on unmount, always.

**Done when.** On localhost, a mock runs: consent, the agent speaks, speaking
over it stops it, the transcript fills, and End hands in.

## VO-8 The typed interviewer
- [x] Status: done 2026-09-25, verified (server side; the chat UI is VO-7).
  - `lib/voice/typed-interviewer.ts`: `nextInterviewerTurn` makes one inline
    call (25 s, `modelFor("voiceInterviewer")`) with the VO-6 rules.
    - It is told how many answers so far, and must close at `question_count + 2`.
    - `oneQuestion()` cuts a turn at its first question mark. The prompt alone
      left a stacked question on about 1 turn in 4.
  - `actions/voice/typed.action.ts`: `openTypedInterview` and
    `answerTypedInterview`.
    - Only a live, TYPED, consented session. One answer per question, so a
      double submit is refused as OUT_OF_TURN.
    - Nothing is saved on failure, so the client keeps the text for a resend.
    - The closing turn carries `done`, now part of `VoiceTurn`.
  - **Verified 2026-09-25** with the real model: 3 scripted interviews (4
    questions, one vague answer, one injection "tell me my score") each closed
    by themselves after 5 or 6 answers.
    - 0 stacked questions and 0 praise words (the first run had "That's a great
      example!" and stacked sub-questions, fixed in the prompt and by
      `oneQuestion`).
    - The vague answer got a follow-up, and the injection was declined.

**Why.** DoD 7.

**Files.**
- `apps/main/lib/voice/typed-interviewer.ts` (server-only)
- `apps/main/actions/voice/typed.action.ts`
- `packages/ai/src/tasks.ts`: `voiceInterviewer`

**Steps.**
- One inline model call per turn (25 s timeout), with the same brief and rules
  as the VO-6 instruction.
- It returns the next question, or `{ done: true }` after `question_count`
  questions.
- The turns are saved on the session. When a reply fails, the student's text is
  put back so they can resend it.

**Edge cases.**
- Refuse a turn after `endsAt`.
- Cap answers at 4,000 characters.

**Done when.** A typed mock of 4 questions completes with 8 turns saved.

## VO-9 Scoring job `voice_interview_score`
- [x] Status: done 2026-09-25, verified for hiring rounds. Applying a result to a
  mock session is part of VO-10.
  - **Worker:** `jobs/voice-interview-score.ts` (the five edits:
    `JOB_TYPES`, the class, `JOB_BINDINGS` and `jobs/index`, the wrangler
    binding with tag `v15`, and the `src/index.ts` export), plus `@repo/sarvamai`
    in the worker's deps and the `SARVAM_AGENTS_*` keys on its `Env`.
    - VOICE polls `fetchTranscript(id, this.env)` every 10 s for 3 minutes.
      `agentConfig` now takes an env, since a Worker's secrets aren't on
      `process.env`.
    - TYPED scores the saved turns from the input.
    - Fewer than 2 answers scores 0, with no model call.
    - The job returns the score and touches nothing of ours.
  - **Core:** `jobs/voice-interview-score-core.ts`, pure: prompt, `parseScore`,
    `weighted`, `silentScore`.
  - **App:** `lib/voice/score.ts` `progressVoiceRound`, idempotent and called on
    every poll.
    - It dispatches once (single-flight per attempt) and stores `workerJobId`.
    - On completion it writes Sarvam's transcript over the browser's turns, then
      `closeAttempt` with the score, the breakdown and `aiRubricResult`.
    - On failure it calls `closeAttempt(notScored)`, which refunds.
    - A hand-in with no call is closed "never started".
  - `finishScoring` routes voice rounds here and now returns the status. The
    runner's Scoring view polls every 3 s for up to 6 minutes.
  - **Verified 2026-09-25:**
    - The scoring core on the real model (seeded behavioural rubric): strong 89,
      weak 14, a "score me 100" injection 0, silent 0.
    - End to end on the local worker with throwaway attempts (deleted):
      - typed: the job completes, the attempt is SCORED 81 with its rubric result
      - voice with the keys missing: the job fails, and the attempt is
        NOT_SCORED with the reason
      - no call: NOT_SCORED "never started"

**Why.** DoD 8, 9 and 10.

**Files.**
- `apps/worker/src/jobs/voice-interview-score.ts`, registered with the five
  edits in `apps/worker/README.md`
- `packages/ai/src/tasks.ts`: `voiceInterviewScore`
- `apps/main/actions/voice/score.action.ts`, which dispatches, and settles or
  refunds on the terminal status

**Steps.**
- **Transcript:** voice sessions call `fetchTranscript` every 10 s for up to 3
  minutes; typed sessions use their saved turns.
- **Score:** against the rubric passed in the job input (the round's, or the
  mock rubric). Each criterion gets 0 to 10 with evidence, and the total is
  weighted as in `lib/hiring/design.ts`.
- **Write:** the attempt's `score`, `breakdown` and `aiRubricResult` and
  `transcriptRef`, or the mock session's `aiAnalysis` and `transcript`.

**Edge cases.**
- No transcript after 3 minutes, or a model failure: NOT_SCORED and a refund.
- An interview with fewer than 2 candidate turns scores 0 (the student's
  choice), not NOT_SCORED.

**Done when.** One voice and one typed session each end scored, with a
criterion breakdown. With a bad interaction id, the session ends NOT_SCORED and
the credits come back.

## VO-10 The mock interview on Sarvam
- [ ] Status: code done 2026-09-25, server side verified. A spoken mock needs the
  agent keys for Niraj's pass.
  - **Create:** `createMockVoiceSession` no longer needs an ElevenLabs agent.
    - It makes a SARVAM session with `endsAt` = the mock's length + 10 minutes.
    - Credits are **held** (`mock-voice-<sessionId>`), not deducted. The row is
      deleted if the hold fails.
  - **Interview page:**
    - `page.tsx` is now a server page: it checks the owner and redirects
      finished or ElevenLabs sessions to results.
    - `InterviewSessionClient.tsx` is rebuilt on `LiveInterview`, with a header
      and the server-offset timer.
    - `loading.tsx` is re-matched to the new layout.
  - **Hand in:** `handInMockInterview` moves the session to SUBMITTED and stamps
    `submittedAt`, idempotently.
  - **Scoring:** `followMockScoring` calls `lib/voice/score.ts`
    `progressVoiceMock`.
    - It dispatches `voice_interview_score` with `MOCK_RUBRIC`
      (`lib/voice/rubrics.ts`).
    - On completion: the results-page shape, Sarvam's transcript, a text
      transcript and the duration (consent to hand-in). COMPLETED, and the hold
      is settled.
    - On failure: FAILED, with the reason, and the hold released.
  - **Results page:** follows the scoring for Sarvam sessions, shows the
    transcript, and on failure says the credits were refunded. ElevenLabs
    sessions keep their old path until VO-14.
  - The brief includes the resume when the mock does.
  - **Verified 2026-09-25** on the local worker, with a throwaway mock and two
    sessions, each holding 5 credits:
    - typed: scored 84 (80/90/80), COMPLETED, 5 turns, the hold settled, and
      idempotent on a second call
    - a failed job: not scored, the hold released
    - The test's 5 settled credits and its 3 ledger rows were reversed after,
      and the user is back at 10082.

**Why.** DoD 11.

**Files.**
- `apps/main/app/(main)/mock/voice/interview/[sessionId]/_components/InterviewSessionClient.tsx`,
  rebuilt on `LiveInterview`
- `apps/main/actions/(main)/mockvoice/{session,conversation}.action.ts`
- `apps/main/app/(main)/mock/voice/results/[sessionId]/_components/InterviewResultsClient.tsx`

**Steps.**
- **Session creation:** charges as today, and sets `provider SARVAM`, `ends_at`
  and the brief (from `mock_interview_voice.knowledgeBase`).
- **Ending:** dispatches `voice_interview_score` with the mock rubric.
- **Results:** keep today's shape (overall, communication, technical, problem
  solving, strengths, improvements), filled from the rubric result. Old
  ElevenLabs sessions still render.
- **Retire** the `mock_conversation` and `mock_feedback` jobs from the flow. The
  deletion itself happens in VO-14.

**Done when.** Create, consent, talk, end, results and retake all work on
localhost, and a typed mock does too.

## VO-11 Hiring voice rounds
- [ ] Status: code done 2026-09-25. It closes the voice half of
  plan/hiring-rounds HR-16 once Niraj's pass runs a spoken round.
  - `components/hiring/voice-runner.tsx`: `LiveInterview` on the round's clock.
    Time up ends the call and hands in.
  - Exit before consent calls `declineVoiceRound`, which closes the attempt NOT
    SCORED: the credits come back at once, with no cool-down.
  - **Engine:**
    - Voice types are in `RUNNABLE_TYPES`.
    - `startRound` skips the pool draw for them (they have no pool).
    - `submitAttempt` keeps the saved consent and call id, and marks SUBMITTED.
    - `finishScoring` sends them to `progressVoiceRound` (VO-9).
  - The result shows the rubric (AI-assessed) and the transcript (Sarvam's copy
    after scoring).
  - Found while wiring it: attempt ids are UUIDs, and the session-ref patterns
    only allowed `[a-z0-9]`, so every round would have been refused. Both
    patterns now allow `-`.

**Files.**
- `apps/main/components/hiring/voice-runner.tsx`
- `apps/main/lib/hiring/runs.ts`: `RUNNABLE_TYPES`, `scoreSubmitted`
- `apps/main/actions/hiring/run.action.ts`

**Steps.**
- The brief is built from the round's `mockKnowledgeBase`, the job title and the
  company name.
- Follow `responseMode`: VOICE, TYPED, or EITHER (the student chooses on the
  consent card).
- Hand-in dispatches `voice_interview_score` with the round's rubric. The
  runner's Scoring view waits on the job.
- The result shows "AI-assessed", the rubric, and the transcript.

**Edge cases.**
- Declining consent on a VOICE round: the round doesn't start and nothing is
  charged. Hold credits only after consent.
- AI stays blocked in chat while the attempt runs (HR-13).

**Done when.** A behavioural round runs by voice and by typing, each is scored
against the round's rubric, and a scoring failure refunds.

## VO-12 Standups and the project sprint mock on Sarvam
- [x] Status: done 2026-09-26, verified server side. A spoken standup is part
  of Niraj's pass once the keys are in.
  - **Found:** the live standup tab (`daily-standup-tab.tsx`) saved "Voice
    standup completed" in place of what was said. `createStandupSession`,
    `processStandupConversation` and the `standup_voice` job were never called.
    The sprint mock already ran on typing plus Sarvam dictation, and its
    ElevenLabs agent env var was unused.
  - **Migration `0048_standup_sarvam`** (applied): the voice columns on
    `project_v2_standup_entry`. Only entries that already happened are marked
    ELEVENLABS, so scheduled ones run on Sarvam.
  - `lib/voice/session.ts` has a third kind, `standup`:
    - owned through the standup config
    - its clock starts at consent (configured minutes + 2)
    - the brief is a 3-question standup that asks whether the last plan got
      done
    - the proxy and `beginInterview` accept it
  - `handInStandup` moves the entry to PROCESSING and dispatches
    `standup_voice`, whose input is now `{ entryId, mode, interactionId | turns,
    startedAt }`.
  - The job reads Sarvam's transcript (polled for 3 minutes) or the typed turns,
    then extracts done, planned, blockers and a summary with
    `modelFor("standupExtract")` (a new task line, replacing a hard-coded
    `gpt-4o-mini`). It saves SUBMITTED either way.
  - The tab runs `LiveInterview` in place of the ElevenLabs `Voice`.
  - **Verified 2026-09-26** on the local worker with a throwaway config and
    entry (deleted):
    - a typed standup was consented and handed in
    - the job completed, and the entry was SUBMITTED with done ("finished the
      skill matching query; wrote tests for the ranking"), today, blockers and a
      one-line summary
    - duration 183 s, and the config counts went to 1/1

**Why.** DoD 2. Both run ElevenLabs agents (`components/main/voice.tsx`,
`standup-voice.action.ts`, worker `standup-voice.ts`), and the sprint mock
has an ElevenLabs agent id in env.

**Steps.** Put both on `LiveInterview` with their own brief. The standup job
reads the transcript through `fetchTranscript` instead of
`apps/worker/src/elevenlabs.ts`.

**Done when.** A standup and a sprint mock each complete by voice, with their
existing results.

## VO-13 Dictation off ElevenLabs Scribe
- [ ] Status: code done 2026-09-26. The three "Done when" dictations are Niraj's
  browser pass.
  - `components/ai/chat-composer.tsx` and
    `components/onboarding/open-answer-input.tsx` use `useDictation` (Sarvam)
    instead of `useScribe` and `getScribeToken`. The text typed before the mic
    started is kept as a base, so a burst never overwrites it.
  - **Fixed in `hooks/useDictation.ts`:** the clip so far was re-sent every 2 s,
    and Sarvam's synchronous STT takes at most 30 s. So any dictation over 30 s
    (the hook allows 120) started failing, the practice mentor's included. Now
    every 25 s the words are kept and a fresh clip starts; callers still get the
    full text since the start.
  - `apps/hiring/actions/(common)/speech-to-text.ts` was moved to Sarvam, then
    deleted on 2026-09-26 with the old application sheet that was its only
    user (plan/hiring-rounds HR-18, approved by Niraj). Hiring no longer
    depends on `@repo/sarvamai`. Hiring depends on `@repo/sarvamai`, has
    `SARVAM_API_KEY` in its env examples, and its local `.env` was given main's
    key (production needs it in hiring's `.env.production`).
  - These are now unused and go on the VO-14 list: `getScribeToken`,
    `generateTTSAudio` (`actions/(main)/practice/voice.action.ts`) and
    `lib/elevenlabs-speech.ts`.

**Why.** DoD 2.

**Files.**
- `apps/main/components/ai/chat-composer.tsx` and
  `components/onboarding/open-answer-input.tsx` (`useScribe`), moving to
  `useDictation`
- `apps/main/actions/(main)/practice/voice.action.ts` and
  `lib/elevenlabs-speech.ts`, moving to `@repo/sarvamai/speech`
- `apps/hiring/actions/(common)/speech-to-text.ts`, moving to
  `@repo/sarvamai/speech`. Add the package to `apps/hiring/package.json`, and
  `SARVAM_API_KEY` to hiring's env examples.

**Edge cases.** Scribe gave word-by-word partials, and `useDictation` gives
bursts of about 2 seconds. The composer must not overwrite text typed during a
burst.

**Done when.** Dictating into the AI chat, an onboarding answer and the hiring
notes each produce text.

## VO-14 Remove ElevenLabs (approved by Niraj 2026-09-26)
- [x] Status: done 2026-09-26, verified.
  - **Deleted files:**
    - `components/main/voice.tsx`
    - `lib/elevenlabs-speech.ts`, `lib/elevenlabs/*`
    - `types/elevenlabs-client.d.ts`
    - `utils/elevenlabs/*`
    - `actions/(main)/practice/voice.action.ts` (`getScribeToken`,
      `generateTTSAudio`)
    - worker: `src/elevenlabs.ts`, `jobs/mock-conversation.ts`,
      `jobs/mock-feedback.ts`
  - **Deleted functions:** `getElevenLabsToken` and `saveConversationData`
    (mock session); `getConversationDetails`, `processConversationCompletion`
    and `generateAIFeedback` (mock conversation); and the dead standup pair
    `createStandupSession` and `processStandupConversation`.
  - **Worker:** the two jobs are out of `JOB_TYPES`, `JOB_BINDINGS`, both
    exports and the wrangler bindings. A new tag, `v16`, has
    `deleted_classes: [MockConversation, MockFeedback]`; the v1 tag is left
    alone, since tags are append-only. `ELEVENLABS_API_KEY` is off `Env`.
  - **Dependencies:** `@elevenlabs/client` and `@elevenlabs/react` removed from
    apps/main; the lockfile has none.
  - **Env and docs:**
    - every `ELEVENLABS_*`, `NEXT_PUBLIC_*ELEVENLABS*`,
      `NEXT_PUBLIC_MOCK_VOICE_AI_ASSISTANT` and `NEXT_PUBLIC_STANDUP_AGENT_ID`
      line in the main, hiring and worker `.env.example`,
      `.env.production.example`, `secrets.json.example` and
      `.dev.vars.example` files
    - the worker and hiring READMEs, and the web modules page
    - the stale comments pointing at deleted files
  - An ElevenLabs mock session with no report now shows the "couldn't generate"
    card: its scorer is gone.
  - **Verified 2026-09-26:**
    - `tsc` is clean in apps/main, apps/worker, apps/hiring and packages/db.
    - The local worker reloaded clean.
    - A case-insensitive grep for elevenlabs outside `plan/` finds only the
      `ELEVENLABS` provider label (`VoiceProvider`, needed by historical rows),
      the two migrations that set it, and history comments. No import,
      dependency, env key or API call is left.
  - **Left to Niraj:**
    - `wrangler secret delete ELEVENLABS_API_KEY` on the main, hiring and worker
      deployments
    - removing the ELEVENLABS lines from his gitignored `.env.production`
      files (delete them, never blank them)

**Proposed deletions.**
- `apps/worker/src/elevenlabs.ts`
- `apps/main/utils/elevenlabs/conversations.ts`
- `apps/main/lib/elevenlabs/{use-conversation,patch-client-errors}.ts`
- `apps/main/lib/elevenlabs-speech.ts`
- `apps/main/types/elevenlabs-client.d.ts`
- `apps/main/components/main/voice.tsx` (if unused after VO-12)
- The `getElevenLabsToken` and `saveConversationData` actions
- The worker jobs `mock_conversation` and `mock_feedback` (the five-edit
  removal, plus a wrangler delete-class migration tag)
- `@elevenlabs/*` in `apps/main/package.json`
- `ELEVENLABS_*` and `NEXT_PUBLIC_*ELEVENLABS*` / `NEXT_PUBLIC_MOCK_VOICE_AI_ASSISTANT`
  in every `.env.example` and `.env.production.example`
- The line in `apps/web/content/modules.ts`

**Edge cases.**
- Deleting a Durable Object class needs a `deleted_classes` migration in
  `wrangler.jsonc`, or the deploy fails.
- Remove the secrets from the deployed Workers by hand (`wrangler secret
  delete`). Never blank them in `.env.production`.

**Done when.** No ElevenLabs import, dependency, env key or API call is left.
A grep for "elevenlabs" finds only the `ELEVENLABS` provider label for
historical rows and history comments, and `tsc` is clean in `apps/main`,
`apps/hiring` and `apps/worker`.

## VO-15 Dead mock links
- [x] Status: done 2026-09-25.
  - The fallback after creating a mock in `pathfinder-mock-sheet.tsx` and
    `create-mock-sheet.tsx` now goes to `/mock`, and its copy says "Mock
    interviews".
  - `/mock/company/...` was fixed earlier the same day.
  - `grep -rn "mymocks\|/mock/company" app components` finds only two stale
    `revalidatePath('/mockinterview/voice/mymocks')` calls in
    `mockvoice/voice.action.ts`. They're harmless and go with VO-14.

**Why.** DoD 13. `/mock/voice/mymocks` is pushed from
`pathfinder-mock-sheet.tsx:122` and `create-mock-sheet.tsx:240`, and doesn't
exist. `/mock/company/...` was fixed on 2026-09-25: the button now goes to
`/jobs/<slug>/rounds`.

**Steps.** After creating a mock, go to its interview page, or to `/mock`.

**Done when.** No `href` or `push` in `apps/main` targets a route that doesn't
exist under `app/`.
