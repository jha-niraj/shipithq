/**
 * A hiring-side test account for browser checks on apps/hiring (plan/hiring-app).
 * Dev databases only: it refuses a host that looks like production.
 *
 *   pnpm script e2e-hiring            preview: what exists, what would be created
 *   pnpm script e2e-hiring --apply    create what is missing, then print a signed
 *                                 session cookie (valid 30 days) for the browser
 *
 * What it keeps in place (idempotent, keyed on fixed ids):
 *   - user    e2e-hiring@shipithq.dev, email verified, onboarding done, role HR
 *   - company "E2E Hiring Co" (slug e2e-hiring, domain shipithq.dev), VERIFIED
 *   - member  that user as FOUNDER of that company
 *   - session a fresh token each --apply (old e2e-hiring sessions are removed)
 *
 *   pnpm script e2e-hiring --newcomer [--apply]
 *     A second account with a fresh work domain and NO company, for testing
 *     company creation in onboarding (HA-5): owner@e2e-newco.test. Each --apply
 *     resets it: its memberships, any company on e2e-newco.test, and sessions.
 *
 *   pnpm script e2e-hiring --newcomer --role=RECRUITER [--apply]
 *     Instead of resetting: move the newcomer, inside its own company, to that
 *     preset role (OWNER, ADMIN, RECRUITER, INTERVIEWER) to test permissions.
 *
 *   pnpm script e2e-hiring --user=<email> [--apply]
 *     Any other test account, e.g. an invitee: created if missing (email
 *     verified), its company memberships removed, and a fresh session cookie
 *     printed. Only addresses on e2e test domains (*.test, shipithq.dev).
 */
import { createHmac, randomBytes } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { db } from "../client"
import { companies, companyMembers, companyRoles, sessions, users } from "../index"

const apply = process.argv.includes("--apply")
const newcomer = process.argv.includes("--newcomer")
const NEW_USER_ID = "e2e_newco_user"
const NEW_EMAIL = "owner@e2e-newco.test"
const NEW_DOMAIN = "e2e-newco.test"
const USER_ID = "e2e_hiring_user"
const COMPANY_ID = "e2e_hiring_company"
const MEMBER_ID = "e2e_hiring_member"
const EMAIL = "e2e-hiring@shipithq.dev"
/** The account's email domain, so "your company is already here" can be tested. */
const DOMAIN = "shipithq.dev"

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

async function plan() {
    const [user, company, member] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, USER_ID), columns: { id: true } }),
        db.query.companies.findFirst({ where: eq(companies.id, COMPANY_ID), columns: { id: true, websiteDomain: true } }),
        db.query.companyMembers.findFirst({ where: eq(companyMembers.id, MEMBER_ID), columns: { id: true } }),
    ])
    return { user: !!user, company: !!company, domain: company?.websiteDomain === DOMAIN, member: !!member }
}

function print(p: { user: boolean; company: boolean; domain: boolean; member: boolean }) {
    console.log(`  ${p.user ? "=" : "+"} user    ${EMAIL}`)
    console.log(`  ${p.company ? "=" : "+"} company E2E Hiring Co (e2e-hiring), VERIFIED`)
    console.log(`  ${p.domain ? "=" : "+"} domain  ${DOMAIN}`)
    console.log(`  ${p.member ? "=" : "+"} member  founder of that company`)
    console.log(`  ${apply ? "+" : "~"} session a new signed cookie${apply ? "" : " (on --apply)"}`)
}

async function signedCookie(userId: string): Promise<string> {
    const secret = process.env.BETTER_AUTH_SECRET
    if (!secret) throw new Error("BETTER_AUTH_SECRET is not set; the cookie cannot be signed.")
    await db.delete(sessions).where(eq(sessions.userId, userId))
    const token = randomBytes(24).toString("base64url")
    await db.insert(sessions).values({ userId, token, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), updatedAt: new Date() })
    return encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`)
}

async function mainNewcomerRole(preset: string) {
    const member = await db.query.companyMembers.findFirst({ where: eq(companyMembers.userId, NEW_USER_ID), columns: { id: true, companyId: true, roleId: true } })
    if (!member) { console.log("  ! the newcomer has no company yet: finish onboarding first"); return }
    const role = await db.query.companyRoles.findFirst({ where: and(eq(companyRoles.companyId, member.companyId), eq(companyRoles.presetKey, preset)), columns: { id: true, name: true } })
    if (!role) { console.log(`  ! no ${preset} role in that company`); return }
    console.log(`  ~ ${NEW_EMAIL}: role -> ${role.name}`)
    if (!apply) return
    await db.update(companyMembers).set({ roleId: role.id }).where(eq(companyMembers.id, member.id))
    console.log(`\n${JSON.stringify({ userId: NEW_USER_ID, cookie: await signedCookie(NEW_USER_ID) })}`)
}

async function mainNewcomer() {
    const roleArg = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1]?.toUpperCase()
    if (roleArg) return mainNewcomerRole(roleArg)
    const [user, members, company] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, NEW_USER_ID), columns: { id: true } }),
        db.select({ id: companyMembers.id }).from(companyMembers).where(eq(companyMembers.userId, NEW_USER_ID)),
        db.query.companies.findFirst({ where: eq(companies.websiteDomain, NEW_DOMAIN), columns: { id: true, name: true } }),
    ])
    console.log(`  ${user ? "=" : "+"} user    ${NEW_EMAIL} (no company)`)
    if (members.length) console.log(`  - ${members.length} membership(s) removed`)
    if (company) console.log(`  - company ${company.name} (${NEW_DOMAIN}) removed`)
    if (!apply) return
    if (!user) {
        await db.insert(users).values({ id: NEW_USER_ID, name: "E2E Newcomer", email: NEW_EMAIL, emailVerified: true, role: "HR" as never })
    }
    await db.delete(companyMembers).where(eq(companyMembers.userId, NEW_USER_ID))
    if (company) await db.delete(companies).where(eq(companies.id, company.id))
    console.log(`\n${JSON.stringify({ userId: NEW_USER_ID, cookie: await signedCookie(NEW_USER_ID) })}`)
}

async function mainUser(email: string) {
    if (!/@([a-z0-9-]+\.)*(test|shipithq\.dev)$/i.test(email)) {
        console.log(`  ! refusing ${email}: only *.test or shipithq.dev test addresses`)
        return
    }
    const id = `e2e_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()), columns: { id: true } })
    const members = user ? await db.select({ id: companyMembers.id }).from(companyMembers).where(eq(companyMembers.userId, user.id)) : []
    console.log(`  ${user ? "=" : "+"} user    ${email}${members.length ? ` (${members.length} membership(s) removed)` : ""}`)
    if (!apply) return
    const userId = user?.id ?? id
    if (!user) await db.insert(users).values({ id, name: email.split("@")[0], email: email.toLowerCase(), emailVerified: true, role: "HR" as never })
    await db.delete(companyMembers).where(eq(companyMembers.userId, userId))
    console.log(`\n${JSON.stringify({ userId, cookie: await signedCookie(userId) })}`)
}

async function main() {
    const h = host()
    if (/prod|production/i.test(h)) {
        console.error(`Refusing: ${h} looks like production.`)
        process.exit(1)
    }
    console.log(`Database: ${h}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    if (newcomer) return mainNewcomer()
    const userArg = process.argv.find((a) => a.startsWith("--user="))?.split("=")[1]
    if (userArg) return mainUser(userArg)
    const before = await plan()
    print(before)
    if (!apply) return

    const secret = process.env.BETTER_AUTH_SECRET
    if (!secret) throw new Error("BETTER_AUTH_SECRET is not set; the cookie cannot be signed.")

    if (!before.user) {
        await db.insert(users).values({
            id: USER_ID, name: "E2E Hiring", email: EMAIL, emailVerified: true,
            onboardingCompleted: true, role: "HR" as never,
        })
    }
    if (!before.company) {
        await db.insert(companies).values({
            id: COMPANY_ID, name: "E2E Hiring Co", slug: "e2e-hiring",
            verificationStatus: "VERIFIED" as never, verifiedAt: new Date(), createdByUserId: USER_ID, websiteDomain: DOMAIN,
        } as typeof companies.$inferInsert)
    }
    if (before.company && !before.domain) {
        await db.update(companies).set({ websiteDomain: DOMAIN }).where(eq(companies.id, COMPANY_ID))
    }
    if (!before.member) {
        await db.insert(companyMembers).values({
            id: MEMBER_ID, userId: USER_ID, companyId: COMPANY_ID, role: "FOUNDER",
            email: EMAIL, displayName: "E2E Hiring", inviteStatus: "ACCEPTED",
        } as typeof companyMembers.$inferInsert)
    }

    await db.delete(sessions).where(eq(sessions.userId, USER_ID))
    const token = randomBytes(24).toString("base64url")
    await db.insert(sessions).values({
        userId: USER_ID, token, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), updatedAt: new Date(),
    })
    const signature = createHmac("sha256", secret).update(token).digest("base64")
    const cookie = encodeURIComponent(`${token}.${signature}`)

    console.log("\nChecking again:\n")
    print(await plan())
    console.log(`\n${JSON.stringify({ userId: USER_ID, cookie })}`)
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
