"use client"

import { useCallback, useState } from "react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"

/** How far the card must travel before a release counts as a decision. */
const SWIPE_THRESHOLD = 120
import {
    MapPin, Briefcase, Building2, Clock, TrendingUp, Users,
    CheckCircle2, X, Heart, Bookmark, RotateCcw, Sparkles,
    Target, Zap, ChevronDown, Mic
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@repo/ui/components/ui/tooltip"
import Image from "next/image"
import { cn } from "@repo/ui/lib/utils"
import type { FeedJobResult } from "@/actions/jobs"

interface SwipeCardProps {
    job: FeedJobResult
    onSwipeLeft: () => void
    onSwipeRight: () => void
    onSave: () => void
    onViewDetails: () => void
    isTop?: boolean
}

const locationTypeLabels: Record<string, string> = {
    REMOTE: "Remote",
    HYBRID: "Hybrid",
    ONSITE: "On-site"
}

const employmentTypeLabels: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    INTERNSHIP: "Internship",
    FREELANCE: "Freelance"
}

const formatSalary = (min: number | null, max: number | null, currency: string) => {
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

const formatExperience = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `${min}-${max} years`
    if (min) return `${min}+ years`
    if (max) return `Up to ${max} years`
    return null
}

const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "from-neutral-900 to-neutral-900"
    if (score >= 70) return "from-neutral-900 to-neutral-900"
    return "from-neutral-900 to-red-400"
}

const getMatchScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Perfect Match", icon: Target, color: "text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30" }
    if (score >= 70) return { label: "Good Match", icon: Zap, color: "text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30" }
    return { label: "Explore", icon: Sparkles, color: "text-neutral-900 bg-neutral-100 dark:bg-neutral-800/30" }
}

export function SwipeCard({ 
    job, 
    onSwipeLeft, 
    onSwipeRight, 
    onSave,
    onViewDetails,
    isTop = false 
}: SwipeCardProps) {
    const [exitX, setExitX] = useState(0)
    const [exiting, setExiting] = useState(false)
    
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-240, 240], [-18, 18])
    const opacity = useTransform(x, [-300, -140, 0, 140, 300], [0, 1, 1, 1, 0])
    
    // Overlay opacity based on swipe direction
    const leftOverlayOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])
    const rightOverlayOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])

    const matchBadge = getMatchScoreBadge(job.matchScore)
    const MatchIcon = matchBadge.icon

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Velocity as well as distance, which is what makes a flick feel like a
        // flick: a fast short swipe should commit, a slow long drag should too,
        // and a slow short one should spring back.
        const committed =
            Math.abs(info.offset.x) > SWIPE_THRESHOLD || Math.abs(info.velocity.x) > 500
        if (!committed) return
        fling(info.offset.x > 0 ? "right" : "left")
    }

    /**
     * The card leaves the screen, THEN the handler fires.
     *
     * The buttons used to call `onSwipeRight`/`onSwipeLeft` directly, so pressing
     * one removed the job from the array and the card simply blinked out of
     * existence - only the DRAG path ever set `exitX`. That is the "no animation"
     * in Niraj's report: the animation existed, the buttons just never used it.
     *
     * The parent is told after the exit transition so the card is off-screen
     * before the stack re-renders. See JB-10.
     */
    const fling = useCallback((direction: "left" | "right") => {
        if (exiting) return
        setExiting(true)
        setExitX(direction === "right" ? 1000 : -1000)
        window.setTimeout(() => {
            if (direction === "right") onSwipeRight()
            else onSwipeLeft()
        }, 900)
    }, [exiting, onSwipeLeft, onSwipeRight])

    return (
        <motion.div
            className={cn(
                // `w-full`, no `absolute`: the wrapper centres it now, and an
                // absolutely positioned child cannot be centred by its parent's
                // `items-center`.
                "w-full",
                isTop ? "z-10" : "z-0",
            )}
            style={{ x, rotate, opacity }}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            animate={exiting ? { x: exitX, opacity: 0, rotate: exitX > 0 ? 24 : -24 } : { x: 0 }}
            transition={
                exiting
                    // 0.95s. Slowed four times now - 0.24 / 0.45 / 0.7 all read as
                    // fast. A swipe deck's whole feedback loop is watching the card
                    // leave: the throw IS the animation, not a transition between
                    // two states, and it has to last long enough to follow.
                    ? { duration: 0.95, ease: [0.25, 0.5, 0.35, 1] }
                    : { type: "spring", stiffness: 220, damping: 26 }
            }
        >
            <div className="relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
                {/* Match Score Bar */}
                <div className={cn(
                    "h-1.5 bg-gradient-to-r",
                    getMatchScoreColor(job.matchScore)
                )} />

                {/* Swipe Overlays */}
                <motion.div 
                    className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-center z-20 pointer-events-none"
                    style={{ opacity: leftOverlayOpacity }}
                >
                    <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-bold text-xl rotate-[-15deg]">
                        NOPE
                    </div>
                </motion.div>
                <motion.div 
                    className="absolute inset-0 bg-neutral-900/20 rounded-3xl flex items-center justify-center z-20 pointer-events-none"
                    style={{ opacity: rightOverlayOpacity }}
                >
                    <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-2xl font-bold text-xl rotate-[15deg]">
                        INTERESTED
                    </div>
                </motion.div>

                {/* Card Content */}
                <div className="p-6">
                    {/* Company Header */}
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                            {job.company.logoUrl ? (
                                <Image
                                    src={job.company.logoUrl}
                                    alt={job.company.name}
                                    className="object-cover"
                                    fill
                                />
                            ) : (
                                <Building2 className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="line-clamp-2 text-xl font-bold text-neutral-900 sm:line-clamp-1 dark:text-white">
                                {job.title}
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">{job.company.name}</p>
                            {job.isFollowingCompany && (
                                <Badge className="mt-1 bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 text-xs">
                                    Following
                                </Badge>
                            )}
                        </div>
                        <Badge className={cn("text-sm px-3 py-1.5 font-bold shrink-0", matchBadge.color)}>
                            <MatchIcon className="w-4 h-4 mr-1.5" />
                            {job.matchScore}%
                        </Badge>
                    </div>

                    {/* What the job actually IS.
                        `description` was on `FeedJobResult` all along and the card
                        never rendered it, so a swipe deck about choosing jobs showed
                        a title, a company and four metadata chips - not enough to
                        decide on. Clamped to four lines: this is a card, not the
                        detail page, and "View details" is right there. See JB-15. */}
                    {job.description && (
                        <p className="mb-5 line-clamp-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {job.description}
                        </p>
                    )}

                    {/* Job Details */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <MapPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                            <span>{job.location || locationTypeLabels[job.locationType]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <Briefcase className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                            <span>{employmentTypeLabels[job.employmentType]}</span>
                        </div>
                        {formatExperience(job.experienceMin, job.experienceMax) && (
                            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                <span>{formatExperience(job.experienceMin, job.experienceMax)}</span>
                            </div>
                        )}
                        {job.salaryDisclosed && formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) && (
                            <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100 font-medium">
                                <TrendingUp className="w-4 h-4" />
                                <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                            </div>
                        )}
                    </div>

                    {/* Skills */}
                    <div className="mb-4">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 font-medium">
                            Skills Match
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {job.matchedSkills.slice(0, 5).map((skill, i) => (
                                <Badge key={i} className="text-xs bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {skill}
                                </Badge>
                            ))}
                            {job.missingSkills.slice(0, 3).map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Interview Process */}
                    {job.interviewProcess && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-4 mb-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-100">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">Transparent Process</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-800 dark:text-neutral-100">
                                    <span>{job.interviewProcess.rounds.length} rounds</span>
                                    {job.interviewProcess.estimatedDurationWeeks && (
                                        <>
                                            <span className="text-neutral-600 dark:text-neutral-400">•</span>
                                            <span>~{job.interviewProcess.estimatedDurationWeeks}w</span>
                                        </>
                                    )}
                                    {job.interviewProcess.rounds.some(r => r.hasMockInterview) && (
                                        <>
                                            <span className="text-neutral-600 dark:text-neutral-400">•</span>
                                            <Mic className="w-4 h-4" />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Industry, when the job runs an assignment, and how old the
                        posting is - three more facts that were already on the row and
                        were simply not being shown. */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {job.company.industry && (
                            <Badge variant="outline" className="text-xs font-normal">
                                {job.company.industry}
                            </Badge>
                        )}
                        {job.hasAssignment && (
                            <Badge variant="outline" className="text-xs font-normal">
                                Includes an assignment
                            </Badge>
                        )}
                        {job.publishedAt && (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {formatPosted(job.publishedAt)}
                            </span>
                        )}
                    </div>

                    {/* Competition */}
                    <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{job.applicationsCount} applicants</span>
                        </div>
                        <button 
                            onClick={onViewDetails}
                            className="text-neutral-800 dark:text-neutral-100 font-medium hover:underline flex items-center gap-1"
                        >
                            View Details
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-center justify-center gap-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="w-14 h-14 rounded-full border-2 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300"
                                        onClick={() => fling("left")}
                                    >
                                        <X className="w-6 h-6 text-red-500" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Not for me</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                            "w-12 h-12 rounded-full border-2",
                                            job.isSaved 
                                                ? "border-neutral-900 bg-neutral-50 dark:bg-neutral-800/20"
                                                : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 hover:border-neutral-300"
                                        )}
                                        onClick={onSave}
                                    >
                                        <Bookmark className={cn(
                                            "w-5 h-5",
                                            job.isSaved ? "text-neutral-900 dark:text-neutral-100 fill-neutral-900" : "text-neutral-900 dark:text-neutral-100"
                                        )} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{job.isSaved ? "Saved" : "Save for later"}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="w-14 h-14 rounded-full border-2 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 hover:border-neutral-300"
                                        onClick={() => fling("right")}
                                    >
                                        <Heart className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>I&apos;m Interested!</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Stack of cards component
interface SwipeStackProps {
    jobs: FeedJobResult[]
    onSwipeLeft: (job: FeedJobResult) => void
    onSwipeRight: (job: FeedJobResult) => void
    onSave: (job: FeedJobResult) => void
    onViewDetails: (job: FeedJobResult) => void
    onUndo?: () => void
    lastSwipedJob?: FeedJobResult | null
}

export function SwipeStack({ 
    jobs, 
    onSwipeLeft, 
    onSwipeRight, 
    onSave,
    onViewDetails,
    onUndo,
    lastSwipedJob
}: SwipeStackProps) {
    // Show top 3 cards for stacking effect
    const visibleJobs = jobs.slice(0, 3)

    if (jobs.length === 0) {
        return null
    }

    return (
        // Centred, sized to the viewport, and sitting slightly HIGH of centre.
        //
        // `items-center` alone put the deck visually low: the page has a header
        // above it and only a thin "N jobs remaining" line below, so true centre of
        // the remaining box reads as too far down. `pb-16` weights the box, which
        // lifts the optical centre - Niraj: "push it somewhat upwards".
        <div className="relative mx-auto flex h-[calc(100dvh-16rem)] min-h-[540px] w-full max-w-3xl items-center justify-center pb-16">
            {/* Undo button */}
            {lastSwipedJob && onUndo && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-16 left-1/2 -translate-x-1/2 z-30"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onUndo}
                        className="rounded-full gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Undo
                    </Button>
                </motion.div>
            )}

            {/* A FANNED deck, not three cards stacked dead centre.
                The offset was `scale() translateY()` only, so the cards behind sat
                directly under the top one and read as a shadow rather than as a
                pile - which is what Niraj saw. Each card back in the stack now
                steps sideways and tilts, alternating direction, so the deck looks
                like something that was put down by hand.
                `animate` rather than a static `style`: when the top card leaves,
                the ones behind slide UP into their new positions instead of
                snapping. See JB-16. */}
            {visibleJobs.map((job, index) => {
                // Alternating, so the second card leans right and the third left.
                const side = index % 2 === 0 ? 1 : -1
                return (
                    <motion.div
                        key={job.id}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ zIndex: visibleJobs.length - index }}
                        initial={false}
                        animate={{
                            scale: 1 - index * 0.05,
                            x: index === 0 ? 0 : side * index * 26,
                            y: index * 14,
                            rotate: index === 0 ? 0 : side * index * 2.5,
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 28 }}
                    >
                        <SwipeCard
                            job={job}
                            onSwipeLeft={() => onSwipeLeft(job)}
                            onSwipeRight={() => onSwipeRight(job)}
                            onSave={() => onSave(job)}
                            onViewDetails={() => onViewDetails(job)}
                            isTop={index === 0}
                        />
                    </motion.div>
                )
            })}
        </div>
    )
}

/** `Posted 3 days ago`, or `Posted today`. */
function formatPosted(date: Date | string): string {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
    if (days <= 0) return "Posted today"
    if (days === 1) return "Posted yesterday"
    if (days < 7) return `Posted ${days} days ago`
    if (days < 30) return `Posted ${Math.floor(days / 7)} weeks ago`
    return `Posted ${Math.floor(days / 30)} months ago`
}
