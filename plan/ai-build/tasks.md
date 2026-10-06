# AI build - tasks

Derived from `overview.md`. Build in order. AB-1 blocks everything; AB-2 to AB-5 are the spike
and prove the recording works before any product UI is built.

## The spike

### AB-1 Check Claude Code may run inside our product
- [x] Status: read 2026-10-04 (Claude, from Anthropic's public pages; a reading, not legal advice).
  **Finding.** code.claude.com/docs/en/legal-and-compliance, "Can customers offer Claude Code in
  their products?": running Claude Code "in hosted sandboxes or other agent infrastructure"
  requires the Commercial Terms and two conditions: "The Claude Code binary must not be
  modified" (no removing or restricting its sign-in methods), and "Customers may not pay for,
  resell, or intermediate Claude usage on their end users' behalf. Each end user must
  authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P
  inference provider credential." The same page: developers building products, "including
  those using the Agent SDK, should use API key authentication". Commercial Terms A.1
  (anthropic.com/legal/commercial-terms): the Services may be used "to power products and
  services Customer makes available to its own customers and end users"; D.4 forbids reselling
  the Services without approval.
  **So:** real Claude Code in our sandbox is fine when each user signs in with their own
  subscription or API key; the gateway that holds our key (AB-3 as first written) is the
  "intermediate" case and is out for real Claude Code. Paying for users' model calls is the
  Agent SDK path with our key. A company paying for its candidates with its own key is unclear:
  ask Anthropic sales before production.
- **Why:** the whole design rests on running Claude Code for third parties in our sandboxes.
- **Files:** this file and `overview.md` (Decisions).
- **Steps:** read Anthropic's current commercial and Claude Code terms on running Claude Code
  in a hosted product with an API key, for users who are not the key's owner; note the answer
  with links. If it is not allowed, switch the decision to the Agent SDK with our own chat pane
  and rewrite AB-7.
- **Done when:** the Decisions row says which, with the source quoted and linked.

### AB-2 The sandbox: one container per session with a terminal in the browser
- [x] Status: experiment built 2026-10-04 on local Docker, not Cloudflare (Niraj: "Local Docker first"). `apps/sandbox`: a container is up in under a second; the browser terminal runs bash and an unmodified Claude Code 2.1.288 as `candidate`. Reconnect reuses the same shell (scrollback replayed). Cloudflare Containers are a later step.
- **Why:** DoD 2.
- **Files:** new `apps/sandbox/` (`wrangler.jsonc`, `Dockerfile`, `src/index.ts`,
  `src/session-container.ts`, `container/server.mjs`); `apps/sandbox/README.md`.
- **Steps:** a Worker with a Durable Object per session owning a Cloudflare Container; the
  image has git, node, python, the runtimes the templates need, and Claude Code. The container
  server exposes a PTY over WebSocket (terminal), file list/read/write, and git. Session start
  clones a template into `/workspace`.
- **Edge cases:** the WebSocket drops and reconnects to the same PTY; two tabs on one session;
  the container cold start time (measure it: DoD 2 says under a minute).
- **Done when:** a local page with xterm.js opens a session, `claude --version` and `ls
  /workspace` work, and a reconnect lands on the same shell.

### AB-3 The model gateway
- [ ] Status: replaced for the real Claude Code path by AB-1's finding: we may not hold the key or pay for a user's usage, so there is no gateway; each user signs in with their own subscription or key in the terminal. A gateway returns only on the Agent SDK path.
- **Why:** DoD 3 and 6; the key must never be in the sandbox.
- **Files:** `apps/sandbox/src/gateway.ts` (or its own Worker), the session token issue/verify.
- **Steps:** an endpoint speaking the Anthropic API that Claude Code reaches through
  `ANTHROPIC_BASE_URL` with a per-session token; it adds the real key (ShipItHQ's, or the
  company's in AB-9), forwards, streams back, counts tokens and money per session, refuses past
  the cap, and logs each request and response as events (AB-5).
- **Edge cases:** streaming responses; a token used after the session ends (refused); the cap
  reached mid-turn (finish that response, refuse the next).
- **Done when:** in the spike, `env` and every file in the container show no key; Claude Code
  works through the gateway; a session past a test cap is refused. Record the real cost of a
  60-minute test build here, for the cap decision.

### AB-4 Events from hooks and edits
- [x] Status: experiment built 2026-10-04. Hooks in root-owned managed settings; prompts, tool calls (start and end), Claude's answers (read from the transcript on Stop), commands typed in the shell and editor saves (as diffs) become events. Verified with a scripted turn sent from inside the container; a real Claude turn waits on Niraj's sign-in.
- **Why:** DoD 4.
- **Files:** `apps/sandbox/container/claude-settings.json` (hooks), `container/hooks/*.mjs`,
  `container/watch.mjs`, the ingest route.
- **Steps:** Claude Code hooks on prompt submit, before and after each tool call, and on stop
  post JSON to the ingest endpoint with the session token; a file watcher records edits the
  candidate makes themselves (outside Claude's tool calls) as diffs; test runs are tagged.
- **Edge cases:** a hook failing must never block the candidate (fire and forget, retried);
  large outputs truncated with the size kept; the candidate deleting the hooks file (the
  gateway log still has prompts and responses; flag the session).
- **Done when:** a scripted session produces the full ordered event list from overview DoD 4.

### AB-5 Checkpoints and storage
- [x] Status: experiment built 2026-10-04 with files, not Postgres and R2: `events.jsonl` and a bare `repo.git` per session on the host, mounted at /root/remote so the candidate cannot read or write them (checked: a mount at /remote was readable and writable, because Docker Desktop ignores chmod on bind mounts). A commit per Claude turn is pushed there; killing the container and resuming restored the workspace at the last checkpoint, and the replay read the diff with the container gone.
- **Why:** DoD 5 and 10.
- **Files:** `packages/db/src/schema/ai-build.ts` (sessions, events, checkpoints), a migration,
  the ingest route, R2 under a private prefix.
- **Steps:** the Stop hook commits `/workspace` and uploads a git bundle per commit to R2;
  events go to Postgres keyed by session with a sequence number; resume restores the last
  checkpoint into a fresh sandbox.
- **Edge cases:** an empty commit (skip); a bundle upload failing (retry, keep the commit
  locally until it lands); event ordering across hooks and the watcher (server sequence).
- **Done when:** killing the container mid-session and resuming restores the last checkpoint,
  and every checkpoint is browsable from R2 with the container gone.

## The product

### AB-6 The round type
- [ ] Status: not started
- **Why:** DoD 1.
- **Files:** `packages/db/src/schema/jobmock.ts` (`interview_round_type` gains `AI_BUILD`),
  round config (template, brief, minutes, key source), `apps/hiring` round editor.
- **Done when:** a company adds an AI build round to a pipeline and it saves.

### AB-7 The candidate's workspace
- [ ] Status: not started
- **Why:** DoD 2 and 6.
- **Files:** `apps/main` round page, a workspace component (terminal, explorer and editor,
  brief, timer, submit).
- **Edge cases:** the timer runs out mid-turn (checkpoint and submit); paste events recorded;
  phone width says the round needs a larger screen.
- **Done when:** a test candidate takes a round start to submit.

### AB-8 Limits on the sandbox
- [ ] Status: not started
- **Why:** DoD 7.
- **Done when:** from the candidate's shell, a request to any host except the registries and
  the gateway fails; a fork bomb or a large file hits the caps without affecting other sessions.

### AB-9 The company's own key
- [ ] Status: not started
- **Why:** DoD 1 and 3.
- **Steps:** the key stored encrypted, shown masked, used only by the gateway.
- **Done when:** a round set to the company's key bills its key, and the key never appears in
  a response, a log line or the sandbox.

### AB-10 The replay
- [ ] Status: not started
- **Why:** DoD 8.
- **Files:** `apps/hiring` candidate attempt page.
- **Done when:** a recorded session replays in the same layout, scrubbing to any prompt shows
  the files at that checkpoint and the diff to the previous one.

### AB-11 Summary and rubric
- [ ] Status: not started
- **Why:** DoD 9.
- **Files:** `apps/worker` (a new job type: the five edits in `apps/worker/README.md`),
  `packages/ai/src/tasks.ts` (a task line for the judge's model).
- **Done when:** a submitted session gets a summary and a score; the company's own verdict
  overrides it.

### AB-12 End to end
- [ ] Status: not started
- **Done when:** overview DoD 1 to 10 checked on a real session, with the database and R2
  queried for 4, 5 and 10.
