"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
    CreditCard, Filter, Search, ArrowDownRight, AlertCircle, 
    CheckCircle, XCircle, Clock, RefreshCcw, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Loading from "./loading"
import { Input } from "@repo/ui/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import { Alert, AlertDescription } from "@repo/ui/components/ui/alert"
import {
    getPaymentHistory
} from "@/actions/billing/payment.action"
import type { PaymentRecord } from "@/types"
import { getBillingOverview } from "@/actions/billing/invoice.action"

// Status configurations
const statusConfig = {
    SUCCEEDED: {
        label: "Succeeded",
        icon: CheckCircle,
        color: "text-neutral-800 dark:text-neutral-100",
        bg: "bg-neutral-100 dark:bg-neutral-800/30"
    },
    PENDING: {
        label: "Pending",
        icon: Clock,
        color: "text-neutral-800 dark:text-neutral-100",
        bg: "bg-neutral-100 dark:bg-neutral-800/30"
    },
    PROCESSING: {
        label: "Processing",
        icon: RefreshCcw,
        color: "text-neutral-800 dark:text-neutral-100",
        bg: "bg-neutral-100 dark:bg-neutral-800/30"
    },
    FAILED: {
        label: "Failed",
        icon: XCircle,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30"
    },
    REFUNDED: {
        label: "Refunded",
        icon: ArrowDownRight,
        color: "text-neutral-600 dark:text-neutral-400",
        bg: "bg-neutral-100 dark:bg-neutral-800"
    },
    CANCELLED: {
        label: "Cancelled",
        icon: XCircle,
        color: "text-neutral-600 dark:text-neutral-400",
        bg: "bg-neutral-100 dark:bg-neutral-800"
    },
}

function TransactionCard({ payment }: { payment: PaymentRecord }) {
    const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.PENDING
    const StatusIcon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${config.bg}`}>
                        <CreditCard className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {payment.description || "Subscription Payment"}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            {
                                new Date(payment.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })
                            }
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${config.bg} ${config.color} border-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                        {payment.currency === "INR" ? "₹" : "$"}
                        {payment.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">
                        {
                            payment.paidAt ? (
                                <span className="flex items-center gap-1 justify-end">
                                    <CheckCircle className="h-3 w-3 text-neutral-900 dark:text-white" />
                                    Paid {new Date(payment.paidAt).toLocaleDateString()}
                                </span>
                            ) : (
                                payment.status === "PENDING" && "Awaiting payment"
                            )
                        }
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

export default function TransactionsPage() {
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [overview, setOverview] = useState<{
        totalSpent: number
        currency: string
        invoiceCount: number
        lastPaymentDate: Date | null
    } | null>(null)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [paymentsResult, overviewResult] = await Promise.all([
                    getPaymentHistory(50),
                    getBillingOverview()
                ])

                if (paymentsResult.success) {
                    setPayments(paymentsResult.payments)
                    setFilteredPayments(paymentsResult.payments)
                }
                if (overviewResult.success && overviewResult.data) {
                    setOverview(overviewResult.data)
                }
            } catch (err: unknown) {
                setError("Failed to load transactions")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Filter payments
    useEffect(() => {
        let filtered = payments

        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.status === statusFilter)
        }

        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredPayments(filtered)
        setCurrentPage(1)
    }, [payments, statusFilter, searchQuery])

    // Pagination
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
    const paginatedPayments = filteredPayments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    if (loading) {
        return <Loading />
    }

    // Calculate stats
    const successfulPayments = payments.filter(p => p.status === "SUCCEEDED")
    const pendingPayments = payments.filter(p => p.status === "PENDING")
    const failedPayments = payments.filter(p => p.status === "FAILED")

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Transactions"
                subtitle="View and manage all your payment transactions"
            />

            {
                error && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-600 dark:text-red-400">
                            {error}
                        </AlertDescription>
                    </Alert>
                )
            }

            <StatBand
                cols={4}
                items={[
                    { icon: CreditCard, label: "Total Spent", value: `${overview?.currency === "INR" ? "₹" : "$"}${(overview?.totalSpent || 0).toLocaleString()}` },
                    { icon: CheckCircle, label: "Successful", value: successfulPayments.length },
                    { icon: Clock, label: "Pending", value: pendingPayments.length },
                    { icon: XCircle, label: "Failed", value: failedPayments.length, tone: "rose" },
                ]}
            />
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-4">
                {
                    paginatedPayments.length > 0 ? (
                        paginatedPayments.map((payment) => (
                            <TransactionCard key={payment.id} payment={payment} />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <CreditCard className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                            <p className="text-neutral-500">No transactions found</p>
                            <p className="text-sm text-neutral-400 mt-1">
                                {
                                    statusFilter !== "all" || searchQuery
                                        ? "Try adjusting your filters"
                                        : "Transactions will appear here after your first payment"
                                }
                            </p>
                        </div>
                    )
                }
            </div>

            {
                totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} transactions
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )
            }
        </div>
    )
}