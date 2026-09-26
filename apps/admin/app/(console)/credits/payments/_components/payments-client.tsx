"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, CreditCard, IndianRupee } from "lucide-react"
import { getPayments } from "@/actions/main/credit.action"
import { toast } from "@repo/ui/components/ui/sonner"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { Input } from '@repo/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select'
import { format } from "date-fns"
import { PaymentStatus } from "@repo/db"

export interface Payments {
    id: string
    orderId: string | null
    credits: number
    // A Postgres `decimal` column - drizzle returns these as strings so precision
    // survives serialization, not as `number`. Pass through `formatCurrency`,
    // which converts before formatting.
    amount: string
    status: PaymentStatus
    createdAt: Date
    user: {
        id: string
        name: string | null
        email: string
    } | null | undefined
}

function getStatusBadge(status: string) {
    const styles = {
        COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        PENDING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        REFUNDED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        CANCELLED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800/30 dark:text-neutral-400",
    }
    return styles[status as keyof typeof styles] || styles.PENDING
}

function formatCurrency(amount: string) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
    }).format(Number(amount) / 100) // Assuming amount is in paise
}

export function PaymentsClient({
    initialPayments,
    initialTotalPages,
    loadError,
}: {
    initialPayments: Payments[]
    initialTotalPages: number
    loadError: string | null | undefined
}) {
    const [payments, setPayments] = useState<Payments[]>(initialPayments)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchPayments = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getPayments(
                { status: statusFilter || "all", search: searchTerm || undefined },
                { page, limit: 20 }
            )
            if (result.success) {
                setPayments(result.data.payments)
                setTotalPages(result.data.pages || 1)
            } else {
                toast.error(result.error || "Failed to fetch payments")
            }
        } catch (error) {
            console.error("Fetch error:", error)
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, searchTerm])

    useEffect(() => {
        if (loadError) toast.error(loadError)
    }, [loadError])

    // Skip the redundant re-fetch on mount - the server already loaded page 1.
    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchPayments()
    }, [page, statusFilter, fetchPayments, firstLoad])

    useEffect(() => {
        if (firstLoad) return
        const timer = setTimeout(() => {
            if (page === 1) {
                fetchPayments()
            } else {
                setPage(1)
            }
        }, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm])

    return (
        <div className="w-full p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="w-7 h-7" />
                        Credit Payments
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        View all credit purchase transactions
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        type="text"
                        placeholder="Search by user email or order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                    />
                </div>
                <Select
                    value={statusFilter || 'ALL'}
                    onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1) }}
                >
                    <SelectTrigger className="px-4 py-2 rounded-lg text-sm">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* 'ALL' rather than '': Radix Select treats an empty string as
                            "no selection" and throws on an item that uses it. */}
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <InlineLoader size="md" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Credits</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Payment Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-white text-sm font-medium">
                                                        {payment.user?.name?.charAt(0) || "U"}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-neutral-900 dark:text-white">{payment.user?.name || "Unknown"}</div>
                                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{payment.user?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-mono text-neutral-900 dark:text-white">{payment.orderId || payment.id.slice(0, 8)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm font-semibold text-neutral-900 dark:text-white">
                                                    <IndianRupee className="w-3.5 h-3.5" />
                                                    {formatCurrency(payment.amount)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{payment.credits} credits</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(payment.status)}`}>{payment.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300 capitalize">RazorPay</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                                                {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {payments.length === 0 && (
                            <div className="text-center py-12">
                                <CreditCard className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                                <p className="text-neutral-500 dark:text-neutral-400">No payments found</p>
                            </div>
                        )}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
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
                    </>
                )}
            </div>
        </div>
    )
}
