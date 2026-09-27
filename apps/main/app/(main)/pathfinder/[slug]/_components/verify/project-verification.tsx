'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Lock, Wrench, ArrowRight, Hourglass } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import { InlineLoader } from '@repo/ui/components/ui/inline-loader'
import { Shimmer, ShimmerStyles } from '@repo/ui/components/skeleton-kit'
import toast from '@repo/ui/components/ui/sonner'
import { cn } from '@repo/ui/lib/utils'
import type { VerificationSectionStatus } from '@repo/db'
import { linkVerificationProject, listMyProjectsForVerification } from '@/actions/(main)/pathfinder/verification.action'

/**
 * The project section (plan/pathfinder PF-11): pick one of your own Projects. It
 * passes when that project is COMPLETED under the project's own review, now or
 * whenever it gets there; until then the section waits on it. The goal's suggested
 * projects are shown as ideas to start in Projects.
 */

interface Suggested { title: string; description: string }
type Mine = Awaited<ReturnType<typeof listMyProjectsForVerification>>['projects'][number]

const STATUS: Record<string, string> = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', SUBMITTED: 'Submitted, in review', COMPLETED: 'Completed' }

export function ProjectVerification({ goalId, minorProject, majorProject, status, complete, linkedProjectId }: {
    goalId: string
    minorProject?: Suggested | null
    majorProject?: Suggested | null
    status: VerificationSectionStatus
    complete: boolean
    linkedProjectId?: string | null
}) {
    const router = useRouter()
    const [mine, setMine] = useState<Mine[] | null>(null)
    const [linking, setLinking] = useState<string | null>(null)

    useEffect(() => {
        if (status === 'LOCKED' || status === 'COMPLETED' || complete) return
        listMyProjectsForVerification().then((r) => setMine(r.projects))
    }, [status, complete])

    if (status === 'COMPLETED' || complete) {
        return (
            <Centered icon={<CheckCircle2 className="size-9 text-neutral-900 dark:text-neutral-100" />} title="Project passed"
                body="Your linked project is complete, so this section is done." />
        )
    }
    if (status === 'LOCKED') {
        return <Centered icon={<Lock className="size-9 text-neutral-500" />} title="Project is locked" body="Pass the mock interview to unlock it." />
    }

    const link = async (projectId: string) => {
        setLinking(projectId)
        const r = await linkVerificationProject(goalId, projectId)
        setLinking(null)
        if (!r.success) { toast.error(r.error); return }
        toast.success(r.passed ? 'Project section passed' : 'Linked. It passes when the project is completed.')
        router.refresh()
    }
    const linked = mine?.find((p) => p.id === linkedProjectId) ?? null

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-page py-8">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"><Wrench className="size-5" /></span>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Prove it with a project</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Link one of your projects. It passes when the project is completed.</p>
                    </div>
                </div>

                {status === 'IN_PROGRESS' && linked && (
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral-900 p-4 dark:border-white">
                        <Hourglass className="size-5 shrink-0 text-neutral-700 dark:text-neutral-300" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">Waiting on {linked.title}</p>
                            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{STATUS[linked.status] ?? linked.status} · {Math.round(linked.progress)}%</p>
                        </div>
                        <Button asChild size="sm" variant="outline"><Link href={`/projects/${linked.slug}`}>Open</Link></Button>
                    </div>
                )}

                <h3 className="mt-8 text-sm font-semibold text-neutral-900 dark:text-white">Your projects</h3>
                {mine === null ? (
                    <div className="mt-3 space-y-2"><ShimmerStyles />{Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} className="h-14 w-full rounded-xl" delay={i * 0.04} />)}</div>
                ) : mine.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                        You have not started a project yet. Pick one in Projects, or build one of the ideas below.
                    </p>
                ) : (
                    <ul className="mt-3 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                        {mine.map((p) => (
                            <li key={p.id} className={cn('flex items-center gap-3 px-4 py-3', p.id === linkedProjectId && 'bg-neutral-50 dark:bg-neutral-900/60')}>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{p.title}</p>
                                    <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{STATUS[p.status] ?? p.status} · {Math.round(p.progress)}%</p>
                                </div>
                                {p.id === linkedProjectId
                                    ? <span className="font-mono text-[11px] text-neutral-500">linked</span>
                                    : <Button size="sm" variant="outline" disabled={!!linking} onClick={() => link(p.id)} className="gap-1.5">
                                        {linking === p.id && <InlineLoader size="sm" />}Use this
                                    </Button>}
                            </li>
                        ))}
                    </ul>
                )}

                {(minorProject || majorProject) && (
                    <>
                        <h3 className="mt-8 text-sm font-semibold text-neutral-900 dark:text-white">Ideas for this goal</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {[majorProject && { ...majorProject, tag: 'Bigger' }, minorProject && { ...minorProject, tag: 'Smaller' }].filter(Boolean).map((s) => (
                                <div key={s!.title} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                                    <p className="font-mono text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{s!.tag}</p>
                                    <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">{s!.title}</p>
                                    <p className="mt-1 text-[13px] leading-5 text-neutral-500 dark:text-neutral-400">{s!.description}</p>
                                </div>
                            ))}
                        </div>
                        <Button asChild variant="outline" className="mt-4 gap-1.5">
                            <Link href="/projects/explore">Find a project to build <ArrowRight className="size-4" /></Link>
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

function Centered({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
                <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">{icon}</span>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
            </div>
        </div>
    )
}
