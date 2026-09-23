"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users, Shield, Crown, UserPlus, Settings, Mail, Phone, Calendar,
    Check, X, AlertCircle, Loader2, ChevronDown, ChevronUp, Ban,
    UserCheck, Trash2, Send, Clock
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { StatBand } from "@repo/ui/components/ui/stat-band"
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
    getTeamMembers, updateTeamMember, deactivateTeamMember,
    reactivateTeamMember, inviteTeamMember, getPendingInvitations,
    revokeInvitation
} from "@/actions/team"
import { getCurrentMember } from "@/actions/profile"
import type {
    TeamMember, Permission, CompanyMemberRole, CompanyMemberJobTitle,
} from "@/types"

// Job title display mapping
const JOB_TITLE_OPTIONS: { value: CompanyMemberJobTitle; label: string }[] = [
    { value: "CEO", label: "CEO" },
    { value: "CTO", label: "CTO" },
    { value: "COFOUNDER", label: "Co-Founder" },
    { value: "VP_ENGINEERING", label: "VP Engineering" },
    { value: "ENGINEERING_MANAGER", label: "Engineering Manager" },
    { value: "HR_HEAD", label: "HR Head" },
    { value: "HR_MANAGER", label: "HR Manager" },
    { value: "TALENT_ACQUISITION", label: "Talent Acquisition" },
    { value: "RECRUITER", label: "Recruiter" },
    { value: "HIRING_MANAGER", label: "Hiring Manager" },
    { value: "TECH_LEAD", label: "Tech Lead" },
    { value: "INTERVIEWER", label: "Interviewer" },
    { value: "OTHER", label: "Other" },
]

const JOB_TITLE_LABELS: Record<CompanyMemberJobTitle, string> = {
    CEO: "CEO",
    CTO: "CTO",
    COFOUNDER: "Co-Founder",
    VP_ENGINEERING: "VP Engineering",
    ENGINEERING_MANAGER: "Engineering Manager",
    HR_HEAD: "HR Head",
    HR_MANAGER: "HR Manager",
    TALENT_ACQUISITION: "Talent Acquisition",
    RECRUITER: "Recruiter",
    HIRING_MANAGER: "Hiring Manager",
    TECH_LEAD: "Tech Lead",
    INTERVIEWER: "Interviewer",
    OTHER: "Other",
}

// Permission definition type
interface PermissionDefinition {
    key: Permission;
    label: string;
    description: string;
    category: string;
}

// Permission definitions for display
const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    { key: "view_jobs", label: "View Jobs", description: "Can view all job postings", category: "Jobs" },
    { key: "post_jobs", label: "Post Jobs", description: "Can create new job postings", category: "Jobs" },
    { key: "edit_jobs", label: "Edit Jobs", description: "Can modify existing job postings", category: "Jobs" },
    { key: "delete_jobs", label: "Delete Jobs", description: "Can remove job postings", category: "Jobs" },
    { key: "view_applications", label: "View Applications", description: "Can view candidate applications", category: "Applications" },
    { key: "review_candidates", label: "Review Candidates", description: "Can review and rate candidates", category: "Applications" },
    { key: "manage_assessments", label: "Manage Assessments", description: "Can create and manage assessments", category: "Assessments" },
    { key: "manage_members", label: "Manage Members", description: "Can add, remove, and modify team members", category: "Admin" },
    { key: "manage_company", label: "Manage Company", description: "Can update company settings", category: "Admin" },
    { key: "manage_billing", label: "Manage Billing", description: "Can manage billing and payments", category: "Admin" },
    { key: "view_analytics", label: "View Analytics", description: "Can access analytics dashboard", category: "Analytics" },
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

interface PendingInvitation {
    id: string
    email: string
    name: string | null
    role: CompanyMemberRole
    jobTitle: CompanyMemberJobTitle
    status: string
    createdAt: Date
    expiresAt: Date | null
}

export default function RolesPermissionsPage() {
    const { data: session } = useSession()

    // State
    const [members, setMembers] = useState<TeamMember[]>([])
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
        role: "RECRUITER" as CompanyMemberRole,
        jobTitle: "RECRUITER" as CompanyMemberJobTitle,
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
                const [membersRes, memberRes, invitationsRes] = await Promise.all([
                    getTeamMembers(),
                    getCurrentMember(),
                    getPendingInvitations(),
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
                        createdAt: new Date(inv.invitedAt),
                        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
                    })))
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
    const handleRoleChange = async (memberId: string, newRole: CompanyMemberRole) => {
        setActionLoading(memberId)
        setActionMessage(null)

        try {
            const defaultPermissions: Permission[] = newRole === "FOUNDER"
                ? ["view_jobs", "post_jobs", "edit_jobs", "delete_jobs", "view_applications", "review_candidates", "manage_assessments", "manage_members", "manage_company", "manage_billing", "view_analytics"]
                : ["view_jobs", "post_jobs", "view_applications", "review_candidates"]

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
    const handlePermissionToggle = async (memberId: string, permission: Permission, currentPermissions: Permission[]) => {
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
            })

            if (result.success) {
                setInviteMessage({ type: "success", text: "Invitation sent successfully" })
                setInviteForm({ email: "", name: "", role: "RECRUITER", jobTitle: "RECRUITER" })
                // Refresh invitations
                const invitationsRes = await getPendingInvitations()
                if (invitationsRes.success && invitationsRes.data) {
                    setInvitations(invitationsRes.data.map(inv => ({
                        ...inv,
                        createdAt: new Date(inv.invitedAt),
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
                    <Link href="/team">
                        <Button className="rounded-xl cursor-pointer">
                            Go to Team Page
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
                        <Shield className="w-7 h-7" />
                        Roles &amp; Permissions
                    </h1>
                    <p className="text-neutral-500 mt-1">
                        Manage team member roles and access permissions
                    </p>
                </div>
                <Button
                    onClick={() => setShowInviteSheet(true)}
                    className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer"
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <StatBand
                    cols={3}
                    items={[
                        { icon: Users, label: "Total Members", value: members.length },
                        { icon: Crown, label: "Admins (FOUNDER)", value: members.filter(m => m.role === "FOUNDER").length },
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
                                                    {invitation.email} • {JOB_TITLE_LABELS[invitation.jobTitle]}
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
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${member.role === "FOUNDER"
                                                ? "bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30"
                                                : "bg-neutral-100 dark:bg-neutral-900"
                                                }`}>
                                                {
                                                    member.user?.image ? (
                                                        <Image
                                                            src={member.user.image}
                                                            alt={member.displayName || member.email || "Team member"}
                                                            width={48}
                                                            height={48}
                                                            className="w-full h-full object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        <Users className={`w-5 h-5 ${member.role === "FOUNDER"
                                                            ? "text-neutral-800 dark:text-neutral-100"
                                                            : "text-neutral-400"
                                                            }`} />
                                                    )
                                                }
                                            </div>
                                            {
                                                member.role === "FOUNDER" && (
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
                                                    {member.displayName || member.email?.split("@")[0] || "Unknown"}
                                                </p>
                                                {
                                                    isSelf && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100">
                                                            You
                                                        </span>
                                                    )
                                                }
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                <span>{member.email}</span>
                                                <span>•</span>
                                                <span>
                                                    {
                                                    member.jobTitle === "OTHER" && member.jobTitleCustom
                                                        ? member.jobTitleCustom
                                                        : member.jobTitle ? JOB_TITLE_LABELS[member.jobTitle] : "Not set"
                                                        }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${member.role === "FOUNDER"
                                            ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                            }`}>
                                            <Shield className="w-3 h-3" />
                                            {member.role}
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
                                                                            onValueChange={(value) => handleRoleChange(member.id, value as CompanyMemberRole)}
                                                                            disabled={actionLoading === member.id}
                                                                        >
                                                                            <SelectTrigger className="w-32 rounded-lg cursor-pointer">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="FOUNDER">Founder (Admin)</SelectItem>
                                                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                                                <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
                                                                                <SelectItem value="RECRUITER">Recruiter</SelectItem>
                                                                                <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
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
                                                                                    const isAdminPermission = ["manage_members", "manage_company", "manage_billing"].includes(perm.key)

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
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                            <div className="flex min-w-0 items-center gap-2 text-neutral-500">
                                                                <Mail className="w-4 h-4 shrink-0" />
                                                                <span className="truncate">{member.email}</span>
                                                            </div>
                                                            {
                                                                member.phone && (
                                                                    <div className="flex items-center gap-2 text-neutral-500">
                                                                        <Phone className="w-4 h-4" />
                                                                        <span>{member.phone}</span>
                                                                    </div>
                                                                )
                                                            }
                                                            <div className="flex items-center gap-2 text-neutral-500">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            {
                                                                member.lastActiveAt && (
                                                                    <div className="flex items-center gap-2 text-neutral-500">
                                                                        <Clock className="w-4 h-4" />
                                                                        <span>Active {new Date(member.lastActiveAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    }
                                </AnimatePresence>
                            </motion.div>
                        )
                    })
                    }
                </div>
            </motion.div>
            <Sheet open={showInviteSheet} onOpenChange={setShowInviteSheet}>
                <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Invite Team Member
                        </SheetTitle>
                        <SheetDescription>
                            Send an invitation to add a new member to your team.
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleInvite} className="space-y-6 mt-6">
                        <div>
                            <Label className="text-sm font-medium">Email Address *</Label>
                            <Input
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="colleague@company.com"
                                className="mt-2 rounded-xl"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Name (Optional)</Label>
                            <Input
                                value={inviteForm.name}
                                onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="John Doe"
                                className="mt-2 rounded-xl"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Role</Label>
                            <Select
                                value={inviteForm.role}
                                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value as CompanyMemberRole }))}
                            >
                                <SelectTrigger className="mt-2 rounded-xl cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
                                    <SelectItem value="RECRUITER">Recruiter</SelectItem>
                                    <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Job Title</Label>
                            <Select
                                value={inviteForm.jobTitle}
                                onValueChange={(value) => setInviteForm(prev => ({ ...prev, jobTitle: value as CompanyMemberJobTitle }))}
                            >
                                <SelectTrigger className="mt-2 rounded-xl cursor-pointer">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        JOB_TITLE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {
                            inviteMessage && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${inviteMessage.type === "success"
                                    ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    }`}>
                                    {
                                        inviteMessage.type === "success" ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4" />
                                        )
                                    }
                                    {inviteMessage.text}
                                </div>
                            )
                        }

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowInviteSheet(false)}
                                className="flex-1 rounded-xl cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={inviteLoading || !inviteForm.email}
                                className="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer"
                            >
                                {
                                    inviteLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send Invitation
                                        </>
                                    )
                                }
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    )
}