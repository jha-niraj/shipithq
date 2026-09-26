"use server"

import { headers } from "next/headers"
import { getSession } from "@repo/auth"
import { deleteAccount, planAccountDeletion } from "@/lib/account/delete"

/*
 * "Delete account" in Settings (plan/hiring-rounds HR-21). The person types
 * their email to confirm; the delete is final.
 */

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function me() {
    const session = await getSession(await headers())
    return session?.user?.id ?? null
}

/** What deleting would do, for the confirm dialog. */
export async function getDeletionPlan(): Promise<Result<{ sends: number; threads: number; files: number; ownerOf: string[] }>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first." }
    const plan = await planAccountDeletion(uid)
    return plan ? { success: true, data: { sends: plan.sends, threads: plan.threads, files: plan.files, ownerOf: plan.ownerOf } } : { success: false, error: "That account doesn't exist." }
}

export async function deleteMyAccount(confirmEmail: string): Promise<Result<null>> {
    const uid = await me()
    if (!uid) return { success: false, error: "Sign in first." }
    try {
        const plan = await planAccountDeletion(uid)
        if (!plan) return { success: false, error: "That account doesn't exist." }
        if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== plan.email.toLowerCase()) {
            return { success: false, error: "Type your account's email exactly to confirm." }
        }
        const r = await deleteAccount(uid)
        return r.ok ? { success: true, data: null } : { success: false, error: r.error }
    } catch (error: unknown) {
        console.error("deleteMyAccount:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not finish deleting the account. Try again, or contact support if it keeps failing." }
    }
}
