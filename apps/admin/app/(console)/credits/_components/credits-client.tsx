"use client"

import { useCallback, useEffect, useState } from "react"
import { CreditCard, Search, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@repo/ui/lib/utils"
import Link from "next/link"
import { Input } from "@repo/ui/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { toast } from "@repo/ui/components/ui/sonner"
import {
    getAllTransactions, getCreditRequests, getCreditStats, approveCreditRequest, rejectCreditRequest,
} from "@/actions/main/credit.action"
import type { CreditType, Currency } from "@repo/db"

export interface Transaction {
    id: string
    userId: string
    amount: number
    type: CreditType
    description: string
    createdAt: Date
    currency: Currency
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    } | undefined
}

export interface CreditRequest {
    id: string
    userId: string
    requestedCredits: number
    linkedinPostUrl: string
    status: "PENDING" | "APPROVED" | "REJECTED"
    createdAt: Date
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    } | undefined
}

interface Stats {
    totalCredits: number
    pendingRequests: number
    totalTransactions: number
    totalPayments: number
}

type Tab = "overview" | "transactions" | "requests"

export function CreditsClient({
    initialStats,
    initialTransactions,
    initialRequests,
}: {
    initialStats: Stats
    initialTransactions: Transaction[]
    initialRequests: CreditRequest[]
}) {
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const [searchQuery, setSearchQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<"all" | CreditType>("all")
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
    const [requests, setRequests] = useState<CreditRequest[]>(initialRequests)
    const [stats, setStats] = useState<Stats>(initialStats)
    const [loading, setLoading] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchTransactions = useCallback(() => {
        setLoading(true)
        getAllTransactions(
            { type: typeFilter === "all" ? undefined : typeFilter },
            { page: 1, limit: 50 },
        ).then((res) => {
            if (res.success) setTransactions(res.data.transactions)
        }).finally(() => setLoading(false))
    }, [typeFilter])

    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchTransactions()
    }, [fetchTransactions, firstLoad])

    async function reloadRequests() {
        const res = await getCreditRequests("PENDING", { page: 1, limit: 10 })
        if (res.success) setRequests(res.data.requests)
        const statsRes = await getCreditStats()
        if (statsRes.success) setStats(statsRes.data)
    }

    async function handleApprove(requestId: string, amount: number) {
        setProcessingId(requestId)
        try {
            const result = await approveCreditRequest(requestId, amount)
            if (result.success) {
                toast.success("Request approved")
                reloadRequests()
            } else {
                toast.error(result.error || "Failed to approve request")
            }
        } finally {
            setProcessingId(null)
        }
    }

    async function handleReject(requestId: string) {
        const reason = prompt("Enter rejection reason:")
        if (!reason) return
        setProcessingId(requestId)
        try {
            const result = await rejectCreditRequest(requestId, reason)
            if (result.success) {
                toast.success("Request rejected")
                reloadRequests()
            } else {
                toast.error(result.error || "Failed to reject request")
            }
        } finally {
            setProcessingId(null)
        }
    }

    const filteredTransactions = transactions.filter((txn) => {
        const matchesSearch = (txn.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (txn.user?.email || "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === "all" || txn.type === typeFilter
        return matchesSearch && matchesType
    })

    return (
        <div className="w-full p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
                    <CreditCard className="w-7 h-7" />
                    Credits Management
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Monitor and manage credit transactions across the platform</p>
            </div>
            <StatBand
                className="mb-8"
                cols={4}
                items={[
                    { icon: CreditCard, label: "Total in Circulation", value: stats.totalCredits.toLocaleString() },
                    { icon: ArrowUpRight, label: "Total Payments", value: stats.totalPayments.toLocaleString() },
                    { icon: ArrowDownRight, label: "Total Transactions", value: stats.totalTransactions.toLocaleString() },
                    { icon: Clock, label: "Pending Requests", value: stats.pendingRequests, href: "/credits/requests" },
                ]}
            />
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
                {(["overview", "transactions", "requests"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-3 text-sm font-medium transition-colors relative",
                            activeTab === tab
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300",
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeTab === tab && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-700 to-neutral-900" />
                        )}
                    </button>
                ))}
            </div>
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Transactions</h3>
                            <Link href="/credits/transactions" className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">View all</Link>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <InlineLoader size="md" />
                                </div>
                            ) : transactions.slice(0, 5).map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={cn("w-8 h-8 shrink-0 rounded-full flex items-center justify-center", txn.amount > 0 ? "bg-neutral-50 dark:bg-neutral-200/10" : "bg-red-50 dark:bg-red-500/10")}>
                                            {txn.amount > 0 ? <ArrowUpRight className="w-4 h-4 text-neutral-900 dark:text-white" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{txn.user?.name || txn.user?.email}</p>
                                            <p className="truncate text-xs text-neutral-500">{txn.description}</p>
                                        </div>
                                    </div>
                                    <span className={cn("shrink-0 font-semibold", txn.amount > 0 ? "text-neutral-800 dark:text-neutral-100" : "text-red-600")}>
                                        {txn.amount > 0 ? "+" : ""}{txn.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">Pending Requests</h3>
                            <Link href="/credits/requests" className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">View all</Link>
                        </div>
                        <div className="space-y-3">
                            {requests.slice(0, 5).map((req) => (
                                <div key={req.id} className="flex items-center justify-between gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{req.user?.name || req.user?.email}</p>
                                        <p className="truncate text-xs text-neutral-500">{req.user?.email}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="font-semibold text-neutral-900 dark:text-white">{req.requestedCredits}</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleApprove(req.id, req.requestedCredits)}
                                                disabled={processingId === req.id}
                                                className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-200/10 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-200/20 transition-colors disabled:opacity-50"
                                            >
                                                {processingId === req.id ? <InlineLoader size="sm" /> : <CheckCircle className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                disabled={processingId === req.id}
                                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {requests.length === 0 && <p className="text-sm text-neutral-500 py-4 text-center">No pending requests</p>}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === "transactions" && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                            <Input
                                type="text"
                                placeholder="Search by user..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-500 transition-all"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as Transaction["type"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="PURCHASE">Purchase</SelectItem>
                                <SelectItem value="SPEND">Spend</SelectItem>
                                <SelectItem value="BONUS">Bonus</SelectItem>
                                <SelectItem value="REWARD">Reward</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <InlineLoader size="md" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                        <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">User</th>
                                        <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Type</th>
                                        <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Amount</th>
                                        <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Description</th>
                                        <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((txn) => (
                                        <tr key={txn.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-neutral-900 dark:text-white">{txn.user?.name || txn.user?.email}</p>
                                                    <p className="text-sm text-neutral-500">{txn.user?.email}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                                                    {
                                                        "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100": txn.type === "PURCHASE" || txn.type === "BONUS",
                                                        "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400": txn.type === "SPEND",
                                                        "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400": txn.type === "REWARD",
                                                    },
                                                )}>
                                                    {txn.type}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn("font-semibold", txn.amount > 0 ? "text-neutral-800 dark:text-neutral-100" : "text-red-600")}>
                                                    {txn.amount > 0 ? "+" : ""}{txn.amount}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{txn.description}</td>
                                            <td className="p-4 text-sm text-neutral-500">{new Date(txn.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            {activeTab === "requests" && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">User</th>
                                    <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Requested</th>
                                    <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">LinkedIn Post</th>
                                    <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Date</th>
                                    <th className="text-left p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-neutral-900 dark:text-white">{req.user?.name || req.user?.email}</p>
                                                <p className="text-sm text-neutral-500">{req.user?.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-neutral-900 dark:text-white">{req.requestedCredits} credits</span>
                                        </td>
                                        <td className="p-4">
                                            <Link
                                                href={req.linkedinPostUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-neutral-800 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-100 underline underline-offset-2"
                                            >
                                                View Post
                                            </Link>
                                        </td>
                                        <td className="p-4 text-sm text-neutral-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleApprove(req.id, req.requestedCredits)}
                                                    disabled={processingId === req.id}
                                                    className="px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-200/10 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-200/20 text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    {processingId === req.id ? <InlineLoader size="sm" /> : <CheckCircle className="w-4 h-4" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    disabled={processingId === req.id}
                                                    className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
