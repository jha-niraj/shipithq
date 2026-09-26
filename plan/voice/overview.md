# Voice - overview

## What this module is

Everything in ShipItHQ that listens or speaks, on one provider: Sarvam.

Today voice is split three ways. The mock interview talks to an ElevenLabs
agent. Dictation in the chat composer, onboarding answers, the hiring app and
standups also go to ElevenLabs. The practice mentor and the sprint mock use
Sarvam through `packages/ai/src/sarvam`. A fourth Sarvam client, for document
OCR, lives in `packages/sarvamai`.

When this module is done, `@repo/sarvamai` is the only way any app reaches
Sarvam. A live interview is a real conversation: the interviewer speaks, the
student answers, and the student can cut in while the interviewer is still
talking - it stops and listens. The mock interview and the hiring voice rounds
run on the same engine, and a student who would rather type gets the same
interview as a chat.

## Definition of done

1. **One package.** `@repo/sarvamai` holds every Sarvam call: speech to text,
   text to speech, streaming speech, translation and language detection, batch
   transcription with speakers, Doc AI, and the Voice Agents client.
   `packages/ai/src/sarvam` no longer exists, and `grep -rn "api.sarvam.ai"`
   outside `packages/sarvamai` finds nothing.
2. **No ElevenLabs.** No `@elevenlabs/*` dependency, no `ELEVENLABS_*` env key and
   no `elevenlabs` import remains in any app, package or worker.
3. **A live interview can be interrupted.** While the interviewer is speaking,
   the student starting to talk stops its audio within about a second, and the
   interviewer answers what the student said.
4. **The key never reaches a browser.** The browser SDK gets its single-use
   WebSocket URL through `/api/voice/sarvam/...`, which refuses anyone who is not
   signed in and does not own a live voice session. No `SARVAM_*` value is in
   any client bundle.
5. **One interviewer agent.** A single Sarvam agent runs every spoken interview.
   What it asks about comes from the session's agent variables
   (`interview_brief`, `role`, `candidate_name`, `question_count`,
   `duration_minutes`), so a new round or mock category needs no dashboard edit.
6. **Consent before recording.** Nobody is recorded before ticking consent, and
   the consent text is stored with the session. Declining offers typing when the
   round or mock allows it, and otherwise the voice interview doesn't start.
7. **Typed interviews are the same interview.** Choosing to type (or a TYPED
   round) runs the same brief as a text chat, turn by turn and inline, and
   produces the same transcript shape.
8. **Scored from Sarvam's transcript, not the browser's.** A spoken interview is
   scored from the transcript fetched from Sarvam by interaction id. The turns
   the browser reports are for display only.
9. **Scored against the right rubric.** A hiring voice round is scored against
   the round's rubric, and a mock against the mock rubric (communication,
   technical, problem solving). Either way the result names each criterion, its
   score and the evidence.
10. **Our failure refunds.** If the transcript can't be fetched or scoring fails,
    a hiring attempt is NOT_SCORED and refunded, and a mock session is marked
    failed and refunded. Neither is ever scored 0 for our failure.
11. **The mock works end to end on Sarvam:** create, consent, talk (or type),
    end, results, retake, with the same credits as today.
12. **Hiring voice rounds are takeable** from a job's rounds page and from
    practice, gated and cooled down like every other round (plan/hiring-rounds
    HR-16).
13. **No dead links.** `/mock/voice/mymocks` and `/mock/company/...` are gone or
    point at real pages.

## Out of scope

- **Phone calls, campaigns and WhatsApp.** The agent is used as a browser
  session only.
- **Languages other than English in the interview itself.** The package gains
  translation and language detection (DoD 1), but interviews stay in `en-IN`
  until a later decision.
- **Keeping recordings.** We keep transcripts and scores. Audio is Sarvam's call
  record, and nothing of ours stores it.
- **`apps/shipitworker`**, which runs user code and has nothing to do with voice.

## Decisions

- **Sarvam replaces ElevenLabs everywhere** (Niraj, 2026-09-25).
- **All Sarvam code lives in `@repo/sarvamai`.** `packages/ai/src/sarvam` moves
  there and is deleted (Niraj, 2026-09-25).
- **The package also gains streaming TTS, `saaras:v3` STT with modes, batch STT
  with speakers, and translation and language ID** (Niraj, 2026-09-25).
- **Live voice uses a Sarvam Voice Agent through its browser SDK**
  (`sarvam-conv-ai-sdk/browser`), with a Next route as the proxy that adds the key
  (Niraj, 2026-09-25). Rejected alternatives:
  - **Our own relay** (a Durable Object streaming to Sarvam's STT and TTS
    sockets): several times the work, and it re-builds turn-taking the agent
    already has.
  - **LiveKit:** needs a hosted Python agent.
  - **The embed widget:** no per-session control, and no transcript we can
    score.
- **One generic interviewer agent**, driven by agent variables (Niraj,
  2026-09-25).
- **The agent's own model runs the conversation.** Sarvam manages it, and only
  temperature can be tuned. OpenAI, through `modelFor`, does the typed
  interviewer and all scoring (Niraj, 2026-09-25).
- **Typed answers are a text chat on the same brief**, not a separate product
  (Niraj, 2026-09-25).
- **Interruptions and turn-taking are agent settings**, set in the dashboard,
  not in code:
  - Settings → Listening → "Let callers interrupt" on
  - Eagerness "Patient", so a pause to think isn't taken as the end of an answer
  - Advanced → "Detect when the caller stops talking" on
  - The values are recorded in VO-6.
- **Scoring waits on Sarvam, so it's a worker job.** The transcript may lag the
  end of a call, and CLAUDE.md sends third-party waits to the worker. The job
  fetches with retries, then scores. Credits are held on start and settled or
  refunded by the app when it sees the terminal status, as with every job.
- **The mock rubric:** Communication 35, Technical depth 35, Problem
  solving 30. The names are the three sections the results page has always
  shown. The constant is `MOCK_RUBRIC` in `apps/main/lib/voice/rubrics.ts`
  (2026-09-25).
- **A mock's credits are held, not spent**, from creation. They're settled when
  it's scored and released if we fail to score it. Before, they were deducted
  up front with no refund path (2026-09-25).
- **Standups become a live interview with real extraction** (Niraj,
  2026-09-26).
  - Found in VO-12: the live standup tab saved "Voice standup completed" in place
    of what was said, and the extracting path (`createStandupSession`,
    `processStandupConversation`, the `standup_voice` job) was never called.
  - The tab now runs the shared interview, and the job extracts yesterday, today
    and blockers from Sarvam's transcript or the typed turns.
- **ElevenLabs is deleted after VO-12**: every item in VO-14's list, approved by
  Niraj on 2026-09-26. Deployed secrets are removed by hand with `wrangler
  secret delete`.
- **Prices don't change.** A mock costs its `creditsRequired`, and a hiring voice
  round costs `hiring_round_voice` (30, plan/hiring-rounds overview).
