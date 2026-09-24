# Projects, V1: the plan on ShipItHQ, the code on the learner's machine

**Status: DECIDED (2026-09-24, Niraj), revised the same day.** Tasks:
`tasks.md` (RP-*). Starter code and template repos are **parked** (Niraj:
"not worry about the starter code for now"); the GitHub-PR proposal was
rejected earlier. Both are kept below as the research record.

## What the module is

A learner enrols in a project and works through it on their own machine, in
their own editor. ShipItHQ holds everything else: **Sprint 0, a hand-written
setup** that takes them from an empty folder to a running app ready for task 1;
the sprints and tasks; the Project AI, resources, errors and standups; and the
**sprint quizzes and mock interviews**, then the final quiz and mock, which
test that they understood what they built. A task is Done when the learner
ticks it and writes a short note on what they built.

## Definition of done (V1)

1. Every seeded project is visible in the catalogue again (no browser-only
   filter), and Generate can make frontend, backend and full-stack projects.
2. Every project's first sprint is **Sprint 0 - Setup**: tickable tasks from
   an empty folder to a running app, with exact commands and what you should
   see. The 10 seeded projects have hand-written ones that were followed on a
   clean machine and work; generated projects get one written by the AI.
3. No sprint-1 task repeats Sprint 0's work.
4. Marking a task Done asks for a 1-3 line note on what was built or decided;
   the note is kept, re-editable, and shown on the task.
5. The workspace is the control room: Task, AI, Resources, Errors, Standup,
   quiz and mock tabs. No editor, explorer or preview unless the
   `WORKSPACE_EDITOR` flag is on.
6. When all of a sprint's tasks are Done (Sprint 0 excluded), its quiz
   (25 credits) and its mock interview (30 credits a session) open; both use
   the sprint's tasks AND the learner's notes.
7. At 50% the final quiz, at 75% the final mock, both as workspace tabs and
   both run as worker jobs.

## Out of scope (V1)

- Starter code, template repos, uploads, our tests on learner code, AI code
  review (parked: see research record; revisit after V1).
- Coding in the browser (the built editor stays in the code, switched off).
- Deleting anything built.

## Decisions (Niraj, 2026-09-24)

| Decision | Choice |
|---|---|
| Where learners code and preview | Their own machine |
| Starter code / repos | Parked for V1 |
| Catalogue | All seeded projects back; Generate makes any type again |
| Setup | Sprint 0 of every project, tickable, counts in progress |
| When a task is Done | The learner ticks it and writes a short note (free); 10-500 characters, required for sprint tasks, optional for Setup (`apps/main/lib/projects/task-notes.ts`) |
| Sprint quiz / mock | 25 credits / 30 credits a session (from `plan/project-workspace/overview.md` prices) |
| Final quiz / mock gates | 50% / 75%, unchanged |
| Editor, explorer, preview | Hidden behind a flag, not deleted (default taken; question left unanswered) |
| Package manager in Setup | npm |
| Postgres in Setup | Neon (free plan), a database per project; more options later |
| ORM | The learner picks Prisma (pinned to 7) or Drizzle; tasks stay ORM-neutral |
| Redis in Setup | Upstash (free plan), following the hosted choice for Postgres |
| ClickHouse in Setup | Local, through ClickHouse's `clickhousectl` (no free hosted plan); WSL2 on Windows |

---

# Research record (the rejected GitHub-PR proposal and what led here)

## The idea in one paragraph

Every project a learner adopts becomes **a real Git repository with a
backlog**. The sprints and tasks we already have become **issues** in that
repo. The learner clones it, works locally in their own editor, pushes a
branch, and opens a **pull request** that closes the issue. Automated **checks**
run on the PR (the task's tests, the type check, the build), an **AI reviewer**
leaves a code review like a senior engineer would, and **merging** marks the
task done on ShipItHQ, moving progress and the quiz and mock gates. The
browser workspace stays, as one more way to work on the SAME repository.

## Why this is better than the browser-only workspace

- **It is the real job.** Branches, commits, PRs, CI, code review, issue
  tracking - the workflow every company uses, practised on every task.
- **Their tools, their machine.** What learners asked for: VS Code or Cursor
  locally, no new editor to learn, no "does this run in the browser" limit -
  so the 8 hidden server projects (Node, Postgres, Go) come back, because the
  code runs on the learner's machine and in CI, not in our tab.
- **Proof that lasts.** Each finished project is a public repo with a clean PR
  history - exactly what the resume and jobs modules want to point at.
- **Less for us to build and run.** No IDE to perfect; CI on public repos runs
  on GitHub for free, with no minute cap (verified 2026-09-24).

## How it would work, step by step

1. **Adopt.** "Start this project" creates the learner's repository with the
   starter code and one issue per task (labels: sprint, type). They are added
   as a collaborator and get the clone command.
2. **Pick an issue.** The project page and the issue say what to build and
   what "done" means - the brief and criteria we already write.
3. **Work locally.** `git checkout -b task/12-dark-mode`, code, run the tests
   locally (`npm test`), commit, push, open a PR that says "Closes #12".
4. **Checks run on the PR.** The repo's CI (tests, type check, build) and a
   ShipItHQ check that runs that task's tests. Red means not done yet.
5. **Review.** An AI review is posted on the PR: what is good, what to change,
   questions a reviewer would ask. The learner can push fixes; it re-reviews.
6. **Merge = done.** Merging closes the issue; ShipItHQ marks the task done.
   Sprint quiz and mock, final quiz and mock, standups: unchanged.

## Beyond "build the feature": tickets like a real team's

- **Bug tickets.** A seeded bug with a failing test that reproduces it: find it,
  fix it, keep the test green.
- **Review a PR.** The AI opens a PR with subtle problems; the learner reviews
  it on GitHub. Reviewing is half the job and nobody teaches it.
- **Refactors and chores.** "Move storage behind one module", "add CI".
- **The Project AI** (already built) files new issues instead of plan rows.

## What we already have that this reuses

| Exists today | Becomes |
|---|---|
| Sprints, tasks, briefs, criteria | Issues, labels, milestones |
| Starter repos and per-task tests (WS-2, WS-5) | The repo's initial commit and its checks |
| One copy per learner (PJ-18) | One repository per learner |
| Worker jobs (Durable Objects) | Repo creation, issue sync, AI PR review |
| Code executor container (`apps/shipitworker`) | Running a task's tests for the ShipItHQ check |
| Sign in with GitHub (Better Auth) | Linking the learner's GitHub account |
| Project AI, quiz, mock, standups | Unchanged, pointed at the repo |
| Browser workspace (WS-3/4/5) | An optional editor on the same repo |

## What GitHub allows (checked 2026-09-24)

- **A GitHub App cannot create a repository in a user's personal account**;
  it can in an organization. Creating from a template on a user's behalf via
  the API is unreliable (GitHub community threads). So the choice is:
  - **Repos in a ShipItHQ organization**, learner added as collaborator - full
    automation, the GitHub Classroom model; the repo can be transferred to the
    learner when they finish.
  - **Repos in the learner's own account**, created by them ("Use this
    template") and then connected by installing our App on that one repo.
- **CI is free on public repositories** (no minute cap on standard runners);
  private repos spend the owner's 2,000 free minutes a month.
- **Checks and PR reviews** need a GitHub App (Checks API).

## What other platforms learned (researched 2026-09-24)

| Platform | Where code lives | How it is checked | Lesson for us |
|---|---|---|---|
| CodeCrafters | Learner's machine; CodeCrafters' own git remote | `git push`, tests in their Firecracker VMs, ~2.5s, logs back in the terminal | Local + real git is its most-praised part. It **paused new challenges on 2026-05-22**: people loved it but would not pay, and AI coding agents made it worse |
| GitHub Classroom / Skills | Repo per learner, from a template | GitHub Actions autograding; a bot moves the steps on; feedback as a PR | The most company-like flow, free to host. Pains: slow repo creation at scale, Actions sometimes skipped, "wait 20s and refresh", minutes on private repos |
| Exercism | Local via CLI, or the web editor | Local `exercism test`; server re-runs in Docker, 20s cap | **Added the web editor because the CLI scared beginners.** Human mentor queues grew to weeks |
| Boot.dev, Hyperskill | Local, CLI or IDE plugin | Local checks, signed submit | Tooling friction (Go/WSL, plugin breakage) is the top pain |
| Frontend Mentor, devChallenges | Learner's GitHub + their own deploy | Repo URL + live URL; automated audits; peer review | Automated reports work; peer review is unreliable |
| Hatchways | GitHub repo with a codebase and a ticket | Submit a PR, or review someone's PR | The "work-simulated" idea, but for hiring, not learning |
| CodeRabbit | Any public repo | Free AI review on PRs | AI PR review is already normal on GitHub; learners use it as a "free mentor" |

**What the research says, taken together:**
1. **Nobody sells this as a learning product:** a real backlog, tickets and AI-reviewed PRs on the learner's own repo. Hatchways does it for hiring, GitHub Skills for git basics. That is the gap.
2. **Automated feedback beats human review every time**; human queues are the bottleneck everywhere.
3. **Everyone who started local-only added a browser path later.** Keep the workspace, don't remove it.
4. **Hosting and tests are cheap; getting paid is hard** (CodeCrafters). Value has to be what an AI agent cannot hand you: the workflow, the reviewed PR history, and interviews about YOUR code.

## Niraj's direction (2026-09-24) - supersedes the GitHub recommendation

Not open source (no public repos), and no CI/CD to run this early. Instead:
**one codebase per project with an issue board** (features, bugs, refactors).
A learner enrols, **picks any issue** - it is assigned to them, and anyone else
can pick the same one; everyone works on their own copy - codes **on the
platform** in the workspace, and **submits**. The open question he named:
**how the learner previews what they are building.**

**Refined the same day: no PR loop.** Pick an issue, solve it in the
workspace, **Submit**; the platform runs the checks, then **approves or sends
it back with feedback**. Approval = tests + AI review (Niraj's choice).

## Version 1 vs version 2 (Niraj, 2026-09-24)

- **V1: code locally, everything else on the platform.** The workspace keeps
  Task, Resources, Project AI, sprint quiz and mock, final quiz and mock,
  standups, errors - everything **except the code**. The learner takes the
  code to their own machine, works in their own editor, previews with
  `npm run dev`, runs `npm test`, and brings the work back to submit.
- **V2: code on the platform too** - the in-tab editor and the full-stack
  preview below, as a second way to work on the same copy.

Nothing built is deleted: the editor, explorer and preview are switched off in
V1, not removed.

### V1: getting the code, and bringing it back

**Getting it (Niraj, 2026-09-24): a GitHub repo per project.** Each
project's starter lives in a ShipItHQ organization repo marked as a
**template**. The learner either `git clone`s it, or presses **"Use this
template"** to get their own repo, which they can make **private** (GitHub
lets you choose visibility for a repo made from a template). A **fork** of a
public repo is always public and cannot be made private, so the page offers
Clone and Use this template, not Fork. Only the starter is public; learners'
work is not.

**Preview.** On their machine: `npm run dev`. Nothing for us to host.

**Submitting a task** (the part to design):

1. "Submit task" in the Task tab, then **pick the project folder** (browser
   folder picker). `node_modules`, `.git`, `dist` and anything past the
   existing limits (200KB a file, 5MB, 300 files) are skipped before upload.
2. We show what changed against their copy ("4 files changed, 1 added") and
   they confirm. The upload becomes their copy's files, so V2 later continues
   from exactly this code.
3. **Checks:** the task's tests - **our** copy of them, not the learner's,
   so editing a test to pass does not help - run on the uploaded code in
   the browser runner WS-5 already built. Green, then the AI review job reads
   the change and the task, and answers **Approved** or **Changes needed**
   with feedback on files and lines.
4. Approved = task done, progress moves, quiz and mock gates open as today.
   Every attempt and its feedback stays on the task.
5. Bonus that comes free: the uploaded app can be shown running on the
   platform (the preview pane already runs Vite projects), so the learner
   sees "your submission, live".

**Honest limit:** local code means an AI agent can write it for them, and
browser-run checks can be tampered with. The defence is the sprint and final
mock interviews asking about THEIR submitted code, and a server re-run of
the tests later if certificates or hiring start depending on it.

## Version 2: the flow on the platform

1. **Issue board** in the workspace: the project's tasks as issues, each typed
   feature / bug / refactor. Any enrolled learner can pick any open issue; each
   works in their own copy, so two people on the same issue never collide.
2. **Solve it** in the workspace, with the live preview and the issue's
   visible tests running as you type.
3. **Submit.** A submission freezes the files at that moment.
4. **Checks run on the platform** (below). Result: **Approved** (issue done,
   progress moves) or **Changes needed** with feedback. Fix and submit again;
   every attempt and its feedback is kept on the issue.

## Preview: the whole app runs in the learner's tab

**Proved headless on 2026-09-24**, in the same free Sandpack client bundler
the workspace uses: a React page called `fetch("/api/todos")`, a **Hono** route
answered it, the route queried a real **Postgres** (PGlite, Postgres compiled
to WASM), and the page rendered the row. Postgres booted in 646ms.

So a project is a **full-stack app with no server of ours in it**:

```
src/         React frontend             (preview pane, as today)
server/      Hono API routes            (runs in the tab)
db/          schema.sql, migrations     (real Postgres, in the tab)
```

A five-line fetch shim in the starter routes `/api/*` to the Hono app instead of
the network. The learner writes real routes, real SQL and real migrations,
and it is the code that would deploy to Cloudflare Workers or Node unchanged
(Hono runs on both). Data persists in the browser (IndexedDB), with a "Reset
database" button.

Costs and limits:
- **Free**: no licence (Hono MIT, PGlite Apache-2.0/PostgreSQL), no servers.
- First load downloads Postgres (~17MB raw, less compressed; cached after).
  PGlite's files must be loaded from the CDN explicitly - the bundler cannot
  find them on its own (the first try failed on exactly that).
- **What cannot run:** Go, Python, Redis, background workers, websockets to a
  real server. Those stay hidden (as the 8 server projects are today) until
  server containers are worth paying for.

| Tier | What runs | Cost | Status |
|---|---|---|---|
| **In the tab (chosen direction)** | React + Hono API + Postgres | Free | Proved |
| Node-in-browser | Express/Next servers | WebContainers / Nodebox commercial licence | Not needed |
| Server containers | Any stack | Per-minute, cold starts | Later, if ever |

## Checks: on submit, on our side

While working, the issue's **visible tests** run in the tab (as WS-5 does) -
instant feedback, but a browser result can be faked, so it never decides
"done". On Submit, a worker job does, in order:

1. **Tests, re-run by us.** The submitted files plus the issue's visible AND
   **hidden** tests (edge cases the learner cannot see, like LeetCode's) run
   in a container we own, using Node + vitest. The container is the same
   Cloudflare Containers product as `apps/shipitworker`, but its own class in
   `apps/worker` - shipitworker stays untouched. PGlite and Hono run in Node
   too, so API and SQL tests work the same there.
2. **Type check** of the submitted files.
3. **AI review** (only if 1 and 2 pass): reads the diff since the learner
   picked up the issue, the issue, and the test results; returns Approved or
   Changes needed, with feedback pinned to files and lines.

Pass/fail and the feedback land on the issue; the workspace shows them in the
Task tab.
Cost per submit: seconds of container time plus one AI call. Price is a
decision to make (today's AI review price is 5 credits).

## Open decisions

- None blocking. Starter code and repos (GitHub org `thecoderzhq`, token
  `GITHUB_STARTERS_TOKEN`) are parked, recorded here for when they return.
