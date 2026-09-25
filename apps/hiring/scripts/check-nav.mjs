// Every sidebar link must resolve to a page (plan/hiring-app HA-2).
//
//   node scripts/check-nav.mjs
//
// Reads each `path: "..."` in lib/navigation.ts and looks for
// app/<route groups>/<path>/page.tsx. Exits 1 on any link with no page, which
// is how /interviews and /analytics/pipeline sat in the sidebar for months.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"

const root = new URL("..", import.meta.url).pathname
const nav = readFileSync(join(root, "lib/navigation.ts"), "utf8")
const paths = [...nav.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1].split("?")[0])

// Route groups "(name)" do not appear in the URL, so look inside each of them.
const groups = readdirSync(join(root, "app")).filter((d) => d.startsWith("(") && statSync(join(root, "app", d)).isDirectory())
const hasPage = (p) => [join(root, "app", p), ...groups.map((g) => join(root, "app", g, p))].some((d) => existsSync(join(d, "page.tsx")))

const missing = [...new Set(paths)].filter((p) => !hasPage(p))
for (const p of [...new Set(paths)]) console.log(`${missing.includes(p) ? "MISSING" : "ok     "} /${p}`)
if (missing.length) {
    console.error(`\n${missing.length} sidebar link(s) lead nowhere.`)
    process.exit(1)
}
console.log("\nEvery sidebar link resolves.")
