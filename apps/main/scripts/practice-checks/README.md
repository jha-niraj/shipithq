# Running the checks

Everything in here runs under plain Node with three loaders, in this order: tsx
(TypeScript and JSX), then the shims, then `css.mjs` - tsx replaces the
CommonJS `.css` handler when it registers, so CSS must come last.

There is no `tsx` in `apps/main`; the one in `packages/db` is the one to use.

A check that touches the database (from `apps/main`):

```bash
SEED_I_KNOW_WHAT_I_AM_DOING=1 node --env-file=.env \
  --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
  --import ./scripts/practice-checks/shims.mjs \
  --import ./scripts/practice-checks/css.mjs \
  scripts/practice-checks/<name>.ts
```

A render check (`*.tsx`) needs `nav-shims.mjs` as well, after `shims.mjs`:

```bash
node --env-file=.env \
  --import ../../packages/db/node_modules/tsx/dist/loader.mjs \
  --import ./scripts/practice-checks/shims.mjs \
  --import ./scripts/practice-checks/nav-shims.mjs \
  --import ./scripts/practice-checks/css.mjs \
  scripts/practice-checks/<name>.tsx
```

`--env-file=.env` is needed even by the render checks: importing a server action
pulls in `@repo/db`, which builds its client at module load and throws without
`DATABASE_URL`.

`shims.mjs` signs the run in as `E2E_USER_ID` (with `E2E_USER_EMAIL` for the
actions that resolve a user by email), makes `server-only` inert, and stubs
`next/headers` and `next/cache` - `revalidatePath` throws outside a request.

`SEED_I_KNOW_WHAT_I_AM_DOING=1` is the guard on writing to the database; the
checks refuse unless the URL looks like a dev one. `apps/main/.env` points at
the dev Neon database, which is what these are meant to run against.

Checks that call a real model (`e2e.ts`, `mentor-*.ts`, `project-picks.ts`,
`recommendations.ts`, `sarvam.ts`) cost money on every run. Re-run those only
when the thing they cover changes.
