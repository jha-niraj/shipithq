"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    UserPlus, Users, Mail, MoreVertical, Briefcase, CheckCircle,
    Clock, X, RefreshCw, UserMinus, Crown
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Badge } from "@repo/ui/components/ui/badge"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@repo/ui/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@repo/ui/components/ui/select"
import { useSession } from "@repo/auth/client"
import {
    inviteTeamMember, cancelInvitation, resendInvitation,
    removeTeamMember
} from "@/actions/team"
import { assignMemberRole } from "@/actions/team/company-roles.action"
import toast from "@repo/ui/components/ui/sonner"
import Image from "next/image"
import type { TeamMember, PendingInvite, TeamStats } from "@/types"

interface TeamContentProps {
    initialMembers: TeamMember[]
    initialInvites: PendingInvite[]
    stats: TeamStats | null
    /** The viewer's "manage team" permission (plan/hiring-app HA-6). */
    canManageTeam: boolean
    viewerIsOwner: boolean
    /** The company's roles, for "Change role". */
    roles: { id: string; name: string; isOwner: boolean }[]
}

export function TeamContent({ initialMembers, initialInvites, stats, canManageTeam, viewerIsOwner, roles }: TeamContentProps) {
    const { data: session } = useSession()
    const [members, setMembers] = useState(initialMembers)
    const [invites, setInvites] = useState(initialInvites)
    const [isPending, startTransition] = useTransition()

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    // Invites carry one of the company's roles (plan/hiring-app HA-8). Only an
    // Owner may invite an Owner. Recruiter is the default when it exists.
    const invitableRoles = roles.filter((role) => !role.isOwner || viewerIsOwner)
    const [inviteRoleId, setInviteRoleId] = useState<string>(
        invitableRoles.find((role) => role.name === "Recruiter")?.id ?? invitableRoles[0]?.id ?? "",
    )

    // Controls follow the viewer's company role, not the legacy FOUNDER enum;
    // the server checks again on every action.
    const isHead = canManageTeam

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error("Please enter an email address")
            return
        }

        startTransition(async () => {
            const result = await inviteTeamMember({
                email: inviteEmail,
                roleId: inviteRoleId
            })
            if (result.success) {
                toast.success("Invitation sent successfully")
                // Refresh the page to get updated invites
                window.location.reload()
            } else {
                toast.error(result.error || "Failed to send invitation")
            }
        })
    }

    const handleCancelInvite = async (inviteId: string) => {
        startTransition(async () => {
            const result = await cancelInvitation(inviteId)
            if (result.success) {
                setInvites(prev => prev.filter(i => i.id !== inviteId))
                toast.success("Invitation cancelled")
            } else {
                toast.error(result.error || "Failed to cancel invitation")
            }
        })
    }

    const handleResendInvite = async (inviteId: string) => {
        startTransition(async () => {
            const result = await resendInvitation(inviteId)
            if (result.success) {
                toast.success("Invitation resent")
            } else {
                toast.error(result.error || "Failed to resend invitation")
            }
        })
    }

    const handleUpdateRole = async (memberId: string, roleId: string) => {
        startTransition(async () => {
            const result = await assignMemberRole(memberId, roleId)
            if (result.success) {
                const role = roles.find((r) => r.id === roleId)
                setMembers(prev => prev.map(m => m.id === memberId ? { ...m, roleId, roleName: role?.name ?? m.roleName, isOwner: Boolean(role?.isOwner) } : m))
                toast.success("Role updated successfully")
            } else {
                toast.error(result.error || "Failed to update role")
            }
        })
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Are you sure you want to remove this team member?")) return

        startTransition(async () => {
            const result = await removeTeamMember(memberId)
            if (result.success) {
                setMembers(prev => prev.filter(m => m.id !== memberId))
                toast.success("Team member removed")
            } else {
                toast.error(result.error || "Failed to remove member")
            }
        })
    }

    const getRoleBadge = (member: TeamMember) => (
        member.isOwner ? (
            <Badge className="gap-1 bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100">
                <Crown className="h-3 w-3" />
                {member.roleName}
            </Badge>
        ) : (
            <Badge variant="outline">{member.roleName}</Badge>
        )
    )

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Team Members"
                subtitle="Manage your hiring team and permissions"
                actions={
                    isHead ? (
                        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Invite Member
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Invite Team Member</DialogTitle>
                                    <DialogDescription>
                                        Send an invitation to join your hiring team
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email Address</label>
                                        <Input
                                            type="email"
                                            placeholder="colleague@company.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                                            <SelectTrigger className="rounded-xl" aria-label="Role">
                                                <SelectValue>{invitableRoles.find((role) => role.id === inviteRoleId)?.name ?? "Choose a role"}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {invitableRoles.map((role) => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        <div className="flex items-center gap-2">
                                                            {role.isOwner ? <Crown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                                            <span>{role.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-neutral-500">
                                            What each role can do is set under Company, Roles.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="rounded-xl">
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleInvite}
                                        disabled={isPending || !inviteEmail.trim()}
                                        className="rounded-xl"
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Invitation
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : undefined
                }
            />

            {
                stats && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <StatBand
                            cols={4}
                            items={[
                                { icon: Users, label: "Team Size", value: stats.totalMembers },
                                { icon: Clock, label: "Pending", value: stats.pendingInvites },
                                { icon: Briefcase, label: "Jobs Posted", value: stats.jobsPosted },
                                { icon: CheckCircle, label: "Processed", value: stats.candidatesProcessed },
                            ]}
                        />
                    </motion.div>
                )
            }
            {
                invites.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-neutral-900 dark:text-white" />
                            Pending Invitations
                        </h2>
                        <div className="space-y-3">
                            <AnimatePresence>
                                {
                                    invites.map((invite, index) => (
                                        <motion.div
                                            key={invite.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30 rounded-xl p-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/30 flex items-center justify-center">
                                                        <Mail className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-900 dark:text-white">{invite.email}</p>
                                                        <p className="text-xs text-neutral-500">
                                                            Invited as {invite.role} • Expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleResendInvite(invite.id)}
                                                        disabled={isPending}
                                                        className="text-neutral-800 hover:text-neutral-700 dark:text-neutral-200 dark:hover:text-white"
                                                    >
                                                        <RefreshCw className="w-4 h-4 mr-1" />
                                                        Resend
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancelInvite(invite.id)}
                                                        disabled={isPending}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                }
                            </AnimatePresence>
                        </div>
                    </div>
                )
            }

            <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-neutral-400" />
                    Team Members ({members.length})
                </h2>
                <div className="space-y-4">
                    <AnimatePresence>
                        {
                            members.map((member, index) => {
                                const isCurrentUser = member.userId === session?.user?.id

                                return (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                                                    {
                                                        member.user.image ? (
                                                            <Image src={member.user.image} alt={member.user.name || ""} fill className="object-cover" />
                                                        ) : (
                                                            <span className="text-lg font-bold text-neutral-600 dark:text-neutral-400">
                                                                {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                                                            </span>
                                                        )
                                                    }
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                        {member.user.name || member.user.email}
                                                        {
                                                            isCurrentUser && (
                                                                <Badge className="bg-neutral-100 dark:bg-neutral-800/30 text-neutral-800 dark:text-neutral-100 text-xs">
                                                                    You
                                                                </Badge>
                                                            )
                                                        }
                                                    </h3>
                                                    <p className="text-sm text-neutral-500">{member.user.email}</p>
                                                    {
                                                        member.jobsPosted !== undefined && member.jobsPosted > 0 && (
                                                            <p className="text-xs text-neutral-400 mt-1">
                                                                {member.jobsPosted} jobs posted
                                                            </p>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {getRoleBadge(member)}

                                                {
                                                    isHead && !isCurrentUser && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {
                                                                    // Only an Owner may make or change an Owner.
                                                                    roles
                                                                        .filter((role) => role.id !== member.roleId && (viewerIsOwner || (!role.isOwner && !member.isOwner)))
                                                                        .map((role) => (
                                                                            <DropdownMenuItem key={role.id} onClick={() => handleUpdateRole(member.id, role.id)}>
                                                                                {role.isOwner ? <Crown className="w-4 h-4 mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                                                                                Make {role.name}
                                                                            </DropdownMenuItem>
                                                                        ))
                                                                }
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    className="text-red-600 focus:text-red-600"
                                                                >
                                                                    <UserMinus className="w-4 h-4 mr-2" />
                                                                    Remove from Team
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )
                                                }
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })
                        }
                    </AnimatePresence>
                </div>
            </div>

            {
                members.length === 0 && invites.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-2">
                            Build Your Team
                        </h3>
                        <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                            Invite colleagues to collaborate on hiring and manage candidates together.
                        </p>
                        {
                            isHead && (
                                <Button
                                    onClick={() => setInviteDialogOpen(true)}
                                    className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Your First Invite
                                </Button>
                            )
                        }
                    </motion.div>
                )
            }
        </div>
    )
}