import "server-only"
import { and, eq, sql } from "drizzle-orm"
import {
    db, companies, hiringAttempts, hiringRuns, interviewRounds, jobs, mockInterviewVoice, mockVoiceSession, users, incidentMockSessions,
    projectsV2, projectV2StandupConfigs, projectV2StandupEntries,
    type VoiceMode, type VoiceTurn,
} from "@repo/db"

/*
 * A voice interview, whichever product it belongs to (plan/voice VO-5): a mock
 * session (`mock_voice_session`), a hiring voice round attempt
 * (`hiring_attempt`, its fields kept in `responses`), or a project's daily
 * standup (`project_v2_standup_entry`, VO-12), or an Incidents talk-it-through
 * (`incident_mock_session`, plan/incidents INC-15). Server-only: these take
 * ids the caller has not yet checked, and check ownership themselves.
 */

export type VoiceRef = { kind: "mock" | "round" | "standup" | "incident"; id: string }

/** Signed session URLs one interview may use: each is single-use, and a dropped call needs a new one. */
export const SIGNED_URLS_PER_SESSION = 3
/** Turns kept from the browser's live transcript (display only). */
const MAX_TURNS = 200
const MAX_TURN_CHARS = 4000

export interface VoiceSession {
    ref: VoiceRef
    userId: string
    /** Open and inside its time. */
    live: boolean
    endsAt: Date | null
    mode: VoiceMode | null
    interactionId: string | null
    consentedAt: Date | null
    turns: VoiceTurn[]
    signedUrlCount: number
    /** Which answer modes this interview allows. */
    allows: { voice: boolean; typed: boolean }
}

type RoundResponses = {
    mode?: VoiceMode
    interactionId?: string
    consent?: { text: string; at: string }
    turns?: VoiceTurn[]
    signedUrls?: number
}

async function roundRow(userId: string, attemptId: string) {
    const [row] = await db.select({ attempt: hiringAttempts, round: interviewRounds })
        .from(hiringAttempts)
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .innerJoin(interviewRounds, eq(interviewRounds.id, hiringAttempts.roundId))
        .where(and(eq(hiringAttempts.id, attemptId), eq(hiringRuns.userId, userId)))
    return row ?? null
}

/** The session, if this user owns it. */
export async function loadVoiceSession(userId: string, ref: VoiceRef): Promise<VoiceSession | null> {
    const now = Date.now()
    if (ref.kind === "mock") {
        const s = await db.query.mockVoiceSession.findFirst({ where: and(eq(mockVoiceSession.id, ref.id), eq(mockVoiceSession.userId, userId)) })
        if (!s || s.provider !== "SARVAM") return null
        return {
            ref, userId,
            live: ["SCHEDULED", "IN_PROGRESS"].includes(s.status) && (!s.endsAt || s.endsAt.getTime() > now),
            endsAt: s.endsAt, mode: s.mode, interactionId: s.interactionId, consentedAt: s.consentedAt,
            turns: s.turns, signedUrlCount: s.signedUrlCount,
            allows: { voice: true, typed: true },
        }
    }
    if (ref.kind === "incident") {
        const s = await db.query.incidentMockSessions.findFirst({ where: and(eq(incidentMockSessions.id, ref.id), eq(incidentMockSessions.userId, userId)) })
        if (!s) return null
        return {
            ref, userId,
            live: ["SCHEDULED", "IN_PROGRESS"].includes(s.status) && (!s.endsAt || s.endsAt.getTime() > now),
            endsAt: s.endsAt, mode: s.mode, interactionId: s.interactionId, consentedAt: s.consentedAt,
            turns: s.turns, signedUrlCount: s.signedUrlCount,
            allows: { voice: true, typed: true },
        }
    }
    if (ref.kind === "standup") {
        const [row] = await db.select({ e: projectV2StandupEntries }).from(projectV2StandupEntries)
            .innerJoin(projectV2StandupConfigs, eq(projectV2StandupConfigs.id, projectV2StandupEntries.configId))
            .where(and(eq(projectV2StandupEntries.id, ref.id), eq(projectV2StandupConfigs.userId, userId)))
        const e = row?.e
        if (!e || e.provider !== "SARVAM") return null
        return {
            ref, userId,
            live: ["SCHEDULED", "IN_PROGRESS"].includes(e.status) && (!e.endsAt || e.endsAt.getTime() > now),
            endsAt: e.endsAt, mode: e.mode, interactionId: e.interactionId, consentedAt: e.consentedAt,
            turns: e.turns, signedUrlCount: e.signedUrlCount,
            allows: { voice: true, typed: true },
        }
    }
    const row = await roundRow(userId, ref.id)
    if (!row || !["VOICE_BEHAVIOURAL", "VOICE_CULTURE"].includes(row.round.roundType)) return null
    const r = row.attempt.responses as RoundResponses
    const rm = row.round.responseMode
    return {
        ref, userId,
        live: row.attempt.status === "IN_PROGRESS" && (!row.attempt.endsAt || row.attempt.endsAt.getTime() > now),
        endsAt: row.attempt.endsAt, mode: r.mode ?? null, interactionId: r.interactionId ?? null,
        consentedAt: r.consent ? new Date(r.consent.at) : null,
        turns: Array.isArray(r.turns) ? r.turns : [], signedUrlCount: r.signedUrls ?? 0,
        allows: { voice: rm !== "TYPED", typed: rm !== "VOICE" },
    }
}

/** Record consent and the chosen mode. Refused for a mode the interview doesn't allow. */
export async function recordConsent(s: VoiceSession, input: { text: string; mode: VoiceMode }): Promise<boolean> {
    if (!s.live) return false
    if (input.mode === "VOICE" ? !s.allows.voice : !s.allows.typed) return false
    const at = new Date()
    if (s.ref.kind === "mock") {
        await db.update(mockVoiceSession).set({ consentText: input.text, consentedAt: at, mode: input.mode, status: "IN_PROGRESS", startedAt: sql`coalesce(${mockVoiceSession.startedAt}, now())` })
            .where(eq(mockVoiceSession.id, s.ref.id))
        return true
    }
    if (s.ref.kind === "incident") {
        await db.update(incidentMockSessions).set({ consentText: input.text, consentedAt: at, mode: input.mode, status: "IN_PROGRESS", startedAt: sql`coalesce(${incidentMockSessions.startedAt}, now())` })
            .where(eq(incidentMockSessions.id, s.ref.id))
        return true
    }
    if (s.ref.kind === "standup") {
        // The standup's clock starts here: its configured length, plus two minutes to connect.
        const [cfg] = await db.select({ minutes: projectV2StandupConfigs.durationMinutes }).from(projectV2StandupEntries)
            .innerJoin(projectV2StandupConfigs, eq(projectV2StandupConfigs.id, projectV2StandupEntries.configId))
            .where(eq(projectV2StandupEntries.id, s.ref.id))
        await db.update(projectV2StandupEntries).set({
            consentText: input.text, consentedAt: at, mode: input.mode, status: "IN_PROGRESS",
            endsAt: s.endsAt ?? new Date(at.getTime() + ((cfg?.minutes ?? 10) + 2) * 60_000),
        }).where(eq(projectV2StandupEntries.id, s.ref.id))
        return true
    }
    await db.update(hiringAttempts).set({
        responses: sql`${hiringAttempts.responses} || ${JSON.stringify({ mode: input.mode, consent: { text: input.text, at: at.toISOString() } })}::jsonb`,
    }).where(and(eq(hiringAttempts.id, s.ref.id), eq(hiringAttempts.status, "IN_PROGRESS")))
    return true
}

/** Count one signed URL, only while under the cap, so parallel requests can't overrun it. */
export async function takeSignedUrl(s: VoiceSession): Promise<boolean> {
    if (s.ref.kind === "mock") {
        const [ok] = await db.update(mockVoiceSession).set({ signedUrlCount: sql`${mockVoiceSession.signedUrlCount} + 1` })
            .where(and(eq(mockVoiceSession.id, s.ref.id), sql`${mockVoiceSession.signedUrlCount} < ${SIGNED_URLS_PER_SESSION}`))
            .returning({ id: mockVoiceSession.id })
        return Boolean(ok)
    }
    if (s.ref.kind === "incident") {
        const [ok] = await db.update(incidentMockSessions).set({ signedUrlCount: sql`${incidentMockSessions.signedUrlCount} + 1` })
            .where(and(eq(incidentMockSessions.id, s.ref.id), sql`${incidentMockSessions.signedUrlCount} < ${SIGNED_URLS_PER_SESSION}`))
            .returning({ id: incidentMockSessions.id })
        return Boolean(ok)
    }
    if (s.ref.kind === "standup") {
        const [ok] = await db.update(projectV2StandupEntries).set({ signedUrlCount: sql`${projectV2StandupEntries.signedUrlCount} + 1` })
            .where(and(eq(projectV2StandupEntries.id, s.ref.id), sql`${projectV2StandupEntries.signedUrlCount} < ${SIGNED_URLS_PER_SESSION}`))
            .returning({ id: projectV2StandupEntries.id })
        return Boolean(ok)
    }
    const [ok] = await db.update(hiringAttempts)
        .set({ responses: sql`jsonb_set(${hiringAttempts.responses}, '{signedUrls}', to_jsonb(coalesce((${hiringAttempts.responses}->>'signedUrls')::int, 0) + 1))` })
        .where(and(
            eq(hiringAttempts.id, s.ref.id),
            eq(hiringAttempts.status, "IN_PROGRESS"),
            sql`coalesce((${hiringAttempts.responses}->>'signedUrls')::int, 0) < ${SIGNED_URLS_PER_SESSION}`,
        ))
        .returning({ id: hiringAttempts.id })
    return Boolean(ok)
}

/** The Sarvam interaction id, saved as soon as the call connects. A reconnect replaces it; the last call is the one scored. */
export async function setInteraction(s: VoiceSession, interactionId: string): Promise<void> {
    const id = interactionId.slice(0, 200)
    if (s.ref.kind === "mock") {
        await db.update(mockVoiceSession).set({ interactionId: id }).where(eq(mockVoiceSession.id, s.ref.id))
        return
    }
    if (s.ref.kind === "incident") {
        await db.update(incidentMockSessions).set({ interactionId: id }).where(eq(incidentMockSessions.id, s.ref.id))
        return
    }
    if (s.ref.kind === "standup") {
        await db.update(projectV2StandupEntries).set({ interactionId: id }).where(eq(projectV2StandupEntries.id, s.ref.id))
        return
    }
    await db.update(hiringAttempts).set({ responses: sql`jsonb_set(${hiringAttempts.responses}, '{interactionId}', to_jsonb(${id}::text))` })
        .where(and(eq(hiringAttempts.id, s.ref.id), eq(hiringAttempts.status, "IN_PROGRESS")))
}

/** Clean turns from anywhere: known roles, trimmed, capped. */
export function cleanTurns(raw: unknown): VoiceTurn[] {
    if (!Array.isArray(raw)) return []
    return raw.slice(0, MAX_TURNS).flatMap((t) => {
        const role = (t as VoiceTurn)?.role
        const text = typeof (t as VoiceTurn)?.text === "string" ? (t as VoiceTurn).text.trim().slice(0, MAX_TURN_CHARS) : ""
        if ((role !== "interviewer" && role !== "candidate") || !text) return []
        const at = typeof (t as VoiceTurn).at === "string" ? (t as VoiceTurn).at : undefined
        const done = role === "interviewer" && (t as VoiceTurn).done === true
        return [{ role, text, ...(at ? { at } : {}), ...(done ? { done } : {}) }]
    })
}

/** Replace the saved turns (the whole list each time, so a retry never duplicates). */
export async function saveTurns(s: VoiceSession, turns: VoiceTurn[]): Promise<void> {
    const clean = cleanTurns(turns)
    if (s.ref.kind === "mock") {
        await db.update(mockVoiceSession).set({ turns: clean }).where(eq(mockVoiceSession.id, s.ref.id))
        return
    }
    if (s.ref.kind === "incident") {
        await db.update(incidentMockSessions).set({ turns: clean }).where(eq(incidentMockSessions.id, s.ref.id))
        return
    }
    if (s.ref.kind === "standup") {
        await db.update(projectV2StandupEntries).set({ turns: clean }).where(eq(projectV2StandupEntries.id, s.ref.id))
        return
    }
    await db.update(hiringAttempts).set({ responses: sql`jsonb_set(${hiringAttempts.responses}, '{turns}', ${JSON.stringify(clean)}::jsonb)`, respondedAt: new Date() })
        .where(and(eq(hiringAttempts.id, s.ref.id), eq(hiringAttempts.status, "IN_PROGRESS")))
}

export interface InterviewBrief {
    /** Sent to the agent as its input variables (VO-6). */
    variables: { interview_brief: string; role: string; candidate_name: string; question_count: string; duration_minutes: string }
    title: string
    /** "incident": an Incidents talk-it-through, where the other side is a colleague, not an interviewer (plan/incidents INC-15). */
    persona?: "interviewer" | "incident"
}

/** What the interviewer is told, built on the server so the browser can't choose it. */
export async function interviewBrief(s: VoiceSession): Promise<InterviewBrief | null> {
    const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, s.userId))
    const candidate = (me?.name ?? "").split(" ")[0] || "there"
    if (s.ref.kind === "mock") {
        const [row] = await db.select({ title: mockInterviewVoice.title, level: mockInterviewVoice.level, category: mockInterviewVoice.category, kb: mockInterviewVoice.knowledgeBase, duration: mockInterviewVoice.duration, count: mockInterviewVoice.questionsCount })
            .from(mockVoiceSession).innerJoin(mockInterviewVoice, eq(mockInterviewVoice.id, mockVoiceSession.mockId))
            .where(eq(mockVoiceSession.id, s.ref.id))
        if (!row) return null
        // The resume, when the mock includes it (resolved at session creation).
        const resume = ((await db.query.mockVoiceSession.findFirst({ where: eq(mockVoiceSession.id, s.ref.id), columns: { variables: true } }))?.variables as { resume_content?: string | null } | null)?.resume_content
        return {
            title: row.title,
            variables: {
                interview_brief: `${row.title} (${row.category.toLowerCase()}, ${row.level.toLowerCase()} level).\n${row.kb}${resume ? `\n\nThe candidate's resume, to ask about their own work:\n${resume.slice(0, 3000)}` : ""}`.slice(0, 8000),
                role: row.title,
                candidate_name: candidate,
                question_count: String(row.count),
                duration_minutes: String(row.duration),
            },
        }
    }
    if (s.ref.kind === "incident") {
        // Built when the session was opened (actions/(main)/incidents/mock.action.ts).
        const row = await db.query.incidentMockSessions.findFirst({ where: eq(incidentMockSessions.id, s.ref.id), columns: { variables: true } })
        const v = row?.variables ?? {}
        if (!v.interview_brief) return null
        return {
            persona: "incident",
            title: v.title ?? "Talk it through",
            variables: {
                interview_brief: v.interview_brief.slice(0, 8000),
                role: v.role ?? "Engineer",
                candidate_name: candidate,
                question_count: v.question_count ?? "4",
                duration_minutes: v.duration_minutes ?? "8",
            },
        }
    }
    if (s.ref.kind === "standup") {
        const [row] = await db.select({ project: projectsV2.title, minutes: projectV2StandupConfigs.durationMinutes, configId: projectV2StandupConfigs.id })
            .from(projectV2StandupEntries)
            .innerJoin(projectV2StandupConfigs, eq(projectV2StandupConfigs.id, projectV2StandupEntries.configId))
            .innerJoin(projectsV2, eq(projectsV2.id, projectV2StandupConfigs.projectId))
            .where(eq(projectV2StandupEntries.id, s.ref.id))
        if (!row) return null
        const [prev] = await db.select({ did: projectV2StandupEntries.whatDidYesterday, doing: projectV2StandupEntries.whatDoingToday, at: projectV2StandupEntries.submittedAt })
            .from(projectV2StandupEntries)
            .where(and(eq(projectV2StandupEntries.configId, row.configId), eq(projectV2StandupEntries.status, "SUBMITTED")))
            .orderBy(sql`${projectV2StandupEntries.submittedAt} desc nulls last`).limit(1)
        const last = prev?.doing ? `\nLast standup they planned: ${prev.doing}. Ask whether that got done.` : ""
        return {
            title: `Daily standup: ${row.project}`,
            variables: {
                interview_brief: `A short daily standup for the project "${row.project}". This is not an assessment: be warm and brief. Ask exactly three things, one at a time: what they worked on since the last standup, what they plan to do today, and whether anything is blocking them. If an answer is vague, ask once what specifically they did or will do.${last}`.slice(0, 4000),
                role: `Developer on ${row.project}`,
                candidate_name: candidate,
                question_count: "3",
                duration_minutes: String(row.minutes ?? 10),
            },
        }
    }
    const [row] = await db.select({ title: interviewRounds.title, kb: interviewRounds.mockKnowledgeBase, minutes: interviewRounds.timeLimitMinutes, jobId: hiringRuns.jobId, companyId: hiringRuns.companyId })
        .from(hiringAttempts)
        .innerJoin(interviewRounds, eq(interviewRounds.id, hiringAttempts.roundId))
        .innerJoin(hiringRuns, eq(hiringRuns.id, hiringAttempts.runId))
        .where(eq(hiringAttempts.id, s.ref.id))
    if (!row) return null
    const [job, company] = await Promise.all([
        row.jobId ? db.query.jobs.findFirst({ where: eq(jobs.id, row.jobId), columns: { title: true } }) : null,
        row.companyId ? db.query.companies.findFirst({ where: eq(companies.id, row.companyId), columns: { name: true } }) : null,
    ])
    const minutes = row.minutes ?? 20
    return {
        title: row.title,
        variables: {
            interview_brief: `${row.title}${company ? ` for ${company.name}` : ""}.\n${row.kb ?? ""}`.trim().slice(0, 6000),
            role: job?.title ?? "Software Engineer",
            candidate_name: candidate,
            question_count: String(Math.max(3, Math.min(8, Math.round(minutes / 4)))),
            duration_minutes: String(minutes),
        },
    }
}

