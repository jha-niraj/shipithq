"use client"

import { motion } from "framer-motion"
import {
    MapPin, Clock, Briefcase, Building2,
    ChevronRight, Mic, TrendingUp, Users, CheckCircle2, Sparkles,
    UserCheck, Bookmark, BookmarkCheck, Target, Zap, Play
} from "lucide-react"
// Link imported for future use with job detail navigation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@repo/ui/components/ui/tooltip"
import Image from "next/image"
import { cn } from "@repo/ui/lib/utils"
import type { FeedJobResult } from "@/actions/jobs"

// ============================================
// TYPES
// ============================================
export interface JobCardProps {
    job: FeedJobResult
    onSave: (jobId: string) => void
    onViewDetails: (job: FeedJobResult) => void
    onPractice?: (job: FeedJobResult) => void
    showMatchScore?: boolean
    showPracticeButton?: boolean
    index?: number
    variant?: "default" | "compact"
}

// ============================================
// LABEL MAPPINGS
// ============================================
export const locationTypeLabels: Record<string, string> = {
    REMOTE: "Remote",
    HYBRID: "Hybrid",
    ONSITE: "On-site"
}

export const employmentTypeLabels: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    INTERNSHIP: "Internship",
    FREELANCE: "Freelance"
}

// ============================================
// FORMAT HELPERS
// ============================================
export const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    if (max) return `Up to ${formatter.format(max)}`
    return null
}

export const formatExperience = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `${min}-${max} years`
    if (min) return `${min}+ years`
    if (max) return `Up to ${max} years`
    return null
}

// ============================================
// MATCH SCORE HELPERS
// ============================================
export const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800/30"
    if (score >= 70) return "text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800/30"
    return "text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800/30"
}

export const getMatchScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Perfect Match", icon: Target, color: "text-neutral-800 dark:text-neutral-100" }
    if (score >= 70) return { label: "Good Match", icon: Zap, color: "text-neutral-800 dark:text-neutral-100" }
    return { label: "Explore", icon: Sparkles, color: "text-neutral-800 dark:text-neutral-100" }
}

// ============================================
// JOB CARD COMPONENT
// ============================================
export function JobCard({ 
    job, 
    onSave, 
    onViewDetails, 
    onPractice,
    showMatchScore = true, 
    showPracticeButton = true,
    index = 0,
    variant = "default"
}: JobCardProps) {
    const matchBadge = getMatchScoreBadge(job.matchScore)
    const MatchIcon = matchBadge.icon
    const hasMockInterview = job.interviewProcess?.rounds?.some(r => r.hasMockInterview) ?? false

    if (variant === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer"
                onClick={() => onViewDetails(job)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                        {job.company.logoUrl ? (
                            <Image
                                src={job.company.logoUrl}
                                alt={job.company.name}
                                className="object-cover"
                                fill
                            />
                        ) : (
                            <Building2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors truncate">
                            {job.title}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{job.company.name}</p>
                    </div>
                    {showPracticeButton && hasMockInterview && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onPractice) {
                                    onPractice(job)
                                }
                            }}
                        >
                            <Play className="w-3 h-3 mr-1 fill-current" />
                            Practice
                        </Button>
                    )}
                    {showMatchScore && (
                        <Badge className={cn("text-xs font-medium shrink-0", getMatchScoreColor(job.matchScore))}>
                            {job.matchScore}%
                        </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => onViewDetails(job)}
        >
            {/* Match score indicator bar */}
            {/* The two upper branches were `from-neutral-900 to-neutral-900` - a
                gradient between one colour and itself. And the bar was invisible in
                dark mode, where `neutral-900` IS the card. Flat, and paired. */}
            <div className={cn(
                "absolute inset-x-0 top-0 h-1",
                job.matchScore >= 70
                    ? "bg-neutral-900 dark:bg-white"
                    : "bg-neutral-300 dark:bg-neutral-600",
            )} />

            <div className="flex items-start gap-3 sm:gap-4">
                {/* Company Logo */}
                <div className="h-11 w-11 sm:w-14 sm:h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {job.company.logoUrl ? (
                        <Image
                            src={job.company.logoUrl}
                            alt={job.company.name}
                            className="object-cover"
                            fill
                        />
                    ) : (
                        <Building2 className="h-5 w-5 sm:w-7 sm:h-7 text-neutral-600 dark:text-neutral-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title and Match Score */}
                    <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        {/* Stacked on a phone, so the title gets the whole width and the
                            match badge sits under it. */}
                        {/* min-w-0 down the chain, or a long title widens this column
                            past the card and is cut at its edge instead of truncating
                            (390px, plan/ui-pass UI-17). */}
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 mb-0.5">
                                <h3 className="min-w-0 text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors line-clamp-2 sm:line-clamp-1">
                                    {job.title}
                                </h3>
                                {job.isFollowingCompany && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 text-xs px-1.5 py-0">
                                                    <UserCheck className="w-3 h-3 mr-0.5" />
                                                    Following
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>You follow this company</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <p className="truncate text-neutral-500 dark:text-neutral-400">{job.company.name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {showMatchScore && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Badge className={cn("font-semibold", getMatchScoreColor(job.matchScore))}>
                                                <MatchIcon className="w-3.5 h-3.5 mr-1" />
                                                {job.matchScore}%
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-sm">
                                                <p className="font-medium">{matchBadge.label}</p>
                                                <p className="text-neutral-600 dark:text-neutral-400">Based on your skills</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "shrink-0 rounded-xl transition-all",
                                    job.isSaved
                                        ? "text-neutral-900 dark:text-neutral-100 hover:text-neutral-800"
                                        : "opacity-0 group-hover:opacity-100"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSave(job.id)
                                }}
                            >
                                {job.isSaved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Job Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location || locationTypeLabels[job.locationType]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{employmentTypeLabels[job.employmentType]}</span>
                        </div>
                        {formatExperience(job.experienceMin, job.experienceMax) && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatExperience(job.experienceMin, job.experienceMax)}</span>
                            </div>
                        )}
                        {job.salaryDisclosed && formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) && (
                            <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-100">
                                <TrendingUp className="w-4 h-4" />
                                <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                            </div>
                        )}
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {job.matchedSkills.slice(0, 4).map((skill, i) => (
                            <Badge key={i} className="text-xs bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {skill}
                            </Badge>
                        ))}
                        {job.missingSkills.slice(0, 2).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-neutral-500 dark:text-neutral-400">
                                {skill}
                            </Badge>
                        ))}
                        {(job.matchedSkills.length + job.missingSkills.length) > 6 && (
                            <Badge variant="secondary" className="text-xs">
                                +{(job.matchedSkills.length + job.missingSkills.length) - 6}
                            </Badge>
                        )}
                    </div>

                    {/* Interview Process and Competition */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {job.interviewProcess ? (
                                <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{job.interviewProcess.rounds.length} rounds</span>
                                    {job.interviewProcess.estimatedDurationWeeks && (
                                        <>
                                            <span className="text-neutral-600 dark:text-neutral-400">•</span>
                                            <span>~{job.interviewProcess.estimatedDurationWeeks}w</span>
                                        </>
                                    )}
                                    {hasMockInterview && (
                                        <>
                                            <span className="text-neutral-600 dark:text-neutral-400">•</span>
                                            <Mic className="w-4 h-4" />
                                            <span>Mock</span>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className="text-sm text-neutral-600 dark:text-neutral-400">Interview process not disclosed</span>
                            )}
                            {job.company.hasTransparentProcess && (
                                <Badge className="text-xs px-1.5 py-0 bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                    Transparent
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Practice Mock Interview Button */}
                            {showPracticeButton && hasMockInterview && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/20 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/30"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (onPractice) {
                                                        onPractice(job)
                                                    }
                                                }}
                                            >
                                                <Play className="w-3 h-3 mr-1.5 fill-current" />
                                                Practice
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-sm">
                                                <p className="font-medium">Practice Mock Interview</p>
                                                <p className="text-neutral-600 dark:text-neutral-400">Prepare for this role with AI interviews</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <Users className="w-4 h-4" />
                                <span>{job.applicationsCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <ChevronRight className="mt-6 h-5 w-5 shrink-0 text-neutral-500 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white" />
            </div>

            {/* IN FLOW, not `absolute bottom-0`.
                It was absolutely positioned across the bottom of the card, so it
                painted straight over the card's own last row - "Interview process
                not disclosed" and the applicant count sat underneath it. A banner
                that hides the content it is attached to is worse than no banner.
                The negative margins pull it out to the card's edges; the card grows
                to fit it. See JB-9. */}
            {job.hasApplied && (
                <div className="-mx-5 -mb-5 mt-4 border-t border-neutral-200 bg-neutral-50 px-5 py-2 dark:border-neutral-800 dark:bg-neutral-800/30">
                    <span className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        <CheckCircle2 className="h-4 w-4" />
                        You&apos;ve applied to this job
                    </span>
                </div>
            )}
        </motion.div>
    )
}
