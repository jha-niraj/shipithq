/**
 * Sample activity on Home's year graph and day sheet, for Niraj's accounts (plan/home HOME-4).
 *
 * Writes about fifty days across the last year, at every XP level, plus the last six
 * days in a row so the streak shows. Each day gets one to four entries of real activity
 * types, written exactly as `recordActivity` writes them (a `daily_activity` row per
 * UTC day, `activity_entry` rows under it). A day the account already has real activity
 * on is left alone. Every entry carries `metadata.sample = "home-activity-sample"`, which
 * is how `--remove` finds them again.
 *
 *   pnpm script home-activity-sample                      preview, both Niraj accounts
 *   pnpm script home-activity-sample --apply              write, then preview again
 *   pnpm script home-activity-sample --email=a@b.com      one account
 *   pnpm script home-activity-sample --remove [--apply]   take the sample days out again
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { activityEntries, dailyActivities, users } from "../schema";
import { requireMigrationsApplied } from "./_migrations-check";

const apply = process.argv.includes("--apply");
const remove = process.argv.includes("--remove");
const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const EMAILS = emailArg ? emailArg.split(",").map((e) => e.trim()) : ["niraj@getcreatr.com", "jhaniraj45@gmail.com"];
const TAG = "home-activity-sample";

type Kind = typeof activityEntries.$inferInsert["activityType"];
type Entry = { type: Kind; title: string; description: string; xp: number; minutes: number };

const ENTRIES: Entry[] = [
    { type: "COMPLETED_PRACTICE_SESSION", title: "Solved Two Sum", description: "Practice, arrays and hashing, in C++", xp: 40, minutes: 25 },
    { type: "COMPLETED_PRACTICE_SESSION", title: "Solved Longest Substring Without Repeating", description: "Practice, sliding window", xp: 60, minutes: 40 },
    { type: "PROJECT_SUBMISSION", title: "Submitted: rate limiter for the login route", description: "Project, Secure auth service", xp: 80, minutes: 90 },
    { type: "COMPLETED_MOCK_INTERVIEW", title: "Mock interview: system design", description: "Design a URL shortener, 45 minutes", xp: 120, minutes: 45 },
    { type: "LEARN_COMPLETED", title: "Finished incident: The login that said yes to guessing", description: "Incidents, Security", xp: 60, minutes: 30 },
    { type: "DAILY_QUIZ_COMPLETED", title: "Daily quiz: 8 of 10", description: "Networking basics", xp: 20, minutes: 6 },
    { type: "PATHFINDER_GOAL_STARTED", title: "Started goal: Protecting logins", description: "Pathfinder, 5 topics", xp: 15, minutes: 5 },
    { type: "COMPLETED_GOAL_DAY", title: "Pathfinder: rate limits, windows and buckets", description: "Protecting logins, topic 2 of 5", xp: 30, minutes: 35 },
    { type: "STUDIO_CREATED", title: "Created study space: Distributed systems", description: "Studio", xp: 25, minutes: 10 },
    { type: "COMPLETED_DAILY_CHALLENGE", title: "Daily challenge: merge intervals", description: "Practice, medium", xp: 50, minutes: 30 },
    { type: "POSTED_IN_SPACE", title: "Posted in Backend engineers", description: "How do you size a connection pool?", xp: 5, minutes: 4 },
    { type: "FOLLOWING_USER", title: "Followed a builder", description: "Community", xp: 5, minutes: 1 },
];

/** UTC yyyy-mm-dd, as `recordActivity` stores the day. */
function utcDay(offset: number): string {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
}

/** A small deterministic generator, so a re-run plans the same days. */
function rng(seed: number) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Days back from today: the last six in a row (the streak), then about 45 across the year. */
function sampleOffsets(): number[] {
    const r = rng(20260928);
    const out = new Set([0, 1, 2, 3, 4, 5]);
    while (out.size < 51) out.add(8 + Math.floor(r() * 355));
    return [...out].sort((a, b) => a - b);
}

type PlannedDay = { date: string; entries: Entry[]; xp: number };

function planDays(): PlannedDay[] {
    const r = rng(7);
    return sampleOffsets().map((offset, i) => {
        // One to four entries; cycling the start covers every XP level (1 to 4) over the year.
        const n = 1 + ((i + Math.floor(r() * 4)) % 4);
        const entries = Array.from({ length: n }, (_, k) => ENTRIES[(i * 3 + k * 5) % ENTRIES.length]!);
        return { date: utcDay(offset), entries, xp: entries.reduce((s, e) => s + e.xp, 0) };
    });
}

function host(): string {
    try {
        return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
    } catch {
        return "(DATABASE_URL is not a URL)";
    }
}

async function accounts() {
    return db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, EMAILS));
}

/** Days this account already has, and which of them are only sample entries. */
async function existing(userId: string) {
    const rows = await db.execute(sql`
        select d.id, d.date::text as date,
               bool_and(coalesce(e.metadata->>'sample', '') = ${TAG}) as "onlySample",
               count(e.id)::int as entries
        from daily_activity d left join activity_entry e on e.daily_activity_id = d.id
        where d.user_id = ${userId}
        group by d.id, d.date
    `);
    const list = ((rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown as unknown[])) as { id: string; date: string; onlySample: boolean | null; entries: number }[];
    return list;
}

async function planAdd(userId: string) {
    const have = new Set((await existing(userId)).map((d) => d.date));
    return planDays().filter((d) => !have.has(d.date));
}

async function planRemove(userId: string) {
    return (await existing(userId)).filter((d) => d.entries > 0 && d.onlySample);
}

async function write(userId: string, days: PlannedDay[]) {
    for (const day of days) {
        const [row] = await db.insert(dailyActivities).values({
            userId,
            date: day.date,
            hasActivity: true,
            totalXpEarned: day.xp,
            totalTimeSpent: day.entries.reduce((s, e) => s + e.minutes, 0),
            activitiesCount: day.entries.length,
            isStreakDay: true,
            updatedAt: new Date(),
        }).returning({ id: dailyActivities.id });
        await db.insert(activityEntries).values(day.entries.map((e, k) => ({
            userId,
            dailyActivityId: row!.id,
            activityType: e.type,
            title: e.title,
            description: e.description,
            xpEarned: e.xp,
            timeSpent: e.minutes,
            metadata: { sample: TAG },
            // Spread through the working day: 09:30, 12:10, 15:45, 19:20 UTC.
            createdAt: new Date(`${day.date}T${["09:30", "12:10", "15:45", "19:20"][k] ?? "20:00"}:00Z`),
        })));
    }
}

function level(xp: number) {
    return xp < 50 ? 1 : xp < 100 ? 2 : xp < 200 ? 3 : 4;
}

async function main() {
    await requireMigrationsApplied();
    console.log(`\nHome sample activity on ${host()} - ${remove ? "remove" : "add"}, ${apply ? "APPLY" : "preview (nothing will be written)"}\n`);
    const found = await accounts();
    for (const email of EMAILS) if (!found.some((u) => u.email === email)) console.log(`  ! no account for ${email}, skipped`);

    let left = 0;
    for (const u of found) {
        if (remove) {
            const days = await planRemove(u.id);
            console.log(`  ${u.email}: ${days.length} sample day(s) to remove${days.length ? `: ${days.slice(0, 6).map((d) => d.date).join(", ")}${days.length > 6 ? ", ..." : ""}` : ""}`);
            if (apply && days.length) {
                await db.delete(dailyActivities).where(and(eq(dailyActivities.userId, u.id), inArray(dailyActivities.id, days.map((d) => d.id))));
            }
            left += apply ? (await planRemove(u.id)).length : days.length;
            continue;
        }
        const days = await planAdd(u.id);
        const byLevel = [1, 2, 3, 4].map((l) => days.filter((d) => level(d.xp) === l).length);
        console.log(`  ${u.email}: ${days.length} day(s) to add, ${days.reduce((s, d) => s + d.entries.length, 0)} entries, ${days.reduce((s, d) => s + d.xp, 0)} XP`);
        console.log(`    by level 1-4: ${byLevel.join(" / ")}; latest: ${days.slice(0, 6).map((d) => d.date).join(", ") || "-"}`);
        if (apply && days.length) await write(u.id, days);
        left += apply ? (await planAdd(u.id)).length : days.length;
    }

    if (!apply) {
        console.log(left ? "\n  Preview only. Run with --apply to write.\n" : "\n  Nothing to do.\n");
        return;
    }
    console.log(left ? `\n  ${left} day(s) still planned: something did not write.\n` : "\n  Done. Planning again finds nothing left.\n");
}

main().then(() => process.exit(0)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
