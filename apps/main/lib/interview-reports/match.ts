import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db, companies } from "@repo/db"
import { companyLoops, pickLoop, roleGroupOf } from "@repo/db/company-loop"
import { companyFromTitle } from "@repo/exa/job-page"

/*
 * Which company and role group a prep goal's posting belongs to, when that
 * group has a reported loop (plan/competition/skillmeet CMP-2e, decisions round
 * 4): the company by its site's domain, else by the name in the scraped title;
 * the group from the role, the same family at another level if the exact group
 * has no loop yet. Null when nothing matches: the goal is generated as before.
 */
export async function matchReportedLoop(input: { position: string; companyUrl?: string | null; scrapedTitle?: string | null }): Promise<{ companyId: string; companyName: string; roleFamily: string; level: string } | null> {
    let company: { id: string; name: string } | undefined
    const url = input.companyUrl?.trim()
    if (url) {
        try {
            const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "")
            ;[company] = await db.select({ id: companies.id, name: companies.name }).from(companies).where(and(eq(companies.websiteDomain, host), isNull(companies.suspendedAt))).limit(1)
        } catch { /* not a URL */ }
    }
    const guess = !company && input.scrapedTitle ? companyFromTitle(input.scrapedTitle) : ""
    if (guess) {
        ;[company] = await db.select({ id: companies.id, name: companies.name }).from(companies)
            .where(and(sql`lower(${companies.name}) = ${guess.toLowerCase()}`, isNull(companies.suspendedAt))).limit(1)
    }
    if (!company) return null
    const group = pickLoop(await companyLoops(db, company.id), roleGroupOf(input.position))
    return group ? { companyId: company.id, companyName: company.name, roleFamily: group.roleFamily, level: group.level } : null
}
