"use client"

import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    User, Building2, Shield, Mail, Phone, Calendar, MapPin, Globe,
    Briefcase, Crown, Edit2, Save, X, Check, AlertCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@repo/ui/components/ui/button"
import { CompanyMark } from "@repo/ui/components/ui/company-mark"
import { Input } from "@repo/ui/components/ui/input"
import { StatBand } from "@repo/ui/components/ui/stat-band"
import { PageHeader } from "@repo/ui/components/ui/page-header"
import Loading from "./loading"
import { MemberPublicCard } from "./member-public-card"
import { HIRING_PERMISSION_LABELS, type HiringPermission } from "@repo/db/hiring-permissions"
import { Label } from "@repo/ui/components/ui/label"
import { Textarea } from "@repo/ui/components/ui/textarea"
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import { useSession } from "@repo/auth/client"
import {
    getUserProfile, getCompanyDetails, getCurrentMember,
    updateUserProfile
} from "@/actions/profile"
import type {
    UserProfile, CompanyDetails, CompanyMemberRole, CompanyMemberJobTitle,
    Permission,
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
    const [accessLevel, setAccessLevel] = useState<string | null>(null)
    const [isHead, setIsHead] = useState(false)

    // Loading states
    const [loading, setLoading] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)

    // Edit modes
    const [editingProfile, setEditingProfile] = useState(false)

    // Form data
    const [profileForm, setProfileForm] = useState({
        name: "",
        phone: "",
        bio: "",
        displayName: "",
    })
    // Messages
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
                }

                if (memberRes.success && memberRes.data) {
                    setMemberRole(memberRes.data.role as CompanyMemberRole)
                    setMemberJobTitle(memberRes.data.jobTitle as CompanyMemberJobTitle)
                    setMemberJobTitleCustom(memberRes.data.jobTitleCustom)
                    setMemberDisplayName(memberRes.data.displayName)
                    setMemberPermissions(memberRes.data.permissions)
                    setAccessLevel(memberRes.data.accessLevel)
                    setProfileForm(prev => ({
                        ...prev,
                        displayName: memberRes.data.displayName || "",
                    }))
                }
            } catch (error: unknown) {
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
        } catch (error: unknown) {
            console.error("Profile update error:", error)
            setProfileMessage({ type: "error", text: "An unexpected error occurred" })
        } finally {
            setSavingProfile(false)
        }
    }

    if (loading) {
        return <Loading />
    }

    return (
        <div className="page-frame space-y-5 px-page py-6">
            <PageHeader
                title="Profile"
                subtitle="Your details, your company and what you can do here."
            />
            <div className="space-y-5">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden"
                >
                    {/* The company's cover and logo (HU-10); a neutral band with its name when there's no cover. */}
                    <div className="relative h-36 bg-neutral-100 sm:h-44 dark:bg-neutral-900">
                        {companyDetails?.coverUrl ? (
                            <img src={companyDetails.coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-end px-6">
                                <span className="text-3xl font-semibold tracking-tight text-neutral-300 sm:text-5xl dark:text-neutral-700">{companyDetails?.name}</span>
                            </div>
                        )}
                        {companyDetails && (
                            <Link href="/company" className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
                                    {companyDetails.logoUrl ? <img src={companyDetails.logoUrl} alt="" className="h-full w-full object-contain" /> : <CompanyMark seed={companyDetails.id} name={companyDetails.name} fill size={24} className="rounded-none border-0" />}
                                </span>
                                {companyDetails.name}
                            </Link>
                        )}
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
                                    {memberDisplayName || userProfile?.name || "Unknown user"}
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
                                                    : "Team member"
                                        }
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${memberRole === "FOUNDER"
                                        ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-100"
                                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                        }`}>
                                        <Shield className="w-3 h-3" />
                                        {accessLevel || "Member"}
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
                            Personal info
                        </TabsTrigger>
                        <TabsTrigger
                            value="company"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm cursor-pointer"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Company
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
                                    Personal information
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingProfile(!editingProfile)}
                                    className="gap-1.5"
                                >
                                    {editingProfile ? <><X className="h-4 w-4" /> Cancel</> : <><Edit2 className="h-4 w-4" /> Edit</>}
                                </Button>
                            </div>
                            {
                                editingProfile ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium">Full name</Label>
                                                <Input
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Your full name"
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Display name</Label>
                                                <Input
                                                    value={profileForm.displayName}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                                                    placeholder="How you appear to team members"
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Phone number</Label>
                                                <Input
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+1 (555) 123-4567"
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label className="text-sm font-medium">Bio</Label>
                                                <Textarea
                                                    value={profileForm.bio}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                                    placeholder="A line or two about you"
                                                    className="mt-2 resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <Button
                                                onClick={handleProfileSave}
                                                disabled={savingProfile}
                                                className="gap-1.5"
                                            >
                                                {savingProfile ? <InlineLoader size="sm" /> : <Save className="h-4 w-4" />} Save changes
                                            </Button>
                                            {
                                                profileMessage && (
                                                    <span className={`text-sm flex items-center gap-1 ${profileMessage.type === "success" ? "text-neutral-900 dark:text-white" : "text-rose-700 dark:text-rose-400"
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
                                                <p className="text-xs text-neutral-500">Display name</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                                    {memberDisplayName || userProfile?.name || "Not set"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
                                            <Calendar className="w-5 h-5 text-neutral-400" />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Member since</p>
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
                        <MemberPublicCard />
                    </TabsContent>
                    <TabsContent value="company">
                        {/* Read-only (plan/hiring-ui HU-10): the company is edited on its own page, not here. */}
                        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                            {companyDetails ? (
                                <>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{companyDetails.name}</h3>
                                            {companyDetails.tagline && <p className="text-sm text-neutral-600 dark:text-neutral-400">{companyDetails.tagline}</p>}
                                        </div>
                                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                                            <Link href="/company"><Building2 className="h-4 w-4" /> {isHead ? "Edit the company page" : "Open the company page"}</Link>
                                        </Button>
                                    </div>
                                    {companyDetails.description && <p className="mt-4 whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">{companyDetails.description}</p>}
                                    <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {[
                                            { icon: Briefcase, label: "Industry", value: companyDetails.industry },
                                            { icon: User, label: "Size", value: companyDetails.companySize ? `${companyDetails.companySize} people` : null },
                                            { icon: MapPin, label: "Headquarters", value: companyDetails.headquarters },
                                            { icon: Calendar, label: "Founded", value: companyDetails.foundedYear ? String(companyDetails.foundedYear) : null },
                                            { icon: Globe, label: "Website", value: companyDetails.website },
                                            { icon: Shield, label: "Verification", value: companyDetails.verificationStatus === "VERIFIED" ? "Verified" : "Not verified yet" },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-start gap-3">
                                                <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                                                <div className="min-w-0">
                                                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">{row.label}</dt>
                                                    <dd className="truncate text-sm text-neutral-900 dark:text-white">{row.value || "-"}</dd>
                                                </div>
                                            </div>
                                        ))}
                                    </dl>
                                </>
                            ) : (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Your company&apos;s details could not be loaded.</p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="permissions">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6"
                        >
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Your permissions
                            </h3>
                            <p className="text-sm text-neutral-500 mb-6">
                                What your access level{accessLevel ? ` (${accessLevel})` : ""} lets you do. To change it, ask someone who manages access.
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
                                                    {HIRING_PERMISSION_LABELS[permission as unknown as HiringPermission]?.label ?? permission.replace(/_/g, " ")}
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
                                        <Button asChild variant="outline" className="gap-1.5">
                                            <Link href="/team/access"><Shield className="h-4 w-4" /> Manage access</Link>
                                        </Button>
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