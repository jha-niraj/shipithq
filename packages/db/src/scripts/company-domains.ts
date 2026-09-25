/**
 * Fill `company.website_domain` for companies made before it existed
 * (plan/hiring-app HA-5). New companies get it from the creator's work email.
 *
 *   pnpm script company-domains            preview: what each company would get
 *   pnpm script company-domains --apply    write it, then preview again (should be empty)
 *
 * The domain comes from the company's `website` ("https://www.acme.io/careers"
 * -> "acme.io"). A company with no usable website is listed and left empty. The
 * column is unique, so when two companies share a domain the OLDEST keeps it and
 * the rest are listed for a person to sort out, never guessed.
 */
import { asc, eq } from "drizzle-orm"
import { db } from "../client"
import { companies } from "../index"

const apply = process.argv.includes("--apply")

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

/** "https://www.Acme.io/careers" -> "acme.io"; null when it is not a usable site. */
export function domainFromWebsite(website: string | null): string | null {
    if (!website?.trim()) return null
    try {
        const url = new URL(/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
        const h = url.hostname.toLowerCase().replace(/^www\./, "")
        return h.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(h) ? h : null
    } catch {
        return null
    }
}

type Step = { id: string; name: string; domain: string | null; note?: string }

async function plan(): Promise<{ steps: Step[]; taken: Set<string> }> {
    const rows = await db.select({ id: companies.id, name: companies.name, website: companies.website, domain: companies.websiteDomain, createdAt: companies.createdAt })
        .from(companies).orderBy(asc(companies.createdAt))
    const taken = new Set(rows.map((r) => r.domain).filter((d): d is string => !!d))
    const steps: Step[] = []
    for (const r of rows) {
        if (r.domain) continue
        const d = domainFromWebsite(r.website)
        if (!d) { steps.push({ id: r.id, name: r.name, domain: null, note: `no usable website (${r.website ?? "none"})` }); continue }
        if (taken.has(d)) { steps.push({ id: r.id, name: r.name, domain: null, note: `${d} is already another company's: left empty for a person to decide` }); continue }
        taken.add(d)
        steps.push({ id: r.id, name: r.name, domain: d })
    }
    return { steps, taken }
}

function report(steps: Step[]) {
    for (const s of steps) console.log(s.domain ? `  + ${s.name}: ${s.domain}` : `  = ${s.name}: ${s.note}`)
    const writes = steps.filter((s) => s.domain).length
    console.log(writes ? `\n${writes} compan${writes === 1 ? "y" : "ies"} to update.` : "\nNothing to change.")
}

async function main() {
    console.log(`Database: ${host()}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    const { steps } = await plan()
    report(steps)
    if (!apply) return
    for (const s of steps) {
        if (!s.domain) continue
        await db.update(companies).set({ websiteDomain: s.domain }).where(eq(companies.id, s.id))
    }
    console.log("\nChecking again:\n")
    report((await plan()).steps)
}

// Only when run directly; `domainFromWebsite` is also imported.
if (process.argv[1]?.includes("company-domains")) {
    main().then(() => process.exit(0), (error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exit(1)
    })
}

