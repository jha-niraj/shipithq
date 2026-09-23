"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    GraduationCap, Building2, Users, Search, ArrowRight, CheckCircle2,
    TrendingUp, MapPin, ExternalLink, Filter
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import Link from "next/link"

interface UniversityPartner {
    id: string
    name: string
    location: string
    verifiedStudents: number
    placedStudents: number
    avgPackage: string
    logoUrl?: string
    isPartner: boolean
}

// Mock data - replace with actual data
const mockUniversities: UniversityPartner[] = [
    {
        id: "1",
        name: "Delhi Technical University",
        location: "Delhi, India",
        verifiedStudents: 2500,
        placedStudents: 890,
        avgPackage: "₹12 LPA",
        isPartner: true,
    },
    {
        id: "2",
        name: "Indian Institute of Technology Delhi",
        location: "Delhi, India",
        verifiedStudents: 1800,
        placedStudents: 1200,
        avgPackage: "₹24 LPA",
        isPartner: true,
    },
    {
        id: "3",
        name: "Netaji Subhas University of Technology",
        location: "Delhi, India",
        verifiedStudents: 1500,
        placedStudents: 650,
        avgPackage: "₹10 LPA",
        isPartner: true,
    },
]

export default function UniversityPartnersPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState("students")

    const filteredUniversities = mockUniversities
        .filter(uni => uni.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === "students") return b.verifiedStudents - a.verifiedStudents
            if (sortBy === "placements") return b.placedStudents - a.placedStudents
            return 0
        })

    const totalStudents = mockUniversities.reduce((sum, u) => sum + u.verifiedStudents, 0)
    const totalPlacements = mockUniversities.reduce((sum, u) => sum + u.placedStudents, 0)

    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                    University Partners
                </h1>
                <p className="text-neutral-500 mt-1">
                    Access verified talent pools from top universities
                </p>
            </div>

            {/* Stats Cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <StatBand
                    cols={3}
                    items={[
                        { icon: GraduationCap, label: "Partner Universities", value: mockUniversities.length },
                        { icon: Users, label: "Verified Students", value: totalStudents.toLocaleString() },
                        { icon: TrendingUp, label: "Total Placements", value: totalPlacements.toLocaleString() },
                    ]}
                />
            </motion.div>

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-neutral-50 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-8"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/50">
                        <GraduationCap className="w-6 h-6 text-neutral-800 dark:text-neutral-100" />
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-900 dark:text-neutral-700 mb-1">
                            University Verified Candidates
                        </h3>
                        <p className="text-neutral-800 dark:text-neutral-100 text-sm">
                            Students verified through university partnerships have their academic credentials confirmed 
                            by their institution. This ensures authentic profiles and pre-vetted talent for your hiring needs.
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-100">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verified Academic Credentials</span>
                            </div>
                            <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-100">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>University Endorsed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            placeholder="Search universities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 pl-11 rounded-xl"
                        />
                    </div>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] h-11 rounded-xl">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="students">Most Students</SelectItem>
                        <SelectItem value="placements">Most Placements</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Universities List */}
            <div className="space-y-4">
                {filteredUniversities.map((uni, index) => (
                    <motion.div
                        key={uni.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center shrink-0">
                                    <Building2 className="w-7 h-7 text-neutral-800 dark:text-neutral-100" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-neutral-900 dark:text-white">
                                            {uni.name}
                                        </h3>
                                        {uni.isPartner && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-100">
                                                Partner
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-neutral-500 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {uni.location}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                        {uni.verifiedStudents.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-neutral-500">Verified Students</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                        {uni.placedStudents.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-neutral-500">Placements</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                        {uni.avgPackage}
                                    </p>
                                    <p className="text-xs text-neutral-500">Avg Package</p>
                                </div>
                                <Link href={`/candidates?university=${uni.id}`}>
                                    <Button variant="outline" className="rounded-xl">
                                        View Candidates
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredUniversities.length === 0 && (
                <div className="text-center py-12">
                    <GraduationCap className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500">No universities found matching your search</p>
                </div>
            )}

            {/* CTA Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-6 text-center"
            >
                <h3 className="text-lg font-bold text-white mb-2">
                    Want to partner with your university?
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                    We can help establish hiring partnerships with educational institutions.
                </p>
                <Button variant="outline" className="rounded-xl bg-transparent border-white text-white hover:bg-white/10">
                    Contact Partnership Team
                    <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
            </motion.div>
        </div>
    )
}
