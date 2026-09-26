'use server'

import { getSession } from '@repo/auth'
import { headers } from 'next/headers'
import { db, projectV2StandupConfigs, projectV2StandupEntries } from '@repo/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { startBackgroundJob } from '@/actions/(main)/workers/jobs.action'
import { loadVoiceSession } from '@/lib/voice/session'

/**
 * Get standup history for a project
 */
export async function getStandupHistory(projectId: string, limit: number = 10) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const [standupConfig] = await db
            .select({ id: projectV2StandupConfigs.id })
            .from(projectV2StandupConfigs)
            .where(
                and(
                    eq(projectV2StandupConfigs.userId, session.user.id),
                    eq(projectV2StandupConfigs.projectId, projectId)
                )
            )
            .limit(1)

        if (!standupConfig) {
            return { success: true, standups: [] }
        }

        const standups = await db
            .select()
            .from(projectV2StandupEntries)
            .where(
                and(
                    eq(projectV2StandupEntries.configId, standupConfig.id),
                    eq(projectV2StandupEntries.status, 'SUBMITTED')
                )
            )
            .orderBy(desc(projectV2StandupEntries.submittedAt))
            .limit(limit)

        return {
            success: true,
            standups: standups.map(s => ({
                id: s.id,
                date: s.submittedAt?.toLocaleDateString() || '',
                completedTasks: s.whatDidYesterday ? [s.whatDidYesterday] : [],
                plannedTasks: s.whatDoingToday ? [s.whatDoingToday] : [],
                blockers: s.anyBlockers ? [s.anyBlockers] : [],
                duration: s.durationSeconds
            }))
        }

    } catch (error) {
        console.error('Error fetching standup history:', error)
        return { success: false, error: 'Failed to fetch history' }
    }
}

/**
 * Get previous standup for context
 */
export async function getPreviousStandup(projectId: string) {
    try {
        const session = await getSession(headers())
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const [standupConfig] = await db
            .select({ id: projectV2StandupConfigs.id })
            .from(projectV2StandupConfigs)
            .where(
                and(
                    eq(projectV2StandupConfigs.userId, session.user.id),
                    eq(projectV2StandupConfigs.projectId, projectId)
                )
            )
            .limit(1)

        if (!standupConfig) {
            return { success: true, standup: null }
        }

        const [standup] = await db
            .select()
            .from(projectV2StandupEntries)
            .where(
                and(
                    eq(projectV2StandupEntries.configId, standupConfig.id),
                    eq(projectV2StandupEntries.status, 'SUBMITTED')
                )
            )
            .orderBy(desc(projectV2StandupEntries.submittedAt))
            .limit(1)

        if (!standup) {
            return { success: true, standup: null }
        }

        return {
            success: true,
            standup: {
                date: standup.submittedAt?.toLocaleDateString() || standup.scheduledFor.toLocaleDateString(),
                completedTasks: standup.whatDidYesterday ? [standup.whatDidYesterday] : [],
                plannedTasks: standup.whatDoingToday ? [standup.whatDoingToday] : []
            }
        }

    } catch (error) {
        console.error('Error fetching previous standup:', error)
        return { success: false, error: 'Failed to fetch previous standup' }
    }
}

/**
 * Hand a Sarvam standup in (plan/voice VO-12): the entry leaves the live states
 * and the `standup_voice` job reads what was said and fills it in. Returns the
 * job to follow. A typed standup's turns go from the server, never the browser.
 */
export async function handInStandup(entryId: string, projectSlug: string): Promise<{ success: boolean; jobId?: string; error?: string }> {
    const session = await getSession(headers())
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    const s = await loadVoiceSession(session.user.id, { kind: 'standup', id: entryId })
    if (!s) return { success: false, error: 'Standup not found' }
    if (!s.consentedAt) return { success: false, error: 'The standup never started.' }

    const [moved] = await db.update(projectV2StandupEntries)
        .set({ status: 'PROCESSING' })
        .where(and(eq(projectV2StandupEntries.id, entryId), inArray(projectV2StandupEntries.status, ['SCHEDULED', 'IN_PROGRESS'])))
        .returning({ id: projectV2StandupEntries.id })
    if (!moved) return { success: false, error: 'This standup was already handed in.' }

    const job = await startBackgroundJob('standup_voice', {
        entryId,
        mode: s.mode ?? 'VOICE',
        ...(s.mode === 'TYPED' ? { turns: s.turns } : { interactionId: s.interactionId ?? undefined }),
        startedAt: s.consentedAt.toISOString(),
    }, { singleFlight: true, singleFlightKey: `standup:${entryId}` })
    revalidatePath(`/projects/${projectSlug}`)
    return job.success ? { success: true, jobId: job.jobId } : { success: false, error: job.error ?? 'Could not process the standup.' }
}
