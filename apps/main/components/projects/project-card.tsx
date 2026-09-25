'use client'

import {
    Card, CardContent, CardFooter, CardHeader
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import {
    Clock, Users, Eye, Trophy, Brain, CheckCircle2, Play, Crown, Sparkles, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Progress } from '@repo/ui/components/ui/progress'
import { Skeleton } from '@repo/ui/components/ui/skeleton'

interface ProjectCardProps {
    project: {
        id: string
        slug: string
        title: string
        shortDescription?: string | null
        description: string
        technologies: string[]
        difficulty: string
        estimatedHours: number
        totalViews?: number
        includeAssessment?: boolean
        isPlatformSeeded?: boolean
        projectSource?: string
        guidedModeEnabled?: boolean
        creator?: {
            name?: string | null
            username?: string | null
            image?: string | null
        }
        progress?: Array<{
            status: string
            progressPercentage: number
            tasksCompleted: number
            totalTasks: number
        }>
        submissions?: Array<{
            id: string
            githubUrl: string
            liveUrl?: string | null
        }>
        _count?: {
            submissions: number
            progress: number
        }
    }
    showProgress?: boolean
    variant?: 'default' | 'compact'
}

const statusColors = {
    NOT_STARTED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    IN_PROGRESS: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    COMPLETED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    SUBMITTED: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
}

export function ProjectCard({ project, showProgress = false }: ProjectCardProps) {
    const description = project.shortDescription || project.description

    const userProgress = project.progress?.[0]
    const hasStarted = userProgress && userProgress.status !== 'NOT_STARTED'

    const creatorInitial = project.creator?.name
        ? project.creator.name.charAt(0).toUpperCase()
        : project.creator?.username
            ? project.creator.username.charAt(0).toUpperCase()
            : 'S'
    const hasCreator = !!(project.creator?.name || project.creator?.username || project.isPlatformSeeded)

    return (
        <Card className="h-full flex flex-col bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-0 gap-0 shadow-none overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-sm transition-all duration-200">
            {/* Top: tech stack tags */}
            <CardHeader className="space-y-0 px-4 pt-4 pb-2">
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {
                        project.technologies.slice(0, 4).map((tech) => (
                            <span
                                key={tech}
                                className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                            >
                                {tech}
                            </span>
                        ))
                    }
                    {
                        project.technologies.length > 4 && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                +{project.technologies.length - 4}
                            </span>
                        )
                    }
                </div>

                {/* Middle: title + description */}
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-snug line-clamp-2">
                    {project.title}
                </h3>

                {showProgress && userProgress && (
                    <Badge className={`${statusColors[userProgress.status as keyof typeof statusColors]} text-[11px] w-fit mt-1.5`}>
                        {userProgress.status.replace('_', ' ')}
                    </Badge>
                )}
            </CardHeader>

            <CardContent className="flex-grow space-y-3 px-4 pb-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {description}
                </p>

                {showProgress && userProgress && hasStarted && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400">Progress</span>
                            <span className="text-neutral-900 dark:text-white font-medium">
                                {userProgress.tasksCompleted}/{userProgress.totalTasks} tasks
                            </span>
                        </div>
                        <Progress value={userProgress.progressPercentage} className="h-1.5" />
                    </div>
                )}

                <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{project.estimatedHours}h</span>
                    </div>
                    {project._count && (
                        <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{project._count.progress} enrolled</span>
                        </div>
                    )}
                    {project.totalViews !== undefined && (
                        <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{project.totalViews}</span>
                        </div>
                    )}
                    {project.includeAssessment && (
                        <div className="flex items-center gap-1">
                            <Brain className="w-3.5 h-3.5" />
                            <span>AI</span>
                        </div>
                    )}
                    {project.isPlatformSeeded && (
                        <div className="flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            <span>ShipItHQ</span>
                        </div>
                    )}
                    {project.guidedModeEnabled && (
                        <div className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Guided</span>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Bottom: creator + action */}
            <CardFooter className="border-t px-4 py-2.5 border-neutral-100 dark:border-neutral-800">
                <div className="w-full flex items-center justify-between gap-2">
                    {/* Creator: left out when unknown, rather than "Anonymous" (a copy's list row carries none). */}
                    {hasCreator ? (
                        <div className="flex items-center gap-2 min-w-0">
                            {project.creator?.image ? (
                                <Image
                                    src={project.creator.image}
                                    alt={project.creator.name || project.creator.username || 'Creator'}
                                    width={24}
                                    height={24}
                                    className="rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300">
                                        {creatorInitial}
                                    </span>
                                </div>
                            )}
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                {project.creator?.name || project.creator?.username || 'ShipItHQ'}
                            </span>
                        </div>
                    ) : <span />}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {showProgress && userProgress ? (
                            <>
                                {userProgress.status === 'IN_PROGRESS' && (
                                    <Link href={`/projects/${project.slug}/workspace`}>
                                        <Button size="sm" className="bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 rounded-xl text-xs">
                                            <Play className="w-3.5 h-3.5 mr-1.5" />
                                            Continue
                                        </Button>
                                    </Link>
                                )}
                                {userProgress.status === 'COMPLETED' && !project.submissions?.length && (
                                    // There is no /submit route: submitting is a sheet on the
                                    // project page (sweep 2026-09-23).
                                    <Link href={`/projects/${project.slug}`}>
                                        <Button size="sm" className="bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 rounded-xl text-xs">
                                            <Trophy className="w-3.5 h-3.5 mr-1.5" />
                                            Submit
                                        </Button>
                                    </Link>
                                )}
                                {userProgress.status === 'SUBMITTED' && (
                                    <Button size="sm" disabled className="rounded-xl text-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                        Submitted
                                    </Button>
                                )}
                                <Link href={`/projects/${project.slug}`}>
                                    <Button variant="outline" size="sm" className="rounded-xl border-neutral-200 dark:border-neutral-700 text-xs">
                                        <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <Link href={`/projects/${project.slug}`} className="flex items-center gap-1 text-xs font-medium text-neutral-900 dark:text-white hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-white transition-colors">
                                View Project
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}

export function ProjectCardSkeleton() {
    return (
        <Card className="h-full flex flex-col bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-0 gap-0 shadow-none overflow-hidden">
            <CardHeader className="space-y-0 px-4 pt-4 pb-2">
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-12 rounded-md" />
                </div>
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="flex-grow space-y-3 px-4 pb-3">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </CardContent>
            <CardFooter className="border-t px-4 py-2.5 border-neutral-100 dark:border-neutral-800">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                </div>
            </CardFooter>
        </Card>
    )
}