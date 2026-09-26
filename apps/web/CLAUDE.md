# ShipItHQ Web (Marketing Site)

The public marketing + content site (`shipithq.com`). Next.js 16 + React 19 + Tailwind 4,
sharing the `@repo/ui` design system with the app. Deployed to **Cloudflare Workers** via
`@opennextjs/cloudflare`. Port **6005**.

The authenticated product (auth, dashboard, AI tools, practice, projects, checkout) lives in
`apps/main` at `app.shipithq.com`. This app and that app are deliberately separate deploys.

## The separation rule (STRICT)

**apps/web has no auth. Not a client, not a session read, not a cookie, not a dependency.**

- `@repo/auth` must never appear in `package.json` or any import here. If you find yourself
  wanting `useSession()`, the answer is that the marketing site does not know who the visitor
  is, by design. Both signed-in and signed-out visitors see identical HTML, which is also what
  makes every page fully static and cacheable.
- No `BETTER_AUTH_URL` / `NEXT_PUBLIC_AUTH_URL`. They are not in `next.config.mjs`'s `env`
  block and should not be re-added.
- Every product CTA is a plain `<a href={...}>` to the **app origin**, built from
  `APP_URL` / `APP_LINKS` in `lib/site.ts`. Never a Next `<Link>` to a bare `/signin`,
  `/practice`, `/purchase` etc.
  - `<Link>` = a page that exists on THIS site.
  - `<a href={APP_URL}/...>` = anything behind a login.
  - The `APP_PATHS` redirects in `next.config.mjs` are a safety net for old inbound links, not
    a routing strategy. Linking through them adds a pointless redirect hop.

**Database access is allowed but narrow.** `@repo/db` is used for exactly four things:
read-only landing stats (`actions/stats.action.ts`), newsletter capture
(`actions/newsletter.action.ts`), contact submissions (`actions/contact.action.ts`), and
the read-only public Ideas board (`app/(home)/ideas`, through `listPublicIdeas` in
`@repo/db/ideas`; plan/web/revamp REV-42, plan/ideas). The only user data that query
returns is a poster's first name and avatar, and not even that when they posted
anonymously (Niraj, 2026-09-26); never an id or an email. No user records are written
here. Posting and voting on ideas happen in the app.

## URLs and SEO

- **`lib/site.ts` is the single source of truth** for the site origin (`SITE`), the app origin
  (`APP_URL`), and brand identity (`BRAND`). Do not read `NEXT_PUBLIC_WEB_URL` /
  `NEXT_PUBLIC_BASE_URL` directly anywhere else - mixing the two is how canonicals, sitemap
  URLs and JSON-LD `@id`s silently end up disagreeing with each other.
- Every indexable page sets an **absolute canonical** and its own OG/Twitter metadata.
- `app/sitemap.ts` uses a **fixed** `STATIC_LAST_MODIFIED`, never `new Date()`. Reporting
  "everything changed" on each deploy makes Google ignore your lastmod entirely.
- **No fake `aggregateRating`** in JSON-LD. Google requires ratings to come from real on-page
  reviews; inventing one risks a manual action. It was removed for that reason - only add it
  back alongside real, displayed reviews.
- `app/llms.txt/route.ts` is generated from the blog data, so it cannot go stale.

## Blog

Content lives in two places that must stay in sync:

1. `content/blog.ts` - metadata: title, `pageTitle`, description, category, keywords, FAQs,
   `relatedSlugs`, takeaways, dates.
2. `content/posts/<slug>.md` - the article body, plain markdown rendered by
   `lib/blog-renderer.ts`.

`content/active-posts.ts` is the **publish gate**. A post only becomes public - listed on
`/blogs`, indexed, in `sitemap.xml` and `llms.txt` - once its slug is added there. Posts not
listed still render as real pages (so internal links never 404) but are `noindex`. This lets
posts be written in batches and rolled out on a schedule.

Every post gets a generated 1200x630 social card from
`app/(home)/blogs/[slug]/opengraph-image.tsx` at build time, so no post needs a hand-designed
OG asset. `heroImage` is optional and only controls the in-article hero; posts without one
render a branded typographic cover.

When adding a post:
- Add metadata to `content/blog.ts` and the markdown to `content/posts/`.
- Pick a `category` from `BLOG_CATEGORIES` - it drives the topic hub and breadcrumbs.
- Give it 4 FAQs (they become `FAQPage` JSON-LD) and 3 `relatedSlugs`.
- Include **real outbound links to authoritative sources** and 2-4 internal links to sibling
  posts. Internal links use `/blogs/<slug>`, never product routes.
- Add the slug to `content/active-posts.ts` when it should go live.

## Deployment (Cloudflare Workers)

```bash
pnpm deploy             # build + deploy, pushing .env.production as Worker secrets
pnpm deploy:no-secrets  # build + deploy, leaving existing secrets untouched
pnpm deploy:build       # opennextjs-cloudflare build  -> .open-next/
pnpm preview            # run the built Worker locally in workerd
```

`.env.production` does two jobs: Next loads it at build time (so every `NEXT_PUBLIC_*`
production URL is inlined into the bundle), and `wrangler deploy --secrets-file` uploads
it as Worker secrets for the server side. `.env` stays local-only.

`--secrets-file` is **additive** - a key you omit keeps its current production value. But a
key present with an *empty* value is uploaded as an empty string and overwrites the live
secret, which is why the generated `.env.production` ships with unset keys commented out
rather than set to `""`. Delete the line, never blank it.

Use `deploy:no-secrets` when shipping code without touching secrets (e.g. a rollback).

**One-time setup before the first deploy** - the R2 cache bucket must exist. It is shared by
every app in the monorepo, so this only has to run once ever:

```bash
wrangler r2 bucket create shipithq-next-cache
```

Config lives in `wrangler.jsonc` (worker name, bindings, compatibility flags) and
`open-next.config.ts` (incremental cache). Notes that are easy to get wrong:

- **`public/_headers` does nothing here.** `_headers` is a Cloudflare *Pages* feature and is
  silently ignored by a Workers deploy. All security and cache headers are declared in
  `next.config.mjs` under `headers()`. Do not reintroduce a `_headers` file and assume it
  applies - it will look correct in the repo and never be sent.
- **The R2 binding name must be exactly `NEXT_INC_CACHE_R2_BUCKET`.** That is what
  `r2IncrementalCache` looks up. Rename it and every request silently falls back to
  re-rendering the page in the Worker.
- **Keep `open-next.config.ts` minimal.** No `enableCacheInterception`, no `withRegionalCache`,
  no Durable Object sharded tag cache - that combination caused intermittent production 500s
  on this stack in a sibling project, and this site has no `revalidateTag` calls to justify it.

### Watch on the first `deploy:build`

Two things are correct in a Node build but are worth confirming once on the Workers bundle:

1. **`next/og` OG cards.** `app/(home)/blogs/[slug]/opengraph-image.tsx` has
   `generateStaticParams` for every slug, so all 17 cards are rendered to static PNGs at
   build time and served from the assets CDN - the Worker never runs satori/WASM. If the
   bundle ever complains about WASM or size, the fallback is to delete that route and set a
   real `heroImage` per post instead.
2. **`fs` in the blog renderer.** `lib/blog-renderer.ts` reads markdown off disk. That is a
   build-time-only path, and `dynamicParams = false` on both dynamic blog routes guarantees
   it can never be reached at runtime in the Worker. Do not remove that export.

### Analytics

No analytics package is installed. Cloudflare Web Analytics is injected by the platform for
Workers-hosted sites - enable it in the Cloudflare dashboard for the `shipithq.com` hostname.
`static.cloudflareinsights.com` is already allowlisted in the CSP in `next.config.mjs`.

Do not add `@vercel/analytics` back: off Vercel its beacon 404s on every page load, which
costs a console error and a Lighthouse Best-Practices point on an SEO-critical site.

### Middleware must stay named `middleware.ts` - never `proxy.ts`

Next 16 renames Middleware to Proxy (`middleware.ts` -> `proxy.ts`). **Do not make that
rename in this repo.** The Cloudflare adapter does not support the `proxy.ts` convention;
`middleware.ts` is still fully supported by Next 16 and is what OpenNext bundles.

This app currently has no middleware at all (routing is handled by `redirects()` in
`next.config.mjs`, which is cheaper and runs at the edge anyway). If one is ever needed here,
create `middleware.ts`. The same rule applies to `apps/main`, which already has a
`middleware.ts` that must not be renamed.

## Conventions

- **Light only** (Niraj, 2026-09-25, plan/web/revamp REV-1): `ThemeProvider` is forced
  to light and there is no theme toggle. Do not delete existing `dark:` classes; new
  marketing code built on `components/marketing/primitives.tsx` uses its tones and needs
  no `dark:` pair.
- **Chrome:** every page renders `SiteHeader` (announcement + sticky navbar, in the page
  flow, so no top padding to clear it) and `SiteFooter`, from `components/site/`. The
  navbar's audience (students, companies, universities) comes from the path; its data
  is `components/site/audiences.ts`.
- **Design system:** import UI from `@repo/ui`. Do not restyle shared components.
- **No dead links.** No `href="#"`, no "coming soon" toasts dressed as navigation, no links to
  routes that only exist in `apps/main`.
- **Server components by default.** Only add `"use client"` where there is real interactivity.

## Checks before shipping

```bash
pnpm check-types   # next typegen && tsc --noEmit
pnpm lint          # eslint --max-warnings 0
pnpm build         # next build - must generate all static pages
pnpm deploy:build  # opennextjs-cloudflare build - the deploy path, verify this too
```
