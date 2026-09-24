"use server";

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    creditTransactions,
    projectV2StandupConfigs,
    projectV2StandupEntries,
    withTransaction
} from "@repo/db";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toErrorMessage } from "@/lib/errors"
import { debitCredits, insufficientCreditsMessage } from '@/lib/credits/debit'

interface ActionResponse {
    success: boolean;
    data?: any;
    error?: string;
}

async function getCurrentUser() {
    const session = await getSession(headers());
    if (!session?.user?.email) throw new Error("Not authenticated");
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) throw new Error("User not found");
    return user;
}

async function deductCredits(userId: string, amount: number, description: string) {
    const result = await debitCredits({ userId, amount, description });
    // Same contract the callers already rely on: throw when the balance is short.
    // What changed is that the check and the write are now one guarded statement,
    // so two concurrent calls cannot both pass it.
    if (!result.ok) throw new Error(insufficientCreditsMessage(result));
}

// ========================================
// CHECK IF STANDUP CONFIG EXISTS
// ========================================

export async function checkStandupConfig(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const config = await db.query.projectV2StandupConfigs.findFirst({
            where: and(
                eq(projectV2StandupConfigs.userId, user.id),
                eq(projectV2StandupConfigs.projectId, projectId)
            ),
        });

        return {
            success: true,
            data: {
                exists: !!config,
                config: config || null,
            },
        };
    } catch (error: unknown) {
        console.error("[CHECK_STANDUP_CONFIG]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// CREATE STANDUP CONFIGURATION
// ========================================

interface StandupConfigInput {
    projectId: string;
    projectSlug: string;
    daysPerWeek: number;
    standupTime: string;
    durationMinutes: number;
    selectedDays: number[];
}

export async function createStandupConfig(input: StandupConfigInput): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        if (input.daysPerWeek < 4 || input.daysPerWeek > 7) {
            return { success: false, error: "Days per week must be between 4 and 7" };
        }

        if (input.durationMinutes < 5 || input.durationMinutes > 10) {
            return { success: false, error: "Duration must be between 5 and 10 minutes" };
        }

        if (input.selectedDays.length !== input.daysPerWeek) {
            return { success: false, error: "Selected days must match days per week" };
        }

        const existing = await db.query.projectV2StandupConfigs.findFirst({
            where: and(
                eq(projectV2StandupConfigs.userId, user.id),
                eq(projectV2StandupConfigs.projectId, input.projectId)
            ),
        });

        if (existing) {
            return { success: false, error: "Standup configuration already exists for this project" };
        }

        const creditsPerDay = 5;
        const weeklyCredits = input.daysPerWeek * creditsPerDay;

        if (user.credits < weeklyCredits) {
            return {
                success: false,
                error: `Insufficient credits. You need ${weeklyCredits} credits (${input.daysPerWeek} days × ${creditsPerDay} credits/day)`,
            };
        }

        const now = new Date();
        const currentDay = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - currentDay);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        await deductCredits(
            user.id,
            weeklyCredits,
            `Daily Standup - Week ${weekStart.toISOString().split('T')[0]!}`
        );

        const [config] = await db.insert(projectV2StandupConfigs).values({
            userId: user.id,
            projectId: input.projectId,
            daysPerWeek: input.daysPerWeek,
            standupTime: input.standupTime,
            durationMinutes: input.durationMinutes,
            selectedDays: input.selectedDays,
            creditsPerDay,
            weeklyCredits,
            currentWeekStart: weekStart,
            currentWeekEnd: weekEnd,
            isActive: true,
        }).returning();

        const entries = [];
        for (let i = 0; i < 7; i++) {
            const dayOfWeek = i;
            if (input.selectedDays.includes(dayOfWeek)) {
                const scheduledDate = new Date(weekStart);
                scheduledDate.setDate(weekStart.getDate() + i);

                const [hours, minutes] = input.standupTime.split(':');
                scheduledDate.setHours(parseInt(hours!), parseInt(minutes!), 0, 0);

                if (scheduledDate > now) {
                    entries.push({
                        configId: config!.id,
                        scheduledFor: scheduledDate,
                        status: "SCHEDULED",
                    });
                }
            }
        }

        if (entries.length > 0) {
            await db.insert(projectV2StandupEntries).values(entries);
        }

        await db.update(projectV2StandupConfigs)
            .set({ totalStandups: entries.length })
            .where(eq(projectV2StandupConfigs.id, config!.id));

        revalidatePath(`/projects/${input.projectSlug}`);
        revalidatePath(`/projects/${input.projectSlug}/workspace`);

        return {
            success: true,
            data: config,
        };

    } catch (error: unknown) {
        console.error("[CREATE_STANDUP_CONFIG]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// RENEW STANDUP FOR NEXT WEEK
// ========================================

export async function renewStandupConfig(projectId: string, projectSlug: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const config = await db.query.projectV2StandupConfigs.findFirst({
            where: and(
                eq(projectV2StandupConfigs.userId, user.id),
                eq(projectV2StandupConfigs.projectId, projectId)
            ),
        });

        if (!config) {
            return { success: false, error: "Standup configuration not found" };
        }

        if (!config.isActive) {
            return { success: false, error: "Standup configuration is not active" };
        }

        if (user.credits < config.weeklyCredits) {
            return {
                success: false,
                error: `Insufficient credits. You need ${config.weeklyCredits} credits for next week`,
            };
        }

        const nextWeekStart = new Date(config.currentWeekEnd);
        await deductCredits(
            user.id,
            config.weeklyCredits,
            `Daily Standup - Week ${nextWeekStart.toISOString().split('T')[0]!}`
        );

        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 7);

        await db.update(projectV2StandupConfigs)
            .set({
                currentWeekStart: nextWeekStart,
                currentWeekEnd: nextWeekEnd,
            })
            .where(eq(projectV2StandupConfigs.id, config.id));

        const entries = [];
        for (let i = 0; i < 7; i++) {
            const dayOfWeek = i;
            if (config.selectedDays.includes(dayOfWeek)) {
                const scheduledDate = new Date(nextWeekStart);
                scheduledDate.setDate(nextWeekStart.getDate() + i);

                const [hours, minutes] = config.standupTime.split(':');
                scheduledDate.setHours(parseInt(hours!), parseInt(minutes!), 0, 0);

                entries.push({
                    configId: config.id,
                    scheduledFor: scheduledDate,
                    status: "SCHEDULED",
                });
            }
        }

        if (entries.length > 0) {
            await db.insert(projectV2StandupEntries).values(entries);
        }

        await db.update(projectV2StandupConfigs)
            .set({ totalStandups: sql`${projectV2StandupConfigs.totalStandups} + ${entries.length}` })
            .where(eq(projectV2StandupConfigs.id, config.id));

        revalidatePath(`/projects/${projectSlug}`);

        return {
            success: true,
            data: { message: "Standup renewed for next week", config },
        };

    } catch (error: unknown) {
        console.error("[RENEW_STANDUP_CONFIG]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// GET UPCOMING STANDUPS
// ========================================

export async function getUpcomingStandups(projectId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const config = await db.query.projectV2StandupConfigs.findFirst({
            where: and(
                eq(projectV2StandupConfigs.userId, user.id),
                eq(projectV2StandupConfigs.projectId, projectId)
            ),
            with: {
                entries: {
                    where: and(
                        gte(projectV2StandupEntries.scheduledFor, new Date()),
                        inArray(projectV2StandupEntries.status, ["SCHEDULED", "SUBMITTED"])
                    ),
                    orderBy: (entries: any, { asc }: any) => [asc(entries.scheduledFor)],
                    limit: 10,
                },
            },
        });

        if (!config) {
            return { success: false, error: "No standup configuration found" };
        }

        return {
            success: true,
            data: {
                config,
                upcomingStandups: config.entries,
            },
        };

    } catch (error: unknown) {
        console.error("[GET_UPCOMING_STANDUPS]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// SUBMIT STANDUP ENTRY
// ========================================

interface StandupSubmission {
    entryId: string;
    whatDidYesterday: string;
    whatDoingToday: string;
    anyBlockers: string;
    recordingUrl?: string;
    durationSeconds?: number;
}

export async function submitStandup(input: StandupSubmission, projectSlug: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const entry = await db.query.projectV2StandupEntries.findFirst({
            where: eq(projectV2StandupEntries.id, input.entryId),
            with: { config: true },
        });

        if (!entry) {
            return { success: false, error: "Standup entry not found" };
        }

        if (entry.config.userId !== user.id) {
            return { success: false, error: "Unauthorized" };
        }

        if (entry.status === "SUBMITTED") {
            return { success: false, error: "Standup already submitted" };
        }

        await db.update(projectV2StandupEntries)
            .set({
                whatDidYesterday: input.whatDidYesterday,
                whatDoingToday: input.whatDoingToday,
                anyBlockers: input.anyBlockers,
                recordingUrl: input.recordingUrl,
                durationSeconds: input.durationSeconds,
                status: "SUBMITTED",
                submittedAt: new Date(),
            })
            .where(eq(projectV2StandupEntries.id, input.entryId));

        await db.update(projectV2StandupConfigs)
            .set({ completedStandups: sql`${projectV2StandupConfigs.completedStandups} + 1` })
            .where(eq(projectV2StandupConfigs.id, entry.configId));

        revalidatePath(`/projects/${projectSlug}`);

        return {
            success: true,
            data: { message: "Standup submitted successfully" },
        };

    } catch (error: unknown) {
        console.error("[SUBMIT_STANDUP]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}

// ========================================
// DEACTIVATE STANDUP CONFIG
// ========================================

export async function deactivateStandupConfig(projectId: string, projectSlug: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();

        const config = await db.query.projectV2StandupConfigs.findFirst({
            where: and(
                eq(projectV2StandupConfigs.userId, user.id),
                eq(projectV2StandupConfigs.projectId, projectId)
            ),
        });

        if (!config) {
            return { success: false, error: "Standup configuration not found" };
        }

        await db.update(projectV2StandupConfigs)
            .set({ isActive: false })
            .where(eq(projectV2StandupConfigs.id, config.id));

        await db.update(projectV2StandupEntries)
            .set({ status: "MISSED" })
            .where(and(
                eq(projectV2StandupEntries.configId, config.id),
                gte(projectV2StandupEntries.scheduledFor, new Date()),
                eq(projectV2StandupEntries.status, "SCHEDULED")
            ));

        revalidatePath(`/projects/${projectSlug}`);

        return {
            success: true,
            data: { message: "Standup configuration deactivated" },
        };

    } catch (error: unknown) {
        console.error("[DEACTIVATE_STANDUP_CONFIG]", error);
        return { success: false, error: toErrorMessage(error) };
    }
}
