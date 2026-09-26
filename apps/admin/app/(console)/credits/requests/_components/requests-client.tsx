"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { getCreditRequests, approveCreditRequest, rejectCreditRequest } from "@/actions/main/credit.action"
import { toast } from "@repo/ui/components/ui/sonner"
import { format } from "date-fns"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { CreditRequestStatus } from "@repo/db"

export interface CreditRequests {
    id: string
    userId: string | null
    requestedCredits: number
    status: CreditRequestStatus
    createdAt: Date
    linkedinPostUrl: string
    twitterPostUrl: string | null
    adminNotes: string | null
    user: {
        id: string
        name: string | null
        email: string
        image?: string | null
    } | null | undefined
}

export function RequestsClient({
    initialRequests,
    initialTotalPages,
    loadError,
}: {
    initialRequests: CreditRequests[]
    initialTotalPages: number
    loadError: string | null | undefined
}) {
    const [requests, setRequests] = useState<CreditRequests[]>(initialRequests)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getCreditRequests("PENDING", { page, limit: 20 }, searchTerm || undefined)
            if (result.success) {
                setRequests(result.data.requests)
                setTotalPages(result.data.pages || 1)
            } else {
                toast.error(result.error || "Failed to fetch requests")
            }
        } catch (error) {
            console.error("Fetch error:", error)
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }, [page, searchTerm])

    useEffect(() => {
        if (loadError) toast.error(loadError)
    }, [loadError])

    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchRequests()
    }, [page, fetchRequests, firstLoad])

    useEffect(() => {
        if (firstLoad) return
        const timer = setTimeout(() => {
            if (page === 1) {
                fetchRequests()
            } else {
                setPage(1)
            }
        }, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm])

    async function handleApprove(requestId: string, amount: number) {
        setProcessingId(requestId)
        try {
            const result = await approveCreditRequest(requestId, amount)
            if (result.success) {
                toast.success("Request approved successfully")
                fetchRequests()
            } else {
                toast.error(result.error || "Failed to approve request")
            }
        } catch (error) {
            console.error("Approve error:", error)
            toast.error("An error occurred")
        } finally {
            setProcessingId(null)
        }
    }

    async function handleReject(requestId: string, reason: string) {
        setProcessingId(requestId)
        try {
            const result = await rejectCreditRequest(requestId, reason)
            if (result.success) {
                toast.success("Request rejected")
                fetchRequests()
            } else {
                toast.error(result.error || "Failed to reject request")
            }
        } catch (error) {
            console.error("Reject error:", error)
            toast.error("An error occurred")
        } finally {
            setProcessingId(null)
        }
    }

    function openRejectDialog(requestId: string) {
        const reason = prompt("Enter rejection reason:")
        if (reason) handleReject(requestId, reason)
    }

    return (
        <div className="w-full p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                        <Clock className="w-7 h-7" />
                        Credit Requests
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Review and approve pending credit requests
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-neutral-800 dark:text-neutral-100" />
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{requests.length} pending</span>
                </div>
            </div>
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                    type="text"
                    placeholder="Search by user email or request ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
            </div>
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <InlineLoader size="md" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
                        <CheckCircle className="w-12 h-12 text-neutral-900 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
                        <p className="text-neutral-500 dark:text-neutral-400">No pending credit requests at the moment.</p>
                    </div>
                ) : (
                    requests.map((request) => (
                        <div key={request.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                        {request.user?.name?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{request.user?.name || "Unknown User"}</h3>
                                            <span className="px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 rounded-full">PENDING</span>
                                        </div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{request.user?.email}</p>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">Amount:</span>
                                                <span className="ml-2 font-semibold text-neutral-800 dark:text-neutral-100">{request.requestedCredits} credits</span>
                                            </div>
                                            <div>
                                                <span className="text-neutral-500 dark:text-neutral-400">Requested:</span>
                                                <span className="ml-2 text-neutral-900 dark:text-white">{format(new Date(request.createdAt), "MMM dd, yyyy")}</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                            <a
                                                href={request.linkedinPostUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                                            >
                                                LinkedIn post
                                            </a>
                                            {request.twitterPostUrl && (
                                                <a
                                                    href={request.twitterPostUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                                                >
                                                    Twitter/X post
                                                </a>
                                            )}
                                        </div>
                                        {request.adminNotes && (
                                            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">{request.adminNotes}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 lg:flex-col lg:items-end">
                                    <button
                                        onClick={() => handleApprove(request.id, request.requestedCredits)}
                                        disabled={processingId === request.id}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {processingId === request.id ? <InlineLoader size="sm" /> : <CheckCircle className="w-4 h-4" />}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => openRejectDialog(request.id)}
                                        disabled={processingId === request.id}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
