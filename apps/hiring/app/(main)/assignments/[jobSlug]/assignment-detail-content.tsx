"use client"

import { motion } from "framer-motion"
import {
    ArrowLeft, Send, Clock, CheckCircle2, Users, FileText, Star,
    MessageSquare, Calendar, Mail, MoreVertical, Eye, RefreshCw,
    Clipboard
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Input } from "@repo/ui/components/ui/input"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@repo/ui/components/ui/dialog"
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import Link from "next/link"
import { useState, useTransition } from "react"
import {
    sendAssignmentToCandidate, scoreAssignment
} from "@/actions/assignments"
import toast from "@repo/ui/components/ui/sonner"
import Image from "next/image"
import { Label } from "@repo/ui/components/ui/label"
import type { 
    JobWithAssignmentDetails, AssignmentSubmissionItem, 
    AssignmentApplication
} from "@/types"

// ============================================
// TYPES
// ============================================

interface AssignmentDetailContentProps {
    job: JobWithAssignmentDetails
    submissions: AssignmentSubmissionItem[]
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        ASSIGNMENT_SENT: {
            label: "Awaiting",
            color: "bg-neutral-50 text-neutral-700 border-neutral-200",
            icon: <Clock className="h-3 w-3" />
        },
        ASSIGNMENT_SUBMITTED: {
            label: "Submitted",
            color: "bg-neutral-50 text-neutral-700 border-neutral-200",
            icon: <CheckCircle2 className="h-3 w-3" />
        },
        SHORTLISTED: {
            label: "Shortlisted",
            color: "bg-neutral-50 text-neutral-700 border-neutral-200",
            icon: <Star className="h-3 w-3" />
        }
    }

    const defaultConfig = {
        label: status,
        color: "bg-gray-50 text-gray-700 border-gray-200",
        icon: null as React.ReactNode
    }

    const { label, color, icon } = config[status] ?? defaultConfig

    return (
        <Badge variant="outline" className={`${color} flex items-center gap-1`}>
            {icon}
            {label}
        </Badge>
    )
}

// ============================================
// CANDIDATE CARD COMPONENT
// ============================================

function CandidateCard({
    application,
    onSendAssignment,
    onScoreAssignment,
    isPending
}: {
    application: AssignmentApplication
    onSendAssignment: (id: string) => void
    onScoreAssignment: (application: AssignmentApplication) => void
    isPending: boolean
}) {
    const formatDate = (date: Date | null) => {
        if (!date) return "-"
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    }

    const showSendButton = application.status === "SHORTLISTED" || application.status === "UNDER_REVIEW"
    const showScoreButton = application.status === "ASSIGNMENT_SUBMITTED"

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {
                        application.user?.image ? (
                            <Image
                                src={application.user.image}
                                alt={application.user.name || "User"}
                                className="h-10 w-10 rounded-full object-cover"
                                fill
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-medium">
                                {application.user?.name?.charAt(0) || application.user?.email?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                        )
                    }
                    <div>
                        <h4 className="font-medium text-neutral-950 dark:text-white">
                            {application.user?.name || "Unknown"}
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{application.user?.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={application.status} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
                {
                    application.assignmentStartedAt && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Sent: {formatDate(application.assignmentStartedAt)}</span>
                        </div>
                    )
                }
                {
                    application.assignmentSubmittedAt && (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200" />
                            <span>Submitted: {formatDate(application.assignmentSubmittedAt)}</span>
                        </div>
                    )
                }
                {
                    application.assignmentScore !== null && (
                        <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-neutral-900 dark:text-white" />
                            <span>Score: {application.assignmentScore}/100</span>
                        </div>
                    )
                }
            </div>
            <div className="mt-4 flex items-center gap-2">
                {
                    showSendButton && (
                        <Button
                            size="sm"
                            onClick={() => onSendAssignment(application.id)}
                            disabled={isPending}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white"
                        >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Send Assignment
                        </Button>
                    )
                }
                {
                    showScoreButton && (
                        <Button
                            size="sm"
                            onClick={() => onScoreAssignment(application)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white"
                        >
                            <Star className="h-3.5 w-3.5 mr-1.5" />
                            Score Submission
                        </Button>
                    )
                }
                {
                    application.assignmentScore !== null && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onScoreAssignment(application)}
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Update Score
                        </Button>
                    )
                }
            </div>
        </motion.div>
    )
}

// ============================================
// SCORE DIALOG COMPONENT
// ============================================

function ScoreDialog({
    application,
    open,
    onOpenChange,
    onScore
}: {
    application: AssignmentApplication | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onScore: (applicationId: string, score: number, feedback: string) => void
}) {
    const [score, setScore] = useState(application?.assignmentScore?.toString() || "")
    const [feedback, setFeedback] = useState(application?.assignmentFeedback || "")
    const [isPending, startTransition] = useTransition()

    const handleSubmit = () => {
        if (!application) return
        const scoreNum = parseInt(score)
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
            toast.error("Score must be between 0 and 100")
            return
        }
        startTransition(() => {
            onScore(application.id, scoreNum, feedback)
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Score Assignment</DialogTitle>
                    <DialogDescription>
                        Evaluate the submission from {application?.user?.name || application?.user?.email}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-neutral-950 dark:text-white">
                            Score (0-100)
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            placeholder="Enter score"
                            className="h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-neutral-950 dark:text-white">
                            Feedback
                        </Label>
                        <Textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Provide feedback on the submission..."
                            rows={4}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || !score}
                        className="bg-neutral-900 hover:bg-neutral-800 text-white"
                    >
                        {isPending ? "Saving..." : "Save Score"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssignmentDetailContent({ job, submissions }: AssignmentDetailContentProps) {
    const [isPending, startTransition] = useTransition()
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false)
    const [selectedApplication, setSelectedApplication] = useState<AssignmentApplication | null>(null)

    // Stats
    const awaitingCount = job.applications.filter(a => a.status === "ASSIGNMENT_SENT").length
    const submittedCount = submissions.length
    const scoredCount = submissions.filter(s => s.assignmentScore !== null).length
    const avgScore = scoredCount > 0
        ? Math.round(submissions.filter(s => s.assignmentScore !== null).reduce((sum, s) => sum + (s.assignmentScore || 0), 0) / scoredCount)
        : 0

    const handleSendAssignment = async (applicationId: string) => {
        startTransition(async () => {
            const result = await sendAssignmentToCandidate(applicationId)
            if (result.success) {
                toast.success("Assignment sent successfully!")
            } else {
                toast.error(result.error || "Failed to send assignment")
            }
        })
    }

    const handleScoreAssignment = (application: AssignmentApplication) => {
        setSelectedApplication(application)
        setScoreDialogOpen(true)
    }

    const handleScoreSubmit = async (applicationId: string, score: number, feedback: string) => {
        const result = await scoreAssignment(applicationId, { score, feedback })
        if (result.success) {
            toast.success("Score saved successfully!")
            setScoreDialogOpen(false)
            setSelectedApplication(null)
        } else {
            toast.error(result.error || "Failed to save score")
        }
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <Link
                href="/assignments"
                className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white text-sm transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Assignments
            </Link>
            <PageHeader
                title={job.title}
                subtitle="Manage assignments and review submissions"
                actions={
                    <Badge
                        variant="outline"
                        className={job.status === "PUBLISHED" ? "bg-neutral-50 text-neutral-700 border-neutral-200" : ""}
                    >
                        {job.status}
                    </Badge>
                }
            />
            <StatBand
                cols={4}
                items={[
                    { icon: Clock, label: "Awaiting", value: awaitingCount },
                    { icon: CheckCircle2, label: "Submitted", value: submittedCount },
                    { icon: Star, label: "Scored", value: scoredCount },
                    { icon: Star, key: "avg", label: "Avg score", value: avgScore > 0 ? `${avgScore}/100` : "-" },
                ]}
            />
            <div>
                <Tabs defaultValue="candidates" className="space-y-6">
                    <TabsList className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <TabsTrigger value="candidates">
                            <Users className="h-4 w-4 mr-2" />
                            Candidates ({job.applications.length})
                        </TabsTrigger>
                        <TabsTrigger value="submissions">
                            <FileText className="h-4 w-4 mr-2" />
                            Submissions ({submittedCount})
                        </TabsTrigger>
                        <TabsTrigger value="assignment">
                            <Clipboard className="h-4 w-4 mr-2" />
                            Assignment Details
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="candidates" className="space-y-4">
                        {
                            job.applications.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center"
                                >
                                    <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                        <Users className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                                        No candidates yet
                                    </h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                                        Candidates who are shortlisted or have been sent assignments will appear here.
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="grid gap-4">
                                    {
                                        job.applications.map((application) => (
                                            <CandidateCard
                                                key={application.id}
                                                application={application}
                                                onSendAssignment={handleSendAssignment}
                                                onScoreAssignment={handleScoreAssignment}
                                                isPending={isPending}
                                            />
                                        ))
                                    }
                                </div>
                            )
                        }
                    </TabsContent>
                    <TabsContent value="submissions" className="space-y-4">
                        {
                            submissions.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center"
                                >
                                    <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                        <FileText className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-950 dark:text-white mb-2">
                                        No submissions yet
                                    </h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                                        When candidates submit their assignments, they will appear here for review.
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="grid gap-4">
                                    {
                                        submissions.map((submission) => (
                                            <motion.div
                                                key={submission.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {
                                                            submission.user?.image ? (
                                                                <Image
                                                                    src={submission.user.image}
                                                                    alt={submission.user.name || "User"}
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                    fill
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-medium">
                                                                    {submission.user?.name?.charAt(0) || submission.user?.email?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                            )
                                                        }
                                                        <div>
                                                            <h4 className="font-medium text-neutral-950 dark:text-white">
                                                                {submission.user?.name || "Unknown"}
                                                            </h4>
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{submission.user?.email}</p>
                                                        </div>
                                                    </div>

                                                    {
                                                        submission.assignmentScore !== null ? (
                                                            <div className="text-right">
                                                                <div className="text-2xl font-bold text-neutral-950 dark:text-white">
                                                                    {submission.assignmentScore}
                                                                    <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/100</span>
                                                                </div>
                                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Scored</p>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
                                                                Needs Review
                                                            </Badge>
                                                        )
                                                    }
                                                </div>

                                                {
                                                    submission.assignmentFeedback && (
                                                        <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-neutral-950 dark:text-white mb-1">
                                                                <MessageSquare className="h-3.5 w-3.5" />
                                                                Feedback
                                                            </div>
                                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{submission.assignmentFeedback}</p>
                                                        </div>
                                                    )
                                                }

                                                <div className="mt-4 flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                        View Submission
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleScoreAssignment({
                                                            ...submission,
                                                            createdAt: new Date()
                                                        } as AssignmentApplication)}
                                                        className="bg-neutral-900 hover:bg-neutral-800 text-white"
                                                    >
                                                        <Star className="h-3.5 w-3.5 mr-1.5" />
                                                        {submission.assignmentScore !== null ? "Update Score" : "Score"}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))
                                    }
                                </div>
                            )
                        }
                    </TabsContent>
                    <TabsContent value="assignment">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                    <Clipboard className="h-5 w-5 text-neutral-950 dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-neutral-950 dark:text-white">Assignment Configuration</h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Details of the take-home assignment</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                    <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Deadline</label>
                                    <p className="text-neutral-950 dark:text-white mt-1">
                                        {job.assignmentDeadlineDays
                                            ? `${job.assignmentDeadlineDays} days after receiving`
                                            : "No deadline set"}
                                    </p>
                                </div>

                                {
                                    job.assignmentInstructions && (
                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                            <Label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Instructions</Label>
                                            <p className="text-neutral-950 dark:text-white mt-1 whitespace-pre-wrap">
                                                {job.assignmentInstructions}
                                            </p>
                                        </div>
                                    )
                                }

                                {
                                    job.assignmentDetails !== null && job.assignmentDetails !== undefined && (
                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                            <Label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Assignment Details</Label>
                                            <pre className="text-sm text-neutral-950 dark:text-white mt-2 overflow-auto">
                                                {JSON.stringify(job.assignmentDetails, null, 2)}
                                            </pre>
                                        </div>
                                    )
                                }
                            </div>
                            <div className="mt-6">
                                <Button variant="outline">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Edit Assignment
                                </Button>
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
            <ScoreDialog
                application={selectedApplication}
                open={scoreDialogOpen}
                onOpenChange={setScoreDialogOpen}
                onScore={handleScoreSubmit}
            />
        </div>
    )
}