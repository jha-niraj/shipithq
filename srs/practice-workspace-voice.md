# Practice workspace and voice - the short specification

One page of what the DSA workspace is, what it calls, and what changes with
Sarvam AI. Written 2026-09-22. The planning and the task list are in
`plan/practice-workspace/`; this is the "what and why" for someone new.

## The screen

Three columns and a header, at `/practice/dsa/<slug>`:

| Column | What it holds |
|---|---|
| Problem | The statement, examples, constraints, requirements and hints. Body text is AA on the black ground |
| Editor | Monaco on black, the language picker, Run, and the test cases below it |
| Mentor | The five stages, the conversation for the open stage, and one composer |

The header carries the title, difficulty, mode, Run and Submit, and - in an exam -
the time left.

## The two modes

- **Assist** is the guided run: five stages, a mentor that asks rather than answers,
  and no clock.
- **Exam** is a timed attempt: a countdown from 20, 35 or 50 minutes by difficulty,
  worked out from the session's start time on the server so a reload agrees. Past
  zero the reading changes and nothing is taken away.

## What the workspace calls

| Thing | Where it runs | Notes |
|---|---|---|
| The mentor's reply | `/api/practice/mentor` | Streams. Never gives the solution |
| Run and Submit | the judge actions, then `apps/shipitworker` | C++ harness, hidden tests |
| Memory consolidation | `apps/worker`, a job | Reads the transcript after a stage moves |
| Speech to text | Sarvam AI (was ElevenLabs Scribe) | Streaming; words appear in the composer |
| Text to speech | Sarvam AI (was ElevenLabs) | Only for a turn the user spoke |

## The transcript

Turns are stored on the session row, each carrying the stage it belongs to. The
panel shows one stage at a time, so returning to Understand shows that stage's
conversation. Each stage opens with the mentor asking its question, which is a
stored turn like any other rather than a caption.

## Voice, with Sarvam

`SARVAM_API_KEY` is a server secret; the browser never sees it. Speech to text
streams, so partial words land in the composer while the user talks, and the user
presses send. The mentor speaks its reply only when the turn was spoken, with a
mute control in the panel header. A missing key makes voice unavailable and says
so; it never fails a turn.

The ElevenLabs code stays in the repo, unused, so the decision can be revisited
without rebuilding it.
