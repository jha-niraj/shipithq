"use client"

import { motion } from "framer-motion"
import {
    Clock, Users, Mic, Video, Phone, MapPin, Code, Layout, MessageSquare,
    FileText, ChevronRight, Star, Edit2, LinkIcon, TrendingUp, Layers, CalendarDays, Briefcase
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"

interface InterviewRound {
    id: string
    roundNumber: number
    roundType: string
    title: string
    durationMinutes?: number | null
    format: string
    description: string
    hasMockInterview: boolean
    whatToExpect?: string[] | null
    sampleQuestions?: string[] | null
    evaluationCriteria?: string[] | null
    topicsCovered?: string[] | null
    tipsForCandidates?: string[] | null
    passRatePercent?: number | null
    daysToNextRound?: number | null
}

interface InterviewProcess {
    id: string
    name: string
    description?: string | null
    isDefault: boolean
    isActive: boolean
    estimatedDurationWeeks?: number | null
    rounds: InterviewRound[]
    jobs?: Array<{
        id: string
        title: string
        slug: string
        status: string
    }>
    createdAt: Date
}

interface InterviewProcessDetailProps {
    process: InterviewProcess
    onClose: () => void
}

const roundTypeIcons: Record<string, React.ElementType> = {
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
    PHONE_SCREEN: "bg-neutral-900",
    TECHNICAL_CODING: "bg-neutral-900",
    SYSTEM_DESIGN: "bg-neutral-900",
    BEHAVIORAL: "bg-neutral-900",
    TAKE_HOME: "bg-neutral-900",
    PANEL: "bg-neutral-900",
    HIRING_MANAGER: "bg-neutral-900",
    CULTURE_FIT: "bg-neutral-900",
    HR_FINAL: "bg-neutral-900",
    CUSTOM: "bg-neutral-500",
}

const formatLabels: Record<string, { icon: React.ElementType; label: string }> = {
    VOICE: { icon: Phone, label: "Phone Call" },
    VIDEO: { icon: Video, label: "Video Call" },
    IN_PERSON: { icon: MapPin, label: "In Person" },
    TAKE_HOME: { icon: FileText, label: "Take Home" },
    LIVE_CODING: { icon: Code, label: "Live Coding" },
    WHITEBOARD: { icon: Layout, label: "Whiteboard" },
}

export function InterviewProcessDetail({ process, onClose }: InterviewProcessDetailProps) {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {
                                process.isDefault && (
                                    <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                        <Star className="w-3 h-3 mr-1" />
                                        Default
                                    </Badge>
                                )
                            }
                            {
                                !process.isActive && (
                                    <Badge variant="secondary">Inactive</Badge>
                                )
                            }
                        </div>
                        {
                            process.description && (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {process.description}
                                </p>
                            )
                        }
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </div>
                <StatBand
                    size="sm"
                    cols={3}
                    items={[
                        { icon: Layers, label: "Rounds", value: process.rounds.length },
                        { icon: CalendarDays, label: "Weeks", value: process.estimatedDurationWeeks || "-" },
                        { icon: Briefcase, label: "Jobs", value: process.jobs?.length || 0 },
                    ]}
                />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                    Interview Rounds
                </h3>
                <div className="relative">
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-neutral-200 dark:bg-neutral-800" />

                    <div className="space-y-4">
                        {
                            process.rounds.map((round, index) => {
                                const IconComponent = roundTypeIcons[round.roundType] || FileText
                                const formatInfo = formatLabels[round.format] || formatLabels.VIDEO
                                const FormatIcon = formatInfo?.icon || Video

                                return (
                                    <motion.div
                                        key={round.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="relative flex gap-4"
                                    >
                                        <div className={`relative z-10 w-12 h-12 rounded-full ${roundTypeColors[round.roundType]} flex items-center justify-center shrink-0`}>
                                            <IconComponent className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-neutral-500 uppercase">
                                                            Round {round.roundNumber}
                                                        </span>
                                                        {
                                                            round.hasMockInterview && (
                                                                <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 text-xs">
                                                                    <Mic className="w-3 h-3 mr-1" />
                                                                    Mock Available
                                                                </Badge>
                                                            )
                                                        }
                                                    </div>
                                                    <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                                                        {round.title}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-neutral-500">
                                                    {
                                                        round.durationMinutes && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                <span>{round.durationMinutes}m</span>
                                                            </div>
                                                        )
                                                    }
                                                    <div className="flex items-center gap-1">
                                                        <FormatIcon className="w-4 h-4" />
                                                        <span>{formatInfo?.label || "Video Call"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                                {round.description}
                                            </p>

                                            {
                                                (round.passRatePercent || round.daysToNextRound) && (
                                                    <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                                        {
                                                            round.passRatePercent && (
                                                                <div className="flex items-center gap-1.5 text-sm">
                                                                    <TrendingUp className="w-4 h-4 text-neutral-900" />
                                                                    <span className="text-neutral-600 dark:text-neutral-400">
                                                                        {round.passRatePercent}% pass rate
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            round.daysToNextRound && (
                                                                <div className="flex items-center gap-1.5 text-sm">
                                                                    <Clock className="w-4 h-4 text-neutral-900" />
                                                                    <span className="text-neutral-600 dark:text-neutral-400">
                                                                        ~{round.daysToNextRound} days to next
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </motion.div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>

            {
                process.jobs && process.jobs.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                            Linked Jobs
                        </h3>
                        <div className="space-y-2">
                            {
                                process.jobs.map((job) => (
                                    <div
                                        key={job.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <LinkIcon className="w-4 h-4 text-neutral-400" />
                                            <span className="font-medium text-neutral-900 dark:text-white">
                                                {job.title}
                                            </span>
                                            <Badge variant="secondary" className="text-xs capitalize">
                                                {job.status.toLowerCase()}
                                            </Badge>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )
            }

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl"
                >
                    Close
                </Button>
                <Button
                    className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Process
                </Button>
            </div>
        </div>
    )
}