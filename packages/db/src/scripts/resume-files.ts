/**
 * Move each user's single uploaded resume into resume_file as their primary (plan/profile PRF-17).
 *
 * Before PRF-17 a user had one file, stored on `users` (resume / resume_text /
 * has_resume). Those columns stay, mirroring the primary file; this gives every such
 * user a matching `resume_file` row so the profile's Resume pane lists it. Users who
 * already have any resume_file row are left alone, so it is safe to run twice.
 *
 *   pnpm script resume-files            preview: who would get a row, nothing written
 *   pnpm script resume-files --apply    write, then preview again (should be empty)
 */
import { and, eq, isNull, or, sql, isNotNull } from "drizzle-orm";
import { db } from "../client";
import { resumeFiles, users } from "../schema";

const apply = process.argv.includes("--apply");

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

/** `resumes/<userId>-<timestamp>-<original name>` -> `<original name>`. */
function nameFromKey(key: string | null): string {
    if (!key) return "My resume";
    const base = key.split("/").pop() ?? "";
    const parts = base.split("-");
    const name = parts.length > 2 ? parts.slice(2).join("-") : base;
    return name || "My resume";
}

type Step = { userId: string; username: string | null; name: string; r2Key: string | null; textChars: number };

async function plan(): Promise<Step[]> {
    const rows = await db
        .select({ id: users.id, username: users.username, resume: users.resume, resumeText: users.resumeText })
        .from(users)
        .leftJoin(resumeFiles, eq(resumeFiles.userId, users.id))
        .where(and(
            isNull(resumeFiles.id),
            or(isNotNull(users.resume), sql`coalesce(${users.resumeText}, '') <> ''`),
        ));
    return rows.map((r) => ({
        userId: r.id,
        username: r.username,
        name: nameFromKey(r.resume),
        r2Key: r.resume,
        textChars: (r.resumeText ?? "").length,
    }));
}

function print(steps: Step[]): number {
    for (const s of steps) {
        console.log(`  + ${s.username ?? s.userId}: "${s.name}"  file=${s.r2Key ? "yes" : "no (text only)"}  text=${s.textChars} chars  -> primary`);
    }
    console.log(`\n  ${steps.length} user${steps.length === 1 ? "" : "s"} to move into resume_file.`);
    return steps.length;
}

async function main() {
    console.log(`\nResume files on ${host()} - ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const steps = await plan();
    const n = print(steps);
    if (!apply) {
        console.log(n ? "\n  Preview only. Run with --apply to write these rows.\n" : "\n  Nothing to do.\n");
        return;
    }
    if (!n) {
        console.log("\n  Nothing to write.\n");
        return;
    }
    for (let i = 0; i < steps.length; i += 100) {
        const chunk = steps.slice(i, i + 100);
        const texts = await db
            .select({ id: users.id, resumeText: users.resumeText })
            .from(users)
            .where(or(...chunk.map((c) => eq(users.id, c.userId))));
        const textOf = new Map(texts.map((t) => [t.id, t.resumeText]));
        await db.insert(resumeFiles).values(chunk.map((c) => ({
            userId: c.userId,
            name: c.name,
            r2Key: c.r2Key,
            text: textOf.get(c.userId) ?? null,
            isPrimary: true,
        })));
    }
    console.log(`\n  Wrote ${n} rows. Checking again...\n`);
    const left = print(await plan());
    console.log(left ? `\n  ${left} still missing - read the lines above.\n` : "\n  Done: every uploaded resume has its row.\n");
    if (left) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
