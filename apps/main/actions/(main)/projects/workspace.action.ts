'use server'

import { getSession } from "@repo/auth";
import { headers } from "next/headers";
import { db, projectsV2, projectV2Files } from "@repo/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { toErrorMessage } from "@/lib/errors";
import {
    MAX_FILE_BYTES, MAX_FILES, MAX_PROJECT_BYTES, byteLength, normalizeWorkspacePath,
} from "@/lib/projects/workspace";

/*
 * A project's files (plan/project-workspace WS-1).
 *
 * Owner only, on every call: the owner of a project, or of their copy (PJ-18).
 * Anyone else gets "Project not found", the same answer a private project gives,
 * so these calls do not reveal which ids exist.
 */

export interface WorkspaceFile {
    path: string
    content: string
    isReadonly: boolean
    updatedAt: string
}

type Result<T = undefined> = { success: true; data: T } | { success: false; error: string; conflict?: WorkspaceFile }

const NOT_FOUND = { success: false as const, error: "Project not found" }

async function ownerOf(projectId: string): Promise<boolean> {
    const session = await getSession(headers());
    const userId = session?.user?.id;
    if (!userId) return false;
    const row = await db.query.projectsV2.findFirst({
        where: and(eq(projectsV2.id, projectId), eq(projectsV2.createdBy, userId)),
        columns: { id: true },
    });
    return !!row;
}

function toFile(row: typeof projectV2Files.$inferSelect): WorkspaceFile {
    return { path: row.path, content: row.content, isReadonly: row.isReadonly, updatedAt: row.updatedAt.toISOString() };
}

/** Total bytes of a project's files, optionally leaving one path out. */
async function projectBytes(projectId: string, except?: string): Promise<number> {
    const [row] = await db
        .select({ bytes: sql<number>`coalesce(sum(octet_length(${projectV2Files.content})), 0)::int` })
        .from(projectV2Files)
        .where(except
            ? and(eq(projectV2Files.projectId, projectId), ne(projectV2Files.path, except))
            : eq(projectV2Files.projectId, projectId));
    return row?.bytes ?? 0;
}

export async function listFiles(projectId: string): Promise<Result<WorkspaceFile[]>> {
    try {
        if (!(await ownerOf(projectId))) return NOT_FOUND;
        const rows = await db.query.projectV2Files.findMany({
            where: eq(projectV2Files.projectId, projectId),
            orderBy: (f, { asc }) => [asc(f.path)],
        });
        return { success: true, data: rows.map(toFile) };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

/**
 * Save a file's content.
 *
 * `expectedUpdatedAt` is the version the editor last saw. If the row has moved
 * on since (another tab saved it), nothing is written and the current version
 * comes back as `conflict`, so the editor can say so instead of silently
 * overwriting the other tab's work.
 */
export async function saveFile(
    projectId: string,
    rawPath: string,
    content: string,
    expectedUpdatedAt?: string,
): Promise<Result<WorkspaceFile>> {
    try {
        const path = normalizeWorkspacePath(rawPath);
        if (!path) return { success: false, error: "That is not a valid file path." };
        if (byteLength(content) > MAX_FILE_BYTES) return { success: false, error: "That file is too large to save (200 KB limit)." };
        if (!(await ownerOf(projectId))) return NOT_FOUND;

        const existing = await db.query.projectV2Files.findFirst({
            where: and(eq(projectV2Files.projectId, projectId), eq(projectV2Files.path, path)),
        });
        if (!existing) return { success: false, error: "That file no longer exists." };
        if (existing.isReadonly) return { success: false, error: "This file is provided with the task and cannot be edited." };
        if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
            return { success: false, error: "This file was changed in another tab.", conflict: toFile(existing) };
        }
        if ((await projectBytes(projectId, path)) + byteLength(content) > MAX_PROJECT_BYTES) {
            return { success: false, error: "The project is over its 5 MB limit." };
        }

        const [row] = await db.update(projectV2Files)
            .set({ content, updatedAt: new Date() })
            .where(eq(projectV2Files.id, existing.id))
            .returning();
        return { success: true, data: toFile(row!) };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function createFile(projectId: string, rawPath: string, content = ""): Promise<Result<WorkspaceFile>> {
    try {
        const path = normalizeWorkspacePath(rawPath);
        if (!path) return { success: false, error: "That is not a valid file path." };
        if (byteLength(content) > MAX_FILE_BYTES) return { success: false, error: "That file is too large (200 KB limit)." };
        if (!(await ownerOf(projectId))) return NOT_FOUND;

        const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(projectV2Files).where(eq(projectV2Files.projectId, projectId));
        if ((count?.n ?? 0) >= MAX_FILES) return { success: false, error: `A project can hold ${MAX_FILES} files.` };
        if ((await projectBytes(projectId)) + byteLength(content) > MAX_PROJECT_BYTES) {
            return { success: false, error: "The project is over its 5 MB limit." };
        }

        // The unique (project, path) index refuses a duplicate; say so plainly.
        const [row] = await db.insert(projectV2Files)
            .values({ projectId, path, content })
            .onConflictDoNothing()
            .returning();
        if (!row) return { success: false, error: "A file with that name already exists." };
        return { success: true, data: toFile(row) };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function renameFile(projectId: string, rawFrom: string, rawTo: string): Promise<Result<WorkspaceFile>> {
    try {
        const from = normalizeWorkspacePath(rawFrom);
        const to = normalizeWorkspacePath(rawTo);
        if (!from || !to) return { success: false, error: "That is not a valid file path." };
        if (!(await ownerOf(projectId))) return NOT_FOUND;

        const existing = await db.query.projectV2Files.findFirst({
            where: and(eq(projectV2Files.projectId, projectId), eq(projectV2Files.path, from)),
        });
        if (!existing) return { success: false, error: "That file no longer exists." };
        if (existing.isReadonly) return { success: false, error: "This file is provided with the task and cannot be renamed." };

        const clash = await db.query.projectV2Files.findFirst({
            where: and(eq(projectV2Files.projectId, projectId), eq(projectV2Files.path, to)),
            columns: { id: true },
        });
        if (clash) return { success: false, error: "A file with that name already exists." };

        const [row] = await db.update(projectV2Files)
            .set({ path: to, updatedAt: new Date() })
            .where(eq(projectV2Files.id, existing.id))
            .returning();
        return { success: true, data: toFile(row!) };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}

export async function deleteFile(projectId: string, rawPath: string): Promise<Result> {
    try {
        const path = normalizeWorkspacePath(rawPath);
        if (!path) return { success: false, error: "That is not a valid file path." };
        if (!(await ownerOf(projectId))) return NOT_FOUND;

        const deleted = await db.delete(projectV2Files)
            .where(and(
                eq(projectV2Files.projectId, projectId),
                eq(projectV2Files.path, path),
                eq(projectV2Files.isReadonly, false),
            ))
            .returning({ id: projectV2Files.id });
        if (deleted.length === 0) return { success: false, error: "That file cannot be deleted." };
        return { success: true, data: undefined };
    } catch (error: unknown) {
        return { success: false, error: toErrorMessage(error) };
    }
}
