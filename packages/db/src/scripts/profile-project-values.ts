/**
 * Respell portfolio project values to one form, e.g. "Public" -> "PUBLIC" (plan/profile PRF-7).
 *
 * Covers status, visibility, type, link type and media type; see `../profile-values.ts`.
 *
 *   pnpm script profile-project-values            preview: what would change, nothing written
 *   pnpm script profile-project-values --apply    write it, then preview again (should be empty)
 *
 * Preview first, always (Niraj, 2026-09-24). A value this script does not recognise
 * is listed as "left alone" and never rewritten: `project_type` in particular also
 * holds custom text a user typed.
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { portfolioProjects, projectLinks, projectMedia } from "../schema";
import {
    normalizeProjectLinkType, normalizeProjectMediaType, normalizeProjectStatus,
    normalizeProjectType, normalizeProjectVisibility,
} from "../profile-values";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

type Change = { table: "portfolio_project" | "project_link" | "project_media"; id: string; column: string; from: string; to: string };
type Unknown = { table: string; id: string; column: string; value: string };

async function plan(): Promise<{ changes: Change[]; unknown: Unknown[]; rows: number }> {
    const changes: Change[] = [];
    const unknown: Unknown[] = [];

    const projects = await db
        .select({
            id: portfolioProjects.id, status: portfolioProjects.status,
            visibility: portfolioProjects.visibility, projectType: portfolioProjects.projectType,
        })
        .from(portfolioProjects);
    const links = await db.select({ id: projectLinks.id, linkType: projectLinks.linkType }).from(projectLinks);
    const media = await db.select({ id: projectMedia.id, mediaType: projectMedia.mediaType }).from(projectMedia);

    const check = (
        table: Change["table"], id: string, column: string, value: string,
        normalize: (v: string) => string | null, reportUnknown: boolean,
    ) => {
        const to = normalize(value);
        if (to === null) {
            if (reportUnknown) unknown.push({ table, id, column, value });
            return;
        }
        if (to !== value) changes.push({ table, id, column, from: value, to });
    };

    for (const p of projects) {
        check("portfolio_project", p.id, "status", p.status, normalizeProjectStatus, true);
        check("portfolio_project", p.id, "visibility", p.visibility, normalizeProjectVisibility, true);
        // Custom project types are legitimate; only presets are respelled, and the
        // rest are not worth a warning line each.
        check("portfolio_project", p.id, "project_type", p.projectType, normalizeProjectType, false);
    }
    for (const l of links) check("project_link", l.id, "link_type", l.linkType, normalizeProjectLinkType, true);
    for (const m of media) check("project_media", m.id, "media_type", m.mediaType, normalizeProjectMediaType, true);

    return { changes, unknown, rows: projects.length + links.length + media.length };
}

function print({ changes, unknown, rows }: Awaited<ReturnType<typeof plan>>): number {
    for (const c of changes) console.log(`  ~ ${c.table} ${c.id}  ${c.column}: "${c.from}" -> "${c.to}"`);
    for (const u of unknown) console.log(`  ! ${u.table} ${u.id}  ${u.column}: "${u.value}" not recognised, left alone`);
    console.log(`\n  ${rows} rows read: ${changes.length} value${changes.length === 1 ? "" : "s"} to change, ${unknown.length} left alone.`);
    return changes.length;
}

async function write(changes: Change[]): Promise<void> {
    // One UPDATE per changed value, in batches: neon-http has no transactions, and
    // each statement is idempotent, so a partial run is simply finished by re-running.
    const statements = changes.map((c) => {
        if (c.table === "project_link") return db.update(projectLinks).set({ linkType: c.to }).where(eq(projectLinks.id, c.id));
        if (c.table === "project_media") return db.update(projectMedia).set({ mediaType: c.to }).where(eq(projectMedia.id, c.id));
        const set = c.column === "status" ? { status: c.to }
            : c.column === "visibility" ? { visibility: c.to }
            : { projectType: c.to };
        return db.update(portfolioProjects).set(set).where(eq(portfolioProjects.id, c.id));
    });
    for (let i = 0; i < statements.length; i += 50) {
        const chunk = statements.slice(i, i + 50);
        if (chunk.length) await db.batch(chunk as [typeof chunk[number], ...typeof chunk]);
    }
}

async function main() {
    console.log(`\nPortfolio project values on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const before = await plan();
    const toChange = print(before);

    if (!apply) {
        console.log(toChange ? "\n  Preview only. Run with --apply to write these changes.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!toChange) {
        console.log("\n  Nothing to write.\n");
        return;
    }

    await write(before.changes);
    console.log(`\n  Wrote ${toChange} values. Checking again...\n`);
    const left = print(await plan());
    console.log(left ? `\n  ${left} still differ - read the lines above.\n` : "\n  Done: every recognised value has one spelling.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
