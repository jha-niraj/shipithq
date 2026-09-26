'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import toast from '@repo/ui/components/ui/sonner'
import type { VoiceMode, VoiceTurn } from '@repo/db'
import { handInMockInterview } from '@/actions/(main)/mockvoice/conversation.action'
import { LiveInterview } from '@/components/voice/live-interview'
import { formatClock } from '@/components/hiring/runner-shell'

/*
 * A mock interview on Sarvam (plan/voice VO-10): the shared live interview,
 * spoken or typed, on the session's clock. Handing in goes to the results page,
 * which follows the scoring.
 */

export default function InterviewSessionClient({ sessionId, title, endsAt, serverNow, initial }: {
    sessionId: string
    title: string
    endsAt: number
    serverNow: number
    initial: { mode: VoiceMode | null; consented: boolean; turns: VoiceTurn[] }
}) {
    const router = useRouter()
    const offset = useRef(serverNow - Date.now())
    const [remaining, setRemaining] = useState(() => endsAt - (Date.now() + offset.current))
    const [ending, setEnding] = useState(false)

    useEffect(() => {
        const t = window.setInterval(() => {
            const left = endsAt - (Date.now() + offset.current)
            setRemaining(left)
            if (left <= 0) setEnding(true)
        }, 250)
        return () => window.clearInterval(t)
    }, [endsAt])

    const handIn = useCallback(async () => {
        const r = await handInMockInterview(sessionId)
        if (!r.success) { toast.error(r.error ?? 'Could not hand in'); return }
        router.push(`/mock/voice/results/${sessionId}`)
    }, [router, sessionId])

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
                <Link href="/mock" aria-label="Back to mock interviews" className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">Mock interview</p>
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
                </div>
                <span
                    aria-label="Time left"
                    className={cn('rounded-lg px-2.5 py-1 font-mono text-sm tabular-nums', remaining <= 60_000 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white')}
                >
                    {formatClock(remaining)}
                </span>
            </header>
            <main className="flex-1">
                <LiveInterview
                    voiceRef={{ kind: 'mock', id: sessionId }}
                    title={title}
                    allows={{ voice: true, typed: true }}
                    initial={initial}
                    ending={ending}
                    onHandIn={handIn}
                />
            </main>
        </div>
    )
}
