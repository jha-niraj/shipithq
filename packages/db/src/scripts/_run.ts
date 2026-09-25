/**
 * The one entry point for every data script in this folder (Niraj, 2026-09-25).
 *
 *   pnpm script                                  list the scripts and what each does
 *   pnpm script <name>                           run src/scripts/<name>.ts (a preview, by convention)
 *   pnpm script <name> --apply                   the same, writing
 *
 * `package.json` has ONE line for this (`"script"`), which loads `apps/main/.env`
 * first. A new script is a new file here and nothing else: no package.json line per
 * script, which is how that file grew a dozen `db:<name>` entries.
 *
 * Every script in this folder previews by default and writes only with `--apply`,
 * then re-plans and shows nothing is left (CLAUDE.md, "Database"). Its first doc
 * comment line is what `pnpm script` prints beside its name, so write that line as
 * the one-sentence purpose. Files starting with `_` are helpers, not scripts.
 */
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

function scripts(): { name: string; purpose: string }[] {
    return readdirSync(here)
        .filter((f) => f.endsWith(".ts") && !f.startsWith("_"))
        .map((f) => {
            const src = readFileSync(join(here, f), "utf8")
            const doc = /\/\*\*([\s\S]*?)\*\//.exec(src)?.[1] ?? ""
            const purpose = doc
                .split("\n")
                .map((l) => l.replace(/^\s*\*\s?/, "").trim())
                .find((l) => l.length > 0) ?? ""
            return { name: f.replace(/\.ts$/, ""), purpose }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
}

function list() {
    const all = scripts()
    const width = Math.max(...all.map((s) => s.name.length))
    console.log("\nData scripts (packages/db/src/scripts). Preview by default; add --apply to write.\n")
    for (const s of all) console.log(`  ${s.name.padEnd(width)}  ${s.purpose}`)
    console.log("\n  pnpm script <name>            preview")
    console.log("  pnpm script <name> --apply    write\n")
}

async function main() {
    const name = process.argv[2]
    if (!name || name === "--help" || name === "-h") return list()

    // A name, not a path: nothing outside this folder can be run through here.
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        console.error(`"${name}" is not a script name. Run \`pnpm script\` to see them.`)
        process.exitCode = 1
        return
    }
    const known = scripts().map((s) => s.name)
    if (!known.includes(name)) {
        console.error(`No script called "${name}". Run \`pnpm script\` to see them.`)
        process.exitCode = 1
        return
    }

    // Drop the script name so the script sees the same argv as if run directly:
    // `process.argv.includes("--apply")` and `--flag=value` parsing work unchanged.
    process.argv.splice(2, 1)
    await import(pathToFileURL(join(here, `${name}.ts`)).href)
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
