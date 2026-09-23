"use client"

import { useCallback, useEffect, useState } from "react"
import {
    Building2, Search, Filter, MoreHorizontal, Globe, ArrowLeft, CheckCircle, Clock, Users, Download, ChevronLeft, ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import { getCompanies } from "@/actions/hiring/hiring.action"

type VerificationStatus = "VERIFIED" | "PENDING" | "REJECTED"

export interface Company {
    id: string
    name: string
    website?: string | null
    industry?: string | null
    size?: string | null
    verificationStatus: VerificationStatus
    members?: unknown[]
    createdAt: Date
}

export interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

const statusColors: Record<VerificationStatus, string> = {
    VERIFIED: "bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100",
    PENDING: "bg-neutral-50 dark:bg-neutral-800/20 text-neutral-800 dark:text-neutral-100",
    REJECTED: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
}

export function CompaniesClient({
    initialCompanies,
    initialPagination,
}: {
    initialCompanies: Company[]
    initialPagination: Pagination
}) {
    const [companies, setCompanies] = useState<Company[]>(initialCompanies)
    const [pagination, setPagination] = useState<Pagination>(initialPagination)
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchCompanies = useCallback(async (page: number, status: string) => {
        setIsLoading(true)
        try {
            const result = await getCompanies(page, 20, status !== "all" ? status : undefined)
            if (result.success) {
                setCompanies(result.data as unknown as Company[])
                if (result.pagination) setPagination(result.pagination)
            }
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchCompanies(currentPage, statusFilter)
    }, [currentPage, statusFilter, fetchCompanies, firstLoad])

    const filteredCompanies = searchQuery
        ? companies.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.website && c.website.toLowerCase().includes(searchQuery.toLowerCase())))
        : companies

    const verifiedCount = companies.filter((c) => c.verificationStatus === "VERIFIED").length
    const pendingCount = companies.filter((c) => c.verificationStatus === "PENDING").length
    const totalMembers = companies.reduce((acc, c) => acc + (c.members?.length ?? 0), 0)

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <Link href="/hiring" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Hiring Platform
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-8 rounded-full bg-neutral-900" />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Companies</h1>
                            <p className="text-neutral-500 dark:text-neutral-400">
                                {pagination.total} registered {pagination.total === 1 ? "company" : "companies"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/hiring/companies/verification">
                            <Button variant="outline" size="sm">
                                <Clock className="w-4 h-4 mr-2" />
                                Pending ({pendingCount})
                            </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <StatBand
                className="mb-6"
                cols={4}
                items={[
                    { icon: Building2, label: "Total", value: pagination.total },
                    { icon: CheckCircle, label: "Verified", value: verifiedCount },
                    { icon: Users, label: "Members", value: totalMembers },
                    { icon: Clock, label: "Pending", value: pendingCount },
                ]}
            />

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <InlineLoader size="md" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Company</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Industry</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Size</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Members</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Joined</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {filteredCompanies.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                                            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>No companies found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <motion.tr
                                            key={company.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-neutral-50 dark:bg-neutral-800/20 flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-900 dark:text-white">{company.name}</p>
                                                        {company.website && (
                                                            <a
                                                                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-neutral-500 hover:underline flex items-center gap-1"
                                                            >
                                                                <Globe className="w-3 h-3" />
                                                                {company.website.replace(/^https?:\/\//, "")}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-neutral-900 dark:text-white text-sm">{company.industry || "-"}</td>
                                            <td className="px-4 py-4 text-neutral-500 text-sm">{company.size || "-"}</td>
                                            <td className="px-4 py-4">
                                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[company.verificationStatus])}>
                                                    {company.verificationStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-neutral-900 dark:text-white">{company.members?.length ?? 0}</span>
                                            </td>
                                            <td className="px-4 py-4 text-neutral-500 text-sm">
                                                {new Date(company.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                                        <DropdownMenuItem>View Members</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600">Suspend</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-neutral-500">
                            Showing {((currentPage - 1) * pagination.limit) + 1}-{Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">{currentPage} / {pagination.totalPages}</span>
                            <Button variant="outline" size="sm" disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
