"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, DollarSign } from "lucide-react"
import { getAllTransactions } from "@/actions/main/credit.action"
import { toast } from "@repo/ui/components/ui/sonner"
import { format } from "date-fns"
import { Input } from "@repo/ui/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { CreditType } from "@repo/db"

export interface Transactions {
    id: string
    userId: string | null
    amount: number
    createdAt: Date
    description: string
    type: CreditType
    user: {
        id: string
        name: string | null
        email: string
        image?: string | null
    } | null | undefined
}

function getTypeBadge(type: string) {
    const styles = {
        PURCHASE: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        BONUS: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
        REWARD: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        SPEND: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    }
    return styles[type as keyof typeof styles] || styles.PURCHASE
}

export function TransactionsClient({
    initialTransactions,
    initialTotalPages,
    loadError,
}: {
    initialTransactions: Transactions[]
    initialTotalPages: number
    loadError: string | null | undefined
}) {
    const [transactions, setTransactions] = useState<Transactions[]>(initialTransactions)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchTransactions = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getAllTransactions(
                { type: typeFilter, search: searchTerm || undefined },
                { page, limit: 20 }
            )
            if (result.success) {
                setTransactions(result.data.transactions)
                setTotalPages(result.data.pages || 1)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            console.error("Fetch error:", error)
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }, [page, typeFilter, searchTerm])

    useEffect(() => {
        if (loadError) toast.error(loadError)
    }, [loadError])

    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchTransactions()
    }, [page, typeFilter, fetchTransactions, firstLoad])

    useEffect(() => {
        if (firstLoad) return
        const timer = setTimeout(() => {
            if (page === 1) {
                fetchTransactions()
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
                        <DollarSign className="w-7 h-7" />
                        Credit Transactions
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        View and manage all credit transactions
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        type="text"
                        placeholder="Search by user name, email or transaction ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                </div>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-white text-sm font-medium">
                                                        {transaction.user?.name?.charAt(0) || "U"}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-neutral-900 dark:text-white">{transaction.user?.name || "Unknown"}</div>
                                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{transaction.user?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(transaction.type)}`}>{transaction.type}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-semibold ${transaction.amount > 0 ? "text-neutral-800 dark:text-neutral-100" : "text-red-600 dark:text-red-400"}`}>
                                                    {transaction.amount > 0 ? "+" : ""}{transaction.amount} credits
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                                                {format(new Date(transaction.createdAt), "MMM dd, yyyy HH:mm")}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400 max-w-xs truncate">
                                                {transaction.description || "N/A"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
