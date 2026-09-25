"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useState } from "react"
import { motion } from "framer-motion"
import {
    X, Calendar, Briefcase, ExternalLink, XCircle, MessageSquare,
    FileText, User, TrendingUp
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { Separator } from "@repo/ui/components/ui/separator"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import {
    updateCandidateStatus, rejectCandidate
} from "@/actions/candidates"
import Image from "next/image"
import Link from "next/link"
import { Label } from "@repo/ui/components/ui/label"

interface Candidate {
    id: string
    applicationId: string
    userId: string
    name: string
    email: string
    image: string | null
    jobId: string
    jobTitle: string
    jobSlug: string
    status: string
    appliedAt: Date
    matchScore: number | null
    currentStage: number | null
    resumeUrl: string | null
    coverLetter: string | null
}

interface CandidateDetailSheetProps {
    candidate: Candidate
    onClose: () => void
}

const statusColors: Record<string, string> = {
    INTERESTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PREPARING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    APPLIED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    UNDER_REVIEW: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    SHORTLISTED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    INTERVIEW_SCHEDULED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    INTERVIEWED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    OFFER_EXTENDED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    HIRED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    WITHDRAWN: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
}

const statusLabels: Record<string, string> = {
    INTERESTED: "Interested",
    PREPARING: "Preparing",
    APPLIED: "Applied",
    UNDER_REVIEW: "Under Review",
    SHORTLISTED: "Shortlisted",
    INTERVIEW_SCHEDULED: "Interview Scheduled",
    INTERVIEWED: "Interviewed",
    OFFER_EXTENDED: "Offer Extended",
    HIRED: "Hired",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
}

const statusOptions = [
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "INTERVIEW_SCHEDULED", label: "Schedule Interview" },
    { value: "INTERVIEWED", label: "Mark Interviewed" },
    { value: "OFFER_EXTENDED", label: "Extend Offer" },
    { value: "HIRED", label: "Mark as Hired" },
]

const rejectionReasons = [
    { value: "SKILL_MISMATCH", label: "Skills don't match requirements" },
    { value: "EXPERIENCE_LEVEL", label: "Experience level mismatch" },
    { value: "CULTURAL_FIT", label: "Not a cultural fit" },
    { value: "BETTER_CANDIDATE", label: "Position filled with better match" },
    { value: "POSITION_CLOSED", label: "Position closed" },
    { value: "OTHER", label: "Other reason" },
]

export function CandidateDetailSheet({ candidate, onClose }: CandidateDetailSheetProps) {
    const [currentStatus, setCurrentStatus] = useState(candidate.status)
    const [isUpdating, setIsUpdating] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")
    const [rejectionFeedback, setRejectionFeedback] = useState("")
    const [isRejecting, setIsRejecting] = useState(false)

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date(date))
    }

    type ApplicationStatus = "INTERESTED" | "PREPARING" | "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "ASSIGNMENT_SENT" | "ASSIGNMENT_SUBMITTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "OFFER_EXTENDED" | "HIRED" | "REJECTED" | "WITHDRAWN"

    const handleStatusChange = async (newStatus: ApplicationStatus) => {
        setIsUpdating(true)
        try {
            const result = await updateCandidateStatus(candidate.applicationId, newStatus)
            if (result.success) {
                setCurrentStatus(newStatus)
            }
        } catch (error: unknown) {
            console.error("Error updating status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionFeedback || rejectionFeedback.length < 20) {
            return
        }
        setIsRejecting(true)
        try {
            const result = await rejectCandidate(candidate.applicationId, rejectionFeedback, rejectionReason)
            if (result.success) {
                setCurrentStatus("REJECTED")
                setShowRejectModal(false)
            }
        } catch (error: unknown) {
            console.error("Error rejecting candidate:", error)
        } finally {
            setIsRejecting(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                            {
                                candidate.image ? (
                                    <Image src={candidate.image} alt={candidate.name} fill className="object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                                        {candidate.name.charAt(0).toUpperCase()}
                                    </span>
                                )
                            }
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                                {candidate.name}
                            </h2>
                            <p className="text-neutral-500">{candidate.email}</p>
                            <Badge className={statusColors[currentStatus] + " mt-2"}>
                                {statusLabels[currentStatus]}
                            </Badge>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
                        <Briefcase className="w-4 h-4" />
                        Applied For
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {candidate.jobTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                        <Calendar className="w-4 h-4" />
                        Applied on {formatDate(candidate.appliedAt)}
                    </div>
                </div>

                {
                    candidate.matchScore && (
                        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                    <span className="font-medium text-neutral-700 dark:text-neutral-100">
                                        Profile Match Score
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                    {candidate.matchScore}%
                                </span>
                            </div>
                        </div>
                    )
                }
                {
                    candidate.coverLetter && (
                        <div>
                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-neutral-900" />
                                Cover Letter
                            </h4>
                            <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-line bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                                {candidate.coverLetter}
                            </p>
                        </div>
                    )
                }
                {
                    candidate.resumeUrl && (
                        <div>
                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-neutral-900" />
                                Resume
                            </h4>
                            <Link
                                href={candidate.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                View Resume
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        </div>
                    )
                }

                <Separator />

                {
                    currentStatus !== "REJECTED" && currentStatus !== "HIRED" && (
                        <div>
                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3">
                                Update Status
                            </h4>
                            <div className="space-y-3">
                                <Select
                                    value={currentStatus}
                                    onValueChange={handleStatusChange}
                                    disabled={isUpdating}
                                >
                                    <SelectTrigger className="w-full rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            statusOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>

                                {
                                    isUpdating && (
                                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                                            <InlineLoader size="sm" />
                                            Updating status...
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    )
                }
                {
                    !showRejectModal && currentStatus !== "REJECTED" && currentStatus !== "HIRED" && (
                        <Button
                            variant="outline"
                            className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            onClick={() => setShowRejectModal(true)}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Candidate
                        </Button>
                    )
                }
                {
                    showRejectModal && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                        >
                            <h4 className="font-semibold text-red-900 dark:text-red-300 mb-4 flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Reject Candidate
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                                Providing feedback is mandatory. This helps candidates improve and maintains our platform&apos;s commitment to transparency.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-red-900 dark:text-red-300 mb-1 block">
                                        Reason for rejection
                                    </Label>
                                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                                        <SelectTrigger className="w-full rounded-xl">
                                            <SelectValue placeholder="Select a reason" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {
                                                rejectionReasons.map(reason => (
                                                    <SelectItem key={reason.value} value={reason.value}>
                                                        {reason.label}
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-red-900 dark:text-red-300 mb-1 block">
                                        Feedback for the candidate (min. 20 characters)
                                    </Label>
                                    <Textarea
                                        value={rejectionFeedback}
                                        onChange={(e) => setRejectionFeedback(e.target.value)}
                                        placeholder="Please provide constructive feedback that will help the candidate understand why they weren't selected and how they can improve..."
                                        className="rounded-xl min-h-[100px]"
                                    />
                                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                        {rejectionFeedback.length}/20 characters minimum
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl"
                                        onClick={() => setShowRejectModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                                        disabled={!rejectionReason || rejectionFeedback.length < 20 || isRejecting}
                                        onClick={handleReject}
                                    >
                                        {
                                            isRejecting ? (
                                                <>
                                                    <InlineLoader size="sm" className="mr-2" />
                                                    Rejecting...
                                                </>
                                            ) : (
                                                "Confirm Rejection"
                                            )
                                        }
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )
                }

                <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => window.open(`/profile/${candidate.userId}`, '_blank')}
                >
                    <User className="w-4 h-4 mr-2" />
                    View Full Profile
                    <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                    </Button>
                    <Button className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Interview
                    </Button>
                </div>
            </div>
        </div>
    )
}