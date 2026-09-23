"use client"

import { useCallback, useEffect, useState } from "react"
import {
    GraduationCap, Search, Filter, MoreHorizontal, Globe, ArrowLeft, CheckCircle, Clock, Users, Building2, Download, ChevronLeft, ChevronRight, School,
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
import { getUniversities } from "@/actions/uni/uni.action"

type VerificationStatus = "VERIFIED" | "PENDING" | "REJECTED"

export interface University {
    id: string
    name: string
    website?: string | null
    emailDomain?: string | null
    universityType: string
    city?: string | null
    state?: string | null
    verificationStatus: VerificationStatus
    members?: unknown[]
    studentLinks?: unknown[]
    departments?: unknown[]
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

export function UniversitiesClient({
    initialUniversities,
    initialPagination,
}: {
    initialUniversities: University[]
    initialPagination: Pagination
}) {
    const [universities, setUniversities] = useState<University[]>(initialUniversities)
    const [pagination, setPagination] = useState<Pagination>(initialPagination)
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [firstLoad, setFirstLoad] = useState(true)

    const fetchUniversities = useCallback(async (page: number, status: string) => {
        setIsLoading(true)
        try {
            const result = await getUniversities(page, 20, status !== "all" ? status : undefined)
            if (result.success) {
                setUniversities(result.data as unknown as University[])
                if (result.pagination) setPagination(result.pagination)
            }
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (firstLoad) { setFirstLoad(false); return }
        fetchUniversities(currentPage, statusFilter)
    }, [currentPage, statusFilter, fetchUniversities, firstLoad])

    const filteredUniversities = searchQuery
        ? universities.filter((u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.website && u.website.toLowerCase().includes(searchQuery.toLowerCase())))
        : universities

    const verifiedCount = universities.filter((u) => u.verificationStatus === "VERIFIED").length
    const pendingCount = universities.filter((u) => u.verificationStatus === "PENDING").length
    const totalStudents = universities.reduce((acc, u) => acc + (u.studentLinks?.length ?? 0), 0)
    const totalDepartments = universities.reduce((acc, u) => acc + (u.departments?.length ?? 0), 0)

    return (
        <div className="p-6 lg:p-8 w-full mx-auto">
            <div className="mb-8">
                <Link href="/uni" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to University Platform
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-8 rounded-full bg-neutral-900" />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Universities</h1>
                            <p className="text-neutral-500 dark:text-neutral-400">
                                {pagination.total} registered {pagination.total === 1 ? "university" : "universities"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/uni/universities/verification">
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
                        placeholder="Search universities..."
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
                    { icon: GraduationCap, label: "Total", value: pagination.total },
                    { icon: CheckCircle, label: "Verified", value: verifiedCount },
                    { icon: Users, label: "Students", value: totalStudents.toLocaleString() },
                    { icon: Building2, label: "Departments", value: totalDepartments },
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
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">University</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Location</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Students</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Faculty</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {filteredUniversities.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                                            <School className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>No universities found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUniversities.map((uni) => (
                                        <motion.tr
                                            key={uni.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-neutral-50 dark:bg-neutral-800/20 flex items-center justify-center">
                                                        <GraduationCap className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-900 dark:text-white">{uni.name}</p>
                                                        {uni.website && (
                                                            <a
                                                                href={uni.website.startsWith("http") ? uni.website : `https://${uni.website}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-neutral-500 hover:underline flex items-center gap-1"
                                                            >
                                                                <Globe className="w-3 h-3" />
                                                                {uni.website.replace(/^https?:\/\//, "")}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-neutral-900 dark:text-white text-sm">{uni.universityType}</td>
                                            <td className="px-4 py-4 text-neutral-500 text-sm">{[uni.city, uni.state].filter(Boolean).join(", ") || "-"}</td>
                                            <td className="px-4 py-4">
                                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[uni.verificationStatus])}>
                                                    {uni.verificationStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-neutral-900 dark:text-white">{(uni.studentLinks?.length ?? 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-neutral-900 dark:text-white">{uni.members?.length ?? 0}</span>
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
                                                        <DropdownMenuItem>View Departments</DropdownMenuItem>
                                                        <DropdownMenuItem>View Students</DropdownMenuItem>
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
