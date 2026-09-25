/**
 * Give every company its roles, and every member one of them (plan/hiring-app HA-6).
 *
 *   pnpm script company-roles            preview: per company, the roles to create
 *                                    and each member's old role -> new role
 *   pnpm script company-roles --apply    write it, then preview again (should be empty)
 *
 * Every company gets the fixed Owner role and the three editable presets
 * (Admin, Recruiter, Interviewer) from `ROLE_PRESETS`. A member without a
 * `role_id` gets the preset its legacy `role` maps to (`LEGACY_ROLE_TO_PRESET`):
 * FOUNDER -> Owner, ADMIN -> Admin, HIRING_MANAGER and RECRUITER -> Recruiter,
 * INTERVIEWER -> Interviewer. A company with members but no FOUNDER is listed:
 * its most senior member (ADMIN, else the earliest) is made Owner, because a
 * company must always have one.
 */
import { and, asc, eq, isNull } from "drizzle-orm"
import { db } from "../client"
import { companies, companyMembers, companyRoles } from "../index"
import { LEGACY_ROLE_TO_PRESET, ROLE_PRESETS, type RolePresetKey } from "../hiring-permissions"

const apply = process.argv.includes("--apply")
const PRESET_KEYS: RolePresetKey[] = ["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"]

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)"
    } catch {
        return "(DATABASE_URL is not a URL)"
    }
}

type CompanyPlan = {
    id: string
    name: string
    createRoles: RolePresetKey[]
    assign: { memberId: string; email: string; from: string; to: RolePresetKey; promoted?: boolean }[]
}

async function plan(): Promise<CompanyPlan[]> {
    const [allCompanies, roles, members] = await Promise.all([
        db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name)),
        db.select({ companyId: companyRoles.companyId, presetKey: companyRoles.presetKey }).from(companyRoles),
        db.select({ id: companyMembers.id, companyId: companyMembers.companyId, email: companyMembers.email, role: companyMembers.role, roleId: companyMembers.roleId, createdAt: companyMembers.createdAt })
            .from(companyMembers).orderBy(asc(companyMembers.createdAt)),
    ])
    const out: CompanyPlan[] = []
    for (const c of allCompanies) {
        const have = new Set(roles.filter((r) => r.companyId === c.id).map((r) => r.presetKey))
        const createRoles = PRESET_KEYS.filter((k) => !have.has(k))
        const mine = members.filter((m) => m.companyId === c.id)
        const unassigned = mine.filter((m) => !m.roleId)
        const assign: CompanyPlan["assign"] = unassigned.map((m) => ({
            memberId: m.id, email: m.email, from: m.role, to: LEGACY_ROLE_TO_PRESET[m.role] ?? "RECRUITER",
        }))
        // A company must always have an Owner. When nobody maps to it, promote
        // the most senior unassigned member (an ADMIN, else the earliest).
        const anyOwner = mine.some((m) => m.roleId && LEGACY_ROLE_TO_PRESET[m.role] === "OWNER") || assign.some((a) => a.to === "OWNER")
        if (!anyOwner && assign.length > 0 && !mine.some((m) => m.roleId)) {
            const pick = assign.find((a) => a.from === "ADMIN") ?? assign[0]!
            pick.to = "OWNER"
            pick.promoted = true
        }
        if (createRoles.length || assign.length) out.push({ id: c.id, name: c.name, createRoles, assign })
    }
    return out
}

function report(p: CompanyPlan[]) {
    for (const c of p) {
        console.log(`  ${c.name}`)
        if (c.createRoles.length) console.log(`    + roles: ${c.createRoles.map((k) => ROLE_PRESETS[k].name).join(", ")}`)
        for (const a of c.assign) {
            console.log(`    ~ ${a.email}: ${a.from} -> ${ROLE_PRESETS[a.to].name}${a.promoted ? " (no founder: promoted so the company has an Owner)" : ""}`)
        }
    }
    const roles = p.reduce((n, c) => n + c.createRoles.length, 0)
    const members = p.reduce((n, c) => n + c.assign.length, 0)
    console.log(roles || members ? `\n${roles} role(s) to create, ${members} member(s) to assign.` : "\nNothing to change.")
}

async function main() {
    console.log(`Database: ${host()}\nMode:     ${apply ? "APPLY" : "preview (add --apply to write)"}\n`)
    const p = await plan()
    report(p)
    if (!apply) return
    for (const c of p) {
        for (const key of c.createRoles) {
            const preset = ROLE_PRESETS[key]
            await db.insert(companyRoles).values({
                companyId: c.id, name: preset.name, permissions: preset.permissions, isOwner: key === "OWNER", presetKey: key, updatedAt: new Date(),
            }).onConflictDoNothing()
        }
        const roleRows = await db.select({ id: companyRoles.id, presetKey: companyRoles.presetKey }).from(companyRoles).where(eq(companyRoles.companyId, c.id))
        const idFor = (k: RolePresetKey) => roleRows.find((r) => r.presetKey === k)?.id
        for (const a of c.assign) {
            const roleId = idFor(a.to)
            if (!roleId) throw new Error(`No ${a.to} role for ${c.name}`)
            await db.update(companyMembers).set({ roleId }).where(and(eq(companyMembers.id, a.memberId), isNull(companyMembers.roleId)))
        }
    }
    console.log("\nChecking again:\n")
    report(await plan())
}

main().then(() => process.exit(0), (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
