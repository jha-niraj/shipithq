"use server"

import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import {
    db,
    jobs,
    jobApplications,
    savedJobs,
    companyFollowers,
    skills,
    jobSkips,
    hiringRuns,
    jobListed,
} from "@repo/db"
import { eq, and, gte, inArray, notInArray, count } from "drizzle-orm"

/** "Not for me" hides a job from Spark for this long (plan/jobs JB-19, Niraj 2026-09-25). */
const SKIP_HIDE_DAYS = 30
const skipCutoff = () => new Date(Date.now() - SKIP_HIDE_DAYS * 86_400_000)

export interface TabCounts {
    spark: number
    following: number
    saved: number
    /** Runs in progress or finished (My rounds, HR-22). */
    rounds: number
    browse: number
}

/**
 * Get counts for all job tabs
 * Used to display badge counts on tabs
 */
export async function getJobsTabCounts(): Promise<{
    success: boolean
    data?: TabCounts
    error?: string
}> {
    try {
        const session = await getSession(headers())
        const userId = session?.user?.id

        // Total active jobs (for browse and spark)
        const [totalJobsRow] = await db
            .select({ totalJobs: count() })
            .from(jobs)
            .where(and(jobListed, eq(jobs.visibility, "PUBLIC")))
        const totalJobs = totalJobsRow?.totalJobs ?? 0

        const total = Number(totalJobs)

        // If not authenticated, return basic counts
        if (!userId) {
            return {
                success: true,
                data: {
                    spark: total,
                    following: 0,
                    saved: 0,
                    rounds: 0,
                    browse: total
                }
            }
        }

        // Get user's followed company IDs
        const followedCompanies = await db.query.companyFollowers.findMany({
            where: eq(companyFollowers.userId, userId),
            columns: { companyId: true },
        })
        const followedCompanyIds = followedCompanies.map(f => f.companyId)

        // Get user's applied job IDs for spark count
        const appliedJobs = await db.query.jobApplications.findMany({
            where: eq(jobApplications.userId, userId),
            columns: { jobId: true },
        })
        const appliedJobIds = appliedJobs.map(a => a.jobId)

        const [followingJobsCount, savedJobsCount, roundsCount] = await Promise.all([
            // Following: Jobs from followed companies
            followedCompanyIds.length > 0
                ? db.select({ val: count() })
                    .from(jobs)
                    .where(and(
                        inArray(jobs.companyId, followedCompanyIds),
                        jobListed,
                        eq(jobs.visibility, "PUBLIC")
                    ))
                    .then(rows => Number(rows[0]?.val ?? 0))
                : Promise.resolve(0),

            // Saved: User's saved jobs
            db.select({ val: count() })
                .from(savedJobs)
                .where(eq(savedJobs.userId, userId))
                .then(rows => Number(rows[0]?.val ?? 0)),

            // My rounds: runs in progress or finished, job or practice.
            db.select({ val: count() })
                .from(hiringRuns)
                .where(and(eq(hiringRuns.userId, userId), inArray(hiringRuns.status, ["IN_PROGRESS", "COMPLETE"])))
                .then(rows => Number(rows[0]?.val ?? 0)),
        ])

        // Recent skips are out of Spark too (JB-19).
        const [{ skipped } = { skipped: 0 }] = await db.select({ skipped: count() }).from(jobSkips)
            .where(and(eq(jobSkips.userId, userId), gte(jobSkips.skippedAt, skipCutoff())))
        const sparkCount = total - appliedJobIds.length - Number(skipped)

        return {
            success: true,
            data: {
                spark: Math.max(0, sparkCount),
                following: followingJobsCount,
                saved: savedJobsCount,
                rounds: roundsCount,
                browse: total
            }
        }
    } catch (error) {
        console.error("Error fetching tab counts:", error)
        return {
            success: false,
            error: "Failed to fetch tab counts"
        }
    }
}

/**
 * Get jobs for Spark (swipe) mode
 * Returns jobs the user hasn't interacted with yet
 */
/**
 * `offset`, when given, replaces `(page - 1) * limit`. Spark passes it because
 * a stored skip takes a row out of this list: after 5 skips a fixed page
 * offset would jump over 5 jobs the user never saw (plan/jobs JB-19).
 */
export async function getSparkJobs(page = 1, limit = 10, opts?: { offset?: number }) {
    try {
        const session = await getSession(headers())
        const skip = Math.max(0, opts?.offset ?? (page - 1) * limit)

        const baseWhere = and(
            jobListed,
            eq(jobs.visibility, "PUBLIC")
        )

        // For unauthenticated users, return all jobs
        if (!session?.user?.id) {
            const [jobRows, totalRowsAnon] = await Promise.all([
                db.query.jobs.findMany({
                    where: baseWhere,
                    with: {
                        company: {
                            columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                        },
                        // Spark's Process section (plan/jobs JB-18).
                        interviewProcess: {
                            columns: { id: true, name: true, estimatedDurationWeeks: true },
                            with: { rounds: { columns: { id: true, roundNumber: true, title: true, roundType: true, hasMockInterview: true } } },
                        },
                    },
                    orderBy: (t, { desc }) => [desc(t.featured), desc(t.publishedAt)],
                    offset: skip,
                    limit,
                }),
                db.select({ total: count() }).from(jobs).where(baseWhere),
            ])
            const total = totalRowsAnon[0]?.total ?? 0

            const formattedJobs = jobRows.map(job => {
                const skillsReq = (job.skillsRequired as string[]) || []
                const skillsPref = (job.skillsPreferred as string[]) || []
                return {
                    ...job,
                    skillsRequired: skillsReq,
                    skillsPreferred: skillsPref,
                    company: {
                        ...job.company,
                        hasTransparentProcess: job.company.hasInterviewProcess
                    },
                    matchScore: 70,
                    matchReasons: {
                        skillMatch: 0,
                        experienceMatch: 0,
                        locationMatch: 0,
                        industryMatch: 0
                    },
                    matchedSkills: [] as string[],
                    missingSkills: skillsReq,
                    isSaved: false,
                    hasApplied: false,
                    isFollowingCompany: false,
                    interviewProcess: job.interviewProcess ?? null,
                }
            })

            return {
                success: true,
                data: {
                    jobs: formattedJobs,
                    pagination: {
                        page,
                        limit,
                        total: Number(total),
                        totalPages: Math.ceil(Number(total) / limit)
                    },
                    isAuthenticated: false
                }
            }
        }

        const userId = session.user.id

        // Get user's applied job IDs to exclude
        const appliedJobs = await db.query.jobApplications.findMany({
            where: eq(jobApplications.userId, userId),
            columns: { jobId: true },
        })
        const appliedJobIds = appliedJobs.map(a => a.jobId)

        // Skipped in Spark within the window: left out until it passes (JB-19).
        const skippedRows = await db.select({ jobId: jobSkips.jobId }).from(jobSkips)
            .where(and(eq(jobSkips.userId, userId), gte(jobSkips.skippedAt, skipCutoff())))
        const excludedJobIds = [...new Set([...appliedJobIds, ...skippedRows.map((r) => r.jobId)])]

        // Get user data for matching
        const [userSkillRows, savedJobRows, followedCompanyRows] = await Promise.all([
            db.query.skills.findMany({
                where: eq(skills.userId, userId),
                columns: { name: true },
            }),
            db.query.savedJobs.findMany({
                where: eq(savedJobs.userId, userId),
                columns: { jobId: true },
            }),
            db.query.companyFollowers.findMany({
                where: eq(companyFollowers.userId, userId),
                columns: { companyId: true },
            }),
        ])

        const userSkillsList = userSkillRows.map(s => s.name.toLowerCase())
        const savedIds = savedJobRows.map(s => s.jobId)
        const followedIds = followedCompanyRows.map(f => f.companyId)

        const whereClause = excludedJobIds.length > 0
            ? and(baseWhere, notInArray(jobs.id, excludedJobIds))
            : baseWhere

        const [jobRows, totalRowsAuth] = await Promise.all([
            db.query.jobs.findMany({
                where: whereClause,
                with: {
                    company: {
                        columns: { id: true, name: true, logoUrl: true, industry: true, hasInterviewProcess: true },
                    },
                    interviewProcess: {
                        columns: { id: true, name: true, estimatedDurationWeeks: true },
                        with: { rounds: { columns: { id: true, roundNumber: true, title: true, roundType: true, hasMockInterview: true } } },
                    },
                },
                orderBy: (t, { desc }) => [desc(t.featured), desc(t.publishedAt)],
                offset: skip,
                limit,
            }),
            db.select({ total: count() }).from(jobs).where(whereClause),
        ])
        const total = totalRowsAuth[0]?.total ?? 0

        const formattedJobs = jobRows.map(job => {
            const skillsRequired = (job.skillsRequired as string[]) || []
            const skillsPreferred = (job.skillsPreferred as string[]) || []

            const normalizedRequired = skillsRequired.map(s => s.toLowerCase())
            const matchedSkills = normalizedRequired.filter(skill =>
                userSkillsList.some(us => us.includes(skill) || skill.includes(us))
            )
            const missingSkills = normalizedRequired.filter(skill =>
                !userSkillsList.some(us => us.includes(skill) || skill.includes(us))
            )
            const matchScore = normalizedRequired.length > 0
                ? Math.round((matchedSkills.length / normalizedRequired.length) * 100)
                : 80

            return {
                ...job,
                skillsRequired,
                skillsPreferred,
                company: {
                    ...job.company,
                    hasTransparentProcess: job.company.hasInterviewProcess
                },
                matchScore,
                matchReasons: {
                    skillMatch: matchScore,
                    experienceMatch: 80,
                    locationMatch: 80,
                    industryMatch: 80
                },
                matchedSkills,
                missingSkills,
                isSaved: savedIds.includes(job.id),
                hasApplied: false,
                isFollowingCompany: followedIds.includes(job.companyId),
                interviewProcess: job.interviewProcess ?? null,
            }
        })

        formattedJobs.sort((a, b) => b.matchScore - a.matchScore)

        return {
            success: true,
            data: {
                jobs: formattedJobs,
                pagination: {
                    page,
                    limit,
                    total: Number(total),
                    totalPages: Math.ceil(Number(total) / limit)
                },
                isAuthenticated: true
            }
        }
    } catch (error) {
        console.error("Error fetching spark jobs:", error)
        return { success: false, error: "Failed to fetch jobs" }
    }
}

/**
 * Record a swipe action (left = skip, right = interested)
 */
export async function recordSwipeAction(
    jobId: string,
    action: "left" | "right" | "save"
): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: "Please sign in to continue" }
        }

        const userId = session.user.id

        if (action === "right" || action === "save") {
            // Saving overrides an old "Not for me".
            await db.batch([
                db.insert(savedJobs).values({ userId, jobId }).onConflictDoNothing(),
                db.delete(jobSkips).where(and(eq(jobSkips.userId, userId), eq(jobSkips.jobId, jobId))),
            ])
        } else {
            // "Not for me": out of Spark for SKIP_HIDE_DAYS; a re-skip moves the date (JB-19).
            await db.insert(jobSkips).values({ userId, jobId })
                .onConflictDoUpdate({ target: [jobSkips.userId, jobSkips.jobId], set: { skippedAt: new Date() } })
        }

        return { success: true }
    } catch (error) {
        console.error("Error recording swipe:", error)
        return { success: false, error: "Failed to record action" }
    }
}

/** Undo of Spark's "Not for me": the job can show in Spark again (plan/jobs JB-19). */
export async function undoSkip(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) return { success: false, error: "Please sign in to continue" }
        await db.delete(jobSkips).where(and(eq(jobSkips.userId, session.user.id), eq(jobSkips.jobId, jobId)))
        return { success: true }
    } catch (error: unknown) {
        console.error("undoSkip:", error instanceof Error ? error.message : error)
        return { success: false, error: "Could not undo that" }
    }
}
