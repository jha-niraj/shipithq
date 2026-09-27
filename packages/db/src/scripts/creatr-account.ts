/**
 * Niraj's hiring account at Creatr (niraj@getcreatr.com) with a verified Creatr company page, for testing apps/hiring.
 *
 *   pnpm script creatr-account                    preview: what exists, what would change
 *   pnpm script creatr-account --apply            create what's missing, bring the company's
 *                                                 details up to date, print a new password
 *                                                 only if the sign-in was just created
 *   pnpm script creatr-account --reset-password --apply
 *                                                 a new password for the existing sign-in
 *
 * What it keeps in place (idempotent, keyed on fixed ids):
 *   - user     niraj@getcreatr.com, email verified, a password sign-in (bcrypt, cost 10,
 *              as packages/auth hashes it; the password itself is printed once, never stored)
 *   - company  Creatr (slug creatr, domain getcreatr.com), claimed and VERIFIED, with its
 *              profile from getcreatr.com (2026-09-27): what it does, headquarters,
 *              founders, founded year and links. Third-party profiles (Tracxn,
 *              Crunchbase) disagree on the year (2023) and headquarters (New Delhi) and
 *              put the team at about 15; the company's own site is used here, and the
 *              Owner can change any of it on the company page.
 *   - roles    the four presets (Owner, Admin, Recruiter, Interviewer), as onboarding makes them
 *   - member   that user as the company's Owner
 */
import { randomBytes } from "node:crypto"
import { createRequire } from "node:module"
import { and, eq } from "drizzle-orm"
import { db } from "../client"
import { accounts, companies, companyMembers, companyRoles, users } from "../index"
import { ROLE_PRESETS, type RolePresetKey } from "../hiring-permissions"

// bcryptjs is packages/auth's dependency (it hashes every password); loaded from there, so
// this script hashes exactly as sign-in verifies, without a new dependency here.
const bcrypt = createRequire(new URL("../../../auth/package.json", import.meta.url))("bcryptjs") as { hash: (s: string, rounds: number) => Promise<string> }

const apply = process.argv.includes("--apply")
const resetPassword = process.argv.includes("--reset-password")

const USER_ID = "creatr_niraj"
const EMAIL = "niraj@getcreatr.com"
const NAME = "Niraj Jha"
const COMPANY_ID = "creatr_company"
const MEMBER_ID = "creatr_niraj_member"

/** From getcreatr.com, read 2026-09-27. */
const COMPANY = {
    name: "Creatr",
    slug: "creatr",
    website: "https://getcreatr.com",
    websiteDomain: "getcreatr.com",
    description:
        "Creatr builds, hosts and runs mission-critical custom software for enterprises. Its AI agent, DeepBuild, plans the product before it builds the system, then handles the research, programming and end-to-end testing, so a production-grade application ships in days. After launch, a dedicated engineer maintains and scales it: AI speed, human accountability.",
    industry: "Technology",
    companySize: "11-50",
    foundedYear: 2025,
    headquarters: "Wilmington, Delaware, USA",
    city: "Wilmington",
    state: "Delaware",
    country: "USA",
    socialLinks: {
        linkedin: "https://www.linkedin.com/company/getcreatr/",
        twitter: "https://x.com/getcreatr",
        productHunt: "https://www.producthunt.com/products/creatr-2",
    },
    culture:
        "Customer-first engineering: solve the real problem, ship fast with AI, and stay accountable after launch. Founded by Kartik Sharma (CEO) and Prince Mendiratta (CTO).",
    techStack: ["AI agents", "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Cloud infrastructure"],
    benefits: ["Work on enterprise products end to end", "Ship production software in days", "Small team, real ownership"],
}
const FIELDS = ["name", "website", "websiteDomain", "description", "industry", "companySize", "foundedYear", "headquarters", "city", "state", "country", "socialLinks", "culture", "techStack", "benefits"] as const

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

/** By content: jsonb comes back with its keys in Postgres's order, not ours. */
const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])])) : v ?? null
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const newPassword = () => `Creatr-${randomBytes(9).toString("base64url")}`

async function plan() {
    const [user, byEmail, account, company, domainOwner, roles, member] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, USER_ID) }),
        db.query.users.findFirst({ where: eq(users.email, EMAIL), columns: { id: true } }),
        db.query.accounts.findFirst({ where: and(eq(accounts.userId, USER_ID), eq(accounts.providerId, "credential")), columns: { id: true } }),
        db.query.companies.findFirst({ where: eq(companies.id, COMPANY_ID) }),
        db.query.companies.findFirst({ where: eq(companies.websiteDomain, COMPANY.websiteDomain), columns: { id: true, name: true } }),
        db.select({ presetKey: companyRoles.presetKey }).from(companyRoles).where(eq(companyRoles.companyId, COMPANY_ID)),
        db.query.companyMembers.findFirst({ where: eq(companyMembers.id, MEMBER_ID), columns: { id: true, roleId: true } }),
    ])
    const changed = company ? FIELDS.filter((f) => !same(company[f], COMPANY[f])) : [...FIELDS]
    const missingRoles = (Object.keys(ROLE_PRESETS) as RolePresetKey[]).filter((k) => !roles.some((r) => r.presetKey === k))
    return {
        user, account, company, changed, missingRoles, member,
        emailTaken: byEmail && byEmail.id !== USER_ID ? byEmail.id : null,
        domainTaken: domainOwner && domainOwner.id !== COMPANY_ID ? domainOwner.name : null,
        verified: company?.verificationStatus === "VERIFIED" && company.claimStatus === "CLAIMED",
    }
}

function print(p: Awaited<ReturnType<typeof plan>>) {
    console.log(`  ${p.user ? "=" : "+"} user     ${EMAIL} (${NAME}), email verified`)
    console.log(`  ${p.account ? (resetPassword ? "~" : "=") : "+"} sign-in  email and password${p.account ? (resetPassword ? ": a new password" : ": kept") : ": a new password"}`)
    console.log(`  ${p.company ? (p.changed.length ? "~" : "=") : "+"} company  Creatr (creatr, getcreatr.com)${p.company && p.changed.length ? `: ${p.changed.join(", ")}` : ""}`)
    console.log(`  ${p.verified ? "=" : "~"} status   claimed and VERIFIED`)
    console.log(`  ${p.missingRoles.length ? "+" : "="} roles    ${p.missingRoles.length ? p.missingRoles.map((k) => ROLE_PRESETS[k].name).join(", ") : "all four presets"}`)
    console.log(`  ${p.member ? "=" : "+"} member   ${EMAIL} as the Owner`)
}

async function main() {
    const h = host()
    if (/prod|production/i.test(h)) {
        console.error(`Refusing: ${h} looks like production.`)
        process.exit(1)
    }
    console.log(`Database: ${h}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    const before = await plan()
    if (before.emailTaken) { console.log(`  ! ${EMAIL} already belongs to another user (${before.emailTaken}); nothing done.`); return }
    if (before.domainTaken) { console.log(`  ! getcreatr.com already belongs to ${before.domainTaken}; nothing done.`); return }
    print(before)
    if (!apply) return

    if (!before.user) {
        await db.insert(users).values({ id: USER_ID, name: NAME, email: EMAIL, emailVerified: true, role: "HR" as never })
    } else if (!before.user.emailVerified) {
        await db.update(users).set({ emailVerified: true }).where(eq(users.id, USER_ID))
    }

    let password: string | null = null
    if (!before.account || resetPassword) {
        password = newPassword()
        const hash = await bcrypt.hash(password, 10)
        if (before.account) {
            await db.update(accounts).set({ password: hash, updatedAt: new Date() }).where(eq(accounts.id, before.account.id))
        } else {
            await db.insert(accounts).values({ userId: USER_ID, accountId: USER_ID, providerId: "credential", password: hash, updatedAt: new Date() })
        }
    }

    const details = { ...COMPANY, claimStatus: "CLAIMED" as const, profileSource: "SELF_SERVE" as const, verificationStatus: "VERIFIED" as const, updatedAt: new Date() }
    if (!before.company) {
        await db.insert(companies).values({ id: COMPANY_ID, ...details, verifiedAt: new Date(), createdByUserId: USER_ID } as typeof companies.$inferInsert)
    } else if (before.changed.length || !before.verified) {
        const { slug: _slug, ...rest } = details
        await db.update(companies).set({ ...rest, verifiedAt: before.company.verifiedAt ?? new Date() } as Partial<typeof companies.$inferInsert>).where(eq(companies.id, COMPANY_ID))
    }

    if (before.missingRoles.length) {
        await db.insert(companyRoles).values(before.missingRoles.map((key) => ({
            companyId: COMPANY_ID, name: ROLE_PRESETS[key].name, permissions: ROLE_PRESETS[key].permissions,
            isOwner: key === "OWNER", presetKey: key, updatedAt: new Date(),
        })))
    }
    const owner = await db.query.companyRoles.findFirst({ where: and(eq(companyRoles.companyId, COMPANY_ID), eq(companyRoles.presetKey, "OWNER")), columns: { id: true } })
    if (!owner) throw new Error("The Owner role is missing")
    if (!before.member) {
        await db.insert(companyMembers).values({
            id: MEMBER_ID, userId: USER_ID, companyId: COMPANY_ID, email: EMAIL, displayName: NAME,
            role: "FOUNDER", roleId: owner.id, jobTitle: "OTHER", inviteStatus: "ACCEPTED", acceptedAt: new Date(),
        } as typeof companyMembers.$inferInsert)
    } else if (before.member.roleId !== owner.id) {
        await db.update(companyMembers).set({ roleId: owner.id }).where(eq(companyMembers.id, MEMBER_ID))
    }

    console.log("\nChecking again:\n")
    const after = await plan()
    print(after)
    const left = [!after.user, !after.account, !after.company, after.changed.length > 0, !after.verified, after.missingRoles.length > 0, !after.member].filter(Boolean).length
    console.log(left ? `\n  ! ${left} item(s) still differ` : "\n  Nothing left to change.")
    if (password) console.log(`\nSign in to the hiring app as ${EMAIL} with this password (shown once, stored only as a hash):\n\n  ${password}\n`)
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
