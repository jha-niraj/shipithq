"use server"

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, feedbacks, ideaVotes, withTransaction } from "@repo/db";
import {
    getPublicIdea, listPublicIdeas, votedIdeaIds, PUBLIC_IDEA_CATEGORIES,
    type IdeaCategory, type IdeaDetail, type IdeaRow, type IdeaSort, type IdeaStatus, type IdeaBoard,
} from "@repo/db/ideas";
import { getSession } from "@repo/auth";

/**
 * The app's Ideas board (plan/web/revamp REV-41). shipithq.com/ideas shows the same
 * board read-only and sends Post and Vote here.
 *
 * One vote per user per idea is enforced by the database (the `idea_vote` primary
 * key), not by the client: a second vote cannot be inserted, so a double click or a
 * replayed request changes nothing. `feedback.upvotes` moves in the same transaction
 * as the vote row, so the two never disagree.
 */

export type BoardIdea = IdeaRow & { voted: boolean };

export async function getIdeaBoard({ sort = "top", status }: { sort?: IdeaSort; status?: IdeaStatus } = {}): Promise<
    { success: true; board: IdeaBoard & { ideas: BoardIdea[] } } | { success: false; error: string }
> {
    try {
        const session = await getSession(headers());
        const board = await listPublicIdeas({ sort, status });
        const voted = session?.user?.id ? await votedIdeaIds(session.user.id, board.ideas.map((i) => i.id)) : new Set<string>();
        return { success: true, board: { ...board, ideas: board.ideas.map((i) => ({ ...i, voted: voted.has(i.id) })) } };
    } catch (error: unknown) {
        console.error("Loading ideas failed:", error);
        return { success: false, error: "Could not load ideas" };
    }
}

/** Ideas one user may post in 24 hours. A board, not a chat; this stops floods. */
const DAILY_IDEA_LIMIT = 5;

/** One idea for its page, with whether the viewer has voted (plan/ideas IDEA-5). */
export async function getIdea(id: string): Promise<{ success: true; idea: IdeaDetail & { voted: boolean } } | { success: false; error: string }> {
    try {
        const session = await getSession(headers());
        const idea = await getPublicIdea(id);
        if (!idea) return { success: false, error: "That idea is not on the board" };
        const voted = session?.user?.id ? (await votedIdeaIds(session.user.id, [id])).has(id) : false;
        return { success: true, idea: { ...idea, voted } };
    } catch (error: unknown) {
        console.error("Loading an idea failed:", error);
        return { success: false, error: "Could not load this idea" };
    }
}

export async function postIdea(input: { title: string; description: string; category: IdeaCategory | "BUG"; isAnonymous?: boolean }): Promise<
    { success: true; id: string; isPublic: boolean } | { success: false; error: string }
> {
    try {
        const session = await getSession(headers());
        const userId = session?.user?.id;
        if (!userId) return { success: false, error: "Sign in to post an idea" };

        const title = input.title.trim();
        const description = input.description.trim();
        if (title.length < 6 || title.length > 120) return { success: false, error: "Give it a title of 6 to 120 characters" };
        if (description.length < 10 || description.length > 2000) return { success: false, error: "Describe it in 10 to 2,000 characters" };
        const category = input.category === "BUG" || PUBLIC_IDEA_CATEGORIES.includes(input.category) ? input.category : "OTHER";

        const [recent] = await db
            .select({ n: sql<number>`count(*)::int` })
            .from(feedbacks)
            .where(and(eq(feedbacks.userId, userId), gte(feedbacks.createdAt, sql`now() - interval '24 hours'`)));
        if ((recent?.n ?? 0) >= DAILY_IDEA_LIMIT) {
            return { success: false, error: `You can post ${DAILY_IDEA_LIMIT} ideas a day. Try again tomorrow.` };
        }

        // Bugs go to the team's private queue: they can carry account details.
        const isPublic = category !== "BUG";
        const [row] = await db
            .insert(feedbacks)
            .values({ userId, title, description, category, isPublic, isAnonymous: !!input.isAnonymous, status: "UNDER_REVIEW" })
            .returning({ id: feedbacks.id });

        revalidatePath("/ideas");
        return { success: true, id: row!.id, isPublic };
    } catch (error: unknown) {
        console.error("Posting an idea failed:", error);
        return { success: false, error: "Could not post your idea" };
    }
}

/** Vote, or take the vote back. Returns the new count and whether the user now has a vote. */
export async function toggleIdeaVote(ideaId: string): Promise<
    { success: true; voted: boolean; votes: number } | { success: false; error: string }
> {
    try {
        const session = await getSession(headers());
        const userId = session?.user?.id;
        if (!userId) return { success: false, error: "Sign in to vote" };

        const result = await withTransaction(async (tx) => {
            const [idea] = await tx
                .select({ id: feedbacks.id, isPublic: feedbacks.isPublic })
                .from(feedbacks)
                .where(eq(feedbacks.id, ideaId))
                .for("update");
            if (!idea || !idea.isPublic) return null;

            const inserted = await tx
                .insert(ideaVotes)
                .values({ userId, feedbackId: ideaId })
                .onConflictDoNothing()
                .returning({ id: ideaVotes.feedbackId });

            if (inserted.length) {
                const [u] = await tx.update(feedbacks).set({ upvotes: sql`${feedbacks.upvotes} + 1` }).where(eq(feedbacks.id, ideaId)).returning({ votes: feedbacks.upvotes });
                return { voted: true, votes: u!.votes };
            }
            await tx.delete(ideaVotes).where(and(eq(ideaVotes.userId, userId), eq(ideaVotes.feedbackId, ideaId)));
            const [u] = await tx.update(feedbacks).set({ upvotes: sql`greatest(${feedbacks.upvotes} - 1, 0)` }).where(eq(feedbacks.id, ideaId)).returning({ votes: feedbacks.upvotes });
            return { voted: false, votes: u!.votes };
        });

        if (!result) return { success: false, error: "That idea is not on the board" };
        revalidatePath("/ideas");
        revalidatePath(`/ideas/${ideaId}`);
        return { success: true, ...result };
    } catch (error: unknown) {
        console.error("Voting failed:", error);
        return { success: false, error: "Could not record your vote" };
    }
}
