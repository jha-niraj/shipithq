"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Mic, Search, Play, Users, CheckCircle, BarChart3, Calendar,
    TrendingUp, Eye, MoreVertical, Video, MessageSquare, Target,
    Award
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import Image from "next/image"
import type { MockSession as BaseMockSession, MockStats as BaseMockStats } from "@/types"

// Extended type for displaying session with related user/round/job info
interface MockSessionWithDetails extends Omit<BaseMockSession, 'companyId' | 'updatedAt'> {
    userName?: string | null
    userEmail?: string | null
    userImage?: string | null
    roundTitle?: string | null
    roundType?: string | null
    jobTitle?: string | null
}

// Extended stats with weekly tracking
interface MockStatsExtended extends BaseMockStats {
    sessionsThisWeek: number
}

interface MockInterviewsContentProps {
    initialSessions: MockSessionWithDetails[]
    stats: MockStatsExtended | null
}

const statusColors: Record<string, string> = {
    SCHEDULED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    IN_PROGRESS: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    COMPLETED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    CANCELLED: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const roundTypeIcons: Record<string, React.ReactNode> = {
    PHONE_SCREEN: <Mic className="w-4 h-4" />,
    TECHNICAL_CODING: <MessageSquare className="w-4 h-4" />,
    BEHAVIORAL: <Users className="w-4 h-4" />,
    SYSTEM_DESIGN: <Target className="w-4 h-4" />,
}

export function MockInterviewsContent({ initialSessions, stats }: MockInterviewsContentProps) {
    const [sessions] = useState<MockSessionWithDetails[]>(initialSessions)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [roundFilter, setRoundFilter] = useState<string>("all")

    const filteredSessions = sessions.filter(session => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!session.userName?.toLowerCase().includes(query) &&
                !session.userEmail?.toLowerCase().includes(query) &&
                !session.jobTitle?.toLowerCase().includes(query)) {
                return false
            }
        }
        if (statusFilter !== "all" && session.status !== statusFilter) return false
        if (roundFilter !== "all" && session.roundType !== roundFilter) return false
        return true
    })

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return "N/A"
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date))
    }

    const formatDuration = (seconds: number | null | undefined) => {
        if (!seconds) return "N/A"
        const mins = Math.floor(seconds / 60)
        return `${mins} min`
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-neutral-900 to-pink-500">
                            <Mic className="w-6 h-6 text-white" />
                        </div>
                        Mock Interviews
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        AI-powered practice interviews for your company&apos;s process
                    </p>
                </div>
            </div>

            {
                stats && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <StatBand
                            cols={5}
                            items={[
                                { icon: Video, label: "Total Sessions", value: stats.totalSessions },
                                { icon: CheckCircle, label: "Completed", value: stats.completedSessions },
                                { icon: BarChart3, label: "Avg. Score", value: `${stats.averageScore}%` },
                                { icon: Award, label: "Top Performers (80%+)", value: stats.topPerformers },
                                { icon: TrendingUp, label: "This Week", value: stats.sessionsThisWeek },
                            ]}
                        />
                    </motion.div>
                )
            }

            {
                stats && stats.sessionsByRound.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 mb-8"
                    >
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Sessions by Round Type</h3>
                        <StatBand
                            size="sm"
                            flush
                            cols={4}
                            items={stats.sessionsByRound.map((item) => ({
                                key: item.roundType,
                                icon: Target,
                                label: item.roundType.replace(/_/g, ' ').toLowerCase(),
                                value: item.count,
                            }))}
                        />
                    </motion.div>
                )
            }

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search by candidate name or job..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] rounded-xl">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={roundFilter} onValueChange={setRoundFilter}>
                    <SelectTrigger className="w-[180px] rounded-xl">
                        <SelectValue placeholder="All Rounds" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Rounds</SelectItem>
                        <SelectItem value="PHONE_SCREEN">Phone Screen</SelectItem>
                        <SelectItem value="TECHNICAL_CODING">Technical Coding</SelectItem>
                        <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                        <SelectItem value="SYSTEM_DESIGN">System Design</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <AnimatePresence mode="popLayout">
                {
                    filteredSessions.length > 0 ? (
                        <div className="space-y-3">
                            {
                                filteredSessions.map((session, index) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-900 to-pink-500 flex items-center justify-center overflow-hidden shrink-0">
                                                {
                                                    session.userImage ? (
                                                        <Image
                                                            src={session.userImage}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            fill
                                                        />
                                                    ) : (
                                                        <span className="text-lg font-bold text-white">
                                                            {session.userName?.charAt(0) || "?"}
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                                                        {session.userName || "Unknown Candidate"}
                                                    </h3>
                                                    <Badge className={statusColors[session.status]}>
                                                        {session.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-neutral-500">
                                                    <span className="flex items-center gap-1">
                                                        {roundTypeIcons[session.roundType || ''] || <Mic className="w-3.5 h-3.5" />}
                                                        {session.roundTitle || session.roundType?.replace(/_/g, ' ')}
                                                    </span>
                                                    {
                                                        session.jobTitle && (
                                                            <span>• {session.jobTitle}</span>
                                                        )
                                                    }
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(session.scheduledFor || session.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {
                                                session.status === "COMPLETED" && session.overallScore != null && (
                                                    <div className="text-center px-4">
                                                        <div className={`text-xl font-bold ${(session.overallScore ?? 0) >= 80 ? "text-neutral-800 dark:text-neutral-100" :
                                                                (session.overallScore ?? 0) >= 60 ? "text-neutral-800 dark:text-neutral-100" :
                                                                    "text-red-600 dark:text-red-400"
                                                            }`}>
                                                            {session.overallScore}%
                                                        </div>
                                                        <div className="text-xs text-neutral-500">Score</div>
                                                    </div>
                                                )
                                            }
                                            {
                                                session.durationSeconds && (
                                                    <div className="text-center px-4 hidden md:block">
                                                        <div className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                                                            {formatDuration(session.durationSeconds)}
                                                        </div>
                                                        <div className="text-xs text-neutral-500">Duration</div>
                                                    </div>
                                                )
                                            }

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-xl">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {
                                                        session.status === "COMPLETED" && (
                                                            <DropdownMenuItem>
                                                                <Play className="w-4 h-4 mr-2" />
                                                                View Recording
                                                            </DropdownMenuItem>
                                                        )
                                                    }
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))
                            }
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-100 to-pink-100 dark:from-neutral-800/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-6">
                                <Mic className="w-10 h-10 text-neutral-900" />
                            </div>
                            <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                                No mock sessions yet
                            </h3>
                            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                                Candidates will practice here once you&apos;ve configured your interview process with AI mock interviews enabled.
                            </p>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    )
}