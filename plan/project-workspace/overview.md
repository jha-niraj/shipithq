# Project workspace - overview

## What this module is

`/projects/<slug>/workspace`: a VS Code-style page where a user builds their
copy of a project **on the platform**, task by task, and sees it run.

Today the loop breaks at "here is a task, now go and build it somewhere else".
We cannot see the code, so we cannot check it, and the user is one paste away
from handing the task to an AI. The workspace closes that gap: the task brief,
the files, the running result and the check all live on one page.

It sits beside the sprint board (`/projects/<slug>/sprints`), which stays.

## Definition of done (v1)

1. **Layout.** Activity rail at the far left (Tasks, Quiz, Mock, Resources,
   Errors, Standup). Next to it, the sprint and task panel. In the centre, an
   editor with real tabs. On the right, the file explorer, as in Niraj's
   screenshot. A preview panel, and a bottom panel for Tests and Console.
   Panels resize and collapse; the layout is remembered.
2. **Tabs.** Open files are tabs: open, close, reorder, dirty dot, middle-click
   to close. The task brief opens as a read-only `TASK.md` tab rendered as
   markdown. The open tabs and the active tab are restored from `localStorage`
   per project, so a reload comes back to the same files.
3. **URL.** `?task=`, `?file=`, `?panel=quiz|mock|resources|errors|standup` and
   `?bottom=tests|console`, so a link reopens the same place (same rule as the
   board, PJ-17).
4. **Files.** Each project copy has its own files, stored server-side and
   saved as you type (debounced) with an explicit save state. A curated project
   starts from its starter repo.
5. **Runs in the browser.** The preview runs the user's code live (see Runtime).
6. **Checks.** Each task can carry tests. "Check task" runs them in the
   browser; all green marks the task done. An optional AI review of the change
   runs on the worker (charged, see Prices).
7. **Everything on the board works here too**: status, quiz, mock, resources,
   errors and standup, as panels, reusing the existing components.
8. **Only for a project the viewer owns** (their own, or their copy - PJ-18).
9. **Legible and fast.** Monochrome palette, no spinners, a skeleton that
   matches, usable down to a laptop. Below `lg` the page says the workspace
   needs a larger screen and links to the board.

## Decisions

Decided by Niraj on 2026-09-23.

- **Browser runtime first; containers later.** v1 runs code in the tab. Server
  containers (reusing the Cloudflare Container that `apps/shipitworker` owns)
  come in a later phase for stacks the browser cannot run.
- **A starter repo per project.** Every curated project ships a small runnable
  skeleton. A generated project gets one written by the worker (later task).
- **Checks are tests plus an optional AI review.**
- **The route is `/projects/<slug>/workspace`**, beside the board.
- **State in the URL; open tabs in `localStorage`.**

### Runtime engine: Sandpack (Niraj, 2026-09-23)

| Engine | Runs | Cost and constraints |
|---|---|---|
| **Sandpack** (recommended for v1) | React, TypeScript and plain JS in a bundler in the tab; Jest tests in the tab (`SandpackTests`) | Open source. Bundler hosted by CodeSandbox by default, self-hostable. Frontend only |
| WebContainers | Real Node in the tab: npm, dev servers, Express | **Commercial licence required** for a paid product (`configureAPIKey`); the page needs `COOP`/`COEP` isolation headers; full support is Chromium-only |
| Server containers | Any stack, with a real database | Per-minute cost, cold starts, isolation work |

### What v1 can run, honestly

Checked against the 10 curated projects on 2026-09-23. Only **two** run fully
in a browser bundler:

| Project | Stack | v1 |
|---|---|---|
| habit-tracker-weekly-review | React, TypeScript, localStorage | Yes |
| markdown-notes-with-search | React, TypeScript, IndexedDB, Web Workers | Yes |
| personal-finance-tracker | React, Node, PostgreSQL | Frontend only |
| job-board-with-matching, expense-splitter, realtime-collaboration-board | Next.js + PostgreSQL | No |
| url-shortener-with-analytics | Node, Redis, PostgreSQL | No |
| observability-mini-stack, rate-limiter-service | Go | No |
| offline-first-delivery-app | React Native | No |

A project whose stack v1 cannot run shows the workspace's editor and tasks,
with the preview panel explaining that running this stack is coming, rather
than a broken preview. Widening this is the containers phase.

### Decided 2026-09-24, before wiring

- **The workspace replaces the board.** `/projects/<slug>/sprints`, `/tasks`,
  `/quiz` and `/aimock` are deleted, with redirects into the workspace (the
  quiz and mock to their tabs). The project page is the redesign.
- **Bundler: CodeSandbox's hosted Sandpack bundler.** Self-hosting later if
  needed.
- **Check task: all green marks the task Done automatically**, through the one
  status action, so progress and gates move together. A failing run never
  un-does a task already Done.
- **Sprint quiz and sprint mock open when every task in that sprint is Done.**
  The final quiz and mock keep 50% and 75% of all tasks (`gates.ts`).
- **Generated projects get an AI-written starter and per-task tests**, written
  by a worker job (Durable Object) with strict limits - see WS-16.
- **Frontend only, for now.** Curated projects the browser cannot run are
  hidden from the catalogue until containers exist; nothing is deleted.
- **Project AI, first version:** add a task to a sprint, plan a new sprint,
  answer questions about the project's code (read-only), break a task into
  steps. It asks when something is unclear (which sprint? what focus?) and
  confirms before it writes anything.
- **Mock interviews are text plus dictation**, like the practice DSA page:
  questions as text, answers typed or dictated through Sarvam.

## Prices

| Thing | Number | Note |
|---|---|---|
| Running code, running tests | 0 | Runs in the user's browser; nothing of ours is spent |
| AI review of a task's change | **5 credits** | Decided by Niraj 2026-09-23. A model call on the worker; held on dispatch, refunded on failure |
| Sprint quiz | **25 credits** | Decided 2026-09-24: today's quiz price. Generated once per sprint; held, refunded on failure |
| Sprint mock interview | **30 credits per session** | Decided 2026-09-24: today's mock price. Refunded if the session never starts |
| Final quiz / final mock | unchanged | 25 and 30, as in `plan/projects/overview.md` |
| Project AI: questions, steps | **0** | Decided 2026-09-24 |
| Project AI: add a task, plan a sprint | **5 credits** | Decided 2026-09-24. Charged only when it actually writes |
| Starter and tests for a generated project | **+15 credits** | Decided 2026-09-24. On top of generation: public 28, private 40, still +30 with the assessment. Held and refunded with the rest of generation (WS-16) |

## Out of scope for v1

Terminals, git, npm installs of arbitrary packages beyond what the bundler
resolves, collaboration, server-side runtimes.
