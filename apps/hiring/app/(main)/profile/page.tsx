"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    User, Building2, Shield, Mail, Phone, Calendar, MapPin, Globe,
    Briefcase, Crown, Edit2, Save, X, Eye, EyeOff, Check, AlertCircle,
    Loader2, Link as LinkIcon, Lock, Key
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import { useSession } from "@repo/auth/client"
import {
    getUserProfile, getCompanyDetails, getCurrentMember,
    updateUserProfile, changePassword, updateCompanyDetails
} from "@/actions/profile"
import type {
    UserProfile, CompanyDetails, CompanyMemberRole, CompanyMemberJobTitle,
    Permission, UpdateCompanyPayload,
} from "@/types"

// Job title display mapping
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

export default function ProfilePage() {
    const { data: session } = useSession()

    // Profile data
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null)
    const [memberRole, setMemberRole] = useState<CompanyMemberRole | null>(null)
    const [memberJobTitle, setMemberJobTitle] = useState<CompanyMemberJobTitle | null>(null)
    const [memberJobTitleCustom, setMemberJobTitleCustom] = useState<string | null>(null)
    const [memberDisplayName, setMemberDisplayName] = useState<string | null>(null)
    const [memberPermissions, setMemberPermissions] = useState<Permission[]>([])
    const [isHead, setIsHead] = useState(false)

    // Loading states
    const [loading, setLoading] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [savingCompany, setSavingCompany] = useState(false)

    // Edit modes
    const [editingProfile, setEditingProfile] = useState(false)
    const [editingCompany, setEditingCompany] = useState(false)

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
    const [companyForm, setCompanyForm] = useState<UpdateCompanyPayload>({})

    // Password visibility
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Messages
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [companyMessage, setCompanyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Fetch profile data
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const [profileRes, companyRes, memberRes] = await Promise.all([
                    getUserProfile(),
                    getCompanyDetails(),
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

                if (companyRes.success && companyRes.data) {
                    setCompanyDetails(companyRes.data)
                    setIsHead(companyRes.isHead ?? false)
                    setCompanyForm({
                        name: companyRes.data.name,
                        website: companyRes.data.website || "",
                        description: companyRes.data.description || "",
                        industry: companyRes.data.industry || "",
                        companySize: companyRes.data.companySize || "",
                        headquarters: companyRes.data.headquarters || "",
                        address: companyRes.data.address || "",
                        city: companyRes.data.city || "",
                        state: companyRes.data.state || "",
                        country: companyRes.data.country || "",
                        pincode: companyRes.data.pincode || "",
                    })
                }

                if (memberRes.success && memberRes.data) {
                    setMemberRole(memberRes.data.role as CompanyMemberRole)
                    setMemberJobTitle(memberRes.data.jobTitle as CompanyMemberJobTitle)
                    setMemberJobTitleCustom(memberRes.data.jobTitleCustom)
                    setMemberDisplayName(memberRes.data.displayName)
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

    // Handle company update
    const handleCompanySave = async () => {
        setSavingCompany(true)
        setCompanyMessage(null)

        try {
            const result = await updateCompanyDetails(companyForm)

            if (result.success) {
                setCompanyMessage({ type: "success", text: "Company details updated successfully" })
                setEditingCompany(false)
                if (companyDetails) {
                    setCompanyDetails({
                        ...companyDetails,
                        ...companyForm,
                    } as CompanyDetails)
                }
            } else {
                setCompanyMessage({ type: "error", text: result.error || "Failed to update company" })
            }
        } catch (error) {
            console.error("Company update error:", error)
            setCompanyMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setSavingCompany(false)
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
                    Manage your personal and company information
                </p>
            </div>
            <div className="max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden mb-8"
                >
                    <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-900 h-32">
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
                                    memberRole === "FOUNDER" && (
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
                                                    : "Team Member"
                                        }
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${memberRole === "FOUNDER"
                                        ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                        }`}>
                                        <Shield className="w-3 h-3" />
                                        {memberRole || "Member"}
                                    </span>
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
                            value="company"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Company
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
                                                    placeholder="How you appear to team members"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Phone Number</Label>
                                                <Input
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+1 (555) 123-4567"
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
                                                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer"
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
                    <TabsContent value="company">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5" />
                                    Company Details
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
                                            onClick={() => setEditingCompany(!editingCompany)}
                                            className="rounded-xl cursor-pointer"
                                        >
                                            {
                                                editingCompany ? (
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
                                editingCompany && isHead ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">Company Name</Label>
                                                <Input
                                                    value={companyForm.name || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Website</Label>
                                                <Input
                                                    value={companyForm.website || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                                                    placeholder="https://example.com"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Industry</Label>
                                                <Input
                                                    value={companyForm.industry || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                                                    placeholder="Technology, Healthcare, etc."
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Company Size</Label>
                                                <Input
                                                    value={companyForm.companySize || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, companySize: e.target.value }))}
                                                    placeholder="1-10, 11-50, etc."
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Headquarters</Label>
                                                <Input
                                                    value={companyForm.headquarters || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, headquarters: e.target.value }))}
                                                    placeholder="San Francisco, CA"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Address</Label>
                                                <Input
                                                    value={companyForm.address || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                                                    placeholder="123 Main Street"
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">City</Label>
                                                <Input
                                                    value={companyForm.city || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">State</Label>
                                                <Input
                                                    value={companyForm.state || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, state: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Country</Label>
                                                <Input
                                                    value={companyForm.country || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Pincode</Label>
                                                <Input
                                                    value={companyForm.pincode || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, pincode: e.target.value }))}
                                                    className="mt-2 rounded-xl"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Description</Label>
                                                <Textarea
                                                    value={companyForm.description || ""}
                                                    onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Brief description of your company..."
                                                    className="mt-2 rounded-xl resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <Button
                                                onClick={handleCompanySave}
                                                disabled={savingCompany}
                                                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer"
                                            >
                                                {
                                                    savingCompany ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Save Company Details
                                                        </>
                                                    )
                                                }
                                            </Button>
                                            {
                                                companyMessage && (
                                                    <span className={`text-sm flex items-center gap-1 ${companyMessage.type === "success" ? "text-neutral-900" : "text-red-500"
                                                        }`}>
                                                        {
                                                            companyMessage.type === "success" ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <AlertCircle className="w-4 h-4" />
                                                            )
                                                        }
                                                        {companyMessage.text}
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
                                                    <Building2 className="w-5 h-5 text-neutral-400" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-neutral-500">Company Name</p>
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                            {companyDetails?.name || "Not set"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {
                                                    companyDetails?.website && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <LinkIcon className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Website</p>
                                                                <Link
                                                                    href={companyDetails.website}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:underline truncate block"
                                                                >
                                                                    {companyDetails.website}
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                {
                                                    companyDetails?.industry && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <Briefcase className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Industry</p>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    {companyDetails.industry}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                {
                                                    companyDetails?.companySize && (
                                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                            <User className="w-5 h-5 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-neutral-500">Company Size</p>
                                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                    {companyDetails.companySize} employees
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                            {
                                                companyDetails?.description && (
                                                    <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                                        <p className="text-xs text-neutral-500 mb-1">About</p>
                                                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                            {companyDetails.description}
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
                                                            companyDetails?.address && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30">
                                                                    <MapPin className="w-5 h-5 text-neutral-900" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-800 dark:text-neutral-100">Address</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {companyDetails.address}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            (companyDetails?.city || companyDetails?.state) && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30">
                                                                    <MapPin className="w-5 h-5 text-neutral-900" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-800 dark:text-neutral-100">City, State</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {[companyDetails?.city, companyDetails?.state].filter(Boolean).join(", ") || "Not set"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            companyDetails?.country && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30">
                                                                    <Globe className="w-5 h-5 text-neutral-900" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-800 dark:text-neutral-100">Country</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {companyDetails.country}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            companyDetails?.pincode && (
                                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/10 border border-neutral-200 dark:border-neutral-800/30">
                                                                    <MapPin className="w-5 h-5 text-neutral-900" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs text-neutral-800 dark:text-neutral-100">Pincode</p>
                                                                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                                            {companyDetails.pincode}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                    <StatBand
                                                        className="mt-4"
                                                        size="sm"
                                                        cols={2}
                                                        items={[
                                                            { icon: User, label: "Team Members", value: companyDetails?.memberCount || 0 },
                                                            { icon: Briefcase, label: "Active Jobs", value: companyDetails?.jobCount || 0 },
                                                        ]}
                                                    />
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
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Change Password
                            </h3>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <p className="text-sm text-neutral-500">
                                    Change your password to keep your account secure. Password must be at least 8 characters.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="relative">
                                        <Label className="text-sm font-medium">Current Password</Label>
                                        <div className="relative mt-2">
                                            <Input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="rounded-xl pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                            >
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Label className="text-sm font-medium">New Password</Label>
                                        <div className="relative mt-2">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="rounded-xl pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                            >
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Label className="text-sm font-medium">Confirm Password</Label>
                                        <div className="relative mt-2">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="rounded-xl pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                        className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer"
                                    >
                                        {
                                            savingPassword ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Changing Password...
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-4 h-4 mr-2" />
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
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Your Permissions
                            </h3>
                            <p className="text-sm text-neutral-500 mb-6">
                                These are the actions you can perform in this workspace. Contact your admin to request additional permissions.
                            </p>
                            {
                                memberPermissions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {
                                            memberPermissions.map((permission) => (
                                                <span
                                                    key={permission}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    {permission.replace(/_/g, " ")}
                                                </span>
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <p className="text-neutral-500">No permissions assigned.</p>
                                )
                            }
                            {
                                isHead && (
                                    <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                                        <Link href="/team/roles">
                                            <Button className="rounded-xl cursor-pointer">
                                                <Shield className="w-4 h-4 mr-2" />
                                                Manage Team Permissions
                                            </Button>
                                        </Link>
                                    </div>
                                )
                            }
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}