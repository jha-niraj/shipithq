"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users, Shield, Crown, UserPlus, Settings, Mail, Calendar,
    Check, X, AlertCircle, Loader2, ChevronDown, ChevronUp, Ban,
    UserCheck, Trash2, Send, Clock, GraduationCap, Building
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Switch } from "@repo/ui/components/ui/switch"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/components/ui/select"
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@repo/ui/components/ui/sheet"
import { useSession } from "@repo/auth/client"
import {
    getTeamMembers, getDepartments, updateTeamMember, deactivateTeamMember,
    reactivateTeamMember, inviteTeamMember, getPendingInvitations,
    revokeInvitation
} from "@/actions/team/team.action"
import { getCurrentMember } from "@/actions/profile/profile.action"
import type {
    TeamMember, UniversityPermission, UniversityMemberRole, 
    UniversityMemberJobTitle, Department,
} from "@/types"

// Job title display mapping
const JOB_TITLE_OPTIONS: { value: UniversityMemberJobTitle; label: string }[] = [
    { value: "CHANCELLOR", label: "Chancellor" },
    { value: "PRINCIPAL", label: "Principal" },
    { value: "REGISTRAR", label: "Registrar" },
    { value: "DEAN", label: "Dean" },
    { value: "HOD", label: "Head of Department" },
    { value: "PROFESSOR", label: "Professor" },
    { value: "ASSOCIATE_PROFESSOR", label: "Associate Professor" },
    { value: "ASSISTANT_PROFESSOR", label: "Assistant Professor" },
    { value: "LECTURER", label: "Lecturer" },
    { value: "PLACEMENT_COORDINATOR", label: "Placement Coordinator" },
    { value: "PLACEMENT_OFFICER", label: "Placement Officer" },
    { value: "FINANCE_MANAGER", label: "Finance Manager" },
    { value: "ACCOUNTS_OFFICER", label: "Accounts Officer" },
    { value: "TEACHING_ASSISTANT", label: "Teaching Assistant" },
    { value: "LAB_INSTRUCTOR", label: "Lab Instructor" },
    { value: "OTHER", label: "Other" },
]

const JOB_TITLE_LABELS: Record<UniversityMemberJobTitle, string> = {
    CHANCELLOR: "Chancellor",
    PRINCIPAL: "Principal",
    REGISTRAR: "Registrar",
    DEAN: "Dean",
    HOD: "Head of Department",
    PROFESSOR: "Professor",
    ASSOCIATE_PROFESSOR: "Associate Professor",
    ASSISTANT_PROFESSOR: "Assistant Professor",
    LECTURER: "Lecturer",
    PLACEMENT_COORDINATOR: "Placement Coordinator",
    PLACEMENT_OFFICER: "Placement Officer",
    FINANCE_MANAGER: "Finance Manager",
    ACCOUNTS_OFFICER: "Accounts Officer",
    TEACHING_ASSISTANT: "Teaching Assistant",
    LAB_INSTRUCTOR: "Lab Instructor",
    OTHER: "Other",
}

const ROLE_LABELS: Record<UniversityMemberRole, string> = {
    HEAD: "University Admin",
    DEPARTMENT_HEAD: "Department Head",
    PLACEMENT_OFFICER: "Placement Officer",
    FINANCE_OFFICER: "Finance Officer",
    FACULTY: "Faculty",
    TEACHING_ASSISTANT: "Teaching Assistant",
}

const ROLE_COLORS: Record<UniversityMemberRole, string> = {
    HEAD: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    DEPARTMENT_HEAD: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PLACEMENT_OFFICER: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    FINANCE_OFFICER: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    FACULTY: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100",
    TEACHING_ASSISTANT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
}

// Permission definition type
interface PermissionDefinition {
    key: UniversityPermission;
    label: string;
    description: string;
    category: string;
}

// Permission definitions for display
const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    // Classes
    { key: "view_classes", label: "View Classes", description: "Can view all university classes", category: "Classes" },
    { key: "create_classes", label: "Create Classes", description: "Can create new classes", category: "Classes" },
    { key: "edit_classes", label: "Edit Classes", description: "Can modify class details", category: "Classes" },
    { key: "delete_classes", label: "Delete Classes", description: "Can remove classes", category: "Classes" },
    // Assignments
    { key: "create_assignments", label: "Create Assignments", description: "Can create new assignments", category: "Assignments" },
    { key: "edit_assignments", label: "Edit Assignments", description: "Can modify assignments", category: "Assignments" },
    { key: "delete_assignments", label: "Delete Assignments", description: "Can remove assignments", category: "Assignments" },
    { key: "grade_submissions", label: "Grade Submissions", description: "Can grade student work", category: "Assignments" },
    // Students
    { key: "view_students", label: "View Students", description: "Can access student info", category: "Students" },
    { key: "verify_students", label: "Verify Students", description: "Can verify student accounts", category: "Students" },
    { key: "manage_student_credits", label: "Manage Credits", description: "Can allocate credits to students", category: "Students" },
    // Admin
    { key: "manage_departments", label: "Manage Departments", description: "Can create and edit departments", category: "Admin" },
    { key: "manage_members", label: "Manage Members", description: "Can update team roles", category: "Admin" },
    { key: "invite_members", label: "Invite Members", description: "Can invite new faculty", category: "Admin" },
    { key: "manage_university", label: "Manage University", description: "Can update university settings", category: "Admin" },
    { key: "manage_billing", label: "Manage Billing", description: "Can handle payments", category: "Admin" },
    { key: "manage_credits", label: "Manage Credits", description: "Can manage credit pool", category: "Admin" },
    // Placements
    { key: "manage_placements", label: "Manage Placements", description: "Can manage job partnerships", category: "Placements" },
    { key: "view_job_applications", label: "View Applications", description: "Can view student job applications", category: "Placements" },
    // Analytics
    { key: "view_analytics", label: "View Analytics", description: "Can access analytics", category: "Analytics" },
    { key: "view_reports", label: "View Reports", description: "Can generate reports", category: "Analytics" },
]

// Group permissions by category
const PERMISSION_GROUPS: Record<string, PermissionDefinition[]> = PERMISSION_DEFINITIONS.reduce(
    (acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = []
        }
        acc[perm.category]?.push(perm)
        return acc
    },
    {} as Record<string, PermissionDefinition[]>
)

// Default permissions per role
const DEFAULT_ROLE_PERMISSIONS: Record<UniversityMemberRole, UniversityPermission[]> = {
    HEAD: [
        "view_classes", "create_classes", "edit_classes", "delete_classes",
        "create_assignments", "edit_assignments", "delete_assignments", "grade_submissions",
        "view_students", "verify_students", "manage_student_credits",
        "manage_departments", "manage_members", "invite_members", "manage_university", "manage_billing", "manage_credits",
        "manage_placements", "view_job_applications",
        "view_analytics", "view_reports",
    ],
    DEPARTMENT_HEAD: [
        "view_classes", "create_classes", "edit_classes",
        "create_assignments", "edit_assignments", "delete_assignments", "grade_submissions",
        "view_students", "invite_members",
        "view_analytics",
    ],
    PLACEMENT_OFFICER: [
        "view_students", "manage_placements", "view_job_applications", "view_analytics",
    ],
    FINANCE_OFFICER: [
        "manage_billing", "manage_credits", "manage_student_credits", "view_analytics", "view_reports",
    ],
    FACULTY: [
        "view_classes", "create_assignments", "edit_assignments", "grade_submissions", "view_students",
    ],
    TEACHING_ASSISTANT: [
        "view_classes", "grade_submissions", "view_students",
    ],
}

interface PendingInvitation {
    id: string
    email: string
    name: string | null
    role: UniversityMemberRole
    jobTitle: UniversityMemberJobTitle
    status: string
    createdAt: Date
    expiresAt: Date | null
}

export default function RolesPermissionsPage() {
    const { data: session } = useSession()

    // State
    const [members, setMembers] = useState<TeamMember[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [invitations, setInvitations] = useState<PendingInvitation[]>([])
    const [isHead, setIsHead] = useState(false)
    const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

    // Loading states
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Expanded member for editing
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

    // Invite sheet state
    const [showInviteSheet, setShowInviteSheet] = useState(false)
    const [inviteForm, setInviteForm] = useState({
        email: "",
        name: "",
        role: "FACULTY" as UniversityMemberRole,
        jobTitle: "LECTURER" as UniversityMemberJobTitle,
        departmentId: "",
    })
    const [inviteLoading, setInviteLoading] = useState(false)
    const [inviteMessage, setInviteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Messages
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const [membersRes, memberRes, invitationsRes, deptsRes] = await Promise.all([
                    getTeamMembers(),
                    getCurrentMember(),
                    getPendingInvitations(),
                    getDepartments(),
                ])

                if (membersRes.success && membersRes.data) {
                    setMembers(membersRes.data)
                    setIsHead(membersRes.isHead ?? false)
                }

                if (memberRes.success && memberRes.data) {
                    setCurrentMemberId(memberRes.data.id)
                }

                if (invitationsRes.success && invitationsRes.data) {
                    setInvitations(invitationsRes.data.map(inv => ({
                        ...inv,
                        createdAt: new Date(inv.createdAt),
                        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
                    })))
                }

                if (deptsRes.success && deptsRes.data) {
                    setDepartments(deptsRes.data)
                }
            } catch (error) {
                console.error("Failed to fetch data:", error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.id) {
            fetchData()
        }
    }, [session?.user?.id])

    // Handle role change
    const handleRoleChange = async (memberId: string, newRole: UniversityMemberRole) => {
        setActionLoading(memberId)
        setActionMessage(null)

        try {
            const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[newRole]

            const result = await updateTeamMember(memberId, {
                role: newRole,
                permissions: defaultPermissions,
            })

            if (result.success) {
                setMembers(prev => prev.map(m =>
                    m.id === memberId
                        ? { ...m, role: newRole, permissions: defaultPermissions }
                        : m
                ))
                setActionMessage({ type: "success", text: "Role updated successfully" })
            } else {
                setActionMessage({ type: "error", text: result.error || "Failed to update role" })
            }
        } catch (error) {
            console.error("Role change error:", error)
            setActionMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setActionLoading(null)
        }
    }

    // Handle permission toggle
    const handlePermissionToggle = async (memberId: string, permission: UniversityPermission, currentPermissions: UniversityPermission[]) => {
        setActionLoading(memberId)

        const newPermissions = currentPermissions.includes(permission)
            ? currentPermissions.filter(p => p !== permission)
            : [...currentPermissions, permission]

        try {
            const result = await updateTeamMember(memberId, { permissions: newPermissions })

            if (result.success) {
                setMembers(prev => prev.map(m =>
                    m.id === memberId
                        ? { ...m, permissions: newPermissions }
                        : m
                ))
            } else {
                setActionMessage({ type: "error", text: result.error || "Failed to update permissions" })
            }
        } catch (error) {
            console.error("Permission toggle error:", error)
        } finally {
            setActionLoading(null)
        }
    }

    // Handle member deactivation
    const handleDeactivate = async (memberId: string) => {
        setActionLoading(memberId)

        try {
            const result = await deactivateTeamMember(memberId)

            if (result.success) {
                setMembers(prev => prev.map(m =>
                    m.id === memberId ? { ...m, isActive: false } : m
                ))
                setActionMessage({ type: "success", text: "Member deactivated" })
            } else {
                setActionMessage({ type: "error", text: result.error || "Failed to deactivate" })
            }
        } catch (error) {
            console.error("Deactivation error:", error)
        } finally {
            setActionLoading(null)
        }
    }

    // Handle member reactivation
    const handleReactivate = async (memberId: string) => {
        setActionLoading(memberId)

        try {
            const result = await reactivateTeamMember(memberId)

            if (result.success) {
                setMembers(prev => prev.map(m =>
                    m.id === memberId ? { ...m, isActive: true } : m
                ))
                setActionMessage({ type: "success", text: "Member reactivated" })
            } else {
                setActionMessage({ type: "error", text: result.error || "Failed to reactivate" })
            }
        } catch (error) {
            console.error("Reactivation error:", error)
        } finally {
            setActionLoading(null)
        }
    }

    // Handle invitation
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviteLoading(true)
        setInviteMessage(null)

        try {
            const result = await inviteTeamMember({
                email: inviteForm.email,
                name: inviteForm.name || undefined,
                role: inviteForm.role,
                jobTitle: inviteForm.jobTitle,
                departmentId: inviteForm.departmentId || undefined,
                permissions: DEFAULT_ROLE_PERMISSIONS[inviteForm.role],
            })

            if (result.success) {
                setInviteMessage({ type: "success", text: "Invitation sent successfully" })
                setInviteForm({ email: "", name: "", role: "FACULTY", jobTitle: "LECTURER", departmentId: "" })
                // Refresh invitations
                const invitationsRes = await getPendingInvitations()
                if (invitationsRes.success && invitationsRes.data) {
                    setInvitations(invitationsRes.data.map(inv => ({
                        ...inv,
                        createdAt: new Date(inv.createdAt),
                        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
                    })))
                }
                setTimeout(() => setShowInviteSheet(false), 1500)
            } else {
                setInviteMessage({ type: "error", text: result.error || "Failed to send invitation" })
            }
        } catch (error) {
            console.error("Invite error:", error)
            setInviteMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setInviteLoading(false)
        }
    }

    // Handle revoke invitation
    const handleRevokeInvitation = async (inviteId: string) => {
        setActionLoading(inviteId)

        try {
            const result = await revokeInvitation(inviteId)

            if (result.success) {
                setInvitations(prev => prev.filter(inv => inv.id !== inviteId))
                setActionMessage({ type: "success", text: "Invitation revoked" })
            } else {
                setActionMessage({ type: "error", text: result.error || "Failed to revoke invitation" })
            }
        } catch (error) {
            console.error("Revoke error:", error)
        } finally {
            setActionLoading(null)
        }
    }

    // Not authorized check
    if (!loading && !isHead) {
        return (
            <div className="min-h-full flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                        Access Restricted
                    </h2>
                    <p className="text-neutral-500 mb-6">
                        Only team members with HEAD role can access the Roles &amp; Permissions management page.
                    </p>
                    <Link href="/faculty">
                        <Button className="rounded-xl cursor-pointer">
                            Go to Faculty Page
                        </Button>
                    </Link>
                </motion.div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-full flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <p className="text-neutral-500">Loading team members...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-neutral-900" />
                        Roles &amp; Permissions
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        Manage faculty, staff roles and access permissions
                    </p>
                </div>
                <Button
                    onClick={() => setShowInviteSheet(true)}
                    className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                </Button>
            </div>
            <AnimatePresence>
                {
                    actionMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${actionMessage.type === "success"
                                ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                }`}
                        >
                            {
                                actionMessage.type === "success" ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5" />
                                )
                            }
                            {actionMessage.text}
                            <button
                                onClick={() => setActionMessage(null)}
                                className="ml-auto cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )
                }
            </AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <StatBand
                    cols={3}
                    items={[
                        { icon: Users, label: "Total Members", value: members.length },
                        { icon: Crown, label: "Admins (HEAD)", value: members.filter(m => m.role === "HEAD").length },
                        { icon: Clock, label: "Pending Invites", value: invitations.length },
                    ]}
                />
            </motion.div>
            {
                invitations.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5" />
                            Pending Invitations
                        </h2>
                        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                            {
                                invitations.map((invitation, index) => (
                                    <div
                                        key={invitation.id}
                                        className={`p-4 flex items-center justify-between ${index !== invitations.length - 1 ? "border-b border-neutral-200 dark:border-neutral-800" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                                                <Mail className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-900 dark:text-white">
                                                    {invitation.name || invitation.email}
                                                </p>
                                                <p className="text-sm text-neutral-500">
                                                    {invitation.email} • {ROLE_LABELS[invitation.role]}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-neutral-400">
                                                Sent {invitation.createdAt.toLocaleDateString()}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRevokeInvitation(invitation.id)}
                                                disabled={actionLoading === invitation.id}
                                                className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                            >
                                                {
                                                    actionLoading === invitation.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )
                                                }
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </motion.div>
                )
            }
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                </h2>
                <div className="space-y-4">
                    {members.map((member) => {
                        const isExpanded = expandedMemberId === member.id
                        const isSelf = member.id === currentMemberId

                        return (
                            <motion.div
                                key={member.id}
                                layout
                                className={`bg-white dark:bg-neutral-950 border rounded-2xl overflow-hidden transition-colors ${!member.isActive
                                    ? "border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10"
                                    : "border-neutral-200 dark:border-neutral-800"
                                    }`}
                            >
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative shrink-0">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${member.role === "HEAD"
                                                ? "bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30"
                                                : "bg-neutral-50 dark:bg-neutral-800/30"
                                                }`}>
                                                {
                                                    member.user?.image ? (
                                                        <Image
                                                            src={member.user.image}
                                                            alt={member.displayName || member.email}
                                                            width={48}
                                                            height={48}
                                                            className="w-full h-full object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        <GraduationCap className={`w-5 h-5 ${member.role === "HEAD"
                                                            ? "text-neutral-800 dark:text-neutral-100"
                                                            : "text-neutral-800 dark:text-neutral-100"
                                                            }`} />
                                                    )
                                                }
                                            </div>
                                            {
                                                member.role === "HEAD" && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center">
                                                        <Crown className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )
                                            }
                                            {
                                                !member.isActive && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                                        <Ban className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-neutral-900 dark:text-white truncate">
                                                    {member.displayName || member.email.split("@")[0]}
                                                </p>
                                                {
                                                    isSelf && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                            You
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                                                <span>{member.email}</span>
                                                <span>•</span>
                                                <span>
                                                    {member.jobTitle === "OTHER" && member.jobTitleCustom
                                                        ? member.jobTitleCustom
                                                        : JOB_TITLE_LABELS[member.jobTitle]}
                                                </span>
                                                {member.department && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Building className="w-3 h-3" />
                                                            {member.department.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                                            <Shield className="w-3 h-3" />
                                            {ROLE_LABELS[member.role]}
                                        </span>
                                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                            {member.permissions.length} permissions
                                        </span>
                                        {
                                            isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-neutral-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-neutral-400" />
                                            )
                                        }
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {
                                        isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-neutral-200 dark:border-neutral-800"
                                            >
                                                <div className="p-4 space-y-6">
                                                    <div className="flex flex-wrap gap-3">
                                                        {
                                                            !isSelf && (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <Label className="text-sm font-medium">Role:</Label>
                                                                        <Select
                                                                            value={member.role}
                                                                            onValueChange={(value) => handleRoleChange(member.id, value as UniversityMemberRole)}
                                                                            disabled={actionLoading === member.id}
                                                                        >
                                                                            <SelectTrigger className="w-48 rounded-lg cursor-pointer">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                                                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {
                                                                        member.isActive ? (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleDeactivate(member.id)}
                                                                                disabled={actionLoading === member.id}
                                                                                className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                                            >
                                                                                {
                                                                                    actionLoading === member.id ? (
                                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                    ) : (
                                                                                        <Ban className="w-4 h-4 mr-2" />
                                                                                    )
                                                                                }
                                                                                Deactivate
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleReactivate(member.id)}
                                                                                disabled={actionLoading === member.id}
                                                                                className="rounded-lg text-neutral-900 hover:text-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 cursor-pointer"
                                                                            >
                                                                                {
                                                                                    actionLoading === member.id ? (
                                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                    ) : (
                                                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                                                    )
                                                                                }
                                                                                Reactivate
                                                                            </Button>
                                                                        )
                                                                    }
                                                                </>
                                                            )
                                                        }
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                                                            <Settings className="w-4 h-4" />
                                                            Permissions
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {
                                                                Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => (
                                                                    <div key={category}>
                                                                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                                                                            {category}
                                                                        </p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                            {
                                                                                permissions.map((perm) => {
                                                                                    const hasPermission = member.permissions.includes(perm.key)
                                                                                    const isAdminPermission = ["manage_members", "manage_university", "manage_billing", "manage_credits"].includes(perm.key)

                                                                                    return (
                                                                                        <div
                                                                                            key={perm.key}
                                                                                            className={`p-3 rounded-lg border transition-colors ${hasPermission
                                                                                                ? "bg-neutral-50 border-neutral-200 dark:bg-neutral-800/20 dark:border-neutral-800/30"
                                                                                                : "bg-neutral-50 border-neutral-200 dark:bg-neutral-900/50 dark:border-neutral-800"
                                                                                                } ${isAdminPermission ? "ring-1 ring-neutral-200 dark:ring-neutral-800/30" : ""}`}
                                                                                        >
                                                                                            <div className="flex items-center justify-between">
                                                                                                <div className="min-w-0">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <p className={`text-sm font-medium truncate ${hasPermission
                                                                                                            ? "text-neutral-700 dark:text-neutral-100"
                                                                                                            : "text-neutral-700 dark:text-neutral-300"
                                                                                                            }`}>
                                                                                                            {perm.label}
                                                                                                        </p>
                                                                                                        {
                                                                                                            isAdminPermission && (
                                                                                                                <Crown className="w-3 h-3 text-neutral-900 shrink-0" />
                                                                                                            )
                                                                                                        }
                                                                                                    </div>
                                                                                                    <p className="text-xs text-neutral-500 truncate">
                                                                                                        {perm.description}
                                                                                                    </p>
                                                                                                </div>
                                                                                                <Switch
                                                                                                    checked={hasPermission}
                                                                                                    onCheckedChange={() => handlePermissionToggle(member.id, perm.key, member.permissions)}
                                                                                                    disabled={isSelf || actionLoading === member.id}
                                                                                                    className="shrink-0 ml-2 cursor-pointer"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                                            <div className="flex min-w-0 items-center gap-2 text-neutral-500">
                                                                <Mail className="w-4 h-4 shrink-0" />
                                                                <span className="truncate">{member.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-neutral-500">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            {member.department && (
                                                                <div className="flex items-center gap-2 text-neutral-500">
                                                                    <Building className="w-4 h-4" />
                                                                    <span>{member.department.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    }
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </div>
            </motion.div>
            {/* Invite Sheet */}
            <Sheet open={showInviteSheet} onOpenChange={setShowInviteSheet}>
                <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-neutral-900" />
                            Invite Team Member
                        </SheetTitle>
                        <SheetDescription>
                            Send an invitation to a faculty or staff member
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleInvite} className="mt-6 space-y-6">
                        <div>
                            <Label className="text-sm font-medium">Email Address *</Label>
                            <Input
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="faculty@university.edu"
                                required
                                className="mt-2 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Name (Optional)</Label>
                            <Input
                                type="text"
                                value={inviteForm.name}
                                onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Dr. John Doe"
                                className="mt-2 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Role</Label>
                            <Select
                                value={inviteForm.role}
                                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value as UniversityMemberRole }))}
                            >
                                <SelectTrigger className="mt-2 rounded-xl cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Job Title</Label>
                            <Select
                                value={inviteForm.jobTitle}
                                onValueChange={(value) => setInviteForm(prev => ({ ...prev, jobTitle: value as UniversityMemberJobTitle }))}
                            >
                                <SelectTrigger className="mt-2 rounded-xl cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {JOB_TITLE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Department (Optional)</Label>
                            <Select
                                value={inviteForm.departmentId || "none"}
                                onValueChange={(value) => setInviteForm(prev => ({ ...prev, departmentId: value === "none" ? "" : value }))}
                            >
                                <SelectTrigger className="mt-2 rounded-xl cursor-pointer">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Department</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name} {dept.code && `(${dept.code})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <AnimatePresence>
                            {
                                inviteMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`p-3 rounded-xl flex items-center gap-2 text-sm ${inviteMessage.type === "success"
                                            ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                            }`}
                                    >
                                        {
                                            inviteMessage.type === "success" ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4" />
                                            )
                                        }
                                        {inviteMessage.text}
                                    </motion.div>
                                )
                            }
                        </AnimatePresence>
                        <Button
                            type="submit"
                            disabled={inviteLoading || !inviteForm.email}
                            className="w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                        >
                            {
                                inviteLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending Invitation...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Invitation
                                    </>
                                )
                            }
                        </Button>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    )
}