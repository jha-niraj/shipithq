# sandbox - the AI build experiment

An experiment for `plan/ai-build`, not a product. It shows that ShipItHQ can run Claude Code on
the platform: one Docker container per session, a terminal in the browser, a git repo for the
code, and a recording of everything, replayed after the container is gone.

## Run it

```bash
cd apps/sandbox
pnpm image      # build the container image (first time, and after changing image/)
pnpm start      # http://localhost:7070
```

Docker must be running. Sessions are stored in `apps/sandbox/.data/sessions/<id>/`
(gitignored): `events.jsonl` (the recording), `repo.git` (the code, one commit per Claude
turn), `meta.json`.

## How it fits together

```
browser (index.html)  --ws /s/<id>/pty-->  host server (src/server.ts, :7070)  --ws-->  container agent (:8080)
                      --/s/<id>/agent/*-->                                     --http-->   files, git, hooks
replay.html  --/api/sessions/<id>/{events,commits,tree,file}-->  .data/sessions/<id>  (no container needed)
```

Inside the container (`image/`):

- Claude Code, installed with Anthropic's installer and never modified, runs as `candidate`.
- `managed-settings.json` (root-owned, at `/etc/claude-code/`) adds hooks for SessionStart,
  UserPromptSubmit, PreToolUse, PostToolUse and Stop; each calls `agent/hook.mjs`, which hands
  the JSON to the agent and never blocks Claude.
- `agent/server.mjs` runs as root: the terminal (a bash PTY as `candidate`), the files, the
  recording, and a git commit after every Claude turn, pushed to the host's `repo.git`.
- The session folder is mounted at `/root/remote`, inside root's home, so the candidate's shell
  cannot read or change the recording or the stored repo.
- `bashrc.sh` records each command the candidate types (Claude's own arrive through hooks).

## Signing in to Claude

Each person signs in with their own Claude subscription or API key, inside the session's
terminal. ShipItHQ never sees, stores or pays for those credentials: that is what Claude Code's
terms require when it runs in someone else's product (`plan/ai-build/tasks.md`, AB-1). The
login lives in the container and is deleted with it, so each new session signs in again.

## Known limits (experiment)

- No network limits yet (AB-8): the container can reach the internet.
- The candidate's terminal output is not recorded, only the commands they type, Claude's
  prompts, tool calls and answers, their edits in the editor, and the checkpoints. The
  terminal is where the Claude sign-in happens, and recording it would capture that.
- Edits made with an editor inside the terminal (vim) appear in the next checkpoint, not as
  their own event.
- One host, local Docker. Cloudflare Containers come after the experiment.
