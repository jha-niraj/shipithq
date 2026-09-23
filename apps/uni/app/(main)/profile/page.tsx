"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    User, GraduationCap, Shield, Mail, Phone, Calendar, MapPin, Globe,
    Briefcase, Crown, Edit2, Save, X, Eye, EyeOff, Check, AlertCircle,
    Loader2, Link as LinkIcon, Lock, Key, Building, Users, Award
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import { useSession } from "@repo/auth/client"
import {
    getUserProfile, getUniversityDetails, getCurrentMember,
    updateUserProfile, changePassword, updateUniversityDetails
} from "@/actions/profile/profile.action"
import type {
    UserProfile, UniversityDetails, UniversityMemberRole, UniversityMemberJobTitle,
    UniversityPermission, UpdateUniversityPayload,
    UniversityTypeEnum,
} from "@/types"

// Job title display mapping for university members
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

// Role display mapping
const ROLE_LABELS: Record<UniversityMemberRole, string> = {
    HEAD: "University Admin",
    DEPARTMENT_HEAD: "Department Head",
    PLACEMENT_OFFICER: "Placement Officer",
    FINANCE_OFFICER: "Finance Officer",
    FACULTY: "Faculty",
    TEACHING_ASSISTANT: "Teaching Assistant",
}

// Role colors
const ROLE_COLORS: Record<UniversityMemberRole, string> = {
    HEAD: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    DEPARTMENT_HEAD: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    PLACEMENT_OFFICER: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    FINANCE_OFFICER: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100",
    FACULTY: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-100",
    TEACHING_ASSISTANT: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
}

export default function ProfilePage() {
    const { data: session } = useSession()

    // Profile data
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [universityDetails, setUniversityDetails] = useState<UniversityDetails | null>(null)
    const [memberRole, setMemberRole] = useState<UniversityMemberRole | null>(null)
    const [memberJobTitle, setMemberJobTitle] = useState<UniversityMemberJobTitle | null>(null)
    const [memberJobTitleCustom, setMemberJobTitleCustom] = useState<string | null>(null)
    const [memberDisplayName, setMemberDisplayName] = useState<string | null>(null)
    const [memberDepartment, setMemberDepartment] = useState<{ id: string; name: string; code: string | null } | null>(null)
    const [memberPermissions, setMemberPermissions] = useState<UniversityPermission[]>([])
    const [isHead, setIsHead] = useState(false)

    // Loading states
    const [loading, setLoading] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [savingUniversity, setSavingUniversity] = useState(false)

    // Edit modes
    const [editingProfile, setEditingProfile] = useState(false)
    const [editingUniversity, setEditingUniversity] = useState(false)

    // Form data
    const [profileForm, setProfileForm] = useState({
        name: "",
        phone: "",
        bio: "",
        displayName: "",
    })
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })
    const [universityForm, setUniversityForm] = useState<UpdateUniversityPayload>({})

    // Password visibility
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Messages
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [universityMessage, setUniversityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Fetch profile data
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const [profileRes, universityRes, memberRes] = await Promise.all([
                    getUserProfile(),
                    getUniversityDetails(),
                    getCurrentMember(),
                ])

                if (profileRes.success && profileRes.data) {
                    setUserProfile(profileRes.data)
                    setProfileForm({
                        name: profileRes.data.name || "",
                        phone: profileRes.data.phone || "",
                        bio: profileRes.data.bio || "",
                        displayName: "",
                    })
                }

                if (universityRes.success && universityRes.data) {
                    setUniversityDetails(universityRes.data)
                    setIsHead(universityRes.isHead ?? false)
                    setUniversityForm({
                        name: universityRes.data.name,
                        website: universityRes.data.website || "",
                        description: universityRes.data.description || "",
                        email: universityRes.data.email || "",
                        phone: universityRes.data.phone || "",
                        universityType: universityRes.data.universityType as UniversityTypeEnum,
                        affiliatedTo: universityRes.data.affiliatedTo || "",
                        accreditation: universityRes.data.accreditation || "",
                        address: universityRes.data.address || "",
                        city: universityRes.data.city || "",
                        state: universityRes.data.state || "",
                        country: universityRes.data.country || "India",
                        pincode: universityRes.data.pincode || "",
                    })
                }

                if (memberRes.success && memberRes.data) {
                    setMemberRole(memberRes.data.role as UniversityMemberRole)
                    setMemberJobTitle(memberRes.data.jobTitle as UniversityMemberJobTitle)
                    setMemberJobTitleCustom(memberRes.data.jobTitleCustom)
                    setMemberDisplayName(memberRes.data.displayName)
                    setMemberDepartment(memberRes.data.department)
                    setMemberPermissions(memberRes.data.permissions)
                    setProfileForm(prev => ({
                        ...prev,
                        displayName: memberRes.data.displayName || "",
                    }))
                }
            } catch (error) {
                console.error("Failed to fetch profile data:", error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.id) {
            fetchData()
        }
    }, [session?.user?.id])

    // Handle profile update
    const handleProfileSave = async () => {
        setSavingProfile(true)
        setProfileMessage(null)

        try {
            const result = await updateUserProfile({
                name: profileForm.name,
                phone: profileForm.phone,
                bio: profileForm.bio,
                displayName: profileForm.displayName,
            })

            if (result.success) {
                setProfileMessage({ type: "success", text: "Profile updated successfully" })
                setEditingProfile(false)
                if (userProfile) {
                    setUserProfile({
                        ...userProfile,
                        name: profileForm.name,
                        phone: profileForm.phone,
                        bio: profileForm.bio,
                    })
                }
                setMemberDisplayName(profileForm.displayName)
            } else {
                setProfileMessage({ type: "error", text: result.error || "Failed to update profile" })
            }
        } catch (error) {
            console.error("Profile update error:", error)
            setProfileMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setSavingProfile(false)
        }
    }

    // Handle password change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingPassword(true)
        setPasswordMessage(null)

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage({ type: "error", text: "New passwords do not match" })
            setSavingPassword(false)
            return
        }

        if (passwordForm.newPassword.length < 8) {
            setPasswordMessage({ type: "error", text: "Password must be at least 8 characters" })
            setSavingPassword(false)
            return
        }

        try {
            const result = await changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword,
            })

            if (result.success) {
                setPasswordMessage({ type: "success", text: "Password changed successfully" })
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
            } else {
                setPasswordMessage({ type: "error", text: result.error || "Failed to change password" })
            }
        } catch (error) {
            console.error("Password change error:", error)
            setPasswordMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setSavingPassword(false)
        }
    }

    // Handle university update
    const handleUniversitySave = async () => {
        setSavingUniversity(true)
        setUniversityMessage(null)

        try {
            const result = await updateUniversityDetails(universityForm)

            if (result.success) {
                setUniversityMessage({ type: "success", text: "University details updated successfully" })
                setEditingUniversity(false)
                if (universityDetails) {
                    setUniversityDetails({
                        ...universityDetails,
                        ...universityForm,
                    } as UniversityDetails)
                }
            } else {
                setUniversityMessage({ type: "error", text: result.error || "Failed to update university" })
            }
        } catch (error) {
            console.error("University update error:", error)
            setUniversityMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setSavingUniversity(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-full flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <p className="text-neutral-500">Loading profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white">
                    Profile
                </h1>
                <p className="text-neutral-500 mt-1">
                    Manage your personal and university information
                </p>
            </div>
            <div className="max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden mb-8"
                >
                    <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 h-32">
                        <div className="absolute inset-0 bg-black/10" />
                    </div>
                    <div className="relative px-6 pb-6 -mt-12">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            <div className="relative shrink-0">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-100 dark:from-neutral-800/30 dark:to-neutral-800/30 border-4 border-white dark:border-neutral-950 flex items-center justify-center overflow-hidden shadow-lg">
                                    {
                                        userProfile?.image ? (
                                            <Image
                                                src={userProfile.image}
                                                alt={userProfile.name || "Profile"}
                                                width={96}
                                                height={96}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-10 h-10 text-neutral-900 dark:text-neutral-100" />
                                        )
                                    }
                                </div>
                                {
                                    memberRole === "HEAD" && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center border-2 border-white dark:border-neutral-950">
                                            <Crown className="w-3 h-3 text-white" />
                                        </div>
                                    )
                                }
                            </div>
                            <div className="flex-1 min-w-0 pt-4 sm:pt-0">
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white truncate">
                                    {memberDisplayName || userProfile?.name || "Unknown User"}
                                </h2>
                                <p className="text-neutral-500 truncate">{userProfile?.email}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100">
                                        <Briefcase className="w-3 h-3" />
                                        {
                                            memberJobTitle === "OTHER" && memberJobTitleCustom
                                                ? memberJobTitleCustom
                                                : memberJobTitle
                                                    ? JOB_TITLE_LABELS[memberJobTitle]
                                                    : "Faculty"
                                        }
                                    </span>
                                    {memberRole && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[memberRole]}`}>
                                            <Shield className="w-3 h-3" />
                                            {ROLE_LABELS[memberRole]}
                                        </span>
                                    )}
                                    {memberDepartment && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                            <Building className="w-3 h-3" />
                                            {memberDepartment.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="w-full justify-start bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
                        <TabsTrigger
                            value="personal"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Personal Info
                        </TabsTrigger>
                        <TabsTrigger
                            value="university"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            University
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <Key className="w-4 h-4 mr-2" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger
                            value="permissions"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Permissions
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Personal Information
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingProfile(!editingProfile)}
                                    className="rounded-xl cursor-pointer"
                                >
                                    {
                                        editingProfile ? (
                                            <>
                                                <X className="w-4 h-4 mr-2" /> Cancel
                                            </>
                                        ) : (
                                            <>
                                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                                            </>
                                        )
                                    }
                                </Button>
                            </div>
                            {
                                editingProfile ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">Full Name</Label>
                                                <Input
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Your full name"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Display Name</Label>
                                                <Input
                                                    value={profileForm.displayName}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                                                    placeholder="How you appear to colleagues"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Phone Number</Label>
                                                <Input
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+91 98765 43210"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Bio</Label>
                                                <Textarea
                                                    value={profileForm.bio}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                                    placeholder="Tell us about yourself..."
                                                    className="mt-2 rounded-xl resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <Button
                                                onClick={handleProfileSave}
                                                disabled={savingProfile}
                                                className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                                            >
                                                {
                                                    savingProfile ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Save Changes
                                                        </>
                                                    )
                                                }
                                            </Button>
                                            {
                                                profileMessage && (
                                                    <span className={`text-sm flex items-center gap-1 ${profileMessage.type === "success" ? "text-neutral-900" : "text-red-500"
                                                        }`}>
                                                        {
                                                            profileMessage.type === "success" ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <AlertCircle className="w-4 h-4" />
                                                            )
                                                        }
                                                        {profileMessage.text}
                                                    </span>
                                                )
                                            }
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                            <Mail className="w-5 h-5 text-neutral-400" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Email</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                                    {userProfile?.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                            <Phone className="w-5 h-5 text-neutral-400" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Phone</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                    {userProfile?.phone || "Not provided"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                            <User className="w-5 h-5 text-neutral-400" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Display Name</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                    {memberDisplayName || userProfile?.name || "Not set"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                            <Calendar className="w-5 h-5 text-neutral-400" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Member Since</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                    {
                                                        userProfile?.createdAt
                                                            ? new Date(userProfile.createdAt).toLocaleDateString("en-US", {
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                            })
                                                            : "Unknown"
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {
                                            userProfile?.bio && (
                                                <div className="md:col-span-2 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                    <p className="text-xs text-neutral-500 mb-1">Bio</p>
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                        {userProfile.bio}
                                                    </p>
                                                </div>
                                            )
                                        }
                                    </div>
                                )
                            }
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="university">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5" />
                                    University Details
                                    {
                                        isHead && (
                                            <span className="ml-2 text-xs font-normal text-neutral-900 flex items-center gap-1">
                                                <Crown className="w-3 h-3" /> Admin
                                            </span>
                                        )
                                    }
                                </h3>
                                {
                                    isHead && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingUniversity(!editingUniversity)}
                                            className="rounded-xl cursor-pointer"
                                        >
                                            {
                                                editingUniversity ? (
                                                    <>
                                                        <X className="w-4 h-4 mr-2" /> Cancel
                                                    </>
                                                ) : (
                                                    <>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                                                    </>
                                                )
                                            }
                                        </Button>
                                    )
                                }
                            </div>

                            {
                                editingUniversity && isHead ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">University Name</Label>
                                                <Input
                                                    value={universityForm.name || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Website</Label>
                                                <Input
                                                    value={universityForm.website || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, website: e.target.value }))}
                                                    placeholder="https://university.edu"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Email</Label>
                                                <Input
                                                    value={universityForm.email || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="contact@university.edu"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Phone</Label>
                                                <Input
                                                    value={universityForm.phone || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">University Type</Label>
                                                <Input
                                                    value={universityForm.universityType || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, universityType: e.target.value as UpdateUniversityPayload["universityType"] }))}
                                                    placeholder="Public, Private, Deemed..."
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Accreditation</Label>
                                                <Input
                                                    value={universityForm.accreditation || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, accreditation: e.target.value }))}
                                                    placeholder="NAAC A++, NBA..."
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Address</Label>
                                                <Input
                                                    value={universityForm.address || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, address: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">City</Label>
                                                <Input
                                                    value={universityForm.city || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, city: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">State</Label>
                                                <Input
                                                    value={universityForm.state || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, state: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Pincode</Label>
                                                <Input
                                                    value={universityForm.pincode || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, pincode: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Description</Label>
                                                <Textarea
                                                    value={universityForm.description || ""}
                                                    onChange={(e) => setUniversityForm(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Brief description of your university..."
                                                    className="mt-2 rounded-xl resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <Button
                                                onClick={handleUniversitySave}
                                                disabled={savingUniversity}
                                                className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                                            >
                                                {
                                                    savingUniversity ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Save University Details
                                                        </>
                                                    )
                                                }
                                            </Button>
                                            {
                                                universityMessage && (
                                                    <span className={`text-sm flex items-center gap-1 ${universityMessage.type === "success" ? "text-neutral-900" : "text-red-500"
                                                        }`}>
                                                        {
                                                            universityMessage.type === "success" ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <AlertCircle className="w-4 h-4" />
                                                            )
                                                        }
                                                        {universityMessage.text}
                                                    </span>
                                                )
                                            }
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-neutral-500 mb-3 flex items-center gap-2">
                                                <Globe className="w-4 h-4" />
                                                Public Information
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                    <GraduationCap className="w-5 h-5 text-neutral-900" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-neutral-500">University Name</p>
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                            {universityDetails?.name || "Not set"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {
                                                    universityDetails?.website && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <LinkIcon className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Website</p>
                                                                <Link
                                                                    href={universityDetails.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:underline truncate block"
                                                                >
                                                                    {universityDetails.website}
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                {
                                                    universityDetails?.universityType && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <Building className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Type</p>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    {universityDetails.universityType}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                {
                                                    universityDetails?.accreditation && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <Award className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Accreditation</p>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    {universityDetails.accreditation}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                            {/* Stats */}
                                            <StatBand
                                                size="sm"
                                                cols={3}
                                                className="mt-4"
                                                items={[
                                                    { icon: Users, label: "Faculty", value: universityDetails?.memberCount || 0 },
                                                    { icon: User, label: "Students", value: universityDetails?.studentCount || 0 },
                                                    { icon: Building, label: "Departments", value: universityDetails?.departmentCount || 0 },
                                                ]}
                                            />
                                            {
                                                universityDetails?.description && (
                                                    <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                        <p className="text-xs text-neutral-500 mb-1">About</p>
                                                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                            {universityDetails.description}
                                                        </p>
                                                    </div>
                                                )
                                            }
                                        </div>
                                        {
                                            isHead && (
                                                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                                    <h4 className="text-sm font-medium text-neutral-500 mb-3 flex items-center gap-2">
                                                        <Lock className="w-4 h-4" />
                                                        Private Information (HEAD Only)
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {
                                                            universityDetails?.address && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                                    <MapPin className="w-5 h-5 text-neutral-400" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-500">Address</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {universityDetails.address}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            universityDetails?.city && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                                    <MapPin className="w-5 h-5 text-neutral-400" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-500">Location</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {universityDetails.city}, {universityDetails.state}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {/* Credits Info */}
                                                        <div className="md:col-span-2 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800">
                                                            <p className="text-xs text-neutral-800 dark:text-neutral-100 mb-2 font-medium">Credit Balance</p>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="text-2xl font-bold text-neutral-700 dark:text-neutral-100">
                                                                        {(universityDetails?.totalCreditsAllocated || 0) - (universityDetails?.totalCreditsUsed || 0)}
                                                                    </span>
                                                                    <span className="text-sm text-neutral-800 dark:text-neutral-100 ml-2">
                                                                        / {universityDetails?.totalCreditsAllocated || 0} credits
                                                                    </span>
                                                                </div>
                                                                {universityDetails?.creditExpiryDate && (
                                                                    <p className="text-xs text-neutral-800 dark:text-neutral-100">
                                                                        Expires: {new Date(universityDetails.creditExpiryDate).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    </div>
                                )
                            }
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="security">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                                <Key className="w-5 h-5" />
                                Change Password
                            </h3>
                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                <div>
                                    <Label className="text-sm font-medium">Current Password</Label>
                                    <div className="relative mt-2">
                                        <Input
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            placeholder="Enter current password"
                                            className="rounded-xl pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                        >
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">New Password</Label>
                                    <div className="relative mt-2">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                            placeholder="Enter new password"
                                            className="rounded-xl pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Confirm New Password</Label>
                                    <div className="relative mt-2">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            placeholder="Confirm new password"
                                            className="rounded-xl pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                                    >
                                        {
                                            savingPassword ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Changing...
                                                </>
                                            ) : (
                                                <>
                                                    <Key className="w-4 h-4 mr-2" />
                                                    Change Password
                                                </>
                                            )
                                        }
                                    </Button>
                                    {
                                        passwordMessage && (
                                            <span className={`text-sm flex items-center gap-1 ${passwordMessage.type === "success" ? "text-neutral-900" : "text-red-500"
                                                }`}>
                                                {
                                                    passwordMessage.type === "success" ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4" />
                                                    )
                                                }
                                                {passwordMessage.text}
                                            </span>
                                        )
                                    }
                                </div>
                            </form>
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="permissions">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                                <Shield className="w-5 h-5" />
                                Your Permissions
                            </h3>
                            <p className="text-neutral-500 mb-6">
                                These are the permissions assigned to your role. Contact your university admin to request changes.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {
                                    memberPermissions.length > 0 ? (
                                        memberPermissions.map((perm) => (
                                            <span
                                                key={perm}
                                                className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100 text-xs font-medium"
                                            >
                                                {perm.replace(/_/g, " ")}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-neutral-400 text-sm">No permissions assigned</p>
                                    )
                                }
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}