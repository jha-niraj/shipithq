"use client"

import { useState } from "react"
import {
    Building2, CheckCircle, XCircle, Clock, Eye, ExternalLink, Globe, Users, MapPin, Calendar, ArrowLeft,
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
import { verifyCompany, rejectCompanyVerification } from "@/actions/hiring/hiring.action"
import { useSession } from "@repo/auth/client"
import type { ClaimRow } from "@/actions/hiring/claims.action"
import { ClaimsSection } from "./claims-section"

export interface Company {
    id: string
    name: string
    website: string | null
    description: string | null
    industry: string | null
    companySize: string | null
    headquarters: string | null
    createdAt: Date
    // getPendingCompanyVerifications() fetches the `members` relation directly
    // (an array), not a `_count` shape - the previous version of this page
    // declared `_count: { members: number; jobs: number }` and cast the real
    // response into it, so both numbers were always undefined at runtime.
    // "Jobs Posted" is dropped rather than faked: `companies` has no `jobs`
    // relation to count from without a separate query.
    members: unknown[]
}

export interface Stats {
    pending: number
    verified: number
    rejected: number
}

interface CompanyCardProps {
    company: Company
    onApprove: (id: string) => void
    onReject: (id: string, reason: string) => void
    isLoading: boolean
}

function CompanyCard({ company, onApprove, onReject, isLoading }: CompanyCardProps) {
    const [showDetails, setShowDetails] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState("")

    const handleReject = () => {
        if (!rejectReason.trim()) {
            toast.error("Please provide a rejection reason")
            return
        }
        onReject(company.id, rejectReason)
        setShowRejectDialog(false)
        setRejectReason("")
    }

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
                            <Building2 className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">{company.name}</h3>
                            <p className="text-sm text-neutral-500">{company.industry || "Industry not specified"}</p>
                        </div>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100 text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {company.website && (
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 min-w-0">
                            <Globe className="w-4 h-4 shrink-0" />
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:underline">
                                {company.website.replace("https://", "").replace("http://", "")}
                            </a>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 min-w-0">
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="min-w-0 truncate">{company.companySize || "Size not specified"}</span>
                    </div>
                    {company.headquarters && (
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 min-w-0">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="min-w-0 truncate">{company.headquarters}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <Users className="w-4 h-4" />
                        <span>{company.members.length} member(s)</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Calendar className="w-3 h-3" />
                        <span>Submitted {new Date(company.createdAt).toLocaleDateString()}</span>
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
                        <Button size="sm" onClick={() => onApprove(company.id)} disabled={isLoading} className="text-xs bg-neutral-800 hover:bg-neutral-700">
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
                            <Building2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                            {company.name}
                        </DialogTitle>
                        <DialogDescription>Company verification details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Website</p>
                                {company.website ? (
                                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-800 dark:text-neutral-200 hover:underline flex items-center gap-1">
                                        {company.website} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <p className="text-sm text-neutral-500">Not specified</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Industry</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{company.industry || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Company Size</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{company.companySize || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Headquarters</p>
                                <p className="text-sm text-neutral-900 dark:text-white">{company.headquarters || "Not specified"}</p>
                            </div>
                        </div>
                        {company.description && (
                            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Description</p>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">{company.description}</p>
                            </div>
                        )}
                        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Stats</p>
                            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 w-fit">
                                <p className="font-medium text-neutral-900 dark:text-white">{company.members.length}</p>
                                <p className="text-xs text-neutral-500">Members</p>
                            </div>
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
                        <DialogTitle className="text-red-600">Reject Company</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting {company.name}. This will be recorded in the system.
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
    initialCompanies,
    initialStats,
    initialClaims,
}: {
    initialCompanies: Company[]
    initialStats: Stats
    initialClaims: ClaimRow[]
}) {
    const [claims, setClaims] = useState<ClaimRow[]>(initialClaims)
    const { data: session } = useSession()
    const [companies, setCompanies] = useState<Company[]>(initialCompanies)
    const [stats, setStats] = useState<Stats>(initialStats)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const handleApprove = async (id: string) => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to approve companies")
            return
        }
        setActionLoading(id)
        try {
            const result = await verifyCompany(id)
            if (result.success) {
                setCompanies((prev) => prev.filter((c) => c.id !== id))
                setStats((prev) => ({ ...prev, pending: prev.pending - 1, verified: prev.verified + 1 }))
                toast.success("Company approved successfully")
            } else {
                toast.error(result.error || "Failed to approve company")
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
            toast.error("You must be logged in to reject companies")
            return
        }
        setActionLoading(id)
        try {
            // `reason` used to be dropped here - the function only took (id, adminId).
            const result = await rejectCompanyVerification(id, reason)
            if (result.success) {
                setCompanies((prev) => prev.filter((c) => c.id !== id))
                setStats((prev) => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }))
                toast.success("Company rejected")
            } else {
                toast.error(result.error || "Failed to reject company")
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
                <Link href="/hiring" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Hiring Platform
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-8 rounded-full bg-neutral-900" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Company Verification</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">Claims on unclaimed company pages, and new company sign-ups waiting for verification</p>
                    </div>
                </div>
            </div>
            <StatBand
                className="mb-8"
                cols={4}
                items={[
                    { icon: Users, label: "Claims waiting", value: claims.length },
                    { icon: Clock, label: "Sign-ups waiting", value: stats.pending },
                    { icon: CheckCircle, label: "Approved", value: stats.verified },
                    { icon: XCircle, label: "Rejected", value: stats.rejected, tone: "rose" },
                ]}
            />
            <ClaimsSection
                claims={claims}
                onDecided={(id, kind) => {
                    setClaims((prev) => prev.filter((c) => c.id !== id))
                    if (kind === "approved") setStats((prev) => ({ ...prev, verified: prev.verified + 1 }))
                }}
            />
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">New company sign-ups</h2>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{companies.length} waiting</span>
            </div>
            {companies.length > 0 ? (
                <div className="space-y-4">
                    {companies.map((company) => (
                        <CompanyCard key={company.id} company={company} onApprove={handleApprove} onReject={handleReject} isLoading={actionLoading === company.id} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <CheckCircle className="w-12 h-12 text-neutral-900 dark:text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
                    <p className="text-neutral-500">No pending company verifications at the moment.</p>
                </div>
            )}
        </div>
    )
}
