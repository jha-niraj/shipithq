"use client"

import { motion } from "framer-motion"
import { Plus, Search, Filter, Briefcase, Building2, Users, TrendingUp, ExternalLink, Award } from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import Link from "next/link"

export default function PlacementsPage() {
    // Mock data - replace with real data
    const universityJobs: Array<{
        id: string
        title: string
        company: string
        location: string
        type: string
        applications: number
        posted: string
        visibility: "public" | "university_only" | "filtered"
    }> = []

    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                        Placements
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        Manage job listings and company partnerships for your students.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-xl">
                        <Building2 className="w-4 h-4 mr-2" />
                        Refer Company
                    </Button>
                    <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Post Exclusive Job
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <StatBand
                    cols={4}
                    items={[
                        { icon: Briefcase, label: "Active Jobs", value: 0 },
                        { icon: Building2, label: "Partner Companies", value: 0 },
                        { icon: Users, label: "Applications", value: 0 },
                        { icon: Award, label: "Placed Students", value: 0 },
                    ]}
                />
            </motion.div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search jobs or companies..."
                        className="pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    />
                </div>
                <Button variant="outline" className="rounded-xl">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                </Button>
            </div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-2 mb-6"
            >
                {["All Jobs", "University Only", "Public", "Companies"].map((tab, idx) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${idx === 0
                                ? "bg-neutral-800 text-white"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </motion.div>

            {/* Jobs List */}
            {universityJobs.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {universityJobs.map((job) => (
                        <Link key={job.id} href={`/placements/${job.id}`}>
                            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                                                {job.title}
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.visibility === "university_only"
                                                    ? "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100"
                                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                                }`}>
                                                {job.visibility === "university_only" ? "University Only" : "Public"}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4" />
                                                {job.company}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {job.applications} applications
                                            </span>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-neutral-400" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl"
                >
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mx-auto mb-6">
                        <Briefcase className="w-10 h-10 text-neutral-800" />
                    </div>
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                        No placement activities yet
                    </h3>
                    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                        Refer companies to our hiring platform or post exclusive jobs for your students to kickstart placements.
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" className="rounded-xl">
                            <Building2 className="w-4 h-4 mr-2" />
                            Refer a Company
                        </Button>
                        <Button className="rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-800 hover:from-neutral-700 hover:to-neutral-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Post Exclusive Job
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Partner Companies Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Partner Companies</h2>
                    <Button variant="ghost" size="sm" className="text-sm text-neutral-800">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        View Analytics
                    </Button>
                </div>
                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center">
                    <p className="text-neutral-500">
                        No partner companies yet. Refer companies to build your placement network.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
