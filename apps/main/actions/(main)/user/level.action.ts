"use server"

import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { db, users, levels, xpTransactions, creditTransactions, userLevelProgress, withTransaction } from '@repo/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { LEVEL_CONFIG, calculateLevelFromXp } from '@/lib/levels';

// Initialize levels in database (call this once)
export async function initializeLevels() {
    try {
        const existingLevels = await db.select({ count: sql<number>`count(*)` }).from(levels);
        const count = Number(existingLevels[0]?.count ?? 0);

        if (count === 0) {
            await db.insert(levels).values(
                LEVEL_CONFIG.map(config => ({
                    level: config.level,
                    title: config.title,
                    xpRequired: config.xpRequired,
                    xpReward: config.xpReward,
                    creditsReward: config.creditsReward,
                    description: config.description,
                    icon: config.icon,
                    color: config.color
                }))
            );
            console.log('Levels initialized successfully');
        }

        return { success: true };
    } catch (error) {
        console.error('Error initializing levels:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// Add XP to user and handle level ups
export async function addXpToUser(userId: string, xpAmount: number, description: string, type: "EARN" | "SPEND" | "REWARD" | "BONUS" | "PENALTY" = "REWARD") {
    try {
        return await withTransaction(async (tx) => {
            // Get current user data
            const user = await tx.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { currentXp: true, totalXp: true, currentLevel: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Calculate new XP values
            const newCurrentXp = user.currentXp + xpAmount;
            const newTotalXp = user.totalXp + xpAmount;

            // Calculate what level user should be
            const levelInfo = calculateLevelFromXp(newTotalXp);
            const shouldLevelUp = levelInfo.currentLevel > user.currentLevel;

            // Update user XP and level
            const [_updatedUser] = await tx.update(users).set({
                currentXp: newCurrentXp,
                totalXp: newTotalXp,
                currentLevel: levelInfo.currentLevel
            }).where(eq(users.id, userId)).returning();

            // Create XP transaction
            await tx.insert(xpTransactions).values({
                userId,
                amount: xpAmount,
                description,
                type
            });

            // Handle level ups
            const levelUps = [];
            if (shouldLevelUp) {
                for (let level = user.currentLevel + 1; level <= levelInfo.currentLevel; level++) {
                    const levelConfig = LEVEL_CONFIG.find(l => l.level === level);
                    if (levelConfig && levelConfig.xpReward > 0) {
                        // Add level up bonus XP
                        await tx.update(users).set({
                            currentXp: sql`${users.currentXp} + ${levelConfig.xpReward}`,
                            totalXp: sql`${users.totalXp} + ${levelConfig.xpReward}`
                        }).where(eq(users.id, userId));

                        // Add credits reward if any
                        if (levelConfig.creditsReward > 0) {
                            await tx.update(users).set({
                                credits: sql`${users.credits} + ${levelConfig.creditsReward}`
                            }).where(eq(users.id, userId));

                            // Create credit transaction for level reward
                            await tx.insert(creditTransactions).values({
                                userId,
                                amount: levelConfig.creditsReward,
                                type: 'BONUS',
                                currency: 'INR',
                                description: `Level ${level} achievement bonus`
                            });
                        }

                        // Create XP transaction for level bonus
                        await tx.insert(xpTransactions).values({
                            userId,
                            amount: levelConfig.xpReward,
                            description: `Level ${level} achievement bonus`,
                            type: 'BONUS'
                        });

                        // Record level progress
                        await tx.insert(userLevelProgress).values({
                            userId,
                            level,
                            xpEarned: levelConfig.xpReward,
                            creditsEarned: levelConfig.creditsReward
                        });

                        levelUps.push({
                            level,
                            title: levelConfig.title,
                            xpReward: levelConfig.xpReward,
                            creditsReward: levelConfig.creditsReward,
                            icon: levelConfig.icon
                        });
                    }
                }
            }

            return {
                success: true,
                newCurrentXp: newCurrentXp + (levelUps.reduce((sum, l) => sum + l.xpReward, 0)),
                newTotalXp: newTotalXp + (levelUps.reduce((sum, l) => sum + l.xpReward, 0)),
                newLevel: levelInfo.currentLevel,
                levelUps,
                levelInfo: calculateLevelFromXp(newTotalXp + (levelUps.reduce((sum, l) => sum + l.xpReward, 0)))
            };
        });
    } catch (error) {
        console.error('Error adding XP to user:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Get user's level information
export async function getUserLevelInfo(userId?: string) {
    try {
        const session = await getSession(headers());
        const targetUserId = userId || session?.user?.id;

        if (!targetUserId) {
            throw new Error('User not authenticated');
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, targetUserId),
            columns: {
                currentXp: true,
                totalXp: true,
                currentLevel: true,
                credits: true,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get recent level progress history
        const levelProgressHistory = await db.query.userLevelProgress.findMany({
            where: eq(userLevelProgress.userId, targetUserId),
            with: {
                levelInfo: true
            },
            orderBy: (userLevelProgress, { desc }) => [desc(userLevelProgress.achievedAt)],
            limit: 3
        });

        // Ensure totalXp is set (fallback to currentXp for existing users)
        const totalXp = user.totalXp || user.currentXp;

        // Get level information
        const levelInfo = calculateLevelFromXp(totalXp);
        const currentLevelConfig = LEVEL_CONFIG.find(l => l.level === user.currentLevel);
        const nextLevelConfig = LEVEL_CONFIG.find(l => l.level === user.currentLevel + 1);

        return {
            success: true,
            data: {
                currentXp: user.currentXp,
                totalXp: totalXp,
                currentLevel: user.currentLevel,
                credits: user.credits,
                levelInfo,
                currentLevelConfig,
                nextLevelConfig,
                recentLevelUps: levelProgressHistory || []
            }
        };
    } catch (error) {
        console.error('Error getting user level info:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Convert XP to Credits (updated to work with currentXp)
export async function convertCurrentXpToCredits(xpAmount: number) {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            throw new Error('User not authenticated');
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { currentXp: true, credits: true }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.currentXp < xpAmount) {
            throw new Error('Insufficient current XP');
        }

        const creditsToAdd = Math.floor(xpAmount / 10); // 10 XP = 1 Credit

        const result = await withTransaction(async (tx) => {
            // Update user XP and credits
            const [updatedUser] = await tx.update(users).set({
                currentXp: sql`${users.currentXp} - ${xpAmount}`,
                credits: sql`${users.credits} + ${creditsToAdd}`
            }).where(eq(users.id, session.user.id!)).returning();

            // Create XP transaction (spending)
            await tx.insert(xpTransactions).values({
                userId: session.user.id!,
                amount: -xpAmount,
                description: `Converted ${xpAmount} XP to ${creditsToAdd} credits`,
                type: 'SPEND'
            });

            // Create credit transaction
            await tx.insert(creditTransactions).values({
                userId: session.user.id!,
                amount: creditsToAdd,
                type: 'BONUS',
                currency: 'INR',
                description: `Converted from ${xpAmount} XP`
            });

            return updatedUser;
        });

        return {
            success: true,
            newCurrentXp: result!.currentXp,
            newCredits: result!.credits,
            creditsGained: creditsToAdd
        };
    } catch (error) {
        console.error('Error converting XP to credits:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Get XP and Credits for navbar display
export async function fetchCurrentXpAndCredits() {
    try {
        const session = await getSession(headers());
        if (!session?.user?.id) {
            return { currentXp: 0, credits: 0 };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { currentXp: true, credits: true }
        });

        return {
            currentXp: user?.currentXp || 0,
            credits: user?.credits || 0
        };
    } catch (error) {
        console.error('Error fetching XP and credits:', error);
        return { currentXp: 0, credits: 0 };
    }
}

// Get all levels for reference
export async function getAllLevels() {
    try {
        const levelsData = await db.query.levels.findMany({
            where: eq(levels.isActive, true),
            orderBy: (levels, { asc }) => [asc(levels.level)]
        });

        return {
            success: true,
            data: levelsData.length > 0 ? levelsData : LEVEL_CONFIG
        };
    } catch (error) {
        console.error('Error fetching levels:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: LEVEL_CONFIG
        };
    }
}
