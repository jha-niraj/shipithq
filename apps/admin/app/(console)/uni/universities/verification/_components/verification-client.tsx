"use client"

import { useState } from "react"
import {
    GraduationCap, CheckCircle, XCircle, Clock, Eye, ExternalLink, Globe, Users, Calendar, ArrowLeft, Building2,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@repo/ui/components/ui/dialog"
import { Textarea } from "@repo/ui/components/ui/textarea"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { verifyUniversity, rejectUniversityVerification } from "@/actions/uni/uni.action"
import { useSession } from "@repo/auth/client"

export interface University {
    id: string
    name: string
    slug: string
    website: string | null
    description: string | null
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    createdAt: Date
    // getPendingUniversityVerifications() fetches members/studentLinks/departments
    // as real arrays (relations), not a `_count` shape - see the note on the
    // matching hiring/companies/verification fix for the same bug.
    members: unknown[]
    studentLinks: unknown[]
    departments: unknown[]
}

export interface Stats {
    pending: number
    verified: number
    rejected: number
}

interface UniversityCardProps {
    university: University
    onApprove: (id: string) => void
    onReject: (id: string, reason: string) => void
    isLoading: boolean
}

function UniversityCard({ university, onApprove, onReject, isLoading }: UniversityCardProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    const handleReject = () => {
        if (!rejectReason.trim()) {
            toast.error("Please provide a rejection reason")
            return
        }
        onReject(university.id, rejectReason)
        setShowRejectDialog(false)
        setRejectReason("")
    }

    const location = [university.city, university.state, university.country].filter(Boolean).join(", ")

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">{university.name}</h3>
                            <p className="text-sm text-neutral-500">{location || "Location not specified"}</p>
                        </div>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {university.website && (
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 min-w-0">
                            <Globe className="w-4 h-4 shrink-0" />
                            <a href={university.website} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                                {university.website.replace("https://", "").replace("http://", "")}
                            </a>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Building2 className="w-4 h-4" />
                        <span>{university.departments.length} department(s)</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Users className="w-4 h-4" />
                        <span>{university.members.length} faculty member(s)</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Users className="w-4 h-4" />
                        <span>{university.studentLinks.length} student(s)</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Calendar className="w-3 h-3" />
                        <span>Registered {new Date(university.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDetails(true)} className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectDialog(true)}
                            disabled={isLoading}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                        </Button>
                        <Button size="sm" onClick={() => onApprove(university.id)} disabled={isLoading} className="text-xs bg-neutral-800 hover:bg-neutral-700">
                            {isLoading ? <InlineLoader size="sm" className="mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                            Approve
                        </Button>
                    </div>
                </div>
            </motion.div>
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                            {university.name}
                        </DialogTitle>
                        <DialogDescription>University verification details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Website</p>
                                {university.website ? (
                                    <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-800 dark:text-neutral-200 hover:underline flex items-center gap-1">
                                        {university.website} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="text-sm text-neutral-500">Not specified</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Location</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{location || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Address</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{university.address || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Slug</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{university.slug}</p>
                            </div>
                        </div>
                        {university.description && (
                            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Description</p>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">{university.description}</p>
                            </div>
                        )}
                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Stats</p>
                            <StatBand
                                size="sm"
                                cols={3}
                                items={[
                                    { icon: Building2, label: "Departments", value: university.departments.length },
                                    { icon: Users, label: "Faculty", value: university.members.length },
                                    { icon: GraduationCap, label: "Students", value: university.studentLinks.length },
                                ]}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject University</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting {university.name}. This will be recorded in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        <Button onClick={handleReject} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export function VerificationClient({
    initialUniversities,
    initialStats,
}: {
    initialUniversities: University[]
    initialStats: Stats
}) {
    const { data: session } = useSession()
    const [universities, setUniversities] = useState<University[]>(initialUniversities)
    const [stats, setStats] = useState<Stats>(initialStats)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const handleApprove = async (id: string) => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to approve universities")
            return
        }
        setActionLoading(id)
        try {
            const result = await verifyUniversity(id, session.user.id)
            if (result.success) {
                setUniversities((prev) => prev.filter((u) => u.id !== id))
                setStats((prev) => ({ ...prev, pending: prev.pending - 1, verified: prev.verified + 1 }))
                toast.success("University approved successfully")
            } else {
                toast.error(result.error || "Failed to approve university")
            }
        } catch (error) {
            console.error("Approve error:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (id: string, reason: string) => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to reject universities")
            return
        }
        setActionLoading(id)
        try {
            // `reason` used to be dropped here even though the action always
            // supported it (rejectUniversityVerification's third param) and the
            // `university` table has a real `rejection_reason` column for it.
            const result = await rejectUniversityVerification(id, session.user.id, reason)
            if (result.success) {
                setUniversities((prev) => prev.filter((u) => u.id !== id))
                setStats((prev) => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }))
                toast.success("University rejected")
            } else {
                toast.error(result.error || "Failed to reject university")
            }
        } catch (error) {
            console.error("Reject error:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <Link href="/uni" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to University Platform
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-8 rounded-full bg-neutral-900" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">University Verification</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Review and verify pending university registrations</p>
                    </div>
                </div>
            </div>
            <StatBand
                className="mb-8"
                cols={3}
                items={[
                    { icon: Clock, label: "Pending Review", value: stats.pending },
                    { icon: CheckCircle, label: "Approved", value: stats.verified },
                    { icon: XCircle, label: "Rejected", value: stats.rejected, tone: "rose" },
                ]}
            />
            {universities.length > 0 ? (
                <div className="space-y-4">
                    {universities.map((university) => (
                        <UniversityCard key={university.id} university={university} onApprove={handleApprove} onReject={handleReject} isLoading={actionLoading === university.id} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <CheckCircle className="w-12 h-12 text-neutral-900 dark:text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
                    <p className="text-neutral-500">No pending university verifications at the moment.</p>
                </div>
            )}
        </div>
    )
}
