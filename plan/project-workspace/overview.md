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

## Prices

| Thing | Number | Note |
|---|---|---|
| Running code, running tests | 0 | Runs in the user's browser; nothing of ours is spent |
| AI review of a task's change | **5 credits** | Decided by Niraj 2026-09-23. A model call on the worker; held on dispatch, refunded on failure |

## Out of scope for v1

Terminals, git, npm installs of arbitrary packages beyond what the bundler
resolves, collaboration, server-side runtimes.
