"use client"

import { motion } from "framer-motion"
import {
    MapPin, ChevronRight, Mic, Users, CheckCircle2, Sparkles,
    UserCheck, Bookmark, BookmarkCheck, Target, Zap, Play
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { CompanyMark } from "@repo/ui/components/ui/company-mark"
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
                            <CompanyMark seed={job.company.id} name={job.company.name} fill size={40} className="rounded-none border-0" />
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

    const salary = job.salaryDisclosed ? formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) : null
    // One meta line, joined, truncating as a whole (plan/jobs-polish JP-24).
    const meta = [
        job.location || locationTypeLabels[job.locationType],
        employmentTypeLabels[job.employmentType],
        formatExperience(job.experienceMin, job.experienceMax),
        salary,
    ].filter(Boolean).join(" · ")
    const SKILL_CAP = 5
    const matched = job.matchedSkills.slice(0, SKILL_CAP)
    const missing = job.missingSkills.slice(0, SKILL_CAP - matched.length)
    const moreSkills = job.matchedSkills.length + job.missingSkills.length - matched.length - missing.length
    const rounds = job.interviewProcess
        ? [
            `${job.interviewProcess.rounds.length} ${job.interviewProcess.rounds.length === 1 ? "round" : "rounds"}`,
            job.interviewProcess.estimatedDurationWeeks ? `~${job.interviewProcess.estimatedDurationWeeks}w` : null,
            hasMockInterview ? "Mock" : null,
        ].filter(Boolean).join(" · ")
        : null

    return (
        // A light fade only: a paginated list of 10 re-renders on every page, so no long stagger.
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: Math.min(index, 5) * 0.03, duration: 0.2 }}
            className="@container group relative cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
            onClick={() => onViewDetails(job)}
        >
            <div className="flex items-start gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 @lg:h-12 @lg:w-12 dark:border-neutral-700 dark:bg-neutral-800">
                    {job.company.logoUrl ? (
                        <Image src={job.company.logoUrl} alt={job.company.name} className="object-cover" fill />
                    ) : (
                        <CompanyMark seed={job.company.id} name={job.company.name} fill size={48} className="rounded-none border-0" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            {/* min-w-0 down the chain, or a long title widens the column past the card (UI-17). */}
                            <h3 className="line-clamp-2 min-w-0 text-base font-semibold text-neutral-900 @lg:line-clamp-1 dark:text-white">
                                {job.title}
                            </h3>
                            <p className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="truncate">{job.company.name}</span>
                                {job.isFollowingCompany && (
                                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                        <UserCheck className="h-3 w-3" /> Following
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {showMatchScore && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                                                <MatchIcon className="h-3 w-3" /> {job.matchScore}%
                                            </span>
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
                            {/* Always visible: hover-only hid it from keyboard and touch users. */}
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={job.isSaved ? "Saved" : "Save job"}
                                aria-pressed={job.isSaved}
                                className="h-8 w-8 shrink-0 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSave(job.id)
                                }}
                            >
                                {job.isSaved ? <BookmarkCheck className="h-4 w-4 fill-current text-neutral-900 dark:text-white" /> : <Bookmark className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{meta}</span>
                    </p>

                    {(matched.length > 0 || missing.length > 0) && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {matched.map((skill) => (
                                <Badge key={`m-${skill}`} className="bg-neutral-100 text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    {skill}
                                </Badge>
                            ))}
                            {missing.map((skill) => (
                                <Badge key={`x-${skill}`} variant="outline" className="text-xs text-neutral-600 dark:text-neutral-400">
                                    {skill}
                                </Badge>
                            ))}
                            {moreSkills > 0 && <Badge variant="outline" className="text-xs text-neutral-600 dark:text-neutral-400">+{moreSkills}</Badge>}
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-100 pt-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                        {rounds ? (
                            <span className="inline-flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                                {hasMockInterview ? <Mic className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {rounds}
                            </span>
                        ) : (
                            <span>Interview process not disclosed</span>
                        )}
                        {job.hasApplied && (
                            <span className="inline-flex items-center gap-1 font-medium text-neutral-900 dark:text-white">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                            </span>
                        )}
                        <span className="ml-auto flex items-center gap-3">
                            {showPracticeButton && hasMockInterview && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 px-2.5 text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onPractice?.(job)
                                    }}
                                >
                                    <Play className="h-3 w-3 fill-current" /> Practice
                                </Button>
                            )}
                            <span className="inline-flex items-center gap-1 tabular-nums" title="Applicants">
                                <Users className="h-3.5 w-3.5" /> {job.applicationsCount}
                            </span>
                        </span>
                    </div>
                </div>

                <ChevronRight className="mt-3 hidden h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-900 @lg:block dark:group-hover:text-white" />
            </div>
        </motion.div>
    )
}
