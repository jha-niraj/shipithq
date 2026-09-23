"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { 
    Users, Shield, MoreVertical, GraduationCap, BookOpen, 
    Loader2, RefreshCw, ToggleLeft, ToggleRight 
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { useSession } from "@repo/auth/client"
import { 
    getTeamMembers, 
    getDepartments,
    deactivateTeamMember,
    reactivateTeamMember 
} from "@/actions/team/team.action"
import { InviteTeacherDialog } from "@/components/team/invite-teacher-dialog"
import type { TeamMember, Department, UniversityMemberRole } from "@/types"

export default function FacultyPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [facultyMembers, setFacultyMembers] = useState<TeamMember[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [isHead, setIsHead] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const roleColors: Record<UniversityMemberRole, string> = {
        HEAD: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        DEPARTMENT_HEAD: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        FACULTY: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        TEACHING_ASSISTANT: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
        PLACEMENT_OFFICER: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
        FINANCE_OFFICER: "bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100",
    }

    const roleLabels: Record<UniversityMemberRole, string> = {
        HEAD: "University Admin",
        DEPARTMENT_HEAD: "Dept. Head",
        FACULTY: "Faculty",
        TEACHING_ASSISTANT: "TA",
        PLACEMENT_OFFICER: "Placement",
        FINANCE_OFFICER: "Finance",
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [membersRes, deptsRes] = await Promise.all([
                getTeamMembers(),
                getDepartments(),
            ])

            if (membersRes.success && membersRes.data) {
                setFacultyMembers(membersRes.data)
                setIsHead(membersRes.isHead ?? false)
            }

            if (deptsRes.success && deptsRes.data) {
                setDepartments(deptsRes.data)
            }
        } catch (error) {
            console.error("Failed to fetch data:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleToggleActive = async (memberId: string, isActive: boolean) => {
        setActionLoading(memberId)
        try {
            if (isActive) {
                await deactivateTeamMember(memberId)
            } else {
                await reactivateTeamMember(memberId)
            }
            await fetchData()
        } catch (error) {
            console.error("Failed to toggle member status:", error)
        } finally {
            setActionLoading(null)
        }
    }

    const roleCounts = facultyMembers.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1
        return acc
    }, {} as Record<UniversityMemberRole, number>)

    if (loading) {
        return (
            <div className="min-h-full flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
                    <p className="text-sm text-neutral-500">Loading faculty...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                        Faculty & Staff
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        Manage faculty members, department heads, and teaching assistants.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchData}
                        className="rounded-xl"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    {isHead && <InviteTeacherDialog departments={departments} onSuccess={fetchData} />}
                </div>
            </div>

            {/* Role Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <StatBand
                    cols={5}
                    items={[
                        { role: "HEAD" as const, icon: Shield },
                        { role: "DEPARTMENT_HEAD" as const, icon: GraduationCap },
                        { role: "FACULTY" as const, icon: BookOpen },
                        { role: "TEACHING_ASSISTANT" as const, icon: Users },
                        { role: "PLACEMENT_OFFICER" as const, icon: Users },
                    ].map((item) => ({
                        key: item.role,
                        icon: item.icon,
                        label: roleLabels[item.role],
                        value: roleCounts[item.role] || 0,
                    }))}
                />
            </motion.div>

            {/* Faculty List */}
            {facultyMembers.length > 0 ? (
                <div className="space-y-4">
                    {facultyMembers.map((member) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 ${
                                !member.isActive ? "opacity-60" : ""
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                                        <span className="text-lg font-bold text-white">
                                            {member.displayName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                            {member.displayName || member.email.split("@")[0]}
                                            {member.userId === session?.user?.id && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100">
                                                    You
                                                </span>
                                            )}
                                            {!member.isActive && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                                    Inactive
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-neutral-500">{member.email}</p>
                                        {member.department && (
                                            <p className="text-xs text-neutral-800 dark:text-neutral-100 mt-1">
                                                {member.department.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${roleColors[member.role]}`}>
                                            {member.role === "HEAD" && <Shield className="w-3 h-3" />}
                                            {roleLabels[member.role]}
                                        </span>
                                    </div>
                                    {isHead && member.role !== "HEAD" && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={actionLoading === member.id}>
                                                    {actionLoading === member.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MoreVertical className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => handleToggleActive(member.id, member.isActive)}
                                                >
                                                    {member.isActive ? (
                                                        <>
                                                            <ToggleLeft className="w-4 h-4 mr-2" />
                                                            Deactivate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleRight className="w-4 h-4 mr-2" />
                                                            Reactivate
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center py-16 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl"
                >
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-neutral-800" />
                    </div>
                    <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                        Invite your faculty
                    </h3>
                    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                        Add professors, department heads, and teaching assistants to create and manage assignments.
                    </p>
                    {isHead && <InviteTeacherDialog departments={departments} onSuccess={fetchData} />}
                </motion.div>
            )}
        </div>
    )
}
