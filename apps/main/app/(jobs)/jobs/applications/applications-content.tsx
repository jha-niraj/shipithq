"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeft, FileText, Building2, MapPin, Clock, Briefcase,
    CheckCircle2, XCircle, Mic, Play, Target, Calendar,
    AlertCircle, Loader2, History, Star, Eye, LayoutList,
    MoreVertical, Bell, BookOpen, TrendingUp, Trash2, ExternalLink
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import {
    Tabs, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import { Progress } from "@repo/ui/components/ui/progress"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@repo/ui/components/ui/dialog"
import { Separator } from "@repo/ui/components/ui/separator"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { withdrawApplication } from "@/actions/jobs"
import toast from "@repo/ui/components/ui/sonner"
import Image from "next/image"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { cn } from "@repo/ui/lib/utils"

interface Application {
    id: string
    status: string
    appliedAt: Date | null
    updatedAt: Date
    notes?: string | null
    feedback?: string | null
    job: {
        id: string
        title: string
        slug: string
        location: string | null
        locationType: string
        employmentType: string
        company: {
            id: string
            name: string
            slug?: string
            logoUrl: string | null
        }
        interviewProcess: {
            id: string
            name: string
            rounds: Array<{
                id: string
                roundNumber: number
                title: string
                roundType: string
                hasMockInterview: boolean
            }>
        } | null
    }
    prepProgress: {
        id: string
        overallReadinessScore?: number
        readinessScore?: number
        mockSessionsCompleted?: number
        roundsCompleted?: number | number[]
    } | null
    statusHistory?: Array<{
        id: string
        fromStatus: string | null
        toStatus: string
        changedAt: Date
        note: string | null
    }>
}

interface ApplicationsContentProps {
    applications: Application[]
    isAuthenticated?: boolean
}

const statusColors: Record<string, string> = {
    INTERESTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PREPARING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    APPLIED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    UNDER_REVIEW: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    SCREENING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    SHORTLISTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    ASSIGNMENT_SENT: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    ASSIGNMENT_SUBMITTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    INTERVIEW_SCHEDULED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    INTERVIEWED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    INTERVIEWING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    OFFER_EXTENDED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    OFFERED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    HIRED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    ACCEPTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    WITHDRAWN: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
}

const statusLabels: Record<string, string> = {
    INTERESTED: "Interested",
    PREPARING: "Preparing",
    APPLIED: "Applied",
    UNDER_REVIEW: "Under Review",
    SCREENING: "Screening",
    SHORTLISTED: "Shortlisted",
    ASSIGNMENT_SENT: "Assignment Pending",
    ASSIGNMENT_SUBMITTED: "Assignment Submitted",
    INTERVIEW_SCHEDULED: "Interview Scheduled",
    INTERVIEWED: "Interviewed",
    INTERVIEWING: "Interviewing",
    OFFER_EXTENDED: "Offer Extended",
    OFFERED: "Offer Received",
    HIRED: "Hired",
    ACCEPTED: "Accepted",
    REJECTED: "Not Selected",
    WITHDRAWN: "Withdrawn",
}

const locationTypeLabels: Record<string, string> = {
    REMOTE: "Remote",
    HYBRID: "Hybrid",
    ONSITE: "On-site"
}

export function ApplicationsContent({ applications: initialApplications }: ApplicationsContentProps) {
    const router = useRouter()
    const [applications, setApplications] = useState(initialApplications)
    const [activeTab, setActiveTab] = useState("all")
    const [viewMode, setViewMode] = useState<"list" | "timeline">("list")
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
    const [applicationToWithdraw, setApplicationToWithdraw] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const filteredApplications = applications.filter(app => {
        if (activeTab === "all") return true
        if (activeTab === "active") return ["INTERESTED", "PREPARING", "APPLIED", "UNDER_REVIEW", "SCREENING", "SHORTLISTED", "ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "INTERVIEWING"].includes(app.status)
        if (activeTab === "offers") return ["OFFERED", "OFFER_EXTENDED", "ACCEPTED", "HIRED"].includes(app.status)
        if (activeTab === "closed") return ["REJECTED", "WITHDRAWN"].includes(app.status)
        return true
    })

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date(date))
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "INTERESTED":
            case "PREPARING":
                return <Target className="w-4 h-4" />
            case "APPLIED":
            case "SCREENING":
            case "UNDER_REVIEW":
                return <Loader2 className="w-4 h-4" />
            case "SHORTLISTED":
                return <CheckCircle2 className="w-4 h-4" />
            case "ASSIGNMENT_SENT":
            case "ASSIGNMENT_SUBMITTED":
                return <FileText className="w-4 h-4" />
            case "INTERVIEW_SCHEDULED":
            case "INTERVIEWED":
            case "INTERVIEWING":
                return <Mic className="w-4 h-4" />
            case "OFFER_EXTENDED":
            case "OFFERED":
            case "HIRED":
            case "ACCEPTED":
                return <CheckCircle2 className="w-4 h-4" />
            case "REJECTED":
            case "WITHDRAWN":
                return <XCircle className="w-4 h-4" />
            default:
                return <AlertCircle className="w-4 h-4" />
        }
    }

    const activeCount = applications.filter(app =>
        ["INTERESTED", "PREPARING", "APPLIED", "UNDER_REVIEW", "SCREENING", "SHORTLISTED", "ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "INTERVIEWING"].includes(app.status)
    ).length
    const offersCount = applications.filter(app =>
        ["OFFERED", "OFFER_EXTENDED", "ACCEPTED", "HIRED"].includes(app.status)
    ).length
    const closedCount = applications.filter(app =>
        ["REJECTED", "WITHDRAWN"].includes(app.status)
    ).length

    const handleWithdraw = async () => {
        if (!applicationToWithdraw) return

        startTransition(async () => {
            const result = await withdrawApplication(applicationToWithdraw)
            if (result.success) {
                setApplications(prev => prev.map(app =>
                    app.id === applicationToWithdraw ? { ...app, status: "WITHDRAWN" } : app
                ))
                toast.success("Application withdrawn")
                setWithdrawDialogOpen(false)
                setApplicationToWithdraw(null)
            } else {
                toast.error(result.error || "Failed to withdraw application")
            }
        })
    }

    const openApplicationDetails = (application: Application) => {
        setSelectedApplication(application)
        setDetailsOpen(true)
    }

    const getStatusStep = (status: string): number => {
        const steps = ["INTERESTED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFERED", "ACCEPTED"]
        const index = steps.indexOf(status)
        return index >= 0 ? index : 0
    }

    const formatRelativeDate = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - new Date(date).getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days === 0) return "Today"
        if (days === 1) return "Yesterday"
        if (days < 7) return `${days} days ago`
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`
        return formatDate(date)
    }

    return (
        <div className="page-frame min-h-full px-page py-5">
            {/* One header row: title on the left, the status filter and the view
                toggle on the right. It used to be four stacked rows - back arrow,
                icon + 3xl title, subtitle, then a full-width four-tab strip - which
                is five rows of chrome before the first application. Niraj,
                2026-08-29. */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        aria-label="Go back"
                        className="h-8 w-8 shrink-0 rounded-lg"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-semibold text-neutral-900 dark:text-white">
                            My applications
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {applications.length} total
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* The shared segmented control (plan/ui-pass UI-15), not the bordered
                        card variant squeezed down with overrides; counts are muted numbers. */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList variant="segmented" fit>
                            {([
                                ["all", "All", applications.length],
                                ["active", "Active", activeCount],
                                ["offers", "Offers", offersCount],
                                ["closed", "Closed", closedCount],
                            ] as const).map(([value, label, count]) => (
                                <TabsTrigger key={value} value={value}>
                                    {label} <span className="ml-0.5 tabular-nums text-neutral-400 dark:text-neutral-500">{count}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* These two DO work - they swap the list for a dated timeline. The shared
                        segmented control with icon-only triggers (plan/ui-pass UI-2); it was a
                        second strip hand-built to look like the one beside it. */}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                        <TabsList variant="segmented" fit aria-label="View">
                            <TabsTrigger value="list" icon={<LayoutList />} title="List view">
                                <span className="sr-only">List view</span>
                            </TabsTrigger>
                            <TabsTrigger value="timeline" icon={<History />} title="Timeline view">
                                <span className="sr-only">Timeline view</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>
            <StatBand
                cols={4}
                className="mb-4"
                items={[
                    { icon: Briefcase, label: "Total", value: applications.length },
                    { icon: TrendingUp, label: "Active", value: activeCount },
                    { icon: Star, label: "Offers", value: offersCount },
                    { icon: XCircle, label: "Closed", value: closedCount },
                ]}
            />
            <AnimatePresence mode="popLayout">
                {
                    filteredApplications.length > 0 ? (
                        viewMode === "list" ? (
                            // Compact rows (plan/ui-pass UI-13): four facts and two actions
                            // were a ~290px card; the actions now share the meta row.
                            <div className="space-y-2.5">
                                {
                                    filteredApplications.map((application, index) => (
                                        <motion.div
                                            key={application.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                                        >
                                            <div className="flex items-start gap-3">
                                                <Link href={`/jobs/${application.job.slug}`}>
                                                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                                                        {
                                                            application.job.company.logoUrl ? (
                                                                <Image
                                                                    src={application.job.company.logoUrl}
                                                                    alt={application.job.company.name}
                                                                    className="w-full h-full object-cover"
                                                                    fill
                                                                />
                                                            ) : (
                                                                <Building2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                                            )
                                                        }
                                                    </div>
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <Link href={`/jobs/${application.job.slug}`}>
                                                                <h3 className="truncate text-[15px] font-semibold leading-snug text-neutral-900 transition-colors hover:text-neutral-700 dark:text-white dark:hover:text-neutral-200">
                                                                    {application.job.title}
                                                                </h3>
                                                            </Link>
                                                            <Link href={`/companies/${application.job.company.slug}`}>
                                                                <p className="truncate text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                                                                    {application.job.company.name}
                                                                </p>
                                                            </Link>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            <Badge className={cn(statusColors[application.status], "text-xs")}>
                                                                {getStatusIcon(application.status)}
                                                                <span className="ml-1">{statusLabels[application.status]}</span>
                                                            </Badge>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => openApplicationDetails(application)}>
                                                                        <Eye className="w-4 h-4 mr-2" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    {
                                                                        ["SHORTLISTED", "ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFER_EXTENDED", "HIRED"].includes(application.status) && (
                                                                            <DropdownMenuItem onClick={() => router.push(`/jobs/applications/${application.id}/interview`)}>
                                                                                <Play className="w-4 h-4 mr-2" />
                                                                                Interview Journey
                                                                            </DropdownMenuItem>
                                                                        )
                                                                    }
                                                                    <DropdownMenuItem onClick={() => router.push(`/companies/${application.job.company.slug}/mock`)}>
                                                                        <Mic className="w-4 h-4 mr-2" />
                                                                        Practice Interview
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    {
                                                                        !["WITHDRAWN", "REJECTED", "ACCEPTED"].includes(application.status) && (
                                                                            <DropdownMenuItem
                                                                                className="text-red-600 dark:text-red-400"
                                                                                onClick={() => {
                                                                                    setApplicationToWithdraw(application.id)
                                                                                    setWithdrawDialogOpen(true)
                                                                                }}
                                                                            >
                                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                                Withdraw Application
                                                                            </DropdownMenuItem>
                                                                        )
                                                                    }
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                <span>{application.job.location || locationTypeLabels[application.job.locationType]}</span>
                                                            </div>
                                                            {
                                                                application.appliedAt && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        <span>Applied {formatDate(application.appliedAt)}</span>
                                                                    </div>
                                                                )
                                                            }
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                <span>Updated {formatRelativeDate(application.updatedAt)}</span>
                                                            </div>
                                                        </div>
                                                        {/* Up to 3 full-text buttons here (~420-460px) with no wrap
                                                            overflowed a 328px phone card. See
                                                            docs/responsiveness.md section 4. */}
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {/* Interview Journey button for shortlisted/interviewing statuses */}
                                                            {
                                                                ["SHORTLISTED", "ASSIGNMENT_SENT", "ASSIGNMENT_SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "OFFER_EXTENDED", "HIRED"].includes(application.status) && (
                                                                    <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-neutral-800 text-xs text-white hover:bg-neutral-700" asChild><Link href={`/jobs/applications/${application.id}/interview`}>
                                                                        <Play className="h-3.5 w-3.5" />
                                                                        Interview Journey
                                                                    </Link></Button>
                                                                )
                                                            }
                                                            {
                                                                ["INTERESTED", "PREPARING"].includes(application.status) && application.job.interviewProcess && (
                                                                    <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-neutral-900 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200" asChild><Link href={`/companies/${application.job.company.slug}/mock`}>
                                                                        <Mic className="h-3.5 w-3.5" />
                                                                        Practice Interview
                                                                    </Link></Button>
                                                                )
                                                            }
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1.5 rounded-lg text-xs"
                                                                onClick={() => openApplicationDetails(application)}
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                                Timeline
                                                            </Button>
                                                            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                                                                <Link href={`/jobs/${application.job.slug}`}>
                                                                    View job
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                        </div>

                                                        {
                                                            application.job.interviewProcess && (
                                                                <div className="mt-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                            <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                                {application.job.interviewProcess.rounds.length} Interview Rounds
                                                                            </span>
                                                                        </div>
                                                                        {
                                                                            application.prepProgress && (
                                                                                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                                                                    {application.prepProgress.readinessScore}% ready
                                                                                </span>
                                                                            )
                                                                        }
                                                                    </div>

                                                                    {
                                                                        application.prepProgress && (
                                                                            <Progress
                                                                                value={application.prepProgress.overallReadinessScore || application.prepProgress.readinessScore || 0}
                                                                                className="h-2 mb-3"
                                                                            />
                                                                        )
                                                                    }

                                                                    <div className="flex flex-wrap gap-2">
                                                                        {
                                                                            application.job.interviewProcess.rounds.slice(0, 4).map((round) => {
                                                                                const roundsCompleted = application.prepProgress?.roundsCompleted
                                                                                const isCompleted = Array.isArray(roundsCompleted)
                                                                                    ? roundsCompleted.includes(round.roundNumber)
                                                                                    : (typeof roundsCompleted === 'number' && roundsCompleted >= round.roundNumber)
                                                                                return (
                                                                                    <div
                                                                                        key={round.id}
                                                                                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${isCompleted
                                                                                            ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                                                            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                                                                                            }`}
                                                                                    >
                                                                                        {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                                                                        <span>R{round.roundNumber}: {round.title}</span>
                                                                                        {
                                                                                            round.hasMockInterview && !isCompleted && (
                                                                                                <Mic className="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                                                                                            )
                                                                                        }
                                                                                    </div>
                                                                                )
                                                                            })
                                                                        }
                                                                        {
                                                                            application.job.interviewProcess.rounds.length > 4 && (
                                                                                <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1">
                                                                                    +{application.job.interviewProcess.rounds.length - 4} more
                                                                                </span>
                                                                            )
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            application.feedback && (
                                                                <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/20">
                                                                    <div className="flex items-start gap-2">
                                                                        <Bell className="w-4 h-4 text-neutral-900 dark:text-neutral-100 mt-0.5" />
                                                                        <div>
                                                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-100">Recruiter Feedback</span>
                                                                            <p className="text-sm text-neutral-800 dark:text-neutral-100 mt-1">{application.feedback}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }

                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                }
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-900 dark:from-neutral-100 dark:via-neutral-100 dark:to-neutral-100" />
                                <div className="space-y-3">
                                    {
                                        filteredApplications.map((application, index) => (
                                            <motion.div
                                                key={application.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="relative pl-16"
                                            >
                                                <div className={`absolute left-5 w-6 h-6 rounded-full flex items-center justify-center ${["OFFERED", "ACCEPTED"].includes(application.status)
                                                    ? "bg-neutral-900"
                                                    : ["REJECTED", "WITHDRAWN"].includes(application.status)
                                                        ? "bg-red-500"
                                                        : "bg-neutral-900"
                                                    }`}>
                                                    {getStatusIcon(application.status)}
                                                </div>
                                                <div className="rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                                                            {
                                                                application.job.company.logoUrl ? (
                                                                    <Image
                                                                        src={application.job.company.logoUrl}
                                                                        alt={application.job.company.name}
                                                                        className="w-full h-full object-cover"
                                                                        fill
                                                                    />
                                                                ) : (
                                                                    <Building2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                                                )
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Badge className={statusColors[application.status]}>
                                                                    {statusLabels[application.status]}
                                                                </Badge>
                                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                    {formatRelativeDate(application.updatedAt)}
                                                                </span>
                                                            </div>
                                                            <Link href={`/jobs/${application.job.slug}`}>
                                                                <h3 className="font-semibold text-neutral-900 dark:text-white hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors">
                                                                    {application.job.title}
                                                                </h3>
                                                            </Link>
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{application.job.company.name}</p>

                                                            {
                                                                application.prepProgress && (
                                                                    <div className="mt-3 flex items-center gap-2">
                                                                        <Progress value={application.prepProgress.readinessScore} className="h-1.5 flex-1" />
                                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                            {application.prepProgress.readinessScore}% ready
                                                                        </span>
                                                                    </div>
                                                                )
                                                            }

                                                            <div className="flex items-center gap-2 mt-3">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="rounded-lg text-xs h-7"
                                                                    onClick={() => openApplicationDetails(application)}
                                                                >
                                                                    <Eye className="w-3 h-3 mr-1" />
                                                                    Details
                                                                </Button>
                                                                {
                                                                    ["INTERESTED", "PREPARING"].includes(application.status) && (
                                                                        <Button size="sm" variant="ghost" className="rounded-lg text-xs h-7" asChild><Link href={`/companies/${application.job.company.slug}/mock`}>
                                                                            <Mic className="w-3 h-3 mr-1" />
                                                                            Practice
                                                                        </Link></Button>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    }
                                </div>
                            </div>
                        )
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <FileText className="w-16 h-16 text-neutral-600 dark:text-neutral-400 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">
                                No applications found
                            </h3>
                            <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                                {
                                    activeTab === "all"
                                        ? "Start exploring jobs and show your interest to begin your journey."
                                        : `No applications in this category.`
                                }
                            </p>
                            {
                                activeTab === "all" && (
                                    <Link href="/jobs">
                                        <Button className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                                            <Play className="w-4 h-4 mr-2" />
                                            Browse Jobs
                                        </Button>
                                    </Link>
                                )
                            }
                        </motion.div>
                    )
                }
            </AnimatePresence>
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent scroll className="flex max-h-[80dvh] max-w-2xl flex-col">
                    {
                        selectedApplication && (
                            <>
                                <DialogHeader>
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                                            {
                                                selectedApplication.job.company.logoUrl ? (
                                                    <Image
                                                        src={selectedApplication.job.company.logoUrl}
                                                        alt={selectedApplication.job.company.name}
                                                        className="w-full h-full object-cover"
                                                        fill
                                                    />
                                                ) : (
                                                    <Building2 className="w-7 h-7 text-neutral-600 dark:text-neutral-400" />
                                                )
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <DialogTitle className="text-xl">
                                                {selectedApplication.job.title}
                                            </DialogTitle>
                                            <DialogDescription className="text-base">
                                                {selectedApplication.job.company.name}
                                            </DialogDescription>
                                        </div>
                                        <Badge className={statusColors[selectedApplication.status]}>
                                            {statusLabels[selectedApplication.status]}
                                        </Badge>
                                    </div>
                                </DialogHeader>
                                <div className="space-y-6 mt-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">Application Progress</h4>
                                        <div className="flex items-center gap-1">
                                            {
                                                ["INTERESTED", "PREPARING", "APPLIED", "SCREENING", "INTERVIEWING", "OFFERED"].map((step, i) => (
                                                    <div key={step} className="flex-1 flex items-center">
                                                        <div className={`h-2 flex-1 rounded-full ${i <= getStatusStep(selectedApplication.status)
                                                            ? "bg-gradient-to-r from-neutral-900 to-neutral-900"
                                                            : "bg-neutral-200 dark:bg-neutral-700"
                                                            }`} />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">Started</span>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">Offered</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {
                                        selectedApplication.statusHistory && selectedApplication.statusHistory.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <History className="w-4 h-4" />
                                                    Status History
                                                </h4>
                                                <div className="relative pl-6 space-y-4">
                                                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
                                                    {
                                                        selectedApplication.statusHistory.map((history, index) => (
                                                            <div key={history.id} className="relative">
                                                                <div className={`absolute -left-4 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 ${index === 0 ? "bg-neutral-900" : "bg-neutral-400"
                                                                    }`} />
                                                                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {statusLabels[history.toStatus] || history.toStatus}
                                                                        </Badge>
                                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                            {formatDate(history.changedAt)}
                                                                        </span>
                                                                    </div>
                                                                    {
                                                                        history.note && (
                                                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                                                {history.note}
                                                                            </p>
                                                                        )
                                                                    }
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        selectedApplication.feedback && (
                                            <div>
                                                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Bell className="w-4 h-4" />
                                                    Recruiter Feedback
                                                </h4>
                                                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-100 dark:border-neutral-800">
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-100">
                                                        {selectedApplication.feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        selectedApplication.job.interviewProcess && (
                                            <div>
                                                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" />
                                                    Interview Rounds
                                                </h4>
                                                <div className="space-y-2">
                                                    {
                                                        selectedApplication.job.interviewProcess.rounds.map((round) => {
                                                            const roundsCompleted = selectedApplication.prepProgress?.roundsCompleted
                                                            const isCompleted = Array.isArray(roundsCompleted) 
                                                                ? roundsCompleted.includes(round.roundNumber)
                                                                : (typeof roundsCompleted === 'number' && roundsCompleted >= round.roundNumber)
                                                            return (
                                                                <div
                                                                    key={round.id}
                                                                    className={`p-3 rounded-xl border ${isCompleted
                                                                        ? "bg-neutral-50 border-neutral-200 dark:bg-neutral-800/20 dark:border-neutral-800"
                                                                        : "bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            {
                                                                                isCompleted ? (
                                                                                    <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                                                                ) : (
                                                                                    <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                                                                                )
                                                                            }
                                                                            <span className="font-medium text-sm text-neutral-900 dark:text-white">
                                                                                Round {round.roundNumber}: {round.title}
                                                                            </span>
                                                                        </div>
                                                                        {
                                                                            round.hasMockInterview && !isCompleted && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-7 text-xs rounded-lg"
                                                                                    onClick={() => {
                                                                                        setDetailsOpen(false)
                                                                                        router.push(`/companies/${selectedApplication.job.company.slug}/mock`)
                                                                                    }}
                                                                                >
                                                                                    <Mic className="w-3 h-3 mr-1" />
                                                                                    Practice
                                                                                </Button>
                                                                            )
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                </div>

                                <DialogFooter className="mt-6">
                                    <div className="flex items-center gap-3 w-full">
                                        {
                                            !["WITHDRAWN", "REJECTED", "ACCEPTED"].includes(selectedApplication.status) && (
                                                <Button
                                                    variant="outline"
                                                    className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                    onClick={() => {
                                                        setApplicationToWithdraw(selectedApplication.id)
                                                        setWithdrawDialogOpen(true)
                                                        setDetailsOpen(false)
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Withdraw
                                                </Button>
                                            )
                                        }
                                        <div className="flex-1" />
                                        <Link href={`/jobs/${selectedApplication.job.slug}`}>
                                            <Button className="rounded-xl">
                                                View Job
                                                <ExternalLink className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                </DialogFooter>
                            </>
                        )
                    }
                </DialogContent>
            </Dialog>
            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Application</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to withdraw this application? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setWithdrawDialogOpen(false)
                                setApplicationToWithdraw(null)
                            }}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleWithdraw}
                            disabled={isPending}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                        >
                            {
                                isPending ? (
                                    <InlineLoader size="sm" className="mr-2" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )
                            }
                            Withdraw
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}