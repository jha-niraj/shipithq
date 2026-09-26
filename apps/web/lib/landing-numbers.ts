// Server-only: imported by server components; it reads the database (apps/web/CLAUDE.md, stats).
import { unstable_cache } from 'next/cache'


/**
 * The numbers band on the landing pages (plan/web/revamp REV-79): four live counts,
 * cached for an hour so a page view never waits on five queries. Returns null when
 * the database is unreachable, and the band hides itself: a number we cannot read is
 * not replaced by one we made up.
 */
export const getLandingNumbers = unstable_cache(
    async (): Promise<{ developers: number; projects: number; tasksApproved: number; mocks: number; activeJobs: number; companies: number } | null> => {
        // No database configured (a local web checkout often has no .env): hide the band
        // instead of crashing. `@repo/db` is imported lazily for the same reason: its
        // client calls neon() at module load, which throws without DATABASE_URL.
        if (!process.env.DATABASE_URL) return null
        try {
            const { db, users, jobs, companies, projectsV2, projectV2Submissions, mockVoiceSession } = await import('@repo/db')
            const { and, eq, count } = await import('drizzle-orm')
            const [[u], [p], [t], [m], [j], [c]] = await Promise.all([
                db.select({ value: count() }).from(users),
                db.select({ value: count() }).from(projectsV2),
                db.select({ value: count() }).from(projectV2Submissions).where(eq(projectV2Submissions.status, 'APPROVED')),
                db.select({ value: count() }).from(mockVoiceSession).catch(() => [{ value: 0 }]),
                db.select({ value: count() }).from(jobs).where(and(eq(jobs.status, 'ACTIVE'), eq(jobs.visibility, 'PUBLIC'))).catch(() => [{ value: 0 }]),
                db.select({ value: count() }).from(companies).catch(() => [{ value: 0 }]),
            ])
            return {
                developers: Number(u?.value ?? 0),
                projects: Number(p?.value ?? 0),
                tasksApproved: Number(t?.value ?? 0),
                mocks: Number(m?.value ?? 0),
                activeJobs: Number(j?.value ?? 0),
                companies: Number(c?.value ?? 0),
            }
        } catch (error: unknown) {
            console.error('Landing numbers failed:', error)
            return null
        }
    },
    ['landing-numbers'],
    { revalidate: 3600 },
)
