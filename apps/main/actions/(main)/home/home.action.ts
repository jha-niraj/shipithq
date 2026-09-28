"use server";

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import {
    db,
    users,
    userProjectV2Progress,
    studios,
    pathfinderGoals,
    pathfinderSubGoals,
    activityEntries,
    dailyActivities,
    mockVoiceSession,
    userStats,
} from "@repo/db";
import { eq, and, gte, desc, asc, inArray } from "drizzle-orm";

// ─── Monthly trend helpers ───────────────────────────────────────────────────
// The dashboard charts are all "last 6 months, one point per month". Rather than
// six grouped SQL queries, the rows we already fetch for the page are bucketed in
// memory - the volumes here are per-user and small (a year of daily activity is
// ≤365 rows), so the round trips cost more than the arithmetic.

const TREND_MONTHS = 6;

/** `[{ key: "2026-02", month: "Feb" }, …]` for the last N months, oldest first. */
function monthBuckets(count = TREND_MONTHS): Array<{ key: string; month: string }> {
    const now = new Date();
    const out: Array<{ key: string; month: string }> = [];
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            month: d.toLocaleDateString("en-US", { month: "short" }),
        });
    }
    return out;
}

function monthKey(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Bucket rows into the last N months and fold each bucket into a data point.
 * `getDate` picks the row's timestamp; `fold` accumulates a row into the point.
 */
function toMonthlySeries<TRow, TPoint extends Record<string, number>>(
    rows: TRow[],
    getDate: (row: TRow) => Date | string | null | undefined,
    empty: () => TPoint,
    fold: (point: TPoint, row: TRow) => void,
): Array<TPoint & { month: string }> {
    const buckets = monthBuckets();
    const byKey = new Map(buckets.map((b) => [b.key, empty()]));
    for (const row of rows) {
        const key = monthKey(getDate(row));
        if (!key) continue;
        const point = byKey.get(key);
        if (point) fold(point, row);
    }
    return buckets.map((b) => ({ ...(byKey.get(b.key) ?? empty()), month: b.month }));
}

// Get user's home page data
export async function getHomeData() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated" };
        }

        const userId = session.user.id;

        // Fetch all data in parallel for performance
        const [
            user,
            userStatsRow,
            inProgressProjects,
            recentStudios,
            pathfinderGoalRows,
            recentActivity,
            activityCalendar,
            recentMockSessions,
            projectProgressAll,
            mockSessionsAll,
            goalsAll,
            activityTypeRows,
        ] = await Promise.all([
            // User stats
            db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                    credits: true,
                    currentXp: true,
                    totalXp: true,
                    currentLevel: true,
                },
            }),

            // UserStats (streak info) - separate query
            db.query.userStats.findFirst({
                where: eq(userStats.userId, userId),
                columns: {
                    currentStreak: true,
                    longestStreak: true,
                    lastActivityDate: true,
                },
            }),

            // In-progress projects (limit 6)
            db.query.userProjectV2Progress.findMany({
                where: and(
                    eq(userProjectV2Progress.userId, userId),
                    eq(userProjectV2Progress.status, "IN_PROGRESS")
                ),
                with: {
                    project: {
                        columns: {
                            id: true,
                            slug: true,
                            title: true,
                            description: true,
                            difficulty: true,
                            generationType: true,
                        },
                    },
                },
                orderBy: desc(userProjectV2Progress.startedAt),
                limit: 6,
            }),

            // Recent studios (limit 6)
            db.query.studios.findMany({
                where: eq(studios.userId, userId),
                columns: {
                    id: true,
                    slug: true,
                    title: true,
                    description: true,
                    emoji: true,
                    updatedAt: true,
                },
                with: {
                    quizzes: { columns: { id: true } },
                    flashcardDecks: { columns: { id: true } },
                },
                orderBy: desc(studios.updatedAt),
                limit: 6,
            }),

            // Pathfinder goals
            db.query.pathfinderGoals.findMany({
                where: eq(pathfinderGoals.userId, userId),
                columns: {
                    id: true,
                    slug: true,
                    title: true,
                    category: true,
                    status: true,
                    progressPercent: true,
                    estimatedDays: true,
                    duration: true,
                    totalSubGoals: true,
                    completedSubGoals: true,
                },
                orderBy: desc(pathfinderGoals.createdAt),
                limit: 10,
            }),

            // Recent activity from ActivityEntry (limit 10)
            db.query.activityEntries.findMany({
                where: eq(activityEntries.userId, userId),
                orderBy: desc(activityEntries.createdAt),
                limit: 10,
            }),

            // Activity calendar data (last 365 days)
            db.query.dailyActivities.findMany({
                where: and(
                    eq(dailyActivities.userId, userId),
                    gte(dailyActivities.date, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!)
                ),
                columns: {
                    date: true,
                    totalXpEarned: true,
                    activitiesCount: true,
                },
                orderBy: asc(dailyActivities.date),
            }),

            // Recent mock voice sessions (limit 6)
            db.query.mockVoiceSession.findMany({
                where: eq(mockVoiceSession.userId, userId),
                with: {
                    mock: {
                        columns: {
                            id: true,
                            title: true,
                            category: true,
                        },
                    },
                },
                orderBy: desc(mockVoiceSession.createdAt),
                limit: 6,
            }),

            // ── Trend / total sources ──────────────────────────────────────
            // Unlimited but column-narrow: these back the dashboard counters and
            // the monthly charts, which need every row, not just the newest page.
            db.query.userProjectV2Progress.findMany({
                where: eq(userProjectV2Progress.userId, userId),
                columns: { status: true, startedAt: true, completedAt: true, createdAt: true },
            }),

            db.query.mockVoiceSession.findMany({
                where: eq(mockVoiceSession.userId, userId),
                columns: { createdAt: true },
            }),

            db.query.pathfinderGoals.findMany({
                where: eq(pathfinderGoals.userId, userId),
                columns: { status: true, createdAt: true, progressPercent: true },
            }),

            // Backs the "what you've been doing" breakdown. Deliberately a separate,
            // two-column query rather than reusing the 10-row activity FEED above -
            // a mix chart built from the last 10 entries describes this afternoon,
            // not the user's habits.
            db.query.activityEntries.findMany({
                where: eq(activityEntries.userId, userId),
                columns: { activityType: true, xpEarned: true },
                orderBy: desc(activityEntries.createdAt),
                limit: 500,
            }),
        ]);

        // Transform pathfinder goals for home
        const pathfinderGoalsForHome = pathfinderGoalRows.map((g) => ({
            id: g.id,
            slug: g.slug,
            title: g.title,
            category: g.category,
            status: g.status,
            progressPercent: g.progressPercent,
            estimatedDays: g.estimatedDays,
            duration: g.duration,
            totalSubGoals: g.totalSubGoals,
            completedSubGoals: g.completedSubGoals,
            lastActivityAt: null as Date | null,
            streakDays: 0,
            overview: null as string | null,
            createdAt: new Date(),
            startedAt: null as Date | null,
            completedAt: null as Date | null,
            groupId: null as string | null,
            studioId: null as string | null,
            focusAreas: [] as string[],
        }));

        // Transform data for client
        const transformedUser = user
            ? {
                ...user,
                currentStreak: userStatsRow?.currentStreak || 0,
                longestStreak: userStatsRow?.longestStreak || 0,
            }
            : null;

        // Transform activity calendar data
        const transformedCalendar = activityCalendar.map((day) => ({
            date: day.date,
            totalXp: day.totalXpEarned,
            activitiesCount: day.activitiesCount,
        }));

        // Transform activities for the client
        const transformedActivity = recentActivity.map((activity) => ({
            id: activity.id,
            type: activity.activityType,
            title: activity.title,
            description: activity.description,
            xpEarned: activity.xpEarned,
            createdAt: activity.createdAt,
        }));

        // Normalize studios to include _count shape for client compatibility
        // A study space is a Pathfinder step's notes; there is no /studio page, so it
        // opens on its goal's Notes tab at that step (plan/home HOME-9). A space with
        // no goal has nowhere to open and is left out.
        const studioLinks = recentStudios.length
            ? await db.select({ studioId: pathfinderSubGoals.studioId, subGoalId: pathfinderSubGoals.id, goalSlug: pathfinderGoals.slug })
                .from(pathfinderSubGoals)
                .innerJoin(pathfinderGoals, eq(pathfinderGoals.id, pathfinderSubGoals.goalId))
                .where(and(eq(pathfinderGoals.userId, userId), inArray(pathfinderSubGoals.studioId, recentStudios.map((s) => s.id))))
            : [];
        const linkFor = new Map(studioLinks.map((l) => [l.studioId, `/pathfinder/${l.goalSlug}?tab=notes&topic=${l.subGoalId}`]));
        const normalizedStudios = recentStudios.filter((s) => linkFor.has(s.id)).map(s => ({
            href: linkFor.get(s.id)!,
            id: s.id,
            slug: s.slug,
            title: s.title,
            description: s.description,
            emoji: s.emoji,
            updatedAt: s.updatedAt,
            _count: {
                quizzes: s.quizzes.length,
                flashcardDecks: s.flashcardDecks.length,
            },
        }));

        // ── Counters ──────────────────────────────────────────────────────
        const projectStats = {
            total: projectProgressAll.length,
            active: projectProgressAll.filter((p) => p.status === "IN_PROGRESS").length,
            completed: projectProgressAll.filter((p) => p.status === "COMPLETED").length,
        };
        const goalStats = {
            total: goalsAll.length,
            // Pathfinder's goal enum is ACTIVE/COMPLETED/… - not the IN_PROGRESS
            // the project-progress enum uses. Different tables, different vocab.
            active: goalsAll.filter((g) => g.status === "ACTIVE").length,
            completed: goalsAll.filter((g) => g.status === "COMPLETED").length,
            avgProgress: goalsAll.length
                ? Math.round(goalsAll.reduce((sum, g) => sum + (g.progressPercent ?? 0), 0) / goalsAll.length)
                : 0,
        };

        const totalXpEarned = activityCalendar.reduce((sum, d) => sum + d.totalXpEarned, 0);
        const activeDays = activityCalendar.filter((d) => d.activitiesCount > 0).length;

        // ── Monthly trends (last 6 months) ────────────────────────────────
        const monthlyActivity = toMonthlySeries(
            activityCalendar,
            (d) => d.date,
            () => ({ xp: 0, sessions: 0 }),
            (p, d) => { p.xp += d.totalXpEarned; p.sessions += d.activitiesCount; },
        );

        const monthlyProjects = toMonthlySeries(
            projectProgressAll,
            // Bucketed by when work STARTED, so "started" and "completed" on the same
            // chart describe the same cohort of months rather than two different axes.
            (p) => p.startedAt ?? p.createdAt,
            () => ({ started: 0, completed: 0 }),
            (point, row) => { point.started += 1; if (row.status === "COMPLETED") point.completed += 1; },
        );

        const monthlyMocks = toMonthlySeries(
            mockSessionsAll,
            (m) => m.createdAt,
            () => ({ sessions: 0 }),
            (p) => { p.sessions += 1; },
        );

        const monthlyGoals = toMonthlySeries(
            goalsAll,
            (g) => g.createdAt,
            () => ({ goals: 0, completed: 0 }),
            (point, row) => { point.goals += 1; if (row.status === "COMPLETED") point.completed += 1; },
        );

        // ── Activity mix (what the XP actually came from) ─────────────────
        const mixByType = new Map<string, { count: number; xp: number }>();
        for (const a of activityTypeRows) {
            const entry = mixByType.get(a.activityType) ?? { count: 0, xp: 0 };
            entry.count += 1;
            entry.xp += a.xpEarned;
            mixByType.set(a.activityType, entry);
        }
        const activityMix = [...mixByType.entries()]
            .map(([type, v]) => ({ type, ...v }))
            .sort((a, b) => b.count - a.count);

        return {
            success: true,
            data: {
                user: transformedUser,
                inProgressProjects,
                recentStudios: normalizedStudios,
                pathfinderGoals: pathfinderGoalsForHome,
                recentActivity: transformedActivity,
                activityCalendar: transformedCalendar,
                recentMockSessions: recentMockSessions || [],
                // Dashboard extras
                stats: {
                    projects: projectStats,
                    goals: goalStats,
                    studios: normalizedStudios.length,
                    mockSessions: mockSessionsAll.length,
                    totalXpEarned,
                    activeDays,
                },
                trends: {
                    activity: monthlyActivity,
                    projects: monthlyProjects,
                    mocks: monthlyMocks,
                    goals: monthlyGoals,
                },
                activityMix,
            },
        };
    } catch (error) {
        console.error("Error fetching home data:", error);
        return { success: false, error: "Failed to fetch home data" };
    }
}

// Get activities for a specific date (used by the activity calendar day view).
// `dateStr` is the graph's own yyyy-mm-dd, sent as is: parsing it into a Date and back
// shifted it by a day in any timezone ahead of UTC (plan/home HOME-4).
export async function getActivitiesByDate(dateStr: string) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { success: false, error: "Not authenticated", data: [] };
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return { success: false, error: "Bad date", data: [] };
        }
        const dateOnly = dateStr;

        const dailyActivity = await db.query.dailyActivities.findFirst({
            where: and(
                eq(dailyActivities.userId, session.user.id),
                eq(dailyActivities.date, dateOnly)
            ),
            columns: { id: true },
        });

        if (!dailyActivity) {
            return { success: true, data: [] };
        }

        const activities = await db.query.activityEntries.findMany({
            where: eq(activityEntries.dailyActivityId, dailyActivity.id),
            orderBy: desc(activityEntries.createdAt),
        });

        const transformed = activities.map((a) => ({
            id: a.id,
            type: a.activityType,
            title: a.title,
            description: a.description,
            xpEarned: a.xpEarned,
            timeSpent: a.timeSpent,
            createdAt: a.createdAt,
        }));

        return { success: true, data: transformed };
    } catch (error) {
        console.error("Error fetching activities by date:", error);
        return { success: false, error: "Failed to fetch activities", data: [] };
    }
}
