import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@repo/auth'
import { db, mockVoiceSession } from '@repo/db'
import InterviewSessionClient from './_components/InterviewSessionClient'

export const metadata: Metadata = {
    title: 'Mock Interview Session | ShipItHQ',
    description: 'Live AI mock interview session.',
}

export const dynamic = 'force-dynamic'

// The live mock interview (plan/voice VO-10): Sarvam, spoken or typed.
export default async function MockInterviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params
    const session = await getSession(await headers())
    if (!session?.user?.id) redirect(`/signin?next=/mock/voice/interview/${sessionId}`)

    const row = await db.query.mockVoiceSession.findFirst({
        where: and(eq(mockVoiceSession.id, sessionId), eq(mockVoiceSession.userId, session.user.id)),
        with: { mock: { columns: { title: true, duration: true } } },
    })
    if (!row) notFound()
    // Finished, handed in, or an old ElevenLabs session: the results page shows what there is.
    if (row.provider !== 'SARVAM' || !['SCHEDULED', 'IN_PROGRESS'].includes(row.status)) redirect(`/mock/voice/results/${sessionId}`)

    return (
        <InterviewSessionClient
            sessionId={row.id}
            title={row.mock?.title ?? 'Mock interview'}
            endsAt={row.endsAt?.getTime() ?? Date.now() + 30 * 60_000}
            serverNow={Date.now()}
            initial={{ mode: row.mode, consented: Boolean(row.consentedAt), turns: row.turns }}
        />
    )
}
