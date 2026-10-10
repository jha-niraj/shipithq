# AI build - a hiring round where the candidate builds with Claude Code, recorded

**Status: DIRECTION DECIDED (2026-10-03, Niraj). Plan awaiting approval; nothing built.**
Tasks: `tasks.md` (AB-*).

**PARKED (2026-10-11, Niraj)** until the voice and hiring agents connect end to end and
Pathfinder is done. What exists: the local spike in `apps/sandbox` (AB-2, AB-4, AB-5).
Decisions taken before parking, to fold into this doc and `tasks.md` when it resumes:

- **Our own agent replaces Claude Code in the terminal.** An OpenAI agent (model via
  `modelFor`), run by ShipItHQ, with Plan and Agent modes and tools over the container
  (read, write and search files, run commands, diff). It removes AB-1's limit (we may not pay
  for or intermediate a user's Claude Code usage), lets us meter and cap spend, and records
  every prompt and tool call natively, which is what scoring "AI fluency" needs. The terminal
  stays plain bash.
- **First version is a student practice loop, not an employer round.** One challenge repo,
  brief, workspace (editor, terminal, agent pane, diff), a review of the diff, a scorecard on
  the profile. Voice and browser preview come after. Reference: HackerRank Chakra (GA
  2026-10-05) sells the employer side; the gap is repeated practice tied to a student profile.
- **v1 container: local Docker**, extending `apps/sandbox`; Cloudflare Containers later.
- **Agent turns run as worker jobs, streamed** to the pane. A multi-tool turn regularly
  passes 45s (Chakra's took 44.7s and 48.0s), so it falls on the worker side of the
  CLAUDE.md inline/worker rule.

## What the module is

A new kind of hiring round, beside aptitude, DSA, system design and the voice rounds; it
replaces none of them. The candidate gets a starter repository and a task, and builds it in
the browser in a three-pane workspace: a real terminal running Claude Code (or plain bash),
the files with an editor, and the brief. Everything that happens is recorded as events, not
video: each prompt, what Claude answered, every file change as a diff, every command and its
output, the candidate's own edits, and a git checkpoint after every Claude turn. The company
reviews the attempt as a replay in the same layout, scrubbing a timeline of prompts and
checkpoints, with numbers (prompts, tokens, cost, time to first passing test, how often tests
were run) and an AI-written summary against a rubric.

Why (Niraj, 2026-10-03): engineering work now runs through AI agents; companies want people who
can direct an agent, review what it wrote and get things done. The round shows how someone
works with AI, which no other round does.

It spans: candidates in `apps/main`; companies in `apps/hiring` (round setup, replay); a new
sandbox app (`apps/sandbox`, a Worker with a Cloudflare Container per session) that runs the
workspace; a model gateway that holds the API key; and `apps/worker` for the summary judge.

## Definition of done (V1)

1. A company can add an **AI build** round to a pipeline: pick a starter repo template, write or
   pick the brief, set the time limit, and choose whose Claude key pays (ShipItHQ's or its own).
2. A candidate starting the round gets a fresh sandbox with the starter repo in `/workspace`,
   ready in under a minute, with a terminal where `claude` and bash both work, a file tree and
   an editor, the brief, and a timer.
3. **No secret is inside the sandbox.** The Claude key, database URLs and storage credentials
   are not readable from the candidate's shell. Claude Code talks to the model through the
   gateway with a per-session token that stops working when the session ends.
4. Every prompt, every model response, every tool call (edits as diffs, commands with output and
   exit code), every edit the candidate makes by hand, and every test run is stored as an event
   with a timestamp, in order, for that session.
5. After every Claude turn and on submit, the workspace is committed and the commit stored
   outside the sandbox; the submitted code survives the sandbox being destroyed.
6. A session cannot spend past its token/money cap or run past its time limit; at the limit the
   work is checkpointed and submitted.
7. The sandbox can reach package registries and the gateway, nothing else; CPU, memory and disk
   are capped; it is destroyed after submit or timeout.
8. The company's replay shows the session in the same three-pane layout: a timeline with a mark
   per prompt, the files at any checkpoint, the diff between any two, the terminal output, and
   the numbers: prompts, tokens, cost, time to first passing test, and how often tests ran.
9. A summary and rubric score are produced by a worker job after submit and shown on the replay;
   the company can disagree and its own verdict is what counts.
10. A sandbox that dies mid-session loses at most the work since the last checkpoint, and the
    candidate can resume from that checkpoint once.

## Out of scope (V1)

- Student practice mode inside projects (V2, same infrastructure, paid in credits).
- The explain-it round: a mock interview about the candidate's own session (V2; the strongest
  follow-up, it reuses the mock pieces).
- Codex or other agents beside Claude Code.
- Video recording of the screen.
- Companies bringing their own private repositories (V1 uses ShipItHQ-authored templates).
- Proctoring beyond paste events and focus changes.
- Anything in `apps/shipitworker` (CLAUDE.md: it is the short code executor; leave it alone).

## Decisions

| Decision | Choice | Who, when |
|---|---|---|
| Who gets it first | Hiring round first; student practice is V2 on the same system | Niraj, 2026-10-03 |
| How the candidate drives the AI | Real Claude Code in a terminal, captured by hooks and the gateway; the Agent SDK with our own chat pane only if Claude Code's terms rule this out (AB-1) | Niraj, 2026-10-03 |
| What is recorded | Events, not video; replay in the same layout | Niraj, 2026-10-03 |
| Where the code lives | A git repo in the sandbox, committed per Claude turn, each commit stored in R2; Postgres holds events and commit ids, never file trees | proposed, 2026-10-03 |
| Where the key lives | Only in the gateway; the sandbox gets `ANTHROPIC_BASE_URL` and a per-session token | proposed, 2026-10-03 |
| Session length | **open** (60 minutes proposed) | Niraj to decide |
| Spend cap per session | **open**; set from the spike's measured cost (AB-3) | Niraj to decide |
| Which model | **open**; through `@repo/ai` task config, never a literal at a call site | Niraj to decide |
| Price to the company | **open** | Niraj to decide |
