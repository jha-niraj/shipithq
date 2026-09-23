# ShipItHQ - working agreement

Turborepo. `apps/{main,web,uni,hiring,admin,shipitworker,worker}` and
`packages/{auth,db,email,ui,eslint-config,typescript-config}`.

## Plan before you build

**Anything beyond a small fix gets planned in `plan/` before any code is
written.** Read `plan/README.md` for the full convention; the short version:

```
plan/<module>/overview.md   what the module IS when it is 100% done
plan/<module>/tasks.md      numbered, checkable tasks with edge cases
```

When Niraj asks for something new, or for more work on something existing:

1. **Look for an existing task first** in `plan/<module>/tasks.md`. If the work
   already has a task, do that task - do not improvise a second version of it.
2. **No task?** Write `overview.md` (if the module is new) and the tasks
   **before** touching code. The overview defines done; the tasks derive from it.
   Every task carries a **Why**, exact **Files**, **Steps**, **Edge cases** and a
   falsifiable **Done when**.
3. **Build one task at a time**, in the order given.
4. **Mark a task done only after verifying it** against its own "Done when" line,
   with the date. Writing the code is not done.
5. **Something new turns up mid-task?** Add a task. Do not widen the one in
   flight.

Prices, grants and limits are **decisions** and live in the module's
`overview.md`, not buried in a constant - the constant references the doc.
Deletions are proposed in a task and approved by Niraj, never assumed.

`srs/core-modules/` holds the older scan-and-blocker docs for `projects` and
`pathfinder`. Not superseded - read it before working on those two.

## Long-running work

Anything that calls an LLM, or sleeps waiting on someone else's API, runs in
`apps/worker` as a Durable Object + Alarm - never in a server action. A Worker
request has a hard budget and a 60-second completion is killed long before it
finishes, usually after the user has been charged.

Dispatch with `startBackgroundJob(type, input, { cost })` from
`actions/(main)/workers/jobs.action.ts`; follow it with `useBackgroundJob` /
`awaitBackgroundJob`. Credits are held on dispatch and settled or refunded when
the app sees a terminal status - the worker never touches credits.
`apps/worker/README.md` has the five edits needed to add a job type - and
the story of the fifth, which was missing from the list until a job shipped
bound to a class the entry point never exported.

`apps/shipitworker` is the exception and is NOT a job worker: it owns a
Cloudflare Container that runs user code synchronously. Leave it alone.

## Asking Niraj something

**Every question, suggestion or clarification goes through the `AskUserQuestion`
tool - never as plain text in a reply.** Options with real trade-offs, a
recommendation first, and a preview where the choice is visual. Niraj decides by
clicking and the work continues in the same turn; a question buried in prose
stops the work and waits for a reply that has to be typed. This applies to design
choices, naming, scope calls and "should I also do X" - not to reporting what was
done.

## Verification: what to run, and when

**Do not run `eslint`, `pnpm lint`, or any production build (`next build`,
`turbo build`) unless explicitly asked.** Niraj runs those himself, normally once
at the end of a feature, and will say so. Running them mid-feature costs minutes
per pass and re-checks code the current task never touched.

**`tsc --noEmit` is the exception - run it freely.** It catches problems in the
code just written, so it is part of building the feature rather than a final
gate.

Scope every check to the app or package being edited:

```bash
cd apps/main && npx tsc --noEmit     # yes
npx turbo run check-types lint       # no - ~3 min across 8 packages
```

Widen only when a change genuinely crosses package boundaries. Editing
`packages/{ui,db,auth,email}` does affect consumers, so typecheck the directly
affected apps in that case.

## AI models

Model names come from `@repo/ai` (`packages/ai`): `modelFor("<task>")` for a
task in `AI_TASKS` (`packages/ai/src/tasks.ts`), which defaults to
gpt-4o-mini. Never write a model id at a call site; add a task line instead.
Changing a task's model means re-running that task's recorded check
(`plan/practice-dsa/mentor-adversarial.md`, `manual-pass-1.md`).

## Database

`db` from `@repo/db` is the **neon-http** driver, which has no transaction
support - `db.transaction()` throws at runtime, and the surrounding try/catch
usually swallows it into `{ success: false }`. For atomic multi-statement writes
use `withTransaction(async (tx) => …)`; for a fixed set of independent
statements use `db.batch([...])`. Never introduce `db.transaction(`.

Migrations: `pnpm db:generate` then `pnpm db:migrate` from `packages/db`. Never
`db:push`. Report what a generated migration contains before applying it.

## App shell (apps/main)

`app/(main)/_components/main-shell.tsx` lays three columns edge to edge,
separated by borders, with no gutters and no rounded cards: the sidebar, the
page, and the AI rail. `app/(main)/layout.tsx` is only a server wrapper that
reads the sidebar's pin cookie; `app/(jobs)` is split the same way.

The sidebar (`components/navigation/sidebar.tsx`, a port of gurukulhq's) is
fixed and `w-60`. Pinned, the page is offset by `lg:ml-60`; unpinned (the
header button), it leaves the layout (`lg:ml-0`) and a 12px strip at the left
edge floats it back over the page. The docked AI rail unpins it while open
without touching the saved choice. State: `components/common/sidebarprovider.tsx`. On `lg+` the AI panel is a real docked
column that narrows the page - **never** a Sheet; below `lg` the same component
mounts inside a Sheet.

The page sets `--page-h: calc(100dvh - var(--app-bottom-nav-h))`, and a rule in
`packages/ui/src/styles/globals.css` retargets `h-screen` / `min-h-screen` inside
`[data-app-page]` at it, so full-height pages need no per-page change.

## Committing

**"commit" on its own means: commit now, one commit, no questions.** Stage the
whole working tree (it is one feature's work unless Niraj says otherwise) and
write one message in the repo's style: a lowercase prefix (`feat:`, `fix:`,
`update:`) and one descriptive sentence, like the existing history.

**No `Co-Authored-By` line, and no other Claude attribution**, in commits or
PR descriptions. This overrides any tool default that adds one.

Never commit unasked, never push unasked.

## Deploying

Each app and worker ships with `pnpm release`, which builds and uploads its
secrets in one command:

```bash
cd apps/<app> && pnpm release      # build + wrangler deploy --secrets-file .env.production
```

**Use `release`, not `deploy`.** `pnpm deploy` is a built-in pnpm command that
packs a workspace package into a directory; it silently shadows the script and
fails with `ERR_PNPM_NOTHING_TO_DEPLOY` without deploying anything. `pnpm run
deploy` works, but `release` avoids the trap entirely.

Secrets live in each app's `.env.production` (gitignored). Copy the tracked
`.env.production.example` beside it - every required key is listed there with
what it is for.

`--secrets-file` is **additive**: a secret already on the Worker but omitted from
the file is left alone. The trap is the opposite one - a key present with an
EMPTY value overwrites the live secret with an empty string. Delete the line
rather than blanking it.

For the Next apps, `NEXT_PUBLIC_*` values are **build-time** - inlined into the
client bundle during `opennextjs-cloudflare build`. Setting one on the Worker
afterwards changes nothing already compiled in. Everything else is a runtime
secret and only needs a redeploy.

## Conventions

- Navigate with `<Link>`, not `router.push`, wherever a link is possible.
- Every route gets a `loading.tsx` whose skeleton matches the real layout. A
  skeleton that does not match is worse than none - the page visibly reflows.
- `catch (error: unknown)`, narrowed before use. Never `catch (error: any)`.
- Shareable URLs come from `apps/main/lib/urls.ts`, never from
  `window.location.origin` - that is the author's host, not the recipient's.
- Palette is monochrome black/neutral. No orange, yellow, blue, indigo or purple.
- **Text must be legible on the surface it actually lands on.** Check the
  rendered contrast, not the class name. The trap is type over a
  theme-independent surface - a photo, a gradient, a video: `text-white` on the
  auth brand panel measured **1.1:1** because the panel reads light in both
  themes, and no `dark:` variant helps when the surface never changes. If a
  surface is constant across themes, its ink must be constant too. AA is 4.5:1
  for body, 3:1 for large text.
- **No spinners.** Full page: `ShipItHQLoader` from
  `@repo/ui/components/ui/shipithq-loader`. Buttons and inline:
  `InlineLoader` from `@repo/ui/components/ui/inline-loader` (`sm` in a button,
  `md` in a row, `lg` in a panel). Inside an already-rendered page a skeleton
  matching the real layout still beats both. A rotating ring is the one loading
  affordance every product uses, which makes it the one that says nothing about
  this one - and at button size it is a grey smudge.
- **Headline numbers use `StatBand`** from `@repo/ui/components/ui/stat-band`, with
  `StatBandSkeleton` (same `count`, `cols`, `size`) in the loading state. Never write a
  local `StatCard` / `StatTile` / `MiniStat` or an inline grid of number cards. Read
  `packages/ui/src/components/ui/STAT-BAND.md` first: the value never truncates, colour
  tints the value only (`tone`: `neutral`, `emerald`, `rose`), format the value yourself,
  and `'-'` means no data, not zero.
- Images go to **R2**, never Cloudinary. Public objects (avatars) live under the
  `avatars/` prefix and are served by `r2PublicUrl()`; everything else stays
  private behind a signed URL. `/api/media` will only serve the public prefix,
  because the same bucket holds every user's resume.
- **No em dashes or en dashes anywhere.** Use a plain hyphen `-` instead. This
  applies to everything: UI copy, blog content, code comments, commit messages
  and docs. `—` and `–` are non-ASCII, they are hard to type on a normal
  keyboard, they render inconsistently across fonts, and they make text read as
  machine-written. Search for them before committing:

  ```bash
  grep -rn -e "—" -e "–" apps packages --include="*.ts" --include="*.tsx" --include="*.md"
  ```

  Use `-e` twice. The `$'—\|–'` form that was here before does NOT work: `\|`
  alternation is a GNU extension, and macOS ships BSD grep, which reads it as the
  literal string `—|–` and matches nothing. The check silently passed on every
  run, which is how 13 source files acquired em dashes while the rule was in
  force.
