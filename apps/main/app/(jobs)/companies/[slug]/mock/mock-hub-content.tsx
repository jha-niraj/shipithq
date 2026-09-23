"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeft, Building2, Play, Clock, Users, Star, CheckCircle2, Lock,
    Sparkles, Award, TrendingUp, Target, ChevronRight, Video,
    MessageSquare, Code, Layout, Phone, FileText, Briefcase, MapPin,
    AlertCircle
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@repo/ui/lib/utils"
import { StatBand } from "@repo/ui/components/ui/stat-band"

import { LucideIcon } from "lucide-react"

// ============================================
// TYPES
// ============================================

interface Company {
    id: string
    name: string
    slug: string
    logo: string | null
    industry: string | null
    isVerified: boolean
}

interface InterviewRound {
    id: string
    roundNumber: number
    title: string
    roundType: string
    description: string | null
    durationMinutes: number | null
    hasMockInterview: boolean
    tipsForCandidates: string[] | null
}

interface InterviewProcess {
    id: string
    name: string
    description: string | null
    estimatedDurationWeeks: number | null
    rounds: InterviewRound[]
}

interface Job {
    id: string
    title: string
    slug: string
    location: string | null
    locationType: string
    employmentType: string
    interviewProcess: InterviewProcess | null
    applicationsCount: number
}

interface UserProgress {
    roundId: string
    sessionsCompleted: number
    bestScore: number | null
    lastPracticedAt: Date | null
}

interface MockHubData {
    jobs: Job[]
    processes: InterviewProcess[]
    userProgress: UserProgress[]
    stats: {
        totalSessions: number
        averageScore: number
        roundsAttempted: number
    }
}

interface CompanyMockHubContentProps {
    company: Company
    mockHub: MockHubData | null
}

// ============================================
// CONSTANTS
// ============================================

const roundTypeIcons: Record<string, LucideIcon> = {
    PHONE_SCREEN: Phone,
    TECHNICAL_CODING: Code,
    SYSTEM_DESIGN: Layout,
    BEHAVIORAL: MessageSquare,
    TAKE_HOME: FileText,
    PANEL: Users,
    HIRING_MANAGER: Star,
    CULTURE_FIT: Users,
    HR_FINAL: Users,
    CUSTOM: FileText,
}

const roundTypeColors: Record<string, string> = {
    PHONE_SCREEN: "from-neutral-900 to-neutral-800",
    TECHNICAL_CODING: "from-neutral-900 to-neutral-800",
    SYSTEM_DESIGN: "from-neutral-900 to-neutral-800",
    BEHAVIORAL: "from-neutral-900 to-neutral-800",
    TAKE_HOME: "from-neutral-900 to-neutral-800",
    PANEL: "from-pink-500 to-pink-600",
    HIRING_MANAGER: "from-neutral-900 to-neutral-800",
    CULTURE_FIT: "from-neutral-900 to-neutral-800",
    HR_FINAL: "from-neutral-900 to-neutral-800",
    CUSTOM: "from-neutral-500 to-neutral-600",
}

const employmentTypeLabels: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    INTERNSHIP: "Internship",
    FREELANCE: "Freelance"
}

const locationTypeLabels: Record<string, string> = {
    REMOTE: "Remote",
    HYBRID: "Hybrid",
    ONSITE: "On-site"
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CompanyMockHubContent({ company, mockHub }: CompanyMockHubContentProps) {
    const router = useRouter()
    const [selectedJobId, setSelectedJobId] = useState<string | null>(
        mockHub?.jobs[0]?.id || null
    )

    const selectedJob = mockHub?.jobs.find(j => j.id === selectedJobId)
    const progressMap = new Map(mockHub?.userProgress.map(p => [p.roundId, p]) || [])

    const getProgressForRound = (roundId: string) => {
        return progressMap.get(roundId)
    }

    const getMockRoundsCount = (job: Job) => {
        return job.interviewProcess?.rounds.filter(r => r.hasMockInterview).length || 0
    }

    // Empty state - no mock interviews available
    if (!mockHub || mockHub.jobs.length === 0) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="gap-2 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                        No Mock Interviews Available
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                        {company.name} hasn&apos;t configured their interview process for mock interviews yet.
                        Check back later!
                    </p>
                    <Link href={`/companies/${company.slug}`}>
                        <Button variant="outline" className="rounded-xl">
                            View Company Profile
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-neutral-800 via-neutral-800 to-neutral-800 text-white">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2 mb-4 text-white/80 hover:text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden relative">
                            {
                                company.logo ? (
                                    <Image src={company.logo} alt={company.name} fill className="object-cover" />
                                ) : (
                                    <Building2 className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
                                )
                            }
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                                {company.name} Mock Interview Hub
                                {
                                    company.isVerified && (
                                        <CheckCircle2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    )
                                }
                            </h1>
                            <p className="text-white/80 text-sm">
                                Practice AI interviews tailored to each job role
                            </p>
                        </div>
                    </div>
                    {/* The band brings its own surface and ink, so it reads the same on
                        this constant dark banner in both themes. */}
                    <StatBand
                        size="sm"
                        cols={3}
                        items={[
                            { icon: Video, label: "Sessions", value: mockHub.stats.totalSessions },
                            { icon: TrendingUp, label: "Avg. Score", value: `${mockHub.stats.averageScore}%` },
                            { icon: Target, label: "Rounds", value: mockHub.stats.roundsAttempted },
                        ]}
                    />
                </div>
            </div>

            {/* Score Threshold Notice */}
            <div className="bg-neutral-50 dark:bg-neutral-800/20 border-b border-neutral-200 dark:border-neutral-800">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                            <strong>Note:</strong> Only scores of 75% or above are shared with {company.name}&apos;s recruiters
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content - Sidebar + Content */}
            {/* w-80 beside flex-1 with no breakpoint left 40px for the main column
                on a 360px phone - the job-role list is now full-width above the
                mocks below `lg` instead of squeezed beside them. The fixed width
                stays `lg:`-scoped for the same reason. See
                docs/responsiveness.md section 3. */}
            <div className="flex-1 flex flex-col lg:flex-row w-full">
                {/* Sidebar - Job Roles */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                        <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Job Roles ({mockHub.jobs.length})
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Select a role to practice mock interviews
                        </p>
                    </div>
                    <ScrollArea className="[&_[data-radix-scroll-area-viewport]]:max-h-80 lg:h-[calc(100dvh-320px)] lg:max-h-none">
                        <div className="p-2 space-y-1">
                            {
                                mockHub.jobs.map((job) => {
                                    const mockCount = getMockRoundsCount(job)
                                    const isSelected = selectedJobId === job.id
                                    
                                    return (
                                        <button
                                            key={job.id}
                                            onClick={() => setSelectedJobId(job.id)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl transition-all",
                                                isSelected
                                                    ? "bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700"
                                                    : "hover:bg-white/50 dark:hover:bg-neutral-800/50"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={cn(
                                                        "font-medium text-sm truncate",
                                                        isSelected
                                                            ? "text-neutral-900 dark:text-white"
                                                            : "text-neutral-700 dark:text-neutral-300"
                                                    )}>
                                                        {job.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                        <span>{employmentTypeLabels[job.employmentType]}</span>
                                                        <span>•</span>
                                                        <span>{locationTypeLabels[job.locationType]}</span>
                                                    </div>
                                                </div>
                                                {
                                                    mockCount > 0 && (
                                                        <Badge className={cn(
                                                            "text-xs shrink-0",
                                                            isSelected
                                                                ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                                        )}>
                                                            {mockCount} mocks
                                                        </Badge>
                                                    )
                                                }
                                            </div>
                                            {
                                                job.interviewProcess && (
                                                    <div className="flex items-center gap-1 mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                                                        <CheckCircle2 className="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                                                        <span>{job.interviewProcess.rounds.length} interview rounds</span>
                                                    </div>
                                                )
                                            }
                                        </button>
                                    )
                                })
                            }
                        </div>
                    </ScrollArea>
                </div>

                {/* Main Content - Mock Interviews for Selected Role */}
                <ScrollArea className="min-h-0 flex-1" viewportClassName="p-6" reflow>
                    <AnimatePresence mode="wait">
                        {
                            selectedJob ? (
                                <motion.div
                                    key={selectedJob.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Job Header */}
                                    <div className="mb-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                                    {selectedJob.title}
                                                </h2>
                                                <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{selectedJob.location || locationTypeLabels[selectedJob.locationType]}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <span>{employmentTypeLabels[selectedJob.employmentType]}</span>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        <span>{selectedJob.applicationsCount} applicants</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href={`/jobs/${selectedJob.slug}`}>
                                                <Button variant="outline" className="rounded-xl">
                                                    View Job Details
                                                    <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Interview Rounds */}
                                    {
                                        selectedJob.interviewProcess ? (
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                                        Interview Rounds
                                                    </h3>
                                                    <Badge variant="secondary">
                                                        {selectedJob.interviewProcess.rounds.length} rounds
                                                    </Badge>
                                                    {
                                                        selectedJob.interviewProcess.estimatedDurationWeeks && (
                                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                                                • ~{selectedJob.interviewProcess.estimatedDurationWeeks} weeks
                                                            </span>
                                                        )
                                                    }
                                                </div>

                                                <div className="space-y-4">
                                                    {
                                                        selectedJob.interviewProcess.rounds.map((round, index) => {
                                                            const IconComponent = roundTypeIcons[round.roundType] ?? FileText
                                                            const colorClass = roundTypeColors[round.roundType] ?? "from-neutral-500 to-neutral-600"
                                                            const progress = getProgressForRound(round.id)

                                                            return (
                                                                <motion.div
                                                                    key={round.id}
                                                                    initial={{ opacity: 0, y: 20 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                    className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                                                                >
                                                                    <div className="flex items-start gap-4">
                                                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0 shadow-lg`}>
                                                                            {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    Round {round.roundNumber}
                                                                                </Badge>
                                                                                {
                                                                                    round.durationMinutes && (
                                                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                                            <Clock className="w-3 h-3 inline mr-1" />
                                                                                            {round.durationMinutes} min
                                                                                        </span>
                                                                                    )
                                                                                }
                                                                                {
                                                                                    progress && progress.bestScore !== null && (
                                                                                        <Badge className={cn(
                                                                                            progress.bestScore >= 75
                                                                                                ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                                                                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                                                        )}>
                                                                                            Best: {progress.bestScore}%
                                                                                            {progress.bestScore >= 75 && (
                                                                                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                                                                            )}
                                                                                        </Badge>
                                                                                    )
                                                                                }
                                                                            </div>
                                                                            <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                                                                                {round.title}
                                                                            </h4>
                                                                            {
                                                                                round.description && (
                                                                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                                                                                        {round.description}
                                                                                    </p>
                                                                                )
                                                                            }
                                                                            {
                                                                                progress && progress.sessionsCompleted > 0 && (
                                                                                    <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                                                                                        <span>{progress.sessionsCompleted} sessions completed</span>
                                                                                        {
                                                                                            progress.lastPracticedAt && (
                                                                                                <span className="ml-2">
                                                                                                    • Last: {new Date(progress.lastPracticedAt).toLocaleDateString()}
                                                                                                </span>
                                                                                            )
                                                                                        }
                                                                                    </div>
                                                                                )
                                                                            }
                                                                            {
                                                                                round.tipsForCandidates && round.tipsForCandidates.length > 0 && (
                                                                                    <div className="flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-100">
                                                                                        <Sparkles className="w-3 h-3" />
                                                                                        <span>{round.tipsForCandidates.length} tips from the team</span>
                                                                                    </div>
                                                                                )
                                                                            }
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {
                                                                                round.hasMockInterview ? (
                                                                                    <Button className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white gap-2" asChild><Link href={`/mock/company/${company.slug}?job=${selectedJob.id}&round=${round.id}`}>
                                                                                        <Play className="w-4 h-4 fill-current" />
                                                                                        Practice
                                                                                    </Link></Button>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-neutral-500 dark:text-neutral-400">
                                                                                        <Lock className="w-3 h-3 mr-1" />
                                                                                        Coming Soon
                                                                                    </Badge>
                                                                                )
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )
                                                        })
                                                    }
                                                </div>

                                                {/* Ready to Apply CTA */}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                    className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-neutral-50 to-neutral-50 dark:from-neutral-800/20 dark:to-neutral-800/20 border border-neutral-200 dark:border-neutral-800"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-900 flex items-center justify-center shrink-0">
                                                            <Award className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                                                                Ready to Apply?
                                                            </h4>
                                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                                                Practice makes perfect! Once you score 75% or above, your results will be 
                                                                visible to {company.name}&apos;s recruiters, giving you an edge.
                                                            </p>
                                                            <Link href={`/jobs/${selectedJob.slug}`}>
                                                                <Button className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white">
                                                                    Apply to {selectedJob.title}
                                                                    <ChevronRight className="w-4 h-4 ml-1" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-16">
                                                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                                    <Lock className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                                                    No Interview Process Configured
                                                </h3>
                                                <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                                                    This role doesn&apos;t have an interview process configured yet.
                                                    Check back later!
                                                </p>
                                            </div>
                                        )
                                    }
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-16"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                        <Briefcase className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                                        Select a Job Role
                                    </h3>
                                    <p className="text-neutral-500 dark:text-neutral-400">
                                        Choose a job role from the sidebar to view and practice mock interviews
                                    </p>
                                </motion.div>
                            )
                        }
                    </AnimatePresence>
                </ScrollArea>
            </div>
        </div>
    )
}
