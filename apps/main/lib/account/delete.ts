import "server-only"
import { and, eq, isNotNull } from "drizzle-orm"
import { db, companies, companyMembers, companyRoles, hiringSends, messageThreads, resumeFiles, users } from "@repo/db"
import { removeStudentHiringData } from "@repo/db/hiring-retention"
import { deleteFromR2, isPubliclyServableKey, R2_PUBLIC_PREFIX } from "@/lib/r2-client"

/*
 * Deleting an account (plan/hiring-rounds HR-21, Niraj 2026-09-26: a hard
 * delete). The user row goes; every table that references it either cascades
 * or keeps its record with the user set null (payments, credit ledgers,
 * catalogue rows: migration 0053). Before that, the student's sends are
 * withdrawn and their data removed at once, the companies' threads are closed
 * with "account deleted", and their files are removed from storage.
 */

export interface DeletionPlan {
    email: string
    ownerOf: string[]
    sends: number
    threads: number
    files: number
}

export async function planAccountDeletion(userId: string): Promise<DeletionPlan | null> {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId))
    if (!u) return null
    const [owned, sends, threads, files] = await Promise.all([
        db.select({ name: companies.name }).from(companyMembers)
            .innerJoin(companyRoles, eq(companyRoles.id, companyMembers.roleId))
            .innerJoin(companies, eq(companies.id, companyMembers.companyId))
            .where(and(eq(companyMembers.userId, userId), eq(companyRoles.isOwner, true))),
        db.select({ id: hiringSends.id }).from(hiringSends).where(eq(hiringSends.userId, userId)),
        db.select({ id: messageThreads.id }).from(messageThreads).where(eq(messageThreads.userId, userId)),
        db.select({ key: resumeFiles.r2Key }).from(resumeFiles).where(and(eq(resumeFiles.userId, userId), isNotNull(resumeFiles.r2Key))),
    ])
    return { email: u.email, ownerOf: owned.map((o) => o.name), sends: sends.length, threads: threads.length, files: files.length }
}

/** The avatar's storage key, when the image is one of ours. */
function avatarKey(image: string | null): string | null {
    if (!image) return null
    const i = image.indexOf(R2_PUBLIC_PREFIX)
    const key = i >= 0 ? image.slice(i) : null
    return key && isPubliclyServableKey(key) ? key : null
}

export async function deleteAccount(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const plan = await planAccountDeletion(userId)
    if (!plan) return { ok: false, error: "That account doesn't exist." }
    if (plan.ownerOf.length) {
        return { ok: false, error: `You're the Owner of ${plan.ownerOf.join(", ")} on ShipItHQ Hiring. Hand ownership to a teammate, or delete the company there, first.` }
    }
    const [u] = await db.select({ name: users.name, image: users.image }).from(users).where(eq(users.id, userId))
    const keys = (await db.select({ key: resumeFiles.r2Key }).from(resumeFiles).where(and(eq(resumeFiles.userId, userId), isNotNull(resumeFiles.r2Key)))).map((r) => r.key!)
    const avatar = avatarKey(u?.image ?? null)
    if (avatar) keys.push(avatar)

    await removeStudentHiringData(userId, u?.name ?? "A candidate")
    await db.delete(users).where(eq(users.id, userId))

    // Files last, best-effort: the account is already gone, and a leftover object is private or orphaned.
    for (const key of keys) await deleteFromR2(key).catch((e: unknown) => console.error("deleteAccount: R2", key, e))
    return { ok: true }
}
