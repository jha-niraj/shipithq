/**
 * Fails if any path in `lib/navigation.ts` has no route behind it.
 *
 * ── Why this exists ──
 *
 * Two nav entries shipped pointing at routes that do not exist - `ai/jobinterviewassistant`
 * (the route has no "job" prefix) and `ai/resume/cover-letter` (the route is
 * `ai/coverletter`). A third stale path had already shipped in `layout.tsx`'s
 * `fullScreenPaths`, and the comment there says it "fails silently".
 *
 * That is the whole problem. A wrong path in a nav config has no symptom at build time, no
 * type error, and no runtime error - it renders a 404 only when somebody clicks it. Cover
 * Letter was worse still: `/ai/resume/cover-letter` MATCHED the dynamic
 * `app/(main)/ai/resume/[username]` segment with username="cover-letter", so it rendered
 * that page's own not-found and read as a broken profile rather than a broken link.
 *
 * ── Why it parses the file instead of importing it ──
 *
 * `lib/navigation.ts` is TypeScript and imports lucide icons, so plain `node` cannot load it
 * without a build step. The only thing this check needs is the `path:` strings, and a regex
 * gets those with no toolchain at all - which means it runs anywhere, including a pre-commit
 * hook, and can never be the reason CI is slow.
 *
 * ── Route groups ──
 *
 * `(group)` segments do not appear in the URL, so `jobs` is a real route even though there
 * is no `app/(main)/jobs` - it lives at `app/(jobs)/jobs`. Resolution walks the tree and
 * treats a `(group)` directory as transparent. Getting this wrong would make the check fail
 * on correct config, which is worse than not having it.
 *
 * Run: `pnpm check-nav`
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const APP = join(root, "app")

/** Every `path: '...'` in the nav config, in file order. */
function navPaths() {
    const src = readFileSync(join(root, "lib", "navigation.ts"), "utf8")
    return [...src.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
}

/**
 * Does `segments` resolve to a page, starting from directory `dir`?
 *
 * `literal` decides whether `[dynamic]` directories may be used. Nav destinations must
 * resolve LITERALLY - see the note below on why matching them dynamically defeats the check.
 * `(group)` and `@parallel` directories are transparent either way.
 */
function resolves(dir, segments, { literal }) {
    if (!existsSync(dir)) return false

    if (segments.length === 0) {
        return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((f) => existsSync(join(dir, f)))
    }

    const [head, ...rest] = segments
    const entries = readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory())

    if (entries.includes(head) && resolves(join(dir, head), rest, { literal })) return true

    if (!literal) {
        // A dynamic segment swallows one path segment: [slug], [...slug], [[...slug]].
        for (const e of entries) {
            if (e.startsWith("[") && resolves(join(dir, e), rest, { literal })) return true
        }
    }

    // Route groups and parallel routes do not consume a segment.
    for (const e of entries) {
        if ((e.startsWith("(") || e.startsWith("@")) && resolves(join(dir, e), segments, { literal })) return true
    }

    return false
}

// ── Literal, not dynamic. This distinction IS the check ──
//
// The first version of this script accepted a dynamic match, and it passed on a path that
// was deliberately broken to test it - `pathfinder/deliberately-wrong` was swallowed by
// `pathfinder/[slug]`. That is exactly the bug that shipped: `ai/resume/cover-letter` was
// swallowed by `ai/resume/[username]`, which is why it rendered a not-found profile instead
// of failing outright.
//
// A check that passes on the bug it exists to catch is worse than no check, because it reads
// like coverage. So: every nav path must resolve to a real directory of its own. None of
// them is meant to be a dynamic route - they are all fixed destinations.
const paths = navPaths()
const dead = []
const dynamicOnly = []

for (const p of paths) {
    // A nav path may carry a query - the projects Explore tabs are one page with
    // `?tab=`. The route is the part before it; the query is the page's business.
    const segments = p.split("?")[0].split("/").filter(Boolean)
    if (resolves(APP, segments, { literal: true })) continue
    if (resolves(APP, segments, { literal: false })) dynamicOnly.push(p)
    else dead.push(p)
}

if (dead.length > 0 || dynamicOnly.length > 0) {
    console.error(`\ncheck-nav: ${dead.length + dynamicOnly.length} navigation path(s) are wrong.\n`)
    for (const p of dead) {
        console.error(`  /${p}  - no route at all`)
    }
    for (const p of dynamicOnly) {
        console.error(`  /${p}  - only matches a [dynamic] segment, so it renders that page's`)
        console.error(`  ${" ".repeat(p.length)}    not-found instead of the page you meant`)
    }
    console.error(`\nEvery path in lib/navigation.ts must resolve to its own page.tsx under app/.\n`)
    process.exit(1)
}

console.log(`check-nav: all ${paths.length} navigation paths resolve literally.`)
