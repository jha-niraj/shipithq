"use server"

import { db, feedbacks, recentActivities, users, rewards, creditTransactions } from "@repo/db";
import { getSession } from '@repo/auth';
import { headers } from 'next/headers';
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { addXpToUser } from "./level.action";
import { toggleIdeaVote } from "../ideas/ideas.action";


export async function submitFeedback({
    title,
    description,
    category,
    imageUrl,
}: {
    title: string;
    description: string;
    category: "BUG" | "FEATURE" | "UI" | "OTHER";
    imageUrl?: string;
}) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return null
        }

        const [feedback] = await db.insert(feedbacks).values({
            title,
            description,
            category,
            userId: session.user.id,
            status: "UNDER_REVIEW",
            ...(imageUrl && { adminNotes: imageUrl }),
        }).returning()

        await db.insert(recentActivities).values({
            userId: session.user.id,
            activityType: "FEEDBACK_SUBMITTED",
            description: `Submitted feedback: ${title}`,
        })

        // Use the new level system for XP rewards
        await addXpToUser(
            session.user.id,
            25,
            `Submitted feedback: ${title}`,
            'REWARD'
        );

        revalidatePath("/feedback")
        return feedback
    } catch (error) {
        console.error("Error submitting feedback:", error)
        return null
    }
}

export async function getFeedbackByStatus(status: "UNDER_REVIEW" | "PLANNED" | "COMPLETED") {
    console.log("status: ", status);

    try {
        const feedbackList = await db.query.feedbacks.findMany({
            where: eq(feedbacks.status, status),
            orderBy: (feedbacks, { desc }) => [desc(feedbacks.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        })

        return feedbackList;
    } catch (error) {
        console.error("Error fetching feedback:", error)
        throw error
    }
}

// Update feedback status
export async function updateFeedbackStatus(id: string, status: "UNDER_REVIEW" | "PLANNED" | "COMPLETED") {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            throw new Error("Not authenticated")
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { role: true },
        })

        if (user?.role !== 'Admin') {
            throw new Error("Not authorized")
        }

        const [feedback] = await db.update(feedbacks).set({
            status
        }).where(eq(feedbacks.id, id)).returning()

        revalidatePath("/feedback")
        return feedback
    } catch (error) {
        console.error("Error updating feedback status:", error)
        throw error
    }
}

// Upvote feedback. Delegates to the Ideas vote, which allows one vote per user
// (plan/web/revamp REV-41); this used to add 1 on every call.
export async function upvoteFeedback(id: string) {
    const r = await toggleIdeaVote(id)
    if (!r.success) throw new Error(r.error)
    return r
}

// Assign reward to feedback
export async function assignReward(feedbackId: string, rewardData: any) {
    const session = await getSession(headers());
    if (!session?.user?.id) {
        throw new Error("You must be logged in to assign rewards");
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { role: true }
    });

    if (user?.role !== "Admin") {
        throw new Error("Only admins can assign rewards");
    }

    try {
        const existingReward = await db.query.rewards.findFirst({
            where: eq(rewards.feedbackId, feedbackId)
        });

        if (existingReward) {
            throw new Error("Reward already assigned to this feedback");
        }

        const feedback = await db.query.feedbacks.findFirst({
            where: eq(feedbacks.id, feedbackId),
            with: { user: true }
        });

        if (!feedback) {
            throw new Error("Feedback not found");
        }

        // Create reward record
        const [reward] = await db.insert(rewards).values({
            feedbackId,
            type: rewardData.type,
            credits: rewardData.type === "credits" ? rewardData.credits : 0,
            xp: rewardData.type === "xp" ? rewardData.xp : 0,
            description: `Received ${rewardData.type === "credits" ? rewardData.credits + " credits" : rewardData.xp + " XP"} for feedback`,
        }).returning();

        // Update user's rewards
        if (rewardData.type === "credits") {
            await db.update(users).set({
                credits: sql`${users.credits} + ${rewardData.credits}`
            }).where(eq(users.id, feedback.userId));

            await db.insert(creditTransactions).values({
                userId: feedback.userId,
                amount: rewardData.credits,
                type: 'REWARD',
                currency: 'INR',
                description: `Received ${rewardData.type === "credits" ? rewardData.credits + " credits" : rewardData.xp + " XP"} for feedback`,
            });
        } else if (rewardData.type === "xp") {
            // Use the new level system for XP rewards
            await addXpToUser(
                feedback.userId,
                rewardData.xp,
                `Received ${rewardData.xp} XP for feedback`,
                'REWARD'
            );
        }

        return { success: true, reward };
    } catch (error) {
        console.error("Error assigning reward:", error);
        throw error;
    }
}

// Verify feedback (for the isVerified field)
export async function verifyFeedback(id: string, isVerified: boolean) {
    const session = await getSession(headers());

    if (!session) {
        throw new Error("You must be logged in to verify feedback.");
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id)
    });

    if (!user || user.role !== 'Admin') {
        throw new Error("Only admins can verify feedback.");
    }

    try {
        // Note: isVerified field not in Drizzle schema; update adminNotes as a workaround
        const [updatedFeedback] = await db.update(feedbacks).set({
            adminNotes: isVerified ? "verified" : null
        }).where(eq(feedbacks.id, id)).returning();

        revalidatePath('/feedback');
        return updatedFeedback;
    } catch (error) {
        console.error("Error verifying feedback:", error);
        throw error;
    }
}
