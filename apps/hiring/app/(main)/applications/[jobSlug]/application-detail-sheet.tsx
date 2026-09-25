"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useState, useTransition, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import Link from "next/link"
import {
    X, Mail, Phone, MapPin, Calendar, FileText, ExternalLink,
    Briefcase, Award, Star, CheckCircle, XCircle, MessageSquare, 
    Mic, MicOff, Sparkles, Send, AlertTriangle, Globe, 
    Github, Linkedin
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Shimmer, ShimmerStyles } from "@repo/ui/components/skeleton-kit"
import { Badge } from "@repo/ui/components/ui/badge"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@repo/ui/components/ui/dialog"
import type { ApplicationDetail } from "@/actions/applications"
import {
    rejectApplication, shortlistApplication, scheduleInterview,
    addApplicationNote, makeMessageProfessional
} from "@/actions/applications"
import { transcribeAudio } from "@/actions/(common)/speech-to-text"
import Image from "next/image"

interface ApplicationDetailSheetProps {
    isOpen: boolean
    onClose: () => void
    application: ApplicationDetail | null
    isLoading: boolean
    onUpdated: () => void
}

const statusConfig: Record<string, { label: string; color: string }> = {
    INTERESTED: { label: "Interested", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
    PREPARING: { label: "Preparing", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    APPLIED: { label: "Applied", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    UNDER_REVIEW: { label: "Under Review", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    SHORTLISTED: { label: "Shortlisted", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    ASSIGNMENT_SENT: { label: "Assignment Sent", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    ASSIGNMENT_SUBMITTED: { label: "Assignment Done", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    INTERVIEW_SCHEDULED: { label: "Interview Set", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    INTERVIEWED: { label: "Interviewed", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    OFFER_EXTENDED: { label: "Offer Extended", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    HIRED: { label: "Hired", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    WITHDRAWN: { label: "Withdrawn", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400" },
}

// Helper function to safely get candidate name
function getCandidateName(application: ApplicationDetail): string {
    return application.candidate?.name || application.candidate?.email || "Unknown Candidate"
}

// Helper function to get initials
function getInitials(name: string): string {
    return name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
}

export function ApplicationDetailSheet({
    isOpen,
    onClose,
    application,
    isLoading,
    onUpdated
}: ApplicationDetailSheetProps) {
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showAcceptDialog, setShowAcceptDialog] = useState(false)
    const [showNoteDialog, setShowNoteDialog] = useState(false)

    return (
        <>
            <AnimatePresence>
                {
                    isOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 z-50"
                                onClick={onClose}
                            />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-950 rounded-t-3xl overflow-hidden"
                                style={{ height: "80dvh" }}
                            >
                                <div className="flex justify-center pt-3 pb-2">
                                    <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
                                </div>
                                <div className="flex items-center justify-between px-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                        Application Details
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={onClose}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                <div className="overflow-y-auto h-[calc(80dvh-80px)] p-6">
                                    {
                                        isLoading ? (
                                            <div className="space-y-6" aria-busy="true">
                                                <ShimmerStyles />
                                                <div className="flex items-center gap-4">
                                                    <Shimmer className="h-16 w-16 rounded-xl" />
                                                    <div className="space-y-2">
                                                        <Shimmer className="h-6 w-48" delay={0.04} />
                                                        <Shimmer className="h-4 w-32" delay={0.06} />
                                                        <Shimmer className="h-5 w-20 rounded-full" delay={0.08} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {
                                                        Array.from({ length: 4 }).map((_, i) => (
                                                            <Shimmer key={i} className="h-[60px] rounded-xl" delay={0.1 + i * 0.04} />
                                                        ))
                                                    }
                                                </div>
                                                <div className="space-y-2">
                                                    <Shimmer className="h-5 w-32" delay={0.2} />
                                                    <Shimmer className="h-4 w-full" delay={0.22} />
                                                    <Shimmer className="h-4 w-5/6" delay={0.24} />
                                                    <Shimmer className="h-4 w-2/3" delay={0.26} />
                                                </div>
                                                <div className="flex gap-3">
                                                    <Shimmer className="h-10 flex-1 rounded-md" delay={0.3} />
                                                    <Shimmer className="h-10 flex-1 rounded-md" delay={0.32} />
                                                </div>
                                            </div>
                                        ) : application ? (
                                            <div className="space-y-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        {
                                                            application.candidate?.image ? (
                                                                <Image
                                                                    src={application.candidate.image}
                                                                    alt={getCandidateName(application)}
                                                                    className="w-16 h-16 rounded-xl object-cover"
                                                                    fill
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                                                                    <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                                                                        {getInitials(getCandidateName(application))}
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                        <div>
                                                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                                                                {getCandidateName(application)}
                                                            </h3>
                                                            <p className="text-neutral-500">{application.job?.title || "Position"}</p>
                                                            <Badge className={statusConfig[application.status]?.color ?? "bg-gray-100 text-gray-700"}>
                                                                {statusConfig[application.status]?.label ?? application.status}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {
                                                        application.matchScore && (
                                                            <div className="text-center">
                                                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${application.matchScore >= 80
                                                                    ? "bg-neutral-100 dark:bg-neutral-800/30"
                                                                    : application.matchScore >= 60
                                                                        ? "bg-neutral-100 dark:bg-neutral-800/30"
                                                                        : "bg-red-100 dark:bg-red-900/30"
                                                                    }`}>
                                                                    <span className={`text-lg font-bold ${application.matchScore >= 80
                                                                        ? "text-neutral-800 dark:text-neutral-100"
                                                                        : application.matchScore >= 60
                                                                            ? "text-neutral-800 dark:text-neutral-100"
                                                                            : "text-red-600 dark:text-red-400"
                                                                        }`}>
                                                                        {application.matchScore}%
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-neutral-500 mt-1">Match</p>
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                        <Mail className="w-5 h-5 text-neutral-400" />
                                                        <div>
                                                            <p className="text-xs text-neutral-500">Email</p>
                                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                {application.candidate?.email || "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {
                                                        application.candidate?.phone && (
                                                            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                                <Phone className="w-5 h-5 text-neutral-400" />
                                                                <div>
                                                                    <p className="text-xs text-neutral-500">Phone</p>
                                                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                        {application.candidate.phone}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    {
                                                        application.candidate?.location && (
                                                            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                                <MapPin className="w-5 h-5 text-neutral-400" />
                                                                <div>
                                                                    <p className="text-xs text-neutral-500">Location</p>
                                                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                        {application.candidate.location}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                        <Calendar className="w-5 h-5 text-neutral-400" />
                                                        <div>
                                                            <p className="text-xs text-neutral-500">Applied</p>
                                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                {application.appliedAt
                                                                    ? format(new Date(application.appliedAt), "MMM d, yyyy 'at' h:mm a")
                                                                    : "N/A"
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {
                                                    (application.candidate?.linkedinUrl || application.candidate?.githubUrl || application.candidate?.portfolioUrl) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {
                                                                application.candidate?.linkedinUrl && (
                                                                    <Link href={application.candidate.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Button variant="outline" size="sm" className="rounded-lg">
                                                                            <Linkedin className="w-4 h-4 mr-2" />
                                                                            LinkedIn
                                                                        </Button>
                                                                    </Link>
                                                                )
                                                            }
                                                            {
                                                                application.candidate?.githubUrl && (
                                                                    <Link href={application.candidate.githubUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Button variant="outline" size="sm" className="rounded-lg">
                                                                            <Github className="w-4 h-4 mr-2" />
                                                                            GitHub
                                                                        </Button>
                                                                    </Link>
                                                                )
                                                            }
                                                            {
                                                                application.candidate?.portfolioUrl && (
                                                                    <Link href={application.candidate.portfolioUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Button variant="outline" size="sm" className="rounded-lg">
                                                                            <Globe className="w-4 h-4 mr-2" />
                                                                            Portfolio
                                                                        </Button>
                                                                    </Link>
                                                                )
                                                            }
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.resumeUrl && (
                                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                                    <div>
                                                                        <p className="font-medium text-neutral-900 dark:text-white">Resume</p>
                                                                        <p className="text-sm text-neutral-500">View candidate&apos;s resume</p>
                                                                    </div>
                                                                </div>
                                                                <Link
                                                                    href={application.resumeUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Button variant="outline" size="sm" className="rounded-lg">
                                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                                        Open
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.coverLetter && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <MessageSquare className="w-5 h-5" />
                                                                Cover Letter
                                                            </h4>
                                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                                                    {application.coverLetter}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    (application.candidate?.headline || application.candidate?.bio) && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <Briefcase className="w-5 h-5" />
                                                                About
                                                            </h4>
                                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                                                                {
                                                                    application.candidate?.headline && (
                                                                        <p className="font-medium text-neutral-900 dark:text-white mb-2">
                                                                            {application.candidate.headline}
                                                                        </p>
                                                                    )
                                                                }
                                                                {
                                                                    application.candidate?.bio && (
                                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                                            {application.candidate.bio}
                                                                        </p>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.candidate?.skills && application.candidate.skills.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <Award className="w-5 h-5" />
                                                                Skills
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {
                                                                    application.candidate.skills.map((skill: string, index: number) => (
                                                                        <Badge key={index} variant="secondary" className="rounded-lg">
                                                                            {skill}
                                                                        </Badge>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.job?.skillsRequired && application.job.skillsRequired.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <Award className="w-5 h-5" />
                                                                Required Skills for this Role
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {
                                                                    application.job.skillsRequired.map((skill: string, index: number) => (
                                                                        <Badge
                                                                            key={index}
                                                                            variant="outline"
                                                                            className={`rounded-lg ${application.candidate?.skills?.includes(skill)
                                                                                ? "border-neutral-900 text-neutral-800 dark:border-neutral-300 dark:text-neutral-100"
                                                                                : ""
                                                                                }`}
                                                                        >
                                                                            {
                                                                                application.candidate?.skills?.includes(skill) && (
                                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                                )
                                                                            }
                                                                            {skill}
                                                                        </Badge>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.hrNotes && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <Star className="w-5 h-5" />
                                                                HR Notes
                                                            </h4>
                                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                                                    {application.hrNotes}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    application.interviewScheduledAt && (
                                                        <div>
                                                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                                <Calendar className="w-5 h-5" />
                                                                Interview
                                                            </h4>
                                                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-neutral-800">
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    Scheduled for: {format(new Date(application.interviewScheduledAt), "MMMM d, yyyy 'at' h:mm a")}
                                                                </p>
                                                                {
                                                                    application.interviewCompletedAt && (
                                                                        <p className="text-xs text-neutral-500 mt-1">
                                                                            Completed: {format(new Date(application.interviewCompletedAt), "MMM d, yyyy")}
                                                                        </p>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                }

                                                {
                                                    !["REJECTED", "HIRED", "WITHDRAWN"].includes(application.status) && (
                                                        <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setShowNoteDialog(true)}
                                                                className="rounded-xl"
                                                            >
                                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                                Add Note
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                                                                onClick={() => setShowRejectDialog(true)}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Reject
                                                            </Button>
                                                            <Button
                                                                className="rounded-xl bg-neutral-800 hover:bg-neutral-700"
                                                                onClick={() => setShowAcceptDialog(true)}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                {application.status === "SHORTLISTED" ? "Schedule Interview" : "Shortlist"}
                                                            </Button>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-neutral-500">Application not found</p>
                                            </div>
                                        )
                                    }
                                </div>
                            </motion.div>
                        </>
                    )
                }
            </AnimatePresence>

            {
                application && (
                    <RejectDialog
                        isOpen={showRejectDialog}
                        onClose={() => setShowRejectDialog(false)}
                        applicationId={application.id}
                        candidateName={getCandidateName(application)}
                        onSuccess={() => {
                            setShowRejectDialog(false)
                            onUpdated()
                            onClose()
                        }}
                    />
                )
            }

            {
                application && (
                    <AcceptDialog
                        isOpen={showAcceptDialog}
                        onClose={() => setShowAcceptDialog(false)}
                        applicationId={application.id}
                        candidateName={getCandidateName(application)}
                        currentStatus={application.status}
                        onSuccess={() => {
                            setShowAcceptDialog(false)
                            onUpdated()
                            onClose()
                        }}
                    />
                )
            }

            {
                application && (
                    <AddNoteDialog
                        isOpen={showNoteDialog}
                        onClose={() => setShowNoteDialog(false)}
                        applicationId={application.id}
                        onSuccess={() => {
                            setShowNoteDialog(false)
                            onUpdated()
                        }}
                    />
                )
            }
        </>
    )
}

// Reject Dialog with Markdown Editor + Voice + AI
function RejectDialog({
    isOpen,
    onClose,
    applicationId,
    candidateName,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    applicationId: string
    candidateName: string
    onSuccess: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState("")
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [isEnhancing, setIsEnhancing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const handleReject = () => {
        if (!message.trim()) return

        startTransition(async () => {
            const result = await rejectApplication(applicationId, message)
            if (result.success) {
                setMessage("")
                onSuccess()
            }
        })
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
                stream.getTracks().forEach(track => track.stop())
                
                // Convert to base64 and transcribe
                setIsTranscribing(true)
                try {
                    const arrayBuffer = await audioBlob.arrayBuffer()
                    const base64 = Buffer.from(arrayBuffer).toString("base64")
                    const result = await transcribeAudio(base64, "audio/webm")
                    
                    if (result.success && result.text) {
                        const transcribedText = result.text
                        setMessage(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText)
                    } else {
                        setMessage(prev => prev + "\n\n[Voice note - transcription failed]")
                    }
                } catch (error: unknown) {
                    console.error("Transcription error:", error)
                    setMessage(prev => prev + "\n\n[Voice note - transcription failed]")
                } finally {
                    setIsTranscribing(false)
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error: unknown) {
            console.error("Failed to start recording:", error)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const enhanceWithAI = async () => {
        if (!message.trim()) return

        setIsEnhancing(true)
        const result = await makeMessageProfessional(message)
        if (result.success && result.data) {
            setMessage(result.data)
        }
        setIsEnhancing(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Reject Application
                    </DialogTitle>
                    <DialogDescription>
                        Send a rejection message to {candidateName}. Be professional and constructive.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Rejection Message</Label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your rejection message here. You can use markdown formatting..."
                            className="min-h-[200px] mt-2 font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            Supports Markdown formatting
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`rounded-lg ${isRecording ? "bg-red-100 border-red-300 text-red-700" : ""}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                        >
                            {
                                isTranscribing ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Transcribing...
                                    </>
                                ) : isRecording ? (
                                    <>
                                        <MicOff className="w-4 h-4 mr-2" />
                                        Stop Recording
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-4 h-4 mr-2" />
                                        Voice Note
                                    </>
                                )
                            }
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={enhanceWithAI}
                            disabled={!message.trim() || isEnhancing}
                        >
                            {
                                isEnhancing ? (
                                    <InlineLoader size="sm" className="mr-2" />
                                ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                )
                            }
                            Make Professional
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isPending || !message.trim()}
                    >
                        {
                            isPending ? (
                                <InlineLoader size="sm" className="mr-2" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )
                        }
                        Send Rejection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Accept/Interview Dialog
function AcceptDialog({
    isOpen,
    onClose,
    applicationId,
    candidateName,
    currentStatus,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    applicationId: string
    candidateName: string
    currentStatus: string
    onSuccess: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [notes, setNotes] = useState("")
    const [interviewDate, setInterviewDate] = useState("")
    const [interviewTime, setInterviewTime] = useState("")
    const [interviewLink, setInterviewLink] = useState<string | null>(null)

    const isSchedulingInterview = currentStatus === "SHORTLISTED"

    const handleAccept = () => {
        startTransition(async () => {
            if (isSchedulingInterview) {
                const scheduledAt = new Date(`${interviewDate}T${interviewTime}`)
                const result = await scheduleInterview(applicationId, scheduledAt, notes || undefined)
                if (result.success && result.interviewLink) {
                    setInterviewLink(result.interviewLink)
                }
            } else {
                const result = await shortlistApplication(applicationId, notes || undefined)
                if (result.success) {
                    onSuccess()
                }
            }
        })
    }

    if (interviewLink) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-neutral-900" />
                            Interview Scheduled!
                        </DialogTitle>
                        <DialogDescription>
                            The interview has been scheduled with {candidateName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                            Interview Link
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 min-w-0 text-sm bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg truncate">
                                {interviewLink}
                            </code>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigator.clipboard.writeText(interviewLink)}
                            >
                                Copy
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Link href={`/interviews`}>
                            <Button>
                                View Interview Process
                            </Button>
                        </Link>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-neutral-900" />
                        {isSchedulingInterview ? "Schedule Interview" : "Shortlist Candidate"}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            isSchedulingInterview
                                ? `Schedule an interview with ${candidateName}. A demo interview link will be generated.`
                                : `Move ${candidateName} to the shortlist for further review.`
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {
                        isSchedulingInterview && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Interview Date</Label>
                                        <Input
                                            type="date"
                                            value={interviewDate}
                                            onChange={(e) => setInterviewDate(e.target.value)}
                                            className="mt-2"
                                            min={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    <div>
                                        <Label>Interview Time</Label>
                                        <Input
                                            type="time"
                                            value={interviewTime}
                                            onChange={(e) => setInterviewTime(e.target.value)}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                            </>
                        )
                    }

                    <div>
                        <Label>Notes (optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this decision..."
                            className="min-h-[100px] mt-2"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-neutral-800 hover:bg-neutral-700"
                        onClick={handleAccept}
                        disabled={isPending || (isSchedulingInterview && (!interviewDate || !interviewTime))}
                    >
                        {
                            isPending ? (
                                <InlineLoader size="sm" className="mr-2" />
                            ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                            )
                        }
                        {isSchedulingInterview ? "Schedule Interview" : "Shortlist"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Add Note Dialog
function AddNoteDialog({
    isOpen,
    onClose,
    applicationId,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    applicationId: string
    onSuccess: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [note, setNote] = useState("")
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const handleAddNote = () => {
        if (!note.trim()) return

        startTransition(async () => {
            const result = await addApplicationNote(applicationId, note)
            if (result.success) {
                setNote("")
                onSuccess()
            }
        })
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
                stream.getTracks().forEach(track => track.stop())
                
                // Convert to base64 and transcribe
                setIsTranscribing(true)
                try {
                    const arrayBuffer = await audioBlob.arrayBuffer()
                    const base64 = Buffer.from(arrayBuffer).toString("base64")
                    const result = await transcribeAudio(base64, "audio/webm")
                    
                    if (result.success && result.text) {
                        const transcribedText = result.text
                        setNote(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText)
                    } else {
                        setNote(prev => prev + "\n\n[Voice note - transcription failed]")
                    }
                } catch (error: unknown) {
                    console.error("Transcription error:", error)
                    setNote(prev => prev + "\n\n[Voice note - transcription failed]")
                } finally {
                    setIsTranscribing(false)
                }
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error: unknown) {
            console.error("Failed to start recording:", error)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                    <DialogDescription>
                        Add internal notes about this application. Notes are only visible to your team.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Write your note here..."
                        className="min-h-[150px]"
                    />

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`rounded-lg ${isRecording ? "bg-red-100 border-red-300 text-red-700" : ""}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                        >
                            {
                                isTranscribing ? (
                                    <>
                                        <InlineLoader size="sm" className="mr-2" />
                                        Transcribing...
                                    </>
                                ) : isRecording ? (
                                    <>
                                        <MicOff className="w-4 h-4 mr-2" />
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-4 h-4 mr-2" />
                                        Voice Note
                                    </>
                                )
                            }
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddNote} disabled={isPending || !note.trim()}>
                        {
                            isPending ? (
                                <InlineLoader size="sm" className="mr-2" />
                            ) : (
                                <MessageSquare className="w-4 h-4 mr-2" />
                            )
                        }
                        Add Note
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}