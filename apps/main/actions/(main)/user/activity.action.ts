"use server";

import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { db, dailyActivities, activityEntries } from '@repo/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface DailyActivitySummary {
    date: Date;
    hasActivity: boolean;
    totalXpEarned: number;
    totalCreditsEarned: number;
    totalTimeSpent: number;
    activitiesCount: number;
    isStreakDay: boolean;
    activities: Array<{
        id: string;
        activityType: string;
        title: string;
        description?: string;
        xpEarned: number;
        creditsEarned: number;
        timeSpent: number;
        metadata?: any;
        createdAt: Date;
    }>;
}

export interface StreakInfo {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
    streakDates: Date[];
}

// Recording lives in `recordActivity` (@repo/db/activity, plan/progress PRG-2), called
// by server code at each completion. The `trackActivity` action that was here could be
// called from any browser and added XP; it had no callers and is gone.

// Get daily activity summary for a specific date
export async function getDailyActivitySummary(date: Date): Promise<DailyActivitySummary | null> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            throw new Error('User not authenticated');
        }

        // Use local date to avoid timezone issues
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const targetDateStr = targetDate.toISOString().split('T')[0]!;

        const dailyActivity = await db.query.dailyActivities.findFirst({
            where: and(
                eq(dailyActivities.userId, session.user.id),
                eq(dailyActivities.date, targetDateStr)
            ),
            with: {
                activities: {
                    orderBy: [desc(activityEntries.createdAt)],
                },
            },
        });

        if (!dailyActivity) {
            return {
                date: targetDate,
                hasActivity: false,
                totalXpEarned: 0,
                totalCreditsEarned: 0,
                totalTimeSpent: 0,
                activitiesCount: 0,
                isStreakDay: false,
                activities: [],
            };
        }

        return {
            date: new Date(dailyActivity.date),
            hasActivity: dailyActivity.hasActivity,
            totalXpEarned: dailyActivity.totalXpEarned,
            totalCreditsEarned: dailyActivity.totalCreditsEarned,
            totalTimeSpent: dailyActivity.totalTimeSpent,
            activitiesCount: dailyActivity.activitiesCount,
            isStreakDay: dailyActivity.isStreakDay,
            activities: dailyActivity.activities.map((activity) => ({
                id: activity.id,
                activityType: activity.activityType,
                title: activity.title,
                description: activity.description || undefined,
                xpEarned: activity.xpEarned,
                creditsEarned: activity.creditsEarned,
                timeSpent: activity.timeSpent,
                metadata: activity.metadata,
                createdAt: activity.createdAt,
            })),
        };
    } catch (error) {
        console.error('Error getting daily activity summary:', error);
        return null;
    }
}

// Get activity calendar data for a date range
export async function getActivityCalendar(startDate: Date, endDate: Date) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        const startStr = startDate.toISOString().split('T')[0]!;
        const endStr = endDate.toISOString().split('T')[0]!;

        const activities = await db.query.dailyActivities.findMany({
            where: and(
                eq(dailyActivities.userId, session.user.id),
                gte(dailyActivities.date, startStr),
                lte(dailyActivities.date, endStr)
            ),
            with: {
                activities: {
                    columns: {
                        activityType: true,
                        title: true,
                        xpEarned: true,
                        creditsEarned: true,
                    },
                },
            },
            orderBy: (dailyActivities, { asc }) => [asc(dailyActivities.date)],
        });

        const calendarData = activities.map((activity) => ({
            date: new Date(activity.date),
            hasActivity: activity.hasActivity,
            totalXpEarned: activity.totalXpEarned,
            totalCreditsEarned: activity.totalCreditsEarned,
            totalTimeSpent: activity.totalTimeSpent,
            activitiesCount: activity.activitiesCount,
            isStreakDay: activity.isStreakDay,
            activities: activity.activities,
        }));

        return { success: true, data: calendarData };
    } catch (error) {
        console.error('Error getting activity calendar:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get activity calendar'
        };
    }
}

// Get user's current and longest streak information
export async function getUserStreak(): Promise<{ success: boolean; data?: StreakInfo; error?: string }> {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        // Get all activity dates for the user, ordered by date descending
        const activities = await db.query.dailyActivities.findMany({
            where: and(
                eq(dailyActivities.userId, session.user.id),
                eq(dailyActivities.hasActivity, true),
                eq(dailyActivities.isStreakDay, true)
            ),
            columns: { date: true },
            orderBy: (dailyActivities, { desc }) => [desc(dailyActivities.date)],
        });

        if (activities.length === 0) {
            return {
                success: true,
                data: {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActivityDate: null,
                    streakDates: [],
                }
            };
        }

        const dates = activities.map((a) => {
            const d = new Date(a.date);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        });
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const yesterday = new Date(todayLocal);
        yesterday.setDate(yesterday.getDate() - 1);

        let currentStreak = 0;

        // Check if there's activity today or yesterday
        const todayActivity = dates.find((date: Date) => date.getTime() === todayLocal.getTime());
        const yesterdayActivity = dates.find((date: Date) => date.getTime() === yesterday.getTime());

        if (todayActivity) {
            // Start counting from today
            currentStreak = 1;
            const checkDate = new Date(todayLocal);
            checkDate.setDate(checkDate.getDate() - 1);

            // Count consecutive days backwards
            for (let i = 1; i < dates.length; i++) {
                if (dates[i]?.getTime() === checkDate.getTime()) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        } else if (yesterdayActivity) {
            // Start counting from yesterday
            currentStreak = 1;
            const checkDate = new Date(yesterday);
            checkDate.setDate(checkDate.getDate() - 1);

            // Count consecutive days backwards
            for (let i = dates.findIndex((d: Date) => d.getTime() === yesterday.getTime()) + 1; i < dates.length; i++) {
                if (dates[i]?.getTime() === checkDate.getTime()) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        } else {
            // No recent activity, current streak is 0
            currentStreak = 0;
        }

        // Calculate longest streak
        const longestStreak = calculateLongestStreak(dates);

        return {
            success: true,
            data: {
                currentStreak,
                longestStreak: Math.max(currentStreak, longestStreak),
                lastActivityDate: dates[0] || null,
                streakDates: dates,
            }
        };
    } catch (error) {
        console.error('Error getting user streak:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get streak data'
        };
    }
}


// Calculate longest streak from dates array
function calculateLongestStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i-1] || new Date());
        const nextDate = new Date(dates[i] || new Date());

        // Check if dates are consecutive (previous day)
        currentDate.setDate(currentDate.getDate() - 1);

        if (currentDate.getTime() === nextDate.getTime()) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return longestStreak;
}

// Get recent activities for dashboard
export async function getRecentActivities(limit: number = 10) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        const activities = await db.query.activityEntries.findMany({
            where: eq(activityEntries.userId, session.user.id),
            orderBy: [desc(activityEntries.createdAt)],
            limit,
        });

        return { success: true, data: activities };
    } catch (error) {
        console.error('Error getting recent activities:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get recent activities'
        };
    }
}

// Get activity stats for dashboard
export async function getActivityStats() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]!;

        const [totalActivitiesResult, last30DaysResult, streakInfo] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(activityEntries).where(eq(activityEntries.userId, session.user.id)),
            db.query.dailyActivities.findMany({
                where: and(
                    eq(dailyActivities.userId, session.user.id),
                    gte(dailyActivities.date, thirtyDaysAgoStr)
                ),
                columns: {
                    totalXpEarned: true,
                    totalCreditsEarned: true,
                    totalTimeSpent: true,
                    activitiesCount: true,
                }
            }),
            getUserStreak()
        ]);

        const totalActivities = Number(totalActivitiesResult[0]?.count ?? 0);

        const last30DaysStats = last30DaysResult.reduce(
            (acc: any, day: any) => ({
                totalXp: acc.totalXp + day.totalXpEarned,
                totalCredits: acc.totalCredits + day.totalCreditsEarned,
                totalTime: acc.totalTime + day.totalTimeSpent,
                totalActivities: acc.totalActivities + day.activitiesCount,
            }),
            { totalXp: 0, totalCredits: 0, totalTime: 0, totalActivities: 0 }
        );

        return {
            success: true,
            data: {
                totalActivitiesAllTime: totalActivities,
                last30Days: last30DaysStats,
                streak: streakInfo,
            }
        };
    } catch (error) {
        console.error('Error getting activity stats:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get activity stats'
        };
    }
}
