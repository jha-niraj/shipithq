"use server"

import { db, users, creditTransactions, creditRequests, payments, creditRequestStatusEnum, creditTypeEnum, paymentStatusEnum } from "@repo/db"
import { eq, and, or, ilike, inArray, count, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { checkModuleAccess } from "@/lib/module-access"
import type { AdminResponse } from "@/types/admin"
import { logAdminAudit } from "@/lib/audit-log"

interface PaginationParams {
    page?: number
    limit?: number
}

interface TransactionFilters {
    type?: string
    search?: string
}

interface PaymentFilters {
    status?: string
    search?: string
}

type PublicUser = { id: string; name: string | null; email: string; image: string | null }
type PublicUserBasic = { id: string; name: string | null; email: string }

// Get all credit transactions
export async function getAllTransactions(filters?: TransactionFilters, pagination?: PaginationParams): Promise<AdminResponse<{
    transactions: Array<typeof creditTransactions.$inferSelect & { user: PublicUser | null | undefined }>
    total: number
    pages: number
}>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const page = pagination?.page || 1
        const limit = pagination?.limit || 20
        const offset = (page - 1) * limit

        const whereConditions = []
        if (filters?.type && filters.type !== "all" && (creditTypeEnum.enumValues as readonly string[]).includes(filters.type)) {
            whereConditions.push(eq(creditTransactions.type, filters.type as (typeof creditTypeEnum.enumValues)[number]))
        }
        if (filters?.search) {
            const matchingUsers = await db.query.users.findMany({
                where: or(ilike(users.name, `%${filters.search}%`), ilike(users.email, `%${filters.search}%`)),
                columns: { id: true },
            })
            const userIds = matchingUsers.map((u) => u.id)
            whereConditions.push(
                userIds.length > 0
                    ? or(ilike(creditTransactions.id, `%${filters.search}%`), inArray(creditTransactions.userId, userIds))
                    : ilike(creditTransactions.id, `%${filters.search}%`)
            )
        }

        const [transactions, totalResult] = await Promise.all([
            db.query.creditTransactions.findMany({
                where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
                with: {
                    user: {
                        columns: { id: true, name: true, email: true, image: true }
                    }
                },
                orderBy: (t, { desc }) => [desc(t.createdAt)],
                limit,
                offset
            }),
            db.select({ total: count() }).from(creditTransactions).where(
                whereConditions.length > 0 ? and(...whereConditions) : undefined
            )
        ])
        const total = totalResult[0]?.total ?? 0

        return {
            success: true,
            data: {
                transactions,
                total,
                pages: Math.ceil(total / limit)
            },
        }
    } catch (error) {
        console.error("Get transactions error:", error)
        return { success: false, error: "Failed to fetch transactions" }
    }
}

// Get credit requests
export async function getCreditRequests(status?: string, pagination?: PaginationParams, search?: string): Promise<AdminResponse<{
    requests: Array<typeof creditRequests.$inferSelect & { user: PublicUser | null | undefined }>
    total: number
    pages: number
}>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const page = pagination?.page || 1
        const limit = pagination?.limit || 20
        const offset = (page - 1) * limit

        const whereConditions = []
        if (status && status !== "all") {
            whereConditions.push(eq(creditRequests.status, status as (typeof creditRequestStatusEnum.enumValues)[number]))
        }
        if (search) {
            const matchingUsers = await db.query.users.findMany({
                where: or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)),
                columns: { id: true },
            })
            const userIds = matchingUsers.map((u) => u.id)
            whereConditions.push(
                userIds.length > 0
                    ? or(ilike(creditRequests.id, `%${search}%`), inArray(creditRequests.userId, userIds))
                    : ilike(creditRequests.id, `%${search}%`)
            )
        }

        const [requests, totalResult] = await Promise.all([
            db.query.creditRequests.findMany({
                where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
                with: {
                    user: {
                        columns: { id: true, name: true, email: true, image: true }
                    }
                },
                orderBy: (t, { desc }) => [desc(t.createdAt)],
                limit,
                offset
            }),
            db.select({ total: count() }).from(creditRequests).where(
                whereConditions.length > 0 ? and(...whereConditions) : undefined
            )
        ])
        const total = totalResult[0]?.total ?? 0

        return {
            success: true,
            data: {
                requests,
                total,
                pages: Math.ceil(total / limit)
            },
        }
    } catch (error) {
        console.error("Get credit requests error:", error)
        return { success: false, error: "Failed to fetch credit requests" }
    }
}

// Approve credit request
export async function approveCreditRequest(requestId: string, amount: number): Promise<AdminResponse<null>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "write")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const adminRecord = accessCheck.adminAccess

        const request = await db.query.creditRequests.findFirst({
            where: eq(creditRequests.id, requestId),
            with: { user: true }
        })

        if (!request) {
            return { success: false, error: "Request not found" }
        }
        // The account was deleted since the request was made (its user id is set null).
        if (!request.userId) {
            return { success: false, error: "This user deleted their account." }
        }

        // Update user credits
        await db.update(users)
            .set({ credits: sql`${users.credits} + ${amount}` })
            .where(eq(users.id, request.userId))

        // Update request status
        await db.update(creditRequests)
            .set({ status: "APPROVED" })
            .where(eq(creditRequests.id, requestId))

        // Create transaction
        await db.insert(creditTransactions).values({
            userId: request.userId,
            amount,
            currency: "INR",
            type: "BONUS",
            description: "Admin approved credit request",
        })

        await logAdminAudit({
            adminId: adminRecord.id,
            action: "UPDATE",
            module: "credits",
            resourceType: "CreditRequest",
            resourceId: requestId,
            description: `Approved credit request: ${amount} credits`,
        })

        revalidatePath("/credits/requests")

        return { success: true, data: null }
    } catch (error) {
        console.error("Approve credit request error:", error)
        return { success: false, error: "Failed to approve request" }
    }
}

// Reject credit request
export async function rejectCreditRequest(requestId: string, reason: string): Promise<AdminResponse<null>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "write")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const adminRecord = accessCheck.adminAccess

        await db.update(creditRequests)
            .set({ status: "REJECTED" })
            .where(eq(creditRequests.id, requestId))

        await logAdminAudit({
            adminId: adminRecord.id,
            action: "UPDATE",
            module: "credits",
            resourceType: "CreditRequest",
            resourceId: requestId,
            description: `Rejected credit request: ${reason}`,
        })

        revalidatePath("/credits/requests")

        return { success: true, data: null }
    } catch (error) {
        console.error("Reject credit request error:", error)
        return { success: false, error: "Failed to reject request" }
    }
}

// getCreditTransfers() and transferCredits() removed (2026-08-24, approved by
// Niraj): zero callers anywhere in the app, matching the already-dead
// /credits/transfers nav entry. Flagged during ADM-6, deleted here.

// Get payments
export async function getPayments(filters?: PaymentFilters, pagination?: PaginationParams): Promise<AdminResponse<{
    payments: Array<typeof payments.$inferSelect & { user: PublicUserBasic | null | undefined }>
    total: number
    pages: number
}>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const page = pagination?.page || 1
        const limit = pagination?.limit || 20
        const offset = (page - 1) * limit

        const whereConditions = []
        if (filters?.status && filters.status !== "all" && (paymentStatusEnum.enumValues as readonly string[]).includes(filters.status)) {
            whereConditions.push(eq(payments.status, filters.status as (typeof paymentStatusEnum.enumValues)[number]))
        }
        if (filters?.search) {
            const matchingUsers = await db.query.users.findMany({
                where: or(ilike(users.name, `%${filters.search}%`), ilike(users.email, `%${filters.search}%`)),
                columns: { id: true },
            })
            const userIds = matchingUsers.map((u) => u.id)
            whereConditions.push(
                userIds.length > 0
                    ? or(ilike(payments.orderId, `%${filters.search}%`), inArray(payments.userId, userIds))
                    : ilike(payments.orderId, `%${filters.search}%`)
            )
        }

        const [paymentList, totalResult] = await Promise.all([
            db.query.payments.findMany({
                where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
                with: {
                    user: { columns: { id: true, name: true, email: true } }
                },
                orderBy: (t, { desc }) => [desc(t.createdAt)],
                limit,
                offset
            }),
            db.select({ total: count() }).from(payments).where(
                whereConditions.length > 0 ? and(...whereConditions) : undefined
            )
        ])
        const total = totalResult[0]?.total ?? 0

        return {
            success: true,
            data: {
                payments: paymentList,
                total,
                pages: Math.ceil(total / limit)
            },
        }
    } catch (error) {
        console.error("Get payments error:", error)
        return { success: false, error: "Failed to fetch payments" }
    }
}

// Get credit stats
export async function getCreditStats(): Promise<AdminResponse<{
    totalCredits: number
    pendingRequests: number
    totalTransactions: number
    totalPayments: number
}>> {
    try {
        const accessCheck = await checkModuleAccess("credits", "read")
        if (!accessCheck.authorized) return { success: false, error: accessCheck.error }

        const [
            allUsers,
            pendingRequestsResult,
            totalTransactionsResult,
            totalPaymentsResult,
        ] = await Promise.all([
            db.query.users.findMany({ columns: { credits: true } }),
            db.select({ pendingRequests: count() }).from(creditRequests).where(eq(creditRequests.status, "PENDING")),
            db.select({ totalTransactions: count() }).from(creditTransactions),
            db.select({ totalPayments: count() }).from(payments).where(eq(payments.status, "COMPLETED")),
        ])
        const pendingRequests = pendingRequestsResult[0]?.pendingRequests ?? 0
        const totalTransactions = totalTransactionsResult[0]?.totalTransactions ?? 0
        const totalPayments = totalPaymentsResult[0]?.totalPayments ?? 0

        const totalCredits = allUsers.reduce((sum, u) => sum + (u.credits || 0), 0)

        return {
            success: true,
            data: {
                totalCredits,
                pendingRequests,
                totalTransactions,
                totalPayments,
            },
        }
    } catch (error) {
        console.error("Get credit stats error:", error)
        return { success: false, error: "Failed to fetch credit statistics" }
    }
}
