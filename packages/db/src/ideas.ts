import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import { feedbacks, ideaVotes, users } from "./schema";
import type { IdeaAuthor, IdeaCategory, IdeaSort, IdeaStatus } from "./ideas-types";

export * from "./ideas-types";

/**
 * The public Ideas board, read by both boards (plan/web/revamp REV-41, REV-42):
 * shipithq.com/ideas (read-only, static with ISR) and app.shipithq.com/ideas
 * (signed in, with votes).
 *
 * ── What leaves the database ──
 * No user id, name, email or image. An idea is attributed to "team" (posted by an
 * Admin) or "community", and nothing else. The web board is not allowed user
 * records at all (apps/web/CLAUDE.md), and the app board does not need them.
 *
 * Only `is_public` rows are returned. BUG reports are never public.
 */

const STATUS_FROM_DB = { UNDER_REVIEW: "open", PLANNED: "planned", IN_PROGRESS: "building", COMPLETED: "shipped" } as const;
const STATUS_TO_DB = { open: "UNDER_REVIEW", planned: "PLANNED", building: "IN_PROGRESS", shipped: "COMPLETED" } as const;

export interface IdeaRow {
    id: string;
    title: string;
    description: string;
    category: IdeaCategory | "BUG";
    status: IdeaStatus;
    votes: number;
    /** Kept for existing callers; same as author.kind === "team". */
    byTeam: boolean;
    author: IdeaAuthor;
    /** A public team update exists (shown as a marker on cards). */
    hasUpdate: boolean;
    createdAt: Date;
}

/** One idea with its page's extras (plan/ideas IDEA-3). */
export interface IdeaDetail extends IdeaRow {
    teamUpdate: string | null;
    shippedHref: string | null;
    plannedAt: Date | null;
    startedAt: Date | null;
    shippedAt: Date | null;
}

export interface IdeaBoard {
    ideas: IdeaRow[];
    counts: Record<IdeaStatus | "all", number>;
}

/*
 * The columns every read selects. Only a first name and an avatar ever leave the
 * database, and only when the poster did not ask to be anonymous; admins show as the
 * team. No id, email or last name (apps/web/CLAUDE.md).
 */
const ROW = {
    id: feedbacks.id,
    title: feedbacks.title,
    description: feedbacks.description,
    category: feedbacks.category,
    status: feedbacks.status,
    votes: feedbacks.upvotes,
    isAnonymous: feedbacks.isAnonymous,
    teamUpdate: feedbacks.teamUpdate,
    createdAt: feedbacks.createdAt,
    isAdmin: sql<boolean>`${users.role} = 'Admin'`,
    firstName: sql<string | null>`nullif(split_part(coalesce(${users.name}, ''), ' ', 1), '')`,
    image: users.image,
};

type RawRow = {
    id: string; title: string; description: string; category: IdeaCategory | "BUG";
    status: keyof typeof STATUS_FROM_DB; votes: number; isAnonymous: boolean; teamUpdate: string | null;
    createdAt: Date; isAdmin: boolean; firstName: string | null; image: string | null;
};

function toRow(r: RawRow): IdeaRow {
    const author: IdeaAuthor = r.isAdmin
        ? { name: "ShipItHQ team", image: null, kind: "team" }
        : r.isAnonymous || !r.firstName
            ? { name: "Community", image: null, kind: "anonymous" }
            : { name: r.firstName, image: r.image ?? null, kind: "person" };
    return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        status: STATUS_FROM_DB[r.status],
        votes: r.votes,
        byTeam: !!r.isAdmin,
        author,
        hasUpdate: !!r.teamUpdate?.trim(),
        createdAt: r.createdAt,
    };
}

/** How many public ideas are at each status, and in all. */
export async function countPublicIdeas(): Promise<IdeaBoard["counts"]> {
    const countRows = await db
        .select({ status: feedbacks.status, n: sql<number>`count(*)::int` })
        .from(feedbacks)
        .where(eq(feedbacks.isPublic, true))
        .groupBy(feedbacks.status);
    const counts: IdeaBoard["counts"] = { all: 0, open: 0, planned: 0, building: 0, shipped: 0 };
    for (const c of countRows) {
        counts[STATUS_FROM_DB[c.status]] += c.n;
        counts.all += c.n;
    }
    return counts;
}

/** Public ideas, sorted, optionally filtered by status, with the per-status counts for the tabs. */
export async function listPublicIdeas({ sort = "top", status }: { sort?: IdeaSort; status?: IdeaStatus } = {}): Promise<IdeaBoard> {
    const where = status
        ? and(eq(feedbacks.isPublic, true), eq(feedbacks.status, STATUS_TO_DB[status]))
        : eq(feedbacks.isPublic, true);

    const [rows, counts] = await Promise.all([
        db
            .select(ROW)
            .from(feedbacks)
            .innerJoin(users, eq(users.id, feedbacks.userId))
            .where(where)
            .orderBy(...(sort === "top" ? [desc(feedbacks.upvotes), desc(feedbacks.createdAt)] : [desc(feedbacks.createdAt)]))
            .limit(200),
        countPublicIdeas(),
    ]);

    return { ideas: (rows as RawRow[]).map(toRow), counts };
}

/** One public idea for its page, or null when it does not exist or is hidden. */
export async function getPublicIdea(id: string): Promise<IdeaDetail | null> {
    const [r] = await db
        .select({
            ...ROW,
            shippedHref: feedbacks.shippedHref,
            plannedAt: feedbacks.plannedAt,
            startedAt: feedbacks.startedAt,
            shippedAt: feedbacks.shippedAt,
        })
        .from(feedbacks)
        .innerJoin(users, eq(users.id, feedbacks.userId))
        .where(and(eq(feedbacks.id, id), eq(feedbacks.isPublic, true)))
        .limit(1);
    if (!r) return null;
    return {
        ...toRow(r as RawRow),
        teamUpdate: r.teamUpdate?.trim() || null,
        shippedHref: r.shippedHref?.trim() || null,
        plannedAt: r.plannedAt,
        startedAt: r.startedAt,
        shippedAt: r.shippedAt,
    };
}

/** Which of these ideas the user has voted for. */
export async function votedIdeaIds(userId: string, ideaIds: string[]): Promise<Set<string>> {
    if (!ideaIds.length) return new Set();
    const rows = await db
        .select({ id: ideaVotes.feedbackId })
        .from(ideaVotes)
        .where(and(eq(ideaVotes.userId, userId), inArray(ideaVotes.feedbackId, ideaIds)));
    return new Set(rows.map((r) => r.id));
}
